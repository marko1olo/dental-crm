import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { and, eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../db/client.js";
import {
	generatedDocuments,
	organizations,
	patientRelationships,
	patients,
	users,
} from "../db/schema.js";
import { idempotencyKeys } from "../db/schema/idempotency.js";
import { registerPediatricDiplomaRoutes } from "../routes/pediatric/pediatricDiplomaRoutes.js";
import { registerPediatricPresetRoutes, CANONICAL_PEDIATRIC_PRESETS } from "../routes/pediatric/pediatricPresets.js";
import {
	ORDER_804N_PEDIATRIC_SERVICES,
	PEDIATRIC_804N_CATALOG,
	generatePediatricParentRecommendations,
} from "@dental/shared";
import { authTokenSecret } from "../security/authSecret.js";
import { signToken } from "../utils/cryptoHelper.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	withFixtureTenant,
} from "./support/fixtureOrganizations.js";
import { createIdempotentTenantTestApp } from "./support/tenantTestApp.js";

const FIXTURE = "pediatricFixer";
const ORG_ID = fixtureUuid(FIXTURE, 1);
const DOCTOR_ID = fixtureUuid(FIXTURE, 10);
const CHILD_PATIENT_ID = fixtureUuid(FIXTURE, 20);

describe("Pediatric Fixer Surgeon — Comprehensive Domain 1 Defect Elimination Suite", () => {
	let app: FastifyInstance;
	let tokenDoctor: string;
	let dbAvailable = true;

	before(async () => {
		try {
			await withFixtureTenant(ORG_ID, async (tx) => {
				await tx.execute(sql`SELECT 1`);
			});
		} catch (err) {
			if (isDatabaseUnavailable(err)) {
				dbAvailable = false;
				console.warn("[PEDIATRIC_FIXER_TEST] Database unavailable, skipping suite");
				return;
			}
			throw err;
		}

		await withFixtureTenant(ORG_ID, async (tx) => {
			// Clean prior fixture state
			await tx.delete(generatedDocuments).where(eq(generatedDocuments.organizationId, ORG_ID));
			await tx.delete(patientRelationships).where(eq(patientRelationships.organizationId, ORG_ID));
			await tx.delete(idempotencyKeys).where(eq(idempotencyKeys.clinicId, ORG_ID));
			await tx.delete(patients).where(eq(patients.organizationId, ORG_ID));
			await tx.delete(users).where(eq(users.organizationId, ORG_ID));
			await tx.delete(organizations).where(eq(organizations.id, ORG_ID));

			// Seed organization, doctor, child patient
			await tx.insert(organizations).values({
				id: ORG_ID,
				name: "Клиника DENTE Юный Герой",
				email: "hero-kids@test.local",
			}).onConflictDoNothing();

			await tx.insert(users).values({
				id: DOCTOR_ID,
				organizationId: ORG_ID,
				email: "dr.pediatric@test.local",
				fullName: "Др. Смирнова Анна Павловна",
				role: "doctor",
				isActive: true,
			}).onConflictDoNothing();

			await tx.insert(patients).values({
				id: CHILD_PATIENT_ID,
				organizationId: ORG_ID,
				fullName: "Смирнов Артём Михайлович",
				birthDate: "2019-04-12",
				phone: "+7 (999) 111-22-33",
			}).onConflictDoNothing();
		});

		app = await createIdempotentTenantTestApp();
		registerPediatricDiplomaRoutes(app);
		registerPediatricPresetRoutes(app);

		const secret = authTokenSecret();
		tokenDoctor = signToken(
			{
				userId: DOCTOR_ID,
				organizationId: ORG_ID,
				role: "doctor",
			},
			secret,
			3600,
		);
	});

	after(async () => {
		if (app) {
			await app.close();
		}
	});

	// ─── 1. BRAVERY DIPLOMA WITH IDEMPOTENCY (DEFECT 2) ──────────────────────────
	it("1. Issues bravery diploma with Idempotency-Key support and prevents duplicate records (Mandates 8d, 8bo)", async (t) => {
		if (!dbAvailable) return t.skip();

		const idempotencyKey = "01950000-0000-7000-8000-000000000101";
		const payload = {
			patientName: "Артём Смирнов",
			patientAgeYears: 5,
			doctorName: "Др. Смирнова А.П.",
			clinicName: "Клиника DENTE Юный Герой",
			awardReasonRu: "За выдающееся мужество и победу над Кариозным Монстром!",
		};

		// 1a. Первый выпуск диплома
		const res1 = await app.inject({
			method: "POST",
			url: `/api/patients/${CHILD_PATIENT_ID}/pediatric/bravery-diploma`,
			headers: {
				"x-dente-staff-token": tokenDoctor,
				"idempotency-key": idempotencyKey,
			},
			payload,
		});

		assert.equal(res1.statusCode, 201);
		const body1 = JSON.parse(res1.body);
		assert.equal(body1.success, true);
		assert.equal(body1.diploma.patientName, "Артём Смирнов");
		assert.ok(body1.diploma.diplomaNumber.startsWith("ДИПЛОМ-ГЕРОЙ-"));
		assert.ok(body1.diploma.id);

		// 1b. Повторный вызов с тем же Idempotency-Key — должен вернуть idempotency-replayed без создания дубля
		const res2 = await app.inject({
			method: "POST",
			url: `/api/patients/${CHILD_PATIENT_ID}/pediatric/bravery-diploma`,
			headers: {
				"x-dente-staff-token": tokenDoctor,
				"idempotency-key": idempotencyKey,
			},
			payload,
		});

		assert.equal(res2.statusCode, 201);
		assert.equal(res2.headers["idempotency-replayed"], "true");
		const body2 = JSON.parse(res2.body);
		assert.equal(body2.success, true);
		assert.equal(body2.diploma.id, body1.diploma.id, "ID диплома должен совпадать при повторе");

		// 1c. GET дипломов пациента
		const resGet = await app.inject({
			method: "GET",
			url: `/api/patients/${CHILD_PATIENT_ID}/pediatric/bravery-diploma`,
			headers: {
				"x-dente-staff-token": tokenDoctor,
			},
		});

		assert.equal(resGet.statusCode, 200);
		const bodyGet = JSON.parse(resGet.body);
		assert.equal(bodyGet.success, true);
		assert.equal(bodyGet.diplomas.length, 1, "В базе должен быть ровно 1 диплом");
		assert.equal(bodyGet.diplomas[0].id, body1.diploma.id);
	});

	// ─── 2. PARENT MEMO PERSISTENCE IN GENERATED_DOCUMENTS (DEFECT 3) ────────────
	it("2. Persists parent memo into generatedDocuments under kind 'parent_memo' with Idempotency-Key (Defect 3)", async (t) => {
		if (!dbAvailable) return t.skip();

		const idempotencyKey = "01950000-0000-7000-8000-000000000201";
		const payload = {
			patientName: "Артём Смирнов",
			patientPhone: "+7 (999) 111-22-33",
			patientAgeYears: 5,
			doctorName: "Др. Смирнова А.П.",
			clinicName: "Клиника DENTE Юный Герой",
			clinicPhone: "+7 (495) 123-45-67",
			franklRating: 3,
			hasAnesthesia: true,
			hasPulpotomy: true,
			pulpotomyTooth: 54,
			hasFissureSealing: false,
			hasSilvering: false,
			customNotes: "Не кушать до отхода заморозки (2 часа)",
			memoText: "ПАМЯТКА РОДИТЕЛЯМ ПОСЛЕ ЛЕЧЕНИЯ ЗУБА 54:\n- Не давать твёрдую пищу до окончания анестезии\n- Следить, чтобы не прикусывал щёку",
		};

		// 2a. POST сохранение памятки
		const resPost = await app.inject({
			method: "POST",
			url: `/api/patients/${CHILD_PATIENT_ID}/pediatric/parent-memo`,
			headers: {
				"x-dente-staff-token": tokenDoctor,
				"idempotency-key": idempotencyKey,
			},
			payload,
		});

		assert.equal(resPost.statusCode, 201);
		const bodyPost = JSON.parse(resPost.body);
		assert.equal(bodyPost.success, true);
		assert.ok(bodyPost.memo.id);
		assert.ok(bodyPost.memo.memoNumber.startsWith("ПАМЯТКА-РОДИТЕЛЯМ-"));
		assert.equal(bodyPost.memo.patientName, "Артём Смирнов");
		assert.equal(bodyPost.memo.hasAnesthesia, true);
		assert.equal(bodyPost.memo.pulpotomyTooth, 54);

		// 2b. Повторный POST с тем же ключом идемпотентности
		const resReplay = await app.inject({
			method: "POST",
			url: `/api/patients/${CHILD_PATIENT_ID}/pediatric/parent-memo`,
			headers: {
				"x-dente-staff-token": tokenDoctor,
				"idempotency-key": idempotencyKey,
			},
			payload,
		});

		assert.equal(resReplay.statusCode, 201);
		assert.equal(resReplay.headers["idempotency-replayed"], "true");
		const bodyReplay = JSON.parse(resReplay.body);
		assert.equal(bodyReplay.memo.id, bodyPost.memo.id, "ID памятки должен совпадать при реплее");

		// 2c. GET список памяток родителям
		const resGet = await app.inject({
			method: "GET",
			url: `/api/patients/${CHILD_PATIENT_ID}/pediatric/parent-memo`,
			headers: {
				"x-dente-staff-token": tokenDoctor,
			},
		});

		assert.equal(resGet.statusCode, 200);
		const bodyGet = JSON.parse(resGet.body);
		assert.equal(bodyGet.success, true);
		assert.equal(bodyGet.memos.length, 1);
		assert.equal(bodyGet.memos[0].id, bodyPost.memo.id);
		assert.equal(bodyGet.memos[0].pulpotomyTooth, 54);

		// 2d. Прямая верификация в таблице generatedDocuments
		const [docInDb] = await withFixtureTenant(ORG_ID, async (tx) =>
			tx
				.select()
				.from(generatedDocuments)
				.where(
					and(
						eq(generatedDocuments.organizationId, ORG_ID),
						eq(generatedDocuments.id, bodyPost.memo.id)
					)
				)
				.limit(1)
		);

		assert.ok(docInDb, "Запись должна физически существовать в generatedDocuments");
		assert.equal(docInDb.kind, "parent_memo");
		assert.equal(docInDb.title, "Памятка родителям");
	});

	// ─── 3. LEGAL REPRESENTATIVE SYNC TO PATIENT_RELATIONSHIPS (DEFECT 5) ────────
	it("3. Syncs legal representative to patient_relationships table with full rights (Defect 5, Mandate 8e, 8bo)", async (t) => {
		if (!dbAvailable) return t.skip();

		const idempotencyKey = "01950000-0000-7000-8000-000000000301";
		const payload = {
			fullName: "Смирнова Ольга Владимировна",
			phone: "+7 (999) 777-88-99",
			role: "Мать" as const,
			consentSigned: true,
			statutoryDocument: "Свидетельство о рождении серия IV-МЮ № 654321",
		};

		// 3a. POST сохранение законного представителя
		const resPost = await app.inject({
			method: "POST",
			url: `/api/patients/${CHILD_PATIENT_ID}/pediatric/legal-representative`,
			headers: {
				"x-dente-staff-token": tokenDoctor,
				"idempotency-key": idempotencyKey,
			},
			payload,
		});

		assert.equal(resPost.statusCode, 200);
		const bodyPost = JSON.parse(resPost.body);
		assert.equal(bodyPost.success, true);
		assert.ok(bodyPost.representative.id);
		assert.equal(bodyPost.representative.fullName, "Смирнова Ольга Владимировна");
		assert.equal(bodyPost.representative.role, "Мать");
		assert.equal(bodyPost.representative.relationshipType, "mother");
		assert.equal(bodyPost.representative.isLegalRepresentative, true);
		assert.equal(bodyPost.representative.consentSigned, true);

		// 3b. Верификация в таблице patient_relationships
		const [relInDb] = await withFixtureTenant(ORG_ID, async (tx) =>
			tx
				.select()
				.from(patientRelationships)
				.where(
					and(
						eq(patientRelationships.organizationId, ORG_ID),
						eq(patientRelationships.patientId, CHILD_PATIENT_ID)
					)
				)
				.limit(1)
		);

		assert.ok(relInDb, "Связь должна быть сохранена в patient_relationships");
		assert.equal(relInDb.isLegalRepresentative, true);
		assert.equal(relInDb.canSignConsents, true);
		assert.equal(relInDb.canViewMedicalRecord, true);
		assert.equal(relInDb.canSpendFamilyWallet, true);
		assert.equal(relInDb.documentProofNumber, "Свидетельство о рождении серия IV-МЮ № 654321");

		// 3c. GET получение законного представителя
		const resGet = await app.inject({
			method: "GET",
			url: `/api/patients/${CHILD_PATIENT_ID}/pediatric/legal-representative`,
			headers: {
				"x-dente-staff-token": tokenDoctor,
			},
		});

		assert.equal(resGet.statusCode, 200);
		const bodyGet = JSON.parse(resGet.body);
		assert.equal(bodyGet.success, true);
		assert.ok(bodyGet.representative);
		assert.equal(bodyGet.representative.fullName, "Смирнова Ольга Владимировна");
		assert.equal(bodyGet.representative.role, "Мать");
		assert.equal(bodyGet.representative.consentSigned, true);

		// 3d. Обновление законного представителя (например, отец на следующем приёме)
		const resUpdate = await app.inject({
			method: "POST",
			url: `/api/patients/${CHILD_PATIENT_ID}/pediatric/legal-representative`,
			headers: {
				"x-dente-staff-token": tokenDoctor,
				"idempotency-key": "01950000-0000-7000-8000-000000000302",
			},
			payload: {
				fullName: "Смирнов Михаил Александрович (отец)",
				phone: "+7 (999) 777-88-00",
				role: "Отец" as const,
				consentSigned: true,
			},
		});

		assert.equal(resUpdate.statusCode, 200);
		const bodyUpdate = JSON.parse(resUpdate.body);
		assert.equal(bodyUpdate.success, true);
		assert.equal(bodyUpdate.representative.fullName, "Смирнов Михаил Александрович (отец)");
		assert.equal(bodyUpdate.representative.role, "Отец");
		assert.equal(bodyUpdate.representative.relationshipType, "father");
	});

	// ─── 4. PEDIATRIC PROTOCOL PRESETS: IADT TRAUMA & SPACE MAINTAINER ──────────
	it("4. Serves canonical pediatric presets including trauma_iadt and space_maintainer (Mandate 8e, 8x)", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/pediatric/presets",
		});

		assert.equal(res.statusCode, 200);
		const body = JSON.parse(res.body);
		assert.equal(body.success, true);
		assert.equal(body.count, 10, "Должно быть ровно 10 канонических детских пресетов");

		const traumaPreset = body.presets.find((p: { id: string }) => p.id === "trauma_iadt");
		assert.ok(traumaPreset, "Пресет острой травмы IADT должен присутствовать");
		assert.equal(traumaPreset.serviceCode, "A16.07.019");
		assert.equal(traumaPreset.diagnosisIcd10, "S02.5");

		const spacePreset = body.presets.find((p: { id: string }) => p.id === "space_maintainer");
		assert.ok(spacePreset, "Пресет удерживателя места (кольцо-петля) должен присутствовать");
		assert.equal(spacePreset.serviceCode, "A16.07.047");
		assert.equal(spacePreset.diagnosisIcd10, "K07.3");
	});

	// ─── 5. PEDIATRIC CATALOG 804N: BIGINT KOPECKS & SERVICES ───────────────────
	it("5. Proves defaultPriceKopecks bigint across all Order 804n pediatric services (Mandate 8bm)", () => {
		assert.ok(PEDIATRIC_804N_CATALOG.length >= 10, "Каталог должен содержать минимум 10 позиций");
		assert.equal(ORDER_804N_PEDIATRIC_SERVICES, PEDIATRIC_804N_CATALOG, "Алиас ORDER_804N_PEDIATRIC_SERVICES должен ссылаться на PEDIATRIC_804N_CATALOG");

		for (const service of PEDIATRIC_804N_CATALOG) {
			assert.ok(service.defaultPriceKopecks !== undefined, `Услуга ${service.code} обязана содержать defaultPriceKopecks`);
			assert.equal(typeof service.defaultPriceKopecks, "bigint", `defaultPriceKopecks для ${service.code} должен быть bigint`);
			assert.equal(service.defaultPriceKopecks, BigInt(service.defaultPriceRub * 100), `defaultPriceKopecks для ${service.code} должен строго равняться defaultPriceRub * 100`);
		}

		const splintService = PEDIATRIC_804N_CATALOG.find((s) => s.code === "A16.07.019");
		assert.ok(splintService, "Услуга шинирования A16.07.019 обязана быть в каталоге");
		assert.equal(splintService.defaultPriceKopecks, 500000n);

		const spaceBandService = PEDIATRIC_804N_CATALOG.find((s) => s.code === "A16.07.047");
		assert.ok(spaceBandService, "Услуга удерживателя места A16.07.047 обязана быть в каталоге");
		assert.equal(spaceBandService.defaultPriceKopecks, 750000n);
	});

	// ─── 6. PARENT MEMO IADT TRAUMA & SPACE MAINTAINER SECTIONS ─────────────────
	it("6. Generates parent memo with dedicated IADT trauma and space maintainer guidance", () => {
		const memo = generatePediatricParentRecommendations({
			patientName: "Артём Смирнов",
			patientAgeYears: 6,
			clinicName: "Клиника DENTE",
			doctorName: "Др. Смирнова А.П.",
			traumaIadt: { toothNumber: 11, notes: "Титановая шина TTS" },
			spaceMaintainer: { toothNumber: 54, notes: "Кольцо-петля" },
		});

		assert.ok(memo.includes("ПАМЯТКА ПОСЛЕ ОСТРОЙ ТРАВМЫ ЗУБОВ ПО ПРОТОКОЛУ IADT (ЗУБ #11)"), "Должен содержать секцию травмы IADT");
		assert.ok(memo.includes("Строгая щадящая диета"), "Должен содержать рекомендацию по мягкой диете");
		assert.ok(memo.includes("Диспансерный календарь IADT"), "Должен содержать диспансерный календарь явок");
		assert.ok(memo.includes("ПАМЯТКА ПО НОШЕНИЮ УДЕРЖИВАТЕЛЯ МЕСТА / КОЛЬЦО-ПЕТЛЯ (ЗОНА ЗУБА #54)"), "Должен содержать секцию удерживателя места");
		assert.ok(memo.includes("Исключить липкие и тягучие сладости"), "Должен содержать запрет липких сладостей");
	});
});
