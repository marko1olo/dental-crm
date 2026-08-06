/**
 * requiredEnv.ts — ГРОМКИЙ отказ при старте вместо тихих 503 в рантайме.
 *
 * ПРОБЛЕМА, КОТОРУЮ ЭТО ЗАКРЫВАЕТ
 * До этого модуля единственной проверкой, валившей старт всегда, была
 * `requireDatabaseUrl()` (`db/client.ts:27`). Остальные два барьера —
 * `assertSecurityConfiguration()` (`server.ts:131`, вызов `:181`) и проверка
 * `WEB_ORIGIN` (`server.ts:310-314`) — обусловлены `NODE_ENV === "production"`.
 * А `apps/api/package.json:8` объявляет `"start": "node dist/server.js"` и
 * `NODE_ENV` НЕ задаёт. Итог, измеренный на живом процессе: сервер поднимается,
 * отдаёт 200 на `/api/health` и 503 на `PUT /api/settings/preferences`
 * (`SettingsAdminSecretMissing`). Отказ доезжает не до того, кто развернул
 * систему, а до первого администратора клиники.
 *
 * ПОЛЯРНОСТЬ УСЛОВИЯ — ГЛАВНОЕ ЗДЕСЬ
 * Требуем переменные, когда `NODE_ENV` НЕ равен явно `development` или `test`,
 * то есть в том числе при ПУСТОМ и незаданном `NODE_ENV`. Это ровно та
 * инверсия, которую `accessGuard.ts:42-55` (`isDevelopmentEnvironment`) уже
 * исправил для послаблений: запись `NODE_ENV !== "production"` истинна при
 * незаданном значении и потому отдаёт незаданное окружение в режим разработки.
 * Здесь используется та же полярность и по той же причине.
 *
 * ПОЧЕМУ НЕ `@fastify/env`
 * Он валидирует внутри загрузки плагинов, то есть после вычисления импортов.
 * `db/client.ts:27` бросает НА ИМПОРТЕ, а `server.ts` импортирует маршруты,
 * которые тянут `db/client.js`. Плагин опоздал бы, и пользователь увидел бы
 * сообщение про `DATABASE_URL` вместо настоящего списка. Отсюда требование:
 * этот модуль разбирается ДО фабрики приложения, первым в `server.ts`.
 *
 * ПОЧЕМУ ZOD, А НЕ `envalid`
 * `zod` уже в зависимостях и уже используется для контрактов маршрутов — новой
 * оснастки не появляется (мандат 9). У `envalid` пришлось бы переопределять
 * репортёр: тексты отказов в проекте русские, и есть отдельный сторож текста
 * (`tests/routes/scheduleRefusalText.test.ts`).
 */

import { z } from "zod";

/** Минимальная длина секрета квитанций — `routes/communicationReceipts.ts`. */
const RECEIPT_SECRET_MIN_LENGTH = 16;

/** Длина ключа шифрования копий — `services/backupWorker.ts:48`. */
const ENCRYPTION_KEY_MIN_BYTES = 32;

/**
 * Ключ из `.env.example`, которым нельзя шифровать медицинские данные.
 * Дублирует `PUBLIC_SAMPLE_KEY` в `services/backupWorker.ts` намеренно: тянуть
 * сюда импорт из `services/**` значит тянуть и весь его граф, включая
 * `db/client.js`, а этот модуль обязан разбираться раньше него.
 */
const PUBLIC_SAMPLE_ENCRYPTION_KEY = "dev-clinic-encryption-key-change-me";

export interface RequiredEnvEntry {
	/** Имя переменной окружения. */
	readonly name: string;
	/** Что именно перестаёт работать без значения. */
	readonly breaks: string;
	/** Где читается: `файл:строка`. */
	readonly readAt: string;
	/** Дополнительное требование к значению, если есть. */
	readonly constraint?: string;
}

