/**
 * Уточнение к audit-settings-props: какие из непереданных имён вкладка реально
 * использует, а какие просто перечислены в деструктуризации и нигде не
 * встречаются.
 *
 * Вкладки настроек вынесены копированием тела SettingsView, поэтому в списке
 * деструктуризации осталось много имён, к которым обращений нет. Такое имя
 * получает undefined и никого не роняет. Чинить надо те, что действительно
 * читаются — их и печатаем, отдельно отмечая обращения по ключу и вызовы,
 * потому что именно они дают падение.
 */
import { readFileSync, readdirSync } from "node:fs";

const SETTINGS_VIEW = "apps/web/src/SettingsView.tsx";
const TABS_DIR = "apps/web/src/components/settings";
const TARGET = process.argv[2] ?? null;

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
	const keys = new Set();
	for (const match of source.slice(open + 1, end).matchAll(/(?:^|[,{\s])([A-Za-z_$][\w$]*)\s*(?=[,:}])/g)) {
		keys.add(match[1]);
	}
	return keys;
}

const viewSource = readFileSync(SETTINGS_VIEW, "utf8");
const provided = new Set([
	...objectLiteralKeys(viewSource, "const settingsProps"),
	...objectLiteralKeys(viewSource, "const settingsClinicExtraProps"),
]);

const files = readdirSync(TABS_DIR).filter(
	(name) =>
		name.endsWith(".tsx") &&
		(!TARGET || name === TARGET) &&
		new RegExp(`<${name.replace(/\.tsx$/, "")}[^>]*props`).test(viewSource),
);

for (const file of files.sort()) {
	const source = readFileSync(`${TABS_DIR}/${file}`, "utf8");
	const destructured = new Set();
	let destructureEnd = 0;
	for (const match of source.matchAll(/const\s*\{([\s\S]*?)\}\s*=\s*(?:p|props)\s*;/g)) {
		destructureEnd = Math.max(destructureEnd, match.index + match[0].length);
		for (const name of match[1].matchAll(/(?:^|[,\s])([A-Za-z_$][\w$]*)\s*(?=[,:}]|$)/gm)) {
			destructured.add(name[1]);
		}
	}
	if (destructured.size === 0) continue;

	const body = source.slice(destructureEnd);
	const missingUsed = [];
	for (const name of destructured) {
		if (provided.has(name)) continue;
		const uses = body.match(new RegExp(`(^|[^\\w$.])${name}([^\\w$]|$)`, "g")) ?? [];
		if (uses.length === 0) continue;
		// Обращение по ключу и вызов роняют отрисовку сразу; чтение — нет.
		const dangerous = new RegExp(`(^|[^\\w$.])${name}\\s*[[(.]`, "m").test(body);
		missingUsed.push({ name, uses: uses.length, dangerous });
	}

	missingUsed.sort((a, b) => Number(b.dangerous) - Number(a.dangerous) || b.uses - a.uses);
	const dangerousCount = missingUsed.filter((item) => item.dangerous).length;
	console.log(
		`\n${file}: перечислено ${destructured.size}, не передано и используется ${missingUsed.length}, ` +
			`из них роняют отрисовку ${dangerousCount}`,
	);
	for (const item of missingUsed) {
		console.log(`  ${item.dangerous ? "ПАДЕНИЕ" : "чтение "} ${item.name} (обращений ${item.uses})`);
	}
}
