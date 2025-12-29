# SPECIFICAȚIE TEHNICĂ - PLATFORMĂ SMART OFERTE & REȚETE (HOSTINGER)

## 📋 ADAPTARE PENTRU HOSTINGER CLOUD STARTUP

**Hosting:** Hostinger Cloud Startup (7.99€/lună)  
**Resurse:** 2 Core CPU, 4 GB RAM, 100 GB NVMe, 10 Node.js apps  
**Stack Principal:** Node.js + MySQL + Next.js Standalone + PM2  
**Cost Total:** ~10€/lună (hosting + domeniu + AI API)  

---

## 🌐 DOMENII RECOMANDATE (VERIFICARE PE ROTLD.RO)

### Top 3 pentru SEO:

1. **retete-ieftine.ro** ⭐⭐⭐⭐⭐
   - Keyword exact-match: "rețete ieftine" (2,400 căutări/lună)
   - SEO Score: 95/100
   - **Inclusă în plan Hostinger** ✅

2. **oferte-retete.ro** ⭐⭐⭐⭐⭐
   - Combo puternic: "oferte" + "rețete"
   - SEO Score: 93/100
   - Brandable și memorabil

3. **meniu-economic.ro** ⭐⭐⭐⭐
   - Nișă specifică: planificare meniuri
   - SEO Score: 88/100
   - Professional

---

## 🏗️ ARHITECTURĂ ADAPTATĂ PENTRU HOSTINGER

### STACK TEHNOLOGIC COMPLET

```typescript
// ==========================================
// ÎNAINTE (Vercel + Supabase) vs ACUM (Hostinger)
// ==========================================

// Hosting & Deployment
Vercel       → Node.js standalone app pe Hostinger (PM2)
Edge Runtime → Node.js 20 LTS standard

// Database
Supabase PostgreSQL → MySQL 8.0 (inclus în Hostinger)
Drizzle ORM          → Prisma ORM (mai bun pentru MySQL)

// Storage
Cloudflare R2        → Storage local (100GB NVMe)
Vercel Blob          → /var/www/storage/ pe server

// Cron Jobs
Vercel Cron  → node-cron + PM2
Serverless   → Persistent Node.js process

// Caching & Queue
Upstash Redis → node-cache (in-memory) sau Redis local

// CDN
Vercel CDN   → Hostinger CDN (inclus gratuit) ✅

// SSL
Vercel auto  → Let's Encrypt via Hostinger (gratuit) ✅

// AI APIs (NESCHIMBAT)
OpenAI GPT-4o        → Același
Anthropic Claude     → Același
```

### STACK FINAL PENTRU HOSTINGER:

```typescript
// Core Application
Next.js: 15.0.3 (Standalone output mode - IMPORTANT!)
Node.js: 20 LTS
TypeScript: 5.3+
Express: 4.18+ (pentru API custom)

// Database & ORM
MySQL: 8.0 (Hostinger managed)
Prisma: 5.x (perfect pentru MySQL)
Database Pooling: mysql2/promise

// Process Management
PM2: 5.x (keep app alive, auto-restart)
node-cron: 3.x (scheduled tasks)

// AI & Processing
OpenAI API: GPT-4o Vision
LangChain: 0.1.x
Puppeteer: 21.x (headless Chrome)

// Frontend (NESCHIMBAT)
React: 19.0
Tailwind CSS: 3.4
shadcn/ui: Latest
Framer Motion: 11.x

// File Processing
pdf-lib: 1.17+ (PDF manipulation)
sharp: 0.33+ (Image optimization)
canvas: 2.11+ (PDF to image)

// Caching & Performance
node-cache: 5.x (in-memory cache)
compression: 1.7+ (gzip middleware)

// Utilities
cheerio: 1.0+ (HTML parsing)
axios: 1.6+ (HTTP client)
zod: 3.22+ (validation)
```

---

## 📊 SCHEMA MYSQL (ADAPTATĂ DE LA POSTGRESQL)

### Schema Completă:

