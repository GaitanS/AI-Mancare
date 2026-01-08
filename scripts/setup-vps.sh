#!/bin/bash
# ========================================
# VPS Initial Setup Script for CatalogSmart
# ========================================
# Run as root on Ubuntu 24.04 VPS
# Usage: sudo bash setup-vps.sh
#
# This script is designed for multi-app VPS hosting
# Each app gets its own directory, port, and PM2 process

set -e

echo "========================================="
echo "🚀 CatalogSmart VPS Setup"
echo "========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="catalogsmart"
APP_DIR="/var/www/catalogsmart.ro"
APP_PORT=3001
DB_NAME="catalogsmart"
DB_USER="catalogsmart_user"
NODE_VERSION="20"

# ========================================
# 1. System Update
# ========================================
echo -e "${YELLOW}[1/7] Updating system packages...${NC}"
apt update && apt upgrade -y

# ========================================
# 2. Install Node.js 20
# ========================================
echo -e "${YELLOW}[2/7] Installing Node.js ${NODE_VERSION}...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt install -y nodejs
fi
echo -e "${GREEN}Node.js version: $(node -v)${NC}"
echo -e "${GREEN}NPM version: $(npm -v)${NC}"

# ========================================
# 3. Install MySQL 8.0
# ========================================
echo -e "${YELLOW}[3/7] Installing MySQL 8.0...${NC}"
if ! command -v mysql &> /dev/null; then
    apt install -y mysql-server
    systemctl start mysql
    systemctl enable mysql
fi
echo -e "${GREEN}MySQL installed and running${NC}"

# ========================================
# 4. Install Nginx
# ========================================
echo -e "${YELLOW}[4/7] Installing Nginx...${NC}"
if ! command -v nginx &> /dev/null; then
    apt install -y nginx
    systemctl start nginx
    systemctl enable nginx
fi
echo -e "${GREEN}Nginx installed and running${NC}"

# ========================================
# 5. Install PM2 Globally
# ========================================
echo -e "${YELLOW}[5/7] Installing PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi
echo -e "${GREEN}PM2 version: $(pm2 -v)${NC}"

# Create PM2 log directory
mkdir -p /var/log/pm2
chmod 755 /var/log/pm2

# ========================================
# 6. Create Application Directory
# ========================================
echo -e "${YELLOW}[6/7] Creating application directory...${NC}"
mkdir -p ${APP_DIR}
mkdir -p ${APP_DIR}/storage

# Set ownership (change 'www-data' to your deploy user if needed)
chown -R www-data:www-data ${APP_DIR}
chmod -R 755 ${APP_DIR}

echo -e "${GREEN}Created: ${APP_DIR}${NC}"

# ========================================
# 7. Configure Firewall
# ========================================
echo -e "${YELLOW}[7/7] Configuring firewall (UFW)...${NC}"
apt install -y ufw

# Allow SSH, HTTP, HTTPS
ufw allow ssh
ufw allow 'Nginx Full'

# Don't expose app port directly (only via Nginx)
# ufw allow ${APP_PORT}

# Enable firewall (if not already)
echo "y" | ufw enable || true
ufw status

# ========================================
# Install Certbot for SSL
# ========================================
echo -e "${YELLOW}Installing Certbot for SSL...${NC}"
apt install -y certbot python3-certbot-nginx
mkdir -p /var/www/certbot

# ========================================
# Summary
# ========================================
echo ""
echo "========================================="
echo -e "${GREEN}✅ VPS Setup Complete!${NC}"
echo "========================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Create MySQL database and user:"
echo "   sudo mysql"
echo "   CREATE DATABASE ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
echo "   CREATE USER '${DB_USER}'@'localhost' IDENTIFIED BY 'YOUR_SECURE_PASSWORD';"
echo "   GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';"
echo "   FLUSH PRIVILEGES;"
echo "   EXIT;"
echo ""
echo "2. Upload your application to: ${APP_DIR}"
echo ""
echo "3. Copy Nginx config:"
echo "   sudo cp ${APP_DIR}/scripts/nginx-catalogsmart.conf /etc/nginx/sites-available/catalogsmart.ro"
echo "   sudo ln -s /etc/nginx/sites-available/catalogsmart.ro /etc/nginx/sites-enabled/"
echo "   sudo nginx -t && sudo systemctl reload nginx"
echo ""
echo "4. Get SSL certificate (after DNS is configured):"
echo "   sudo certbot --nginx -d catalogsmart.ro -d www.catalogsmart.ro"
echo ""
echo "5. Run deployment script:"
echo "   cd ${APP_DIR} && bash scripts/deploy-vps.sh"
echo ""
