# SEO Optimization Guide

## 📊 Overview

Acest document descrie toate optimizările SEO implementate pentru a maximiza vizibilitatea în motoarele de căutare.

## 🎯 SEO Targets

### Google Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Lighthouse SEO Score | > 95 | - |
| Core Web Vitals | All Green | - |
| Mobile-Friendly | Yes | Yes |
| HTTPS | Yes | Yes |
| Structured Data | Valid | Yes |

### Keywords Target

**Primary Keywords:**
- rețete ieftine
- oferte supermarket
- mâncarea economică
- liste de cumpărături

**Long-tail Keywords:**
- rețete cu buget redus
- oferte Lidl săptămâna aceasta
- rețete economice pentru familie
- cum să economisești la cumpărături

## 🔧 SEO Implementations

### 1. Meta Tags

**Fișier**: `src/lib/seo/metadata.ts`

```typescript
// Homepage
export const metadata = generateBaseMetadata({
  title: 'Rețete Ieftine - Oferte & Rețete Economice',
  description: 'Platformă smart pentru oferte și rețete economice...',
  keywords: ['rețete ieftine', 'oferte supermarket', ...],
});

// Recipe page
export const metadata = generateRecipeMetadata({
  title: 'Supă de Legume',
  description: 'Rețetă ieftină și sănătoasă...',
  slug: 'supa-de-legume',
});

// Offer page
export const metadata = generateOfferMetadata({
  store: 'Lidl',
  category: 'Lactate',
});
```

**Output HTML:**
```html
<title>Supă de Legume - Rețetă Ieftină | Rețete Ieftine</title>
<meta name="description" content="..." />
<meta name="keywords" content="..." />

<!-- Open Graph -->
<meta property="og:title" content="..." />
<meta property="og:description" content="..." />
<meta property="og:image" content="..." />
<meta property="og:url" content="..." />

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="..." />
```

### 2. Structured Data (JSON-LD)

**Recipe Schema:**
```typescript
const recipeSchema = generateRecipeStructuredData({
  title: 'Supă de Legume',
  description: 'Rețetă ieftină...',
  servings: 4,
  totalTime: 45,
  instructions: [...],
});

// Output
{
  "@context": "https://schema.org",
  "@type": "Recipe",
  "name": "Supă de Legume",
  "recipeYield": "4",
  "totalTime": "PT45M",
  "recipeInstructions": [...],
  "aggregateRating": {...}
}
```

**Product Schema:**
```typescript
const productSchema = generateProductStructuredData({
  name: 'Lapte 3.5%',
  price: 5.99,
  store: 'Lidl',
  validUntil: new Date('2024-12-31'),
});

// Output
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Lapte 3.5%",
  "offers": {
    "@type": "Offer",
    "price": "5.99",
    "priceCurrency": "RON",
    "availability": "InStock"
  }
}
```

**Website Schema:**
```typescript
const websiteSchema = generateWebsiteStructuredData();

// Output cu SearchAction pentru Google
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://retete-ieftine.ro/search?q={search_term_string}"
  }
}
```

**Breadcrumb Schema:**
```typescript
const breadcrumb = generateBreadcrumbStructuredData([
  { name: 'Acasă', url: '/' },
  { name: 'Rețete', url: '/retete' },
  { name: 'Supă de Legume', url: '/retete/supa-de-legume' },
]);
```

### 3. Sitemap

**Fișier**: `src/app/sitemap.ts`

**Generated URLs:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Homepage -->
  <url>
    <loc>https://retete-ieftine.ro</loc>
    <lastmod>2024-12-28</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>

  <!-- Offers -->
  <url>
    <loc>https://retete-ieftine.ro/oferte</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>

  <!-- Recipes -->
  <url>
    <loc>https://retete-ieftine.ro/retete/supa-de-legume</loc>
    <lastmod>2024-12-20</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>

  <!-- Store pages -->
  <url>
    <loc>https://retete-ieftine.ro/oferte/lidl</loc>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>
</urlset>
```

**Submission:**
```bash
# Google Search Console
https://search.google.com/search-console

# Ping Google
curl "https://www.google.com/ping?sitemap=https://retete-ieftine.ro/sitemap.xml"
```

### 4. Robots.txt

**Fișier**: `src/app/robots.ts`

```txt
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /_next/
Disallow: /storage/temp/

