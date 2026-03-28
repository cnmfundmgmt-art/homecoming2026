const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

const pdfPath = path.join(__dirname, '../Student list', 'Copy of 2001入学_先修联一&二名单.pdf');
const outputDir = path.join(__dirname, 'temp_images');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

async function extractImages() {
  const pdfBytes = fs.readFileSync(pdfPath);
  const pdf = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const pages = pdf.getPages();
  console.log(`PDF has ${pages.length} pages`);

  let imgCount = 0;
  for (let p = 0; p < Math.min(pages.length, 3); p++) {
    const page = pages[p];
    const { width, height } = page.getSize();
    console.log(`Page ${p + 1}: ${width}x${height}`);
    
    // Try to get image count from page
    const imageCount = page.getImageCount?.() ?? 0;
    console.log(`  Images on page: ${imageCount}`);
    
    // List all keys in the page
    const ops = page.getObject?.()?.toJS?.() ?? {};
    // console.log('Page keys:', Object.keys(ops));
  }

  // Check PDF catalog for embedded images
  const imagePaths = [];
  for (const [ref, img] of pdf.context.enumerateIndirectObjects()) {
    if (ref.toString?.().includes('Image') || img?.toString?.().includes('Image')) {
      imgCount++;
    }
  }
  console.log(`Total image objects: ${imgCount}`);
}

extractImages().catch(console.error);
