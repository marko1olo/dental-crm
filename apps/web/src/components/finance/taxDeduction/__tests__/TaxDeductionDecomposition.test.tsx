import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToString } from "react-dom/server";

import {
	TaxDeductionCertificateModal,
	TaxDeductionHeader,
	TaxDeductionPayerForm,
	TaxDeductionPaymentsTable,
	TaxDeductionFooterActions,
	TaxDeductionFamilyTab,
	TaxDeductionChecksTab,
	TaxDeductionXmlTab,
	TaxDeductionModalFooter,
	TaxDeductionRequisitesForm,
	useTaxDeductionCertificate,
} from "../../TaxDeductionCertificateModal";

describe("TaxDeductionCertificateModal Modular Architecture", () => {
	const currentDir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1"));
	const moduleDir = path.resolve(currentDir, "..");
	const facadePath = path.resolve(moduleDir, "../TaxDeductionCertificateModal.tsx");

	describe("1. Architectural Budget & File Limit Invariants (Mandate 8b)", () => {
		it("ensures canonical thin facade exists and is strictly <= 120 lines", () => {
			assert.ok(fs.existsSync(facadePath), `Facade file must exist at ${facadePath}`);
			const content = fs.readFileSync(facadePath, "utf-8");
			const lines = content.split("\n").length;
			assert.ok(lines <= 120, `Facade must be <= 120 lines, got ${lines}`);
		});

		it("ensures all decomposed files in taxDeduction/ are strictly <= 800 lines", () => {
			const files = fs.readdirSync(moduleDir).filter((f) => /\.(ts|tsx)$/.test(f));
			assert.ok(files.length >= 6, "Must have at least 6 decomposed files in module");

			for (const f of files) {
				const filePath = path.join(moduleDir, f);
				const content = fs.readFileSync(filePath, "utf-8");
				const lines = content.split("\n").length;
				assert.ok(
					lines <= 800,
					`File ${f} must be <= 800 lines, but has ${lines} lines`,
				);
			}
		});
	});

	describe("2. Public Export Parity", () => {
		it("exports all required subcomponents and hooks from facade and barrel", () => {
			assert.equal(typeof TaxDeductionCertificateModal, "function");
			assert.equal(typeof TaxDeductionHeader, "function");
			assert.equal(typeof TaxDeductionPayerForm, "function");
			assert.equal(typeof TaxDeductionPaymentsTable, "function");
			assert.equal(typeof TaxDeductionFooterActions, "function");
			assert.equal(typeof TaxDeductionFamilyTab, "function");
			assert.equal(typeof TaxDeductionChecksTab, "function");
			assert.equal(typeof TaxDeductionXmlTab, "function");
			assert.equal(typeof TaxDeductionModalFooter, "function");
			assert.equal(typeof TaxDeductionRequisitesForm, "function");
			assert.equal(typeof useTaxDeductionCertificate, "function");
		});
	});

	describe("3. React Component Rendering & Test Anchor Parity", () => {
		it("renders TaxDeductionCertificateModal with payments and preserves all test anchors", () => {
			const html = renderToString(
				<TaxDeductionCertificateModal
					isOpen={true}
					onClose={() => {}}
					patientName="Смирнов Алексей Викторович"
					patientBirthDate="1985-06-15"
					patientInn="771234567890"
					selectedYear={2026}
					payments={[
						{
							id: "pay-1",
							dateIso: "2026-02-10T10:00:00.000Z",
							receiptNumber: "Ч-2026-001",
							fiscalDocumentNumber: "501",
							fiscalSign: "88776655",
							serviceName: "Профессиональная гигиена полости рта",
							code804n: "A16.07.051",
							amountRub: 8500,
							amountKopecks: 850000,
							taxCode: "1",
						},
						{
							id: "pay-2",
							dateIso: "2026-03-14T14:30:00.000Z",
							receiptNumber: "Ч-2026-002",
							fiscalDocumentNumber: "502",
							fiscalSign: "99887766",
							serviceName: "Дентальная имплантация Straumann",
							code804n: "A16.07.054",
							amountRub: 65000,
							amountKopecks: 6500000,
							taxCode: "2",
						},
					]}
					clinicName="ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"
					clinicInn="7701234567"
					clinicKpp="770101001"
					clinicLicenseNumber="ЛО-77-01-012345"
					clinicLicenseDate="01.01.2020"
				/>,
			);

			assert.ok(html.includes('data-testid="tax-certificate-stamp-badge"'));
			assert.ok(html.includes("ПОДПИСАНО ВРАЧОМ"));
			assert.ok(html.includes('aria-label="Закрыть модальное окно справки"'));
			assert.ok(html.includes('data-testid="btn-tax-print-blank"'));
			assert.ok(html.includes('aria-label="Печать справки для налоговой (вычет 13%)"'));
			assert.ok(html.includes("Профессиональная гигиена полости рта"));
			assert.ok(html.includes("Дентальная имплантация Straumann"));
		});

		it("renders null when isOpen is false", () => {
			const html = renderToString(
				<TaxDeductionCertificateModal
					isOpen={false}
					onClose={() => {}}
				/>,
			);
			assert.equal(html, "");
		});
	});
});
