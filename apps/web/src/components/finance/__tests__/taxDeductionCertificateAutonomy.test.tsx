/**
 * taxDeductionCertificateAutonomy.test.tsx
 *
 * Inquisition & Autonomy Unit Tests for TaxDeductionCertificateModal & taxDeductionEngine:
 * 1. Download and print buttons are NOT disabled when payments count is 0 (disabled === false).
 * 2. Action buttons meet Apple HIG min-height >= 44px touch targets.
 * 3. Strict Calendar Year Isolation (01.01–31.12): Multi-year payments never leak across tax years.
 * 4. Net Paid Calculation: Subtracting partial refunds (e.g. 100k paid - 20k refunded = 80k net reported)
 *    strictly separated by Code 1 (standard) and Code 2 (expensive treatment).
 * 5. FNS Order No. EA-7-11/824@ XML & HTML formatting integrity.
 * 6. Verified adherence to Mandates 8b (Exact Kopecks), 8e (Autonomy), and 8n (Solo Doctor Sovereignty).
 */

import React from "react";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderToString } from "react-dom/server";
import { TaxDeductionCertificateModal } from "../TaxDeductionCertificateModal";
import {
	calculateTaxDeductionSummary,
	generateFnsTaxDeductionXml,
	generateFnsNoMedoplXml,
	normalizePaymentsForTaxCertificate,
	renderOfficialTaxCertificateKnd1151156Html,
	type TaxDeductionCertificateParams,
	type TaxDeductionPaymentItem,
} from "../taxDeductionEngine";

