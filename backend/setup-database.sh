#!/bin/bash

# Database Setup Script for Unified Authentication Manager
# This script helps set up the PostgreSQL database locally

set -e

echo "🚀 Setting up Unified Authentication Manager Database..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ PostgreSQL is not installed. Please install PostgreSQL first.${NC}"
    echo "   Windows: https://www.postgresql.org/download/windows/"
    echo "   macOS: brew install postgresql"
    echo "   Linux: sudo apt install postgresql"
    exit 1
fi

echo -e "${GREEN}✅ PostgreSQL is installed${NC}"

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from .env.example...${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${YELLOW}⚠️  Please update .env file with your database credentials${NC}"
    else
        echo -e "${RED}❌ .env.example file not found${NC}"
        exit 1
    fi
fi

# Load environment variables
source .env

# Extract database connection details from DATABASE_URL
DB_NAME=$(echo $DATABASE_URL | grep -oP '/([^?]+)' | cut -d'/' -f2 | cut -d'?' -f1)
DB_USER=$(echo $DATABASE_URL | grep -oP '://([^:]+)' | cut -d'/' -f3 | cut -d':' -f1)
DB_PASSWORD=$(echo $DATABASE_URL | grep -oP '://[^:]+:([^@]+)' | cut -d':' -f2)
DB_HOST=$(echo $DATABASE_URL | grep -oP '@([^:]+)' | cut -d'@' -f2)
DB_PORT=$(echo $DATABASE_URL | grep -oP ':\d+' | cut -d':' -f2)

echo "📊 Database Configuration:"
echo "   Database: $DB_NAME"
echo "   User: $DB_USER"
echo "   Host: $DB_HOST"
echo "   Port: $DB_PORT"

# Check if database exists
if psql -h $DB_HOST -p $DB_PORT -U $DB_USER -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
    echo -e "${GREEN}✅ Database '$DB_NAME' already exists${NC}"
else
    echo -e "${YELLOW}⚠️  Database '$DB_NAME' does not exist. Creating...${NC}"
    createdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME
    echo -e "${GREEN}✅ Database '$DB_NAME' created${NC}"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Generate Prisma Client
echo "🔧 Generating Prisma Client..."
npx prisma generate

# Run migrations
echo "🔄 Running database migrations..."
npx prisma migrate dev --name init

# Seed database (optional)
read -p "Do you want to seed the database with test data? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🌱 Seeding database..."
    npm run prisma:seed
    echo -e "${GREEN}✅ Database seeded${NC}"
fi

echo -e "${GREEN}🎉 Database setup complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Start the backend server: npm run dev"
echo "  2. Open Prisma Studio: npm run prisma:studio"
echo "  3. Connect your mobile app to the backend API"




