#!/usr/bin/env node

/**
 * Comprehensive SEO Analysis - Extract keywords with search volumes
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
const allKeywords = [];
const keywordsByStore = {};
const keywordsByPlatform = {};
const modifierTypes = new Set();

console.log('=== COMPREHENSIVE SEO KEYWORD EXTRACTION ===\n');

files.forEach(({ name: filename, store }) => {
    const filePath = path.join(baseDir, filename);

    if (!fs.existsSync(filePath)) {
        console.log(`⚠️  File not found: ${filename}\n`);
        return;
    }

    console.log(`📊 Processing: ${store}`);

    try {
        const workbook = XLSX.readFile(filePath);

        workbook.SheetNames.forEach(platform => {
            const worksheet = workbook.Sheets[platform];
            const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

            // Find header row (contains "Search Term", "Modifier Type", etc.)
            let headerRowIndex = -1;
            for (let i = 0; i < Math.min(20, data.length); i++) {
                if (data[i][0] === 'Search Term' && data[i][3] === 'Keyword') {
                    headerRowIndex = i;
                    break;
                }
            }

            if (headerRowIndex === -1) {
                return;
            }

            // Process data rows
            let keywordCount = 0;
            for (let i = headerRowIndex + 1; i < data.length; i++) {
                const row = data[i];
                if (!row || row.length < 4) continue;

                const baseSearchTerm = row[0];
                const modifierType = row[1];
                const modifier = row[2];
                const keyword = row[3];
                const language = row[4];
                const country = row[5];
                const searchVol = row[6];
                const cpc = row[7];

                // Skip empty rows
                if (!keyword || keyword === '') continue;

                // Parse search volume
                let volume = 0;
                if (typeof searchVol === 'number') {
                    volume = searchVol;
                } else if (typeof searchVol === 'string') {
                    volume = parseInt(searchVol.replace(/,/g, '')) || 0;
                }

                // Parse CPC
                let cpcValue = 0;
                if (typeof cpc === 'number') {
                    cpcValue = cpc;
                } else if (typeof cpc === 'string' && cpc !== '-') {
                    cpcValue = parseFloat(cpc) || 0;
                }

                const keywordData = {
                    keyword: keyword.toLowerCase().trim(),
                    baseSearchTerm,
                    modifierType,
                    modifier,
                    language,
                    country,
                    searchVolume: volume,
                    cpc: cpcValue,
                    store,
                    platform
                };

                allKeywords.push(keywordData);
                keywordCount++;

                // Track by store
                if (!keywordsByStore[store]) keywordsByStore[store] = [];
                keywordsByStore[store].push(keywordData);

                // Track by platform
                if (!keywordsByPlatform[platform]) keywordsByPlatform[platform] = [];
                keywordsByPlatform[platform].push(keywordData);

                // Track modifier types
                if (modifierType) modifierTypes.add(modifierType);
            }

            if (keywordCount > 0) {
                console.log(`  ${platform}: ${keywordCount} keywords extracted`);
            }
        });

    } catch (error) {
        console.error(`❌ Error processing ${filename}:`, error.message);
    }
});

console.log('\n' + '='.repeat(80));
console.log('\n📊 ANALYSIS SUMMARY\n');

console.log(`Total keywords extracted: ${allKeywords.length}`);
console.log(`Unique keywords: ${new Set(allKeywords.map(k => k.keyword)).size}`);
console.log(`Modifier types: ${[...modifierTypes].join(', ')}`);

// Calculate total search volume
const totalVolume = allKeywords.reduce((sum, k) => sum + k.searchVolume, 0);
console.log(`Total monthly search volume: ${totalVolume.toLocaleString()}`);

// Top keywords by search volume
console.log('\n' + '='.repeat(80));
console.log('\n🔝 TOP 50 KEYWORDS BY SEARCH VOLUME\n');

const sortedByVolume = [...allKeywords]
    .sort((a, b) => b.searchVolume - a.searchVolume)
    .slice(0, 50);

sortedByVolume.forEach((kw, idx) => {
    const volStr = kw.searchVolume.toString().padStart(6);
    const cpcStr = kw.cpc > 0 ? `$${kw.cpc.toFixed(2)}` : '  -  ';
    console.log(`${String(idx + 1).padStart(3)}. [${volStr}] [${cpcStr}] ${kw.keyword} (${kw.store})`);
});

// Keywords by store
console.log('\n' + '='.repeat(80));
console.log('\n🏪 BREAKDOWN BY STORE\n');

Object.entries(keywordsByStore).forEach(([store, keywords]) => {
    const uniqueCount = new Set(keywords.map(k => k.keyword)).size;
    const totalVol = keywords.reduce((sum, k) => sum + k.searchVolume, 0);
    const avgVol = Math.round(totalVol / keywords.length);

    console.log(`${store}:`);
    console.log(`  Total keywords: ${keywords.length}`);
    console.log(`  Unique keywords: ${uniqueCount}`);
    console.log(`  Total search volume: ${totalVol.toLocaleString()}`);
    console.log(`  Average search volume: ${avgVol}`);

    // Top 10 for this store
    const top10 = keywords
        .sort((a, b) => b.searchVolume - a.searchVolume)
        .slice(0, 10);

    console.log(`  Top 10 keywords:`);
    top10.forEach(kw => {
        console.log(`    [${kw.searchVolume}] ${kw.keyword}`);
    });
    console.log('');
});

// Keywords by platform
console.log('='.repeat(80));
console.log('\n📱 BREAKDOWN BY PLATFORM\n');

Object.entries(keywordsByPlatform).forEach(([platform, keywords]) => {
    const totalVol = keywords.reduce((sum, k) => sum + k.searchVolume, 0);
    console.log(`${platform}: ${keywords.length} keywords, ${totalVol.toLocaleString()} total volume`);
});

// Keyword clusters analysis
console.log('\n' + '='.repeat(80));
console.log('\n🎯 KEYWORD INTENT ANALYSIS\n');

const intents = {
    location: allKeywords.filter(k =>
        k.keyword.includes(' bucuresti') ||
        k.keyword.includes(' cluj') ||
        k.keyword.includes(' timisoara') ||
        k.keyword.includes(' iasi') ||
        k.keyword.includes(' brasov') ||
        k.keyword.includes(' constanta') ||
        k.keyword.includes(' craiova')
    ),
    date: allKeywords.filter(k =>
        k.keyword.includes('ianuarie') ||
        k.keyword.includes('februarie') ||
        k.keyword.includes('martie') ||
        k.keyword.includes('aprilie') ||
        k.keyword.includes('mai') ||
        k.keyword.includes('iunie') ||
        k.keyword.includes('iulie') ||
        k.keyword.includes('august') ||
        k.keyword.includes('septembrie') ||
        k.keyword.includes('octombrie') ||
        k.keyword.includes('noiembrie') ||
        k.keyword.includes('decembrie') ||
        k.keyword.match(/\d{1,2}\s(ianuarie|februarie|martie)/i) ||
        k.keyword.includes('2025') ||
        k.keyword.includes('2026')
    ),
    actual: allKeywords.filter(k =>
        k.keyword.includes('actual') ||
        k.keyword.includes('azi') ||
        k.keyword.includes('acum') ||
        k.keyword.includes('astazi')
    ),
    pdf: allKeywords.filter(k => k.keyword.includes('pdf')),
    online: allKeywords.filter(k =>
        k.keyword.includes('online') ||
        k.keyword.includes('web') ||
        k.keyword.includes('site')
    ),
    questions: allKeywords.filter(k => k.modifierType === 'Questions'),
};

Object.entries(intents).forEach(([intent, keywords]) => {
    const totalVol = keywords.reduce((sum, k) => sum + k.searchVolume, 0);
    console.log(`${intent.toUpperCase()}: ${keywords.length} keywords, ${totalVol.toLocaleString()} volume`);

    const top5 = keywords
        .sort((a, b) => b.searchVolume - a.searchVolume)
        .slice(0, 5);

    top5.forEach(kw => {
        console.log(`  [${kw.searchVolume}] ${kw.keyword}`);
    });
    console.log('');
});

// Export comprehensive data
const outputData = {
    summary: {
        totalKeywords: allKeywords.length,
        uniqueKeywords: new Set(allKeywords.map(k => k.keyword)).size,
        totalSearchVolume: totalVolume,
        averageSearchVolume: Math.round(totalVolume / allKeywords.length),
        stores: Object.keys(keywordsByStore),
        platforms: Object.keys(keywordsByPlatform),
        modifierTypes: [...modifierTypes]
    },
    topKeywords: sortedByVolume.map(k => ({
        keyword: k.keyword,
        searchVolume: k.searchVolume,
        cpc: k.cpc,
        store: k.store,
        platform: k.platform
    })),
    byStore: Object.fromEntries(
        Object.entries(keywordsByStore).map(([store, keywords]) => [
            store,
            {
                total: keywords.length,
                unique: new Set(keywords.map(k => k.keyword)).size,
                totalVolume: keywords.reduce((sum, k) => sum + k.searchVolume, 0),
                top20: keywords
                    .sort((a, b) => b.searchVolume - a.searchVolume)
                    .slice(0, 20)
                    .map(k => ({
                        keyword: k.keyword,
                        searchVolume: k.searchVolume,
                        cpc: k.cpc
                    }))
            }
        ])
    ),
    byPlatform: Object.fromEntries(
        Object.entries(keywordsByPlatform).map(([platform, keywords]) => [
            platform,
            {
                total: keywords.length,
                totalVolume: keywords.reduce((sum, k) => sum + k.searchVolume, 0)
            }
        ])
    ),
    intentClusters: Object.fromEntries(
        Object.entries(intents).map(([intent, keywords]) => [
            intent,
            {
                total: keywords.length,
                totalVolume: keywords.reduce((sum, k) => sum + k.searchVolume, 0),
                topKeywords: keywords
                    .sort((a, b) => b.searchVolume - a.searchVolume)
                    .slice(0, 20)
                    .map(k => ({
                        keyword: k.keyword,
                        searchVolume: k.searchVolume,
                        cpc: k.cpc
                    }))
            }
        ])
    ),
    allKeywords: allKeywords,
    generatedAt: new Date().toISOString()
};

const outputPath = path.join(baseDir, 'storage', 'seo-comprehensive-analysis.json');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));

console.log('='.repeat(80));
console.log(`\n✅ Comprehensive analysis saved to: ${outputPath}\n`);
