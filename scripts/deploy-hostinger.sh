#!/bin/bash
# Deploy script for Hostinger Node.js hosting
# Run this on the server after uploading files

set -e

echo "🚀 Starting deployment..."

# Navigate to project directory
cd /home/u596471450/domains/catalogsmart.ro/public_html

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf .next
rm -rf node_modules/.cache

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --production=false

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Build the application
echo "🏗️ Building application..."
npm run build

# Copy static files for standalone mode
echo "📁 Setting up standalone files..."
if [ -d ".next/standalone" ]; then
    cp -r public .next/standalone/
    cp -r .next/static .next/standalone/.next/
fi

echo "✅ Deployment complete!"
echo ""
echo "To start the app, run:"
echo "  node .next/standalone/server.js"
echo ""
echo "Or restart from Hostinger panel"

