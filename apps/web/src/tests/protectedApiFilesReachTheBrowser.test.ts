import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

/**
 * ДОСТИЖИМОСТЬ ФАЙЛОВ ЗАЩИЩЁННОГО API: ЗАПРОС ДОЛЖЕН НЕСТИ ТОКЕН.
 *
 * Запуск: из apps/web
 *   node --import tsx --test src/tests/protectedApiFilesReachTheBrowser.test.ts
 *
 * ЧТО БЫЛО ПЛОХО ДЛЯ КЛИНИКИ (два места, один дефект).
 *
 *  1. ФОТОГРАФИИ ЛЕЧЕНИЯ. Дневник приёма подставлял адрес вложения прямо в
 *     разметку: `<img src="/api/attachments/<id>/download">` и ссылку «увеличить»
 *     на тот же адрес (components/VisitDiaryPhotoUpload.tsx). Такой запрос
 *     отправляет БРАУЗЕР, а не fetch, и заголовков у него нет вовсе — подмена
 *     window.fetch из lib/apiAuthFetch.ts к разметке не относится. Сервер
 *     вложений требует токен кабинета, то есть отвечал 401. Врач прикреплял
 *     снимки, читал подтверждение «Фото сжато в WebP и загружено» — и на месте
 *     фотографий навсегда оставались значки битых картинок. Замер до починки,
 *     apps/api/src/tests/routes/protectedApiFileDownloadsNeedToken.test.ts:
 *     запрос как из <img> → 401 AuthRequired, тот же адрес через fetch с токеном
 *     доходит до обработчика.
 *
 *  2. АКТ СВЕРКИ ПЕРЕНОСА БАЗЫ. `<a href="/api/migration/<прогон>/reconciliation.csv"
 *     download>` в components/settings/MigrationWizard.tsx — то же самое. Акт
 *     сверки это единственный документ, по которому клиника проверяет, что
 *     перенос из старой программы сошёлся по деньгам и по числу карточек. Сервер
 *     собирал его целиком, вместе с BOM для русского Excel; администратор
 *     получал страницу ошибки.
 *
 * ЧТО ИМЕННО ЗДЕСЬ ПРОВЕРЯЕТСЯ — СВЯЗЬ, А НЕ СУЩЕСТВОВАНИЕ ФУНКЦИЙ:
 *  • адрес, который ОТДАЁТ сервер в поле url, — тот самый, который просит
 *    клиент (шаблон вынимается из apps/api/src/routes/files.ts, не из памяти);
 *  • этот адрес по правилам lib/apiAuthFetch.ts ТРЕБУЕТ токен, значит запрос из
 *    разметки заведомо не пройдёт;
 *  • ни один компонент apps/web/src больше не подставляет такой адрес в src/href;
 *  • клиент действительно запрашивает его через fetch и превращает ответ в
 *    объектный адрес — иначе картинке нечего показывать.
 */

const here = dirname(fileURLToPath(import.meta.url));
const webSrc = join(here, "..");
const repoRoot = join(webSrc, "..", "..", "..");
const readWeb = (relativePath: string) =>
	readFileSync(join(webSrc, relativePath), "utf8");
const readApi = (relativePath: string) =>
	readFileSync(join(repoRoot, "apps", "api", "src", relativePath), "utf8");

/** Модуль читает window.location.origin — в Node нужен минимальный стенд. */
before(() => {
	const globalWithWindow = globalThis as { window?: unknown };
	if (typeof globalWithWindow.window === "undefined") {
		globalWithWindow.window = {
			location: { origin: "https://crm.example.ru" },
			localStorage: { getItem: () => null, setItem: () => {} },
		};
	}
});

/**
 * Адреса файлов, которые сервер публикует клиенту в поле `url`. Вынимаются из
 * живого исходника маршрутов: если сервер переименует адрес, тест обязан
 * говорить о НОВОМ адресе, а не о том, который был на момент починки.
 */
