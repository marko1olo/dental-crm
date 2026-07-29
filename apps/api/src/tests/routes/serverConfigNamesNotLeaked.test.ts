import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test, { describe } from "node:test";
import Fastify from "fastify";
import { portalRoutes } from "../../routes/portal.js";

/**
 * ИМЕНА НАСТРОЕК СЕРВЕРА УХОДИЛИ В ПУБЛИЧНЫЙ ОТВЕТ.
 *
 * Пациент, запрашивающий код входа в личный кабинет, получал 503 с текстом
 * «Вход в личный кабинет недоступен: на сервере не настроен SMS-шлюз
 * (DENTE_SMS_PROVIDER и ключи доступа)». Маршрут `/api/portal/auth/send-otp`
 * ПУБЛИЧНЫЙ и без авторизации: имя внутренней настройки получал любой, кто
 * отправит номер телефона. То же было в приёме квитанций о доставке
 * (`routes/communicationReceipts.ts`) — маршрут тоже вызывается извне.
 *
 * Пациенту это имя бесполезно дважды: он не администратор клиники, и латинское
 * слово из шести и более букв всё равно гасится фильтром служебного текста на
 * экране (`apps/web/src/AppHelpers.tsx`). А администратор клиники настоящей
 * причины не узнавал нигде: в журнал сервера она не писалась вовсе.
 *
 * ЧТО ОХРАНЯЕТ ЭТОТ ФАЙЛ.
 *  1. Отказ портала объясняет причину словами пациента и даёт шаг, который у него
 *     есть, — и не называет ни одной переменной окружения.
 *  2. Ни в одном маршруте `apps/api/src/routes` человеческий текст не содержит
 *     имени настройки сервера. Проверка читает исходники: список файлов разошёлся
 *     бы с деревом на первом же новом маршруте.
 *
 * ЧЕГО ЭТОТ ФАЙЛ НЕ УТВЕРЖДАЕТ. Что пациент видел это имя на экране. Живой
 * клиент (`apps/web/src/components/PatientPortal.tsx:322-329`) на `!response.ok`
 * тело ответа не читает вовсе и строит текст по коду ответа. Утечка была в теле
 * публичного ответа, а не на экране, и починена именно она.
 */

/**
 * Имя настройки сервера: заглавные латинские буквы с подчёркиванием внутри.
 * `SMS-шлюз` и `ЕГИСЗ` под это не попадают — подчёркивания в них нет.
 */
const CONFIG_NAME = /[A-Z][A-Z0-9]*_[A-Z0-9_]{2,}/;
const CYRILLIC = /[А-Яа-яЁё]/;
/**
 * Значение поля `message` в теле ответа: один или несколько строковых литералов,
 * склеенных плюсом, возможно на нескольких строках.
 *
 * ПОЧЕМУ ИМЕННО `message`, А НЕ ЛЮБАЯ СТРОКА С ИМЕНЕМ НАСТРОЙКИ. Первая версия
 * сканера искала любой русский литерал с именем настройки и нашла четыре места;
 * два оказались ЗАПИСЯМИ В ЖУРНАЛ (`console.warn` в routes/whatsapp.ts,
 * `request.log.warn` о режиме разработки в routes/portal.ts). В журнале имя
 * настройки нужно — это единственное место, где оно и должно быть. Запрет,
 * который заодно запрещает правильное, заставляет следующего отключить проверку
 * целиком, поэтому правило сужено до того, что действительно уходит наружу.
 */
const MESSAGE_VALUE = /message\s*:\s*((?:"(?:[^"\\\n]|\\.)*"\s*\+?\s*)+)/g;

function leakingLiterals(source: string): string[] {
	const found: string[] = [];
	for (const match of source.matchAll(MESSAGE_VALUE)) {
		const value = match[1] ?? "";
		if (!CYRILLIC.test(value)) continue;
		if (!CONFIG_NAME.test(value)) continue;
		found.push(value.replace(/\s+/g, " ").slice(0, 140));
	}
	return found;
}

