/**
 * seedAuth.ts — учётные данные рабочей клиники «Стоматология, 1 кабинет».
 *
 * ЧТО ЭТОТ СКРИПТ ДЕЛАЕТ И ЧЕМ ОТЛИЧАЕТСЯ ОТ migrateStateToDb.ts.
 * migrateStateToDb (`npm run db:reset-seed`) переносит В БАЗУ ВСЁ состояние из
 * JSON и ради этого чистит два десятка таблиц. Здесь — только вход: строка
 * организации с логином и паролем клиники и четыре сотрудника с PIN-кодами.
 * Ничего не удаляется вовсе. Арендатор тот же самый: идентификатор
 * `4a3420d1-…` лежит в `.data/dental-crm-state.json`, в `sampleData.ts:183` и в
 * десятке смоук-скриптов корня, то есть это рабочая клиника, а не выдумка.
 *
 * ПОЧЕМУ ФАЙЛ ПЕРЕПИСАН (2026-08-06)
 * ----------------------------------
 * После миграций 0157–0160 роль приложения `dental` — NOSUPERUSER/NOBYPASSRLS и
 * владелец таблиц, а `FORCE ROW LEVEL SECURITY` стоит на 147 таблицах из 148,
 * поэтому FORCE распространяется и на владельца. Скрипт не выставлял ни
 * `app.current_tenant`, ни `app.superuser_bypass` и падал на первой же вставке.
 * Измерено на чистом кластере PostgreSQL 18.4 (порт 5435, 131 миграция):
 *
 *   seedAuth.ts:101  new row violates row-level security policy
 *                    for table "organizations"   (код 42501)
 *
 * Раньше это было не видно: на машинах разработки `dental` был
 * суперпользователем и обходил RLS целиком.
 *
 * ПОЧЕМУ ВЫБРАН app.current_tenant, А НЕ app.superuser_bypass
 * ----------------------------------------------------------
 * Три варианта прогнаны на том же кластере, вставки в organizations и users:
 *
 *   (а) без контекста          → organizations: 42501.
 *   (б) `superuser_bypass=on`  → organizations: OK, users: 42501. Обход
 *       НЕ работает на запись: дизъюнкт обхода есть в USING, а в WITH CHECK
 *       его нет ни у одной таблицы, кроме organizations (миграция 0159).
 *   (в) `current_tenant=<org>` → обе вставки проходят.
 *
 * Но решает не проходимость, а ОБЛАСТЬ ЗАПИСИ, и для скрипта об учётных данных
 * это важнее, чем для любого другого. Замер на двух арендаторах, `UPDATE` без
 * `WHERE` вообще:
 *
 *   UPDATE organizations SET password_hash=…  под current_tenant → 1 строка из 2
 *   UPDATE organizations SET password_hash=…  под superuser_bypass → 2 из 2
 *
 * То есть под обходом этот скрипт способен переписать пароль входа ЧУЖОЙ
 * клиники — не потерять данные, а отдать доступ. Под контекстом арендатора это
 * невозможно физически, независимо от того, что написано в `WHERE`.
 *
 * ВСЯ ЗАПИСЬ ИДЁТ ОДНОЙ ТРАНЗАКЦИЕЙ. Так `set_config(..., is_local => true)`
 * заведомо живёт на том же соединении, что и запросы (с пулом настройка иначе
 * уедет на другое соединение — см. заголовок db/rls.ts), и так не существует
 * состояния «организация обновлена, а PIN-коды нет».
 */

import { and, eq } from "drizzle-orm";

import { pool } from "../db/client.js";
import { withTenantCtx } from "../db/rls.js";
import * as schema from "../db/schema.js";
import { hashCredential } from "../utils/cryptoHelper.js";

/**
 * Арендатор рабочей клиники. Значение статично НАМЕРЕННО: повторный запуск
 * обязан обновлять ту же организацию, а не заводить новую. Это идентификатор, а
 * не учётные данные, и сам по себе он никуда не даёт доступа.
 */
const WORKING_ORG_ID = "4a3420d1-6ffb-4459-bd8f-7f7087f5e191";
const WORKING_ORG_NAME = "Стоматология, 1 кабинет";

/**
 * Имя и значение переменной, разрешающей перезапись существующих учётных
 * данных. Отдельная от `DENTAL_ALLOW_DESTRUCTIVE_DB_RESET` переменная нужна
 * потому, что здесь другое действие: сброс данных не выполняется, выполняется
 * смена пароля клиники и всех PIN-кодов персонала. Смешивать два разрешения в
 * одном литерале значило бы разрешать одним флагом два разных разрушения.
 */
const CREDENTIAL_OVERWRITE_ENV_NAME = "DENTAL_ALLOW_CREDENTIAL_OVERWRITE";
const CREDENTIAL_OVERWRITE_ENV_VALUE = "YES";