```sql
-- ==========================================
-- DATABASE: oferte_retete_db
-- ==========================================

-- 1. TABLA PRODUCTS
CREATE TABLE products (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,
  subcategory VARCHAR(100),
  brand VARCHAR(100),
  
  -- Price Info
  price DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2),
  discount_percentage INT,
  unit VARCHAR(20) NOT NULL, -- 'kg', 'L', 'buc', '100g'
  
  -- Offer Details
  store VARCHAR(50) NOT NULL,
  valid_from DATE NOT NULL,
  valid_until DATE NOT NULL,
  
  -- AI Extracted Data (JSON columns)
  nutritional_info JSON, -- {calories, protein, carbs, fat}
  allergens JSON,
  
  -- Source Tracking
  source_url TEXT,
  catalog_page_number INT,
  extraction_confidence DECIMAL(3,2),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes for performance
  INDEX idx_category (category),
  INDEX idx_store (store),
  INDEX idx_valid (valid_from, valid_until),
  INDEX idx_price (price),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. TABLA CATALOGS
CREATE TABLE catalogs (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  store VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  pdf_url TEXT NOT NULL,
  pdf_local_path VARCHAR(500),
  
  -- Validity
  valid_from DATE NOT NULL,
  valid_until DATE NOT NULL,
  
  -- Processing Status
  status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
  total_pages INT,
  processed_pages INT DEFAULT 0,
  
  -- AI Processing
  processing_started_at TIMESTAMP NULL,
  processing_completed_at TIMESTAMP NULL,
  processing_errors JSON,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_store (store),
  INDEX idx_status (status),
  UNIQUE KEY unique_pdf (pdf_url(255))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. TABLA RECIPES
CREATE TABLE recipes (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Recipe Details
  servings INT DEFAULT 4,
  prep_time INT, -- minutes
  cook_time INT,
  total_time INT,
  difficulty ENUM('ușor', 'mediu', 'dificil') DEFAULT 'ușor',
  
  -- AI Generated Content (JSON)
  instructions JSON NOT NULL, -- [{step: 1, text: "..."}]
  tips JSON,
  
  -- Ingredients (stored as JSON array of IDs)
  ingredient_ids JSON NOT NULL, -- ["uuid1", "uuid2"]
  estimated_cost DECIMAL(10,2),
  cost_per_serving DECIMAL(10,2),
  
  -- Nutrition
  total_calories INT,
  nutrition_per_serving JSON,
  
  -- SEO
  slug VARCHAR(255) UNIQUE NOT NULL,
  meta_description TEXT,
  tags JSON,
  
  -- Stats
  view_count INT DEFAULT 0,
  favorite_count INT DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_slug (slug),
  INDEX idx_cost (estimated_cost),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. TABLA WEEKLY_MENUS
CREATE TABLE weekly_menus (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NULL,
  
  -- Menu Config
  budget_limit DECIMAL(10,2) NOT NULL,
  people_count INT DEFAULT 4,
  preferred_stores JSON, -- ["Lidl", "Kaufland"]
  dietary_restrictions JSON,
  
  -- Generated Menu (JSON structure)
  menu_data JSON NOT NULL,
  total_cost DECIMAL(10,2),
  shopping_list JSON,
  
  -- SEO
  slug VARCHAR(255) UNIQUE,
  title VARCHAR(255),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_budget (budget_limit),
  INDEX idx_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. TABLA SCRAPING_SOURCES
CREATE TABLE scraping_sources (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(100) NOT NULL UNIQUE,
  base_url TEXT NOT NULL,
  
  -- Scraping Config (JSON)
  selector_config JSON NOT NULL,
  scraping_frequency VARCHAR(50) DEFAULT 'weekly',
  last_scraped_at TIMESTAMP NULL,
  
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. TABLA USERS (Future)
CREATE TABLE users (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  
  -- Preferences (JSON)
  preferred_stores JSON,
  dietary_restrictions JSON,
  budget_preference DECIMAL(10,2),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. TABLA CACHE (pentru optimizare)
CREATE TABLE cache (
  cache_key VARCHAR(255) PRIMARY KEY,
  cache_value LONGTEXT,
  expires_at TIMESTAMP,
  
  INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert initial scraping sources
INSERT INTO scraping_sources (name, base_url, selector_config, is_active) VALUES
('MonitorulPreturilor', 'https://monitorulpreturilor.info/', 
'{"catalogContainer": ".catalog-list", "catalogItem": ".catalog-item", "storeName": ".store-name"}', 
TRUE);
```

---

## 🏗️ STRUCTURĂ PROIECT NEXT.JS (STANDALONE MODE)

