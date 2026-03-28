const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const outputDir = path.join(__dirname, 'temp_ocr');
const enhancedDir = path.join(outputDir, 'enhanced');
if (!fs.existsSync(enhancedDir)) fs.mkdirSync(enhancedDir, { recursive: true });

async function preprocessImage(imgPath, outPath) {
  await sharp(imgPath)
    .grayscale()
    .normalize()
    .resize(3000, null, { kernel: 'lanczos3' })
    .sharpen({ sigma: 1.5 })
    .toFile(outPath);
}

async function ocrImage(imgPath) {
  const { data: { text } } = await Tesseract.recognize(imgPath, 'chi_sim+eng', {
    logger: m => process.stdout.write(`\r${m.status} ${Math.round(m.progress * 100)}%`),
    rect: { left: 50, top: 50, width: 2240, height: 1550 }
  });
  console.log();
  return text;
}

async function main() {
  const inputImg = path.join(outputDir, 'Copy_of_2001入学_先修联一&二名单', 'page2__Im2.jpg');
  const enhancedImg = path.join(enhancedDir, 'page2_enhanced.jpg');
  
  console.log('Preprocessing...');
  await preprocessImage(inputImg, enhancedImg);
  console.log('Enhanced image saved');
  
  console.log('\nOCR...');
  const text = await ocrImage(enhancedImg);
  console.log('\nResult:\n', text);
  
  fs.writeFileSync(path.join(enhancedDir, 'ocr_result.txt'), text);
}

main().catch(console.error);
