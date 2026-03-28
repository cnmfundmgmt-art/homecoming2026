const { fromPath } = require('pdf2pic');
const Tesseract = require('tesseract.js');
const path = require('path');
const fs = require('fs');

const pdfPath = path.join(__dirname, '../Student list', 'Copy of 2001入学_先修联一&二名单.pdf');
const outputDir = path.join(__dirname, 'temp_ocr');
const resultFile = path.join(__dirname, 'ocr_result.txt');

if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

async function extract() {
  try {
    const convert = fromPath(pdfPath, {
      density: 200,
      saveFilename: 'page',
      savePath: outputDir,
      format: 'png',
      width: 1800,
      height: 2400
    });

    console.log('Converting pages...');
    const pages = await convert(2);
    console.log('Converted:', pages.length, 'pages');

    let allText = '';
    for (let i = 0; i < pages.length; i++) {
      const imgPath = pages[i].path;
      console.log(`OCR page ${i + 1}...`);
      const { data: { text } } = await Tesseract.recognize(imgPath, 'eng+chi_sim');
      allText += `\n--- Page ${i + 1} ---\n` + text;
    }

    fs.writeFileSync(resultFile, allText);
    console.log('\nSaved to:', resultFile);
    console.log('\nFirst 3000 chars:\n', allText.substring(0, 3000));
  } catch (err) {
    console.error('Error:', err.message, err.stack);
  }
}

extract();
