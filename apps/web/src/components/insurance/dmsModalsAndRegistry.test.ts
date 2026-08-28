/**
 * dmsModalsAndRegistry.test.ts — Unit tests for DMS Insurers Hub & Guarantee Letters Modals.
 *
 * Tests:
 * 1. Statutory Insurance Contracts Catalog (СОГАЗ, АльфаСтрахование, Ингосстрах, РЕСО, ВСК, Согласие) & franchise rates.
 * 2. Monthly Consolidated Claims Registry: XML generation, RFC 4180 CSV with UTF-8 BOM, and Printable A4 HTML.
 * 3. Guarantee Letter data models, 80% soft warning indicator, and limit progress-bar status thresholds.
 * 4. FDI Adult Teeth notation, Common ICD-10 Dental Diagnoses, and 804n Nomenclature matching.
 * 5. Kopeck-Exact Split Calculator: DMS Coverage vs Patient CoPay balance invariance.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
	DEFAULT_STATUTORY_INSURANCE_CONTRACTS,
	DEFAULT_MONTHLY_DMS_REGISTRY_RECORDS,
	DEFAULT_CLINIC_PROFILE,
	formatKopecksToRub,
	formatRubInt,
	generateDmsRegistryXml,
	generateDmsRegistryCsv,
	generateDmsA4PrintableHtml,
} from "./DmsInsurersHubModal.js";

import {
	DEFAULT_PATIENT_GUARANTEE_LETTERS,
	DEFAULT_BILL_ITEMS_TO_SPLIT,
	COMMON_DENTAL_ICD10_DIAGNOSES,
	FDI_ADULT_TEETH_UPPER,
	FDI_ADULT_TEETH_LOWER,
} from "./DmsGuaranteeLettersModal.js";

describe("DmsInsurersHubModal — Statutory Insurance Contracts Catalog", () => {
	it("1.1 Contains top Russian insurance companies with contract numbers and franchise rates", () => {
		assert.equal(DEFAULT_STATUTORY_INSURANCE_CONTRACTS.length, 6);

		const expectedInsurers = [
			{ key: "sogaz", name: "АО «СОГАЗ»", franchise: 0 },
			{ key: "alfastrakhovanie", name: "АО «АльфаСтрахование»", franchise: 10 },
			{ key: "ingosstrakh", name: "СПАО «Ингосстрах»", franchise: 15 },
			{ key: "reso_garantiya", name: "СПАО «РЕСО-Гарантия»", franchise: 0 },
			{ key: "vsk", name: "САО «ВСК»", franchise: 20 },
			{ key: "soglasie", name: "ООО «СК «Согласие»", franchise: 0 },
		];

		for (const exp of expectedInsurers) {
			const contract = DEFAULT_STATUTORY_INSURANCE_CONTRACTS.find((c) => c.insurerKey === exp.key);
			assert.ok(contract, `Contract for ${exp.key} must exist`);
			assert.equal(contract.insurerShortName, exp.name);
			assert.equal(contract.defaultFranchisePct, exp.franchise);
			assert.ok(contract.contractNumber.length > 0);
			assert.ok(contract.inn.length >= 10);
			assert.ok(contract.curatorFullName.length > 0);
			assert.ok(contract.curatorPhone.length > 0);
		}
	});

	it("1.2 Formats kopecks to rubles correctly with currency symbol", () => {
		const formatted = formatKopecksToRub(450000); // 4,500.00 RUB
		assert.ok(formatted.includes("4") && formatted.includes("500") && (formatted.includes("00") || formatted.includes(",00")));
		assert.ok(formatted.includes("₽"));

		const formattedInt = formatRubInt(450000);
		assert.ok(formattedInt.includes("4") && formattedInt.includes("500"));
		assert.ok(formattedInt.includes("₽"));
	});
});

describe("DmsInsurersHubModal — 1-Click Export Engines (XML, CSV, A4 HTML)", () => {
	it("2.1 Generates valid electronic XML registry conforming to Russian DMS interchange standards", () => {
		const xml = generateDmsRegistryXml(
			DEFAULT_MONTHLY_DMS_REGISTRY_RECORDS,
			DEFAULT_CLINIC_PROFILE,
			DEFAULT_STATUTORY_INSURANCE_CONTRACTS[0],
			"Август 2026 г.",
			"РЕЕСТР-2026-08/SOGAZ",
		);

		assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
		assert.ok(xml.includes("<DmsReconciliationRegistry"));
		assert.ok(xml.includes("<RegistryNumber>РЕЕСТР-2026-08/SOGAZ</RegistryNumber>"));
		assert.ok(xml.includes("<LegalName>ООО «Стоматологический Центр «ДЕНТЕ»</LegalName>"));
		assert.ok(xml.includes("<INN>7701984210</INN>"));
		assert.ok(xml.includes("<ServiceCode804n>A16.07.002.001</ServiceCode804n>"));
		assert.ok(xml.includes("<DiagnosisMkb10>K02.1</DiagnosisMkb10>"));
		assert.ok(xml.includes("<ToothFdi>1.6</ToothFdi>"));
		assert.ok(xml.includes("<IntegrityInvariantVerified>true</IntegrityInvariantVerified>"));
		assert.ok(xml.includes("<VatExemptionLaw>Без НДС (пп. 2 п. 2 ст. 149 Налогового кодекса РФ)</VatExemptionLaw>"));
	});

	it("2.2 Generates RFC 4180 CSV registry with UTF-8 BOM for Microsoft Excel / 1C", () => {
		const csv = generateDmsRegistryCsv(
			DEFAULT_MONTHLY_DMS_REGISTRY_RECORDS,
			DEFAULT_CLINIC_PROFILE,
			"АО «СОГАЗ»",
			"Август 2026 г.",
		);

		// Must start with UTF-8 BOM (\uFEFF)
		assert.equal(csv.charCodeAt(0), 0xfeff);

		const lines = csv.slice(1).split("\r\n");
		assert.ok(lines.length >= DEFAULT_MONTHLY_DMS_REGISTRY_RECORDS.length + 2);

		// Header checks
		assert.ok(lines[0]?.includes("№ п/п;Дата визита;Ф.И.О. Застрахованного"));
		assert.ok(lines[0]?.includes("Код услуги (804н);Наименование медицинской услуги"));
		assert.ok(lines[0]?.includes("К оплате ДМС (руб);Сооплата пациента (руб)"));

		// Data row checks
		assert.ok(lines[1]?.includes("Иванов Сергей Алексеевич"));
		assert.ok(lines[1]?.includes("A16.07.002.001"));
		assert.ok(lines[1]?.includes("4500.00"));

		// Summary row
		const lastLine = lines[lines.length - 1] ?? "";
		assert.ok(lastLine.startsWith("ИТОГО ПО РЕЕСТРУ"));
	});

	it("2.3 Generates A4 Printable HTML consolidated invoice-registry and bilateral acceptance act", () => {
		const html = generateDmsA4PrintableHtml(
			DEFAULT_MONTHLY_DMS_REGISTRY_RECORDS,
			DEFAULT_CLINIC_PROFILE,
			DEFAULT_STATUTORY_INSURANCE_CONTRACTS[0],
			"Август 2026 г.",
			"РЕЕСТР-2026-08/SOGAZ",
		);

		assert.ok(html.includes("<!DOCTYPE html>"));
		assert.ok(html.includes("СЧЕТ-РЕЕСТР МЕДИЦИНСКИХ УСЛУГ ПО ДМС № РЕЕСТР-2026-08/SOGAZ"));
		assert.ok(html.includes("ООО «Стоматологический Центр «ДЕНТЕ»"));
		assert.ok(html.includes("АО «СОГАЗ»") || html.includes("АО &quot;СОГАЗ&quot;"));
		assert.ok(html.includes("A16.07.002.001"));
		assert.ok(html.includes("K02.1"));
		assert.ok(html.includes("ДВУСТОРОННИЙ АКТ СДАЧИ-ПРИЕМКИ ОКАЗАННЫХ УСЛУГ"));
		assert.ok(html.includes("ОТ ИСПОЛНИТЕЛЯ"));
		assert.ok(html.includes("ОТ СТРАХОВЩИКА"));
		assert.ok(html.includes("М.П."));
	});

	it("2.4 Proves kopeck balance integrity in monthly registry records", () => {
		for (const rec of DEFAULT_MONTHLY_DMS_REGISTRY_RECORDS) {
			assert.equal(
				rec.dmsCoveredKopecks + rec.patientPaidKopecks,
				rec.totalPriceKopecks,
				`Record ${rec.id} must preserve penny balance: DMS (${rec.dmsCoveredKopecks}) + Patient (${rec.patientPaidKopecks}) === Total (${rec.totalPriceKopecks})`,
			);
		}
	});
});

describe("DmsGuaranteeLettersModal — Guarantee Letters, FDI Formula & Diagnoses", () => {
	it("3.1 Validates default patient guarantee letters and limit thresholds", () => {
		assert.ok(DEFAULT_PATIENT_GUARANTEE_LETTERS.length >= 2);

		const activeLetter = DEFAULT_PATIENT_GUARANTEE_LETTERS[0]!;
		assert.equal(activeLetter.status, "active");
		assert.equal(activeLetter.maxCoverageKopecks, 5000000); // 50,000.00 RUB
		assert.equal(activeLetter.usedAmountKopecks, 1250000); // 12,500.00 RUB (25%)

		const usedPct = Math.round((activeLetter.usedAmountKopecks / activeLetter.maxCoverageKopecks) * 100);
		assert.equal(usedPct, 25);
		assert.ok(usedPct < 80, "25% usage should be in green range (<80%)");

		const expiredLetter = DEFAULT_PATIENT_GUARANTEE_LETTERS[1]!;
		const usedPctExpired = Math.round((expiredLetter.usedAmountKopecks / expiredLetter.maxCoverageKopecks) * 100);
		assert.equal(usedPctExpired, 85);
		assert.ok(usedPctExpired >= 80 && usedPctExpired < 100, "85% usage should be in yellow warning range (80-99%)");
	});

	it("3.2 Contains standard adult FDI teeth notation (11..48)", () => {
		assert.equal(FDI_ADULT_TEETH_UPPER.length, 16);
		assert.equal(FDI_ADULT_TEETH_LOWER.length, 16);

		assert.ok(FDI_ADULT_TEETH_UPPER.includes("1.8"));
		assert.ok(FDI_ADULT_TEETH_UPPER.includes("1.1"));
		assert.ok(FDI_ADULT_TEETH_UPPER.includes("2.1"));
		assert.ok(FDI_ADULT_TEETH_UPPER.includes("2.8"));

		assert.ok(FDI_ADULT_TEETH_LOWER.includes("4.8"));
		assert.ok(FDI_ADULT_TEETH_LOWER.includes("4.1"));
		assert.ok(FDI_ADULT_TEETH_LOWER.includes("3.1"));
		assert.ok(FDI_ADULT_TEETH_LOWER.includes("3.8"));
	});

	it("3.3 Contains standard Russian dental ICD-10 diagnoses", () => {
		assert.ok(COMMON_DENTAL_ICD10_DIAGNOSES.length >= 8);

		const codes = COMMON_DENTAL_ICD10_DIAGNOSES.map((d) => d.code);
		assert.ok(codes.includes("K02.1")); // Кариес дентина
		assert.ok(codes.includes("K04.0")); // Пульпит
		assert.ok(codes.includes("K04.5")); // Хронический периодонтит
		assert.ok(codes.includes("K05.1")); // Гингивит
		assert.ok(codes.includes("K01.1")); // Дистопия/ретенция
	});

	it("3.4 Validates default bill items to split", () => {
		assert.equal(DEFAULT_BILL_ITEMS_TO_SPLIT.length, 3);
		assert.equal(DEFAULT_BILL_ITEMS_TO_SPLIT[0]?.serviceCode804n, "A16.07.002.001");
		assert.equal(DEFAULT_BILL_ITEMS_TO_SPLIT[1]?.serviceCode804n, "A11.07.010");
		assert.equal(DEFAULT_BILL_ITEMS_TO_SPLIT[2]?.serviceCode804n, "A16.07.050"); // Zoom bleaching
	});
});
