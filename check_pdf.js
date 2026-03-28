const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

async function check() {
  const files = fs.readdirSync('../Student list');
  for (const file of files) {
    const pdfPath = path.join(__dirname, '../Student list', file);
    const pdfBytes = fs.readFileSync(pdfPath);
    const pdf = await PDFDocument.load(pdfBytes);
    const pages = pdf.getPages();
    console.log(`${file}: ${pages.length} pages`);
    // Try to get text from first page
    if (pages.length > 0) {
      const firstPage = pages[0];
      const { width, height } = firstPage.getSize();
      console.log(`  Page 1 size: ${width}x${height}`);
    }
  }
}

check();