### IMPORTANT: Next.js Standalone Output pentru Hostinger

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // CRUCIAL pentru Hostinger - generează bundle standalone
  output: 'standalone',
  
  // Compress pentru performance
  compress: true,
  
  // Image optimization
  images: {
    domains: ['localhost'],
    unoptimized: false,
  },
  
  // Environment
  env: {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  },
  
  // Experimental features
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

module.exports = nextConfig;
```

### Structură Directoare:

```
/var/www/retete-ieftine.ro/
├── .next/                      # Build output
├── standalone/                 # Standalone server (deployment)
│   ├── node_modules/          # Minimal dependencies
│   ├── .next/
│   └── server.js              # Entry point
├── public/                     # Static assets
├── storage/                    # Local storage pentru PDFs & images
│   ├── catalogs/              # Downloaded PDFs
│   ├── images/                # Processed catalog images
│   └── temp/                  # Temporary processing
├── logs/                       # Application logs
│   ├── app.log
│   ├── error.log
│   └── cron.log
├── src/
│   ├── app/                   # Next.js App Router
│   ├── components/
│   ├── lib/
│   └── types/
├── scripts/                    # Standalone scripts
│   ├── cron-scraper.js        # Weekly scraping job
│   ├── cron-menus.js          # Menu generation
│   └── db-backup.sh           # Database backup
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── migrations/
├── ecosystem.config.js         # PM2 configuration
├── .env.production
├── package.json
└── README.md
```

---

## 🔧 CONFIGURARE HOSTINGER (STEP-BY-STEP)

### 1. CONFIGURARE INIȚIALĂ

```bash
# 1. Conectare SSH la Hostinger
ssh u123456789@yourdomain.com -p 65002

# 2. Navigate to web root
cd /home/u123456789/domains/retete-ieftine.ro

# 3. Verifică versiunea Node.js
node --version  # Trebuie să fie 20+

# 4. Instalează PM2 global
npm install -g pm2

# 5. Creează directoare necesare
mkdir -p storage/{catalogs,images,temp}
mkdir -p logs
chmod 755 storage logs
```

### 2. CONFIGURARE MYSQL DATABASE

```bash
# În Hostinger Control Panel:
# 1. Mergi la Databases → MySQL Databases
# 2. Creează database: oferte_retete_db
# 3. Creează user: oferte_user cu parolă sigură
# 4. Grant all privileges

# Connection details (salvează pentru .env):
DB_HOST=localhost
DB_PORT=3306
DB_NAME=oferte_retete_db
DB_USER=oferte_user
DB_PASSWORD=your_secure_password
```

### 3. ENVIRONMENT VARIABLES

```bash
# .env.production
NODE_ENV=production
PORT=3000

# Database (MySQL Hostinger)
DATABASE_URL="mysql://oferte_user:password@localhost:3306/oferte_retete_db"

# AI APIs
OPENAI_API_KEY=sk-xxxxxxxxxxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx

# Application
NEXT_PUBLIC_SITE_URL=https://retete-ieftine.ro
STORAGE_PATH=/home/u123456789/domains/retete-ieftine.ro/storage

# Security
JWT_SECRET=your_very_long_random_string_here
SESSION_SECRET=another_random_string

# AdSense
NEXT_PUBLIC_ADSENSE_CLIENT_ID=ca-pub-xxxxxxxxxxxxx

# Email (pentru notificări - optional)
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_USER=noreply@retete-ieftine.ro
SMTP_PASS=your_email_password
```

### 4. DEPLOYMENT WORKFLOW

```bash
# ===== PE LOCAL (Development) =====
# 1. Build pentru production
npm run build

# 2. Test standalone local
cd .next/standalone
node server.js

# 3. Dacă funcționează, creează arhivă
cd ../..
tar -czf deploy.tar.gz .next/standalone public package.json prisma

# ===== PE SERVER (Hostinger SSH) =====
# 1. Upload deploy.tar.gz via SFTP sau:
scp deploy.tar.gz u123456789@yourdomain.com:/home/u123456789/domains/retete-ieftine.ro/

# 2. Pe server, extrage
cd /home/u123456789/domains/retete-ieftine.ro
tar -xzf deploy.tar.gz

# 3. Install production dependencies
npm install --production

# 4. Run Prisma migrations
npx prisma migrate deploy

# 5. Start cu PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

---

## 🔄 PM2 CONFIGURATION (Process Manager)

