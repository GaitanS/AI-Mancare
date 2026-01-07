---
description: The Ultimate Next.js Guide: Hostinger Deployment, SEO, Performance, and Backend Mastery
---

# 🚀 Next.js God Mode: Deployment, SEO & Backend Mastery

This workflow combines lessons learned from Hostinger deployment with advanced full-stack skills (SEO, Backend, Database).

## 🛠️ Part 1: Hostinger Deployment Survival Guide

### Critical Fixes for Hostinger Cloud

| Issue | Symptom | Solution |
|-------|---------|----------|
| **CSS MIME Type** | `Refused to apply style... text/plain` | **1. Middleware:** Exclude CSS/JS (see below)<br>**2. Cache:** Delete `.next` folder & Redeploy |
| **Scripts Fail** | `PID: undefined` / `spawn EACCES` | **GitHub Actions:** Use for Puppeteer/Scrapers (Hostinger has no OS libs) |
| **503 Errors** | `Service Unavailable` | Add env var: `HOSTNAME=0.0.0.0` |
| **Build Hangups** | Stuck at "Collecting page data" | Cache issue. Delete `.next` or check `output: 'standalone'` config |

### ✅ Correct Middleware Matcher
**File:** `src/middleware.ts`
```typescript
export const config = {
  // MUST exclude static files explicitly!
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|storage|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js|woff|woff2|ico|json)$).*)',
  ],
};
```

### 🤖 GitHub Actions Pattern (for Scrapers/Puppeteer)
Since Hostinger can't run Chrome/Puppeteer, offload it:
```yaml
# .github/workflows/scheduler.yml
jobs:
  scraper:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: node scripts/your-scraper.js # Runs on GitHub, not Hostinger
```

---

## 📈 Part 2: Technical SEO & Performance (God Level)

### ⚡ Core Web Vitals Optimization
- **LCP (Largest Contentful Paint)** `< 2.5s`:
  - Preload Hero images: `<link rel="preload" as="image" href="...">`
  - Use `next/image` with `priority`
- **CLS (Cumulative Layout Shift)** `< 0.1`:
  - Set explicit `width`/`height` on ALL images
  - Reserve space for ads/iframes
- **INP (Interaction to Next Paint)** `< 200ms`:
  - Debounce input handlers
  - Break up long tasks using `setTimeout`

### 🔍 Technical Audit Checklist
1. **Crawlability:** Check `robots.txt` blocks and `sitemap.xml` coverage.
2. **Canonicalization:** Ensure every page has self-referencing canonical tag.
3. **Structured Data:** Add JSON-LD for Articles, Recipes, Products.
   ```tsx
   <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
   ```
4. **Mobile:** Verify touch targets (>48px) and viewport configuration.

---

## 🛡️ Part 3: production-Ready Backend & Database

### 🗄️ Database Migrations (Zero Downtime)
**Strategy:** Never break the live app.
1. **Add new column** (nullable)
2. **Deploy code** that writes to both (old & new)
3. **Backfill data**
4. **Deploy code** reading from new column
5. **Drop old column** (after verification)

**Prisma Warning:** `prisma db push` is for prototyping. Use `prisma migrate deploy` in production.

### 🔒 Security Best Practices
- **Rate Limiting:** Use `upstash/ratelimit` or middleware-based throttling.
- **Headers:** Set `X-Content-Type-Options: nosniff` and `X-Frame-Options: DENY`.
- **Validation:** Always validate API inputs (Zod/Yup) before processing.
  ```typescript
  const schema = z.object({ email: z.string().email() });
  const result = schema.safeParse(req.body);
  if (!result.success) return 400;
  ```

---

## 🚀 Part 4: Pre-Launch Checklist

- [ ] **Middleware:** Excludes `.css`, `.js`, `.json`
- [ ] **Env Vars:** `HOSTNAME=0.0.0.0`, `DATABASE_URL` (Cloud IP, not localhost)
- [ ] **Build:** `npm run build` passes locally without TypeScript errors
- [ ] **SEO:** Meta titles & descriptions present on all pages
- [ ] **Images:** All use `next/image` or have explicit dimensions
- [ ] **Error Handling:** Custom `404.tsx` and `500.tsx` pages created
- [ ] **Analytics:** Google Analytics / Plausible connected

---

