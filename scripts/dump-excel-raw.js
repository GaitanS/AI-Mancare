#!/usr/bin/env node

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'search engines-catalog kaufland-en-ro-11-01-2026 (1).xlsx');

console.log('Reading:', filePath);

const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0]; // First sheet (Google)

console.log('\n=== Sheet:', sheetName, '===\n');

const worksheet = workbook.Sheets[sheetName];

// Get as array of arrays to see raw structure
const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

console.log('Total rows:', data.length);
console.log('\nFirst 50 rows:\n');

data.slice(0, 50).forEach((row, idx) => {
    console.log(`Row ${idx}:`, JSON.stringify(row));
});
