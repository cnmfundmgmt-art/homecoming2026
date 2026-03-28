const { execSync } = require('child_process');
const Tesseract = require('tesseract.js');
const path = require('path');
const fs = require('fs');

const inputDir = path.join(__dirname, '../Student list');
const outputDir = path.join(__dirname, 'temp_ocr');
const resultFile = path.join(__dirname, 'ocr_results.txt');

if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

const files = fs.readdirSync(inputDir).filter(f => f.endsWith('.pdf'));

async function processFile(filename) {
  const pdfPath = path.join(inputDir, filename);
  const baseName = filename.replace('.pdf', '');
  const outputPath = path.join(outputDir, baseName);
  if (!fs.existsSync(outputPath)) fs.mkdirSync(outputPath, { recursive: true });

  console.log(`\nProcessing: ${filename}`);

  // Convert PDF to images (1 page each to start)
  try {
    execSync(`magick -density 200 "${pdfPath}" -resize 1800x2400 "${outputPath}/page.png"`, { stdio: 'pipe' });
    console.log('Converted to image');
  } catch (e) {
    console.error('Convert error:', e.message);
    return [];
  }

  // OCR
  const imgPath = path.join(outputPath, 'page.png');
  const { data: { text } } = await Tesseract.recognize(imgPath, 'eng+chi_sim');
  console.log(`OCR done for ${filename}`);
  return { filename, text };
}

async function main() {
  let allResults = '';
  
  for (const file of files) {
    const result = await processFile(file);
    if (result.text) {
      allResults += `\n\n======== ${result.filename} ========\n${result.text}`;
    }
  }
  
  fs.writeFileSync(resultFile, allResults);
  console.log(`\nAll results saved to ${resultFile}`);
  console.log('\n======== SAMPLE OUTPUT ========');
  console.log(allResults.substring(0, 5000));
}

main().catch(console.error);
