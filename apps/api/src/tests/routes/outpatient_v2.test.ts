import assert from "node:assert";
import { afterEach, beforeEach, describe, test } from "node:test";
import Fastify from "fastify";
import { eq, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
	clinicalTeethCatalog,
	organizations,
	outpatientVerifications,
	patients,
	patientToothDefects,
	toothDefectsCatalog,
	users,
	visits,
} from "../../db/schema.js";
import { seedClinicalCore } from "../../db/seeds/seed_clinical_core.js";
import { registerOutpatientV2Routes } from "../../routes/outpatient_v2.js";

const TEST_ORG_ID = "11111111-1111-1111-1111-111111111111";
const TEST_HEADERS = {
	"x-organization-id": TEST_ORG_ID,
};

describe("Outpatient v2 & Clinical Core Integration Tests", () => {
	let app: import("fastify").FastifyInstance;
	const originalEnv = process.env;

	let testPatientId: string;
	let testDoctorId: string;
	let testVisitId: string;
	let testVerificationId: string;

	beforeEach(async () => {
		process.env = { ...originalEnv };
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
		process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1";
		process.env.NODE_ENV = "development";

		// Убеждаемся, что клинический контур засеян
		await seedClinicalCore();

		// Создаем тестовую организацию, врача, пациента и визит
		await db
			.insert(organizations)
			.values({
				id: TEST_ORG_ID,
				name: "Клинический Тестовый Центр DENTE",
			})
			.onConflictDoNothing();

		const [user] = await db
			.insert(users)
			.values({
				organizationId: TEST_ORG_ID,
				fullName: "Д-р Иванов Иван Иванович (Главврач)",
				role: "owner",
				email: `doc-${Date.now()}@clinic.com`,
				phone: `+7999${Math.floor(1000000 + Math.random() * 9000000)}`,
			})
			.returning();
		testDoctorId = user.id;

		const [patient] = await db
			.insert(patients)
			.values({
				organizationId: TEST_ORG_ID,
				fullName: "Смирнов Алексей Петрович",
				phone: `+7911${Math.floor(1000000 + Math.random() * 9000000)}`,
			})
			.returning();
		testPatientId = patient.id;

		const [visit] = await db
			.insert(visits)
			.values({
				organizationId: TEST_ORG_ID,
				patientId: testPatientId,
				status: "draft",
				complaint: "Острая ночная боль в области зуба 1.6",
				diagnosis: "K04.0 Острый очаговый пульпит",
			})
			.returning();
		testVisitId = visit.id;

		const deadline = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 часа дедлайн
		const [verif] = await db
			.insert(outpatientVerifications)
			.values({
				organizationId: TEST_ORG_ID,
				visitId: testVisitId,
				patientId: testPatientId,
				doctorId: testDoctorId,
				status: "review",
				editableDeadline: deadline,
				submittedAt: new Date(),
			})
			.returning();
		testVerificationId = verif.id;

		app = Fastify();
		await registerOutpatientV2Routes(app);
	});

	afterEach(async () => {
		if (app) await app.close();
		// Очистка тестовых записей
		if (testPatientId) {
			await db.delete(patientToothDefects).where(eq(patientToothDefects.patientId, testPatientId));
			await db.delete(outpatientVerifications).where(eq(outpatientVerifications.patientId, testPatientId));
			await db.delete(visits).where(eq(visits.patientId, testPatientId));
			await db.delete(patients).where(eq(patients.id, testPatientId));
		}
		if (testDoctorId) {
			await db.delete(users).where(eq(users.id, testDoctorId));
		}
		process.env = originalEnv;
	});

	test("GET /api/catalogs/teeth возвращает 55 сущностей (32 постоянных, 20 молочных, челюсти JU/JL и прикус C)", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/catalogs/teeth",
		});

		assert.strictEqual(res.statusCode, 200);
		const body = JSON.parse(res.body);
		assert.strictEqual(body.count, 55);
		assert.strictEqual(body.teeth.length, 55);

		// Проверка постоянных зубов
		const tooth11 = body.teeth.find((t: any) => t.code === "11");
		assert.ok(tooth11);
		assert.strictEqual(tooth11.type, "T");
		assert.strictEqual(tooth11.isChild, false);

		// Проверка молочных зубов
		const tooth51 = body.teeth.find((t: any) => t.code === "51");
		assert.ok(tooth51);
		assert.strictEqual(tooth51.type, "T");
		assert.strictEqual(tooth51.isChild, true);

		// Проверка челюстей и прикуса
		const jawUpper = body.teeth.find((t: any) => t.code === "JU");
		assert.ok(jawUpper);
		assert.strictEqual(jawUpper.type, "J");

		const jawLower = body.teeth.find((t: any) => t.code === "JL");
		assert.ok(jawLower);
		assert.strictEqual(jawLower.type, "J");

		const biteCentric = body.teeth.find((t: any) => t.code === "C");
		assert.ok(biteCentric);
		assert.strictEqual(biteCentric.type, "J");
	});

	test("GET /api/catalogs/tooth-defects возвращает 91 дефект и фильтрует по группам", async () => {
		const resAll = await app.inject({
			method: "GET",
			url: "/api/catalogs/tooth-defects",
		});
		assert.strictEqual(resAll.statusCode, 200);
		const bodyAll = JSON.parse(resAll.body);
		assert.strictEqual(bodyAll.count, 91);

		// Фильтр по outpatient (37 дефектов: кариес, пульпит, пломба, рецессия и др.)
		const resOutpatient = await app.inject({
			method: "GET",
			url: "/api/catalogs/tooth-defects?type=outpatient",
		});
		assert.strictEqual(resOutpatient.statusCode, 200);
		const bodyOutpatient = JSON.parse(resOutpatient.body);
		assert.strictEqual(bodyOutpatient.count, 37);

		// Фильтр по anomaly (20 дефектов)
		const resAnomaly = await app.inject({
			method: "GET",
			url: "/api/catalogs/tooth-defects?type=anomaly",
		});
		assert.strictEqual(resAnomaly.statusCode, 200);
		const bodyAnomaly = JSON.parse(resAnomaly.body);
		assert.strictEqual(bodyAnomaly.count, 20);

		// Проверка дерева дефектов
		const resTree = await app.inject({
			method: "GET",
			url: "/api/catalogs/tooth-defects/tree",
		});
		assert.strictEqual(resTree.statusCode, 200);
		const bodyTree = JSON.parse(resTree.body);
		assert.strictEqual(bodyTree.totalCount, 91);
		assert.ok(bodyTree.tree.outpatient.require_treatment);
		assert.ok(bodyTree.tree.outpatient.cured_teeth);
	});

	test("GET /api/catalogs/mkb/categories/tree возвращает 1 841 категорию и фильтрует стоматологический кластер", async () => {
		// Поиск по стоматологическому кластеру K00-K14
		const resDental = await app.inject({
			method: "GET",
			url: "/api/catalogs/mkb/categories/tree?dentalOnly=1",
		});
		assert.strictEqual(resDental.statusCode, 200);
		const bodyDental = JSON.parse(resDental.body);
		assert.ok(bodyDental.count >= 15);
		const hasK02 = bodyDental.items.some((i: any) => i.code === "K02");
		assert.strictEqual(hasK02, true);

		// Полнотекстовый поиск нозологии
		const resSearch = await app.inject({
			method: "GET",
			url: "/api/catalogs/mkb/categories/tree?search=Кариес",
		});
		assert.strictEqual(resSearch.statusCode, 200);
		const bodySearch = JSON.parse(resSearch.body);
		assert.ok(bodySearch.count > 0);
		assert.ok(bodySearch.items.some((i: any) => i.code === "K02"));
	});

	test("GET /api/outpatient/templates возвращает 448 клинических шаблонов 043/у", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/outpatient/templates?limit=500",
		});
		assert.strictEqual(res.statusCode, 200);
		const body = JSON.parse(res.body);
		assert.strictEqual(body.count, 448);
		assert.strictEqual(body.categories.length, 42);

		// Фильтр по рубрике "Кариес" (id: 60)
		const resCaries = await app.inject({
			method: "GET",
			url: "/api/outpatient/templates?categoryId=60",
		});
		assert.strictEqual(resCaries.statusCode, 200);
		const bodyCaries = JSON.parse(resCaries.body);
		assert.ok(bodyCaries.count > 0);
		assert.ok(bodyCaries.templates.every((t: any) => t.categoryId === 60));
	});

	test("Клинический контур пациента: назначение множественных патологий на зуб и челюсть, снятие и излечение", async () => {
		// 1. Назначаем Кариес (defectId: 6) на зуб 16
		const resCaries = await app.inject({
			method: "POST",
			url: `/api/patients/${testPatientId}/tooth-defects`,
			headers: TEST_HEADERS,
			payload: {
				toothCode: "16",
				defectId: 6, // Кариес
				visitId: testVisitId,
				comment: "Глубокая кариозная полость на дистальной поверхности",
			},
		});
		assert.strictEqual(resCaries.statusCode, 201);
		const bodyCaries = JSON.parse(resCaries.body);
		assert.strictEqual(bodyCaries.success, true);
		assert.strictEqual(bodyCaries.defect.toothCode, "16");

		// 2. Назначаем Пломбу (defectId: 3) на ТОТ ЖЕ САМЫЙ зуб 16 (доказываем сосуществование множественных дефектов)
		const resFilling = await app.inject({
			method: "POST",
			url: `/api/patients/${testPatientId}/tooth-defects`,
			headers: TEST_HEADERS,
			payload: {
				toothCode: "16",
				defectId: 3, // Пломба
				visitId: testVisitId,
				comment: "Старая несостоятельная композитная пломба на окклюзии",
			},
		});
		assert.strictEqual(resFilling.statusCode, 201);

		// 3. Назначаем дефект на всю челюсть "JU" (Верхняя челюсть)
		const resJaw = await app.inject({
			method: "POST",
			url: `/api/patients/${testPatientId}/tooth-defects`,
			headers: TEST_HEADERS,
			payload: {
				toothCode: "JU",
				defectId: 10, // Пародонтит легкий
				visitId: testVisitId,
				comment: "Генерализованный процесс верхней челюсти",
			},
		});
		assert.strictEqual(resJaw.statusCode, 201);

		// 4. Проверяем активную одонтограмму пациента
		const resGet = await app.inject({
			method: "GET",
			url: `/api/patients/${testPatientId}/tooth-defects`,
			headers: TEST_HEADERS,
		});
		assert.strictEqual(resGet.statusCode, 200);
		const bodyGet = JSON.parse(resGet.body);
		assert.strictEqual(bodyGet.count, 3);

		// Фильтр по зубу 16 — должно быть ровно 2 дефекта одновременно
		const resTooth16 = await app.inject({
			method: "GET",
			url: `/api/patients/${testPatientId}/tooth-defects?toothCode=16`,
			headers: TEST_HEADERS,
		});
		assert.strictEqual(resTooth16.statusCode, 200);
		const bodyTooth16 = JSON.parse(resTooth16.body);
		assert.strictEqual(bodyTooth16.count, 2);

		// 5. Проверка отклонения невалидного номера зуба
		const resInvalidTooth = await app.inject({
			method: "POST",
			url: `/api/patients/${testPatientId}/tooth-defects`,
			headers: TEST_HEADERS,
			payload: {
				toothCode: "99",
				defectId: 6,
			},
		});
		assert.strictEqual(resInvalidTooth.statusCode, 400);

		// 6. Излечение дефекта (resolveOnly = true)
		const defectToResolve = bodyCaries.defect.id;
		const resResolve = await app.inject({
			method: "DELETE",
			url: `/api/patients/${testPatientId}/tooth-defects/${defectToResolve}?resolveOnly=true`,
			headers: TEST_HEADERS,
		});
		assert.strictEqual(resResolve.statusCode, 200);
		const bodyResolve = JSON.parse(resResolve.body);
		assert.strictEqual(bodyResolve.action, "resolved");
		assert.ok(bodyResolve.defect.resolvedAt);

		// После излечения в активных дефектах зуба 16 остался только 1 дефект (пломба)
		const resActive = await app.inject({
			method: "GET",
			url: `/api/patients/${testPatientId}/tooth-defects?toothCode=16&activeOnly=true`,
			headers: TEST_HEADERS,
		});
		const bodyActive = JSON.parse(resActive.body);
		assert.strictEqual(bodyActive.count, 1);
		assert.strictEqual(bodyActive.defects[0].defectId, 3);
	});

	test("Контур контроля качества начмедом: очередь, 24-часовой дедлайн и модерация карты", async () => {
		// 1. Проверка очереди верификации начмеда
		const resQueue = await app.inject({
			method: "GET",
			url: "/api/outpatient/verify?status=review",
			headers: TEST_HEADERS,
		});
		assert.strictEqual(resQueue.statusCode, 200);
		const bodyQueue = JSON.parse(resQueue.body);
		assert.ok(bodyQueue.count >= 1);
		const item = bodyQueue.queue.find((q: any) => q.id === testVerificationId);
		assert.ok(item);
		assert.strictEqual(item.isEditableDeadlineExpired, false);

		// 2. Проверка статуса замка редактирования визита
		const resLock = await app.inject({
			method: "GET",
			url: `/api/outpatient/verify/visit/${testVisitId}/lock-status`,
			headers: TEST_HEADERS,
		});
		assert.strictEqual(resLock.statusCode, 200);
		const bodyLock = JSON.parse(resLock.body);
		assert.strictEqual(bodyLock.hasVerificationRecord, true);
		assert.strictEqual(bodyLock.canEdit, true);

		// 3. Возврат на доработку без причины — отклоняется с 400
		const resRejectEmpty = await app.inject({
			method: "PUT",
			url: `/api/outpatient/verify/${testVerificationId}/status`,
			headers: TEST_HEADERS,
			payload: {
				status: "rejected",
				rejectionReason: "   ",
			},
		});
		assert.strictEqual(resRejectEmpty.statusCode, 400);

		// 4. Возврат на доработку с замечанием начмеда
		const resReject = await app.inject({
			method: "PUT",
			url: `/api/outpatient/verify/${testVerificationId}/status`,
			headers: TEST_HEADERS,
			payload: {
				status: "rejected",
				rejectionReason: "Отсутствует рентген-контроль обтурации каналов и дозиметрия",
			},
		});
		assert.strictEqual(resReject.statusCode, 200);
		const bodyReject = JSON.parse(resReject.body);
		assert.strictEqual(bodyReject.verification.status, "rejected");
		assert.strictEqual(
			bodyReject.verification.rejectionReason,
			"Отсутствует рентген-контроль обтурации каналов и дозиметрия",
		);

		// 5. Утверждение карты начмедом
		const resApprove = await app.inject({
			method: "PUT",
			url: `/api/outpatient/verify/${testVerificationId}/status`,
			headers: TEST_HEADERS,
			payload: {
				status: "approved",
			},
		});
		assert.strictEqual(resApprove.statusCode, 200);
		const bodyApprove = JSON.parse(resApprove.body);
		assert.strictEqual(bodyApprove.verification.status, "approved");
		assert.ok(bodyApprove.verification.verifiedAt);
	});
});
