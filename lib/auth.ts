import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { UserRole } from "./types";
import { getGoogleClientId, getGoogleClientSecret } from "./server-auth";
import { API_CONFIG } from "./api-config";


if (process.env.NODE_ENV === "development") {
  const clientId = getGoogleClientId();
  const clientSecret = getGoogleClientSecret();
  const envClientId = process.env.GOOGLE_CLIENT_ID;
  const envClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  console.log('Google Client ID:', clientId ? 'Set' : 'Not set');
  console.log('Google Client Secret:', clientSecret ? 'Set' : 'Not set');
  console.log('NextAuth URL:', process.env.NEXTAUTH_URL);
  
  // Determine config source more accurately
  let configSource = 'Unknown';
  const isEnvPlaceholder = envClientId === 'your_google_client_id_here' || 
                         envClientSecret === 'your_google_client_secret_here' ||
                         !envClientId || !envClientSecret;
  
  if (clientId && isEnvPlaceholder) {
    configSource = 'JSON file';
  } else if (!isEnvPlaceholder) {
    configSource = 'Environment variables';
  } else if (clientId) {
    configSource = 'JSON file (fallback)';
  }
  
  console.log('Config Source:', configSource);
}

// Check if Google OAuth is enabled (disabled by default)
const isGoogleOAuthEnabled = process.env.ENABLE_GOOGLE_OAUTH === 'true' || 
                              process.env.NEXT_PUBLIC_ENABLE_GOOGLE_OAUTH === 'true';

