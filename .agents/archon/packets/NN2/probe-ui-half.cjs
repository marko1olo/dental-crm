/*
 * ЧИТАЮЩАЯ проба. Ничего не пишет.
 *
 * Повторяет ТОЛЬКО текстовую половину стража smoke:pricelist-analyzer — ту, что
 * читает интерфейс. Списки требований и запретов не переписаны от руки, а
 * вынуты из самого стража: переписанный список проверял бы мою память, а не
 * правило.
 *
 * Зачем понадобилось. Страж падает на своей предпосылке о свежести сборки
 * (dist/pricelist/analyzer.js собран 09:34, а src/pricelist/analyzer.ts изменён
 * в 10:13 коммитом 3908529e8 из другого пакета этой же волны). Предпосылка стоит
 * ДО всех проверок, поэтому текстовая половина не выполняется вовсе — при том
 * что она к analyzer.ts не относится. Пересборка API — гейт ведущего, и делать
 * её из пакета нельзя.
 */
const fs = require("node:fs");
const path = require("node:path");

const guardPath = path.resolve("scripts/smoke-pricelist-analyzer.mjs");
const guard = fs.readFileSync(guardPath, "utf8");

function extractArray(name) {
	const match = guard.match(
		new RegExp("const " + name + " = (\\[[\\s\\S]*?\\n\\]);"),
	);
	if (!match) throw new Error("не удалось вынуть список " + name);
	return new Function("return " + match[1])();
}

const requiredUiSnippets = extractArray("requiredUiSnippets");
const forbiddenUiSnippets = extractArray("forbiddenUiSnippets");
const declaredMissingUi = extractArray("declaredMissingUi");

const read = (file) => fs.readFileSync(path.resolve(file), "utf8");
const settingsViewSource = read("apps/web/src/SettingsView.tsx");
const settingsTabSources = [
	"SettingsPricesTab",
	"SettingsImportsTab",
	"SettingsAuditTab",
	"SettingsTelegramTab",
]
	.map((tab) => read(`apps/web/src/components/settings/${tab}.tsx`))
	.join("\n");
const uiSource = [
	read("apps/web/src/App.tsx"),
	settingsViewSource,
	read("apps/web/src/pricelistUiMeta.ts"),
	read("apps/web/src/useAppLogic.tsx"),
	settingsTabSources,
].join("\n");

let failures = 0;
console.log(
	`вынуто из стража: требований ${requiredUiSnippets.length}, запретов ${forbiddenUiSnippets.length}, объявленных пропусков ${declaredMissingUi.length}`,
);
for (const snippet of requiredUiSnippets) {
	if (!uiSource.includes(snippet)) {
		failures++;
		console.log("НЕТ ТРЕБУЕМОГО: " + snippet);
	}
}
for (const snippet of forbiddenUiSnippets) {
	if (uiSource.includes(snippet)) {
		failures++;
		console.log("ПРОСОЧИЛСЯ ЗАПРЕЩЁННЫЙ: " + snippet);
	}
}
for (const debt of declaredMissingUi) {
	if (uiSource.includes(debt.snippet)) {
		failures++;
		console.log("ХРАПОВИК ДОЛГА СРАБОТАЛ: " + debt.snippet);
	}
}
const rawWarningJsx =
	"typedPricelistAnalysis.warnings.map((warning) => (\n                      <span key={warning}>{warning}</span>";
if (settingsViewSource.includes(rawWarningJsx)) {
	failures++;
	console.log("ПРОСОЧИЛСЯ СЫРОЙ КЛЮЧ ПРЕДУПРЕЖДЕНИЯ В РАЗМЕТКЕ");
}
console.log("ОТКАЗОВ ТЕКСТОВОЙ ПОЛОВИНЫ: " + failures);
process.exit(failures ? 1 : 0);
