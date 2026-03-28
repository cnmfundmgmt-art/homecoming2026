const { chromium } = require('playwright');
const Tesseract = require('tesseract.js');
const path = require('path');
const fs = require('fs');

const pdfPath = path.join(__dirname, '../Student list', 'Copy of 2001入学_先修联一&二名单.pdf');
const outputDir = path.join(__dirname, 'temp_ocr');
const resultFile = path.join(__dirname, 'ocr_result.txt');

if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

async function extract() {
  const browser = await chromium.launch({ args: ['--disable-web-security'] });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Try to load PDF as data URL
  const pdfBuffer = fs.readFileSync(pdfPath);
  const dataUrl = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;
  
  await page.goto(dataUrl);
  await page.waitForTimeout(3000);
  
  const canvasInfo = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (canvas) return { width: canvas.width, height: canvas.height };
    const img = document.querySelector('img');
    if (img) return { width: img.width, height: img.height, type: 'img' };
    return null;
  });
  
  console.log('Render info:', canvasInfo);
  
  if (canvasInfo) {
    const shotPath = path.join(outputDir, 'page1.png');
    await page.screenshot({ path: shotPath, fullPage: false });
    console.log('Screenshot:', shotPath);
    const { data: { text } } = await Tesseract.recognize(shotPath, 'eng+chi_sim');
    console.log('\nOCR:\n', text.substring(0, 4000));
    fs.writeFileSync(resultFile, text);
  } else {
    // Try printing to PDF then converting
    console.log('Direct render failed, trying print...');
    const pdfOut = await page.pdf({ printBackground: true });
    fs.writeFileSync(path.join(outputDir, 'output.pdf'), pdfOut);
    console.log('Printed PDF saved');
  }
  
  await browser.close();
}

extract().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
