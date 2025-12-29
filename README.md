# Rețete Ieftine - Platformă Smart pentru Oferte & Rețete

> Platformă web care agregă cataloage de oferte de la supermarketuri românești și generează rețete economice folosind inteligență artificială.

## 🌟 Caracteristici Principale

- **Scraping Automat**: Colectare săptămânală de cataloage PDF de la supermarketuri
- **Extracție AI**: Procesare cataloage cu GPT-4o Vision pentru identificare produse
- **Generare Rețete**: Crearea automată de rețete economice bazate pe oferte
- **Meniuri Săptămânale**: Planificare meniuri personalizate în funcție de buget
- **Listă de Cumpărături**: Export listă optimizată pe magazine

## 🏗️ Stack Tehnologic

### Backend
- **Next.js 15**: Framework React cu App Router și Server Components
- **TypeScript 5.7**: Type safety complet
- **Prisma ORM**: Database toolkit pentru MySQL
- **MySQL 8.0**: Bază de date relațională (Hostinger)

### AI & Processing
- **OpenAI GPT-4o**: Vision API pentru extracție produse din PDF
- **LangChain**: Framework pentru generare rețete
- **Puppeteer**: Web scraping automatizat
- **pdf-lib + sharp**: Procesare și conversie PDF→Image

### Infrastructure
- **Hostinger Cloud Startup**: Hosting (2 CPU, 4GB RAM, 100GB NVMe)
- **PM2**: Process manager pentru Node.js
- **node-cache**: In-memory caching
- **node-cron**: Scheduled tasks

### Frontend
- **React 19**: UI library
- **Tailwind CSS 3.4**: Utility-first CSS
- **Next.js Image**: Optimizare imagini automat
- **TypeScript**: Type-safe components

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

## 🚢 Deployment

### Hostinger Deployment

1. Build locally:
```bash
npm run build
```

2. Upload to server via SFTP/Git

3. On server:
```bash
cd /path/to/app
npm install --production
npx prisma migrate deploy
pm2 start ecosystem.config.js --env production
pm2 save
```

### Update Deployment

```bash
# Pull latest code
git pull

# Install dependencies
npm install --production

# Run migrations
npx prisma migrate deploy

# Restart
pm2 reload ecosystem.config.js
```

## 📝 Licență

Proprietar - Toate drepturile rezervate

## 👤 Author

Dezvoltat pentru optimizarea cheltuielilor familiale prin agregarea ofertelor și generarea automată de rețete economice.

## 🙏 Credits

- **OpenAI**: GPT-4o Vision pentru extracție produse
- **Next.js**: Framework React
- **Prisma**: Database toolkit
- **Tailwind CSS**: Styling framework

---

**Version**: 1.0.0
**Last Updated**: 2024-12-28