export const authOptions: NextAuthOptions = {
  providers: [
    // Credentials provider for email/password authentication
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        try {
          const backendUrl = API_CONFIG.BASE_URL;
          const response = await fetch(`${backendUrl}/api/auth/login`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            // Extract error message properly - could be in different fields
            const errorMessage = errorData.message || errorData.error?.message || errorData.error || "Invalid credentials";
            throw new Error(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
          }

          const data = await response.json();
          const user = data.data?.user;

          if (!user) {
            throw new Error("Invalid credentials");
          }

          return {
            id: user.id.toString(),
            email: user.email,
            name: user.name || null,
            image: user.image || null,
            role: user.role || "viewer",
          };
        } catch (error: any) {
          console.error("Credentials authorization error:", error);
          // Extract error message properly
          const errorMessage = error?.message || error?.error?.message || String(error) || "Failed to authenticate";
          throw new Error(errorMessage);
        }
      },
    }),
    // Google OAuth provider (only if enabled)
    ...(isGoogleOAuthEnabled
      ? [
          GoogleProvider({
            clientId: getGoogleClientId() || process.env.GOOGLE_CLIENT_ID!,
            clientSecret: getGoogleClientSecret() || process.env.GOOGLE_CLIENT_SECRET!,
            authorization: {
              params: {
                prompt: "consent",
                access_type: "offline",
                response_type: "code",
              },
            },
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      // Get user email (from new sign-in or existing token)
      const userEmail = user?.email || token.email;
      
      // Always refresh role from backend database to ensure it's up-to-date
      // This handles role changes without requiring re-authentication
      if (userEmail) {
        let role: UserRole = token.role || "viewer"; // Use existing role as fallback
        
        try {
          // Use API_CONFIG for consistent backend URL
          const backendUrl = API_CONFIG.BASE_URL;
          
          // For OAuth users, sync profile data (name, image) to backend
          // For credentials users, just fetch role
          const isOAuthUser = account?.provider !== 'credentials';
          const url = isOAuthUser && user?.name
            ? `${backendUrl}/api/users/by-email?email=${encodeURIComponent(userEmail)}&name=${encodeURIComponent(user.name || '')}&image=${encodeURIComponent(user.image || '')}`
            : `${backendUrl}/api/users/by-email?email=${encodeURIComponent(userEmail)}`;
          console.log(`[Auth] Fetching role from backend: ${url}`);
          
          // Add timeout to prevent hanging requests
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
          
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            signal: controller.signal,
            // Add cache control to prevent stale data
            cache: 'no-store',
          });
          
          clearTimeout(timeoutId);
          console.log(`[Auth] Backend response status: ${response.status} for ${userEmail}`);
          
          if (response.ok) {
            const data = await response.json();
            console.log(`[Auth] Backend response data:`, JSON.stringify(data));
            if (data.data?.role && ['viewer', 'editor', 'admin'].includes(data.data.role)) {
              role = data.data.role as UserRole;
              console.log(`[Auth] ✅ User role from database: ${role} for ${userEmail}`);
            } else {
              console.log(`[Auth] ⚠️ Invalid role in response: ${data.data?.role}`);
            }
          } else if (response.status === 404) {
            // User not found in database, will use environment variable fallback
            // Note: Backend should auto-create users, so 404 might indicate backend issue
            console.log(`[Auth] ⚠️ User not found in database (404), using environment variable check for ${userEmail}`);
          } else {
            const errorText = await response.text().catch(() => 'Unknown error');
            console.log(`[Auth] ⚠️ Backend error (${response.status}): ${errorText}`);
          }
        } catch (error: any) {
          // If backend is not available, keep existing role or fall back to environment variable check
          const errorMessage = error?.message || String(error);
          const isTimeout = error?.name === 'AbortError' || errorMessage.includes('timeout');
          const isNetworkError = errorMessage.includes('fetch failed') || 
                                 errorMessage.includes('ECONNREFUSED') ||
                                 errorMessage.includes('ENOTFOUND');
          
          if (isTimeout) {
            console.warn(`[Auth] ⚠️ Backend request timeout for ${userEmail}, using cached role: ${role}`);
            console.warn(`[Auth] 💡 Backend URL: ${API_CONFIG.BASE_URL}`);
          } else if (isNetworkError) {
            console.warn(`[Auth] ⚠️ Backend not reachable for ${userEmail} (${errorMessage}), using cached role: ${role}`);
            console.warn(`[Auth] 💡 Check if backend server is running at ${API_CONFIG.BASE_URL}`);
            console.warn(`[Auth] 💡 Verify NEXT_PUBLIC_API_URL is set correctly in .env.local`);
          } else {
            console.error(`[Auth] ❌ Backend error for ${userEmail}:`, errorMessage);
          }
          // Continue with existing role - don't throw error, just log warning
        }
        
        // Fallback: Check environment variables if database lookup failed or returned viewer
        if (role === "viewer" && userEmail) {
          const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(email => email.trim()) || [];
          const adminDomains = process.env.ADMIN_DOMAINS?.split(',').map(domain => domain.trim()) || [];
          
          const isAdmin = adminEmails.includes(userEmail) || 
                         adminDomains.some(domain => userEmail.endsWith(`@${domain}`)) ||
                         userEmail.endsWith("@yourdomain.com");
          
          if (isAdmin) {
            role = "admin";
            console.log(`[Auth] User role from environment variable: admin for ${userEmail}`);
          }
        }

        // Update token with latest role
        token.role = role;
      }

      // On first sign-in, store user info in token
      if (user) {
        token.sub = user.id?.toString() || user.email || "";
        token.email = user.email || "";
        token.name = user.name || "";
        token.image = user.image || "";
        
        // For credentials-based login, role is already set in user object
        if (user.role) {
          token.role = user.role as UserRole;
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      // Get data from token instead of database
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
      // Allow sign in without database
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

// Role-based access control helper functions (server-side)
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
export const canCreateStockAnalysis = (role: UserRole) => hasPermission(role, "editor");
export const canViewStockAnalyses = (role: UserRole) => role === "viewer" || role === "editor" || role === "admin";
export const canDeleteStockAnalysis = (role: UserRole) => hasPermission(role, "admin");
export const canViewUsers = (role: UserRole) => hasPermission(role, "admin");
