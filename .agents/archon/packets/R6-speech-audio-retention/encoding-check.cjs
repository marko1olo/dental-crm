// Проверка кодировки файлов делянки R6: мождибаке (UTF-8, прочитанный как CP1252
// и снова закодированный) даёт последовательности вида "Р<высокий байт>".
// Читает файлы, ничего не пишет.
const fs = require("node:fs");

const files = [
	"apps/api/src/speech/gateway.ts",
	"apps/api/src/routes/system.ts",
	"apps/api/src/speech/tests/assemblyAiRetention.test.ts",
];

let broken = 0;
for (const file of files) {
	const content = fs.readFileSync(file, "utf8");
	const brokenLines = content
		.split("\n")
		.filter((line) => /[РС][-ÿ]/.test(line));
	const cyrillic = (content.match(/[А-яЁё]/g) || []).length;
	broken += brokenLines.length;
	console.log(
		`${file} | mojibake lines: ${brokenLines.length} | cyrillic chars: ${cyrillic}`,
	);
}
console.log(broken === 0 ? "CLEAN" : "MOJIBAKE FOUND");
