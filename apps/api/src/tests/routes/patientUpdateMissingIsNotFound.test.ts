import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";

/**
 * ПРАВКА ОТСУТСТВУЮЩЕЙ КАРТЫ — ЭТО 404, А НЕ 500 «ДАННЫЕ МОГЛИ БЫТЬ ЗАПИСАНЫ».
 *
 * ЧТО БЫЛО СЛОМАНО. Подпись `updatePatientInDb` объявляет `Patient | null`, и
 * ветка базы её соблюдает. А путь без базы нет: `sampleData.updatePatient`
 * БРОСАЕТ `Error("Пациент не найден")`. Поэтому ветка маршрута
 * `if (!patient) return sendPatientNotFound(reply)` (`routes/patients.ts:436`)
 * была НЕДОСТИЖИМА: бросок улетал в `catch` строкой ниже и оператор получал 500
 * с текстом «данные могли быть записаны».
 *
 * ЧТО ЭТО ЗНАЧИЛО ДЛЯ КЛИНИКИ. Администратор правит карту, получает «возможно,
 * записалось» — и делает то, что прямо описано в комментарии того же `catch`:
 * считает, что не сохранилось, и заводит карточку заново. Появляется дубль уже
 * существующего пациента, то есть ровно тот дефект, против которого комментарий и
 * написан. Хуже: 404 и 500 требуют от оператора РАЗНЫХ действий — «проверьте
 * идентификатор» против «попробуйте позже», — а он получал второе вместо первого.
 *
 * ПОЧЕМУ ПРОВЕРЯЕТСЯ ПУТЬ БЕЗ БАЗЫ. Именно он расходился с подписью; ветка базы
 * возвращала `null` и была права. Режим включается `DENTAL_STATE_PERSISTENCE=off`
 * — тем же флагом, которым пользуются сценарии прогона.
 */

const NAMESPACE = "patientUpdateMissingIsNotFound";
const ORGANIZATION_ID = fixtureUuid(NAMESPACE, 1);
const MISSING_PATIENT = "00000000-0000-4000-8000-0000000000ff";

describe("правка отсутствующей карты пациента", () => {
	let databaseReady = true;

	before(async () => {
		try {
			await purgeFixtureOrganizations([ORGANIZATION_ID]);
		} catch (error) {
			if (!isDatabaseUnavailable(error)) throw error;
			databaseReady = false;
            return;
		}

        await withFixtureTenant(ORGANIZATION_ID, async () => {
            const { organizations } = await import("../../db/schema.js");
            const { db } = await import("../../db/client.js");
            await db.insert(organizations).values({
                id: ORGANIZATION_ID,
                name: "Test Org for missing patient update",
            });
        });
	});

	after(async () => {
		if (!databaseReady) return;
		await purgeFixtureOrganizations([ORGANIZATION_ID]);
	});

	test("слой доступа отдаёт null, а не бросает исключение", async () => {
		if (!databaseReady) return;
		const { updatePatientInDb } = await import("../../db/patientsQuery.js");
		await withFixtureTenant(ORGANIZATION_ID, async () => {
			const result = await updatePatientInDb(
				ORGANIZATION_ID,
				MISSING_PATIENT,
				{
					fullName: "Никого Такого Нет",
				},
			);
			assert.equal(
				result,
				null,
				"слой доступа бросил исключение вместо null: маршрут не сможет ответить 404, " +
					"и оператор получит 500 «данные могли быть записаны» на карту, которой нет",
			);
		});
	});

	test("проверка не выродилась: существующая карта правится и возвращается", async () => {
		if (!databaseReady) return;
		const { updatePatientInDb, createPatientSafeInDb } = await import("../../db/patientsQuery.js");
		await withFixtureTenant(ORGANIZATION_ID, async () => {
			const creation = await createPatientSafeInDb(ORGANIZATION_ID, {
				fullName: "Тестовый Пациент",
				phone: "+79001234567",
			}, () => false);
			
			assert.equal(creation.type, "success");
			if (creation.type !== "success") return;
			const existing = creation.patient;

			const updated = await updatePatientInDb(
				ORGANIZATION_ID,
				existing.id,
				{
					notes: "Замок правки существующей карты",
				},
			);
			assert.ok(
				updated,
				"существующая карта вернулась как null: правка сломала рабочий случай, а не только отсутствующий",
			);
			assert.equal(updated.id, existing.id);
		});
	});
});
