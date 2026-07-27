/**
 * Печатает локальные значения SettingsView, которые читают вкладки.
 *
 * Мешок пропсов собирается из контекста логики, хранилища и производных. Но
 * часть значений SettingsView считает сам — приведения `typed*`, вычисленные
 * флаги, обработчики. В мешок они не попадают, и вкладка получает undefined.
 * Скрипт находит пересечение: что объявлено локально И читается вкладками.
 */
import { readFileSync, readdirSync } from "node:fs";

const SETTINGS_VIEW = "apps/web/src/SettingsView.tsx";
const TABS_DIR = "apps/web/src/components/settings";

const viewSource = readFileSync(SETTINGS_VIEW, "utf8");

/** Локальные объявления верхнего уровня внутри функции компонента. */
const locals = new Set();
for (const match of viewSource.matchAll(/^  (?:const|let|function)\s+([A-Za-z_$][\w$]*)/gm)) {
	locals.add(match[1]);
}

/** Имена, которые читают вкладки из props. */
const wanted = new Map();
for (const file of readdirSync(TABS_DIR).filter((name) => name.endsWith(".tsx"))) {
	if (!new RegExp(`<${file.replace(/\.tsx$/, "")}[^>]*props`).test(viewSource)) continue;
	const source = readFileSync(`${TABS_DIR}/${file}`, "utf8");
	let destructureEnd = 0;
	const names = new Set();
	for (const match of source.matchAll(/const\s*\{([\s\S]*?)\}\s*=\s*(?:p|props)\s*;/g)) {
		destructureEnd = Math.max(destructureEnd, match.index + match[0].length);
		for (const name of match[1].matchAll(/(?:^|[,\s])([A-Za-z_$][\w$]*)\s*(?=[,:}]|$)/gm)) {
			names.add(name[1]);
		}
	}
	const body = source.slice(destructureEnd);
	for (const name of names) {
		if (!locals.has(name)) continue;
		const used = new RegExp(`(^|[^\\w$.])${name}([^\\w$]|$)`).test(body);
		if (!used) continue;
		if (!wanted.has(name)) wanted.set(name, []);
		wanted.get(name).push(file.replace(/\.tsx$/, ""));
	}
}

const names = [...wanted.keys()].sort();
console.log(`локальных значений SettingsView, которые читают вкладки: ${names.length}\n`);
console.log(names.join(",\n"));
