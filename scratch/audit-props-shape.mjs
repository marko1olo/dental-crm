/**
 * Ищет несовпадение формы пропсов между объявлением компонента и его вызовом.
 *
 * Так не открывались вкладки «Импорт» и «Аудит»: компонент объявлен как
 * `function Tab(props: Record<string, any>)` и достаёт значения прямо из
 * `props`, а вызывали его как `<Tab props={bag} />` — то есть всё лежало на
 * уровень глубже, и первое же обращение к полю роняло отрисовку.
 *
 * Проверка статическая: сопоставляет два вида объявления с двумя видами
 * вызова. Ошибка первого рода возможна, поэтому каждая находка печатается с
 * местом, чтобы её можно было посмотреть глазами.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = "apps/web/src";
const SKIP = new Set(["node_modules", "dist", "tests", "__snapshots__"]);

function walk(dir, files = []) {
	for (const entry of readdirSync(dir)) {
		if (SKIP.has(entry)) continue;
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) walk(full, files);
		else if (full.endsWith(".tsx")) files.push(full);
	}
	return files;
}

const files = walk(ROOT);

/** Как компонент объявлен: ждёт мешок целиком или обёртку `{ props }`. */
const declarations = new Map();
for (const file of files) {
	const source = readFileSync(file, "utf8");
	for (const match of source.matchAll(
		/export function ([A-Z][\w$]*)\s*\(\s*(\{[^)]*\}|props)\s*:?[^)]*\)/g,
	)) {
		const [, name, signature] = match;
		const wantsWrapper = /\bprops\s*[=,:}]/.test(signature) && signature.startsWith("{");
		const wantsBagDirectly = signature === "props";
		if (!wantsWrapper && !wantsBagDirectly) continue;
		// Достаёт ли значения из props/p — иначе форма неважна.
		const usesBag = /const\s*\{[\s\S]*?\}\s*=\s*(?:p|props)\s*;/.test(source);
		if (!usesBag) continue;
		declarations.set(name, {
			file: relative(process.cwd(), file).replace(/\\/g, "/"),
			shape: wantsBagDirectly ? "прямой мешок" : "обёртка { props }",
		});
	}
}

const problems = [];
for (const file of files) {
	const source = readFileSync(file, "utf8");
	const lines = source.split(/\r?\n/);
	lines.forEach((line, index) => {
		for (const match of line.matchAll(/<([A-Z][\w$]*)\s+([^>]*)/g)) {
			const [, name, attributes] = match;
			const declaration = declarations.get(name);
			if (!declaration) continue;
			const passesWrapper = /(^|\s)props=\{/.test(attributes);
			const passesSpread = /\{\.\.\./.test(attributes);
			if (declaration.shape === "прямой мешок" && passesWrapper && !passesSpread) {
				problems.push({
					name,
					declaredIn: declaration.file,
					shape: declaration.shape,
					calledIn: `${relative(process.cwd(), file).replace(/\\/g, "/")}:${index + 1}`,
					passed: "props={…}",
				});
			}
			if (declaration.shape === "обёртка { props }" && passesSpread && !passesWrapper) {
				problems.push({
					name,
					declaredIn: declaration.file,
					shape: declaration.shape,
					calledIn: `${relative(process.cwd(), file).replace(/\\/g, "/")}:${index + 1}`,
					passed: "{...мешок}",
				});
			}
		}
	});
}

console.log(`компонентов, читающих мешок пропсов: ${declarations.size}`);
console.log(`несовпадений формы: ${problems.length}\n`);
for (const problem of problems) {
	console.log(`  ${problem.name}: объявлен как «${problem.shape}» (${problem.declaredIn})`);
	console.log(`      вызван с ${problem.passed} — ${problem.calledIn}`);
}
if (problems.length > 0) process.exit(1);
