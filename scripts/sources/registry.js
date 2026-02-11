/**
 * Source Registry - Cascading Catalog Discovery
 *
 * Tries multiple source adapters in priority order for each store.
 * Returns results from the first source that has current (non-expired) catalogs.
 */

const cataloagedeoferte = require('./cataloagedeoferte');

// Lazy-loaded to avoid crashing if puppeteer has issues
const LOAD_FAILED = Symbol('LOAD_FAILED');
let ofertelecatalog = null;
function getOfertelecatalog() {
    if (ofertelecatalog === LOAD_FAILED) return null;
    if (!ofertelecatalog) {
        try {
            ofertelecatalog = require('./ofertelecatalog');
        } catch (err) {
            console.warn(`[registry] ofertelecatalog adapter disabled: ${err.message}`);
            ofertelecatalog = LOAD_FAILED;
            return null;
        }
    }
    return ofertelecatalog;
}

/**
 * Source priority order. Each source is tried in sequence per store.
 * The first source to return non-expired catalogs wins.
 */
function getSources() {
    const sources = [cataloagedeoferte];
    const olc = getOfertelecatalog();
    if (olc) sources.push(olc);
    return sources;
}

/**
 * Wrap a promise with a timeout.
 */
function withTimeout(promise, ms, label) {
    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout after ${ms}ms: ${label}`)), ms)
        )
    ]);
}

/**
 * Discover catalogs for a store using cascading sources.
 *
 * @param {Object} store - Store config ({ name, slug, slugs? })
 * @param {Function} log - Logging function
 * @returns {{ catalogs: Array, source: string|null }}
 */
async function discoverCatalogsForStore(store, log = console.log) {
    const sources = getSources();
    const now = new Date();

    for (const source of sources) {
        try {
            log(`  [${source.name}] Trying...`);

            const catalogs = await withTimeout(
                source.discoverCatalogs(store),
                30000,
                `${source.name} discoverCatalogs for ${store.name}`
            );

            // Filter to non-expired catalogs only
            const currentCatalogs = catalogs.filter(c => {
                if (!c.validUntil) return true;
                return new Date(c.validUntil) >= now;
            });

            if (currentCatalogs.length > 0) {
                log(`  [${source.name}] Found ${currentCatalogs.length} current catalog(s)`);
                return { catalogs: currentCatalogs, source: source.name };
            }

            log(`  [${source.name}] No current catalogs (${catalogs.length} expired)`);

        } catch (err) {
            log(`  [${source.name}] Failed: ${err.message}`);
        }
    }

    log(`  No source has current catalogs for ${store.name}`);
    return { catalogs: [], source: null };
}

/**
 * Get page image URLs for a catalog from its source adapter.
 *
 * @param {Object} catalog - Catalog object (must have .source field)
 * @returns {{ pageCount: number, imageUrls: Array<{ page: number, url: string }> }}
 */
async function getPageImageUrls(catalog) {
    const sources = getSources();
    const source = sources.find(s => s.name === catalog.source);

    if (!source) {
        throw new Error(`Unknown source: ${catalog.source}`);
    }

    return withTimeout(
        source.getPageImageUrls(catalog),
        60000,
        `${source.name} getPageImageUrls for ${catalog.slug}`
    );
}

/**
 * Close all source adapters (e.g., puppeteer browser instances).
 */
async function closeAll() {
    const sources = getSources();
    for (const source of sources) {
        try { await source.close(); } catch {}
    }
}

module.exports = {
    discoverCatalogsForStore,
    getPageImageUrls,
    closeAll
};