describe("имена настроек сервера не уходят в текст для человека", () => {
	test("самопроверка сканера: прежние строки он находит, а починенные — нет", () => {
		assert.deepEqual(
			leakingLiterals(
				'message: "Вход в личный кабинет недоступен: на сервере не настроен SMS-шлюз (DENTE_SMS_PROVIDER и ключи доступа)."',
			).length,
			1,
			"Сканер не нашёл прежнюю утечку портала — верить его нулям нельзя",
		);
		assert.deepEqual(
			leakingLiterals(
				'message:\n\t\t\t\t"Приём квитанций не настроен: не задан DENTE_COMMUNICATION_RECEIPT_SECRET. " +\n\t\t\t\t"Без секрета обработчик не принимает вызовы."',
			).length,
			1,
			"Сканер не нашёл прежнюю утечку квитанций — а она была склеена из двух строк на разных строчках",
		);
		assert.deepEqual(
			leakingLiterals(
				'console.warn(\n\t\t\t\t"[WhatsApp] WHATSAPP_APP_SECRET не задан: подпись вебхука не проверяется (только dev).",\n\t\t\t);',
			),
			[],
			"Сканер запретил имя настройки в записи журнала — а именно туда его и полагается писать",
		);
		assert.deepEqual(
			leakingLiterals(
				'message: "Вход в личный кабинет по коду из СМС сейчас не работает: клиника не подключила отправку СМС."',
			),
			[],
			"Сканер придирается к тексту без имён настроек: с таким правилом он запретит любой русский отказ",
		);
		assert.deepEqual(
			leakingLiterals('{ requiredEnv: ["DENTE_SMS_PROVIDER"] }'),
			[],
			"Сканер запретил имя настройки в записи журнала — а именно туда его и полагается писать",
		);
		assert.deepEqual(
			leakingLiterals('message: "Отправьте документы в ЕГИСЗ и повторите."'),
			[],
			"Сканер принял русскую аббревиатуру за имя настройки",
		);
	});

	test("в живом дереве маршрутов таких строк нет", async () => {
		const routesDir = path.join(import.meta.dirname, "..", "..", "routes");
		async function collect(directory: string): Promise<string[]> {
			const entries = await readdir(directory, { withFileTypes: true });
			const files: string[] = [];
			for (const entry of entries) {
				const full = path.join(directory, entry.name);
				if (entry.isDirectory()) files.push(...(await collect(full)));
				else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts"))
					files.push(full);
			}
			return files;
		}
		const files = await collect(routesDir);
		assert.ok(
			files.length > 30,
			`Маршрутов найдено ${files.length} — путь неверен, сканер смотрит в пустоту`,
		);

		const violations: string[] = [];
		for (const file of files) {
			for (const literal of leakingLiterals(await readFile(file, "utf8"))) {
				violations.push(`${path.basename(file)}: ${literal}`);
			}
		}
		assert.deepEqual(
			violations,
			[],
			"В тексте для человека снова названа настройка сервера. Человеку она бесполезна, " +
				"а на публичном маршруте это выдача внутреннего устройства первому, кто постучится. " +
				`Имя настройки пишите в журнал сервера. Места: ${violations.join(" | ")}`,
		);
	});

	test("отказ портала при ненастроенных СМС объясняет причину и даёт шаг", async () => {
		const savedProvider = process.env.DENTE_SMS_PROVIDER;
		const savedNodeEnv = process.env.NODE_ENV;
		/*
		 * Ветка достижима только когда шлюза нет И среда боевая: в разработке
		 * действует запасной путь «код в журнал». Обе переменные возвращаются на
		 * место — процесс общий с другими файлами набора.
		 */
		process.env.DENTE_SMS_PROVIDER = "";
		process.env.NODE_ENV = "production";
		const app = Fastify({ logger: false });
		try {
			await app.register(portalRoutes, { prefix: "/api/portal" });
			await app.ready();
			const response = await app.inject({
				method: "POST",
				url: "/api/portal/auth/send-otp",
				headers: { "content-type": "application/json" },
				payload: { phone: "+7 916 555-11-22" },
			});
			const body = response.json() as Record<string, unknown>;
			assert.equal(
				response.statusCode,
				503,
				`ожидался отказ доставки, получено ${response.statusCode}: ${response.body}`,
			);
			const message = String(body.message ?? "");
			assert.ok(
				!CONFIG_NAME.test(message),
				`в отказе пациенту названа настройка сервера: ${message}`,
			);
			assert.match(
				message,
				/Позвоните в клинику/,
				`в отказе нет шага, доступного пациенту: ${message}`,
			);
			assert.match(
				message,
				/не подключила отправку СМС/,
				`в отказе не названа причина: ${message}`,
			);
			// Машинный код остаётся: им отличают «шлюза нет» от «неверный код».
			assert.equal(body.error, "OtpDeliveryNotConfigured");
		} finally {
			await app.close();
			if (savedProvider === undefined) delete process.env.DENTE_SMS_PROVIDER;
			else process.env.DENTE_SMS_PROVIDER = savedProvider;
			if (savedNodeEnv === undefined) delete process.env.NODE_ENV;
			else process.env.NODE_ENV = savedNodeEnv;
		}
	});
});
