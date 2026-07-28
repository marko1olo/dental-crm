/**
 * Кто читает общий контекст, находясь вне провайдера.
 *
 * useAppLogicContext() при отсутствии провайдера возвращает `{} as
 * AppLogicContextType`. Это приведение обманывает компилятор: он видит полный
 * объект, а во время работы там пусто, и каждое разобранное поле равно
 * undefined. Ошибки нет, границы ошибок не срабатывают — виджет просто рисует
 * пустоту. Поймать такое типами невозможно по построению.
 *
 * AppLogicProvider в App.tsx обнимает только ветку настроек. Скрипт выясняет,
 * какие потребители контекста попадают на экран мимо настроек, то есть
 * гарантированно получают пустой объект.
 *
 * Только чтение: ничего не меняет.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, basename, extname } from "node:path";

const ROOT = "apps/web/src";

/** Все файлы исходников веб-приложения. */
function sources(dir) {
	const out = [];
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) {
			out.push(...sources(full));
			continue;
		}
		if ([".ts", ".tsx"].includes(extname(entry))) out.push(full);
	}
	return out;
}

const files = sources(ROOT);
const text = new Map(files.map((f) => [f, readFileSync(f, "utf8")]));

/** Потребители контекста. */
const consumers = files.filter((f) => /useAppLogicContext\s*\(/.test(text.get(f)));

/**
 * Ветка настроек: сам SettingsView, его вкладки и всё, что они втягивают.
 * Считаем замыканием по импортам, а не по имени папки.
 */
const settingsRoots = files.filter((f) => /Settings.*\.tsx$/.test(basename(f)));
const inSettings = new Set(settingsRoots);
let grew = true;
while (grew) {
	grew = false;
	for (const file of files) {
		if (!inSettings.has(file)) continue;
		const body = text.get(file);
		for (const candidate of files) {
			if (inSettings.has(candidate)) continue;
			const name = basename(candidate, extname(candidate));
			// Импорт по имени файла — в проекте пути всегда относительные.
			if (new RegExp(`from\\s+["'][^"']*\\/${name}["']`).test(body)) {
				inSettings.add(candidate);
				grew = true;
			}
		}
	}
}

/** Где компонент реально появляется в разметке. */
function renderSites(componentFile) {
	const name = basename(componentFile, extname(componentFile));
	const sites = [];
	for (const file of files) {
		if (file === componentFile) continue;
		const body = text.get(file);
		if (!new RegExp(`from\\s+["'][^"']*\\/${name}["']`).test(body)) continue;
		if (!new RegExp(`<${name}[\\s/>]`).test(body)) continue;
		sites.push(file);
	}
	return sites;
}

const outside = [];
const inside = [];
const unmounted = [];

for (const consumer of consumers) {
	const sites = renderSites(consumer);
	if (sites.length === 0) {
		unmounted.push(consumer);
		continue;
	}
	// Достаточно одной точки монтирования вне настроек, чтобы контекст был пуст.
	const outsideSites = sites.filter((s) => !inSettings.has(s));
	if (outsideSites.length > 0) outside.push([consumer, outsideSites]);
	else inside.push(consumer);
}

const short = (f) => relative(ROOT, f).replace(/\\/g, "/");

console.log(`потребителей контекста: ${consumers.length}`);
console.log(`  под настройками (контекст живой): ${inside.length}`);
console.log(`  вне настроек (контекст пуст): ${outside.length}`);
console.log(`  нигде не отрисованы: ${unmounted.length}`);

if (outside.length > 0) {
	console.log("\nчитают пустой контекст:");
	for (const [consumer, sites] of outside) {
		console.log(`  ${short(consumer)}  ←  ${sites.map(short).join(", ")}`);
	}
}
if (unmounted.length > 0) {
	console.log("\nнигде не отрисованы (мёртвый код или ошибка сборки экрана):");
	for (const file of unmounted) console.log(`  ${short(file)}`);
}
