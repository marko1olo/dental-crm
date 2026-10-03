const fs = require('fs');
const path = require('path');

const srcPath = 'docs/competitive-audit/РЕВЕРС ИНЖИНИРИНГ DENTALPRO/all_pages_and_templates/templates_043u/all_clinical_chunks_1142.json';
const data = JSON.parse(fs.readFileSync(srcPath, 'utf8'));

function sanitizeText(rawText) {
  if (!rawText) return "";
  let text = rawText;
  text = text.replace(/<block[^>]*>/gi, "");
  text = text.replace(/<\/block>/gi, "");
  text = text.replace(/#tooths[^"]*"[^"]*"[^>]*values="[^"]*"/gi, "");
  text = text.replace(/#tooths[^>]*>/gi, "");
  text = text.replace(/#tooths[^ \n]*/gi, "");
  text = text.replace(/\[\|([^\]]+)\]/g, (match, p1) => p1.split("|")[0] || "");
  const lines = text.split("\n").map(line => {
    let l = line.replace(/\^/g, "\n");
    if (l.includes("|")) l = l.split("|")[0];
    return l;
  });
  return lines.join("\n").replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
}

function classifyChunk(chunk) {
  const isDiag = chunk.category_name === 'Диагнозы МКБ-10 и клинические ситуации';
  if (isDiag) {
    const icdMatch = chunk.name.match(/^([A-ZА-Я]\d{2}(?:\.\d{1,2})?)/i);
    return {
      chunkType: 'diagnosis',
      procedureName: chunk.name,
      icd10: icdMatch ? icdMatch[1] : undefined
    };
  }

  const m = chunk.name.match(/^(Жалобы|Анамнез|Объективно|Лечение|Рекомендации)\s*\((.+)\)$/i);
  if (m) {
    const typeMap = {
      'жалобы': 'complaints',
      'анамнез': 'anamnesis',
      'объективно': 'objective',
      'лечение': 'treatment',
      'рекомендации': 'recommendations'
    };
    return {
      chunkType: typeMap[m[1].toLowerCase()] || 'other',
      procedureName: m[2].trim()
    };
  }

  if (chunk.name.includes('(полный шаблон)') || chunk.name.includes('полный шаблон')) {
    const cleanProc = chunk.name
      .replace(/\(полный шаблон[^)]*\)/gi, '')
      .replace(/полный шаблон/gi, '')
      .replace(/-полный шаблон/gi, '')
      .trim();
    return {
      chunkType: 'full',
      procedureName: cleanProc
    };
  }

  return {
    chunkType: 'other',
    procedureName: chunk.name
  };
}

const categoryKeyMap = {
  'Терапевтическая стоматология (кариес, пульпит, периодонтит)': 'therapy',
  'Хирургическая стоматология и имплантация': 'surgery',
  'Ортопедическая стоматология (протезирование)': 'orthopedics',
  'Детская стоматология': 'pediatric',
  'Гигиена и профилактика': 'hygiene',
  'Профессиональная гигиена полости рта': 'hygiene',
  'Отбеливание зубов': 'bleaching',
  'Пародонтология': 'periodontics',
  'Диагнозы МКБ-10 и клинические ситуации': 'icd10',
  'Комплексные карты приёма (Аносова демо)': 'comprehensive'
};

const processed = data.chunks.map(c => {
  const { chunkType, procedureName, icd10 } = classifyChunk(c);
  const text = sanitizeText(c.template_clean || c.template);
  return {
    id: c.id,
    name: c.name,
    categoryName: c.category_name,
    categoryKey: categoryKeyMap[c.category_name] || 'therapy',
    categoryId: c.category_id,
    chunkType,
    procedureName,
    text,
    ...(icd10 ? { icd10 } : {})
  };
});

const outDir = path.resolve('apps/web/src/components/visit/clinicalCatalog');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}
const outPath = path.join(outDir, 'protocols1142Data.json');
fs.writeFileSync(outPath, JSON.stringify(processed), 'utf8');

console.log('Saved', processed.length, 'chunks to', outPath);
console.log('File size:', (fs.statSync(outPath).size / 1024).toFixed(1), 'KB');
