import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
	LEGACY_SHARED_FIXTURE_ORGANIZATION_IDS,
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
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
		let rows: { id: string; name: string }[];
		try {
			const found = await db.execute<{ id: string; name: string }>(sql`
				SELECT id, name FROM organizations
				WHERE id IN (${sql.join(
					LEGACY_SHARED_FIXTURE_ORGANIZATION_IDS.map((id) => sql`${id}::uuid`),
					sql`, `,
				)})
			`);
			rows = found.rows;
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
});
