#!/bin/bash

# EcoExchange Project Setup Script
# This script automates the complete setup of the EcoExchange project

set -e  # Exit on any error

echo "🌱 EcoExchange Project Setup"
echo "=============================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18+ first.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js version: $(node --version)${NC}"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ npm version: $(npm --version)${NC}"
echo ""

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install

echo -e "${GREEN}✓ Dependencies installed successfully${NC}"
echo ""

# Setup environment variables
echo -e "${YELLOW}🔧 Setting up environment variables...${NC}"

if [ ! -f .env.local ]; then
    cp .env.local.example .env.local
    echo -e "${GREEN}✓ Created .env.local from template${NC}"
    echo -e "${YELLOW}⚠️  Please edit .env.local and add your actual credentials:${NC}"
    echo "   - DATABASE_URL (PostgreSQL connection string)"
    echo "   - NEXTAUTH_SECRET (generate with: openssl rand -base64 32)"
    echo "   - Google OAuth credentials"
    echo "   - Stripe API keys"
    echo ""
else
    echo -e "${YELLOW}⚠️  .env.local already exists, skipping...${NC}"
fi

# Check for PostgreSQL
echo -e "${YELLOW}🗄️  Database setup...${NC}"

if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}⚠️  PostgreSQL CLI (psql) not found.${NC}"
    echo "   Please ensure PostgreSQL is installed and DATABASE_URL is configured in .env.local"
else
    echo -e "${GREEN}✓ PostgreSQL CLI found${NC}"
fi

echo ""

# Generate Prisma Client
echo -e "${YELLOW}⚙️  Generating Prisma Client...${NC}"
npx prisma generate

echo -e "${GREEN}✓ Prisma Client generated${NC}"
echo ""

# Create directory structure
echo -e "${YELLOW}📁 Verifying directory structure...${NC}"

directories=(
    "src/app/(auth)/login"
    "src/app/(auth)/register"
    "src/app/(dashboard)/dashboard"
    "src/app/(dashboard)/plants"
    "src/app/(dashboard)/plants/new"
    "src/app/(dashboard)/marketplace"
    "src/app/(dashboard)/subscription"
    "src/app/(dashboard)/swap-requests"
    "src/app/(dashboard)/admin/approval"
    "src/app/api/auth/[...nextauth]"
    "src/app/api/webhooks/stripe"
    "src/app/api/health"
    "src/components/ui"
    "src/components/auth"
    "src/components/plants"
    "src/components/admin"
    "src/components/layout"
    "src/actions"
    "src/lib"
    "src/types"
    "prisma"
    "public/images"
)

for dir in "${directories[@]}"; do
    mkdir -p "$dir"
done

echo -e "${GREEN}✓ Directory structure verified${NC}"
echo ""

# Instructions for next steps
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Configure your .env.local file with actual credentials"
echo "2. Set up your PostgreSQL database"
echo "3. Run database migrations:"
echo -e "   ${GREEN}npx prisma db push${NC}"
echo ""
echo "4. (Optional) Seed the database with an admin user:"
echo -e "   ${GREEN}npx prisma studio${NC}"
echo ""
echo "5. Start the development server:"
echo -e "   ${GREEN}npm run dev${NC}"
echo ""
echo "6. Set up Stripe webhooks:"
echo "   - Install Stripe CLI: https://stripe.com/docs/stripe-cli"
echo "   - Run: stripe listen --forward-to localhost:3000/api/webhooks/stripe"
echo "   - Copy the webhook signing secret to STRIPE_WEBHOOK_SECRET in .env.local"
echo ""
echo "7. Configure Google OAuth:"
echo "   - Go to: https://console.cloud.google.com"
echo "   - Create OAuth 2.0 credentials"
echo "   - Add authorized redirect URI: http://localhost:3000/api/auth/callback/google"
echo "   - Copy Client ID and Secret to .env.local"
echo ""
echo -e "${GREEN}📚 Documentation:${NC}"
echo "   - Next.js 16: https://nextjs.org/docs"
echo "   - Auth.js v5: https://authjs.dev"
echo "   - Prisma 7: https://www.prisma.io/docs"
echo "   - Stripe: https://stripe.com/docs/api"
echo ""
echo -e "${GREEN}🌱 Happy building with EcoExchange!${NC}"
