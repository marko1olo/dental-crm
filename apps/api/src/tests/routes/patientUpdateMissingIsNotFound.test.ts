import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

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

const MISSING_PATIENT = "00000000-0000-4000-8000-0000000000ff";

describe("правка отсутствующей карты пациента", () => {
	const saved = {
		persistence: process.env.DENTAL_STATE_PERSISTENCE,
	};

	before(() => {
		process.env.DENTAL_STATE_PERSISTENCE = "off";
	});

	after(() => {
		if (saved.persistence === undefined) delete process.env.DENTAL_STATE_PERSISTENCE;
		else process.env.DENTAL_STATE_PERSISTENCE = saved.persistence;
	});

	test("слой доступа отдаёт null, а не бросает исключение", async () => {
		const { updatePatientInDb } = await import("../../db/patientsQuery.js");
		const result = await updatePatientInDb("d0000000-0000-4000-8000-00000000d001", MISSING_PATIENT, {
			fullName: "Никого Такого Нет",
		});
		assert.equal(
			result,
			null,
			"слой доступа бросил исключение вместо null: маршрут не сможет ответить 404, " +
				"и оператор получит 500 «данные могли быть записаны» на карту, которой нет",
		);
	});

	test("проверка не выродилась: существующая карта правится и возвращается", async () => {
		const { updatePatientInDb } = await import("../../db/patientsQuery.js");
		const { patients: inMemoryPatients } = await import("../../sampleData.js");
		const existing = inMemoryPatients[0];
		assert.ok(existing, "в памяти нет ни одного пациента — сравнивать не с чем, проверка бессодержательна");

		const updated = await updatePatientInDb(existing.organizationId, existing.id, {
			notes: "Замок правки существующей карты",
		});
		assert.ok(
			updated,
			"существующая карта вернулась как null: правка сломала рабочий случай, а не только отсутствующий",
		);
		assert.equal(updated.id, existing.id);
	});
});
