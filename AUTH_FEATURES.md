# Authentication Features Overview

## ✨ Features Implemented

### 1. **Google OAuth Integration**
- Secure authentication using Google OAuth 2.0
- Users sign in with their Google accounts
- Profile information automatically synced (name, email, avatar)

### 2. **Role-Based Access Control (RBAC)**
Three hierarchical user roles:

| Role | Permissions |
|------|-------------|
| **Viewer** | View blog posts only |
| **Editor** | Create, edit, publish blog posts + manage workflows |
| **Admin** | All editor permissions + delete posts + manage users |

### 3. **Session Management**
- Database-backed sessions for security
- 30-day session expiration
- Automatic session refresh
- Secure sign-out functionality

### 4. **Protected Routes**
- All application routes require authentication
- Middleware-level route protection
- Automatic redirect to sign-in page for unauthenticated users

### 5. **User Interface Components**

#### Sign-In Page
- Clean, modern Google OAuth button
- Branded with Google colors
- Responsive design

#### User Profile Display
- Shows user avatar, name, and email in sidebar
- Visual role badge with color coding:
  - Admin: Purple
  - Editor: Blue
  - Viewer: Gray
- One-click sign-out button

#### Error Handling
- Custom error pages for authentication failures
- Unauthorized access page for insufficient permissions
- User-friendly error messages

## 🔐 Security Features

1. **Secure Token Storage**
   - Tokens stored in database, not localStorage
   - HTTPOnly cookies for session management
   - CSRF protection built-in

2. **OAuth Security**
   - State parameter validation
   - Nonce verification
   - Secure token exchange

3. **Permission Checks**
   - Server-side permission validation
   - Client-side UI conditional rendering
   - API route protection

## 📁 File Structure

```
├── app/
│   ├── api/
│   │   └── auth/
│   │       └── [...nextauth]/
│   │           └── route.ts          # NextAuth API handler
│   ├── auth/
│   │   ├── signin/
│   │   │   └── page.tsx              # Sign-in page
│   │   └── error/
│   │       └── page.tsx              # Auth error page
│   └── unauthorized/
│       └── page.tsx                  # Unauthorized access page
│
├── components/
│   ├── user-profile.tsx              # User profile sidebar component
│   ├── providers.tsx                 # SessionProvider wrapper
│   └── blog-post-actions.tsx        # Updated with role checks
│
├── lib/
│   ├── auth.ts                       # NextAuth configuration
│   ├── auth-utils.ts                 # Server-side auth helpers
│   └── types.ts                      # Updated with User types
│
├── types/
│   └── next-auth.d.ts                # NextAuth type extensions
│
├── middleware.ts                     # Route protection middleware
│
└── prisma/
    └── schema.prisma                 # Updated with auth models
```

## 🎯 Usage Examples

### Check User Role in Components

```typescript
import { useSession } from "next-auth/react";
import { canEditPost } from "@/lib/auth";

export function MyComponent() {
  const { data: session } = useSession();
  const canEdit = session?.user?.role ? canEditPost(session.user.role) : false;

  return (
    <div>
      {canEdit && <EditButton />}
    </div>
  );
}
```

### Protect Server Actions

```typescript
import { requireRole } from "@/lib/auth-utils";

export async function deletePost(id: string) {
  await requireRole("admin"); // Throws and redirects if not admin

  // Delete logic here
}
```

### Get Current User Server-Side

```typescript
import { getCurrentUser } from "@/lib/auth-utils";

export default async function MyPage() {
  const user = await getCurrentUser();

  return <div>Hello {user?.name}</div>;
}
```

## 🔄 User Flow

1. **Unauthenticated User**
   - Visits any protected route
   - Automatically redirected to `/auth/signin`
   - Clicks "Continue with Google"
   - Redirects to Google OAuth consent
   - Returns to application after authorization
   - Role assigned based on email domain (configurable)
   - Redirected to dashboard

2. **Viewer User**
   - Can browse all blog posts
   - Cannot see edit/publish buttons
   - Sees message: "You don't have permission to edit"

3. **Editor User**
   - Can create new blog posts
   - Can edit existing posts
   - Can trigger workflows
   - Can publish/unpublish posts

4. **Admin User**
   - All editor permissions
   - Can delete posts
   - Can change user roles (via database)
   - Full system access

## 🛠️ Customization

### Change Default Role

Edit [lib/auth.ts](lib/auth.ts:48-56):

```typescript
const isAdmin = user.email.endsWith("@yourdomain.com");
const isEditor = user.email.endsWith("@editors.com");
const role: UserRole = isAdmin ? "admin" : isEditor ? "editor" : "viewer";
```

### Add More Permissions

1. Add to [lib/auth.ts](lib/auth.ts):
```typescript
export const canDeleteWorkflow = (role: UserRole) => hasPermission(role, "admin");
```

2. Use in components:
```typescript
const canDelete = session?.user?.role ? canDeleteWorkflow(session.user.role) : false;
```

### Customize Sign-In Page

Edit [app/auth/signin/page.tsx](app/auth/signin/page.tsx) to customize branding, colors, and messaging.

## 📊 Database Schema

### Users Table
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  image TEXT,
  role TEXT DEFAULT 'viewer',
  email_verified DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME
);
```

### Sessions Table
```sql
CREATE TABLE sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_token TEXT UNIQUE NOT NULL,
  user_id INTEGER NOT NULL,
  expires DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Accounts Table
```sql
CREATE TABLE accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at INTEGER,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (provider, provider_account_id)
);
```

## 🚀 Next Steps

Consider adding:
- [ ] Email/password authentication as alternative
- [ ] Multi-factor authentication (MFA)
- [ ] User management UI for admins
- [ ] Audit logs for sensitive actions
- [ ] API key generation for programmatic access
- [ ] Team/organization support
- [ ] Invitation system for new users

## 📚 Technologies Used

- **NextAuth.js v4** - Authentication framework
- **Prisma** - Database ORM
- **SQLite** - Development database
- **TypeScript** - Type safety
- **Next.js 14** - App Router
- **Tailwind CSS** - Styling
