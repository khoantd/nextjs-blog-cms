# Google OAuth Authentication Setup Guide

This guide will help you set up Google OAuth authentication for the Next.js Blog CMS.

## 📋 Prerequisites

- A Google Cloud account
- Node.js installed
- Database set up (SQLite by default)

## 🔧 Setup Steps

### 1. Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API"
   - Click "Enable"

4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Name: "Blog CMS"
   - Authorized JavaScript origins:
     - `http://localhost:3000` (for development)
     - Your production URL (when deployed)
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google` (for development)
     - `https://yourdomain.com/api/auth/callback/google` (for production)
   - Click "Create"
   - Save your Client ID and Client Secret

### 2. Configure Environment Variables

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in your Google OAuth credentials in `.env.local`:
   ```env
   GOOGLE_CLIENT_ID=your_google_client_id_here
   GOOGLE_CLIENT_SECRET=your_google_client_secret_here
   ```

3. Generate a NextAuth secret:
   ```bash
   openssl rand -base64 32
   ```

   Add it to `.env.local`:
   ```env
   NEXTAUTH_SECRET=your_generated_secret_here
   ```

4. Set the NextAuth URL:
   ```env
   NEXTAUTH_URL=http://localhost:3000
   ```

### 3. Update Database Schema

Run the Prisma migrations to create the authentication tables:

```bash
npm run db:generate
npm run db:migrate
```

This will create the following tables:
- `users` - Stores user information and roles
- `accounts` - Stores OAuth account information
- `sessions` - Stores user sessions
- `verification_tokens` - Stores verification tokens

### 4. Start the Application

```bash
npm run dev:all
```

Or start services individually:
```bash
npm run dev          # Next.js
npm run dev:inngest  # Inngest dev server
npm run dev:prisma   # Prisma Studio
```

## 🎭 User Roles

The application supports three roles with hierarchical permissions:

### Viewer (Default)
- Can view blog posts
- Cannot create, edit, or publish posts
- Cannot manage workflows
- Cannot manage users

### Editor
- All Viewer permissions, plus:
- Can create blog posts
- Can edit blog posts
- Can publish/unpublish posts
- Can manage workflows
- Cannot manage users

### Admin
- All Editor permissions, plus:
- Can delete blog posts
- Can manage users
- Full system access

## 🔐 Role Assignment

By default, new users are assigned the **Viewer** role. To customize role assignment:

1. **Automatic assignment by email domain:**

   Edit [lib/auth.ts](lib/auth.ts:48-56):
   ```typescript
   const isAdmin = user.email.endsWith("@yourdomain.com");
   const role: UserRole = isAdmin ? "admin" : "viewer";
   ```

2. **Manual assignment via database:**

   Use Prisma Studio (`npm run db:studio`) to manually update user roles:
   - Navigate to the `users` table
   - Find the user
   - Change the `role` field to `viewer`, `editor`, or `admin`

## 🛡️ Protected Routes

All routes are protected by default via [middleware.ts](middleware.ts). Users must be authenticated to access the application.

Exceptions:
- `/api/auth/*` - Authentication endpoints
- Static files and images
- Public assets

## 🚀 Deployment Considerations

When deploying to production:

1. Update the authorized redirect URIs in Google Cloud Console
2. Set `NEXTAUTH_URL` to your production domain
3. Use a secure `NEXTAUTH_SECRET` (never use the development one)
4. Consider using a production database (PostgreSQL, MySQL, etc.)
5. Set up proper HTTPS/SSL certificates

## 🔍 Testing Authentication

1. Navigate to `http://localhost:3000`
2. You'll be redirected to the sign-in page
3. Click "Continue with Google"
4. Authorize the application
5. You'll be redirected back to the dashboard
6. Your user profile will appear in the sidebar

## 📝 Custom Authentication Pages

- **Sign In:** [app/auth/signin/page.tsx](app/auth/signin/page.tsx)
- **Error:** [app/auth/error/page.tsx](app/auth/error/page.tsx)
- **Unauthorized:** [app/unauthorized/page.tsx](app/unauthorized/page.tsx)

## 🛠️ Troubleshooting

### "Configuration" Error
- Check that `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set correctly
- Verify that `NEXTAUTH_SECRET` is generated and set

### Redirect URI Mismatch
- Ensure redirect URIs in Google Cloud Console match exactly
- Check that `NEXTAUTH_URL` is correct

### Database Errors
- Run `npm run db:generate` and `npm run db:migrate`
- Check database connection string in `DATABASE_URL`

### Role Permissions Not Working
- Verify the user's role in the database (use Prisma Studio)
- Check that the session is refreshed after role changes
- Sign out and sign back in to refresh the session

## 📚 Additional Resources

- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Google OAuth 2.0 Guide](https://developers.google.com/identity/protocols/oauth2)
- [Prisma Documentation](https://www.prisma.io/docs/)

## 🔄 Upgrading from No Auth

If you're upgrading from a version without authentication:

1. Existing blog posts will remain accessible
2. Workflows will continue to function
3. All users need to sign in via Google OAuth
4. Assign appropriate roles to users based on their responsibilities

## 🆘 Support

For issues or questions:
- Check the [GitHub Issues](https://github.com/anthropics/claude-code/issues)
- Review NextAuth.js documentation
- Verify environment variable configuration
