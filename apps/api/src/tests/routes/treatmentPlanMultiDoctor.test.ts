import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { eq, inArray, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	organizations,
	patients,
	serviceCatalogItems,
	treatmentItems,
	treatmentPlanItemsNew,
	treatmentPlans,
	users,
} from "../../db/schema.js";
import { registerOdontogramRoutes } from "../../routes/odontogram.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const FIXTURE = "multiDocPlan";
const ORG_ID = fixtureUuid(FIXTURE, 1);
const PATIENT_ID = fixtureUuid(FIXTURE, 2);
const DOCTOR_THERAPIST_ID = fixtureUuid(FIXTURE, 3);
const DOCTOR_SURGEON_ID = fixtureUuid(FIXTURE, 4);
const DOCTOR_ORTHOPEDIST_ID = fixtureUuid(FIXTURE, 5);
const SERVICE_THERAPY_ID = fixtureUuid(FIXTURE, 6);
const SERVICE_SURGERY_ID = fixtureUuid(FIXTURE, 7);

describe("Multi-Doctor Consortium in Treatment Plans (PostgreSQL 18 & Odontogram Routes)", () => {
	let app: FastifyInstance;
	let databaseReady = true;
	let staffToken: string;

	before(async () => {
		try {
			await purgeFixtureOrganizations([ORG_ID]);
		} catch (error) {
			if (!isDatabaseUnavailable(error)) throw error;
			databaseReady = false;
			return;
		}

		await withFixtureTenant(ORG_ID, async () => {
			await db.insert(organizations).values({
				id: ORG_ID,
				name: "Клиника Мульти-Консилиум Стоматологии",
			});

			await db.insert(users).values([
				{
					id: DOCTOR_THERAPIST_ID,
					organizationId: ORG_ID,
					fullName: "Д-р Смирнова Е.А.",
					role: "doctor",
					specialties: ["Терапия"],
					isActive: true,
				},
				{
					id: DOCTOR_SURGEON_ID,
					organizationId: ORG_ID,
					fullName: "Д-р Барабаш С.В.",
					role: "doctor",
					specialties: ["Хирургия"],
					isActive: true,
				},
				{
					id: DOCTOR_ORTHOPEDIST_ID,
					organizationId: ORG_ID,
					fullName: "Д-р Ковалев В.Н.",
					role: "doctor",
					specialties: ["Ортопедия"],
					isActive: true,
				},
			]);

			await db.insert(patients).values({
				id: PATIENT_ID,
				organizationId: ORG_ID,
				fullName: "Консилиум Пациент Тестовый",
				phone: "+79991112233",
			});

			await db.insert(serviceCatalogItems).values([
				{
					id: SERVICE_THERAPY_ID,
					organizationId: ORG_ID,
					code: "A16.07.002",
					title: "Лечение глубокого кариеса с пломбированием",
					basePriceRub: 5500,
					priceRub: 5500,
				},
				{
					id: SERVICE_SURGERY_ID,
					organizationId: ORG_ID,
					code: "A16.07.006",
					title: "Установка дентального имплантата",
					basePriceRub: 35000,
					priceRub: 35000,
				},
			]);
		});

		staffToken = signToken(
			{ organizationId: ORG_ID, userId: DOCTOR_THERAPIST_ID, role: "doctor" },
			authTokenSecret(),
		);

		app = createTenantTestApp();
		await registerOdontogramRoutes(app);
		await app.ready();
	});

	after(async () => {
		await app?.close();
		if (!databaseReady) return;
		await purgeFixtureOrganizations([ORG_ID]);
	});

	test("1. Сохранение плана с назначением разных врачей-специалистов на позиции (Терапевт + Хирург)", async (t) => {
		if (!databaseReady) return t.skip("база данных недоступна");

		const payload = {
			name: "Комплексный консилиум: санация и имплантация",
			items: [
				{
					toothNumber: 16,
					priceId: SERVICE_THERAPY_ID,
					name: "Лечение кариеса 1.6",
					quantity: 1,
					price: 5500,
					discount: 500,
					phase: 1,
					doctorId: DOCTOR_THERAPIST_ID,
				},
				{
					toothNumber: 46,
					priceId: SERVICE_SURGERY_ID,
					name: "Имплантация 4.6",
					quantity: 1,
					price: 35000,
					discount: 0,
					phase: 2,
					doctorId: DOCTOR_SURGEON_ID,
				},
			],
		};

		const res = await app.inject({
			method: "POST",
			url: `/api/patients/${PATIENT_ID}/treatment-plans`,
			headers: {
				"x-dente-clinic-token": staffToken,
				"x-dente-staff-token": staffToken,
				"Content-Type": "application/json",
			},
			payload,
		});

		assert.equal(res.statusCode, 200, `Ожидался 200 OK, получено: ${res.body}`);
		const body = res.json();
		assert.equal(body.success, true);
		assert.ok(body.planId, "План должен иметь ID");

		const savedPlanId = body.planId;

		// 2. Проверка колонок в БД PostgreSQL 18: treatment_plan_items_new.doctor_id
		const dbItems = await withFixtureTenant(ORG_ID, async () =>
			db
				.select({
					id: treatmentPlanItemsNew.id,
					toothNumber: treatmentPlanItemsNew.toothNumber,
					priceId: treatmentPlanItemsNew.priceId,
					doctorId: treatmentPlanItemsNew.doctorId,
					phase: treatmentPlanItemsNew.phase,
				})
				.from(treatmentPlanItemsNew)
				.where(eq(treatmentPlanItemsNew.planId, savedPlanId)),
		);

		assert.equal(dbItems.length, 2, "В БД должно быть 2 позиции плана");
		const therapyItem = dbItems.find((it) => it.toothNumber === 16);
		const surgeryItem = dbItems.find((it) => it.toothNumber === 46);

		assert.ok(therapyItem, "Позиция терапевта найдена в БД");
		assert.equal(
			therapyItem?.doctorId,
			DOCTOR_THERAPIST_ID,
			"В колонке doctor_id позиции 1.6 сохранен ID терапевта",
		);

		assert.ok(surgeryItem, "Позиция хирурга найдена в БД");
		assert.equal(
			surgeryItem?.doctorId,
			DOCTOR_SURGEON_ID,
			"В колонке doctor_id позиции 4.6 сохранен ID хирурга",
		);

		// 3. Проверка проводки в книгу лечения (treatment_items.planned_doctor_user_id)
		const ledgerItems = await withFixtureTenant(ORG_ID, async () =>
			db
				.select({
					id: treatmentItems.id,
					toothCode: treatmentItems.toothCode,
					plannedDoctorUserId: treatmentItems.plannedDoctorUserId,
				})
				.from(treatmentItems)
				.where(eq(treatmentItems.patientId, PATIENT_ID)),
		);

		assert.equal(ledgerItems.length, 2, "В книге лечения должно быть 2 позиции");
		const ledgerTherapy = ledgerItems.find((it) => it.toothCode === "16");
		const ledgerSurgery = ledgerItems.find((it) => it.toothCode === "46");

		assert.equal(
			ledgerTherapy?.plannedDoctorUserId,
			DOCTOR_THERAPIST_ID,
			"planned_doctor_user_id для 16 в ledger совпадает с терапевтом",
		);
		assert.equal(
			ledgerSurgery?.plannedDoctorUserId,
			DOCTOR_SURGEON_ID,
			"planned_doctor_user_id для 46 в ledger совпадает с хирургом",
		);
	});

	test("4. Чтение плана возвращает doctorId, doctorName и doctorSpecialty для консилиума", async (t) => {
		if (!databaseReady) return t.skip("база данных недоступна");

		const res = await app.inject({
			method: "GET",
			url: `/api/patients/${PATIENT_ID}/treatment-plans`,
			headers: {
				"x-dente-clinic-token": staffToken,
				"x-dente-staff-token": staffToken,
			},
		});

		assert.equal(res.statusCode, 200);
		const body = res.json();
		assert.equal(body.success, true);
		assert.ok(body.plans && body.plans.length > 0);

		const activePlan = body.plans[0];
		assert.equal(activePlan.items.length, 2);

		const therapyItem = activePlan.items.find((it: any) => it.toothNumber === 16);
		const surgeryItem = activePlan.items.find((it: any) => it.toothNumber === 46);

		assert.ok(therapyItem);
		assert.equal(therapyItem.doctorId, DOCTOR_THERAPIST_ID);
		assert.equal(therapyItem.doctorName, "Д-р Смирнова Е.А.");
		assert.equal(therapyItem.doctorSpecialty, "Терапия");

		assert.ok(surgeryItem);
		assert.equal(surgeryItem.doctorId, DOCTOR_SURGEON_ID);
		assert.equal(surgeryItem.doctorName, "Д-р Барабаш С.В.");
		assert.equal(surgeryItem.doctorSpecialty, "Хирургия");
	});

	test("5. Переназначение врача позиции на ортопеда при обновлении плана", async (t) => {
		if (!databaseReady) return t.skip("база данных недоступна");

		const listRes = await app.inject({
			method: "GET",
			url: `/api/patients/${PATIENT_ID}/treatment-plans`,
			headers: {
				"x-dente-clinic-token": staffToken,
				"x-dente-staff-token": staffToken,
			},
		});
		const existingPlan = listRes.json().plans[0];

		const updatePayload = {
			id: existingPlan.id,
			name: existingPlan.name,
			items: [
				{
					toothNumber: 16,
					priceId: SERVICE_THERAPY_ID,
					name: "Лечение кариеса 1.6 (передано ортопеду под коронку)",
					quantity: 1,
					price: 5500,
					discount: 0,
					phase: 1,
					doctorId: DOCTOR_ORTHOPEDIST_ID,
				},
			],
		};

		const res = await app.inject({
			method: "POST",
			url: `/api/patients/${PATIENT_ID}/treatment-plans`,
			headers: {
				"x-dente-clinic-token": staffToken,
				"x-dente-staff-token": staffToken,
				"Content-Type": "application/json",
			},
			payload: updatePayload,
		});

		assert.equal(res.statusCode, 200);
		const body = res.json();
		assert.equal(body.success, true);

		// Проверяем актуальное состояние в БД
		const updatedItems = await withFixtureTenant(ORG_ID, async () =>
			db
				.select({
					toothNumber: treatmentPlanItemsNew.toothNumber,
					doctorId: treatmentPlanItemsNew.doctorId,
				})
				.from(treatmentPlanItemsNew)
				.where(eq(treatmentPlanItemsNew.planId, existingPlan.id)),
		);

		assert.equal(updatedItems.length, 1);
		assert.equal(
			updatedItems[0]?.doctorId,
			DOCTOR_ORTHOPEDIST_ID,
			"Врач позиции успешно обновлен на ортопеда",
		);
	});
});
