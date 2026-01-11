#!/usr/bin/env node

/**
 * Extract SEO keywords and categories from catalog Excel files
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const files = [
    { name: 'search engines-catalog kaufland-en-ro-11-01-2026 (1).xlsx', store: 'Kaufland' },
    { name: 'all categories-catalog profi-en-ro-11-01-2026.xlsx', store: 'Profi' },
    { name: 'all categories-catalog lidl-en-ro-11-01-2026.xlsx', store: 'Lidl' }
];

const baseDir = path.join(__dirname, '..');
const allKeywords = new Map();
const allCategories = new Set();
const platformData = {
    Google: [],
    Bing: [],
    ChatGPT: [],
    YouTube: [],
    TikTok: [],
    Instagram: [],
    Amazon: []
};

console.log('=== EXTRACTING SEO KEYWORDS & CATEGORIES ===\n');

files.forEach(({ name: filename, store }) => {
    const filePath = path.join(baseDir, filename);

    if (!fs.existsSync(filePath)) {
        console.log(`⚠️  File not found: ${filename}\n`);
        return;
    }

    console.log(`📊 Processing: ${store} (${filename})`);

    try {
        const workbook = XLSX.readFile(filePath);

        workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            // Find search terms - they are usually in column B (index 1)
            const searchTerms = [];
            let inResults = false;

            data.forEach((row, idx) => {
                if (!row || row.length === 0) return;

                // Look for "Search Result" or similar headers
                const firstCell = String(row[0] || '').toLowerCase();
                const secondCell = String(row[1] || '').toLowerCase();

                if (firstCell.includes('search result') || firstCell.includes('result')) {
                    inResults = true;
                    return;
                }

                // Extract actual search terms from column B when in results section
                if (inResults && row[1] && String(row[1]).trim().length > 0) {
                    const term = String(row[1]).trim();
                    // Skip header-like entries
                    if (!term.toLowerCase().includes('search term') &&
                        !term.toLowerCase().includes('language') &&
                        !term.toLowerCase().includes('country') &&
                        term.toLowerCase() !== sheetName.toLowerCase()) {
                        searchTerms.push(term);

                        // Add to platform-specific data
                        if (platformData[sheetName]) {
                            platformData[sheetName].push({ store, term });
                        }

                        // Count keyword frequency
                        const lowerTerm = term.toLowerCase();
                        allKeywords.set(lowerTerm, (allKeywords.get(lowerTerm) || 0) + 1);
                    }
                }
            });

            if (searchTerms.length > 0) {
                console.log(`  ${sheetName}: ${searchTerms.length} search terms`);
            }
        });

    } catch (error) {
        console.error(`❌ Error reading ${filename}:`, error.message);
    }
});

console.log('\n' + '='.repeat(80));
console.log('\n📈 KEYWORD ANALYSIS\n');

// Sort keywords by frequency
const sortedKeywords = Array.from(allKeywords.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 100);

console.log(`Total unique keywords: ${allKeywords.size}`);
console.log(`\nTop 100 most frequent keywords:\n`);

sortedKeywords.forEach(([keyword, count], idx) => {
    console.log(`${String(idx + 1).padStart(3)}. [${count}x] ${keyword}`);
});

// Platform breakdown
console.log('\n' + '='.repeat(80));
console.log('\n📱 PLATFORM BREAKDOWN\n');

Object.entries(platformData).forEach(([platform, items]) => {
    if (items.length > 0) {
        console.log(`${platform}: ${items.length} search terms`);

        // Get unique terms for this platform
        const uniqueTerms = [...new Set(items.map(i => i.term.toLowerCase()))];
        console.log(`  Unique: ${uniqueTerms.length}`);

        // Show top 10 for this platform
        const topTerms = uniqueTerms.slice(0, 10);
        topTerms.forEach(term => console.log(`    - ${term}`));
        if (uniqueTerms.length > 10) {
            console.log(`    ... and ${uniqueTerms.length - 10} more`);
        }
        console.log('');
    }
});

// Export to JSON for further analysis
const outputData = {
    totalKeywords: allKeywords.size,
    topKeywords: sortedKeywords.map(([keyword, count]) => ({ keyword, count })),
    platformBreakdown: Object.fromEntries(
        Object.entries(platformData).map(([platform, items]) => [
            platform,
            {
                total: items.length,
                unique: [...new Set(items.map(i => i.term.toLowerCase()))].length,
                terms: [...new Set(items.map(i => i.term.toLowerCase()))]
            }
        ])
    ),
    generatedAt: new Date().toISOString()
};

const outputPath = path.join(baseDir, 'storage', 'seo-keywords-analysis.json');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));

console.log('='.repeat(80));
console.log(`\n✅ Analysis saved to: ${outputPath}\n`);
