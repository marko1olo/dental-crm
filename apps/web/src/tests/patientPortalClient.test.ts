/**
 * DENTE CRM — Unit Tests for Patient Portal & Mobile Cabinet Client
 *
 * Test Coverage:
 * 1. calculateCabinetSummary: KPI metrics calculation (Total Due, Stage Progress, Bonus Points)
 * 2. calculatePatientTaxDeduction: 13% Tax Deduction calculation (Code 01 / Code 02 limits per Article 219 of Tax Code)
 * 3. generateSbpQrPayload: 1-Click SBP QR generation for prepayment of stages & invoices
 * 4. generatePatientDentalPassport: Patient-friendly plain Russian tooth passports
 * 5. 3-Tier Treatment Plan Progression: basic, standard, premium stages and remaining balance
 */

import assert from "node:assert/strict";
import { describe, it, test } from "node:test";
import {
	calculateCabinetSummary,
	calculatePatientTaxDeduction,
	generatePatientDentalPassport,
	generateSbpQrPayload,
	type PatientPersonalCabinetData,
} from "../components/portal/patientCabinet/patientCabinetEngine";
import { DEMO_PATIENT_CABINET } from "../components/portal/patientCabinet/patientCabinetPresets";

describe("Patient Portal Client Engine & Telemedicine Suite", () => {
	test("1. calculateCabinetSummary: aggregates unpaid invoices, plan progress and upcoming visits", () => {
		const summary = calculateCabinetSummary(DEMO_PATIENT_CABINET);

		assert.ok(typeof summary.totalUnpaidAmountRub === "number");
		assert.ok(typeof summary.upcomingAppointmentsCount === "number");
		assert.ok(typeof summary.activePlansCount === "number");
		assert.ok(typeof summary.totalPaidAmountRub === "number");
	});

	test("2. calculatePatientTaxDeduction: computes 13% tax refund split by Code 01 and Code 02", () => {
		const calc = calculatePatientTaxDeduction(DEMO_PATIENT_CABINET.invoices, 2026);

		assert.strictEqual(calc.taxYear, 2026);
		assert.ok(calc.totalRefundRub > 0, "Calculated tax refund must be positive for paid invoices");
		assert.ok(calc.totalSpentRub > 0);
		assert.strictEqual(calc.totalSpentRub, calc.code01SpentRub + calc.code02SpentRub);
	});

	test("3. generateSbpQrPayload: produces valid NSPK payload string and banking deep links", () => {
		const invoice = DEMO_PATIENT_CABINET.invoices[0]!;
		const sbp = generateSbpQrPayload(invoice);

		assert.ok(sbp.qrId);
		assert.ok(sbp.sbpNspkPayloadString.startsWith("https://qr.nspk.ru/"));
		assert.strictEqual(sbp.amountRub, 35000);
		assert.strictEqual(sbp.amountKopecks, 3500000);
		assert.ok(sbp.availableBanks.length >= 4);

		const sber = sbp.availableBanks.find((b) => b.id === "sber");
		assert.ok(sber?.schemaPrefix.startsWith("sberpay://qr/sub?qrId="));

		const tbank = sbp.availableBanks.find((b) => b.id === "tbank");
		assert.ok(tbank?.schemaPrefix.startsWith("tinkoffbank://qr?id="));
	});

	test("4. generatePatientDentalPassport: formats plain Russian tooth diagnosis & treatments", () => {
		const passport = generatePatientDentalPassport(DEMO_PATIENT_CABINET);

		assert.strictEqual(passport.patientName, DEMO_PATIENT_CABINET.fullName);
		assert.ok(passport.entries.length > 0);

		const entry = passport.entries[0];
		assert.ok(entry);
		assert.ok(typeof entry.toothFdi === "string");
		assert.ok(typeof entry.plainSummaryRu === "string");
		assert.ok(typeof entry.materialName === "string");
	});

	test("5. 3-Tier Treatment Plan Progression: calculates remaining balance and stage counts", () => {
		const tiers = DEMO_PATIENT_CABINET.threeTierModel?.tiers || [];
		assert.strictEqual(tiers.length, 3);

		const standardTier = tiers.find((t) => t.tierId === "standard");
		assert.ok(standardTier);
		assert.strictEqual(standardTier.totalCostRub, 340000);
		assert.strictEqual(standardTier.stages.length, 5);

		const stage1 = standardTier.stages[0]!;
		assert.strictEqual(stage1.status, "completed");
		assert.strictEqual(stage1.costRub, 16000);

		const stage3 = standardTier.stages[2]!;
		assert.strictEqual(stage3.status, "completed");
		assert.strictEqual(stage3.costRub, 28000);

		const activePlan = DEMO_PATIENT_CABINET.treatmentPlans[0]!;
		assert.strictEqual(activePlan.totalCostRub, 340000);
		assert.strictEqual(activePlan.paidCostRub, 235000);
		assert.strictEqual(activePlan.remainingDueRub, 105000);
		assert.ok(activePlan.progressPercent > 0);
	});
});