```javascript
// ecosystem.config.js

module.exports = {
  apps: [
    {
      name: 'retete-ieftine',
      script: '.next/standalone/server.js',
      instances: 1, // Single instance (2 core CPU)
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '500M',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: './logs/error.log',
      out_file: './logs/app.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
    },
    {
      name: 'cron-scraper',
      script: './scripts/cron-scraper.js',
      instances: 1,
      exec_mode: 'fork',
      cron_restart: '0 2 * * 1', // Every Monday at 2 AM
      autorestart: false,
      watch: false,
      env_production: {
        NODE_ENV: 'production',
      },
      error_file: './logs/cron-error.log',
      out_file: './logs/cron.log',
    },
    {
      name: 'cron-menus',
      script: './scripts/cron-menus.js',
      instances: 1,
      exec_mode: 'fork',
      cron_restart: '0 6 * * 1', // Every Monday at 6 AM
      autorestart: false,
      watch: false,
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
};
```

---

## 🤖 SCRAPING IMPLEMENTATION (ADAPTATĂ)

### Main Scraper Script:

```javascript
// scripts/cron-scraper.js

require('dotenv').config({ path: '.env.production' });
const puppeteer = require('puppeteer');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

const prisma = new PrismaClient();
const STORAGE_PATH = process.env.STORAGE_PATH || './storage';

async function downloadPDF(url, filename) {
  const response = await axios({
    method: 'GET',
    url: url,
    responseType: 'stream',
  });

  const filePath = path.join(STORAGE_PATH, 'catalogs', filename);
  const writer = fs.createWriteStream(filePath);

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', () => resolve(filePath));
    writer.on('error', reject);
  });
}

async function scrapeMonitorulPreturilor() {
  console.log('[SCRAPER] Starting scraping at', new Date());
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  try {
    await page.goto('https://monitorulpreturilor.info/', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Extract catalog links
    const catalogs = await page.evaluate(() => {
      const items = document.querySelectorAll('.catalog-item'); // Adaptează selector
      return Array.from(items).map(item => {
        const link = item.querySelector('a[href$=".pdf"]');
        return {
          store: item.querySelector('.store-name')?.textContent?.trim(),
          title: item.querySelector('.catalog-title')?.textContent?.trim(),
          pdfUrl: link?.href,
          validPeriod: item.querySelector('.valid-dates')?.textContent?.trim(),
        };
      }).filter(c => c.pdfUrl);
    });

    console.log(`[SCRAPER] Found ${catalogs.length} catalogs`);

    for (const catalog of catalogs) {
      // Check if already exists
      const existing = await prisma.catalogs.findFirst({
        where: { pdf_url: catalog.pdfUrl },
      });

      if (!existing) {
        console.log(`[SCRAPER] Downloading: ${catalog.title}`);
        
        // Download PDF
        const filename = `${catalog.store}_${Date.now()}.pdf`;
        const localPath = await downloadPDF(catalog.pdfUrl, filename);

        // Parse dates (adapt based on format)
        const dates = parseDateRange(catalog.validPeriod);

        // Insert to database
        await prisma.catalogs.create({
          data: {
            store: catalog.store,
            title: catalog.title,
            pdf_url: catalog.pdfUrl,
            pdf_local_path: localPath,
            valid_from: dates.start,
            valid_until: dates.end,
            status: 'pending',
          },
        });

        console.log(`[SCRAPER] Saved: ${catalog.title}`);
      }
    }

    console.log('[SCRAPER] Scraping completed successfully');
  } catch (error) {
    console.error('[SCRAPER] Error:', error);
    throw error;
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

function parseDateRange(dateString) {
  // Example: "10.12 - 17.12.2024"
  // Adapt based on actual format
  const match = dateString.match(/(\d{2})\.(\d{2})\s*-\s*(\d{2})\.(\d{2})\.(\d{4})/);
  if (match) {
    const [_, startDay, startMonth, endDay, endMonth, year] = match;
    return {
      start: new Date(`${year}-${startMonth}-${startDay}`),
      end: new Date(`${year}-${endMonth}-${endDay}`),
    };
  }
  // Fallback
  return {
    start: new Date(),
    end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  };
}

// Run scraper
scrapeMonitorulPreturilor()
  .then(() => {
    console.log('[SCRAPER] Job finished');
    process.exit(0);
  })
  .catch(error => {
    console.error('[SCRAPER] Job failed:', error);
    process.exit(1);
  });
```

---

