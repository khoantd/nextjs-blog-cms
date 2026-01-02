import { PrismaAdapter } from "@auth/prisma-adapter";
import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "./prisma";
import { UserRole } from "./types";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      // Persist the user role and ID to the token
      if (user && account) {
        // First time sign-in, fetch user from database and store role in token
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email! },
          select: { id: true, role: true }
        });
        
        if (dbUser) {
          token.sub = dbUser.id.toString();
          token.role = dbUser.role as UserRole;
          token.email = user.email || "";
          token.name = user.name || "";
          token.image = user.image || "";
        }
      }
      return token;
    },
    async session({ session, token }) {
      // For JWT strategy, get data from token instead of database
      if (token.sub && session.user) {
        session.user.id = token.sub;
        session.user.role = token.role as UserRole;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.image = token.image as string;
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      // Auto-assign role based on email domain or set default
      if (user.email) {
        // Check if user exists and has a role
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email! },
          select: { role: true }
        });

        if (!existingUser) {
          // First time sign-in, assign default role
          const isAdmin = user.email.endsWith("@yourdomain.com");
          const role: UserRole = isAdmin ? "admin" : "viewer";

          // Update user role immediately (synchronously)
          await prisma.user.update({
            where: { email: user.email },
            data: { role },
          });
        }
      }
      return true;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  debug: true,
};

// Role-based access control helper functions
export const hasPermission = (userRole: UserRole, requiredRole: UserRole): boolean => {
  const roleHierarchy: Record<UserRole, number> = {
    viewer: 1,
    editor: 2,
    admin: 3,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
};

export const canCreatePost = (role: UserRole) => hasPermission(role, "editor");
export const canEditPost = (role: UserRole) => hasPermission(role, "editor");
export const canDeletePost = (role: UserRole) => hasPermission(role, "admin");
export const canManageWorkflows = (role: UserRole) => hasPermission(role, "editor");
export const canManageUsers = (role: UserRole) => hasPermission(role, "admin");