User-agent: Googlebot
Allow: /
Disallow: /api/
Disallow: /admin/

Sitemap: https://retete-ieftine.ro/sitemap.xml
Host: https://retete-ieftine.ro
```

### 5. Canonical URLs

```typescript
// În metadata
alternates: {
  canonical: 'https://retete-ieftine.ro/retete/supa-de-legume',
}

// Output HTML
<link rel="canonical" href="https://retete-ieftine.ro/retete/supa-de-legume" />
```

### 6. URL Structure

**Good URLs:**
```
✅ https://retete-ieftine.ro/retete/supa-de-legume
✅ https://retete-ieftine.ro/oferte/lidl
✅ https://retete-ieftine.ro/oferte/categorie/lactate
```

**Bad URLs:**
```
❌ https://retete-ieftine.ro/recipe?id=123
❌ https://retete-ieftine.ro/p/123abc
❌ https://retete-ieftine.ro/offers.php?store=lidl
```

### 7. Image Optimization

```typescript
<Image
  src="/recipe-image.jpg"
  alt="Supă de Legume - Rețetă Ieftină"  // Descriptive alt text
  width={800}
  height={600}
  loading="lazy"
  quality={85}
/>
```

**Alt Text Best Practices:**
- Descriptive și relevant
- Include keyword când are sens
- Max 125 caractere
- Nu "image of" sau "picture of"

## 📈 Content Optimization

### Title Tags

**Format:**
```
{Primary Keyword} - {Secondary Keyword} | {Brand}
```

**Examples:**
```
✅ Supă de Legume - Rețetă Ieftină | Rețete Ieftine
✅ Oferte Lidl Săptămâna Aceasta | Rețete Ieftine
❌ Rețete Ieftine - Supă de Legume (keyword stuffing)
```

**Rules:**
- 50-60 caractere
- Include primary keyword
- Unique per page
- Compelling pentru CTR

### Meta Descriptions

**Format:**
```
{Benefit} {Primary Keyword} {Call-to-Action}
```

**Examples:**
```
✅ Descoperă cum să prepari Supă de Legume cu buget redus. Rețetă simplă,
   sănătoasă și economică pentru toată familia. Încearcă acum!

❌ Rețete ieftine, mâncarea economică, oferte supermarket, liste cumpărături
```

**Rules:**
- 150-160 caractere
- Include primary keyword
- Include call-to-action
- Unique per page
- Compelling pentru CTR

### Heading Structure

```html
<h1>Supă de Legume - Rețetă Ieftină</h1>

<h2>Ingrediente</h2>
<h3>Legume</h3>
<h3>Condimente</h3>

<h2>Mod de Preparare</h2>
<h3>Pasul 1: Pregătire Legume</h3>
<h3>Pasul 2: Gătire</h3>

<h2>Valori Nutriționale</h2>
```

**Rules:**
- Un singur H1 per pagină
- Ierarhie logică (H1 → H2 → H3)
- Include keywords natural
- Descriptive și utile

### Content Quality

**Checklist:**
- [ ] Minimum 500 cuvinte pentru articole
- [ ] Paragraphe scurte (2-3 propoziții)
- [ ] Bullet points pentru liste
- [ ] Images relevant cu alt text
- [ ] Internal linking către pagini relevante
- [ ] External linking către surse autoritare
- [ ] Unique content (nu duplicate)
- [ ] Fresh content (updated regular)

## 🔗 Link Building

### Internal Linking

```typescript
// În recipe page
<Link href="/oferte/lidl">
  Vezi ofertele la Lidl pentru această rețetă
</Link>

<Link href="/retete/categorie/supe">
  Mai multe rețete de supe
</Link>
```

**Strategy:**
- Link către pagini relevante
- Anchor text descriptiv
- 3-5 internal links per page
- Link hierarchy (homepage → category → detail)

### External Linking

```html
<!-- Link către surse autoritare -->
<a href="https://www.sfatulmedicului.ro/nutritie"
   target="_blank"
   rel="noopener noreferrer">
  Informații nutriționale
