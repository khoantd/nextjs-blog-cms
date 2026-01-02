# Supabase Database Reset Guide

## Quick Reset Commands

### Option 1: Full Reset Script (Recommended)
```bash
npm run db:reset
```
This script:
- Checks for Supabase CLI installation
- Stops Supabase services
- Resets the database completely
- Starts Supabase services
- Applies schema.sql
- Applies seed.sql (if exists)

### Option 2: Direct Supabase Commands
```bash
npm run db:reset-sql
```
Equivalent to:
```bash
supabase db reset && supabase db shell < supabase/schema.sql && supabase db shell < supabase/seed.sql
```

### Option 3: Basic Supabase Reset
```bash
npm run supabase:reset
```
Just resets the database to clean state.

## Individual Commands

### Start/Stop Supabase
```bash
npm run supabase:start  # Start local Supabase
npm run supabase:stop   # Stop local Supabase
```

### Manual Steps
```bash
# 1. Reset database
supabase db reset

# 2. Apply custom schema (if needed)
supabase db shell < supabase/schema.sql

# 3. Apply seed data (if needed)
supabase db shell < supabase/seed.sql
```

## Prerequisites

1. **Install Supabase CLI** (if not installed):
   ```bash
   npm install -g supabase
   ```

2. **Initialize Supabase** (if not already done):
   ```bash
   supabase init
   ```

3. **Start local Supabase**:
   ```bash
   supabase start
   ```

## What Gets Reset

- All tables in public schema
- All extensions (pgcrypto, uuid-ossp, etc.)
- All functions and procedures
- All views and sequences
- All custom types
- All data (seed data will be reapplied)

## Access After Reset

- **Supabase Studio**: http://localhost:54323
- **Database**: localhost:54322
- **API**: http://localhost:54321

## Troubleshooting

If you encounter issues:
1. Ensure Supabase CLI is installed: `supabase --version`
2. Check if services are running: `supabase status`
3. Try manual reset: `supabase db reset --force`
4. Check logs: `supabase logs`
