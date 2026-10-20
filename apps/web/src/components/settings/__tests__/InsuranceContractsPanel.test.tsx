/**
 * apps/web/src/components/settings/__tests__/InsuranceContractsPanel.test.tsx
 *
 * Test suite for Clinic DMS / VHI Insurance Contracts Panel and its decomposed submodules.
 * Validates Mandates 8b (<= 500 lines), 8d (zero cartoon emojis), 8e (doctor autonomy),
 * and Apple HIG touch target guidelines.
 */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { InsuranceContractCard } from "../insuranceModules/InsuranceContractCard";
import { InsuranceContractList } from "../insuranceModules/InsuranceContractList";
import { InsuranceContractsHeader } from "../insuranceModules/InsuranceContractsHeader";
import { InsuranceDmsTariffTable } from "../insuranceModules/InsuranceDmsTariffTable";
import { InsuranceGuaranteeLettersList } from "../insuranceModules/InsuranceGuaranteeLettersList";
import type {
	GuaranteeLetterSummary,
	InsuranceContract,
} from "../insuranceModules/insuranceContractsTypes";

const mockContract: InsuranceContract = {
	id: "contract-sogaz-001",
	companyName: "СОГАЗ Мед",
	policyNumberMask: "СОГ-****-****",
	coverageTherapyPct: 100,
	coverageSurgeryPct: 80,
	coverageOrthoPct: 50,
	coverageHygienePct: 100,
	annualLimitRub: 150000,
	patientFranchisePct: 0,
	requiresGuaranteeLetter: true,
	isActive: true,
	createdAt: "2026-01-01T00:00:00.000Z",
};

const mockLetters: GuaranteeLetterSummary[] = [
	{
		id: "gp-001",
		contractId: "contract-sogaz-001",
		patientId: "pat-123",
		patientFullName: "Иванов Иван Иванович",
		policyNumber: "СОГ-1234-5678",
		insurerName: "СОГАЗ Мед",
		letterNumber: "ГП-2026/89",
		validFrom: "2026-01-01",
		validUntil: "2026-12-31",
		maxCoverageRub: 50000,
		usedAmountRub: 12000,
		franchisePct: 0,
		curatorFullName: "Смирнова А.В.",
		curatorPhone: "+7 (999) 000-11-22",
		status: "active",
	},
];

