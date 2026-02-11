/**
 * Source Adapter: ofertelecatalog.ro
 *
 * Scrapes catalog listings and page images from ofertelecatalog.ro using
 * puppeteer (JS-rendered Vue.js pages). Used as fallback when primary source
 * has no current catalogs for a store.
 */

const SOURCE_NAME = 'ofertelecatalog.ro';
const BASE_URL = 'https://www.ofertelecatalog.ro';

let browser = null;
let browserLaunching = null; // mutex to prevent concurrent launches

// ── Browser Lifecycle ────────────────────────────────────────────────────────

async function ensureBrowser() {
    if (browser && browser.connected) return browser;

    // If another call is already launching, wait for it
    if (browserLaunching) return browserLaunching;

    browserLaunching = (async () => {
        const puppeteer = require('puppeteer');
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-extensions'
            ]
        });
        return browser;
    })();

    try {
        const b = await browserLaunching;
        return b;
    } finally {
        browserLaunching = null;
    }
}

async function newPage({ blockMedia = true } = {}) {
    const b = await ensureBrowser();
    const page = await b.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    await page.setViewport({ width: 1280, height: 900 });
    if (blockMedia) {
        // Block images/fonts/media to speed up navigation
        await page.setRequestInterception(true);
        page.on('request', req => {
            const type = req.resourceType();
            if (['image', 'font', 'media'].includes(type)) {
                req.abort();
            } else {
                req.continue();
            }
        });
    }
    return page;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parse Romanian date strings like "11 feb. 2026" or "11.02.2026"
 */
function parseRomanianDate(text) {
    if (!text) return null;
    text = text.trim().toLowerCase();

    // Try DD.MM.YYYY format
    const dotMatch = text.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    if (dotMatch) {
        return new Date(parseInt(dotMatch[3]), parseInt(dotMatch[2]) - 1, parseInt(dotMatch[1]));
    }

    // Try "DD mon. YYYY" format
    const months = {
        'ian': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'mai': 4, 'iun': 5,
        'iul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
    };
    const textMatch = text.match(/(\d{1,2})\s+(\w{3})\.?\s+(\d{4})/);
    if (textMatch) {
        const month = months[textMatch[2]];
        if (month !== undefined) {
            return new Date(parseInt(textMatch[3]), month, parseInt(textMatch[1]));
        }
    }

    return null;
}

/**
 * Generate a stable slug for a catalog from ofertelecatalog.ro.
 * Format: {title-slugified}-{offerId}
 */
function generateSlug(title, offerId) {
    const slugified = (title || 'catalog')
        .toLowerCase()
        .replace(/[ăâ]/g, 'a').replace(/[îï]/g, 'i')
        .replace(/[șş]/g, 's').replace(/[țţ]/g, 't')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    return `${slugified}-olc-${offerId}`;
}

// ── Adapter Interface ────────────────────────────────────────────────────────

/**
 * Discover catalogs for a store.
 * Navigates to the store's catalog listing page, waits for Vue.js to render
 * the .flyer elements, then extracts catalog data.
 */
async function discoverCatalogs(store) {
    const storeSlug = store.slugs?.ofertelecatalog || store.slug;
    const page = await newPage();

    try {
        const listingUrl = `${BASE_URL}/magazine/${storeSlug}/oferte-cataloage`;
        await page.goto(listingUrl, { waitUntil: 'networkidle2', timeout: 30000 });

        // Wait for flyer elements to render (Vue.js)
        await page.waitForSelector('.flyer, .grid__row-item, [class*="flyer"]', { timeout: 10000 })
            .catch(() => null); // No catalogs is valid

        // Extract catalog data from the rendered DOM
        const catalogs = await page.evaluate((storeName) => {
            const results = [];
            // Look for links to catalog viewer pages
            const links = document.querySelectorAll('a[href*="/vezi/oferte/"], a[href*="/oferte/"]');

            links.forEach(link => {
                const href = link.getAttribute('href') || '';
                // Match viewer URL pattern: /vezi/oferte/{slug}-{id}
                const viewerMatch = href.match(/\/vezi\/oferte\/(.+?)-(\d+)$/);
                if (!viewerMatch) return;

                const offerId = viewerMatch[2];
                // Avoid duplicates
                if (results.find(r => r.offerId === offerId)) return;

                // Try to find title and dates from parent card
                const card = link.closest('.flyer, .grid__row-item, [class*="flyer"]') || link;
                const titleEl = card.querySelector('.flyer__name, [class*="name"], h3, h4');
                const title = titleEl?.textContent?.trim() || storeName + ' catalog';

                // Try to find date info
                const metaEl = card.querySelector('.flyer__meta, [class*="meta"], [class*="date"]');
                const dateText = metaEl?.textContent?.trim() || '';

                results.push({
                    offerId,
                    title,
                    dateText,
                    viewerUrl: href.startsWith('http') ? href : (window.location.origin + href)
                });
            });

            return results;
        }, store.name);

        // Also try to find catalogs from structured data (JSON-LD)
        const jsonLdCatalogs = await page.evaluate(() => {
            const scripts = document.querySelectorAll('script[type="application/ld+json"]');
            const results = [];
            scripts.forEach(script => {
                try {
                    const data = JSON.parse(script.textContent);
                    if (data['@type'] === 'Product' || data['@type'] === 'Offer') {
                        results.push(data);
                    }
                } catch {}
            });
            return results;
        });

        // Process extracted data into catalog objects
        const now = new Date();
        const processedCatalogs = [];

        for (const cat of catalogs) {
            // Parse dates from text like "11 feb. - 24 feb. 2026"
            let validFrom = null;
            let validUntil = null;

            if (cat.dateText) {
                const dateRange = cat.dateText.match(/(\d{1,2}[\s.]+\w+\.?\s*\d{0,4})\s*[-–]\s*(\d{1,2}[\s.]+\w+\.?\s*\d{4})/);
                if (dateRange) {
                    validFrom = parseRomanianDate(dateRange[1].includes('20') ? dateRange[1] : dateRange[1] + ' ' + now.getFullYear());
                    validUntil = parseRomanianDate(dateRange[2]);
                }
            }

            // Fallback: try structured data
            if (!validFrom || !validUntil) {
                for (const ld of jsonLdCatalogs) {
                    if (ld.validFrom) validFrom = new Date(ld.validFrom);
                    if (ld.validThrough || ld.validUntil) validUntil = new Date(ld.validThrough || ld.validUntil);
                }
            }

            // Default: 2 weeks from now
            if (!validFrom) validFrom = now;
            if (!validUntil) validUntil = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

            // Skip expired catalogs
            if (validUntil < now) continue;

            const slug = generateSlug(cat.title, cat.offerId);

            processedCatalogs.push({
                slug,
                title: cat.title,
                url: cat.viewerUrl,
                storeSlug: store.slug,
                storeName: store.name,
                validFrom,
                validUntil,
                source: SOURCE_NAME,
                _offerId: cat.offerId  // internal, for getPageImageUrls
            });
        }

        return processedCatalogs;

    } finally {
        await page.close();
    }
}

/**
 * Get page image URLs for a catalog.
 * Navigates to the viewer/flipbook page and extracts image URLs from the DOM.
 */
async function getPageImageUrls(catalog) {
    // Use a page without request interception so images load normally
    const page = await newPage({ blockMedia: false });

    try {
        await page.goto(catalog.url, { waitUntil: 'networkidle2', timeout: 30000 });

        // Wait for the catalog viewer to render
        await page.waitForSelector('img[src*="offers-cdn"], img[src*="cdn"], [class*="page"] img', { timeout: 15000 })
            .catch(() => null);

        // Give Vue a moment to fully render
        await new Promise(r => setTimeout(r, 2000));

        // Extract image URLs and page count from the rendered viewer
        const data = await page.evaluate(() => {
            const images = [];

            // Strategy 1: Look for page images in the viewer
            document.querySelectorAll('img').forEach(img => {
                const src = img.src || img.getAttribute('data-src') || '';
                if (src.includes('offers-cdn') || src.includes('/pages/') || src.includes('/page')) {
                    // Check it's a page image (not a logo or icon)
                    if (img.naturalWidth > 200 || img.width > 200 || !img.complete) {
                        images.push(src);
                    }
                }
            });

            // Strategy 2: Check for background-image on page elements
            document.querySelectorAll('[class*="page"], [class*="flip"], [class*="sheet"]').forEach(el => {
                const bg = getComputedStyle(el).backgroundImage;
                const match = bg.match(/url\(["']?(.+?)["']?\)/);
                if (match && (match[1].includes('offers-cdn') || match[1].includes('/pages/'))) {
                    images.push(match[1]);
                }
            });

            // Strategy 3: Look for maxPages / totalPages in global scope
            let maxPages = null;
            if (typeof window.maxPages === 'number') maxPages = window.maxPages;
            if (typeof window.totalPages === 'number') maxPages = window.totalPages;

            // Strategy 4: Check for pagination elements
            let paginationMax = 0;
            document.querySelectorAll('[class*="page"] span, [class*="pagination"] *, [class*="counter"] *').forEach(el => {
                const num = parseInt(el.textContent.trim());
                if (!isNaN(num) && num > paginationMax && num < 200) {
                    paginationMax = num;
                }
            });

            return {
                images: [...new Set(images)],
                maxPages: maxPages || paginationMax || 0
            };
        });

        // If we found direct image URLs, infer the pattern and generate all pages
        if (data.images.length > 0) {
            const imageUrls = [];

            // Try to detect the pattern from collected URLs
            const sampleUrl = data.images[0];

            // Pattern: .../pages/1.jpg or .../page-01.webp or .../image01.webp
            const pagePattern = sampleUrl.match(/(.+?)(pages?[-/])(\d+)(\.\w+)$/);
            const imagePattern = sampleUrl.match(/(.+?)(image)(\d+)(\.\w+)$/);

            const pageCount = Math.max(data.maxPages, data.images.length);

            if (pageCount > 0 && (pagePattern || imagePattern)) {
                const match = pagePattern || imagePattern;
                const prefix = match[1] + match[2];
                const ext = match[4];
                const padLength = match[3].length;

                for (let i = 1; i <= pageCount; i++) {
                    imageUrls.push({
                        page: i,
                        url: `${prefix}${String(i).padStart(padLength, '0')}${ext}`
                    });
                }

                return { pageCount, imageUrls };
            }

            // If no pattern detected, return the images as-is
            return {
                pageCount: data.images.length,
                imageUrls: data.images.map((url, i) => ({ page: i + 1, url }))
            };
        }

        // Fallback: try navigating through pages and collecting images
        // (some viewers require clicking "next" to load pages)
        const collectedUrls = [];
        const maxAttempts = 60; // safety limit
        let prevPageUrl = '';

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const currentImages = await page.evaluate(() => {
                const imgs = [];
                document.querySelectorAll('img').forEach(img => {
                    const src = img.src || '';
                    if (src.includes('offers-cdn') && (img.naturalWidth > 200 || img.width > 200)) {
                        imgs.push(src);
                    }
                });
                return imgs;
            });

            for (const url of currentImages) {
                if (!collectedUrls.includes(url)) {
                    collectedUrls.push(url);
                }
            }

            // Check if we've seen this page before
            const mainImage = currentImages[0] || '';
            if (mainImage === prevPageUrl && attempt > 0) break;
            prevPageUrl = mainImage;

            // Try to go to next page
            const nextClicked = await page.evaluate(() => {
                const nextBtn = document.querySelector(
                    '[class*="next"], [aria-label*="next"], [class*="arrow-right"], button[class*="right"]'
                );
                if (nextBtn) { nextBtn.click(); return true; }
                return false;
            });

            if (!nextClicked) break;
            await new Promise(r => setTimeout(r, 1000));
        }

        return {
            pageCount: collectedUrls.length,
            imageUrls: collectedUrls.map((url, i) => ({ page: i + 1, url }))
        };

    } finally {
        await page.close();
    }
}

/** Close the shared browser instance. */
async function close() {
    if (browser) {
        try { await browser.close(); } catch {}
        browser = null;
    }
}

module.exports = {
    name: SOURCE_NAME,
    discoverCatalogs,
    getPageImageUrls,
    close
};
