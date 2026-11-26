/**
 * Integration tests for batched N+1 elimination in ZTL Look-Ahead and EMR Savior daemons.
 * Verifies against real PostgreSQL 18 under FORCE RLS:
 * 1. `runZtlLookAheadScan` batches `labOrders` with `inArray` and maps alerts accurately across multiple patients.
 * 2. `runEmrSaviorScan` batches `payments` + `treatmentItems` and persists `draftAutosave` per visit inside tenant tx.
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { inArray } from "drizzle-orm";
import { endPool } from "../../db/client.js";
import * as schema from "../../db/schema.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../../tests/support/fixtureOrganizations.js";
import { runEmrSaviorScan } from "./emrSaviorDaemon.js";
import { runZtlLookAheadScan } from "./ztlLookAheadDaemon.js";

const NAMESPACE = "daemonsBatchNPlusOne";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const DOCTOR_ID = fixtureUuid(NAMESPACE, 10);

const PATIENT_1 = fixtureUuid(NAMESPACE, 21);
const PATIENT_2 = fixtureUuid(NAMESPACE, 22);
const PATIENT_3 = fixtureUuid(NAMESPACE, 23);

const APPT_1 = fixtureUuid(NAMESPACE, 31);
const APPT_2 = fixtureUuid(NAMESPACE, 32);
const APPT_3 = fixtureUuid(NAMESPACE, 33);

const LAB_ORDER_1A = fixtureUuid(NAMESPACE, 41);
const LAB_ORDER_1B = fixtureUuid(NAMESPACE, 42);
const LAB_ORDER_2 = fixtureUuid(NAMESPACE, 43);
const LAB_ORDER_3_COMPLETED = fixtureUuid(NAMESPACE, 44);

const VISIT_1 = fixtureUuid(NAMESPACE, 51);
const VISIT_2 = fixtureUuid(NAMESPACE, 52);
const VISIT_3 = fixtureUuid(NAMESPACE, 53);

const PAYMENT_1 = fixtureUuid(NAMESPACE, 61);
const PAYMENT_2 = fixtureUuid(NAMESPACE, 62);

const ITEM_1 = fixtureUuid(NAMESPACE, 71);
const ITEM_2 = fixtureUuid(NAMESPACE, 72);

describe("Daemons Batched N+1 Elimination (PG18 + FORCE RLS)", () => {
	let dbAvailable = true;
	const baseNow = new Date("2026-11-26T08:00:00.000Z");

	before(async () => {
		try {
			await purgeFixtureOrganizations([ORG_ID]);
			await withFixtureTenant(ORG_ID, async (tx) => {
				await tx
					.insert(schema.organizations)
					.values({
						id: ORG_ID,
						name: 'ООО "Клиника Батч-Демонов"',
						inn: "7708887771",
						kpp: "770801001",
						ogrn: "1157746888771",
					})
					.onConflictDoNothing();

				await tx
					.insert(schema.users)
					.values({
						id: DOCTOR_ID,
						organizationId: ORG_ID,
						fullName: "Д-р Орлов Сергей Викторович",
						role: "doctor",
						snils: "123-456-789 01",
					})
					.onConflictDoNothing();

				await tx
					.insert(schema.patients)
					.values([
						{
							id: PATIENT_1,
							organizationId: ORG_ID,
							fullName: "Иванов Пётр Николаевич",
							phone: "+79001112233",
							birthDate: "1985-03-14",
						},
						{
							id: PATIENT_2,
							organizationId: ORG_ID,
							fullName: "Соколова Анна Сергеевна",
							phone: "+79004445566",
							birthDate: "1991-07-22",
						},
						{
							id: PATIENT_3,
							organizationId: ORG_ID,
							fullName: "Кузнецов Дмитрий Олегович",
							phone: "+79007778899",
							birthDate: "1979-11-02",
						},
					])
					.onConflictDoNothing();

				await tx
					.insert(schema.appointments)
					.values([
						{
							id: APPT_1,
							organizationId: ORG_ID,
							patientId: PATIENT_1,
							doctorUserId: DOCTOR_ID,
							status: "confirmed",
							startsAt: new Date(baseNow.getTime() + 2 * 60 * 60 * 1000),
							endsAt: new Date(baseNow.getTime() + 3 * 60 * 60 * 1000),
						},
						{
							id: APPT_2,
							organizationId: ORG_ID,
							patientId: PATIENT_2,
							doctorUserId: DOCTOR_ID,
							status: "planned",
							startsAt: new Date(baseNow.getTime() + 12 * 60 * 60 * 1000),
							endsAt: new Date(baseNow.getTime() + 13 * 60 * 60 * 1000),
						},
						{
							id: APPT_3,
							organizationId: ORG_ID,
							patientId: PATIENT_3,
							doctorUserId: DOCTOR_ID,
							status: "confirmed",
							startsAt: new Date(baseNow.getTime() + 36 * 60 * 60 * 1000),
							endsAt: new Date(baseNow.getTime() + 37 * 60 * 60 * 1000),
						},
					])
					.onConflictDoNothing();

				await tx
					.insert(schema.labOrders)
					.values([
						{
							id: LAB_ORDER_1A,
							organizationId: ORG_ID,
							patientId: PATIENT_1,
							doctorId: DOCTOR_ID,
							secureToken: `tok-${LAB_ORDER_1A}`,
							toothFdi: "16",
							material: "Диоксид циркония",
							status: "sent",
						},
						{
							id: LAB_ORDER_1B,
							organizationId: ORG_ID,
							patientId: PATIENT_1,
							doctorId: DOCTOR_ID,
							secureToken: `tok-${LAB_ORDER_1B}`,
							toothFdi: "17",
							material: "E.max",
							status: "refitting",
						},
						{
							id: LAB_ORDER_2,
							organizationId: ORG_ID,
							patientId: PATIENT_2,
							doctorId: DOCTOR_ID,
							secureToken: `tok-${LAB_ORDER_2}`,
							toothFdi: "26",
							material: "Металлокерамика",
							status: "in_progress",
						},
						{
							id: LAB_ORDER_3_COMPLETED,
							organizationId: ORG_ID,
							patientId: PATIENT_3,
							doctorId: DOCTOR_ID,
							secureToken: `tok-${LAB_ORDER_3_COMPLETED}`,
							toothFdi: "36",
							material: "Цирконий",
							status: "completed",
						},
					])
					.onConflictDoNothing();

				const visitCreatedAt = new Date(
					baseNow.getFullYear(),
					baseNow.getMonth(),
					baseNow.getDate(),
					14,
					0,
					0,
				);

				await tx
					.insert(schema.visits)
					.values([
						{
							id: VISIT_1,
							organizationId: ORG_ID,
							patientId: PATIENT_1,
							appointmentId: APPT_1,
							status: "draft",
							doctorSummary: null,
							createdAt: visitCreatedAt,
							updatedAt: visitCreatedAt,
						},
						{
							id: VISIT_2,
							organizationId: ORG_ID,
							patientId: PATIENT_2,
							appointmentId: APPT_2,
							status: "draft",
							doctorSummary: "",
							createdAt: visitCreatedAt,
							updatedAt: visitCreatedAt,
						},
						{
							id: VISIT_3,
							organizationId: ORG_ID,
							patientId: PATIENT_3,
							appointmentId: APPT_3,
							status: "draft",
							doctorSummary: null,
							createdAt: visitCreatedAt,
							updatedAt: visitCreatedAt,
						},
					])
					.onConflictDoNothing();

				await tx
					.insert(schema.payments)
					.values([
						{
							id: PAYMENT_1,
							organizationId: ORG_ID,
							patientId: PATIENT_1,
							visitId: VISIT_1,
							amountRub: 4500,
							amountKopecks: 450000n,
							note: "Лечение глубокого кариеса 16",
						},
						{
							id: PAYMENT_2,
							organizationId: ORG_ID,
							patientId: PATIENT_2,
							visitId: VISIT_2,
							amountRub: 6000,
							amountKopecks: 600000n,
							note: "Эндодонтическое лечение каналов",
						},
					])
					.onConflictDoNothing();

				await tx
					.insert(schema.treatmentItems)
					.values([
						{
							id: ITEM_1,
							organizationId: ORG_ID,
							patientId: PATIENT_1,
							visitId: VISIT_1,
							toothCode: "16",
							title: "Реставрация зуба 16 композитом",
							priceRub: 3000,
							unitPriceRub: 3000,
							priceKopecks: 300000n,
							unitPriceKopecks: 300000n,
						},
						{
							id: ITEM_2,
							organizationId: ORG_ID,
							patientId: PATIENT_2,
							visitId: VISIT_2,
							toothCode: "26",
							title: "Обработка и пломбирование каналов при пульпите",
							priceRub: 2000,
							unitPriceRub: 2000,
							priceKopecks: 200000n,
							unitPriceKopecks: 200000n,
						},
					])
					.onConflictDoNothing();
			});
		} catch (err) {
			if (isDatabaseUnavailable(err)) {
				dbAvailable = false;
				return;
			}
			throw err;
		}
	});

	after(async () => {
		if (dbAvailable) {
			try {
				await purgeFixtureOrganizations([ORG_ID]);
			} catch {
				// Best-effort fixture cleanup
			}
		}
		await endPool();
	});

	it("1. runZtlLookAheadScan batches lab orders across multiple patients and skips completed orders", async (t) => {
		if (!dbAvailable) {
			t.skip("PostgreSQL unavailable for integration test");
			return;
		}

		const alerts = await runZtlLookAheadScan({
			organizationId: ORG_ID,
			lookAheadHours: 48,
			now: baseNow,
		});

		assert.equal(alerts.length, 3);

		const p1Alerts = alerts.filter((a) => a.patientId === PATIENT_1);
		assert.equal(p1Alerts.length, 2);
		for (const alert of p1Alerts) {
			assert.equal(alert.urgency, "CRITICAL");
			assert.equal(alert.cascadeStage, "same_day_critical");
			assert.equal(alert.doctorName, "Д-р Орлов Сергей Викторович");
		}
		assert.deepEqual(
			p1Alerts.map((a) => a.labOrderId).sort(),
			[LAB_ORDER_1A, LAB_ORDER_1B].sort(),
		);

		const p2Alerts = alerts.filter((a) => a.patientId === PATIENT_2);
		assert.equal(p2Alerts.length, 1);
		const p2Alert = p2Alerts[0];
		assert.ok(p2Alert);
		assert.equal(p2Alert.urgency, "HIGH");
		assert.equal(p2Alert.cascadeStage, "24h_warning");
		assert.equal(p2Alert.labOrderId, LAB_ORDER_2);
		assert.equal(p2Alert.toothFdi, "26");

		const p3Alerts = alerts.filter((a) => a.patientId === PATIENT_3);
		assert.equal(p3Alerts.length, 0);
	});

	it("2. runEmrSaviorScan batches payments + treatmentItems and persists draftAutosave for all unwritten visits", async (t) => {
		if (!dbAvailable) {
			t.skip("PostgreSQL unavailable for integration test");
			return;
		}

		const alerts = await runEmrSaviorScan({
			organizationId: ORG_ID,
			targetDate: baseNow,
		});

		assert.equal(alerts.length, 3);

		const v1 = alerts.find((a) => a.visitId === VISIT_1);
		const v2 = alerts.find((a) => a.visitId === VISIT_2);
		const v3 = alerts.find((a) => a.visitId === VISIT_3);
		assert.ok(v1);
		assert.ok(v2);
		assert.ok(v3);

		assert.equal(v1.totalBilledRub, 7500);
		assert.equal(v1.generatedSoapDraft.specialty, "therapy");
		assert.ok(v1.renderedDiaryText.includes("16"));

		assert.equal(v2.totalBilledRub, 8000);
		assert.equal(v2.generatedSoapDraft.specialty, "endodontics");
		assert.ok(v2.renderedDiaryText.includes("26"));

		assert.equal(v3.totalBilledRub, 0);
		assert.ok(v3.renderedDiaryText.includes("[Укажите зуб]"));

		const persistedVisits = await withFixtureTenant(ORG_ID, (tx) =>
			tx
				.select({
					id: schema.visits.id,
					draftAutosave: schema.visits.draftAutosave,
				})
				.from(schema.visits)
				.where(inArray(schema.visits.id, [VISIT_1, VISIT_2, VISIT_3])),
		);

		assert.equal(persistedVisits.length, 3);
		for (const row of persistedVisits) {
			assert.ok(row.draftAutosave && typeof row.draftAutosave === "object");
			const draft = row.draftAutosave as Record<string, unknown>;
			assert.equal(draft.autoGeneratedByAi, true);
			assert.equal(typeof draft.generatedAt, "string");
			assert.ok(draft.soap && typeof draft.soap === "object");
		}
	});
});
