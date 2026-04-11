const XLSX = require('xlsx');

const workbook = XLSX.readFile('./data/Student List.xlsx');
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

console.log('Sheet names:', workbook.SheetNames);
console.log('Total rows:', data.length);
console.log('\nFirst 5 rows (raw):');
data.slice(0, 5).forEach((row, i) => console.log(`Row ${i}:`, JSON.stringify(row)));
