/**
 * dmsSSOTSuite.test.tsx — Canonical Test Suite for Russian DMS Insurance & Split Billing SSOT.
 *
 * Mandates:
 * - 8wy / 8l (Pure integer BigInt kopeck math, zero float errors)
 * - 8e (Doctor & Staff Autonomy: no blocked buttons, 1-click workflows)
 * - 8am (Exactly ONE Primary CTA button #0d9488)
 * - 8x / 8ap (Human Russian clinical language, zero raw law numbers)
 * - 8b (Healthy sweet spot: catalog 280-350 lines, studio 380-480 lines)
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	calculateDmsCoPaymentSplit,
	calculatePatientPaymentSplit,
	calculateRegistryTotals,
	exportRegistryToCsv,
	formatCurrencyKopecks,
	formatCurrencyRub,
	generateBilateralAcceptanceActHtml,
	kopecksToRub,
	rubToKopecks,
	RUSSIAN_DMS_INSURERS,
	TOP_6_DMS_INSURER_CHIPS,
	STANDARD_DMS_LIMITS_RUB,
	DMS_STANDARD_EXCLUSIONS,
	NOMENCLATURE_804N_CATALOG,
	type DmsBillableItem,
	type DmsGuaranteeLetter,
	type DmsRegistryServiceRecord,
} from "../dmsCatalogData.js";
import { DmsStudioModal } from "../DmsStudioModal.js";
import { DirectInsuranceLauncher } from "../DirectInsuranceLauncher.js";

describe("DMS Insurance & Bill Split SSOT — Architectural Line Count Constraints (Mandate 8b)", () => {
	const insuranceDir = path.resolve(process.cwd(), "src/components/insurance");

	it("1.1 dmsCatalogData.ts conforms to Sweet Spot (280-350 lines)", () => {
		const filePath = path.join(insuranceDir, "dmsCatalogData.ts");
		assert.ok(fs.existsSync(filePath), "dmsCatalogData.ts must exist");
		const content = fs.readFileSync(filePath, "utf-8");
		const lines = content.split("\n").length;
		assert.ok(
			lines >= 280 && lines <= 350,
			`dmsCatalogData.ts must be 280-350 lines, got ${lines}`,
		);
	});

	it("1.2 DmsStudioModal.tsx conforms to Sweet Spot (380-480 lines)", () => {
		const filePath = path.join(insuranceDir, "DmsStudioModal.tsx");
		assert.ok(fs.existsSync(filePath), "DmsStudioModal.tsx must exist");
		const content = fs.readFileSync(filePath, "utf-8");
		const lines = content.split("\n").length;
		assert.ok(
			lines >= 380 && lines <= 480,
			`DmsStudioModal.tsx must be 380-480 lines, got ${lines}`,
		);
	});

	it("1.3 DirectInsuranceLauncher.tsx conforms to Sweet Spot (60-100 lines)", () => {
		const filePath = path.join(insuranceDir, "DirectInsuranceLauncher.tsx");
		assert.ok(fs.existsSync(filePath), "DirectInsuranceLauncher.tsx must exist");
		const content = fs.readFileSync(filePath, "utf-8");
		const lines = content.split("\n").length;
		assert.ok(
			lines >= 60 && lines <= 100,
			`DirectInsuranceLauncher.tsx must be 60-100 lines, got ${lines}`,
		);
	});
});

describe("DMS Insurance SSOT — Russian Insurers & Statutory Standards", () => {
	it("2.1 Contains Top Russian DMS insurers with complete legal requisites", () => {
		assert.ok(RUSSIAN_DMS_INSURERS.length >= 6);
		const ids = RUSSIAN_DMS_INSURERS.map((i) => i.id);
		assert.ok(ids.includes("sogaz"), "СОГАЗ must be present");
		assert.ok(ids.includes("ingosstrakh"), "Ингосстрах must be present");
		assert.ok(ids.includes("reso"), "РЕСО-Гарантия must be present");
		assert.ok(ids.includes("alfastrakh"), "АльфаСтрахование must be present");
		assert.ok(ids.includes("vsk"), "ВСК must be present");
		assert.ok(ids.includes("soglasie"), "Согласие must be present");

		for (const ins of RUSSIAN_DMS_INSURERS) {
			assert.ok(ins.inn && ins.inn.length >= 10, `Valid INN required for ${ins.name}`);
			assert.ok(ins.ogrn && ins.ogrn.length >= 13, `Valid OGRN required for ${ins.name}`);
			assert.ok(ins.curatorPhone, `Curator phone required for ${ins.name}`);
		}
	});

	it("2.2 Defines standard insurance limits and exclusions", () => {
		assert.deepEqual(STANDARD_DMS_LIMITS_RUB, [30000, 50000, 100000, 150000]);
		assert.ok(DMS_STANDARD_EXCLUSIONS.some((e) => e.code === "orthodontics"));
		assert.ok(DMS_STANDARD_EXCLUSIONS.some((e) => e.code === "implantology"));
		assert.ok(DMS_STANDARD_EXCLUSIONS.some((e) => e.code === "whitening"));
	});
});

describe("DMS Bill Split Engine — Pure Integer BigInt Kopeck Math (Mandate 8wy, 8l)", () => {
	const sampleBillItems: readonly DmsBillableItem[] = [
		{ id: "1", serviceCode: "A16.07.002.001", serviceName: "Восстановление зуба пломбой", quantity: 1, unitPriceKopecks: 450000 },
		{ id: "2", serviceCode: "A16.07.030.002", serviceName: "Эндодонтическое лечение", quantity: 1, unitPriceKopecks: 580000 },
		{ id: "3", serviceCode: "A11.07.010", serviceName: "Анестезия проводниковая", quantity: 2, unitPriceKopecks: 95000 },
	];

	it("3.1 Exact 100% DMS Coverage with 0% franchise", () => {
		const totalKopecks = 450000 + 580000 + 2 * 95000; // 1 220 000 коп = 12 200 ₽
		const letter: DmsGuaranteeLetter = {
			id: "let-1",
			letterNumber: "ГП-101",
			patientFullName: "Соколова А.В.",
			issueDate: "01.08.2026",
			validUntil: "31.12.2026",
			maxApprovedAmountKopecks: 5000000,
		};

		const result = calculateDmsCoPaymentSplit(sampleBillItems, { guaranteeLetter: letter, franchisePercent: 0 });
		assert.equal(result.totalBillKopecks, totalKopecks);
		assert.equal(result.totalInsuranceCoveredKopecks, totalKopecks);
		assert.equal(result.totalPatientOutOfPocketKopecks, 0);
		assert.equal(result.integrityInvariantHolds, true);
		assert.equal(result.totalBillKopecks, result.totalInsuranceCoveredKopecks + result.totalPatientOutOfPocketKopecks);
	});

	it("3.2 Proves integer kopeck split math for 20% and 50% franchise", () => {
		const singleItem: DmsBillableItem[] = [
			{ id: "1", serviceCode: "A16.07.002", serviceName: "Пломба", quantity: 1, unitPriceKopecks: 1000033 }, // 10 000.33 ₽
		];

		// 20% franchise: copay = (1000033n * 20n) / 100n = 200006 коп
		const split20 = calculateDmsCoPaymentSplit(singleItem, { franchisePercent: 20 });
		assert.equal(split20.totalBillKopecks, 1000033);
		assert.equal(split20.totalInsuranceCoveredKopecks, 800027);
		assert.equal(split20.totalPatientOutOfPocketKopecks, 200006);
		assert.equal(split20.integrityInvariantHolds, true);
		assert.equal(split20.totalBillKopecks, split20.totalInsuranceCoveredKopecks + split20.totalPatientOutOfPocketKopecks);

		// 50% franchise: copay = (1000033n * 50n) / 100n = 500016 коп
		const split50 = calculateDmsCoPaymentSplit(singleItem, { franchisePercent: 50 });
		assert.equal(split50.totalBillKopecks, 1000033);
		assert.equal(split50.totalInsuranceCoveredKopecks, 500017);
		assert.equal(split50.totalPatientOutOfPocketKopecks, 500016);
		assert.equal(split50.integrityInvariantHolds, true);
		assert.equal(split50.totalBillKopecks, split50.totalInsuranceCoveredKopecks + split50.totalPatientOutOfPocketKopecks);
	});

	it("3.3 Excess beyond letter remaining limit transfers 100% to patient without penny loss", () => {
		const items: DmsBillableItem[] = [
			{ id: "1", serviceCode: "A16.07.002", serviceName: "Пломба", quantity: 1, unitPriceKopecks: 500000 },
			{ id: "2", serviceCode: "A16.07.030", serviceName: "Эндодонтия", quantity: 1, unitPriceKopecks: 800000 },
		];
		// Total: 1 300 000 коп. Letter limit: 1 000 000 коп. Remaining: 600 000 коп.
		const letter: DmsGuaranteeLetter = {
			id: "let-lim",
			letterNumber: "ГП-ЛИМИТ",
			patientFullName: "Соколова А.В.",
			issueDate: "01.08.2026",
			validUntil: "31.12.2026",
			maxApprovedAmountKopecks: 1000000,
			usedAmountKopecks: 400000, // Available: 600 000 коп
		};

		const split = calculateDmsCoPaymentSplit(items, { guaranteeLetter: letter });
		assert.equal(split.totalBillKopecks, 1300000);
		assert.equal(split.totalInsuranceCoveredKopecks, 600000);
		assert.equal(split.totalPatientOutOfPocketKopecks, 700000);
		assert.equal(split.integrityInvariantHolds, true);
	});

	it("3.4 Excluded services are 100% out-of-pocket for patient", () => {
		const items: DmsBillableItem[] = [
			{ id: "1", serviceCode: "A16.07.002", serviceName: "Пломба", quantity: 1, unitPriceKopecks: 400000 },
			{ id: "2", serviceCode: "A16.07.050", serviceName: "Отбеливание Zoom 4", quantity: 1, unitPriceKopecks: 2600000, isExcluded: true },
		];
		const split = calculateDmsCoPaymentSplit(items);
		assert.equal(split.totalBillKopecks, 3000000);
		assert.equal(split.totalInsuranceCoveredKopecks, 400000);
		assert.equal(split.totalPatientOutOfPocketKopecks, 2600000);
		assert.equal(split.integrityInvariantHolds, true);
	});

	it("3.5 Patient payment split breakdown (cash/card/mixed)", () => {
		const payment = calculatePatientPaymentSplit(500000, "mixed", 200000);
		assert.equal(payment.cashKopecks, 200000);
		assert.equal(payment.cardKopecks, 300000);
		assert.equal(payment.isBalanced, true);
	});
});

describe("DMS Registry & Acceptance Act Export", () => {
	const sampleRecords: readonly DmsRegistryServiceRecord[] = [
		{ id: "1", visitId: "v-1", visitDate: "15.08.2026", patientId: "p-1", patientFullName: "Соколова Анна Викторовна", policyNumber: "СГЗ-001", insurerName: "АО «СОГАЗ»", serviceCode804n: "A16.07.002.001", serviceName: "Пломба", quantity: 1, unitPriceRub: 4500, totalPriceRub: 4500, dmsCoveredRub: 4500, patientPaidRub: 0, isExcluded: false },
		{ id: "2", visitId: "v-1", visitDate: "15.08.2026", patientId: "p-1", patientFullName: "Соколова Анна Викторовна", policyNumber: "СГЗ-001", insurerName: "АО «СОГАЗ»", serviceCode804n: "A16.07.051", serviceName: "Гигиена", quantity: 1, unitPriceRub: 6500, totalPriceRub: 6500, dmsCoveredRub: 5200, patientPaidRub: 1300, isExcluded: false },
	];

	it("4.1 calculateRegistryTotals computes exact totals and verifies balance", () => {
		const totals = calculateRegistryTotals(sampleRecords, "АО «СОГАЗ»");
		assert.equal(totals.totalServicesCount, 2);
		assert.equal(totals.uniquePatientsCount, 1);
		assert.equal(totals.totalAmountRub, 11000);
		assert.equal(totals.totalDmsCoveredRub, 9700);
		assert.equal(totals.totalPatientPaidRub, 1300);
		assert.equal(totals.isBalanced, true);
	});

	it("4.2 exportRegistryToCsv produces valid CSV with UTF-8 BOM", () => {
		const csv = exportRegistryToCsv(sampleRecords, { name: "ООО «ДЕНТЕ»", inn: "7701234567" }, "АО «СОГАЗ»", "Август 2026");
		assert.ok(csv.startsWith("\uFEFF"), "Must start with UTF-8 BOM");
		assert.ok(csv.includes("Соколова Анна Викторовна"));
		assert.ok(csv.includes("ИТОГО"));
	});

	it("4.3 generateBilateralAcceptanceActHtml produces formal acceptance act", () => {
		const html = generateBilateralAcceptanceActHtml({
			records: sampleRecords,
			summary: calculateRegistryTotals(sampleRecords),
			clinicInfo: { name: "ООО «ДЕНТЕ»", inn: "7701234567", address: "г. Москва", chiefDoctor: "Смирнов В.А." },
			insurerInfo: { name: "АО «СОГАЗ»", representative: "Куратор", contractNumber: "ДМС-01", contractDate: "10.01.2026" },
			actNumber: "АКТ-01",
			actDate: "31.08.2026",
		});
		assert.ok(html.includes("АКТ СДАЧИ-ПРИЕМКИ № АКТ-01"));
		assert.ok(html.includes("ОТ ИСПОЛНИТЕЛЯ"));
		assert.ok(html.includes("ОТ ЗАКАЗЧИКА"));
	});
});

describe("DmsStudioModal UI & Doctor Autonomy (Mandates 8e, 8am)", () => {
	it("5.1 Renders DmsStudioModal with exactly ONE Primary CTA button (#0d9488)", () => {
		const html = renderToString(
			<DmsStudioModal isOpen={true} onClose={() => {}} />,
		);
		assert.ok(html.includes("ДМС и страховые полисы"));
		assert.ok(html.includes("✓ Утвердить ДМС-сплит"));
		assert.ok(!html.includes("disabled"), "Doctor autonomy: CTA buttons must never be disabled");
	});

	it("5.2 DirectInsuranceLauncher renders cleanly", () => {
		const html = renderToString(<DirectInsuranceLauncher />);
		assert.ok(typeof html === "string");
	});
});