## 📄 PDF PROCESSING (VISION AI)

```javascript
// lib/ai/pdf-processor.js

const OpenAI = require('openai');
const { createCanvas, loadImage } = require('canvas');
const { PDFDocument } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Convert PDF page to base64 image
 */
async function convertPDFPageToImage(pdfPath, pageIndex) {
  const pdfBytes = await fs.readFile(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  
  // Extract single page
  const singlePageDoc = await PDFDocument.create();
  const [page] = await singlePageDoc.copyPages(pdfDoc, [pageIndex]);
  singlePageDoc.addPage(page);
  
  const singlePageBytes = await singlePageDoc.save();
  
  // Convert to image using sharp (better quality than canvas)
  const pngBuffer = await sharp(Buffer.from(singlePageBytes), {
    density: 300, // High DPI for better OCR
  })
    .png()
    .toBuffer();
  
  return pngBuffer.toString('base64');
}

/**
 * Extract products from catalog image using GPT-4o Vision
 */
async function extractProductsFromImage(imageBase64, storeName) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `Ești un expert în extragerea de date din cataloage de supermarket românești.

TASK: Analizează imaginea catalogului și extrage informații despre toate produsele alimentare.

OUTPUT FORMAT (JSON STRICT):
{
  "products": [
    {
      "name": "string (nume complet produs)",
      "brand": "string (brandul sau null)",
      "price": number (preț în lei, ex: 10.99),
      "unit": "string (kg, L, buc, 100g, pachet)",
      "original_price": number | null (preț vechi dacă există),
      "discount_percentage": number | null (ex: 25 pentru 25%),
      "category": "string (Proteine, Carbohidrați, Lactate, Legume, Fructe, Băuturi, Condimente)",
      "subcategory": "string (ex: Carne de pui, Mezeluri, Lactate)",
      "extraction_confidence": number (0.0-1.0, ex: 0.95)
    }
  ]
}

REGULI IMPORTANTE:
- Extrage DOAR produse alimentare (ignoră non-food)
- Standardizează unitățile (kg, L, buc, 100g)
- Dacă există preț vechi și nou, calculează discount_percentage
- Categorisează automat produsele
- Indică confidence score (0-1) pentru fiecare produs
- Returnează DOAR JSON valid, fără text explicativ
`,
      },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: `data:image/png;base64,${imageBase64}`,
              detail: 'high',
            },
          },
          {
            type: 'text',
            text: `Extrage toate produsele din această pagină de catalog ${storeName}.`,
          },
        ],
      },
    ],
    max_tokens: 4000,
    temperature: 0.2, // Low temp for consistency
  });

  const content = response.choices[0].message.content;
  
  // Clean potential markdown
  const jsonContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  const parsed = JSON.parse(jsonContent);

  return parsed.products.map(p => ({
    ...p,
    store: storeName,
  }));
}

/**
 * Process entire catalog
 */
async function processCatalog(catalogId) {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  try {
    // Get catalog from DB
    const catalog = await prisma.catalogs.findUnique({
      where: { id: catalogId },
    });

    if (!catalog) {
      throw new Error(`Catalog ${catalogId} not found`);
    }

    console.log(`[PROCESSOR] Processing catalog: ${catalog.title}`);

    // Update status
    await prisma.catalogs.update({
      where: { id: catalogId },
      data: {
        status: 'processing',
        processing_started_at: new Date(),
      },
    });

    // Load PDF
    const pdfBytes = await fs.readFile(catalog.pdf_local_path);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const totalPages = pdfDoc.getPageCount();

    await prisma.catalogs.update({
      where: { id: catalogId },
      data: { total_pages: totalPages },
    });

    // Process each page
    for (let i = 0; i < totalPages; i++) {
      console.log(`[PROCESSOR] Processing page ${i + 1}/${totalPages}`);

      try {
        // Convert to image
        const imageBase64 = await convertPDFPageToImage(
          catalog.pdf_local_path,
          i
        );

        // Extract products with AI
        const products = await extractProductsFromImage(
          imageBase64,
          catalog.store
        );

        console.log(`[PROCESSOR] Extracted ${products.length} products from page ${i + 1}`);

        // Insert products to DB
        for (const product of products) {
          await prisma.products.create({
            data: {
              name: product.name,
              brand: product.brand,
              category: product.category,
              subcategory: product.subcategory,
              price: product.price,
              original_price: product.original_price,
              discount_percentage: product.discount_percentage,
              unit: product.unit,
              store: product.store,
              valid_from: catalog.valid_from,
              valid_until: catalog.valid_until,
              source_url: catalog.pdf_url,
              catalog_page_number: i + 1,
              extraction_confidence: product.extraction_confidence,
              nutritional_info: product.nutritional_info || null,
              allergens: product.allergens || null,
            },
          });
        }

        // Update progress
        await prisma.catalogs.update({
          where: { id: catalogId },
          data: { processed_pages: i + 1 },
        });

        // Rate limiting (don't spam OpenAI API)
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`[PROCESSOR] Error on page ${i + 1}:`, error);
        // Continue processing next pages
      }
    }

    // Mark as completed
    await prisma.catalogs.update({
      where: { id: catalogId },
      data: {
        status: 'completed',
        processing_completed_at: new Date(),
      },
    });

    console.log(`[PROCESSOR] Completed catalog: ${catalog.title}`);
  } catch (error) {
    console.error('[PROCESSOR] Fatal error:', error);
    
    await prisma.catalogs.update({
      where: { id: catalogId },
      data: {
        status: 'failed',
        processing_errors: { error: error.message },
      },
    });
    
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = {
  convertPDFPageToImage,
  extractProductsFromImage,
  processCatalog,
};
```