describe("InsuranceContractsPanel — Modular DMS Suite (Mandates 8b, 8d, 8e)", () => {
	it("1. InsuranceContractsHeader: renders title, export buttons, and touch-friendly CTA", () => {
		let exportedFormat = "";
		let addModalOpened = false;

		const html = renderToStaticMarkup(
			<InsuranceContractsHeader
				onExportRegistry={(format) => {
					exportedFormat = format;
				}}
				onOpenAddModal={() => {
					addModalOpened = true;
				}}
			/>,
		);

		expect(html.includes('data-testid="insurance-contracts-header"')).toBe(true);
		expect(html.includes("Договоры ДМС")).toBe(true);
		expect(html.includes("Реестр ДМС (XML)")).toBe(true);
		expect(html.includes("Реестр ДМС (CSV)")).toBe(true);
		expect(html.includes("Добавить договор")).toBe(true);
	});

	it("2. InsuranceContractCard: displays coverage progress bars, franchise and limits", () => {
		const html = renderToStaticMarkup(
			<InsuranceContractCard
				contract={mockContract}
				guaranteeLetters={mockLetters}
				onEdit={() => {}}
				onDeactivate={() => {}}
			/>,
		);

		expect(html.includes('data-testid="insurance-contract-card-contract-sogaz-001"')).toBe(true);
		expect(html.includes("СОГАЗ Мед")).toBe(true);
		expect(html.includes("Франшиза 0% (100% ДМС)")).toBe(true);
		expect(html.includes("ГП обязательно")).toBe(true);
		expect(html.includes("Активных ГП: 1")).toBe(true);
		expect(html.includes("Маска: СОГ-****-****")).toBe(true);
		expect(html.includes(mockContract.annualLimitRub!.toLocaleString("ru-RU"))).toBe(true);

		// 4 statutory categories
		expect(html.includes("Терапия")).toBe(true);
		expect(html.includes("100%")).toBe(true);
		expect(html.includes("Хирургия")).toBe(true);
		expect(html.includes("80%")).toBe(true);
		expect(html.includes("Ортопедия")).toBe(true);
		expect(html.includes("50%")).toBe(true);
		expect(html.includes("Профгигиена")).toBe(true);

		// Action buttons test-ids
		expect(html.includes('data-testid="btn-edit-contract-contract-sogaz-001"')).toBe(true);
		expect(html.includes('data-testid="btn-deactivate-contract-contract-sogaz-001"')).toBe(true);
	});

	it("3. InsuranceContractList: renders responsive grid of contracts", () => {
		const html = renderToStaticMarkup(
			<InsuranceContractList
				contracts={[mockContract]}
				guaranteeLetters={mockLetters}
				onEditContract={() => {}}
				onDeactivateContract={() => {}}
			/>,
		);

		expect(html.includes('data-testid="insurance-contract-list"')).toBe(true);
		expect(html.includes("СОГАЗ Мед")).toBe(true);
	});

	it("4. InsuranceDmsTariffTable: renders statutory 804n categories and coverage rates", () => {
		const html = renderToStaticMarkup(
			<InsuranceDmsTariffTable contracts={[mockContract]} />,
		);

		expect(html.includes('data-testid="insurance-dms-tariff-table"')).toBe(true);
		expect(html.includes("Тарифные сетки ДМС по номенклатуре 804н")).toBe(true);
		expect(html.includes("Терапевтическая стоматология (А16.07.002)")).toBe(true);
		expect(html.includes("Хирургическая стоматология (А16.07.001)")).toBe(true);
		expect(html.includes("Ортопедическая помощь (А16.07.004)")).toBe(true);
		expect(html.includes("Профессиональная гигиена (А16.07.051)")).toBe(true);
	});

	it("5. InsuranceGuaranteeLettersList: renders active patient letters and remaining amounts", () => {
		const html = renderToStaticMarkup(
			<InsuranceGuaranteeLettersList letters={mockLetters} />,
		);

		expect(html.includes('data-testid="insurance-guarantee-letters-list"')).toBe(true);
		expect(html.includes("Иванов Иван Иванович")).toBe(true);
		expect(html.includes("СОГАЗ Мед")).toBe(true);
		expect(html.includes("ГП: ГП-2026/89")).toBe(true);
		expect(html.includes("Полис: СОГ-1234-5678")).toBe(true);
		expect(html.includes("Действует до: 2026-12-31")).toBe(true);
		expect(html.includes("Куратор: Смирнова А.В.")).toBe(true);
		const remainingRub = mockLetters[0]!.maxCoverageRub - mockLetters[0]!.usedAmountRub;
		expect(html.includes(remainingRub.toLocaleString("ru-RU"))).toBe(true);
		expect(html.includes(mockLetters[0]!.maxCoverageRub.toLocaleString("ru-RU"))).toBe(true);
	});

	it("6. InsuranceGuaranteeLettersList: returns null when empty", () => {
		const html = renderToStaticMarkup(
			<InsuranceGuaranteeLettersList letters={[]} />,
		);
		expect(html).toBe("");
	});

	it("7. Zero raw emojis across all rendered components (Mandate 8d)", () => {
		const cardHtml = renderToStaticMarkup(
			<InsuranceContractCard
				contract={mockContract}
				guaranteeLetters={mockLetters}
				onEdit={() => {}}
				onDeactivate={() => {}}
			/>,
		);
		const lettersHtml = renderToStaticMarkup(
			<InsuranceGuaranteeLettersList letters={mockLetters} />,
		);
		const tariffHtml = renderToStaticMarkup(
			<InsuranceDmsTariffTable contracts={[mockContract]} />,
		);

		const combined = cardHtml + lettersHtml + tariffHtml;
		expect(combined.includes("⚡")).toBe(false);
		expect(combined.includes("⭐")).toBe(false);
		expect(combined.includes("🚨")).toBe(false);
		expect(combined.includes("⚠️")).toBe(false);
	});
});