/**
 * Обязательные переменные. Список сознательно ограничен теми, без которых
 * ломается ФУНКЦИЯ, доступная администратору клиники, и теми, чьё отсутствие
 * означает необъявленное ослабление защиты. Каждая строка проверена по коду.
 *
 * Сюда НЕ попали переменные необязательных интеграций, у которых есть ЧЕСТНОЕ
 * поведение «канал выключен»: `DENTE_SMS_*` (без них отправка сообщает
 * `not_configured` и очередь записывает причину, `smsTransport.ts:117-152`),
 * `DENTE_TELEGRAM_*`, `DENTE_SMTP_*`, `PORTAL_MVP_OTP_CODE`. Требовать их
 * значит превратить мягкую зависимость в жёсткую и не дать поднять систему
 * клинике, которая этими каналами не пользуется. Их место — `.env.example` с
 * объяснением, а не гейт старта.
 *
 * КРИТЕРИЙ ОТБОРА, ЧТОБЫ СПИСОК НЕ РОС ПРОИЗВОЛЬНО. Переменная обязательна,
 * если её отсутствие либо (а) ломает работу, доступную администратору клиники
 * через интерфейс, либо (б) МОЛЧА ОТКРЫВАЕТ периметр. Если отсутствие честно
 * выключает необязательную функцию отказом — это предупреждение, а не отказ
 * старта.
 */
export const REQUIRED_ENV: readonly RequiredEnvEntry[] = [
	{
		name: "DATABASE_URL",
		breaks:
			"без строки подключения не работает ничего: сервер не стартует вовсе",
		readAt: "apps/api/src/db/client.ts:27",
	},
	{
		name: "AUTH_TOKEN_SECRET",
		breaks:
			"вход в рабочий кабинет клиники. Без значения секрет генерируется в файл " +
			"`.data/dev-auth-secret`, то есть токены переживают только один процесс " +
			"и подписаны секретом, не заданным владельцем",
		readAt: "apps/api/src/security/authSecret.ts",
	},
	{
		name: "DENTE_SETTINGS_ADMIN_SECRET",
		breaks:
			"изменение настроек клиники и настроек DICOM-хранилища: 503 " +
			"`SettingsAdminSecretMissing` и `DicomWebSettingsAdminSecretMissing`",
		readAt:
			"apps/api/src/routes/settings.ts:743,765; apps/api/src/routes/imaging.ts:147,165",
	},
	{
		name: "DENTE_SCHEDULE_ADMIN_SECRET",
		breaks: "запись пациента на приём — основная функция регистратуры",
		readAt: "apps/api/src/routes/schedule.ts",
	},
	{
		name: "DENTE_CLINICAL_ADMIN_SECRET",
		breaks: "ведение клинических данных: осмотры, диагнозы, план лечения",
		readAt: "apps/api/src/security/authSecret.ts (clinicalAdminSecret)",
	},
	{
		name: "DENTE_COMMUNICATION_RECEIPT_SECRET",
		breaks:
			"приём квитанций о доставке сообщений: 503 `ReceiptsNotConfigured`. " +
			"Значение короче " +
			String(RECEIPT_SECRET_MIN_LENGTH) +
			" символов считается незаданным",
		readAt: "apps/api/src/routes/communicationReceipts.ts:45",
		constraint: "не короче " + String(RECEIPT_SECRET_MIN_LENGTH) + " символов",
	},
	{
		name: "CLINIC_ENCRYPTION_KEY",
		breaks:
			"демон резервного копирования не создаёт НИ ОДНОЙ копии: копия " +
			"медицинских данных без шифрования недопустима",
		readAt: "apps/api/src/services/backupWorker.ts:216",
		constraint:
			"не короче " +
			String(ENCRYPTION_KEY_MIN_BYTES) +
			" байт и не равно примеру из репозитория",
	},
	{
		/*
		 * ЭТО ЕДИНСТВЕННАЯ ЗАПИСЬ, ЗАКРЫВАЮЩАЯ НЕ ОТКАЗ, А ДЫРУ.
		 * ИЗМЕРЕНО по `security/webhookAuth.ts:70-83`: при НЕзаданном секрете
		 * отказ 503 выдаётся только при `NODE_ENV === "production"`. При пустом
		 * NODE_ENV — то есть при штатном `npm start` — вебхук пишет
		 * предупреждение в лог и ВОЗВРАЩАЕТ `true`, принимая любой POST.
		 * Последствия перечислены в шапке того же файла: посторонний заводит
		 * пациентов и лиды в чужой клинике, вбрасывает сообщения от имени
		 * пациента и показывает врачам уведомления о несуществующих звонках.
		 *
		 * Требуется именно ОБЩИЙ секрет, а не пер-канальные `VK_WEBHOOK_SECRET` /
		 * `TELEPHONY_WEBHOOK_SECRET` / `MAX_WEBHOOK_SECRET`: `configuredSecret()`
		 * берёт пер-канальный, а при его отсутствии откатывается на общий. Задав
		 * только один пер-канальный, владелец закрыл бы один канал из трёх и
		 * оставил два открытыми. Общий закрывает все три сразу.
		 */
		name: "DENTE_WEBHOOK_SECRET",
		breaks:
			"вебхуки VK, телефонии и MAX принимают ЛЮБОЙ запрос без проверки — " +
			"это не отказ функции, а открытый периметр",
		readAt:
			"apps/api/src/security/webhookAuth.ts:68; apps/api/src/routes/vk.ts:27; " +
			"apps/api/src/routes/telephony.ts:45,151; apps/api/src/routes/max.ts:85",
	},
];

