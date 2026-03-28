const Tesseract = require('tesseract.js');
const path = require('path');
const fs = require('fs');

const imgPath = path.join(__dirname, 'temp_ocr/images/_Im1.jpg');

async function ocr() {
  console.log('Starting OCR...');
  const { data: { text } } = await Tesseract.recognize(imgPath, 'eng+chi_sim');
  console.log('\nOCR Result:\n');
  console.log(text);
  fs.writeFileSync(path.join(__dirname, 'temp_ocr/ocr_sample.txt'), text);
}

ocr().catch(console.error);
