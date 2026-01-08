#!/bin/bash
# ========================================
# CatalogSmart Deployment Script
# ========================================
# Run this script after uploading files to VPS
# or to update an existing deployment
#
# Usage: bash deploy-vps.sh [--clean]
# Options:
#   --clean   Remove development files before deploy

set -e

# Configuration
APP_NAME="catalogsmart"
APP_DIR="/var/www/catalogsmart.ro"
PM2_CONFIG="pm2.config.js"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

cd ${APP_DIR}

echo "========================================="
echo "🚀 Deploying CatalogSmart"
echo "========================================="

# ========================================
# Clean Development Files (optional)
# ========================================
if [[ "$1" == "--clean" ]]; then
    echo -e "${YELLOW}[CLEAN] Removing development files...${NC}"
    
    # Remove unnecessary files
    rm -rf .git 2>/dev/null || true
    rm -rf .github 2>/dev/null || true
    rm -rf .vscode 2>/dev/null || true
    rm -rf __tests__ 2>/dev/null || true
    rm -rf tests 2>/dev/null || true
    rm -rf coverage 2>/dev/null || true
    rm -rf .nyc_output 2>/dev/null || true
    
    # Remove dev config files
    rm -f .eslintrc.json 2>/dev/null || true
    rm -f jest.config.ts 2>/dev/null || true
    rm -f jest.setup.ts 2>/dev/null || true
    rm -f tsconfig.tsbuildinfo 2>/dev/null || true
    
    # Remove old hostinger shared hosting files
    rm -f .htaccess 2>/dev/null || true
    rm -f hostinger-start.js 2>/dev/null || true
    rm -f hostinger.md 2>/dev/null || true
    rm -f DEPLOY_HOSTINGER.md 2>/dev/null || true
    rm -f HOSTINGER_DEPLOY.md 2>/dev/null || true
    rm -f .env.hostinger 2>/dev/null || true
    rm -f scripts/deploy-hostinger.sh 2>/dev/null || true
    
    # Remove debug files
    rm -f debug_start.txt 2>/dev/null || true
    
    # Clean npm cache
    rm -rf node_modules/.cache 2>/dev/null || true
    
    echo -e "${GREEN}✅ Development files cleaned${NC}"
fi

# ========================================
# 1. Check Environment
# ========================================
echo -e "${YELLOW}[1/6] Checking environment...${NC}"

if [ ! -f ".env" ]; then
    if [ -f ".env.vps" ]; then
        echo "Copying .env.vps to .env"
        cp .env.vps .env
        echo -e "${RED}⚠️  IMPORTANT: Update DATABASE_URL password and security keys in .env${NC}"
    else
        echo -e "${RED}❌ No .env file found! Copy .env.vps to .env and configure it.${NC}"
        exit 1
    fi
fi

# ========================================
# 2. Install Dependencies
# ========================================
echo -e "${YELLOW}[2/6] Installing dependencies...${NC}"
npm ci --production=false

# ========================================
# 3. Generate Prisma Client
# ========================================
echo -e "${YELLOW}[3/6] Generating Prisma client...${NC}"
npx prisma generate

# ========================================
# 4. Run Database Migrations
# ========================================
echo -e "${YELLOW}[4/6] Running database migrations...${NC}"
npx prisma migrate deploy || {
    echo -e "${YELLOW}Migration failed, trying db push...${NC}"
    npx prisma db push --skip-generate
}

# ========================================
# 5. Build Application
# ========================================
echo -e "${YELLOW}[5/6] Building Next.js application...${NC}"
npm run build

# ========================================
# 6. Restart PM2
# ========================================
echo -e "${YELLOW}[6/6] Restarting PM2 process...${NC}"

# Check if PM2 process exists
if pm2 describe ${APP_NAME} > /dev/null 2>&1; then
    pm2 restart ${APP_NAME}
else
    # First time: start with ecosystem config
    pm2 start ${PM2_CONFIG}
    
    # Save PM2 process list for auto-restart on reboot
    pm2 save
    
    # Generate startup script (run once)
    echo -e "${YELLOW}Setting up PM2 startup...${NC}"
    pm2 startup systemd -u $(whoami) --hp $(eval echo ~$(whoami)) || true
fi

# ========================================
# Health Check
# ========================================
echo -e "${YELLOW}Waiting for app to start...${NC}"
sleep 5

# Check if app is responding
if curl -s http://localhost:3001 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Application is running on port 3001${NC}"
else
    echo -e "${YELLOW}⚠️  App may still be starting. Check logs with: pm2 logs ${APP_NAME}${NC}"
fi

# ========================================
# Summary
# ========================================
echo ""
echo "========================================="
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo "========================================="
echo ""
echo "Useful commands:"
echo "  pm2 status              # Check app status"
echo "  pm2 logs ${APP_NAME}    # View logs"
echo "  pm2 monit               # Monitor resources"
echo "  pm2 restart ${APP_NAME} # Restart app"
echo ""
pm2 status
