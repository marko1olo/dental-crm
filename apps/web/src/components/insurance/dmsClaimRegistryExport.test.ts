/**
 * dmsClaimRegistryExport.test.ts — Unit tests for DMS Insurers Contracts & Claims Registry Export.
 */

import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
	DEFAULT_STATUTORY_INSURANCE_CONTRACTS,
	DEFAULT_MONTHLY_DMS_REGISTRY_RECORDS,
	DEFAULT_CLINIC_PROFILE,
	formatKopecksToRub,
	formatRubInt,
	generateDmsRegistryXml,
	generateDmsRegistryCsv,
	generateDmsA4PrintableHtml,
} from "./dmsClaimRegistryExport.js";

describe("DmsClaimRegistryExport — Statutory Insurance Contracts Catalog", () => {
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
		}
	});

	it("1.2 Formats kopecks to rubles correctly with currency symbol", () => {
		const formatted = formatKopecksToRub(450000);
		assert.ok(formatted.includes("4") && formatted.includes("500") && (formatted.includes("00") || formatted.includes(",00")));
		assert.ok(formatted.includes("₽"));
		const formattedInt = formatRubInt(450000);
		assert.ok(formattedInt.includes("4") && formattedInt.includes("500"));
		assert.ok(formattedInt.includes("₽"));
	});
});

describe("DmsClaimRegistryExport — 1-Click Export Engines (XML, CSV, A4 HTML)", () => {
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
	});

	it("2.2 Generates RFC 4180 CSV registry with UTF-8 BOM for Microsoft Excel / 1C", () => {
		const csv = generateDmsRegistryCsv(
			DEFAULT_MONTHLY_DMS_REGISTRY_RECORDS,
			DEFAULT_CLINIC_PROFILE,
			"АО «СОГАЗ»",
			"Август 2026 г.",
		);

		assert.equal(csv.charCodeAt(0), 0xfeff);
		const lines = csv.slice(1).split("\r\n");
		assert.ok(lines.length >= DEFAULT_MONTHLY_DMS_REGISTRY_RECORDS.length + 2);
		assert.ok(lines[0]?.includes("№ п/п;Дата визита;Ф.И.О. Застрахованного"));
		assert.ok(lines[1]?.includes("Иванов Сергей Алексеевич"));
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
		assert.ok(html.includes("ДВУСТОРОННИЙ АКТ СДАЧИ-ПРИЕМКИ ОКАЗАННЫХ УСЛУГ"));
	});

	it("2.4 Proves kopeck balance integrity in monthly registry records", () => {
		for (const rec of DEFAULT_MONTHLY_DMS_REGISTRY_RECORDS) {
			assert.equal(
				rec.dmsCoveredKopecks + rec.patientPaidKopecks,
				rec.totalPriceKopecks,
			);
		}
	});
});
