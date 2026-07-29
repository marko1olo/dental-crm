import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
	LAB_ORDER_PORTAL_PATH,
	PUBLIC_BOOKING_PORTAL_PATH,
	publicPortalRouteFromHash,
} from "../lib/publicPortalRoute";

const webSrcRoot = path.join(import.meta.dirname, "..");

function readSource(relativePath: string): string {
	return readFileSync(path.join(webSrcRoot, relativePath), "utf8");
}

/**
 * Страж публичного контура.
 *
 * ЧТО ОХРАНЯЕТСЯ. Ссылку на портал зуботехника строит один файл
 * (components/schedule/LabOrdersPanel.tsx), а разбирает другой (main.tsx).
 * Разойдись они на один символ — регистратура снова отправляла бы в лабораторию
 * адрес, по которому открывается рабочее место клиники, и узнала бы об этом
 * только со слов зуботехника. Проверки ниже держат обе стороны на одном пути:
 * разбор — через LAB_ORDER_PORTAL_PATH, а сторону-источник — сверкой исходника,
 * потому что LabOrdersPanel.tsx в это задание не входил и его текст не менялся.
 */

test("ссылку строит и разбирает один и тот же путь", () => {
	const panel = readSource("components/schedule/LabOrdersPanel.tsx");
	assert.ok(
		panel.includes(`/#${LAB_ORDER_PORTAL_PATH}`),
		`LabOrdersPanel.tsx больше не строит ссылку по пути ${LAB_ORDER_PORTAL_PATH}. ` +
			"Кнопка «Ссылка технику» отдаёт зуботехнику адрес, который main.tsx уже не узнаёт: " +
			"вместо заказа откроется рабочее место клиники, а подсказка всё равно скажет «скопирована».",
	);

	const entry = readSource("main.tsx");
	assert.ok(
		entry.includes("publicPortalRouteFromHash"),
		"main.tsx больше не спрашивает publicPortalRouteFromHash(). Развилка публичного контура снята — " +
			"ссылка зуботехника снова открывает рабочее место клиники.",
	);
	assert.ok(
		entry.includes("<GuestLabPortal"),
		"main.tsx больше не рендерит GuestLabPortal. Разбор адреса остался, а показывать по нему нечего.",
	);
});

test("ссылка «Ссылка технику» разбирается в токен заказа", () => {
	const token = "550e8400-e29b-41d4-a716-446655440000";

	assert.deepEqual(publicPortalRouteFromHash(`#${LAB_ORDER_PORTAL_PATH}${token}`), {
		kind: "lab-order",
		token,
	});
	// Тот же адрес без «#»: hash в некоторых браузерных API приходит без решётки.
	assert.deepEqual(publicPortalRouteFromHash(`${LAB_ORDER_PORTAL_PATH}${token}`), {
		kind: "lab-order",
		token,
	});
});

test("хвост, который дописывает мессенджер, не попадает в токен", () => {
	const token = "550e8400-e29b-41d4-a716-446655440000";

	for (const tail of ["/", "/?utm_source=telegram", "?from=mail", "#anchor", "&x=1"]) {
		assert.deepEqual(
			publicPortalRouteFromHash(`#${LAB_ORDER_PORTAL_PATH}${token}${tail}`),
			{ kind: "lab-order", token },
			`хвост «${tail}» попал в токен — сервер ответит «заказ не найден» на рабочей ссылке`,
		);
	}
});

test("адреса рабочего места остаются за viewFromHash", () => {
	for (const hash of [
		"",
		"#",
		"#shift",
		"#patients/settings",
		"#settings/clinic",
		// Портальный путь без токена: открывать нечего, и уводить в портал нельзя —
		// иначе внешний участник получит пустую страницу вместо понятного отказа.
		"#/portal/lab-order/",
		"#/portal/lab-order",
		// Подстрока в середине не должна открывать портал: разбор идёт от начала.
		"#patients/portal/lab-order/abc",
	]) {
		assert.equal(
			publicPortalRouteFromHash(hash),
			null,
			`адрес «${hash}» уводит в публичный портал — клиника потеряет свой экран`,
		);
	}
});

test("ссылка онлайн-записи разбирается в клинику из пути", () => {
	const organizationId = "6f9619ff-8b86-d011-b42d-00c04fc964ff";

	assert.deepEqual(
		publicPortalRouteFromHash(`#${PUBLIC_BOOKING_PORTAL_PATH}${organizationId}`),
		{ kind: "booking", organizationId },
	);
	// Тот же адрес без «#»: hash в некоторых браузерных API приходит без решётки.
	assert.deepEqual(
		publicPortalRouteFromHash(`${PUBLIC_BOOKING_PORTAL_PATH}${organizationId}`),
		{ kind: "booking", organizationId },
	);

	// Хвост, который дописывают сайт клиники и рекламный кабинет.
	for (const tail of ["/", "?utm_source=vk", "/?from=maps", "#anchor", "&x=1"]) {
		assert.deepEqual(
			publicPortalRouteFromHash(
				`#${PUBLIC_BOOKING_PORTAL_PATH}${organizationId}${tail}`,
			),
			{ kind: "booking", organizationId },
			`хвост «${tail}» попал в идентификатор клиники — сервер ответит «клиника не найдена» на рабочей ссылке`,
		);
	}
});

/*
 * Адрес записи БЕЗ клиники обязан остаться публичным.
 *
 * Верни разбор здесь null — и по неполной ссылке (клиника обрезала её при
 * вставке на сайт, шаблон подставил пустое значение) ПАЦИЕНТ открыл бы рабочее
 * место клиники: viewFromHash() на таком хеше откатывается на «Смену». Отказ на
 * этот случай написан в самой странице записи, поэтому пустой идентификатор
 * доезжает до неё как null, а не подменяется рабочим местом.
 */
test("ссылка записи без клиники остаётся публичной страницей, а не рабочим местом", () => {
	for (const hash of [
		"#/portal/booking/",
		"#/portal/booking",
		"#/portal/booking?utm_source=vk",
	]) {
		assert.deepEqual(
			publicPortalRouteFromHash(hash),
			{ kind: "booking", organizationId: null },
			`адрес «${hash}» уводит пациента в рабочее место клиники`,
		);
	}
});

test("страницу записи рендерит точка монтирования, а не только разбор", () => {
	const entry = readSource("main.tsx");
	assert.ok(
		entry.includes("<PublicBookingWidget"),
		"main.tsx больше не рендерит PublicBookingWidget. Онлайн-записи у клиники снова нет: " +
			"три живых серверных адреса (apps/api/src/routes/publicBooking.ts) отвечают в пустоту, " +
			"а по ссылке записи пациент открывает рабочее место клиники.",
	);
	assert.ok(
		entry.includes('kind === "booking"'),
		"main.tsx больше не различает вид публичного адреса — по ссылке записи откроется портал " +
			"зуботехника, а по ссылке зуботехника страница записи.",
	);
});

test("процентное кодирование снимается, битое — не роняет разбор", () => {
	assert.deepEqual(publicPortalRouteFromHash("#/portal/lab-order/a%2Db"), {
		kind: "lab-order",
		token: "a-b",
	});
	// %zz — не процентная последовательность; decodeURIComponent бросает URIError.
	// Разбор обязан выжить: адрес заведомо портальный, и отказ должен прийти от
	// сервера человеческим текстом, а не белым экраном от необработанного throw.
	assert.deepEqual(publicPortalRouteFromHash("#/portal/lab-order/%zz"), {
		kind: "lab-order",
		token: "%zz",
	});
});
