/**
 * panelsMountScanner.ts
 *
 * Утилиты проверки достижимости компонентов через AST-перепись @babel/parser.
 * Вынесено из panelsAreMounted.test.ts в рамках Мандатов 8b и 8zi.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
	componentReachability,
	isMounted,
	webSrcRoot,
} from "../utils/componentReachability.js";
import type { DeclaredUnmountedItem } from "./panelsMountExceptions.js";

/** Ключ компонента в переписи: путь от apps/web/src и имя объявления. */
export function keyOf(component: {
	readonly file: string;
	readonly name: string;
}): string {
	return `${component.file}:${component.name}`;
}

/** Чтение исходного файла относительно apps/web/src */
export function readSource(relativePath: string): string {
	return readFileSync(path.join(webSrcRoot, relativePath), "utf8");
}

/**
 * Исходник без комментариев.
 *
 * Снимаются блочные комментарии и строки, целиком занятые `//`; хвостовой `//`
 * после кода остаётся.
 */
export function sourceWithoutComments(relativePath: string): string {
	const stripped = readSource(relativePath)
		.replace(/\/\*[\s\S]*?\*\//g, "")
		.replace(/^[ \t]*\/\/.*$/gm, "");
	// Канарейка: если чистка съела код, страж обязан упасть, а не промолчать.
	assert.ok(
		stripped.includes("export"),
		`после снятия комментариев в ${relativePath} не осталось ни одного export — чистка сломана, ` +
			"и проверка на возврат мёртвого кода прошла бы, ничего не проверив",
	);
	return stripped;
}

/**
 * Реестр разделов читается из исходника, а не импортируется: страж обязан
 * работать и тогда, когда workspaceShell.tsx не собирается.
 */
export function registeredAppViews(): string[] {
	const source = readSource("workspaceShell.tsx");
	let declaration =
		/export const appViews = \[([^\]]*)\] as const;/.exec(source)?.[1] ?? "";
	if (!declaration) {
		const utilsSource = readSource("utils/routeUtils.ts");
		declaration =
			/export const appViews = \[([^\]]*)\] as const;/.exec(utilsSource)?.[1] ??
			"";
	}
	assert.ok(
		declaration,
		"В routeUtils.ts / workspaceShell.tsx не найдено объявление `export const appViews = [...] as const;` — " +
			"реестр разделов переехал или переименован, и этот страж больше ничего не охраняет",
	);
	const views = [...declaration.matchAll(/"([^"]+)"/g)].map(
		(match) => match[1] as string,
	);
	assert.ok(
		views.length >= 11,
		`реестр разделов разобран неполно: ${views.length} записей`,
	);
	return views;
}

/** Сбор множества всех заявленных и легаси ключей */
export function collectKnownKeys(
	declared: ReadonlyArray<DeclaredUnmountedItem>,
	legacy: readonly string[],
	modalShirms: readonly string[],
): Set<string> {
	const declaredKeys = declared.map((d) => keyOf({ file: d.file, name: d.name }));
	return new Set([...declaredKeys, ...legacy, ...modalShirms]);
}

/** Поиск компонентов, оставшихся несмонтированными незаявленно */
export function findUnmountedAppeared(
	census: ReturnType<typeof componentReachability>,
	knownKeys: Set<string>,
): string[] {
	const measured = census.verdicts.filter(
		(verdict) => !isMounted(verdict.state),
	);
	return measured
		.filter((verdict) => !knownKeys.has(keyOf(verdict)))
		.map(
			(verdict) =>
				`${verdict.file}:${verdict.line} ${verdict.name} [${verdict.state}] ${verdict.detail}`,
		)
		.sort();
}

/** Поиск устаревших записей заявленного долга */
export function findStaleKnownKeys(
	census: ReturnType<typeof componentReachability>,
	knownKeys: Set<string>,
): string[] {
	const measured = census.verdicts.filter(
		(verdict) => !isMounted(verdict.state),
	);
	const measuredKeys = new Set(measured.map(keyOf));
	return [...knownKeys].filter((key) => !measuredKeys.has(key)).sort();
}

/** Проверка отсутствия удаленных файлов в файловой системе */
export function assertFilesDoNotExist(
	files: readonly string[],
	basePath: string = webSrcRoot,
	reasonContext?: string,
): void {
	for (const removed of files) {
		assert.equal(
			existsSync(path.join(basePath, removed)),
			false,
			`${removed} вернулся в дерево. ${reasonContext ?? "Модуль ликвидирован per Mandate 8s; используйте канонический SSOT."}`,
		);
	}
}

/** Проверка наличия обязательных файлов в файловой системе */
export function assertFilesExist(
	files: readonly string[],
	basePath: string = webSrcRoot,
	message?: string,
): void {
	for (const expected of files) {
		assert.equal(
			existsSync(path.join(basePath, expected)),
			true,
			message ?? `Файл ${expected} обязан присутствовать в дереве`,
		);
	}
}
