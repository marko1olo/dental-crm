import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { sql } from "drizzle-orm";
import { organizations, patients } from "../../db/schema.js";
import { withSuperuserBypass } from "../../db/rls.js";
import {
	LEGACY_SHARED_FIXTURE_ORGANIZATION_IDS,
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "./fixtureOrganizations.js";

/**
 * Проверки на сам инвентарь фикстур.
 *
 * ЗАЧЕМ ОНИ. Этот модуль удаляет строки из ЖИВОЙ базы. Ошибка в нём стоит дороже,
 * чем ошибка в любом тесте, который им пользуется, поэтому его границы должны
 * охраняться отдельно. Охраняются три вещи: идентификаторы двух разных файлов не
 * совпадают, удаление данных клиники невозможно, и остатки прежнего общего блока
 * из живой базы действительно ушли.
 */

const UUID_V4_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/;

/**
 * Настоящие идентификаторы клиник, которые удалять нельзя — взяты из живой базы
 * и из кода сева, а не выдуманы: подставлять в проверку границы что-то похожее
 * значит проверять границу на значении, которого в базе нет.
 */
/** Демонстрационная клиника снимков, apps/api/src/scripts/seedOpsScreenshotDemo.ts:40. */
const SCREENSHOT_DEMO_ORG = "d0000000-0000-4000-8000-00000000d001";
/** Рабочая «Стоматология, 1 кабинет» — вторая организация для проверок изоляции. */
const WORKING_CLINIC_ORG = "4a3420d1-6ffb-4459-bd8f-7f7087f5e191";

/**
 * SQLSTATE из ошибки, как её отдаёт drizzle.
 *
 * Драйвер оборачивает отказ PostgreSQL в собственную ошибку «Failed query: …»,
 * а исходную кладёт в `cause`; на вложенных обёртках цепочка длиннее одного
 * звена. Проверка по коду ВЕРХНЕЙ ошибки поэтому ничего не проверяет: у неё
 * `code` не определён вовсе, и любой предикат по нему одинаково отвергнет и
 * нарушение политики, и синтаксическую ошибку.
 */
function postgresErrorCode(error: unknown): string | null {
	let current: unknown = error;
	for (let depth = 0; depth < 8 && current instanceof Error; depth += 1) {
		const code = (current as Error & { code?: unknown }).code;
		if (typeof code === "string") return code;
		current = (current as Error & { cause?: unknown }).cause;
	}
	return null;
}

describe("инвентарь тестовых клиник", () => {
	test("идентификатор выводится из имени файла и у разных файлов не совпадает", () => {
		// Тот же файл — тот же идентификатор: фикстура должна находить свою строку
		// в другом прогоне, иначе уборка на входе ничего не найдёт.
		assert.equal(fixtureUuid("portalOtp", 1), fixtureUuid("portalOtp", 1));

		// Разные файлы — разные блоки. Ровно этого и не было, когда блок
		// dce70000-…-09xx оказался выдан трём файлам сразу.
		const namespaces = ["portalOtp", "patientCreateDuplicateGuard", "speechTranscribeChunkAccess"];
		const issued = namespaces.flatMap((namespace) => [1, 2, 3, 4].map((slot) => fixtureUuid(namespace, slot)));
		assert.equal(new Set(issued).size, issued.length, "два файла получили один и тот же идентификатор");

		for (const id of issued) {
			assert.match(id, UUID_V4_SHAPE, `${id} не UUID версии 4 — колонка uuid такое значение не примет`);
			assert.ok(id.startsWith("dce70000-"), `${id} вне тестового пространства dce70000-…`);
		}
	});

	test("слот за пределами диапазона отвергается, а не сворачивается молча", () => {
		// Молчаливое усечение слота вернуло бы два разных ряда фикстуры к одному
		// идентификатору — то есть ту же поломку, только внутри одного файла.
		assert.throws(() => fixtureUuid("portalOtp", -1), /вне диапазона/);
		assert.throws(() => fixtureUuid("portalOtp", 0x10000), /вне диапазона/);
		assert.throws(() => fixtureUuid("portalOtp", 1.5), /вне диапазона/);
		assert.throws(() => fixtureUuid("   ", 1), /пространство имён пусто/);
	});

	test("уборка отказывается удалять клиники, которые не являются фикстурой", async () => {
		// Главная граница безопасности: маски здесь нет вообще, а всё, что вне
		// пространства dce70000-…, функция обязана отвергнуть до первого запроса.
		await assert.rejects(() => purgeFixtureOrganizations([SCREENSHOT_DEMO_ORG]), /не из тестового пространства/);
		await assert.rejects(() => purgeFixtureOrganizations([WORKING_CLINIC_ORG]), /не из тестового пространства/);
		// Один чужой идентификатор в списке отменяет весь вызов, а не только себя.
		await assert.rejects(
			() => purgeFixtureOrganizations([fixtureUuid("guardCheck", 1), WORKING_CLINIC_ORG]),
			/не из тестового пространства/,
		);
		await assert.rejects(() => purgeFixtureOrganizations(["не-uuid-вовсе"]), /не UUID/);
	});

	test("остатков прежнего общего блока в живой базе нет", async (context) => {
		// Наблюдение, а не рассуждение: смотрим в базу. В ней лежала «Клиника
		// диктовки Б» dce70000-…-0902 от прогона, убитого на половине; такой мусор
		// потом читается как данные клиники. Ссылаться на этот блок больше некому,
		// поэтому строки не могли бы уйти сами — их снимает уборка на входе фикстур.
		//
		// СЧЁТ ИДЁТ ПОД ОБХОДОМ RLS, И ЭТО НЕ ПРИДИРКА. Раньше здесь стоял обычный
		// db.execute без тенант-контекста. Под FORCE RLS такой запрос возвращает
		// НОЛЬ СТРОК всегда — независимо от того, что лежит в таблице, — то есть
		// проверка была зелёной по построению и не смогла бы заметить ни одного
		// остатка. Ровно та ловушка, ради которой этот файл и написан.
		let rows: { id: string; name: string }[];
		try {
			rows = await withSuperuserBypass(async (tx) => {
				const found = await tx.execute<{ id: string; name: string }>(sql`
					SELECT id::text AS id, name FROM organizations
					WHERE id IN (${sql.join(
						LEGACY_SHARED_FIXTURE_ORGANIZATION_IDS.map((id) => sql`${id}::uuid`),
						sql`, `,
					)})
				`);
				return found.rows;
			});
		} catch (error) {
			if (!isDatabaseUnavailable(error)) throw error;
			return context.skip("база недоступна");
		}

		assert.deepEqual(
			rows,
			[],
			`в живой базе остались клиники прежнего общего блока: ${rows.map((row) => `${row.id} ${row.name}`).join(", ")}`,
		);
	});

	test("уборка действительно удаляет строки, а не отчитывается об успехе", async (context) => {
		// ГЛАВНАЯ ПРОВЕРКА ЭТОГО ФАЙЛА. Прежняя уборка шла без тенант-контекста:
		// под FORCE RLS `DELETE` не видел ни одной своей строки и снимал ноль, а
		// ноль удалённых строк ошибкой не является — функция доходила до конца и
		// молчала, оставляя клинику в общей базе. Поэтому здесь проверяется не
		// «вызов не бросил исключение», а измеренные числа и состояние базы после.
		const ORG_ID = fixtureUuid("fixtureOrganizationsSelfCheck", 1);
		const PATIENT_ID = fixtureUuid("fixtureOrganizationsSelfCheck", 2);

		try {
			await purgeFixtureOrganizations([ORG_ID]);

			// Сев идёт под тенант-контекстом: без него обе вставки отвергаются
			// кодом 42501 (WITH CHECK у organizations сверяет id = current_tenant,
			// у patients — organization_id = current_tenant).
			await withFixtureTenant(ORG_ID, async (tx) => {
				await tx.insert(organizations).values({ id: ORG_ID, name: "Клиника самопроверки инвентаря" });
				await tx.insert(patients).values({
					id: PATIENT_ID,
					organizationId: ORG_ID,
					fullName: "Самопроверкин Инвентарь Фикстурович",
				});
			});
		} catch (error) {
			if (!isDatabaseUnavailable(error)) throw error;
			return context.skip("база недоступна");
		}

		// Строки действительно легли — считано под обходом, потому что вне
		// тенант-контекста роль приложения их не видит и получила бы ложный ноль.
		const seeded = await withSuperuserBypass(async (tx) => {
			const found = await tx.execute<{ organizations: number; patients: number }>(sql`
				SELECT
					(SELECT count(*)::int FROM organizations WHERE id = ${ORG_ID}::uuid) AS organizations,
					(SELECT count(*)::int FROM patients WHERE id = ${PATIENT_ID}::uuid) AS patients
			`);
			return found.rows[0];
		});
		assert.deepEqual(seeded, { organizations: 1, patients: 1 }, "фикстура не засеялась");

		const report = await purgeFixtureOrganizations([ORG_ID]);
		assert.equal(report.organizationsRemoved, 1, "уборка не сняла саму организацию");
		assert.ok(
			report.rowsRemoved >= 1,
			`уборка не сняла ни одной зависимой строки: ${JSON.stringify(report)}`,
		);
		assert.ok(
			report.tablesTouched.includes("patients"),
			`пациент остался: ${report.tablesTouched.join(", ")}`,
		);

		const left = await withSuperuserBypass(async (tx) => {
			const found = await tx.execute<{ organizations: number; patients: number }>(sql`
				SELECT
					(SELECT count(*)::int FROM organizations WHERE id = ${ORG_ID}::uuid) AS organizations,
					(SELECT count(*)::int FROM patients WHERE id = ${PATIENT_ID}::uuid) AS patients
			`);
			return found.rows[0];
		});
		assert.deepEqual(left, { organizations: 0, patients: 0 }, "уборка отчиталась об успехе, но строки на месте");

		// Повторный вызов на пустом месте — это НЕ ошибка и не должен ею стать:
		// уборка на входе фикстуры вызывается всегда, чаще всего убирать нечего.
		const second = await purgeFixtureOrganizations([ORG_ID]);
		assert.equal(second.organizationsRemoved, 0);
		assert.equal(second.rowsRemoved, 0);
	});

	test("сев чужой организации под контекстом фикстуры отвергается политикой", async (context) => {
		// Изоляция не ослаблена ради фикстуры: тенант-контекст разрешает создать
		// ровно названную организацию и никакую другую. Если бы сев шёл под
		// withSuperuserBypass, эта вставка прошла бы — обход в WITH CHECK у
		// organizations есть и не ограничен ничем.
		const OWN = fixtureUuid("fixtureOrganizationsForeignWrite", 1);
		const FOREIGN = fixtureUuid("fixtureOrganizationsForeignWrite", 2);
		try {
			await purgeFixtureOrganizations([OWN, FOREIGN]);
		} catch (error) {
			if (!isDatabaseUnavailable(error)) throw error;
			return context.skip("база недоступна");
		}

		await assert.rejects(
			() =>
				withFixtureTenant(OWN, async (tx) => {
					await tx.insert(organizations).values({ id: FOREIGN, name: "Чужая клиника" });
				}),
			// Drizzle заворачивает отказ базы в свою ошибку «Failed query: …», а
			// подлинный SQLSTATE кладёт в `cause`. Смотреть надо туда: проверка по
			// коду верхней ошибки прошла бы и на любом другом сбое запроса.
			(error: unknown) => postgresErrorCode(error) === "42501",
			"вставка чужой организации под тенант-контекстом обязана падать с 42501",
		);

		const leaked = await withSuperuserBypass(async (tx) => {
			const found = await tx.execute<{ total: number }>(sql`
				SELECT count(*)::int AS total FROM organizations WHERE id = ${FOREIGN}::uuid
			`);
			return found.rows[0]?.total ?? 0;
		});
		assert.equal(leaked, 0, "чужая организация всё-таки создалась");
	});
});
