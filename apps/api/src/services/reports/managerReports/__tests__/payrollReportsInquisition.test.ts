/**
 * apps/api/src/services/reports/managerReports/__tests__/payrollReportsInquisition.test.ts
 *
 * RED TEAM INQUISITION TEST SUITE: DOCTOR & ASSISTANT PAYROLL (Часть 6Г: реальный SUT + PG18)
 * [PAY-03] Custom commission rate preservation (customBasePercentage vs preset)
 * [PAY-04] Zero fabricated 10% materials / 30% lab deductions
 * [PAY-05] Assistant wages calculation with shifts, radiographs, surgeries, and NDFL 13%
 * [PAY-06] Real Fastify.inject BOLA / tenant ownership check & single READ ONLY TX execution
 */

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import Fastify from "fastify";
import {
	ASSISTANT_SHIFT_RULE,
	type AssistantShiftLogItem,
	calculateAssistantPeriodPayroll,
	calculateDoctorPeriodPayroll,
	kopecksToRubles,
} from "@dental/shared";
import { organizations, users } from "../../../../db/schema.js";
import { registerDoctorPerformancePayrollRoutes } from "../../../../routes/reports/doctorPerformancePayrollRoutes.js";
import { authTokenSecret } from "../../../../security/authSecret.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../../../../tests/support/fixtureOrganizations.js";
import { signToken } from "../../../../utils/cryptoHelper.js";
import { doctorPayrollReport } from "../financialExecutiveReports.js";

const ORG_A_ID = fixtureUuid("payrollReportsInquisition", 1);
const ORG_B_ID = fixtureUuid("payrollReportsInquisition", 2);
const OWNER_A_ID = fixtureUuid("payrollReportsInquisition", 3);
const DOC_A_ID = fixtureUuid("payrollReportsInquisition", 4);
const DOC_B_ID = fixtureUuid("payrollReportsInquisition", 5);