describe("TaxDeductionCertificateModal Autonomy & Non-blocking Actions", () => {
	it("renders action buttons without disabled attribute even when payments are empty", () => {
		const html = renderToString(
			<TaxDeductionCertificateModal
				isOpen={true}
				onClose={() => {}}
				patientName="Иванов Иван Иванович"
				patientInn="771234567890"
				payments={[]}
				clinicName="ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"
				clinicInn="7701234567"
				clinicKpp="770101001"
				clinicOgrn="1157746123456"
				clinicAddress="г. Москва, ул. Ленина, д. 10"
				clinicLicenseNumber="ЛО-77-01-012345"
				clinicLicenseDate="01.01.2020"
			/>
		);

		// Verify buttons are present
		assert.ok(html.includes("Печать справки КНД 1151156 (А4)"), "Print certificate button must be rendered");
		assert.ok(html.includes("Выгрузить XML (ТКС)"), "Download XML button must be rendered");
		assert.ok(html.includes("NO_MEDOPL (5.01)"), "Download NO_MEDOPL button must be rendered");

		// Verify buttons are NOT disabled
		assert.ok(!html.includes('disabled="" title="Скачать файл NO_MEDOPL'), "NO_MEDOPL button must not be disabled");
		assert.ok(!html.includes('disabled="" class="min-h-[44px] px-5'), "Print certificate button must not be disabled");
		assert.ok(!html.includes('disabled="" class="min-h-[44px] px-4'), "Download XML button must not be disabled");

		// Verify Apple HIG touch targets
		assert.ok(html.includes("min-h-[44px]"), "All action buttons must have min-h-[44px] touch target");
	});
});
describe("Tax Deduction Engine & Calendar Year Isolation (Order EA-7-11/824@)", () => {
	const multiYearPayments: (TaxDeductionPaymentItem & { isRefund?: boolean; operationType?: string })[] = [
		{
			id: "pay-2024-1",
			dateIso: "2024-05-10T10:00:00.000Z",
			receiptNumber: "Ч-2024-001",
			fiscalDocumentNumber: "101",
			fiscalSign: "99881122",
			serviceName: "Лечение кариеса эмали",
			code804n: "A16.07.002.001",
			amountRub: 15000,
			amountKopecks: 1500000,
			taxCode: "1",
		},
		{
			id: "pay-2025-1",
			dateIso: "2025-03-15T11:00:00.000Z",
			receiptNumber: "Ч-2025-001",
			fiscalDocumentNumber: "201",
			fiscalSign: "11223344",
			serviceName: "Дентальная имплантация Straumann",
			code804n: "A16.07.054",
			amountRub: 100000,
			amountKopecks: 10000000,
			taxCode: "2",
		},
		{
			id: "refund-2025-1",
			dateIso: "2025-04-20T12:00:00.000Z",
			receiptNumber: "В-2025-001",
			fiscalDocumentNumber: "202",
			fiscalSign: "44332211",
			serviceName: "Возврат средств за имплантацию",
			code804n: "A16.07.054",
			amountRub: -20000,
			amountKopecks: -2000000,
			isRefund: true,
			operationType: "refund",
			taxCode: "2",
		},
		{
			id: "pay-2026-1",
			dateIso: "2026-02-01T09:30:00.000Z",
			receiptNumber: "Ч-2026-001",
			fiscalDocumentNumber: "301",
			fiscalSign: "77665544",
			serviceName: "Профессиональная гигиена полости рта",
			code804n: "A16.07.051",
			amountRub: 8000,
			amountKopecks: 800000,
			taxCode: "1",
		},
	];

	it("strictly isolates calendar year and deducts partial refunds (100k - 20k = 80k Net Paid)", () => {
		const summary = calculateTaxDeductionSummary(multiYearPayments);

		// Must have 3 separate years: 2026, 2025, 2024
		assert.equal(summary.yearsSummary.length, 3, "Summary must track 3 calendar years");

		const year2025 = summary.yearsSummary.find((y) => y.taxYear === 2025);
		assert.ok(year2025, "Year 2025 must exist in summary");

		// Code 02 (expensive): 100,000 paid - 20,000 refunded = 80,000 Net Paid
		assert.equal(year2025.code02Rub, 80000, "Code 02 net ruble amount must be exactly 80,000 ₽");
		assert.equal(year2025.code02Kopecks, 8000000, "Code 02 net kopecks must be 8,000,000 kop");
		assert.equal(year2025.code01Rub, 0, "Code 01 must be 0 for year 2025");
		assert.equal(year2025.totalRub, 80000, "Total net for 2025 must be 80,000 ₽");
		assert.equal(year2025.totalKopecks, 8000000, "Total kopecks for 2025 must be 8,000,000 kop");

		// Estimated 13% tax return on 80,000 ₽ is 10,400 ₽ (unlimited for Code 2)
		assert.equal(year2025.refund13EstimateRub, 10400, "13% deduction refund must be 10,400 ₽");
		assert.equal(year2025.refund13EstimateKopecks, 1040000, "13% deduction refund kopecks must be 1,040,000 kop");

		// 2024 checks: 15,000 ₽ (Code 01)
		const year2024 = summary.yearsSummary.find((y) => y.taxYear === 2024);
		assert.ok(year2024);
		assert.equal(year2024.code01Rub, 15000);
		assert.equal(year2024.code02Rub, 0);

		// 2026 checks: 8,000 ₽ (Code 01)
		const year2026 = summary.yearsSummary.find((y) => y.taxYear === 2026);
		assert.ok(year2026);
		assert.equal(year2026.code01Rub, 8000);
		assert.equal(year2026.code02Rub, 0);
	});

	it("normalizes payments for target year in normalizePaymentsForTaxCertificate", () => {
		const normalized2025 = normalizePaymentsForTaxCertificate(multiYearPayments, 2025);
		assert.equal(normalized2025.length, 1, "Only 1 netted item should remain for 2025");
		assert.equal(normalized2025[0]?.amountRub, 80000, "Net item amount must be 80,000 ₽");
		assert.equal(normalized2025[0]?.amountKopecks, 8000000, "Net item kopecks must be 8,000,000 kop");
	});

	it("generates FNS Order 824@ XML with strictly 80,000.00 Net Paid and zero other years leakage", () => {
		const certParams: TaxDeductionCertificateParams = {
			certificateNumber: "1151156-2025-001",
			issueDateIso: "2025-05-01T10:00:00.000Z",
			taxYear: 2025,
			taxOfficeCode: "7701",
			clinic: {
				legalName: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
				inn: "7701234567",
				kpp: "770101001",
				ogrn: "1157746123456",
				licenseNumber: "ЛО-77-01-012345",
				licenseDate: "01.01.2020",
				address: "г. Москва, ул. Ленина, д. 10",
				chiefDoctorName: "Петров П.П.",
			},
			payer: {
				fullName: "Смирнов Алексей Владимирович",
				inn: "772512345678",
				birthDate: "1985-06-15",
				identityDocumentSeries: "4510",
				identityDocumentNumber: "123456",
				relationship: "patient",
			},
			patient: {
				fullName: "Смирнов Алексей Владимирович",
				birthDate: "1985-06-15",
				inn: "772512345678",
			},
			payments: multiYearPayments,
		};

		const { xmlContent } = generateFnsTaxDeductionXml(certParams);

		// Must contain Code 02 with 80000.00 and СуммаВсего="80000.00"
		assert.ok(xmlContent.includes('СуммаКод2="80000.00"'), "XML must declare СуммаКод2='80000.00'");
		assert.ok(xmlContent.includes('СуммаВсего="80000.00"'), "XML must declare СуммаВсего='80000.00'");
		assert.ok(xmlContent.includes('ОтчГод="2025"'), "XML must declare taxYear 2025");

		// Must NOT contain unnetted 100000.00 or leaked 2024/2026 sums
		assert.ok(!xmlContent.includes('100000.00'), "XML must NOT report unnetted 100,000.00");
		assert.ok(!xmlContent.includes('15000.00'), "XML must NOT leak 2024 payment 15,000.00");
		assert.ok(!xmlContent.includes('8000.00'), "XML must NOT leak 2026 payment 8,000.00");

		// NO_MEDOPL Format 5.01 test
		const noMedopl = generateFnsNoMedoplXml(certParams);
		assert.ok(noMedopl.xmlContent.includes('СумОпл="80000.00"'), "NO_MEDOPL XML must declare 80000.00");
		assert.ok(!noMedopl.xmlContent.includes('СумОпл="100000.00"'), "NO_MEDOPL XML must not declare 100000.00");

		// HTML Printable Form test
		const html = renderOfficialTaxCertificateKnd1151156Html(certParams);
		assert.ok(
			html.includes("80\u00A0000,00") || html.includes("80 000,00") || html.includes("80000.00") || html.includes("80000"),
			"HTML certificate must display 80,000 ₽"
		);
		assert.ok(html.includes("Восемьдесят тысяч рублей 00 копеек"), "Sum in words must state 'Восемьдесят тысяч рублей 00 копеек'");
	});
});
