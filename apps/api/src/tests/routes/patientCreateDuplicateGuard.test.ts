import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import Fastify, { type FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { organizations, patients } from "../../db/schema.js";
import { registerPatientRoutes } from "../../routes/patients.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";

/**
 * СОЗДАНИЕ КАРТЫ ПАЦИЕНТА ОДНИМ ФИО ОБХОДИЛО СЕРВЕРНЫЙ ЗАПРЕТ ДУБЛЕЙ.
 *
 * Предикат дубля требовал совпадения имени И (даты рождения ИЛИ телефона), а
 * картотека заводит пациента одним ФИО: поля телефона и даты рождения в шапке
 * экрана скрыты `display: none`, в запрос уходят `phone: null`,
 * `birthDate: null`. Оба слагаемых обращались в false, и сервер отвечал
 * 201 Created на вторую карту того же человека.
 *
 * Клиническая цена: приёмы, оплаты, снимки и документы одного человека
 * расходятся по двум картам, а справка для налогового вычета считается по
 * половине платежей.
 *
 * ЗАЧЕМ ПО ЖИВОЙ БАЗЕ. Маршрут читает список пациентов клиники через
 * getPatientsFromDb и сравнивает с ним. На моке проверялся бы мок. Тест создаёт
 * СВОЮ организацию и удаляет её целиком в after — чужих данных не касается.
 *
 * ГРАНИЦА, КОТОРУЮ ТЕСТ ОХРАНЯЕТ С ДВУХ СТОРОН:
 *   - вторая карта по одному ФИО отклоняется (409) и объяснение называет выход;
 *   - полный тёзка с другим телефоном или другой датой рождения по-прежнему
 *     создаётся (201) — иначе клиника не сможет завести двух разных людей с
 *     одинаковым ФИО, а такие в картотеке настоящие;
 *   - обновление карты, у которой нет ни телефона, ни даты рождения, а в
 *     клинике есть тёзка, НЕ отклоняется: иначе такую карту стало бы
 *     невозможно сохранить вообще.
 *
 * ЗАПУСК (cwd apps/api — из него загрузчик поднимает DATABASE_URL):
 *   cd apps/api && node --import tsx --test src/tests/routes/patientCreateDuplicateGuard.test.ts
 */

const ORG_ID = "dce70000-0000-4000-8000-000000000901";
const EXISTING_PATIENT_ID = "dce70000-0000-4000-8000-000000000911";
const EXISTING_NAME = "Тихонов Аркадий Валентинович";
const EXISTING_PHONE = "+7 916 400-70-80";
const EXISTING_BIRTH_DATE = "1969-05-21";

function isMissingDatabase(error: unknown): boolean {
	const message = error instanceof Error ? error.message : String(error);
	return /ECONNREFUSED|ENOTFOUND|password authentication|does not exist|getaddrinfo|Connection terminated/i.test(message);
}

describe("создание карты пациента: запрет дублей", () => {
	let app: FastifyInstance;
	let clinicHeaders: Record<string, string>;
	let databaseAvailable = true;

	before(async () => {
		app = Fastify();
		await registerPatientRoutes(app);

		// Токен кабинета подписывается штатным секретом сервера; в вывод он не
		// попадает. Маршруты берут организацию ТОЛЬКО из проверенной подписью
		// полезной нагрузки, поэтому заголовком организацию не подменить.
		clinicHeaders = {
			"x-dente-clinic-token": signToken({ organizationId: ORG_ID, clinicId: ORG_ID }, authTokenSecret()),
			"content-type": "application/json"
		};

		try {
			await db.insert(organizations).values({ id: ORG_ID, name: "Клиника запрета дублей" }).onConflictDoNothing();
			await db
				.insert(patients)
				.values({
					id: EXISTING_PATIENT_ID,
					organizationId: ORG_ID,
					fullName: EXISTING_NAME,
					birthDate: EXISTING_BIRTH_DATE,
					phone: EXISTING_PHONE
				})
				.onConflictDoNothing();
		} catch (error) {
			if (!isMissingDatabase(error)) throw error;
			databaseAvailable = false;
		}
	});

	after(async () => {
		if (databaseAvailable) {
			await db.delete(patients).where(eq(patients.organizationId, ORG_ID));
			await db.delete(organizations).where(eq(organizations.id, ORG_ID));
		}
		await app.close();
	});

	test("вторая карта по одному ФИО отклоняется, и отказ называет выход", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "POST",
			url: "/api/patients",
			headers: clinicHeaders,
			// Ровно то, что отправляет картотека при вводе одного ФИО:
			// hooks/domains/usePatientLogic.ts -> nullablePatientDraftValue("") = null.
			payload: { fullName: EXISTING_NAME, phone: null, birthDate: null }
		});

		assert.equal(response.statusCode, 409, response.body);
		const body = JSON.parse(response.body) as { error?: string; message?: string };
		assert.equal(body.error, "PatientNameDuplicateError");
		// Отказ обязан сказать, что делать: открыть существующую карту либо
		// добавить телефон/дату рождения, если это другой человек.
		assert.match(String(body.message), /уже есть/);
		assert.match(String(body.message), /телефон или дату рождения/);

		// Вторая строка в базе не появилась — проверяем базу, а не только ответ.
		const rows = await db.select({ id: patients.id }).from(patients).where(eq(patients.organizationId, ORG_ID));
		assert.equal(rows.length, 1, `в базе ${rows.length} карт вместо одной`);
	});

	test("регистр и лишние пробелы в ФИО дубль не прячут", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "POST",
			url: "/api/patients",
			headers: clinicHeaders,
			payload: { fullName: "  тихонов   аркадий валентинович " }
		});
		assert.equal(response.statusCode, 409, response.body);
	});

	test("полный тёзка с другим телефоном создаётся", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "POST",
			url: "/api/patients",
			headers: clinicHeaders,
			payload: { fullName: EXISTING_NAME, phone: "+7 916 111-22-33" }
		});
		assert.equal(response.statusCode, 201, response.body);
		const created = JSON.parse(response.body) as { id: string };
		assert.ok(created.id, response.body);
	});

	test("полный тёзка с другой датой рождения создаётся", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "POST",
			url: "/api/patients",
			headers: clinicHeaders,
			payload: { fullName: EXISTING_NAME, birthDate: "1991-08-03" }
		});
		assert.equal(response.statusCode, 201, response.body);
	});

	test("тот же телефон при том же ФИО остаётся дублем", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "POST",
			url: "/api/patients",
			headers: clinicHeaders,
			payload: { fullName: EXISTING_NAME, phone: EXISTING_PHONE }
		});
		assert.equal(response.statusCode, 409, response.body);
		assert.equal((JSON.parse(response.body) as { error?: string }).error, "PatientDuplicateError");
	});

	test("новое ФИО создаётся без помех", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "POST",
			url: "/api/patients",
			headers: clinicHeaders,
			payload: { fullName: "Незнакомцев Пётр Ильич" }
		});
		assert.equal(response.statusCode, 201, response.body);
	});

	test("карту без телефона и даты рождения при наличии тёзки всё равно можно сохранить", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		// Карта без отличительных данных плюс живой тёзка в той же клинике — это
		// ровно тот набор, на котором строгое правило создания заперло бы
		// сохранение существующей карты.
		const nameless = "Безымянникова Вера Олеговна";
		const first = await app.inject({
			method: "POST",
			url: "/api/patients",
			headers: clinicHeaders,
			payload: { fullName: nameless, phone: "+7 916 555-00-11" }
		});
		assert.equal(first.statusCode, 201, first.body);
		const twinId = (JSON.parse(first.body) as { id: string }).id;

		const plain = await app.inject({
			method: "POST",
			url: "/api/patients",
			headers: clinicHeaders,
			payload: { fullName: nameless, birthDate: "2000-02-02" }
		});
		assert.equal(plain.statusCode, 201, plain.body);
		const plainId = (JSON.parse(plain.body) as { id: string }).id;

		// Тёзка существует; сохраняем карту без телефона и без даты рождения.
		const saved = await app.inject({
			method: "PUT",
			url: `/api/patients/${plainId}`,
			headers: clinicHeaders,
			payload: { fullName: nameless, phone: null, birthDate: null, notes: "аллергия на лидокаин" }
		});
		assert.equal(saved.statusCode, 200, saved.body);
		assert.equal((JSON.parse(saved.body) as { notes?: string }).notes, "аллергия на лидокаин");
		void twinId;
	});
});
