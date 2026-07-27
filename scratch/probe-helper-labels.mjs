/**
 * Ищет компоненты, которые достают из мешка пропсов то, что на самом деле
 * является константой модуля SettingsViewHelpers.
 *
 * Такие имена в мешке не появляются никогда: они не приходят ни из контекста
 * логики, ни из хранилища, ни из производных. Компонент получает undefined, и
 * первое же обращение по ключу роняет отрисовку — так падала вкладка
 * «Источники» на `dicomRenderCachePriorityLabels[task.priority]`, где ключ
 * задачи равен «blocking».
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const HELPERS = "apps/web/src/components/settings/SettingsViewHelpers.tsx";
const ROOTS = ["apps/web/src/components/settings", "apps/web/src/components/workspace"];

const helperSource = readFileSync(HELPERS, "utf8");
const exported = new Set(
	[...helperSource.matchAll(/^export (?:const|function)\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]),
);
console.log(`SettingsViewHelpers экспортирует имён: ${exported.size}\n`);

function walk(dir, files = []) {
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) walk(full, files);
		else if (entry.endsWith(".tsx")) files.push(full);
	}
	return files;
}

let total = 0;
for (const root of ROOTS) {
	let files = [];
	try {
		files = walk(root);
	} catch {
		continue;
	}
	for (const file of files) {
		const source = readFileSync(file, "utf8");
		// Что компонент достаёт из мешка пропсов или из слияния источников.
		const bagNames = new Set();
		for (const match of source.matchAll(
			/const\s*\{([\s\S]*?)\}\s*=\s*(?:p|props|mergedProps)\s*;/g,
		)) {
			for (const name of match[1].matchAll(/(?:^|[,\s])([A-Za-z_$][\w$]*)\s*(?=[,:}]|$)/gm)) {
				bagNames.add(name[1]);
			}
		}
		if (bagNames.size === 0) continue;
		const imported = new Set(
			[...source.matchAll(/import\s*\{([^}]*)\}\s*from/g)]
				.flatMap((m) => m[1].split(","))
				.map((name) => name.trim().split(/\s+as\s+/)[0]),
		);
		const suspects = [...bagNames].filter((name) => exported.has(name) && !imported.has(name));
		if (suspects.length === 0) continue;
		total += suspects.length;
		console.log(`${file.replace(/\\/g, "/")}: ${suspects.length}`);
		for (const name of suspects.sort()) {
			const dangerous = new RegExp(`(^|[^\\w$.])${name}\\s*[[(.]`).test(source);
			console.log(`  ${dangerous ? "ПАДЕНИЕ" : "чтение "} ${name}`);
		}
	}
}
console.log(`\nвсего подозрительных имён: ${total}`);
