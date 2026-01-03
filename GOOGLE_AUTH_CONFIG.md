# Google Authentication Configuration

This application supports reading Google OAuth configuration from either environment variables or a JSON configuration file.

## Configuration Options

### 1. JSON Configuration File (Primary Method)

The application will automatically read Google OAuth settings from `google_authen.json` file in the project root.

**File Format:**
```json
{
  "web": {
    "client_id": "your-google-client-id.apps.googleusercontent.com",
    "project_id": "your-project-id",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_secret": "your-google-client-secret",
    "redirect_uris": ["http://localhost:3000/api/auth/callback/google"],
    "javascript_origins": ["http://localhost:3000"]
  }
}
```

### 2. Environment Variables (Fallback Method)

If the JSON file is not available or doesn't contain the required values, the application will fall back to environment variables:

```bash
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## How It Works

1. **Priority**: JSON file takes priority over environment variables
2. **Fallback**: If JSON file doesn't exist or is missing values, environment variables are used
3. **Server-Side Only**: Configuration loading happens server-side to avoid client-side `fs` module issues
4. **Development Logging**: In development mode, the application logs which configuration source is being used

## Implementation Details

### Server-Side Configuration (`/lib/auth.ts`)
- Contains the actual Google auth configuration loading with `fs` module
- Used by NextAuth for server-side authentication
- Handles environment variable fallbacks

### Client-Side Utilities (`/lib/client-auth.ts`)
- Contains role-based access control functions safe for client use
- Used by React components for permission checks
- No `fs` dependencies - client-safe

### Server-Side Utilities (`/lib/auth-utils.ts`)
- Contains server-side authentication helpers
- Used by API routes for authentication and authorization
- Imports from `auth.ts` for NextAuth integration

## Architecture Benefits

- **Separation of Concerns**: Client and server auth utilities are properly separated
- **Security**: Sensitive configuration loading stays server-side
- **Compatibility**: Works with both JSON file and environment variable configurations
- **Type Safety**: TypeScript interfaces ensure proper configuration structure

## Setup Instructions

1. **Download Google OAuth credentials** from the Google Cloud Console
2. **Save as `google_authen.json`** in the project root directory
3. **Restart the application** to load the new configuration
4. **Check the console logs** in development mode to verify the configuration source

## Example Console Output (Development)

```
✅ Loaded Google auth config from google_authen.json
Google Client ID: Set
Google Client Secret: Set
NextAuth URL: http://localhost:3000
Config Source: JSON file
```

## Troubleshooting

### "Module not found: Can't resolve 'fs'" Error
This error occurs when client-side code tries to import server-side modules. The fix is:
- Client components should import from `@/lib/client-auth`
- Server components/API routes should import from `@/lib/auth`
- Never import `auth.ts` in client-side code