## 🔧 Part 5: GitHub Actions + Remote MySQL (Cron Jobs)

### 🗝️ Configurare Secrets GitHub
**Settings → Secrets and variables → Actions → New repository secret:**

| Secret | Exemplu Valoare | Note |
|--------|-----------------|------|
| `DATABASE_URL` | `mysql://user:pass@srv1817.hstgr.io:3306/db` | **NU localhost!** Folosește Remote MySQL Host |
| `OPENROUTER_API_KEY` | `sk-or-v1-xxxxx` | Pentru AI APIs |

### 🌐 Remote MySQL pe Hostinger
1. **hPanel → Databases → Remote MySQL**
2. Bifează **"Orice gazdă"** (sau adaugă IPs specifice)
3. Găsește **Host-ul Remote**: `srv1817.hstgr.io` sau IP-ul afișat

### 📜 Dotenv în Scripts (Cron Jobs)
**CRITICAL:** Scripturile trebuie să NU suprascrie variabilele din GitHub Actions:
```javascript
// La începutul oricărui script cron (corect):
require('dotenv').config({ path: '.env.production', override: false });
```

### 🗄️ Sincronizare Schema Prisma
Când modifici `prisma/schema.prisma`, trebuie să actualizezi baza de date remote:
```powershell
# Din CMD/PowerShell local (Windows):
$env:DATABASE_URL="mysql://USER:PASS@srv1817.hstgr.io:3306/DATABASE"; npx prisma db push
```

### 📋 Câmpuri Prisma Recipe (Schema Corectă)
| Script folosește | Schema Prisma are | Tip |
|-----------------|-------------------|-----|
| `cookingTime` | `cookTime` | Int? |
| `ingredients` | `ingredientIds` | String (JSON) |
| `steps` | `instructions` | String (LongText JSON) |
| `status` | `isPublished` | Boolean |
| `discount` | `discountPercentage` | Int? |

### 🚀 Workflow GitHub Actions
```yaml
# .github/workflows/scheduler.yml
env:
  DATABASE_URL: ${{ secrets.DATABASE_URL }}  # Din Secrets!
  OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
```

---

## 🆘 Troubleshooting Decision Tree

**Issue: Site loads but styles are broken (White screen / Plain HTML)**
- ➔ Check Middleware matcher (Part 1)
- ➔ Check if `output: 'standalone'` is enabled (try disabling)
- ➔ Clear Hostinger Cache / Purge CDN

**Issue: "Prisma Client could not locate the Query Engine"**
- ➔ Run `npx prisma generate` in `postinstall` script
- ➔ Ensure `schema.prisma` binaryTargets includes `linux-musl` or `linux-glibc-libssl3.0.x` (for Alpine/Debian)

**Issue: API Routes 500 Error**
- ➔ Check env vars are loaded.
- ➔ Check database connection (whitelist Hostinger IP).

**Issue: GitHub Actions "Can't reach database at 127.0.0.1"**
- ➔ **Cauză:** `DATABASE_URL` secret are localhost în loc de Remote Host
- ➔ **Fix:** Actualizează secret cu `srv1817.hstgr.io` (sau host-ul tău)
- ➔ Verifică `dotenv` are `override: false`

**Issue: "Unknown argument X" în Prisma**
- ➔ Câmpul nu există în `schema.prisma`
- ➔ Adaugă câmpul și rulează `prisma db push` cu DATABASE_URL remote

**Issue: Website pages empty - "DATABASE_URL not set"**
- ➔ **Cauză:** Next.js standalone build NU încarcă `.env` automat
- ➔ **Fix SSH pe Hostinger:**
```bash
# 1. Creează .env
cat > .env << 'EOF'
DATABASE_URL="mysql://USER:PASS@srv1817.hstgr.io:3306/DATABASE"
NODE_ENV=production
EOF

# 2. Adaugă dotenv la începutul server.js
sed -i "1i require('dotenv').config();" server.js

# 3. Restart app
touch tmp/restart.txt
```

---

## 🔧 Post-Deploy Checklist

1. ✅ `.env` există pe Hostinger cu `DATABASE_URL` corect
2. ✅ `server.js` are `require('dotenv').config();` la început
3. ✅ `tmp/restart.txt` touched pentru restart
4. ✅ Verifică `stderr.log` pentru erori
