/**
 * publicPortalRoute.ts — разбор адресов ПУБЛИЧНОГО контура приложения.
 *
 * ЗАЧЕМ ЭТО НУЖНО. Почти каждый экран здесь открывает клиника: у него есть
 * раздел в реестре workspaceShell.appViews, и viewFromHash() (AppHelpers.tsx)
 * приводит адрес к разделу рабочего места. Портал зуботехнической лаборатории —
 * не раздел рабочего места: его открывает внешний участник по одноразовой
 * ссылке, у него нет ни навигации клиники, ни её токенов.
 *
 * ЧТО БЫЛО СЛОМАНО. Регистратура нажимала «Ссылка технику»
 * (components/schedule/LabOrdersPanel.tsx), получала подсказку «Ссылка для
 * зуботехника скопирована в буфер обмена» и отправляла в лабораторию адрес
 * вида #/portal/lab-order/<токен>. Разбора этого адреса в приложении не было
 * вовсе: viewFromHash() режет хеш по «/», первым элементом получает пустую
 * строку, в реестре её нет — и возвращает «shift». Зуботехник открывал рабочее
 * место клиники вместо своего заказа, а регистратура была уверена, что
 * отправила рабочую ссылку.
 *
 * ПОЧЕМУ РАЗБОР ЖИВЁТ ОТДЕЛЬНЫМ МОДУЛЕМ, А НЕ ВНУТРИ main.tsx. main.tsx
 * исполняет побочные действия при импорте (подстановка токенов, createRoot,
 * регистрация service worker), поэтому юнит-тестом он не берётся. Здесь чистая
 * функция, и она закрыта src/tests/publicPortalRoute.test.ts: ошибка в разборе
 * адреса не видна ни в типах, ни на экране клиники — она видна только у
 * внешнего участника, до которого некому дойти.
 */

/** Публичный адрес: страница, которую открывает не клиника, а внешний участник. */
export type PublicPortalRoute =
	| {
			/** Портал зуботехнической лаборатории: один заказ по одному токену. */
			readonly kind: "lab-order";
			/** Токен заказа из ссылки. Клиника выдаёт его кнопкой «Ссылка технику». */
			readonly token: string;
	  }
	| {
			/** Онлайн-запись пациента: страница, которую клиника вешает на свой сайт. */
			readonly kind: "booking";
			/**
			 * Клиника из ссылки. null — в адресе её нет; страница записи покажет
			 * человеческий отказ, а не пустоту, поэтому такой адрес всё равно
			 * остаётся публичным (см. ниже).
			 */
			readonly organizationId: string | null;
	  };

/**
 * Путь ссылки, которую строит LabOrdersPanel. Строка одна на весь клиент:
 * разойдись адрес в двух местах — ссылка снова открывала бы рабочее место.
 */
export const LAB_ORDER_PORTAL_PATH = "/portal/lab-order/";

/**
 * Путь страницы онлайн-записи: `#/portal/booking/<идентификатор клиники>`.
 *
 * ПОЧЕМУ КЛИНИКА В ПУТИ, А НЕ ПАРАМЕТРОМ. Живой серверный маршрут ждёт её
 * в ПУТИ — apps/api/src/server.ts регистрирует префикс /api/public/booking,
 * а обработчики стоят на «/:organizationId/doctors», «/:organizationId/slots/
 * :doctorId» и «/:organizationId/book». Ровно на этом уже сломалась удалённая
 * QrGatewayPanel: она печатала QR-код с «?clinicId=» параметром, и наклеенный
 * на стойку код вёл в никуда. Форма адреса теперь одна и совпадает с сервером.
 */
export const PUBLIC_BOOKING_PORTAL_PATH = "/portal/booking/";

/**
 * Снимает процентное кодирование с одного сегмента адреса.
 *
 * Битая последовательность (%zz) роняет decodeURIComponent через URIError.
 * Такая ссылка не откроет ни заказ, ни расписание ни при каком разборе, но и
 * уводить по ней в рабочее место клиники нельзя: адрес заведомо публичный, и
 * отказ должен прийти от сервера человеческим текстом, а не белым экраном от
 * необработанного throw. Помощник один на оба адреса — разойдись они, один из
 * двух внешних участников снова получил бы чужой экран.
 */
function decodeSegment(rawSegment: string): string {
	try {
		return decodeURIComponent(rawSegment).trim();
	} catch {
		return rawSegment.trim();
	}
}

/**
 * Разбор хеша страницы.
 *
 * Возвращает null для любого адреса рабочего места — тогда решает viewFromHash().
 *
 * Разбор СОЗНАТЕЛЬНО не проверяет формат токена. Сейчас сервер выдаёт UUID
 * (apps/api/src/routes/lab.ts, crypto.randomUUID()), но проверка формата здесь
 * была бы вторым источником истины: сменись формат — валидная ссылка молча
 * увела бы зуботехника в рабочее место клиники. Существование заказа проверяет
 * сервер, и на неизвестный токен портал показывает человеческую ошибку.
 */
export function publicPortalRouteFromHash(hash: string): PublicPortalRoute | null {
	const path = hash.startsWith("#") ? hash.slice(1) : hash;

	/*
	 * Онлайн-запись разбирается ПЕРВОЙ и, в отличие от портала зуботехника,
	 * остаётся публичным адресом даже без идентификатора клиники.
	 *
	 * ПОЧЕМУ РАЗНО. У портала зуботехника без токена показать нечего — он ушёл бы
	 * в пустую страницу, поэтому такой адрес отдаётся рабочему месту. У страницы
	 * записи отказ написан (pages/PublicBookingWidget.tsx: «В ссылке не указана
	 * клиника… позвоните в клинику»). Вернуть здесь null значило бы открыть
	 * ПАЦИЕНТУ рабочее место клиники — тот самый дефект, из-за которого эта
	 * развилка и появилась, только теперь с клинической частью наружу.
	 */
	const bookingBase = PUBLIC_BOOKING_PORTAL_PATH.replace(/\/$/, "");
	if (
		path === bookingBase ||
		path.startsWith(`${bookingBase}/`) ||
		path.startsWith(`${bookingBase}?`)
	) {
		const rawOrganizationId =
			path
				.slice(bookingBase.length)
				.replace(/^\//, "")
				.split(/[/?#&]/)[0] ?? "";
		return {
			kind: "booking",
			organizationId: decodeSegment(rawOrganizationId) || null,
		};
	}

	if (!path.startsWith(LAB_ORDER_PORTAL_PATH)) return null;

	// Хвост после токена отбрасывается: ссылку копируют в мессенджер, и он умеет
	// дописать к ней и «/», и параметры. Токен — только первый сегмент.
	const rawToken = path.slice(LAB_ORDER_PORTAL_PATH.length).split(/[/?#&]/)[0] ?? "";
	if (!rawToken) return null;

	const token = decodeSegment(rawToken);

	return token ? { kind: "lab-order", token } : null;
}

/**
 * Полный URL страницы онлайн-записи для клиники.
 *
 * Единый строитель: LabOrdersPanel копирует lab-order так же
 * (`origin + # + path`). Без orgId — null (нельзя отдать битую ссылку).
 * origin опционален для тестов без window.
 */
export function buildPublicBookingPortalUrl(
	organizationId: string,
	origin: string = typeof window !== "undefined" ? window.location.origin : "",
): string | null {
	const org = organizationId.trim();
	const base = origin.trim().replace(/\/$/, "");
	if (!org || !base) return null;
	const path = `${PUBLIC_BOOKING_PORTAL_PATH.replace(/\/$/, "")}/${encodeURIComponent(org)}`;
	return `${base}/#${path}`;
}
