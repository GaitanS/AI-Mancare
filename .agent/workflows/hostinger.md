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
