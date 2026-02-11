/**
 * Source Adapter: cataloagedeoferte.ro
 *
 * Scrapes catalog listings and page images from cataloagedeoferte.ro using
 * cheerio (server-rendered HTML). This is the primary/fastest source.
 */

const axios = require('axios');
const cheerio = require('cheerio');

const SOURCE_NAME = 'cataloagedeoferte.ro';
const BASE_URL = 'https://cataloagedeoferte.ro';
const IMAGE_CDN = 'https://app.cataloagedeoferte.ro';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parse the CDN path from a catalog slug.
 * Slug format: ...-DD-MM-YY-DD-MM-YY-UNIQUEID
 * CDN path:    YYMMDD_YYMMDD_storeSlug_UNIQUEID
 */
function getCatalogCdnPath(catalogSlug, storeSlug) {
    const parts = catalogSlug.split('-');
    if (parts.length < 8) return null;

    const uniqueId = parts[parts.length - 1];
    const endYear = parts[parts.length - 2];
    const endMonth = parts[parts.length - 3];
    const endDay = parts[parts.length - 4];
    const startYear = parts[parts.length - 5];
    const startMonth = parts[parts.length - 6];
    const startDay = parts[parts.length - 7];

    return `${endYear}${endMonth}${endDay}_${startYear}${startMonth}${startDay}_${storeSlug}_${uniqueId}`;
}

/**
 * Parse validity dates from a catalog slug.
 */
function parseValidityDates(catalogSlug) {
    const parts = catalogSlug.split('-');
    if (parts.length < 8) {
        return { validFrom: new Date(), validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) };
    }

    const endYear = parseInt('20' + parts[parts.length - 2]);
    const endMonth = parseInt(parts[parts.length - 3]) - 1;
    const endDay = parseInt(parts[parts.length - 4]);
    const startYear = parseInt('20' + parts[parts.length - 5]);
    const startMonth = parseInt(parts[parts.length - 6]) - 1;
    const startDay = parseInt(parts[parts.length - 7]);

    return {
        validFrom: new Date(startYear, startMonth, startDay),
        validUntil: new Date(endYear, endMonth, endDay, 23, 59, 59)
    };
}

/**
 * Get total page count for a catalog by parsing pagination links.
 */
async function getPageCount(catalogUrl) {
    try {
        const response = await axios.get(catalogUrl, {
            headers: { 'User-Agent': UA },
            timeout: 15000
        });

        const $ = cheerio.load(response.data);
        let maxPage = 1;
        $('a').each((i, el) => {
            const text = $(el).text().trim();
            const pageNum = parseInt(text);
            if (!isNaN(pageNum) && pageNum > maxPage) {
                maxPage = pageNum;
            }
        });

        return maxPage;
    } catch {
        return 1;
    }
}

// ── Adapter Interface ────────────────────────────────────────────────────────

/**
 * Discover catalogs for a store.
 * Returns array of catalog objects with: slug, title, url, storeSlug, storeName,
 * validFrom, validUntil, source.
 */
async function discoverCatalogs(store) {
    const storeSlug = store.slugs?.cataloagedeoferte || store.slug;

    const response = await axios.get(`${BASE_URL}/magazine/${storeSlug}`, {
        headers: { 'User-Agent': UA },
        timeout: 15000
    });

    const $ = cheerio.load(response.data);
    const catalogs = [];

    $('a[href*="/magazine/' + storeSlug + '/"]').each((i, el) => {
        const href = $(el).attr('href');
        const match = href?.match(new RegExp(`/magazine/${storeSlug}/([^/]+)/1$`));
        if (match) {
            const catalogSlug = match[1];
            const title = $(el).text().trim() || catalogSlug;

            if (!catalogs.find(c => c.slug === catalogSlug)) {
                const { validFrom, validUntil } = parseValidityDates(catalogSlug);
                catalogs.push({
                    slug: catalogSlug,
                    title,
                    url: `${BASE_URL}${href}`,
                    storeSlug: store.slug,       // always use canonical store slug
                    storeName: store.name,
                    _sourceSlug: storeSlug,      // slug used on this source (for CDN path)
                    validFrom,
                    validUntil,
                    source: SOURCE_NAME
                });
            }
        }
    });

    return catalogs;
}

/**
 * Get page image URLs for a catalog.
 * Returns { pageCount, imageUrls: [{ page, url }] }.
 */
async function getPageImageUrls(catalog) {
    const cdnPath = getCatalogCdnPath(catalog.slug, catalog._sourceSlug || catalog.storeSlug);
    if (!cdnPath) return { pageCount: 0, imageUrls: [] };

    const pageCount = await getPageCount(catalog.url);
    const imageUrls = [];

    for (let page = 1; page <= pageCount; page++) {
        const pageNum = String(page).padStart(2, '0');
        imageUrls.push({
            page,
            url: `${IMAGE_CDN}/${cdnPath}/image${pageNum}.webp`
        });
    }

    return { pageCount, imageUrls };
}

/** No-op — this adapter uses stateless HTTP requests. */
async function close() {}

module.exports = {
    name: SOURCE_NAME,
    discoverCatalogs,
    getPageImageUrls,
    parseValidityDates,
    close
};
