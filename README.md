# CatalogSmart - Oferte & Retete Inteligente

[![Next.js](https://img.shields.io/badge/Next.js-15.5-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.1-2D3748?logo=prisma)](https://www.prisma.io/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)

Platforma web romaneasca care agregate cataloage de oferte de la supermarketuri si genereaza retete economice folosind inteligenta artificiala.

## Arhitectura Sistem

```mermaid
graph TB
    subgraph Client["Browser / Mobile"]
        UI[Next.js Frontend<br/>React 19 + Tailwind]
    end

    subgraph Server["Next.js Server - PM2 Cluster"]
        API[API Routes]
        SSR[Server Components]
        MW[Middleware<br/>Auth + Security + Rate Limit]
    end

    subgraph Data["Data Layer"]
        DB[(Neon PostgreSQL<br/>via Prisma 6.1)]
        Cache[NodeCache<br/>In-Memory]
        LS[localStorage<br/>Cart / Plan]
    end

    subgraph AI["AI Services"]
        OR[OpenRouter API<br/>Gemini 2.5 Flash]
        GV[Gemini Vision<br/>Catalog OCR]
    end

    subgraph Cron["Cron Jobs - PM2 / System Crontab"]
        CS[Catalog Scraper<br/>Kimbino + Fallbacks]
        PE[Product Extractor<br/>Vision AI]
        RG[Recipe Generator]
        IG[Image Generator]
    end

    UI -->|HTTPS| MW --> API
    UI --> SSR
    UI <-->|persist| LS
    API --> Cache --> DB
    SSR --> Cache
    CS -->|scrape catalogs| DB
    PE -->|extract products| GV
    PE --> DB
    RG -->|generate recipes| OR
    RG --> DB
    IG -->|generate images| OR
    IG --> DB
```

## Fluxul de Date

```mermaid
flowchart LR
    subgraph Sources["Surse Cataloage"]
        K[Kimbino.ro]
        CO[CataloageDeOferte.ro]
        OC[OferteLeCatalog.ro]
    end

    subgraph Processing["Pipeline Procesare"]
        S[Scraper<br/>Catalog URLs + Images]
        E[Extractor<br/>Gemini Vision OCR]
        R[Recipe Generator<br/>AI cu oferte curente]
        I[Image Generator<br/>Gemini Imagen 3]
    end

    subgraph Storage["Stocare"]
        DB[(PostgreSQL)]
        FS[/Public Files<br/>Catalog Pages/]
    end

    subgraph Frontend["Aplicatie Web"]
        OF[Pagina Oferte]
        RE[Pagina Retete]
        PL[Planificare Meniuri]
        CA[Cos Cumparaturi]
    end

    K & CO & OC --> S
    S --> FS
    S --> DB
    DB --> E
    E --> DB
    DB --> R
    R --> DB
    DB --> I
    I --> DB
    DB --> OF & RE & PL & CA
```

## Schema Bazei de Date

```mermaid
erDiagram
    Store ||--o{ Catalog : has
    Store ||--o{ Product : sells
    Catalog ||--o{ Product : contains
    Product ||--o{ PriceHistory : tracks
    Product ||--o{ UserInteraction : receives
    Recipe ||--o{ RecipeArchive : archived_as
    User ||--o{ UserPantry : owns
    User ||--o{ ShoppingCart : has
    User ||--o{ UserInteraction : makes

    Store {
        int id PK
        string name
        string slug
        string logo
        string scraperUrl
        json config
    }

    Catalog {
        int id PK
        int storeId FK
        string title
        date validFrom
        date validTo
        string imageBasePath
        string status
    }

    Product {
        int id PK
        int storeId FK
        int catalogId FK
        string name
        float price
        float oldPrice
        string category
        int catalogPage
        date validFrom
        date validTo
    }

    Recipe {
        int id PK
        string title
        string slug
        json ingredients
        json instructions
        float estimatedCost
        int prepTime
        int cookTime
        string difficulty
        json dietaryFlags
        string imageUrl
    }

    PriceHistory {
        int id PK
        int productId FK
        float price
        datetime recordedAt
    }

    User {
        int id PK
        string sessionId
        json preferences
    }

    AiBudget {
        int id PK
        string model
        string operation
        int tokensUsed
        float cost
        datetime createdAt
    }

    ProcessRun {
        int id PK
        string processType
        string status
        json result
        datetime startedAt
        datetime completedAt
    }

    ScheduleConfig {
        int id PK
        string processType
        string frequency
        json config
        boolean enabled
    }
```

## Deployment pe Hostinger VPS

```mermaid
flowchart TB
    subgraph VPS["Hostinger VPS"]
        subgraph Nginx["Nginx Reverse Proxy"]
            SSL[SSL Termination<br/>Let's Encrypt]
            PROXY[Proxy Pass :3001]
        end

        subgraph PM2["PM2 Process Manager"]
            I1[Next.js Instance 1]
            I2[Next.js Instance 2]
        end

        subgraph Crontab["System Crontab"]
            C1["Luni 02:00 - Scraper"]
            C2["Luni 04:00 - Extractor"]
            C3["Luni 06:00 - Retete"]
            C4["Luni 08:00 - Imagini"]
        end

        DB[(Neon PostgreSQL<br/>Cloud Hosted)]
    end

    User((User)) -->|HTTPS :443| SSL --> PROXY
    PROXY --> I1 & I2
    I1 & I2 --> DB
    C1 & C2 & C3 & C4 --> DB
```

## Caracteristici

- **Scraping Automat** - Colectare saptamanala cataloage de la 6+ supermarketuri (Kaufland, Lidl, Penny, Profi, Mega Image, Auchan) cu fallback multi-sursa
- **Extractie AI** - Procesare imagini catalog cu Gemini Vision pentru identificare produse si preturi
- **Generare Retete** - Creare automata retete economice bazate pe ofertele curente
- **Planificare Meniuri** - Meniuri saptamanale personalizate in functie de buget si preferinte
- **Cos Inteligent** - Completare automata cu cele mai ieftine alternative, comparatie multi-store
- **Istoric Preturi** - Tracking evolutie preturi cu badge-uri trend (scade/creste/stabil)
- **Cautare 3-tier** - Fulltext, fuzzy si semantic AI search
- **Admin Panel** - Dashboard complet: cataloage, produse, retete, procese, loguri, buget AI
- **SEO Optimizat** - Metadata auto-generata, JSON-LD schema, sitemap

## Stack Tehnologic

| Layer | Tehnologii |
|-------|-----------|
| **Frontend** | React 19, Next.js 15.5, TypeScript, Tailwind CSS 3.4 |
| **Backend** | Next.js API Routes, Prisma 6.1, jose JWT |
| **Database** | Neon PostgreSQL (cloud), Prisma Adapter |
| **AI** | OpenRouter API (Gemini 2.5 Flash), Gemini Vision, Imagen 3 |
| **Infra** | Hostinger VPS, PM2 Cluster, Nginx, Let's Encrypt |
| **Scraping** | Cheerio, Puppeteer, multi-source cascading |
| **Cache** | NodeCache (in-memory), HTTP cache headers |

## Cerinte Sistem

- Node.js >= 20.0.0
- npm >= 10.0.0
- 2+ CPU cores (PM2 cluster mode)
- 4GB RAM minimum
- 10GB storage

## Instalare

### 1. Clone & Install

```bash
git clone https://github.com/GaitanS/AI-Mancare.git
cd AI-Mancare
npm install
```

### 2. Environment Variables

```bash
cp .env.example .env
```

Editeaza `.env`:

```env
# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://user:pass@host/dbname?sslmode=require"

# Site
NEXT_PUBLIC_SITE_URL=https://catalogsmart.ro

# AI APIs
OPENROUTER_API_KEY=sk-or-v1-...
GEMINI_API_KEY=AIza...

# Admin Auth
ADMIN_PASSWORD=parola_admin_min_8_chars
JWT_SECRET=secret_minim_32_caractere
ADMIN_SECRET=cheie_api_pentru_cron_jobs

# Optional
UNSPLASH_ACCESS_KEY=...
STORAGE_PATH=./storage
```

### 3. Database Setup

```bash
npx prisma generate
npx prisma migrate deploy
```

### 4. Build & Start (Development)

```bash
npm run dev
```

### 5. Build & Start (Production)

```bash
npm run build:prod
pm2 start pm2.config.js
pm2 save
pm2 startup
```

## Deploy pe Hostinger VPS

### Setup Initial

```bash
# Pe VPS
sudo apt update && sudo apt install -y nodejs npm nginx certbot python3-certbot-nginx

# Install PM2 global
sudo npm install -g pm2

# Clone repo
cd /var/www
git clone https://github.com/GaitanS/AI-Mancare.git catalogsmart.ro
cd catalogsmart.ro

# Install & build
npm ci --production=false
npm run build:prod

# Start cu PM2
pm2 start pm2.config.js
pm2 save
pm2 startup
```

### Nginx Config

```nginx
server {
    server_name catalogsmart.ro www.catalogsmart.ro;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /_next/static {
        proxy_pass http://127.0.0.1:3001;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/catalogsmart.ro/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/catalogsmart.ro/privkey.pem;
}

server {
    listen 80;
    server_name catalogsmart.ro www.catalogsmart.ro;
    return 301 https://$host$request_uri;
}
```

```bash
# SSL
sudo certbot --nginx -d catalogsmart.ro -d www.catalogsmart.ro
```

### Crontab Setup

```bash
crontab -e
```

```cron
# Scraping cataloage - Luni 02:00
0 2 * * 1 cd /var/www/catalogsmart.ro && node scripts/cron-scraper.js >> logs/catalog-scraper.log 2>&1

# Extractie produse - Luni 04:00
0 4 * * 1 cd /var/www/catalogsmart.ro && node scripts/product-extractor.js >> logs/product-extractor.log 2>&1

# Generare retete - Luni 06:00
0 6 * * 1 cd /var/www/catalogsmart.ro && node scripts/cron-recipe-generator.js >> logs/recipe-generator.log 2>&1

# Generare imagini - Luni 08:00
0 8 * * 1 cd /var/www/catalogsmart.ro && node scripts/cron-image-generator.js >> logs/image-generator.log 2>&1
```

### Update Deployment

```bash
cd /var/www/catalogsmart.ro
git pull origin main
npm ci --production=false
npm run build:prod
pm2 reload catalogsmart
```

## Structura Proiect

```
catalogsmart/
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── page.tsx             # Homepage
│   │   ├── oferte/              # Oferte (cu filtru per magazin)
│   │   ├── retete/              # Retete (listing + [slug])
│   │   ├── cataloage/           # Vizualizator cataloage
│   │   ├── cart/                # Cos cumparaturi
│   │   ├── plan/                # Planificare meniuri
│   │   ├── search/              # Cautare
│   │   ├── blog/                # Blog / articole
│   │   ├── admin/               # Admin panel (16 pagini)
│   │   └── api/                 # ~60 API routes
│   ├── components/              # React components
│   │   ├── Header.tsx           # Header global sticky
│   │   ├── BottomNav.tsx        # Nav mobil fixed
│   │   ├── ProductCard.tsx      # Card produs
│   │   ├── RecipeCard.tsx       # Card reteta
│   │   ├── CatalogViewer.tsx    # Vizualizator cataloage
│   │   ├── FilterSidebar.tsx    # Filtre oferte
│   │   └── admin/               # Componente admin
│   └── lib/                     # Business logic
│       ├── db.ts                # Prisma singleton
│       ├── ai/                  # AI services (recipe gen, vision, RAG)
│       ├── search/              # Cautare 3-tier
│       ├── security/            # Auth, rate limit, validation
│       ├── repositories/        # Data access layer
│       ├── cache.ts             # Cache in-memory
│       └── utils.ts             # Utilitare
├── scripts/                     # Cron jobs productie
│   ├── cron-scraper.js          # Scraping cataloage
│   ├── product-extractor.js     # Extractie produse (Vision AI)
│   ├── cron-recipe-generator.js # Generare retete
│   ├── cron-image-generator.js  # Generare imagini
│   └── sources/                 # Surse scraping
├── prisma/
│   └── schema.prisma            # Schema DB (20 modele)
├── public/
│   └── catalogs/                # Imagini cataloage (webp)
├── pm2.config.js                # Config PM2 (cluster x2)
├── middleware.ts                 # Security middleware
└── package.json
```

## API Overview

| Grup | Endpoint | Descriere |
|------|----------|-----------|
| **Oferte** | `GET /api/v2/oferte` | Lista oferte cu filtre, paginare |
| **Oferte** | `GET /api/v2/oferte/trending` | Oferte trending |
| **Produse** | `GET /api/products/:id/price-history` | Istoric preturi |
| **Retete** | `GET /api/recipes` | Lista retete |
| **Retete** | `POST /api/recipes/generate` | Generare reteta AI |
| **Cart** | `POST /api/cart/auto-fill` | Completare automata cos |
| **Cart** | `POST /api/cart/alternatives` | Alternative produse |
| **Cart** | `GET /api/cart/export` | Export lista cumparaturi |
| **Plan** | `POST /api/plan/generate` | Generare meniu saptamanal |
| **Cautare** | `GET /api/search` | Cautare produse + retete |
| **Cataloage** | `GET /api/catalogs` | Lista cataloage active |
| **Admin** | `POST /api/admin/auth/login` | Login admin (JWT) |
| **Admin** | `GET /api/admin/analytics` | Dashboard analytics |
| **Admin** | `POST /api/admin/run-script` | Executare script |
| **Health** | `GET /api/health` | Health check |

## Securitate

- **Middleware** - Blocheaza paths sensibile, rate limiting, validare input
- **Auth** - JWT cookies cu jose, timing-safe password comparison
- **Headers** - X-Content-Type-Options, X-Frame-Options, CSP, Referrer-Policy
- **SQL** - Prisma ORM previne SQL injection
- **XSS** - React escapes output by default
- **HTTPS** - SSL via Let's Encrypt + Nginx

## Monitoring

```bash
# PM2 status
pm2 list
pm2 monit

# Logs
pm2 logs catalogsmart --lines 100

# Restart
pm2 reload catalogsmart

# Admin panel
https://catalogsmart.ro/admin
```

## Licenta

Proprietar - Toate drepturile rezervate 2024-2026

---

**Version**: 2.0.0 | **Last Updated**: 2026-02-22
