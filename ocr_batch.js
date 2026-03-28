const Tesseract = require('tesseract.js');
const path = require('path');
const fs = require('fs');

const outputDir = path.join(__dirname, 'temp_ocr');
const outFile = path.join(outputDir, 'all_ocr_results.txt');

async function ocrDir(dirPath) {
  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.jpg')).sort();
  let allText = '';
  
  for (const file of files) {
    const imgPath = path.join(dirPath, file);
    process.stdout.write(`OCR: ${file}...`);
    const { data: { text } } = await Tesseract.recognize(imgPath, 'eng+chi_sim');
    console.log(' done');
    allText += `\n--- ${file} ---\n` + text;
  }
  return allText;
}

async function main() {
  const dirs = fs.readdirSync(outputDir).filter(d => d.startsWith('Copy_of'));
  
  let fullResults = '';
  for (const dir of dirs) {
    console.log(`\nProcessing ${dir}...`);
    const dirPath = path.join(outputDir, dir);
    const text = await ocrDir(dirPath);
    fullResults += `\n\n======== ${dir} ========\n` + text;
  }
  
  fs.writeFileSync(outFile, fullResults);
  console.log(`\nAll OCR results saved to ${outFile}`);
}

main().catch(console.error);