/**
 * Режим разработки. Полярность совпадает с `accessGuard.ts:42-55`: режимом
 * разработки считается ТОЛЬКО явное `development` или `test`. Пустая строка,
 * пробелы и незаданное значение режимом разработки НЕ являются.
 */
export function isDevelopmentEnvironment(
	env: NodeJS.ProcessEnv = process.env,
): boolean {
	const mode = env.NODE_ENV?.trim().toLowerCase();
	return mode === "development" || mode === "test";
}

/**
 * Прогон под `node --test` или под самописным smoke-скриптом. Такие процессы
 * сами выставляют нужные переменные по месту и обязаны стартовать без полного
 * окружения, иначе гейт снесёт весь набор тестов.
 *
 * ИЗМЕРЕНО: `node --test` выставляет `NODE_TEST_CONTEXT=child-v8`, при этом
 * `NODE_ENV` остаётся незаданным — на одной проверке `NODE_ENV` эти прогоны
 * отличить нельзя.
 */
export function isAutomatedRun(env: NodeJS.ProcessEnv = process.env): boolean {
	if (typeof env.NODE_TEST_CONTEXT === "string" && env.NODE_TEST_CONTEXT.trim())
		return true;
	const entry = process.argv[1]?.replace(/\\/g, "/") ?? "";
	return (
		/\/scripts\/[^/]*\.mjs$/.test(entry) || /\.test\.(ts|js|mjs)$/.test(entry)
	);
}

/**
 * Схема одной переменной. Пустая строка и строка из пробелов — это «не задано»,
 * а не «задано пустым»: иначе `FOO=` в `.env` молча проходит гейт и отказ снова
 * уезжает в рантайм.
 */
function secretSchema(entry: RequiredEnvEntry): z.ZodType<string> {
	let schema = z
		.string({ required_error: "не задана", invalid_type_error: "не задана" })
		.trim()
		.min(1, "не задана");

	if (entry.name === "DENTE_COMMUNICATION_RECEIPT_SECRET") {
		schema = schema.min(
			RECEIPT_SECRET_MIN_LENGTH,
			"короче " +
				String(RECEIPT_SECRET_MIN_LENGTH) +
				" символов — код считает такое значение незаданным",
		);
	}

	if (entry.name === "CLINIC_ENCRYPTION_KEY") {
		return schema
			.refine(
				(value) => Buffer.byteLength(value, "utf8") >= ENCRYPTION_KEY_MIN_BYTES,
				{
					message:
						"короче " +
						String(ENCRYPTION_KEY_MIN_BYTES) +
						" байт — резервные копии создаваться не будут",
				},
			)
			.refine((value) => value !== PUBLIC_SAMPLE_ENCRYPTION_KEY, {
				message:
					"равно примеру из репозитория — таким ключом нельзя шифровать медицинские данные",
			});
	}

	return schema;
}

/** Схема окружения целиком. Собирается из `REQUIRED_ENV`, чтобы список был один. */
export function buildRequiredEnvSchema(): z.ZodObject<
	Record<string, z.ZodType<string>>
> {
	const shape: Record<string, z.ZodType<string>> = {};
	for (const entry of REQUIRED_ENV) shape[entry.name] = secretSchema(entry);
	return z.object(shape);
}