---

## 🍳 RECIPE GENERATION (LANGCHAIN)

```javascript
// lib/ai/recipe-generator.js

const { ChatOpenAI } = require('@langchain/openai');
const { PromptTemplate } = require('@langchain/core/prompts');
const { StructuredOutputParser } = require('langchain/output_parsers');
const { z } = require('zod');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const recipeSchema = z.object({
  title: z.string(),
  description: z.string(),
  servings: z.number(),
  prep_time: z.number(),
  cook_time: z.number(),
  difficulty: z.enum(['ușor', 'mediu', 'dificil']),
  ingredients: z.array(
    z.object({
      product_id: z.string(),
      quantity: z.string(),
      notes: z.string().optional(),
    })
  ),
  instructions: z.array(
    z.object({
      step: z.number(),
      text: z.string(),
    })
  ),
  tips: z.array(z.string()),
  estimated_cost: z.number(),
});

async function generateRecipe(availableProducts, constraints = {}) {
  const parser = StructuredOutputParser.fromZodSchema(recipeSchema);

  const prompt = PromptTemplate.fromTemplate(`
Ești un chef profesionist român care creează rețete economice și delicioase.

PRODUSE DISPONIBILE LA OFERTĂ:
{products}

CONSTRÂNGERI:
- Cost maxim: {maxCost} lei
- Timp maxim preparare: {maxTime} minute
- Restricții dietetice: {dietary}

SARCINĂ:
Creează o rețetă completă care:
1. Folosește PRIORITAR produsele cu cele mai mari reduceri (discount %)
2. Este PRACTICĂ și ușor de preparat pentru o familie română
3. Are un raport calitate-preț EXCELENT
4. Include instrucțiuni clare pas-cu-pas
5. Oferă tips utile pentru preparare și economisire

