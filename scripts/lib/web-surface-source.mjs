/**
 * web-surface-source.mjs — полный текст поверхности разметки, разобранной на
 * каталог компонентов.
 *
 * ЗАЧЕМ. Стражи доступности читают файл-экран и ищут в нём разметку: атрибут
 * состояния выбора, роль, обход клавиатурой. Это работало, пока экран был одним
 * файлом.
 *
 * ЗАМЕРЕНО 2026-08-10. `smoke-segmented-controls-accessibility-source` падал с
 * кодом 2 и печатал «СЛОМАН ЖИВОЙ ЛОК (19)» — то есть заявлял РЕГРЕССИЮ
 * ДОСТУПНОСТИ по 19 требованиям. Проверка всех 19 поимённо по всему
 * `apps/web/src` (399 файлов, с вырезкой комментариев тем же `codeOnly`):
 *
 *   17 из 19 — разметка ЖИВА ДОСЛОВНО и смонтирована, но в файлах, которых
 *              страж не читает: `components/onboarding/` (2 файла) и
 *              `components/settings/` (46 файлов);
 *    2 из 19 — жива там же, но форматтер перенёс выражение на три строки
 *              (`aria-current={\n step.id === onboardingStep ? …`), поэтому
 *              односрочный `.includes()` её не видел.
 *
 * НИ ОДНОЙ настоящей потери доступности среди 19 не было. Онбординг вынесен в
 * `components/onboarding/` (смонтирован: App.tsx:1451 и App.tsx:1719), вкладки
 * настроек — в `components/settings/` (смонтированы через SettingsImportsTab и
 * SettingsSourcesTab). Код ПЕРЕЕХАЛ, а не сломался.
 *
 * Это тот же класс, ради которого написаны `app-logic-source.mjs` (логика уехала
 * в `hooks/domains/*`) и `route-source.mjs` (маршрут расщеплён на каталог).
 * Страж обязан следовать за кодом, иначе настоящие регрессии тонут в ложной
 * красноте: 19 фальшивых «регрессий доступности» надёжно прячут одну настоящую.
 *
 * ЧЕГО ЗДЕСЬ НАМЕРЕННО НЕТ. Модуль не склеивает `apps/web/src` целиком. Он
 * берёт ровно указанный каталог, и только файлы разметки. Требование, которому
 * важен конкретный файл (например, предел его размера), обязано читать этот файл
 * напрямую, а не через модуль: иначе «этот экран не разросся» будет
 * доказываться суммой чужих строк.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

/**
 * Файлы разметки внутри каталога поверхности, рекурсивно.
 *
 * @param {string} dir Каталог, например `apps/web/src/components/settings`.
 * @returns {string[]} Пути, отсортированные по имени — порядок устойчив между
 *   запусками, иначе смещения в склеенном тексте плясали бы от прогона к
 *   прогону. Тесты исключены: они не продукт, и разметка из теста не должна
 *   выполнять требование к продукту.
 */
export function webSurfaceFiles(dir) {
	if (!existsSync(dir) || !statSync(dir).isDirectory()) return [];
	const found = [];
	for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
		a.name.localeCompare(b.name),
	)) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			found.push(...webSurfaceFiles(full));
			continue;
		}
		if (!/\.tsx?$/.test(entry.name)) continue;
		if (/\.test\.|\.spec\./.test(entry.name)) continue;
		found.push(full);
	}
	return found;
}

/**
 * Текст поверхности целиком: перечисленные файлы плюс все файлы их каталогов.
 *
 * @param {string[]} entries Файлы и/или каталоги в любом порядке.
 * @returns {string} Склейка через перевод строки; переводы строк нормализованы,
 *   иначе образцы с `\s*` ведут себя по-разному на CRLF и LF.
 * @throws {Error} Если не найдено ни одного файла — молчаливая пустая строка
 *   здесь опаснее отказа: проверка «этой разметки нет» по пустоте проходит
 *   ВСЕГДА и охраняет ничто.
 */
export function readWebSurfaceSourceSync(entries) {
	const files = [];
	for (const entry of entries) {
		if (existsSync(entry) && statSync(entry).isDirectory()) {
			files.push(...webSurfaceFiles(entry));
			continue;
		}
		if (existsSync(entry)) files.push(entry);
	}
	if (files.length === 0)
		throw new Error(
			`Не найдено ни одного файла разметки среди: ${entries.join(", ")}. ` +
				"Проверка не может сверяться с пустотой и обязана упасть.",
		);
	return files
		.map((file) => readFileSync(file, "utf8"))
		.join("\n")
		.replace(/\r\n/g, "\n");
}
