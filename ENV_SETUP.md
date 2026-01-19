# Add these to your .env.local file

# Backend API URL (OPTIONAL - defaults to remote backend)
# Default (remote backend): http://72.60.233.159:3050
# For local development: http://localhost:3001
# Uncomment and set to override the default:
# NEXT_PUBLIC_API_URL=http://localhost:3001

# Alpha Vantage API (for earnings data)
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_api_key_here

# OpenAI API (for AI analysis)
OPENAI_API_KEY=your_openai_api_key_here

# Vnstock API Configuration (for Vietnamese stock data)
NEXT_PUBLIC_VNSTOCK_API_URL=http://72.60.233.159:8002

# Optional: Vnstock auto-login credentials (for development only)
# VNSTOCK_USERNAME=your_username
# VNSTOCK_PASSWORD=your_password

# Password Priority Users (comma-separated emails)
# Users listed here will prioritize password login over Google OAuth
# If a user has a password set, Google OAuth will be hidden/blocked for them
# Example: PASSWORD_PRIORITY_USERS=user1@example.com,user2@example.com
# Note: Use PASSWORD_PRIORITY_USERS for server-side (lib/auth.ts)
#       Use NEXT_PUBLIC_PASSWORD_PRIORITY_USERS for client-side (app/auth/signin/page.tsx)
# PASSWORD_PRIORITY_USERS=khoa0702@gmail.com
# NEXT_PUBLIC_PASSWORD_PRIORITY_USERS=khoa0702@gmail.com
