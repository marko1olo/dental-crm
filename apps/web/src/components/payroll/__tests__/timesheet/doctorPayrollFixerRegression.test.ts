/**
 * doctorPayrollFixerRegression.test.ts — Runtime SUT Regression Suite for Doctor Payroll Domain
 * Calls real components, stores, schemas, and IDENT calculation utilities instead of source-grep.
 */

import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { payrollCalculationsQuerySchema } from "../../../../../../api/src/routes/payroll";
import { useDocumentBrandingStore } from "../../../../store/documentBrandingStore";
import { fetchDoctorEarningsWithStatusApi } from "../../fetchDoctorEarningsApi";
import { calculateOrderNetAndFee } from "../../doctorPayrollModalUtils";
import { DoctorPayrollStudioModal } from "../../DoctorPayrollStudioModal";
import {
	CANONICAL_PAYROLL_DOCTORS,
	type PayrollDoctorProfile,
	type PayrollServiceOrder,
} from "../../payrollCatalogData";

const originalFetch = globalThis.fetch;

describe("Doctor Payroll Fixer Surgeon Runtime Regression Suite", () => {
	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	it("1.1 DoctorPayrollStudioModal & documentBrandingStore inject live clinicName instead of hardcoded placeholder", () => {
		useDocumentBrandingStore.setState({ clinicName: "Стоматология Альфа-Плюс" });
		const clinicName = useDocumentBrandingStore.getState().clinicName;

		const html = renderToString(
			React.createElement(DoctorPayrollStudioModal, {
				isOpen: true,
				onClose: () => {},
				clinicName,
				initialDoctorId: CANONICAL_PAYROLL_DOCTORS[0]?.id,
			}),
		);

		assert.ok(!html.includes("ООО «Денте Стоматология»"), "Legacy hardcoded clinic name must not render");
		assert.ok(html.includes('data-testid="doctor-payroll-studio-modal"'));
	});

	it("1.2 payrollCalculationsQuerySchema validates commissionPercent, identSalaryModel & cashAdvancePolicy", () => {
		const parsedStandard = payrollCalculationsQuerySchema.safeParse({
			doctorId: "doc-1",
			from: "2026-05-01",
			to: "2026-05-31",
		});
		assert.ok(parsedStandard.success);

		const parsedWithParams = payrollCalculationsQuerySchema.safeParse({
			doctorId: "all",
			from: "2026-05-01",
			to: "2026-05-31",
			commissionPercent: "27.5",
			identSalaryModel: "net_doctor_bears_discount",
			cashAdvancePolicy: "doctor_first",
		});
		assert.ok(parsedWithParams.success);
		assert.equal(parsedWithParams.data?.commissionPercent, "27.5");
		assert.equal(parsedWithParams.data?.identSalaryModel, "net_doctor_bears_discount");
		assert.equal(parsedWithParams.data?.cashAdvancePolicy, "doctor_first");
	});

	it("1.3 fetchDoctorEarningsWithStatusApi forwards custom commissionPercent to backend query string", async () => {
		let requestedUrl = "";
		globalThis.fetch = (async (input: RequestInfo | URL) => {
			requestedUrl = String(input);
			return new Response(
				JSON.stringify({ orders: [], closedPeriods: [], summary: null }),
				{ status: 200, headers: { "Content-Type": "application/json" } },
			);
		}) as typeof fetch;

		await fetchDoctorEarningsWithStatusApi({
			doctorId: "doc-7",
			periodStart: "2026-10-01",
			periodEnd: "2026-10-31",
			payoutModel: "percentage",
			chairRentalRub: 0,
			advanceRub: 0,
			taxRegime: "employee",
			commissionPercent: 35,
		});

		const url = new URL(requestedUrl, "http://localhost");
		assert.equal(url.pathname, "/api/v1/payroll/calculations");
		assert.equal(url.searchParams.get("doctorId"), "doc-7");
		assert.equal(url.searchParams.get("commissionPercent"), "35");
	});

	it("1.4 calculateOrderNetAndFee honors per-category rates and IDENT salary models", () => {
		const doc: PayrollDoctorProfile = {
			id: "doc-multi",
			name: "Д-р Мульти",
			initials: "ДМ",
			specialtyId: "therapy",
			specialtyTitleRu: "Терапевт",
			commissionPercent: 25,
			payoutModel: "percentage",
			defaultShiftRateKop: 0,
			minGuaranteeMonthlyKop: 0,
			taxRegime: "employee",
			categoryRates: { orthopedics: 35, therapy: 20 },
		};
		const ord: PayrollServiceOrder = {
			id: "ord-ident",
			orderNumber: "О-1",
			dateIso: "2026-10-10",
			patientName: "Пациент",
			medicalCardNumber: "100",
			serviceNameRu: "Коронка",
			category: "orthopedics",
			categoryLabelRu: "Ортопедия",
			grossKopecks: 1800000,
			listPriceKopecks: 2000000,
			discountKopecks: 200000,
			labCostKopecks: 400000,
			materialCostKopecks: 100000,
			isPaid54Fz: true,
			paidKopecks: 1800000,
			doctorId: "doc-multi",
		};

		// net_proportional_discount: base = 18k - 4k - 1k = 13k; orthopedics rate = 35% -> 4 550 ₽
		const proportional = calculateOrderNetAndFee(ord, doc, null, "net_proportional_discount", "proportional");
		assert.equal(proportional.netBase, 1300000);
		assert.equal(proportional.fee, 455000);

		// gross_before_discount: base = 20k - 4k - 1k = 15k; 35% -> 5 250 ₽
		const grossModel = calculateOrderNetAndFee(ord, doc, null, "gross_before_discount", "proportional");
		assert.equal(grossModel.netBase, 1500000);
		assert.equal(grossModel.fee, 525000);
	});
});
