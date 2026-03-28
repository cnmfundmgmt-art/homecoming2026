const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const outputDir = path.join(__dirname, 'temp_ocr');
const enhancedDir = path.join(outputDir, 'enhanced');
if (!fs.existsSync(enhancedDir)) fs.mkdirSync(enhancedDir, { recursive: true });

async function preprocessAndOCR(imgPath) {
  const enhancedImg = path.join(enhancedDir, 'best_' + path.basename(imgPath));
  
  await sharp(imgPath)
    .grayscale()
    .linear(1.5, -30)  // increase contrast
    .sharpen({ sigma: 2.0 })
    .toFile(enhancedImg);

  // Try different languages
  for (const lang of ['chi_sim', 'eng+chi_sim']) {
    console.log(`\nTrying language: ${lang}`);
    const { data: { text, confidence } } = await Tesseract.recognize(enhancedImg, lang);
    console.log(`Confidence: ${confidence}%`);
    console.log('Text:', text.substring(0, 500));
  }
}

async function main() {
  const inputImg = path.join(outputDir, 'Copy_of_2001入学_先修联一&二名单', 'page2__Im2.jpg');
  await preprocessAndOCR(inputImg);
}

main().catch(console.error);
