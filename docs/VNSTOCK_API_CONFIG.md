# Vnstock API Configuration Guide

## Overview

The Vnstock API integration allows you to download Vietnamese stock market data directly from the remote Vnstock API service. This guide explains how to configure and use the Vnstock API account in the frontend application.

## Features

- **Separate Authentication**: Vnstock API uses its own authentication system, separate from your main platform account
- **Account Management**: Register new accounts or login with existing credentials
- **Connection Testing**: Test your API connection status
- **Automatic Token Management**: Tokens are stored securely in HTTP-only cookies
- **Settings Page Integration**: Manage your Vnstock API account from the Settings page

## Configuration

### Environment Variables

Configure the Vnstock API endpoint in your `.env.local` file:

```bash
# Vnstock API Configuration (for Vietnamese stock data)
NEXT_PUBLIC_VNSTOCK_API_URL=http://72.60.233.159:8002
```

**Default Value**: `http://72.60.233.159:8002`

**Note**: The API URL is displayed in the Settings page for reference. To change it, update the environment variable and restart your development server.

### API Endpoints

The frontend communicates with the Vnstock API through Next.js API routes:

- **Login**: `POST /api/vnstock/auth/login`
- **Register**: `POST /api/vnstock/auth/register`
- **Get Current User**: `GET /api/vnstock/auth/me`
- **Logout**: `DELETE /api/vnstock/auth/logout`

## Usage

### Accessing Settings

1. Navigate to **Settings** from the main navigation menu
2. Find the **Vnstock API Configuration** section
3. View your current authentication status

### Registering a New Account

1. Click the **Register** button in the Vnstock API Configuration card
2. Fill in the registration form:
   - **Username**: Choose a unique username
   - **Email**: Enter your email address
   - **Password**: Create a secure password
3. Click **Register**
4. You will be automatically logged in after successful registration

### Logging In

1. Click the **Login** button in the Vnstock API Configuration card
2. Enter your credentials:
   - **Username**: Your Vnstock API username
   - **Password**: Your password
3. Click **Login**
4. Your authentication status will update automatically

### Testing Connection

1. After logging in, click the **Test Connection** button
2. The system will verify your authentication token
3. You'll see a success message if the connection is working

### Logging Out

1. Click the **Logout** button
2. Your Vnstock API session will be cleared
3. You'll need to login again to access Vnstock API features

## Authentication Status

The Settings page displays your current authentication status:

- **Connected** (Green): You are authenticated and can use Vnstock API features
- **Not Connected** (Gray): You need to login or register

When authenticated, you'll see:
- Your username
- Your email address (if available)
- Connection status indicator

## Integration with Other Features

Once authenticated, you can use Vnstock API features throughout the application:

- **Stock Data Download**: Download Vietnamese stock data from the Vnstock API
- **CSV Import**: Import stock data directly into stock analyses
- **Real-time Data**: Access real-time Vietnamese stock market data

## Troubleshooting

### Connection Issues

If you see connection errors:

1. **Check API URL**: Verify that `NEXT_PUBLIC_VNSTOCK_API_URL` is set correctly in your `.env.local` file
2. **Verify API Server**: Ensure the Vnstock API server is running and accessible
3. **Network Issues**: Check your network connection and firewall settings
4. **Test Connection**: Use the "Test Connection" button to diagnose issues

### Authentication Errors

If authentication fails:

1. **Invalid Credentials**: Double-check your username and password
2. **Token Expired**: Logout and login again to refresh your token
3. **Account Issues**: Contact the Vnstock API administrator if you can't access your account

### Environment Variable Not Working

If the API URL doesn't update:

1. **Restart Server**: Restart your Next.js development server after changing `.env.local`
2. **Check Format**: Ensure the URL doesn't have trailing slashes
3. **Clear Cache**: Clear your browser cache and reload the page

## Security Notes

- **HTTP-Only Cookies**: Authentication tokens are stored in HTTP-only cookies for security
- **Separate Accounts**: Vnstock API accounts are separate from your main platform account
- **Token Expiration**: Tokens expire automatically and require re-authentication
- **No Password Storage**: Passwords are never stored locally - they're sent directly to the API

## API Documentation

For more information about the Vnstock API endpoints and features, refer to:
- Vnstock API documentation
- API endpoint specifications in `/lib/vnstock-api.ts`
- Type definitions in `/lib/types/vnstock.ts`

## Support

If you encounter issues:

1. Check the error messages displayed in the Settings page
2. Review the browser console for detailed error information
3. Verify your environment configuration
4. Contact your system administrator for API access issues
