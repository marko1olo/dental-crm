const fs = require("fs");
const ts = require("typescript");
const code = fs.readFileSync("src/lib/smartPatientParser.ts", "utf8");
const result = ts.transpileModule(code, {
	compilerOptions: { module: ts.ModuleKind.CommonJS },
});
fs.writeFileSync("scratch/testPatientParserOut.cjs", result.outputText);
const { parsePatientDictationLocal } = require("./testPatientParserOut.cjs");

const phrases = [
	"Иванов Иван +79001234567 15.05.1980",
	"8 (999) 111-22-33 Сидоров Петр",
	"Петрова Анна 01.12.1995",
];

for (const p of phrases) {
	console.log(`\nInput: ${p}`);
	console.log(JSON.stringify(parsePatientDictationLocal(p), null, 2));
}
