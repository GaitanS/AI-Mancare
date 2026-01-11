#!/usr/bin/env node

/**
 * Analyze SEO data from catalog Excel files
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const files = [
    'search engines-catalog kaufland-en-ro-11-01-2026 (1).xlsx',
    'all categories-catalog profi-en-ro-11-01-2026.xlsx',
    'all categories-catalog lidl-en-ro-11-01-2026.xlsx'
];

const baseDir = path.join(__dirname, '..');

console.log('=== SEO DATA ANALYSIS ===\n');

files.forEach(filename => {
    const filePath = path.join(baseDir, filename);

    if (!fs.existsSync(filePath)) {
        console.log(`⚠️  File not found: ${filename}\n`);
        return;
    }

    console.log(`📊 Analyzing: ${filename}`);
    console.log('─'.repeat(80));

    try {
        const workbook = XLSX.readFile(filePath);

        workbook.SheetNames.forEach(sheetName => {
            console.log(`\n📄 Sheet: ${sheetName}`);
            const worksheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

            if (data.length === 0) {
                console.log('  (Empty sheet)');
                return;
            }

            // Show column headers
            const headers = Object.keys(data[0]);
            console.log(`  Columns (${headers.length}): ${headers.join(', ')}`);
            console.log(`  Rows: ${data.length}`);

            // Show first 3 rows as sample
            console.log('\n  Sample data:');
            data.slice(0, 3).forEach((row, idx) => {
                console.log(`\n  Row ${idx + 1}:`);
                Object.entries(row).forEach(([key, value]) => {
                    if (value) {
                        const displayValue = String(value).length > 100
                            ? String(value).substring(0, 100) + '...'
                            : value;
                        console.log(`    ${key}: ${displayValue}`);
                    }
                });
            });

            // Analyze categories if present
            if (headers.includes('Category') || headers.includes('category')) {
                const categoryField = headers.find(h => h.toLowerCase() === 'category');
                const categories = [...new Set(data.map(row => row[categoryField]).filter(Boolean))];
                console.log(`\n  📂 Unique Categories (${categories.length}):`);
                categories.slice(0, 20).forEach(cat => console.log(`    - ${cat}`));
                if (categories.length > 20) {
                    console.log(`    ... and ${categories.length - 20} more`);
                }
            }

            // Analyze search terms if present
            if (headers.some(h => h.toLowerCase().includes('search') || h.toLowerCase().includes('query'))) {
                const searchField = headers.find(h => h.toLowerCase().includes('search') || h.toLowerCase().includes('query'));
                const searches = data.map(row => row[searchField]).filter(Boolean);
                console.log(`\n  🔍 Search Terms (${searches.length} total):`);
                searches.slice(0, 15).forEach(term => console.log(`    - ${term}`));
                if (searches.length > 15) {
                    console.log(`    ... and ${searches.length - 15} more`);
                }
            }
        });

        console.log('\n' + '='.repeat(80) + '\n');

    } catch (error) {
        console.error(`❌ Error reading ${filename}:`, error.message);
        console.log('\n');
    }
});

console.log('\n✅ Analysis complete!\n');
