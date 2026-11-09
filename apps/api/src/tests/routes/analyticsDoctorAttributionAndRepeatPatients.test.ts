/**
 * apps/api/src/tests/routes/analyticsDoctorAttributionAndRepeatPatients.test.ts
 *
 * Проверка исправления дефекта DEF-ANL-03:
 * Сохранение привязки платежа к врачу при оплате по счету (payments.documentId -> patientInvoices.visitId).
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import {
	appointments,
	organizations,
	patientInvoices,
	payments,
	patients,
	users,
	visits,
} from "../../db/schema.js";
import { doctorPerformance } from "../../services/reports/managerReports/doctorReports.js";
import {
	fixtureUuid,
	withFixtureTenant,
	purgeFixtureOrganizations,
} from "../support/fixtureOrganizations.js";

describe("DEF-ANL-03: Doctor Payment Attribution via Invoice documentId", () => {
	it("attributes payment to doctor via patientInvoices.visitId when payments.visitId is null", async () => {
		const orgId = fixtureUuid("docAttrReport", 1);
		const doctorId = fixtureUuid("docAttrReport", 2);
		const patientId = fixtureUuid("docAttrReport", 3);
		const appointmentId = fixtureUuid("docAttrReport", 4);
		const visitId = fixtureUuid("docAttrReport", 5);
		const invoiceId = fixtureUuid("docAttrReport", 6);

		await purgeFixtureOrganizations([orgId]);

		const now = new Date();
		const from = new Date(now.getTime() - 24 * 3600 * 1000);
		const to = new Date(now.getTime() + 24 * 3600 * 1000);

		try {
			await withFixtureTenant(orgId, async (tx) => {
				await tx.insert(organizations).values({
					id: orgId,
					name: "Клиника Атрибуции Выручки",
				});
				await tx.insert(users).values({
					id: doctorId,
					organizationId: orgId,
					fullName: "Доктор Смирнов И.В.",
					role: "doctor",
				});
				await tx.insert(patients).values({
					id: patientId,
					organizationId: orgId,
					fullName: "Пациент Тестовый П.Т.",
					phone: "+79998887766",
				});
				await tx.insert(appointments).values({
					id: appointmentId,
					organizationId: orgId,
					patientId,
					doctorUserId: doctorId,
					startsAt: now,
					endsAt: new Date(now.getTime() + 30 * 60 * 1000),
					status: "completed",
				});
				await tx.insert(visits).values({
					id: visitId,
					organizationId: orgId,
					patientId,
					appointmentId,
				});
				await tx.insert(patientInvoices).values({
					id: invoiceId,
					organizationId: orgId,
					patientId,
					visitId,
					totalAmountRub: 25000,
					totalRub: "25000.00",
					status: "paid",
					createdAt: now,
					paidAt: now,
				});
				// Платёж без явного visitId, но со связкой через documentId (счёт)
				await tx.insert(payments).values({
					organizationId: orgId,
					patientId,
					documentId: invoiceId,
					visitId: null,
					amountRub: 25000,
					method: "card",
					status: "paid",
					paidAt: now,
					clientMutationId: `mut-doc-attr-${Date.now()}`,
				});
			});

			const report = await doctorPerformance({
				organizationId: orgId,
				from,
				to,
			});

			assert.equal(report.rows.length, 1, "Должна быть ровно 1 строка врача");
			assert.equal(report.rows[0]?.doctorUserId, doctorId, "ID врача должен совпадать");
			assert.equal(report.rows[0]?.revenueRub, 25000, "Выручка врача должна быть 25 000 ₽");
			assert.equal(report.unattributedRevenueRub, 0, "Не должно быть неотнесенной выручки");
			assert.equal(report.attributionNote, "Вся выручка периода отнесена к врачам.");
		} finally {
			await purgeFixtureOrganizations([orgId]);
		}
	});
});
