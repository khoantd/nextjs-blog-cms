#!/bin/bash

# Supabase Database Reset Script
# This script drops all objects and reinstalls the schema using Supabase CLI

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting Supabase database reset...${NC}"

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}Error: Supabase CLI is not installed. Please install it first:${NC}"
    echo "npm install -g supabase"
    exit 1
fi

# Check if Supabase is initialized
if [ ! -d "supabase" ]; then
    echo -e "${RED}Error: supabase directory not found. Please run 'supabase init' first.${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1: Stopping Supabase services...${NC}"
supabase stop || echo "Supabase services already stopped"

echo -e "${YELLOW}Step 2: Resetting database...${NC}"
# Reset the database completely
supabase db reset --linked || {
    echo -e "${YELLOW}Linked reset failed, trying local reset...${NC}"
    supabase db reset || {
        echo -e "${RED}Error: Failed to reset database${NC}"
        exit 1
    }
}

echo -e "${YELLOW}Step 3: Starting Supabase services...${NC}"
supabase start

echo -e "${YELLOW}Step 4: Applying schema migrations...${NC}"
# Apply schema changes
supabase db push || {
    echo -e "${YELLOW}Push failed, trying direct schema application...${NC}"
    if [ -f "supabase/schema.sql" ]; then
        supabase db shell < supabase/schema.sql
        echo -e "${GREEN}Schema applied successfully${NC}"
    else
        echo -e "${RED}Error: supabase/schema.sql not found${NC}"
        exit 1
    fi
}

echo -e "${YELLOW}Step 5: Applying seed data...${NC}"
# Apply seed data if it exists
if [ -f "supabase/seed.sql" ]; then
    supabase db shell < supabase/seed.sql
    echo -e "${GREEN}Seed data applied successfully${NC}"
else
    echo -e "${YELLOW}Warning: supabase/seed.sql not found, skipping seed data${NC}"
fi

echo -e "${GREEN}Supabase database reset completed successfully!${NC}"
echo -e "${GREEN}Local Supabase is running at: http://localhost:54323${NC}"
