# 🍽️ Rețete Ieftine - Platformă Smart pentru Oferte & Rețete

[![Next.js](https://img.shields.io/badge/Next.js-15.1-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.1-2D3748?logo=prisma)](https://www.prisma.io/)
[![License](https://img.shields.io/badge/License-Proprietary-red)]()

> 🇷🇴 Platformă web românească care agregă cataloage de oferte de la supermarketuri și generează rețete economice folosind inteligență artificială.

## ✨ Status: ALPHA COMPLETE

Toate funcționalitățile de bază sunt implementate și funcționale.

## 🌟 Caracteristici Principale

- **📥 Scraping Automat**: Colectare săptămânală de cataloage PDF de la 6+ supermarketuri (Kaufland, Lidl, Penny, Profi, Mega Image, Carrefour)
- **🤖 Extracție AI**: Procesare cataloage cu GPT-4o Vision / Gemini pentru identificare produse și prețuri
- **🍳 Generare Rețete**: Crearea automată de rețete economice bazate pe ofertele curente
- **📅 Meniuri Săptămânale**: Planificare meniuri personalizate în funcție de buget și preferințe
- **🛒 Coș Inteligent**: Completare automată cu cele mai ieftine alternative din magazine
- **💰 Optimizare Multi-Store**: Găsește cele mai bune prețuri comparând toate magazinele

## 🏗️ Stack Tehnologic

| Layer | Tehnologii |
|-------|-----------|
| **Frontend** | React 19, Next.js 15.1, TypeScript 5.x, Tailwind CSS 3.4, Radix UI |
| **Backend** | Next.js API Routes, Prisma ORM 6.1, MySQL 8.0 |
| **AI** | OpenRouter API, GPT-4o Vision, Gemini Vision, LangChain |
| **Infrastructure** | Hostinger Cloud, PM2, node-cache, node-cron |
| **Processing** | Cheerio (scraping), pdf-lib, Sharp (images) |

## 📋 Cerințe Sistem

- Node.js ≥ 20.0.0
- npm ≥ 10.0.0
- MySQL 8.0+
- 4GB RAM minimum
- 10GB storage

## 🚀 Instalare & Setup

### 1. Instalare Dependențe

```bash
npm install
```

### 2. Configurare Environment Variables

```bash
cp .env.example .env.production
```

Editează `.env.production` cu datele tale:

```env
# Database
DATABASE_URL="mysql://user:password@localhost:3306/oferte_retete_db"

# AI APIs
OPENAI_API_KEY=sk-xxxxxxxxxxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx

# Application
NEXT_PUBLIC_SITE_URL=https://retete-ieftine.ro
STORAGE_PATH=/path/to/storage

# Security
JWT_SECRET=your_secret_here
SESSION_SECRET=another_secret_here
```

### 3. Database Setup

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# (Optional) Seed data
npx prisma db seed
```

### 4. Build pentru Production

```bash
# Build Next.js standalone
npm run build

# Rezultatul va fi în .next/standalone/
```

### 5. Start cu PM2

```bash
# Start all processes
pm2 start ecosystem.config.js --env production

# Save PM2 config
pm2 save

# Setup PM2 startup script
pm2 startup
```

## 📁 Structură Proiect

```
retete-ieftine/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── oferte/            # Offers pages
│   │   ├── retete/            # Recipes pages
│   │   └── api/               # API routes
│   ├── components/            # React components
│   ├── lib/                   # Utilities & libs
│   │   ├── ai/               # AI processors
│   │   ├── db.ts             # Prisma client
│   │   ├── cache.ts          # Caching
│   │   └── utils.ts          # Utilities
│   └── types/                # TypeScript types
├── scripts/                   # Cron jobs & scripts
│   ├── cron-scraper.js       # Weekly scraping
│   ├── catalog-processor.js   # PDF processing
│   └── cron-recipe-generator.js
├── prisma/
│   └── schema.prisma         # Database schema
├── storage/                   # Local file storage
│   ├── catalogs/             # Downloaded PDFs
│   ├── images/               # Processed images
│   └── temp/                 # Temporary files
├── logs/                      # Application logs
├── ecosystem.config.js        # PM2 configuration
├── next.config.js            # Next.js config
└── package.json
```

## 🔄 Cron Jobs

### Scraping (Luni, 02:00)
```bash
npm run scrape
```

### PDF Processing (Luni, 04:00)
```bash
node scripts/catalog-processor.js
```

### Recipe Generation (Luni, 06:00)
```bash
npm run generate-recipes
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## 📊 Monitoring

```bash
# View PM2 processes
pm2 list

# Monitor resources
pm2 monit

# View logs
pm2 logs retete-ieftine-web

# View specific log
pm2 logs cron-scraper
```

## 🐛 Debugging

### Check Application Status
```bash
pm2 status
```

### View Recent Logs
```bash
pm2 logs --lines 100
```

### Restart Application
```bash
pm2 restart retete-ieftine-web
```

### Clear Cache
```bash
pm2 restart retete-ieftine-web
```

## 🔒 Security

- **HTTPS**: SSL certificate via Let's Encrypt (automatic Hostinger)
- **Headers**: Security headers configured in next.config.js
- **Validation**: Input validation with Zod
- **Rate Limiting**: API rate limiting implemented
- **SQL Injection**: Prisma ORM prevents SQL injection
- **XSS**: React escapes output by default

## 📈 Performance

- **CDN**: Hostinger CDN included
- **Caching**: Multi-layer caching (node-cache + HTTP cache)
- **Image Optimization**: Next.js Image component
- **Code Splitting**: Automatic with Next.js
- **Compression**: Gzip enabled

## 💰 Cost Estimation

- **Hosting**: 7.99€/month (Hostinger Cloud Startup)
- **Domain**: ~50 RON/year (.ro domain)
- **OpenAI API**: ~20 USD/month (~500 PDF pages)
- **Total**: ~130 RON/month (~26€)

## 🚢 Deployment pe Hostinger Cloud

### Variabile de Mediu Necesare

```env
HOSTNAME=0.0.0.0          # OBLIGATORIU pentru Hostinger
DATABASE_URL=mysql://...   # Connection string MySQL
OPENAI_API_KEY=sk-...      # Pentru AI processing
NEXT_PUBLIC_SITE_URL=https://retete-ieftine.ro
```

### Deployment via GitHub Integration

1. **Conectează repo-ul** în Hostinger → Implementări
2. **Build Settings**:
   - Build Command: `npm run build:prod`
   - Start Command: `npm start`
   - Output Directory: `.next`
3. **Setează variabilele de mediu** în panoul Hostinger
4. **Deploy!**

> 📖 Vezi [DEPLOY_HOSTINGER.md](DEPLOY_HOSTINGER.md) pentru ghid complet.

### Update Deployment

```bash
git add . && git commit -m "update" && git push
# Hostinger va face auto-deploy din branch main
```

## 📝 Licență

Proprietar - Toate drepturile rezervate © 2024-2025

## 👤 Author

Dezvoltat pentru optimizarea cheltuielilor familiale prin agregarea ofertelor și generarea automată de rețete economice.

---

**Version**: 1.0.0 (Alpha)
**Last Updated**: 2025-01-05
