/**
 * Сверяет, что вкладки настроек получают всё, что читают.
 *
 * Вкладки вынесены в отдельные компоненты и берут значения из объекта `props`,
 * который собирается в SettingsView как `settingsProps`. Если имя есть в
 * деструктуризации вкладки, но его забыли положить в settingsProps, вкладка
 * получает undefined. Для функции это падение при вызове, для объекта —
 * падение на первом же обращении по ключу: именно так весь раздел «Настройки»
 * переставал открываться из-за `staffScheduleDrafts[member.id]`.
 *
 * Проверка статическая: читает исходники, ничего не запускает.
 */
import { readFileSync, readdirSync } from "node:fs";

const SETTINGS_VIEW = "apps/web/src/SettingsView.tsx";
const TABS_DIR = "apps/web/src/components/settings";

/**
 * Некоторые имена компонент получает не из пропсов, а собирает сам: у него
 * есть запасной путь. Такие в проверке не считаются пропущенными.
 */
const OPTIONAL = new Set([
	// Сохранение доступов сотрудника делается прямо в SettingsClinicTab через
	// POST /api/settings/staff/:id/credentials; проп остался как переопределение.
	"saveStaffCredentials",
]);

/** Имена внутри объекта, объявленного как `const <name> ... = { ... }`. */
function objectLiteralKeys(source, declaration) {
	const start = source.indexOf(declaration);
	if (start < 0) return new Set();
	const open = source.indexOf("{", start);
	let depth = 0;
	let end = open;
	for (let i = open; i < source.length; i += 1) {
		if (source[i] === "{") depth += 1;
		if (source[i] === "}") {
			depth -= 1;
			if (depth === 0) {
				end = i;
				break;
			}
		}
	}
	const body = source.slice(open + 1, end);
	const keys = new Set();
	// Короткая запись `name,` и обычная `name: value`.
	for (const match of body.matchAll(/(?:^|[,{\s])([A-Za-z_$][\w$]*)\s*(?=[,:}])/g)) {
		keys.add(match[1]);
	}
	return keys;
}

/** Имена, которые вкладка достаёт из `props`. */
function tabDestructuredNames(source) {
	const names = new Set();
	// Блоки `const { ... } = p;` и `= props;`
	for (const match of source.matchAll(/const\s*\{([\s\S]*?)\}\s*=\s*(?:p|props)\s*;/g)) {
		for (const name of match[1].matchAll(/(?:^|[,\s])([A-Za-z_$][\w$]*)\s*(?=[,:}]|$)/gm)) {
			names.add(name[1]);
		}
	}
	return names;
}

const settingsViewSource = readFileSync(SETTINGS_VIEW, "utf8");
/*
 * Пропсы собираются в двух объектах: основной settingsProps и дополнение
 * settingsClinicExtraProps. Второй нужен потому, что часть значений объявлена
 * ниже места сборки основного объекта, и попасть туда они не могут.
 */
const provided = new Set([
	...objectLiteralKeys(settingsViewSource, "const settingsProps"),
	...objectLiteralKeys(settingsViewSource, "const settingsClinicExtraProps"),
]);
/*
 * Проверяем только вкладки, которым SettingsView действительно передаёт
 * settingsProps, и только те, что достают значения из `p`. Остальные файлы в
 * этой папке получают свои пропсы и к settingsProps отношения не имеют —
 * первая версия проверки ругалась на них зря.
 */
const files = readdirSync(TABS_DIR).filter(
	(name) =>
		name.endsWith(".tsx") &&
		new RegExp(`<${name.replace(/\.tsx$/, "")}[^>]*props`).test(readFileSync(SETTINGS_VIEW, "utf8")),
);
let problems = 0;

console.log(`в settingsProps передаётся имён: ${provided.size}\n`);

for (const file of files.sort()) {
	const source = readFileSync(`${TABS_DIR}/${file}`, "utf8");
	if (!/=\s*(?:p|props)\s*;/.test(source)) continue;
	const wanted = tabDestructuredNames(source);
	const missing = [...wanted]
		.filter((name) => !provided.has(name) && !OPTIONAL.has(name))
		.sort();
	if (missing.length === 0) {
		console.log(`OK   ${file}: читает ${wanted.size}, все переданы`);
		continue;
	}
	problems += missing.length;
	console.log(`СБОЙ ${file}: читает ${wanted.size}, НЕ переданы ${missing.length}:`);
	for (const name of missing) console.log(`       ${name}`);
}

console.log(`\nвсего непереданных имён: ${problems}`);
if (problems > 0) process.exit(1);