function publishedFileUrlTemplates(): string[] {
	const filesRoute = readApi(join("routes", "files.ts"));
	const templates = [...filesRoute.matchAll(/url:\s*`([^`]+)`/g)].map(
		(match) => match[1] ?? "",
	);
	assert.ok(
		templates.length >= 2,
		"apps/api/src/routes/files.ts больше не публикует адрес вложения в поле url — " +
			"проверка связи потеряла свой предмет и должна быть переписана под новый способ.",
	);
	return templates;
}

/** `/api/attachments/${a.id}/download` → `/api/attachments/<id>/download`. */
function concreteAddress(template: string): string {
	return template.replace(
		/\$\{[^}]+\}/g,
		"00000000-0000-4000-8000-000000000001",
	);
}

/**
 * Код без комментариев. Порядок тот же, что в documentsViewDecomposition.test.ts,
 * и по той же причине: строчные комментарии снимаются раньше блочных, иначе
 * последовательность `/*` внутри строчного комментария съедает живой код до
 * ближайшей закрывающей. Без этого шага проверка краснела на разборе дефекта,
 * записанном в комментарии, — то есть на собственном объяснении.
 */
function withoutComments(source: string): string {
	return source
		.split(/\r?\n/)
		.filter(
			(line) =>
				!line.trimStart().startsWith("//") && !line.trimStart().startsWith("*"),
		)
		.join("\n")
		.replace(/\/\*[\s\S]*?\*\//g, " ");
}

function webSourceFiles(): string[] {
	const found: string[] = [];
	const walk = (dir: string) => {
		for (const entry of readdirSync(dir)) {
			const full = join(dir, entry);
			if (statSync(full).isDirectory()) {
				if (entry === "tests" || entry === "node_modules") continue;
				walk(full);
				continue;
			}
			if (/\.tsx?$/.test(entry)) found.push(full);
		}
	};
	walk(webSrc);
	return found;
}

describe("файлы защищённого API доходят до экрана только через fetch с токеном", () => {
	it("адрес, который сервер публикует в поле url, требует токен кабинета", async () => {
		// Это и есть причина дефекта: адрес закрыт авторизацией, а разметка
		// авторизоваться не умеет. Если правило когда-нибудь изменится и адрес
		// станет публичным, красный тест заставит перечитать эту связь заново.
		const { shouldAttachApiAuth } = await import("../lib/apiAuthFetch.js");
		for (const template of publishedFileUrlTemplates()) {
			const address = concreteAddress(template);
			assert.equal(
				shouldAttachApiAuth(address),
				true,
				`${address}: адрес вложения перестал требовать токен — перечитайте разбор в lib/authedApiFile.ts`,
			);
		}
		assert.equal(
			shouldAttachApiAuth(
				"/api/migration/00000000-0000-4000-8000-000000000001/reconciliation.csv",
			),
			true,
		);
	});

	it("ни один компонент не подставляет адрес защищённого API в src или href", async () => {
		const { shouldAttachApiAuth } = await import("../lib/apiAuthFetch.js");
		// Ровно то место, где дефект жил: атрибут разметки, по которому запрос
		// уходит от браузера без заголовков.
		const attributePattern =
			/\b(?:src|href)=\{?[`"']([^`"'{}]*\/api\/[^`"'{}]*)[`"']?/g;
		const offenders: string[] = [];

		for (const file of webSourceFiles()) {
			const source = withoutComments(readFileSync(file, "utf8"));
			for (const match of source.matchAll(attributePattern)) {
				const raw = match[1] ?? "";
				const address = concreteAddress(raw.replace(/\$\{[^}]*\}/g, "x"));
				if (!address.includes("/api/")) continue;
				if (!shouldAttachApiAuth(address)) continue;
				offenders.push(`${relative(webSrc, file)}: ${raw}`);
			}
		}

		assert.deepEqual(
			offenders,
			[],
			"адрес защищённого API снова подставлен в разметку. Браузер отправит такой запрос " +
				"без токена кабинета и получит 401: врач увидит битую картинку, администратор — " +
				"страницу ошибки вместо файла. Забирайте файл через lib/authedApiFile.ts.\n" +
				offenders.join("\n"),
		);
	});

	it("клиент просит у сервера ровно тот адрес и превращает ответ в объектный адрес", async () => {
		const { fetchAuthedApiFileObjectUrl } = await import(
			"../lib/authedApiFile.js"
		);
		const published = concreteAddress(publishedFileUrlTemplates()[0] ?? "");
		const asked: string[] = [];

		const objectUrl = await fetchAuthedApiFileObjectUrl(published, {
			fetchImpl: (async (input: RequestInfo | URL) => {
				asked.push(String(input));
				return {
					ok: true,
					status: 200,
					blob: async () => "снимок-как-блоб",
				} as unknown as Response;
			}) as typeof fetch,
			createObjectUrl: (blob) => `blob:proof/${String(blob)}`,
			revokeObjectUrl: () => {},
		});

		assert.deepEqual(asked, [published]);
		assert.equal(objectUrl, "blob:proof/снимок-как-блоб");
	});

	it("отказ сервера превращается в русский текст, а не в тихую битую картинку", async () => {
		const { AUTHED_API_FILE_FAILURE, fetchAuthedApiFileObjectUrl } =
			await import("../lib/authedApiFile.js");

		await assert.rejects(
			() =>
				fetchAuthedApiFileObjectUrl(
					"/api/attachments/00000000-0000-4000-8000-000000000001/download",
					{
						fetchImpl: (async () =>
							({
								ok: false,
								status: 401,
							}) as unknown as Response) as typeof fetch,
						createObjectUrl: () => "blob:не-должно-случиться",
						revokeObjectUrl: () => {},
					},
				),
			(error: unknown) =>
				error instanceof Error &&
				error.message.startsWith(AUTHED_API_FILE_FAILURE) &&
				error.message.includes("401"),
		);
	});

	it("скачивание акта сверки идёт через fetch и клик по объектному адресу", async () => {
		const { downloadAuthedApiFile } = await import("../lib/authedApiFile.js");
		const asked: string[] = [];
		const clicked: Array<{ href: string; download: string }> = [];
		const anchor = {
			href: "",
			download: "",
			click() {
				clicked.push({ href: this.href, download: this.download });
			},
			remove() {},
		};

		const objectUrl = await downloadAuthedApiFile(
			"/api/migration/00000000-0000-4000-8000-000000000001/reconciliation.csv",
			"акт-сверки.csv",
			{
				fetchImpl: (async (input: RequestInfo | URL) => {
					asked.push(String(input));
					return {
						ok: true,
						status: 200,
						blob: async () => "csv",
					} as unknown as Response;
				}) as typeof fetch,
				createObjectUrl: () => "blob:proof/csv",
				revokeObjectUrl: () => {},
			},
			{
				createElement: () => anchor as unknown as HTMLAnchorElement,
				body: { appendChild: () => {} },
			} as unknown as Pick<Document, "createElement" | "body">,
		);

		assert.deepEqual(asked, [
			"/api/migration/00000000-0000-4000-8000-000000000001/reconciliation.csv",
		]);
		assert.deepEqual(clicked, [
			{ href: "blob:proof/csv", download: "акт-сверки.csv" },
		]);
		assert.equal(objectUrl, "blob:proof/csv");
	});

	it("дневник приёма рисует объектный адрес, а акт сверки скачивается кнопкой", () => {
		// Место ОТРИСОВКИ: ответ должен доходить до экрана, а не только до памяти.
		const photoUpload = readWeb(
			join("components", "VisitDiaryPhotoUpload.tsx"),
		);
		assert.match(photoUpload, /fetchAuthedApiFileObjectUrl\(attachment\.url\)/);
		assert.match(photoUpload, /src=\{objectUrl\}/);
		assert.match(
			photoUpload,
			/revokeObjectURL/,
			"объектные адреса снимков не освобождаются: рабочее место будет держать в памяти " +
				"копию каждого снимка каждого открытого за смену приёма.",
		);

		const wizard = readWeb(
			join("components", "settings", "MigrationWizard.tsx"),
		);
		assert.match(wizard, /downloadAuthedApiFile\(/);
		assert.match(wizard, /reconciliation\.csv/);
	});
});