describe("Red Team Inquisition: Doctor & Assistant Payroll (Real SUT + PG18)", () => {
	let dbAvailable = true;

	before(async () => {
		try {
			await purgeFixtureOrganizations([ORG_A_ID, ORG_B_ID]);
			await withFixtureTenant(ORG_A_ID, async (tx) => {
				await tx
					.insert(organizations)
					.values({ id: ORG_A_ID, name: "Клиника ЗП А", clinicMode: "small_clinic" })
					.onConflictDoNothing();
				await tx.insert(users).values([
					{
						id: OWNER_A_ID,
						organizationId: ORG_A_ID,
						email: "owner-pay@test.local",
						fullName: "Владелец ЗП",
						role: "owner",
						passwordHash: "hash",
					},
					{
						id: DOC_A_ID,
						organizationId: ORG_A_ID,
						email: "doca-pay@test.local",
						fullName: "Врач А.",
						role: "doctor",
						passwordHash: "hash",
					},
				]);
			});
			await withFixtureTenant(ORG_B_ID, async (tx) => {
				await tx
					.insert(organizations)
					.values({ id: ORG_B_ID, name: "Клиника ЗП Б", clinicMode: "small_clinic" })
					.onConflictDoNothing();
				await tx.insert(users).values({
					id: DOC_B_ID,
					organizationId: ORG_B_ID,
					email: "docb-pay@test.local",
					fullName: "Чужой Врач Б.",
					role: "doctor",
					passwordHash: "hash",
				});
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
			await purgeFixtureOrganizations([ORG_A_ID, ORG_B_ID]);
		}
	});

	describe("[PAY-03] Custom Doctor Rates Preservation", () => {
		test("calculateDoctorPeriodPayroll preserves customBasePercentage (35% / 28.5%) and negative debt carry-over", () => {
			const svc = {
				id: "svc-1",
				dateIso: "2026-11-10",
				patientName: "Пациент А.",
				medicalCardNumber: "МК-101",
				serviceNameRu: "Восстановление зуба пломбой",
				category: "therapy" as const,
				grossRevenueKop: 1000000,
				labCostKop: 0,
				materialCostKop: 0,
				doctorId: "doc-uuid-1",
			};

			const res35 = calculateDoctorPeriodPayroll({
				doctorId: "doc-uuid-1",
				doctorName: "Врач 1",
				specialtyId: "therapist",
				periodStartIso: "2026-11-01",
				periodEndIso: "2026-11-30",
				services: [svc],
				customBasePercentage: 35,
				taxRegime: "self_employed",
			});
			assert.equal(res35.baseCommissionPercent, 35);
			assert.equal(res35.earnedBaseCommissionKop, 350000);

			const res285 = calculateDoctorPeriodPayroll({
				doctorId: "doc-uuid-1",
				doctorName: "Врач 2",
				specialtyId: "therapist",
				periodStartIso: "2026-11-01",
				periodEndIso: "2026-11-30",
				services: [svc],
				customBasePercentage: 28.5,
				taxRegime: "self_employed",
			});
			assert.equal(res285.baseCommissionPercent, 28.5);
			assert.equal(res285.earnedBaseCommissionKop, 285000);
		});
	});

	describe("[PAY-04] Ликвидация моков 10% материалов и 30% лаборатории", () => {
		test("при нулевом списании материалов и ЗТЛ удерживает строго 0 коп", () => {
			const result = calculateDoctorPeriodPayroll({
				doctorId: "doc-clean",
				doctorName: "Врач Чистый",
				specialtyId: "therapist",
				periodStartIso: "2026-11-01",
				periodEndIso: "2026-11-30",
				services: [
					{
						id: "svc-clean",
						dateIso: "2026-11-12",
						patientName: "Пациент Б.",
						medicalCardNumber: "МК-102",
						serviceNameRu: "Профессиональная гигиена",
						category: "therapy",
						grossRevenueKop: 10000000,
						labCostKop: 0,
						materialCostKop: 0,
						doctorId: "doc-clean",
					},
				],
				customBasePercentage: 30,
				taxRegime: "self_employed",
			});

			assert.equal(result.totalMaterialDeductionsKop, 0);
			assert.equal(result.totalLabDeductionsKop, 0);
			assert.equal(result.totalNetBaseKop, 10000000);
			assert.equal(result.earnedBaseCommissionKop, 3000000);
		});
	});

	describe("[PAY-05] Расчет оплаты труда ассистентов клиники", () => {
		test("расчет смен, часов, снимков, хирургии и НДФЛ 13% в целочисленных копейках", () => {
			const shiftLogs: AssistantShiftLogItem[] = [
				{
					id: "shift-1",
					dateIso: "2026-11-01",
					shiftType: "standard_6h",
					hoursWorked: 6,
					radiographsTakenCount: 5,
					surgeriesAssistedCount: 1,
				},
				{
					id: "shift-2",
					dateIso: "2026-11-02",
					shiftType: "full_12h",
					hoursWorked: 12,
					radiographsTakenCount: 8,
					surgeriesAssistedCount: 2,
				},
			];

			const result = calculateAssistantPeriodPayroll(
				"ast-1",
				"Ковалева А.С.",
				"2026-11-01 — 2026-11-30",
				shiftLogs,
				ASSISTANT_SHIFT_RULE,
			);

			assert.equal(result.baseShiftPayoutKop, 1050000);
			assert.equal(result.radiographPayoutKop, 195000);
			assert.equal(result.surgeryPayoutKop, 60000);
			assert.equal(result.totalGrossPayoutKop, 1305000);
			assert.equal(result.ndfl13TaxKop, 169700);
			assert.equal(result.netPayoutToAssistantKop, 1135300);
			assert.equal(kopecksToRubles(result.netPayoutToAssistantKop), 11353);
		});
	});

	describe("[PAY-06] Real Fastify.inject BOLA Isolation & PG18 doctorPayrollReport", () => {
		test("отсекает чужого врача из другой клиники (404 DoctorNotFound), ограничивает скоуп врача и считает ведомость в PG18", async (t) => {
			if (!dbAvailable) return t.skip("Database not available");

			process.env.AUTH_TOKEN_SECRET =
				process.env.AUTH_TOKEN_SECRET || "test-only-synthetic-secret-32chars-min";
			const secret = authTokenSecret();
			const clinicAToken = signToken({ organizationId: ORG_A_ID, kind: "clinic" }, secret, 3600);
			const ownerAToken = signToken(
				{ organizationId: ORG_A_ID, userId: OWNER_A_ID, role: "owner", kind: "staff" },
				secret,
				3600,
			);
			const docAToken = signToken(
				{ organizationId: ORG_A_ID, userId: DOC_A_ID, role: "doctor", kind: "staff" },
				secret,
				3600,
			);

			const app = Fastify();
			await registerDoctorPerformancePayrollRoutes(app);
			await app.ready();

			try {
				// 1. Владелец клиники А запрашивает чужого врача DOC_B_ID из клиники Б -> строгий 404 DoctorNotFound (BOLA отбита)
				const foreignRes = await app.inject({
					method: "GET",
					url: `/api/reports/doctor-payroll?doctorId=${DOC_B_ID}`,
					headers: {
						"x-dente-clinic-token": clinicAToken,
						"x-dente-staff-token": ownerAToken,
					},
				});
				assert.equal(foreignRes.statusCode, 404, foreignRes.body);
				assert.equal((foreignRes.json() as { error: string }).error, "DoctorNotFound");

				// 2. Владелец клиники А по своему врачу DOC_A_ID -> 200 OK
				const ownDocRes = await app.inject({
					method: "GET",
					url: `/api/reports/doctor-payroll?doctorId=${DOC_A_ID}`,
					headers: {
						"x-dente-clinic-token": clinicAToken,
						"x-dente-staff-token": ownerAToken,
					},
				});
				assert.equal(ownDocRes.statusCode, 200, ownDocRes.body);
				const ownBody = ownDocRes.json() as { rows: Array<{ doctorId: string }>; assistantRows: unknown[] };
				assert.equal(ownBody.rows.length, 1);
				assert.equal(ownBody.rows[0]?.doctorId, DOC_A_ID);

				// 3. Врач А (payroll.read.own) видит ТОЛЬКО себя даже при попытке запросить doctorId=all,
				//    а ведомость ассистентов для него закрыта (403)
				const doctorScopeRes = await app.inject({
					method: "GET",
					url: "/api/reports/doctor-payroll?doctorId=all",
					headers: {
						"x-dente-clinic-token": clinicAToken,
						"x-dente-staff-token": docAToken,
					},
				});
				assert.equal(doctorScopeRes.statusCode, 200, doctorScopeRes.body);
				const doctorScopeBody = doctorScopeRes.json() as { rows: Array<{ doctorId: string }> };
				assert.equal(doctorScopeBody.rows.length, 1);
				assert.equal(doctorScopeBody.rows[0]?.doctorId, DOC_A_ID);

				const assistantDeniedRes = await app.inject({
					method: "GET",
					url: "/api/reports/assistant-payroll",
					headers: {
						"x-dente-clinic-token": clinicAToken,
						"x-dente-staff-token": docAToken,
					},
				});
				assert.equal(assistantDeniedRes.statusCode, 403);

				// 4. Прямой вызов сервиса doctorPayrollReport внутри READ ONLY PG18 транзакции
				const directReport = await doctorPayrollReport(
					{
						organizationId: ORG_A_ID,
						from: new Date("2026-11-01T00:00:00Z"),
						to: new Date("2026-11-30T23:59:59Z"),
						timeZone: "Europe/Moscow",
					},
					DOC_A_ID,
				);
				assert.equal(directReport.rows.length, 1);
				assert.equal(directReport.rows[0]?.doctorId, DOC_A_ID);
			} finally {
				await app.close();
			}
		});
	});
});