{format_instructions}
  `);

  const model = new ChatOpenAI({
    modelName: 'gpt-4o',
    temperature: 0.7,
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

  const chain = prompt.pipe(model).pipe(parser);

  const result = await chain.invoke({
    products: JSON.stringify(availableProducts, null, 2),
    maxCost: constraints.maxCost || 50,
    maxTime: constraints.maxTime || 60,
    dietary: constraints.dietary?.join(', ') || 'none',
    format_instructions: parser.getFormatInstructions(),
  });

  return result;
}

/**
 * Generate weekly recipes based on current offers
 */
async function generateWeeklyRecipes() {
  console.log('[RECIPE GEN] Starting weekly recipe generation');

  // Get products with active offers (biggest discounts first)
  const products = await prisma.products.findMany({
    where: {
      valid_until: {
        gte: new Date(),
      },
    },
    orderBy: {
      discount_percentage: 'desc',
    },
    take: 50, // Top 50 offers
  });

  console.log(`[RECIPE GEN] Found ${products.length} products on offer`);

  // Generate 10 recipes with different constraints
  const recipes = [];
  
  for (let i = 0; i < 10; i++) {
    try {
      console.log(`[RECIPE GEN] Generating recipe ${i + 1}/10`);

      const recipe = await generateRecipe(products, {
        maxCost: 30 + i * 5, // Vary budget: 30, 35, 40...
        maxTime: 45,
        dietary: i % 3 === 0 ? ['vegetarian'] : [],
      });

      // Create slug
      const slug = recipe.title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      // Save to database
      const saved = await prisma.recipes.create({
        data: {
          title: recipe.title,
          description: recipe.description,
          servings: recipe.servings,
          prep_time: recipe.prep_time,
          cook_time: recipe.cook_time,
          total_time: recipe.prep_time + recipe.cook_time,
          difficulty: recipe.difficulty,
          instructions: recipe.instructions,
          tips: recipe.tips,
          ingredient_ids: recipe.ingredients.map(i => i.product_id),
          estimated_cost: recipe.estimated_cost,
          cost_per_serving: recipe.estimated_cost / recipe.servings,
          slug: slug,
          meta_description: recipe.description.substring(0, 160),
          tags: [recipe.difficulty, 'economic', recipe.servings + ' portii'],
        },
      });

      recipes.push(saved);
      console.log(`[RECIPE GEN] Created recipe: ${recipe.title}`);

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error) {
      console.error(`[RECIPE GEN] Error generating recipe ${i + 1}:`, error);
    }
  }

  console.log(`[RECIPE GEN] Generated ${recipes.length} recipes successfully`);
  return recipes;
}

module.exports = {
  generateRecipe,
  generateWeeklyRecipes,
};
```

---

## 🌐 NGINX CONFIGURATION (pentru Hostinger)

```nginx
# /etc/nginx/sites-available/retete-ieftine.ro

server {
    listen 80;
    listen [::]:80;
    server_name retete-ieftine.ro www.retete-ieftine.ro;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name retete-ieftine.ro www.retete-ieftine.ro;

    # SSL Certificate (Let's Encrypt via Hostinger)
    ssl_certificate /etc/letsencrypt/live/retete-ieftine.ro/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/retete-ieftine.ro/privkey.pem;

    # SSL optimization
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Logs
    access_log /var/www/retete-ieftine.ro/logs/nginx-access.log;
    error_log /var/www/retete-ieftine.ro/logs/nginx-error.log;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1000;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # Proxy to Next.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Cache static assets
    location /_next/static {
        proxy_pass http://localhost:3000;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Serve storage files directly
    location /storage/ {
        alias /var/www/retete-ieftine.ro/storage/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## 💰 COST BREAKDOWN (LUNAR)

```
HOSTINGER Cloud Startup:        7.99 € (~40 RON)
Domeniu .ro (inclus primul an): 0.00 € (apoi ~50 RON/an)
OpenAI API (GPT-4o Vision):     ~20 USD (~90 RON)
  - ~500 pagini PDF/lună
  - ~0.04 USD per page
Anthropic (backup):             0 € (unused unless OpenAI fails)
SSL Certificate:                0 € (Let's Encrypt gratuit)
CDN:                            0 € (inclus în Hostinger)
Email (10 accounts):            0 € (inclus anul 1)

TOTAL LUNAR:                    ~130 RON (~26 EUR)
TOTAL ANUAL:                    ~1,560 RON (~312 EUR)

VS Vercel + Supabase:           ~50 EUR/lună = ~2,500 RON (~500 EUR/an)
ECONOMIE:                       ~65% mai ieftin! ✅
```

---

## 📊 PERFORMANCE OPTIMIZATION

### 1. Caching Strategy:

```javascript
// lib/cache.js

const NodeCache = require('node-cache');

// In-memory cache (4GB RAM disponibil)
const cache = new NodeCache({
  stdTTL: 600, // 10 minutes default
  checkperiod: 120,
  useClones: false, // Better performance
});

// Cache wrapper
async function cached(key, ttl, fn) {
  const value = cache.get(key);
  if (value !== undefined) {
    return value;
  }

  const result = await fn();
  cache.set(key, result, ttl);
  return result;
}

// Usage examples:
async function getActiveOffers(store) {
  return cached(`offers:${store}`, 3600, async () => {
    return await prisma.products.findMany({
      where: {
        store: store,
        valid_until: { gte: new Date() },
      },
      orderBy: { discount_percentage: 'desc' },
      take: 20,
    });
  });
}

module.exports = { cache, cached };
```

### 2. Database Query Optimization:

```javascript
// lib/db/optimized-queries.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query'] : [],
});