/**
 * Учётные данные по умолчанию ОПУБЛИКОВАНЫ в этом репозитории и потому являются
 * учётными данными только в смысле CWE-1392 «Use of Default Credentials».
 * Они те же, что в migrateStateToDb.ts, и намеренно те же: от этих литералов
 * зависят демо-вход, смоук-скрипты корня и фикстуры тестов. Смена значений
 * сломала бы гейты, а не улучшила безопасность. Вместо смены — предупреждение
 * на каждом запуске и безусловный отказ при NODE_ENV=production.
 */
const credentialDefaults = {
	CLINIC_LOGIN: "clinic@example.com",
	CLINIC_PASSWORD: "dente2026",
	ADMIN_PIN: "0000",
	STAFF_PIN: "1234",
} as const;

type CredentialName = keyof typeof credentialDefaults;

type SeedCredentials = {
	readonly clinicLogin: string;
	readonly clinicPassword: string;
	readonly adminPin: string;
	readonly staffPin: string;
	readonly defaulted: readonly CredentialName[];
};

/**
 * Отказ по защите. Отдельный класс нужен, чтобы верхний уровень напечатал
 * объяснение вместо стека вызовов: стек здесь не несёт информации.
 */
class SeedRefusedError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "SeedRefusedError";
	}
}

type DemoStaffMember = {
	readonly id: string;
	readonly fullName: string;
	readonly role: string;
	readonly phone: string;
	readonly email: string | null;
	readonly isAdmin: boolean;
};

/**
 * Четыре сотрудника рабочей клиники. Идентификаторы совпадают с
 * `sampleData.ts:184` и с десятком смоук-скриптов корня
 * (`smoke-settings-preferences.mjs`, `smoke-schedule-admin-guard.mjs` и др.),
 * поэтому менять их нельзя: на них ссылаются чужие проверки.
 */
const WORKING_STAFF: readonly DemoStaffMember[] = [
	{
		id: "e44d32ca-7777-4c00-a001-c88f01b92e21",
		fullName: "Петров Иван Иванович",
		role: "owner",
		phone: "+7 927 555-55-55",
		email: "owner@example.com",
		isAdmin: true,
	},
	{
		id: "8356141b-7cfa-4221-95f7-70f47e7344b1",
		fullName: "Иванова Марина Сергеевна",
		role: "doctor",
		phone: "+7 927 111-22-33",
		email: "doctor@example.com",
		isAdmin: false,
	},
	{
		id: "93bca14f-a11d-4088-9b48-cb7a0fd4c9ef",
		fullName: "Кузнецова Анна",
		role: "administrator",
		phone: "+7 927 222-10-10",
		email: "admin@example.com",
		isAdmin: true,
	},
	{
		id: "f365da0c-7094-4f80-b52d-59b7b1254791",
		fullName: "Садыкова Эльмира",
		role: "assistant",
		phone: "+7 927 900-77-10",
		email: null,
		isAdmin: false,
	},
];

/**
 * `NODE_ENV=production` распознаётся здесь как ЗАПРЕТ, а не как разрешение,
 * поэтому обычная ловушка с незаданным NODE_ENV (пустое окружение — типовое
 * состояние боевой установки) ничего лишнего не открывает: основную защиту
 * несёт подсчёт существующих строк ниже, он от NODE_ENV не зависит.
 */
function productionModeActive(): boolean {
	return process.env.NODE_ENV?.trim().toLowerCase() === "production";
}

function credentialOverwriteAuthorized(): boolean {
	return (
		process.env[CREDENTIAL_OVERWRITE_ENV_NAME] ===
		CREDENTIAL_OVERWRITE_ENV_VALUE
	);
}

function resolveCredentials(): SeedCredentials {
	const defaulted: CredentialName[] = [];
	const read = (name: CredentialName): string => {
		const provided = process.env[name];
		if (provided !== undefined && provided.trim() !== "") return provided;
		defaulted.push(name);
		return credentialDefaults[name];
	};
	return {
		clinicLogin: read("CLINIC_LOGIN"),
		clinicPassword: read("CLINIC_PASSWORD"),
		adminPin: read("ADMIN_PIN"),
		staffPin: read("STAFF_PIN"),
		defaulted,
	};
}

/**
 * Печатает, что именно будет записано. Значение показывается ТОЛЬКО когда оно
 * взято по умолчанию, то есть уже опубликовано в репозитории; заданное
 * окружением значение — секрет и в журнал не попадает. Прежняя версия печатала
 * пароль и оба PIN-кода открытым текстом в конце каждого запуска.
 */
