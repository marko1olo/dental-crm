/*
 * Цена восстановления движка сканирования: какие его зависимости ещё живы.
 * Файл временный.
 *
 * ЗАЧЕМ ИМЕННО ТАК. Отчёт агента говорит, что в `utils/browserScanUtils.ts`
 * остались «леса» — счётчики, лимиты, maybeYield, throwIfAborted, — а сам обход
 * директории удалён. Если это верно, восстановление = вернуть 297 строк тела и
 * подключить их к живому каркасу. Если каркаса нет — это переписывание с нуля,
 * и задачу надо называть иначе.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = "apps/web/src";
const files = [];
(function walk(dir) {
	for (const e of readdirSync(dir, { withFileTypes: true })) {
		if (["node_modules", "dist", ".git"].includes(e.name)) continue;
		const full = path.join(dir, e.name);
		if (e.isDirectory()) {
			walk(full);
			continue;
		}
		if (/\.tsx?$/.test(e.name)) files.push(full);
	}
})(ROOT);

const prod = files.filter(
	(f) => !/\.test\.|\.spec\.|[\\/]tests?[\\/]|__tests__/.test(f),
);
const corpus = prod.map((f) => ({
	file: f.replace(/\\/g, "/").replace("apps/web/src/", ""),
	text: readFileSync(f, "utf8"),
}));

/* Настоящие зависимости движка — служебные слова JS отброшены вручную. */
const DEPS = [
	"applyBrowserPickedImagingFolderPreview",
	"browserFileHasDicomMagic",
	"browserImagingScanElapsedFromIso",
	"browserImagingScanProgressFromStats",
	"browserLocalSourceErrorMessage",
	"buildBrowserPickedImagingFolderPreview",
	"classifyBrowserImagingFileName",
	"createBrowserImagingScanRuntime",
	"isBrowserImagingScanAbortError",
	"maybeYieldBrowserImagingScan",
	"publishBrowserImagingScanProgress",
	"setBrowserImagingScanProgress",
	"setIsBrowserImagingFolderPicking",
	"throwIfBrowserImagingScanAborted",
	"setError",
];

let alive = 0;
const missing = [];
for (const dep of DEPS) {
	/* Объявление, а не любое упоминание: потребитель без производителя бесполезен. */
	const declRe = new RegExp(
		`(?:export\\s+)?(?:async\\s+)?function\\s+${dep}\\b` +
			`|(?:export\\s+)?const\\s+${dep}\\s*=`,
	);
	const declared = corpus.filter((c) => declRe.test(c.text));
	const mentioned = corpus.filter((c) => c.text.includes(dep));
	if (declared.length) {
		alive += 1;
		console.log(
			`ЖИВА     ${dep.padEnd(42)} ${declared.map((d) => d.file).slice(0, 2).join(", ")}`,
		);
	} else {
		missing.push(dep);
		console.log(
			`НЕТ      ${dep.padEnd(42)} упоминаний: ${mentioned.length ? mentioned.map((m) => m.file).slice(0, 2).join(", ") : "нигде"}`,
		);
	}
}

console.log(`\nобъявлено в продукте: ${alive} из ${DEPS.length}`);
console.log(`отсутствует: ${missing.length}${missing.length ? " -> " + missing.join(", ") : ""}`);

/* Каркас: жив ли browserScanUtils и что в нём осталось. */
const scaffold = corpus.find((c) => c.file === "utils/browserScanUtils.ts");
if (scaffold) {
	const exported = [
		...scaffold.text.matchAll(/export\s+(?:async\s+)?(?:function|const)\s+([A-Za-z_$][\w$]*)/g),
	].map((m) => m[1]);
	console.log(`\nutils/browserScanUtils.ts: ${scaffold.text.split("\n").length} строк, экспортов ${exported.length}`);
	console.log(exported.join(", "));
} else {
	console.log("\nutils/browserScanUtils.ts НЕ НАЙДЕН");
}
