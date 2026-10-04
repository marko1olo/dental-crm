const fs = require('fs');
const path = require('path');
const cp = require('child_process');

function readDocx(filePath) {
  const tmpDir = path.resolve('scratch/tmp_docx_' + Math.random().toString(36).slice(2));
  fs.mkdirSync(tmpDir, { recursive: true });
  try {
    cp.execSync(`tar -xf "${filePath}" -C "${tmpDir}"`);
    const docXmlPath = path.join(tmpDir, 'word/document.xml');
    if (fs.existsSync(docXmlPath)) {
      const xml = fs.readFileSync(docXmlPath, 'utf8');
      const text = xml.replace(/<w:p[^>]*>/g, '\n').replace(/<[^>]+>/g, ' ').replace(/[ \t]+/g, ' ');
      return text;
    }
  } catch (e) {
    return 'Error: ' + e.message;
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
  return '';
}

const actPath = path.resolve('docs/competitive-audit/РЕВЕРС ИНЖИНИРИНГ DENTALPRO/all_pages_and_templates/legal_consents/raw_template_files/65_Пакет_для_печати_актов_из_кассы_Акт_выполненных_работ_взрослый.docx');
console.log('=== ACT DOCX ===');
console.log(readDocx(actPath).slice(0, 1500));

const filesToInspect = [
  '118_Документы_для_ФЛ_Договор_на_оказание_платных_медицинских_услуг_двусторонний_с_физическим_лицом_с_01_09_2023.docx',
  '104_Доп_соглашения_Согласованный_план_лечения.docx',
  '115_Пакет_для_печати_актов_из_кассы_Акт_выполненных_работ.docx',
];

for (const fn of filesToInspect) {
  const p = path.resolve('docs/competitive-audit/РЕВЕРС ИНЖИНИРИНГ DENTALPRO/all_pages_and_templates/legal_consents/raw_template_files', fn);
  if (fs.existsSync(p)) {
    console.log(`\n================== ${fn} ==================`);
    const txt = readDocx(p);
    console.log(txt.slice(0, 3000));
  } else {
    console.log('Not found:', p);
  }
}