function reportCredentials(credentials: SeedCredentials): void {
	const shown = (name: CredentialName, value: string): string =>
		credentials.defaulted.includes(name) ? value : "(задан окружением)";

	console.log(
		`   логин клиники:  ${shown("CLINIC_LOGIN", credentials.clinicLogin)}`,
	);
	console.log(
		`   пароль клиники: ${shown("CLINIC_PASSWORD", "(значение по умолчанию из репозитория)")}`,
	);
	console.log(`   PIN админов:    ${shown("ADMIN_PIN", credentials.adminPin)}`);
	console.log(`   PIN персонала:  ${shown("STAFF_PIN", credentials.staffPin)}`);

	if (credentials.defaulted.length === 0) {
		console.log("Учётные данные: все четыре заданы окружением.");
		return;
	}

	const names = credentials.defaulted.join(", ");
	if (productionModeActive()) {
		throw new SeedRefusedError(
			[
				"ОТКАЗ: NODE_ENV=production, а учётные данные взяты по умолчанию.",
				`Не заданы: ${names}.`,
				"Значения по умолчанию опубликованы в этом репозитории и известны всем.",
				"Задайте CLINIC_LOGIN, CLINIC_PASSWORD, ADMIN_PIN и STAFF_PIN в окружении.",
			].join("\n"),
		);
	}
	console.warn(
		[
			"",
			"ВНИМАНИЕ: учётные данные взяты ПО УМОЛЧАНИЮ, они опубликованы в репозитории.",
			`  Не заданы окружением: ${names}`,
			"  Это допустимо только для разработки и демонстрации.",
			"  Перед передачей клинике задайте их явно и смените после первого входа.",
			"",
		].join("\n"),
	);
}

/**
 * Решает, разрешена ли перезапись, и печатает масштаб ДО решения.
 *
 * ЗАЩИТА СОРАЗМЕРНА ДЕЙСТВИЮ:
 *   • у арендатора нет ни организации, ни сотрудников — переписывать нечего,
 *     разворачивание на чистой машине идёт без единой дополнительной
 *     переменной;
 *   • строки есть — запуск сменит пароль входа клиники и PIN-код КАЖДОГО
 *     сотрудника, то есть либо откроет вход по опубликованным значениям, либо
 *     запрёт персонал снаружи. Тогда нужно явное
 *     `DENTAL_ALLOW_CREDENTIAL_OVERWRITE=YES`, а при NODE_ENV=production отказ
 *     безусловный: смена учётных данных боевой клиники — не работа сидера.
 */
function authorizeOverwrite(
	organizationExists: boolean,
	existingStaffCount: number,
): void {
	if (!organizationExists && existingStaffCount === 0) {
		console.log(
			`Арендатор ${WORKING_ORG_ID} пуст: организация и сотрудники создаются заново.`,
		);
		return;
	}

	console.log("Запуск ПЕРЕПИШЕТ существующие учётные данные:");
	console.log(
		`   организация:  ${organizationExists ? "1 строка" : "нет, будет создана"}`,
	);
	console.log(
		`   сотрудники:   ${existingStaffCount} из ${WORKING_STAFF.length} уже в базе`,
	);

	if (productionModeActive()) {
		throw new SeedRefusedError(
			[
				"ОТКАЗ: NODE_ENV=production, а учётные данные этой клиники уже существуют.",
				"Смена пароля клиники и PIN-кодов персонала в боевой базе не выполняется",
				"этим скриптом ни при каких флагах — для этого есть маршруты приложения.",
			].join("\n"),
		);
	}

	if (!credentialOverwriteAuthorized()) {
		throw new SeedRefusedError(
			[
				"ОТКАЗ: запуск переписал бы пароль входа клиники и PIN-коды персонала.",
				`Чтобы разрешить это осознанно, задайте ${CREDENTIAL_OVERWRITE_ENV_NAME}="${CREDENTIAL_OVERWRITE_ENV_VALUE}".`,
				"Ничего не изменено, транзакция откачена.",
			].join("\n"),
		);
	}

	console.log(
		`Разрешено переменной ${CREDENTIAL_OVERWRITE_ENV_NAME}=${CREDENTIAL_OVERWRITE_ENV_VALUE}. Перезаписываю...`,
	);
}