</a>
```

**Rules:**
- `rel="noopener noreferrer"` pentru target="_blank"
- Link către surse de încredere
- Anchor text relevant
- Nu link spam

## 📱 Mobile SEO

### Mobile-Friendly

```javascript
// next.config.js
images: {
  deviceSizes: [640, 750, 828, 1080, 1200],
  imageSizes: [16, 32, 48, 64, 96, 128, 256],
}
```

### Viewport

```html
<meta name="viewport" content="width=device-width, initial-scale=1" />
```

### Touch Targets

```css
/* Minimum 48x48px pentru buttons */
button {
  min-height: 48px;
  min-width: 48px;
}
```

## 🧪 SEO Testing

### Google Search Console

```bash
# Submit sitemap
https://search.google.com/search-console/sitemaps

# Check index coverage
https://search.google.com/search-console/index

# Check mobile usability
https://search.google.com/search-console/mobile-usability
```

### Structured Data Testing

```bash
# Google Rich Results Test
https://search.google.com/test/rich-results

# Schema Markup Validator
https://validator.schema.org/
```

### PageSpeed Insights

```bash
https://pagespeed.web.dev/
```

### Manual Checks

```bash
# Check robots.txt
curl https://retete-ieftine.ro/robots.txt

# Check sitemap
curl https://retete-ieftine.ro/sitemap.xml

# Check meta tags
curl -s https://retete-ieftine.ro | grep -i '<meta'

# Check structured data
curl -s https://retete-ieftine.ro | grep -i 'application/ld+json'
```

## 📊 Monitoring & Analytics

### Google Analytics 4

```typescript
// Tracking pageviews
gtag('event', 'page_view', {
  page_title: document.title,
  page_location: window.location.href,
  page_path: window.location.pathname,
});

// Tracking events
gtag('event', 'recipe_view', {
  recipe_title: recipe.title,
  recipe_cost: recipe.estimatedCost,
});
```

### Google Search Console

**Metrics să monitorizezi:**
- Click-through rate (CTR)
- Average position
- Total impressions
- Total clicks
- Coverage issues
- Mobile usability issues

## ✅ SEO Checklist

### On-Page SEO

- [x] Unique title tags (50-60 chars)
- [x] Unique meta descriptions (150-160 chars)
- [x] H1 tag (one per page)
- [x] Proper heading hierarchy (H1-H6)
- [x] Descriptive URLs (slugs)
- [x] Image alt text
- [x] Internal linking
- [x] External linking (nofollow când e nevoie)
- [x] Canonical URLs
- [x] Mobile-friendly
- [x] Fast load times (< 3s)

### Technical SEO

- [x] Sitemap.xml
- [x] Robots.txt
- [x] Structured data (JSON-LD)
- [x] HTTPS/SSL
- [x] 301 redirects (pentru URL changes)
- [x] 404 error pages
- [x] XML sitemap submission
- [x] Google Search Console setup
- [x] Google Analytics setup

### Content SEO

- [ ] Keyword research
- [ ] Content calendar
- [ ] Regular updates (weekly)
- [ ] Fresh content
- [ ] Long-form content (> 1000 words)
- [ ] FAQ sections
- [ ] User-generated content (reviews)

## 🎯 SEO Improvements Roadmap

### Short-term (1-3 luni)

1. **Submit sitemap** la Google Search Console
2. **Create initial content**: 20 rețete, 50+ produse
3. **Setup Google Analytics 4**
4. **Monitor Core Web Vitals**
5. **Fix any technical SEO issues**

### Medium-term (3-6 luni)

1. **Build backlinks**: guest posting, partnerships
2. **Content expansion**: 100+ rețete
3. **Local SEO**: Google My Business (dacă aplicabil)
4. **Video content**: recipe videos
5. **User reviews & ratings**

### Long-term (6-12 luni)

1. **Authority building**: become trusted source
2. **Featured snippets**: optimize pentru position 0
3. **Voice search optimization**
4. **International SEO** (dacă aplicabil)
5. **App development** (PWA)

## 📚 Resources

- [Google Search Central](https://developers.google.com/search)
- [Schema.org](https://schema.org/)
- [Google Rich Results Test](https://search.google.com/test/rich-results)
- [PageSpeed Insights](https://pagespeed.web.dev/)
- [Moz SEO Guide](https://moz.com/beginners-guide-to-seo)

---

**Last Updated**: 2024-12-28
**Version**: 1.0