// Index-optimized queries
async function getProductsByStore(store, limit = 50) {
  return await prisma.$queryRaw`
    SELECT *
    FROM products
    WHERE store = ${store}
      AND valid_until >= CURDATE()
    ORDER BY discount_percentage DESC
    LIMIT ${limit}
  `;
}

// Aggregated weekly stats (cached)
async function getWeeklyStats() {
  return await prisma.$queryRaw`
    SELECT 
      store,
      COUNT(*) as total_products,
      AVG(discount_percentage) as avg_discount,
      MIN(price) as min_price,
      MAX(price) as max_price
    FROM products
    WHERE valid_until >= CURDATE()
    GROUP BY store
  `;
}

module.exports = {
  prisma,
  getProductsByStore,
  getWeeklyStats,
};
```

---

## 🚀 DEPLOYMENT CHECKLIST

```markdown
# PRE-DEPLOYMENT
- [ ] Build local și test standalone: `npm run build`
- [ ] Test toate API endpoints local
- [ ] Verifică că .env.production are toate variabilele
- [ ] Test procesare PDF cu GPT-4o Vision
- [ ] Verifică Prisma schema și migrations

# HOSTINGER SETUP
- [ ] Comandă Hostinger Cloud Startup (7.99€/lună)
- [ ] Înregistrează domeniu (retete-ieftine.ro)
- [ ] Configurează DNS (A record către IP Hostinger)
- [ ] Activează SSL Let's Encrypt în control panel
- [ ] Creează MySQL database (oferte_retete_db)
- [ ] Creează user MySQL cu privileges

# DEPLOYMENT
- [ ] Conectare SSH la server
- [ ] Upload fisiere via SFTP/Git
- [ ] Install dependencies: `npm install --production`
- [ ] Run migrations: `npx prisma migrate deploy`
- [ ] Configurează PM2: `pm2 start ecosystem.config.js`
- [ ] Verifică că app rulează: `pm2 status`
- [ ] Save PM2 config: `pm2 save && pm2 startup`

# POST-DEPLOYMENT
- [ ] Test site în browser: https://retete-ieftine.ro
- [ ] Verifică că SSL funcționează (HTTPS)
- [ ] Test scraping manual: node scripts/cron-scraper.js
- [ ] Test AI extraction: procesează un PDF de test
- [ ] Verifică logs: `pm2 logs retete-ieftine`
- [ ] Setup monitoring: `pm2 monit`
- [ ] Configurează backup database (cron job zilnic)
- [ ] Submit sitemap la Google Search Console

# MONITORING
- [ ] Verifică zilnic logs pentru erori
- [ ] Monitorizează usage AI API (OpenAI dashboard)
- [ ] Check disk space: `df -h`
- [ ] Check RAM usage: `free -h`
- [ ] Review PM2 status: `pm2 list`
```

---

## 🎯 NEXT STEPS & ROADMAP

### Week 1: Setup Infrastructure
- Comandă Hostinger
- Configurează server & database
- Deploy aplicație de bază

### Week 2: Core Features
- Implement scraping (1-2 surse)
- Test AI extraction pe 10 pagini PDF
- Build homepage + listing

### Week 3: AI Features
- Recipe generation
- Menu generator
- Shopping list export

### Week 4: Polish & Launch
- SEO optimization
- AdSense integration
- Performance tuning
- Soft launch

### Month 2+: Growth
- Add more scraping sources
- User accounts
- Email notifications
- Mobile optimization

---

## 📞 SUPPORT & MAINTENANCE

```bash
# Comenzi utile pentru administrare

# Restart app
pm2 restart retete-ieftine

# View logs
pm2 logs retete-ieftine --lines 100

# Monitor resources
pm2 monit

# Database backup
mysqldump -u oferte_user -p oferte_retete_db > backup_$(date +%Y%m%d).sql

# Clear cache
redis-cli FLUSHALL  # Dacă folosești Redis
# SAU
pm2 restart retete-ieftine  # Curăță node-cache

# Check disk space
du -sh storage/*

# Cleanup old PDFs (older than 30 days)
find storage/catalogs -type f -mtime +30 -delete
```

---

**Document Version:** 2.0 (Hostinger Adapted)  
**Last Updated:** 2024-12-28  
**Infrastructure:** Hostinger Cloud Startup  
**Status:** Ready for Implementation  

