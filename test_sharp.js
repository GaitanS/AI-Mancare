
const { PDFDocument } = require('pdf-lib');
const sharp = require('sharp');
const fs = require('fs/promises');

async function main() {
    try {
        // 1. Create simple PDF
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([200, 200]);
        page.drawText('Test', { x: 50, y: 100 });
        const pdfBytes = await pdfDoc.save();

        await fs.writeFile('test_sharp.pdf', pdfBytes);

        // 2. Try convert with Sharp
        console.log('Attempting conversion...');
        await sharp(Buffer.from(pdfBytes), { density: 72 })
            .png()
            .toFile('test_sharp.png');

        console.log('SUCCESS: Converted PDF to PNG');
    } catch (e) {
        console.error('FAILURE:', e.message);
    }
}

main();
