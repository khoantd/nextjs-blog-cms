# Quick Start: Authentication Setup

## ⚡ 5-Minute Setup

### Step 1: Get Google OAuth Credentials (2 min)

1. Visit [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create OAuth 2.0 Client ID
3. Add redirect: `http://localhost:3000/api/auth/callback/google`
4. Copy Client ID and Secret

### Step 2: Configure Environment (1 min)

```bash
# Copy example file
cp .env.example .env.local

# Generate NextAuth secret
openssl rand -base64 32
```

Add to `.env.local`:
```env
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_secret
NEXTAUTH_SECRET=your_generated_secret
NEXTAUTH_URL=http://localhost:3000
```

### Step 3: Setup Database (1 min)

```bash
npm run db:generate
npm run db:migrate
```

### Step 4: Start App (1 min)

```bash
npm run dev:all
```

Visit: `http://localhost:3000` → Sign in with Google → Done! 🎉

## 🔑 Managing User Roles

### Option 1: Via Code (Auto-assign by email)
Edit `lib/auth.ts` line 48:
```typescript
const isAdmin = user.email.endsWith("@yourdomain.com");
```

### Option 2: Via Database (Manual)
```bash
npm run db:studio
```
1. Go to `users` table
2. Find user
3. Change `role` to `admin`, `editor`, or `viewer`
4. User needs to sign out/in to refresh session

## 🛡️ Permission Quick Reference

| Action | Viewer | Editor | Admin |
|--------|--------|--------|-------|
| View posts | ✅ | ✅ | ✅ |
| Create posts | ❌ | ✅ | ✅ |
| Edit posts | ❌ | ✅ | ✅ |
| Publish posts | ❌ | ✅ | ✅ |
| Delete posts | ❌ | ❌ | ✅ |
| Manage workflows | ❌ | ✅ | ✅ |
| Manage users | ❌ | ❌ | ✅ |

## 🐛 Common Issues

**Issue:** "Configuration error"
```bash
# Check env vars are set
cat .env.local | grep GOOGLE
cat .env.local | grep NEXTAUTH
```

**Issue:** "Redirect URI mismatch"
- Google Console redirect must exactly match: `http://localhost:3000/api/auth/callback/google`

**Issue:** "Database error"
```bash
# Regenerate and migrate
npm run db:generate
npm run db:migrate
```

**Issue:** "Not showing as admin after changing role"
- Sign out and sign back in (session needs refresh)

## 📝 Code Snippets

### Check Permission in Client Component
```typescript
import { useSession } from "next-auth/react";
import { canEditPost } from "@/lib/auth";

const { data: session } = useSession();
const canEdit = session?.user?.role ? canEditPost(session.user.role) : false;
```

### Require Auth in Server Component
```typescript
import { requireAuth } from "@/lib/auth-utils";

const user = await requireAuth(); // Redirects if not authenticated
```

### Require Specific Role in Server Action
```typescript
import { requireRole } from "@/lib/auth-utils";

await requireRole("editor"); // Redirects if insufficient permission
```

### Get Current User (Server)
```typescript
import { getCurrentUser } from "@/lib/auth-utils";

const user = await getCurrentUser(); // Returns null if not authenticated
```

## 🎨 UI Components

All authentication UI is ready:
- ✅ Sign-in page with Google button
- ✅ User profile in sidebar
- ✅ Role badge display
- ✅ Sign-out button
- ✅ Error pages

## 🚀 Production Checklist

- [ ] Update Google OAuth redirect URIs for production domain
- [ ] Set `NEXTAUTH_URL` to production URL
- [ ] Use strong `NEXTAUTH_SECRET` (different from dev)
- [ ] Enable HTTPS/SSL
- [ ] Consider migrating from SQLite to PostgreSQL/MySQL
- [ ] Set up admin users before launch
- [ ] Test all user roles
- [ ] Review error handling

## 📚 More Info

- Full setup guide: [AUTHENTICATION_SETUP.md](AUTHENTICATION_SETUP.md)
- Feature details: [AUTH_FEATURES.md](AUTH_FEATURES.md)
- NextAuth docs: https://next-auth.js.org/
