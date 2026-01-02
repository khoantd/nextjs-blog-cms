import { PrismaAdapter } from "@auth/prisma-adapter";
import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "./prisma";
import { UserRole } from "./types";

// Type assertion for PrismaAdapter compatibility
const prismaClient = prisma as any;

if (process.env.NODE_ENV === "development") {
  console.log('Google Client ID:', process.env.GOOGLE_CLIENT_ID ? 'Set' : 'Not set');
  console.log('Google Client Secret:', process.env.GOOGLE_CLIENT_SECRET ? 'Set' : 'Not set');
  console.log('NextAuth URL:', process.env.NEXTAUTH_URL);
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
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
        try {
          if (!prismaClient?.user) {
            console.error('Prisma client or user model not available');
            return token;
          }
          
          const dbUser = await prismaClient.user.findUnique({
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
        } catch (error) {
          console.error('Error fetching user in JWT callback:', error);
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
        try {
          if (!prismaClient?.user) {
            console.error('Prisma client or user model not available in signIn');
            return false;
          }
          
          // Check if user exists and has a role
          const existingUser = await prismaClient.user.findUnique({
            where: { email: user.email! },
            select: { role: true }
          });

          if (!existingUser) {
            // First time sign-in, assign default role
            const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(email => email.trim()) || [];
            const adminDomains = process.env.ADMIN_DOMAINS?.split(',').map(domain => domain.trim()) || [];
            
            const isAdmin = adminEmails.includes(user.email!) || 
                           adminDomains.some(domain => user.email!.endsWith(`@${domain}`)) ||
                           user.email!.endsWith("@yourdomain.com");
            const role: UserRole = isAdmin ? "admin" : "viewer";

            // Update user role immediately (synchronously)
            await prismaClient.user.upsert({
              where: { email: user.email },
              update: { role },
              create: { email: user.email!, role, name: user.name, image: user.image },
            });
          }
        } catch (error) {
          console.error('Error in signIn callback:', error);
          return false;
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
  debug: process.env.NODE_ENV === "development",
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
export const canViewPosts = (role: UserRole) => role === "viewer" || role === "editor" || role === "admin";
export const canViewWorkflows = (role: UserRole) => role === "viewer" || role === "editor" || role === "admin";