export interface EnvProblem {
	readonly entry: RequiredEnvEntry;
	readonly reason: string;
}

/**
 * Собирает ВСЕ проблемы разом. Именно поэтому здесь `safeParse`, а не
 * последовательные `throw`: падение на первой переменной заставляет владельца
 * системы обходить список по одному перезапуску на имя.
 */
export function collectEnvProblems(
	env: NodeJS.ProcessEnv = process.env,
): EnvProblem[] {
	const result = buildRequiredEnvSchema().safeParse(env);
	if (result.success) return [];

	const byName = new Map<string, string>();
	for (const issue of result.error.issues) {
		const name = String(issue.path[0] ?? "");
		if (name && !byName.has(name)) byName.set(name, issue.message);
	}

	const problems: EnvProblem[] = [];
	for (const entry of REQUIRED_ENV) {
		const reason = byName.get(entry.name);
		if (reason) problems.push({ entry, reason });
	}
	return problems;
}

/** Текст отказа: одним сообщением все имена, что ломается и где читается. */
export function formatEnvFailure(problems: readonly EnvProblem[]): string {
	const lines: string[] = [
		"",
		"════════════════════════════════════════════════════════════════════",
		"ОТКАЗ ПРИ СТАРТЕ: окружение сервера DENTE настроено не полностью.",
		"════════════════════════════════════════════════════════════════════",
		"",
		"Не заданы или заданы неприемлемо " +
			String(problems.length) +
			" обязательных переменных из " +
			String(REQUIRED_ENV.length) +
			":",
		"",
	];

	for (const { entry, reason } of problems) {
		lines.push("  • " + entry.name + " — " + reason + ".");
		lines.push("      ломается: " + entry.breaks + ".");
		if (entry.constraint)
			lines.push("      требуется: " + entry.constraint + ".");
		lines.push("      читается: " + entry.readAt);
		lines.push("");
	}

	lines.push(
		"ЧТО ДЕЛАТЬ",
		"  1. Задайте перечисленные переменные в `.env` рядом с `apps/api` либо в",
		"     окружении процесса. Описание каждой — в `.env.example`.",
		"  2. Значения секретов сгенерируйте сами, например:",
		"       node -e \"console.log(require('node:crypto').randomBytes(32).toString('hex'))\"",
		"     Заглушек в репозитории нет намеренно: стартовать с предсказуемым",
		"     секретом хуже, чем не стартовать.",
		"  3. Повторите запуск.",
		"",
		"ПОЧЕМУ ОТКАЗ ЗДЕСЬ, А НЕ ПОЗЖЕ",
		"  Без этих значений сервер поднимался и отвечал 200 на `/api/health`, но",
		"  отдавал 503 на записи на приём, клинических данных, настройках клиники и",
		"  Telegram. Отказ доезжал до первого администратора клиники вместо того,",
		"  кто развернул систему.",
		"",
		"  Проверка требует переменные, когда NODE_ENV не равен явно `development`",
		"  или `test` — в том числе когда NODE_ENV пуст. Пустой NODE_ENV — это",
		"  штатный запуск `npm start`, а не разработка.",
		"════════════════════════════════════════════════════════════════════",
		"",
	);

	return lines.join("\n");
}

/**
 * Главная проверка. Вызывать ПЕРВОЙ в `server.ts` — до фабрики приложения и до
 * любого импорта, тянущего `db/client.js`.
 *
 * В режиме разработки и в автоматических прогонах только предупреждает: ломать
 * разработку и набор тестов эта проверка не должна.
 */
export function assertRequiredEnv(env: NodeJS.ProcessEnv = process.env): void {
	const problems = collectEnvProblems(env);
	if (problems.length === 0) return;

	if (isDevelopmentEnvironment(env) || isAutomatedRun(env)) {
		console.warn(
			"[env] Не заданы обязательные переменные: " +
				problems.map((problem) => problem.entry.name).join(", ") +
				". Старт разрешён только потому, что это режим разработки или автоматический прогон. " +
				"При пустом NODE_ENV этот же запуск будет остановлен.",
		);
		return;
	}

	process.stderr.write(formatEnvFailure(problems));
	process.exit(1);
}
