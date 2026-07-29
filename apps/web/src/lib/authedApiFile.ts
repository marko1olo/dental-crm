/**
 * authedApiFile.ts — получение файлов защищённого API так, чтобы токен кабинета
 * действительно попал в запрос.
 *
 * ЧТО БЫЛО ПЛОХО ДЛЯ КЛИНИКИ. Адрес файла подставлялся прямо в разметку —
 * `<img src="/api/attachments/<id>/download">` в дневнике приёма и
 * `<a href="/api/migration/<прогон>/reconciliation.csv" download>` в переносе базы.
 * Такой запрос отправляет БРАУЗЕР, а не `fetch`, и заголовков у него нет вовсе:
 * обёртка lib/apiAuthFetch.ts подменяет `window.fetch` и к разметке не относится.
 * Сервер обоих адресов требует токен кабинета
 * (accessGuard.requireResolvedOrganizationId / requireClinicalReadContext), то
 * есть отвечал `401 AuthRequired`. Врач прикреплял фотографии лечения, видел
 * подтверждение «Фото сжато в WebP и загружено» — и на месте снимков навсегда
 * оставались значки битых картинок; администратор нажимал «Скачать акт сверки»
 * после переноса базы и получал страницу ошибки вместо акта. Оба серверных
 * маршрута при этом дописаны до конца: отбор по организации, поток файла с
 * Content-Disposition, CSV с BOM для русского Excel.
 *
 * ПОЧЕМУ ИМЕННО ТАК. Файл забирается через `window.fetch` — то есть через
 * обёртку, которая уже умеет подставлять оба токена ровно тем маршрутам, которым
 * они нужны (shouldAttachApiAuth). Полученный ответ превращается в объектный
 * адрес `blob:`, и уже он идёт в разметку: браузеру не нужно ни авторизации, ни
 * повторного запроса. Никакой второй схемы авторизации (cookie, токен в адресе)
 * не заводится — она была бы третьим способом сказать серверу, кто мы.
 *
 * ЗАВИСИМОСТИ ВНЕДРЯЮТСЯ (`deps`), потому что `URL.createObjectURL` и `document`
 * в Node отсутствуют, а связь «клиент просит тот адрес, который отдал сервер»
 * обязана проверяться тестом без браузера.
 */

export type AuthedApiFileDeps = {
	readonly fetchImpl: typeof fetch;
	readonly createObjectUrl: (blob: Blob) => string;
	readonly revokeObjectUrl: (url: string) => void;
};

/** Русский текст ошибки: он попадает на экран врача, а не в консоль. */
export const AUTHED_API_FILE_FAILURE = "Файл не открылся: сервер не отдал его этому кабинету.";

function browserDeps(): AuthedApiFileDeps {
	return {
		// Именно window.fetch, а не голый fetch: подмена из installApiAuthFetch()
		// живёт на window, и обращение в обход неё снова осталось бы без токена.
		fetchImpl: (input, init) => window.fetch(input, init),
		createObjectUrl: (blob) => URL.createObjectURL(blob),
		revokeObjectUrl: (url) => {
			URL.revokeObjectURL(url);
		},
	};
}

/**
 * Забирает файл по адресу защищённого API и отдаёт объектный адрес для разметки.
 * Бросает с русским текстом, если сервер отказал: тихий провал вернул бы врача к
 * тем же битым картинкам, только без объяснения.
 */
export async function fetchAuthedApiFileObjectUrl(
	apiUrl: string,
	deps: AuthedApiFileDeps = browserDeps(),
	init?: RequestInit,
): Promise<string> {
	const response = await deps.fetchImpl(apiUrl, init);
	if (!response.ok) {
		throw new Error(`${AUTHED_API_FILE_FAILURE} (${response.status})`);
	}
	return deps.createObjectUrl(await response.blob());
}

/**
 * Скачивание файла защищённого API: тот же запрос через fetch, затем клик по
 * временной ссылке на объектный адрес. Возвращает объектный адрес, чтобы
 * вызывающий мог его освободить.
 */
export async function downloadAuthedApiFile(
	apiUrl: string,
	fileName: string,
	deps: AuthedApiFileDeps = browserDeps(),
	anchorHost: Pick<Document, "createElement" | "body"> = document,
): Promise<string> {
	const objectUrl = await fetchAuthedApiFileObjectUrl(apiUrl, deps);
	const anchor = anchorHost.createElement("a");
	anchor.href = objectUrl;
	anchor.download = fileName;
	anchorHost.body.appendChild(anchor);
	anchor.click();
	anchor.remove();
	return objectUrl;
}
