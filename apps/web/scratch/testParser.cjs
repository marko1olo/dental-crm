const fs = require('fs');
const ts = require('typescript');
const code = fs.readFileSync('src/lib/smartVisitParser.ts', 'utf8');
const result = ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
fs.writeFileSync('scratch/testParserOut.cjs', result.outputText);
const { parseVisitDictationLocal } = require('./testParserOut.cjs');

const phrases = [
  "кариес 36 глубокий, анестезия",
  "пациент жалуется на зуб 47, пульпит, сделали снимок",
  "удалил зуб 28, все ок",
  "сделали чистку"
];

for (const p of phrases) {
  console.log(`\nInput: ${p}`);
  console.log(JSON.stringify(parseVisitDictationLocal(p), null, 2));
}