async function seedAuth(): Promise<void> {
	console.log("Учётные данные рабочей клиники — запись в базу.");

	const credentials = resolveCredentials();
	reportCredentials(credentials);

	const passwordHash = await hashCredential(credentials.clinicPassword);
	/*
	 * hashCredential асинхронна (pbkdf2 в пуле потоков, см. utils/cryptoHelper.ts).
	 * Без await в колонку уехал бы текст "[object Promise]", и войти в клинику
	 * после посева не удалось бы ни с каким паролем. Соль своя у каждой строки,
	 * поэтому хеши PIN-кодов считаются построчно, а не один раз на роль: два
	 * сотрудника с одинаковым PIN не должны получать одинаковый хеш.
	 */
	const staffRows = await Promise.all(
		WORKING_STAFF.map(async (staff) => ({
			staff,
			pinCodeHash: await hashCredential(
				staff.isAdmin ? credentials.adminPin : credentials.staffPin,
			),
			/*
			 * Владелец входит и как клиника (пароль организации), и как пользователь,
			 * поэтому его строка получает тот же пароль. У остальных
			 * `users.password_hash` остаётся пустым: вход по PIN-коду.
			 */
			passwordHash: staff.email === "owner@example.com" ? passwordHash : null,
		})),
	);

	await withTenantCtx(WORKING_ORG_ID, async (tx) => {
		const existingOrg = await tx
			.select({ id: schema.organizations.id })
			.from(schema.organizations)
			.where(eq(schema.organizations.id, WORKING_ORG_ID))
			.limit(1);

		const existingStaff = await tx
			.select({ id: schema.users.id })
			.from(schema.users)
			.where(eq(schema.users.organizationId, WORKING_ORG_ID));
		const existingStaffIds = new Set(existingStaff.map((row) => row.id));

		authorizeOverwrite(existingOrg.length > 0, existingStaff.length);

		if (existingOrg.length > 0) {
			/*
			 * `returning` здесь не украшение. Прежняя версия печатала «Organization
			 * updated» безусловно, поэтому под RLS сообщение об успехе появлялось бы
			 * и после запроса, обновившего НОЛЬ строк. Количество затронутых строк
			 * теперь измеряется, а не предполагается.
			 */
			const updated = await tx
				.update(schema.organizations)
				.set({ loginId: credentials.clinicLogin, passwordHash })
				.where(eq(schema.organizations.id, WORKING_ORG_ID))
				.returning({ id: schema.organizations.id });
			console.log(
				`Организация обновлена: ${updated.length} строк (${WORKING_ORG_NAME})`,
			);
		} else {
			const inserted = await tx
				.insert(schema.organizations)
				.values({
					id: WORKING_ORG_ID,
					name: WORKING_ORG_NAME,
					loginId: credentials.clinicLogin,
					passwordHash,
					inn: "631234567890",
					ogrn: "318631300000000",
					email: credentials.clinicLogin,
				})
				.returning({ id: schema.organizations.id });
			console.log(
				`Организация создана: ${inserted.length} строк (${WORKING_ORG_NAME})`,
			);
		}

		for (const row of staffRows) {
			if (existingStaffIds.has(row.staff.id)) {
				/*
				 * Обновление идёт по ПЕРВИЧНОМУ КЛЮЧУ. Прежний код выбирал строку по
				 * `users.id`, а обновлял по паре (organization_id, full_name): при
				 * двух полных тёзках в клинике он переписывал PIN-код обоим, а при
				 * переименованном сотруднике — ни одному, продолжая печатать «updated».
				 * Условие по организации оставлено: оно дублирует границу арендатора,
				 * которую и так держит RLS, и стоит один индексный поиск.
				 */
				const updated = await tx
					.update(schema.users)
					.set({
						pinCodeHash: row.pinCodeHash,
						passwordHash: row.passwordHash,
						isActive: true,
					})
					.where(
						and(
							eq(schema.users.id, row.staff.id),
							eq(schema.users.organizationId, WORKING_ORG_ID),
						),
					)
					.returning({ id: schema.users.id });
				console.log(
					`   ${row.staff.fullName} (${row.staff.role}): обновлено ${updated.length} строк`,
				);
			} else {
				const inserted = await tx
					.insert(schema.users)
					.values({
						id: row.staff.id,
						organizationId: WORKING_ORG_ID,
						fullName: row.staff.fullName,
						role: row.staff.role,
						phone: row.staff.phone,
						email: row.staff.email,
						pinCodeHash: row.pinCodeHash,
						passwordHash: row.passwordHash,
						isActive: true,
					})
					.returning({ id: schema.users.id });
				console.log(
					`   ${row.staff.fullName} (${row.staff.role}): создано ${inserted.length} строк`,
				);
			}
		}
	});

	console.log("");
	console.log("Готово. Вход клиники: POST /api/auth/clinic/login.");
	console.log("Схему создаёт 'npm run db:migrate', её надо запускать первой.");
}

seedAuth()
	.then(async () => {
		await pool.end();
		process.exit(0);
	})
	.catch(async (error: unknown) => {
		if (error instanceof SeedRefusedError) {
			console.error("");
			console.error(error.message);
		} else {
			console.error("Ошибка посева учётных данных:", error);
		}
		await pool.end();
		process.exit(1);
	});
