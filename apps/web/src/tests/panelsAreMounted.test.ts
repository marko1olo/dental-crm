import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

/**
 * Страж: панель, которую никто не отрисовывает, — это несделанная работа.
 *
 * ЧТО СЛУЧИЛОСЬ. Панель утреннего обзвона и панель отчётов руководителю были
 * добавлены в AppRouter.tsx. Файл выглядит как маршрутизатор приложения:
 * импортирует представления, переключает их по currentView, лежит рядом с
 * App.tsx. Его НИКТО НЕ ИМПОРТИРУЕТ — разделы отрисовывает App.tsx.
 *
 * Обе панели прошли typecheck, прошли сборку, прошли тесты оформления — и не
 * появлялись на экране вообще. Выяснилось это только на снимке живого
 * приложения, то есть могло не выясниться никогда.
 *
 * Тест ниже дешёвый и текстовый: он проверяет, что каждая панель упомянута в
 * модуле, до которого действительно доходит выполнение от main.tsx.
 */

const webSrc = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Панели верхнего уровня и место, где они обязаны быть отрисованы. */
const MOUNTED_PANELS = [
	{ component: "DayConfirmationsPanel", file: "components/schedule/DayConfirmationsPanel.tsx" },
	{ component: "ManagerReportsPanel", file: "components/reports/ManagerReportsPanel.tsx" },
	{ component: "MessageDeliveryConsole", file: "components/communications/MessageDeliveryConsole.tsx" },
	{ component: "CampaignPanel", file: "components/communications/CampaignPanel.tsx" }
];

function readSource(relativePath: string): string {
	return readFileSync(path.join(webSrc, relativePath), "utf8");
}

/** Все .ts/.tsx исходники приложения, кроме тестов. */
function collectSources(directory = webSrc, collected: string[] = []): string[] {
	for (const entry of readdirSync(directory)) {
		const full = path.join(directory, entry);
		if (statSync(full).isDirectory()) {
			if (entry === "tests" || entry === "__tests__" || entry === "node_modules") continue;
			collectSources(full, collected);
			continue;
		}
		if (/\.(ts|tsx)$/.test(entry) && !/\.test\.tsx?$/.test(entry)) collected.push(full);
	}
	return collected;
}

/**
 * Модули, до которых доходит выполнение от main.tsx. Обход по строкам импорта:
 * полноценного разбора здесь не нужно, а связность файлов он показывает.
 */
function reachableFromEntry(): Set<string> {
	const sources = collectSources();
	const byBaseName = new Map<string, string>();
	for (const file of sources) {
		byBaseName.set(path.basename(file).replace(/\.tsx?$/, ""), file);
	}

	const reachable = new Set<string>();
	const queue = [path.join(webSrc, "main.tsx")];

	while (queue.length > 0) {
		const current = queue.pop();
		if (!current || reachable.has(current)) continue;
		reachable.add(current);

		let source: string;
		try {
			source = readFileSync(current, "utf8");
		} catch {
			continue;
		}

		// Статические импорты и ленивые import("...") — обе формы в проекте есть.
		for (const match of source.matchAll(/from\s+["'](\.[^"']+)["']|import\(\s*["'](\.[^"']+)["']\s*\)/g)) {
			const specifier = match[1] ?? match[2];
			if (!specifier) continue;
			const base = path.basename(specifier).replace(/\.(js|jsx|ts|tsx)$/, "");
			const resolved = byBaseName.get(base);
			if (resolved && !reachable.has(resolved)) queue.push(resolved);
		}
	}

	return reachable;
}

test("каждая рабочая панель отрисовывается из живого модуля", () => {
	const reachable = reachableFromEntry();
	const reachableNames = new Set([...reachable].map((file) => path.basename(file)));

	for (const panel of MOUNTED_PANELS) {
		// Сам файл панели должен быть достижим от точки входа.
		assert.ok(
			reachableNames.has(path.basename(panel.file)),
			`${panel.component}: файл не достижим от main.tsx — панель не попадёт на экран`,
		);

		// И кто-то из достижимых модулей должен её действительно отрисовывать.
		const renderers = [...reachable].filter((file) => {
			if (path.basename(file) === path.basename(panel.file)) return false;
			const source = readFileSync(file, "utf8");
			return source.includes(`<${panel.component}`);
		});

		assert.ok(
			renderers.length > 0,
			`${panel.component}: ни один достижимый модуль не содержит <${panel.component} />. ` +
				"Панель добавлена в файл, который никто не импортирует.",
		);
	}
});

test("AppRouter.tsx помечен как мёртвый, пока его никто не импортирует", () => {
	const reachable = reachableFromEntry();
	const reachableNames = new Set([...reachable].map((file) => path.basename(file)));
	const source = readSource("AppRouter.tsx");

	if (reachableNames.has("AppRouter.tsx")) {
		// Файл ожил — предупреждение в шапке пора убрать, иначе оно врёт.
		assert.equal(
			source.includes("МЁРТВЫЙ ФАЙЛ"),
			false,
			"AppRouter.tsx снова используется: уберите пометку о мёртвом файле",
		);
		return;
	}

	assert.ok(
		source.includes("МЁРТВЫЙ ФАЙЛ"),
		"AppRouter.tsx никем не импортируется — в шапке должно стоять предупреждение, " +
			"иначе следующий добавит туда компонент и он не отрисуется",
	);
});
