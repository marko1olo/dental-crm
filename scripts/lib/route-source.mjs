/**
 * route-source.mjs — полный текст маршрута, расщеплённого на каталог модулей.
 *
 * ЗАЧЕМ. Проверки исходников читают файл маршрута и ищут в нём требования:
 * текст отказа оператору, код ошибки, защиту. Это работало, пока маршрут был
 * одним файлом.
 *
 * Замерено 2026-08-10: `apps/api/src/routes/documents.ts` — теперь СБОРНИК на
 * 24 строки, который только импортирует и регистрирует девять модулей из
 * `routes/documents/` общим объёмом 2662 строки:
 *
 *     export * from "./documents/shared.js";
 *     export async function registerDocumentRoutes(app) {
 *         await registerCreate(app); await registerIssue(app); …
 *     }
 *
 * Тело маршрутов уехало, а стражи продолжают читать сборник. Отсюда красные
 * проверки при ЦЕЛОМ продукте: например `smoke-documents-view-source` требовал
 * текст «Укажите путь к браузеру в серверных настройках.» — он жив и стоит в
 * `routes/documents/shared.ts:139`, просто не в том файле, куда смотрел страж.
 *
 * Это тот же класс, ради которого на клиентской стороне написан
 * `app-logic-source.mjs`: код ПЕРЕЕХАЛ, а не сломался, и проверка обязана
 * следовать за ним, иначе настоящие регрессии тонут в ложной красноте.
 *
 * ЧЕГО ЗДЕСЬ НАМЕРЕННО НЕТ. Модуль не «склеивает всё подряд»: берётся только
 * сам файл маршрута и каталог с тем же именем рядом с ним. Проверке, которой
 * важен именно сборник (например, что он ничего не регистрирует сам), следует
 * читать файл напрямую, а не через этот модуль.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

/**
 * Файлы, из которых складывается маршрут: сам файл плюс одноимённый каталог.
 *
 * @param {string} routeFile Путь к файлу маршрута, например
 *   `apps/api/src/routes/documents.ts`.
 * @returns {string[]} Пути, отсортированные по имени — порядок устойчив между
 *   запусками, иначе смещения в тексте плясали бы от прогона к прогону.
 */
export function routeSourceFiles(routeFile) {
	const files = existsSync(routeFile) ? [routeFile] : [];
	const dir = routeFile.replace(/\.tsx?$/, "");
	if (existsSync(dir) && statSync(dir).isDirectory()) {
		files.push(
			...readdirSync(dir)
				.filter((name) => /\.tsx?$/.test(name))
				.sort()
				.map((name) => path.join(dir, name)),
		);
	}
	return files;
}

/**
 * Текст маршрута целиком: сборник плюс все его модули.
 *
 * @param {string} routeFile Путь к файлу маршрута.
 * @returns {string} Склейка через перевод строки; переводы строк нормализованы,
 *   иначе выражения с `\s*` ведут себя по-разному на CRLF и LF.
 * @throws {Error} Если не найдено ни одного файла — молчаливая пустая строка
 *   здесь опаснее отказа: `forbidIn` по ней проходит и охраняет ничто.
 */
export function readRouteSourceSync(routeFile) {
	const files = routeSourceFiles(routeFile);
	if (files.length === 0)
		throw new Error(
			`Не найден ни сам «${routeFile}», ни каталог его модулей рядом. ` +
				"Проверка не может сверяться с пустотой и обязана упасть.",
		);
	return files
		.map((file) => readFileSync(file, "utf8"))
		.join("\n")
		.replace(/\r\n/g, "\n");
}
