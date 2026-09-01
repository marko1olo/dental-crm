/**
 * DENTE Dental CRM — 1C:Enterprise (1С:Бухгалтерия 8.3 / 1С:Медицина)
 * CommerceML 2.09 Statutory Financial & Medical Integration Test Suite.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

function expect(actual: any) {
	return {
		toBe: (expected: any) => assert.equal(actual, expected),
		toEqual: (expected: any) => assert.deepEqual(actual, expected),
		toBeGreaterThan: (expected: number) => assert.ok(actual > expected, `${actual} is not > ${expected}`),
		toBeDefined: () => assert.notEqual(actual, undefined),
		toContain: (expected: any) => {
			if (typeof actual === "string" || Array.isArray(actual)) {
				assert.ok(actual.includes(expected), `Expected ${actual} to contain ${expected}`);
			} else {
				assert.ok(expected in actual);
			}
		},
		toMatch: (regex: RegExp) => assert.match(String(actual), regex),
		not: {
			toBe: (expected: any) => assert.notEqual(actual, expected),
		},
	};
}
import {
	COMMERCEML_VERSION_209,
	COMMERCEML_XMLNS,
	DEFAULT_1C_CHART_OF_ACCOUNTS,
	DEFAULT_CLINIC_PROFILE_1C,
	ENTERPRISEDATA_VERSION_113,
	ENTERPRISEDATA_XMLNS,
	TAX_EXEMPTION_ARTICLE_149_RU,
	computeCommerceMlSha256,
	createRealisticShiftExportPackage,
	generateCommerceMl209PackageXml,
	generateCommerceMl209Xml,
	generateEnterpriseData113Xml,
	generateMaterialsWriteoffCsv,
	generatePayrollCsv,
	generateRetailSalesCsv,
	kopecksToRub,
	rubToKopecks,
	validatePackageIntegrity,
} from "../finance/commerceMl209.js";

describe("CommerceML 2.09 & 1C Statutory Integration Engine", () => {
	const samplePackage = createRealisticShiftExportPackage(
		"2026-09-01",
		DEFAULT_CLINIC_PROFILE_1C,
		DEFAULT_1C_CHART_OF_ACCOUNTS,
	);

	describe("1. Statutory Package Generation & Invariants", () => {
		it("creates a well-formed package with exact integer kopecks", () => {
			expect(samplePackage.packageId).toBe("pkg-20260901-DN");
			expect(samplePackage.exportPeriodStartIso).toBe("2026-09-01");
			expect(samplePackage.exportPeriodEndIso).toBe("2026-09-01");

			// Retail sales document total must equal sum of items
			const salesDoc = samplePackage.retailSalesDocument;
			const itemsSumKop = salesDoc.items.reduce((s, it) => s + it.totalKopecks, 0);
			expect(salesDoc.totalRevenueKopecks).toBe(itemsSumKop);

			// Payments sum must equal total sales revenue
			const paymentsSumKop = salesDoc.payments.reduce(
				(s, p) => s + p.amountKopecks,
				0,
			);
			expect(paymentsSumKop).toBe(salesDoc.totalRevenueKopecks);

			// VAT must be strictly 0 under Art. 149 Tax Code
			expect(salesDoc.totalVatKopecks).toBe(0);
			for (const item of salesDoc.items) {
				expect(item.vatRate).toBe("Без НДС");
				expect(item.vatAmountKopecks).toBe(0);
			}
		});

		it("correctly maps 1C Chart of Accounts (50.01, 51, 57.03, 62, 10, 20.01, 70, 68.01, 69.01)", () => {
			const accounts = samplePackage.chartOfAccounts;
			expect(accounts.accountCashDesk).toBe("50.01");
			expect(accounts.accountBankCurrent).toBe("51");
			expect(accounts.accountAcquiringTransit).toBe("57.03");
			expect(accounts.accountMaterials).toBe("10.01");
			expect(accounts.accountConsumables).toBe("10.06");
			expect(accounts.accountProductionCost).toBe("20.01");
			expect(accounts.accountPayroll).toBe("70");
			expect(accounts.accountNdfl).toBe("68.01");
			expect(accounts.accountSocialTaxes).toBe("69.01");
			expect(accounts.accountSalesRevenue).toBe("90.01.1");
			expect(accounts.accountSalesCost).toBe("90.02.1");
		});

		it("contains medical acts with 804n nomenclature codes and FDI tooth numbers", () => {
			const acts = samplePackage.medicalActs;
			expect(acts.length).toBeGreaterThan(0);

			for (const act of acts) {
				expect(act.patient.fullName).toBeDefined();
				expect(act.attendingDoctorName).toBeDefined();
				expect(act.items.length).toBeGreaterThan(0);

				for (const it of act.items) {
					expect(it.code804n).toMatch(/^A\d{2}\.\d{2}\.\d{3}/);
					expect(it.priceKopecks).toBeGreaterThan(0);
					expect(it.totalKopecks).toBe(
						it.priceKopecks * it.quantity - it.discountKopecks,
					);
				}
			}
		});

		it("contains CSO and warehouse write-offs (Account 10.01/10.06 -> 20.01) with SanPiN cycle links", () => {
			const writeoffDoc = samplePackage.materialWriteoffDocument;
			expect(writeoffDoc.items.length).toBeGreaterThan(0);

			const itemsSumKop = writeoffDoc.items.reduce(
				(s, it) => s + it.totalCostKopecks,
				0,
			);
			expect(writeoffDoc.totalCostKopecks).toBe(itemsSumKop);

			// CSO sterilizer cycle link check
			const csoItem = writeoffDoc.items.find((it) => it.sterilizerCycleNumber);
			expect(csoItem).toBeDefined();
			expect(csoItem?.debitAccount).toBe("20.01");
			expect(["10.01", "10.06"]).toContain(csoItem?.creditAccount);
			expect(csoItem?.batchNumber).toBeDefined();
			expect(csoItem?.expirationDateIso).toBeDefined();
		});

		it("contains Doctor Payroll reflection (Form T-51 / T-13)", () => {
			const payroll = samplePackage.payrollDocument;
			expect(payroll).toBeDefined();
			expect(payroll?.employees.length).toBeGreaterThan(0);

			for (const emp of payroll!.employees) {
				expect(emp.grossEarnedKopecks).toBeGreaterThan(0);
				expect(emp.ndfl13Kopecks).toBe(
					Math.round(emp.grossEarnedKopecks * 0.13),
				);
				expect(emp.socialInsuranceTaxesKopecks).toBe(
					Math.round(emp.grossEarnedKopecks * 0.3),
				);
				expect(emp.netPayoutKopecks).toBe(
					emp.grossEarnedKopecks - emp.ndfl13Kopecks,
				);
				expect(emp.debitAccount).toBe("20.01");
				expect(emp.creditAccountPayroll).toBe("70");
				expect(emp.creditAccountNdfl).toBe("68.01");
				expect(emp.creditAccountSocial).toBe("69.01");
			}
		});
	});

	describe("2. XML Generation & Standards Compliance", () => {
		it("generates statutory CommerceML 2.09 XML with valid namespace and elements", () => {
			const xml = generateCommerceMl209PackageXml(samplePackage);

			expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
			expect(xml).toContain(`xmlns="${COMMERCEML_XMLNS}"`);
			expect(xml).toContain(`ВерсияСхемы="${COMMERCEML_VERSION_209}"`);
			expect(xml).toContain("<КоммерческаяИнформация");
			expect(xml).toContain("</КоммерческаяИнформация>");

			// Clinic classification
			expect(xml).toContain("<Классификатор>");
			expect(xml).toContain(`<ИНН>${samplePackage.clinic.inn}</ИНН>`);
			expect(xml).toContain(`<КПП>${samplePackage.clinic.kpp}</КПП>`);

			// Retail Sales document
			expect(xml).toContain(
				"<ХозяйственнаяОперация>Отчет о розничных продажах</ХозяйственнаяОперация>",
			);
			expect(xml).toContain("<Наименование>ОсвобождениеОтНДС</Наименование>");
			expect(xml).toContain(`<Значение>${TAX_EXEMPTION_ARTICLE_149_RU}</Значение>`);
			expect(xml).toContain("<Наименование>СчетДоходов</Наименование>");
			expect(xml).toContain("<Значение>90.01.1</Значение>");
			expect(xml).toContain("<Наименование>СчетКасса</Наименование>");
			expect(xml).toContain("<Значение>50.01</Значение>");
			expect(xml).toContain("<Наименование>СчетЭквайринг</Наименование>");
			expect(xml).toContain("<Значение>57.03</Значение>");
			expect(xml).toContain("<Наименование>СчетРасчетный</Наименование>");
			expect(xml).toContain("<Значение>51</Значение>");

			// Medical Acts
			expect(xml).toContain(
				"<ХозяйственнаяОперация>Акт об оказании медицинских услуг</ХозяйственнаяОперация>",
			);
			expect(xml).toContain("<Код804н>A16.07.002.001</Код804н>");
			expect(xml).toContain("<Зуб>16</Зуб>");

			// Material write-offs
			expect(xml).toContain(
				"<ХозяйственнаяОперация>Требование-накладная</ХозяйственнаяОперация>",
			);
			expect(xml).toContain("<СчетДебета>20.01</СчетДебета>");
			expect(xml).toContain("<СчетКредита>10.01</СчетКредита>");

			// Payroll reflection
			expect(xml).toContain(
				"<ХозяйственнаяОперация>Отражение зарплаты в бухучете</ХозяйственнаяОперация>",
			);
			expect(xml).toContain("<Наименование>СчетЗарплатыКт</Наименование>");
			expect(xml).toContain("<Наименование>СчетНдфлКт</Наименование>");
			expect(xml).toContain("<Наименование>СчетВзносовКт</Наименование>");
		});

		it("generates EnterpriseData v1.13 XML", () => {
			const xml = generateEnterpriseData113Xml(samplePackage);

			expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
			expect(xml).toContain(`xmlns="${ENTERPRISEDATA_XMLNS}"`);
			expect(xml).toContain("<Message");
			expect(xml).toContain("</Message>");
			expect(xml).toContain("<Document.ОтчетОРозничныхПродажах>");
			expect(xml).toContain("<Document.ТребованиеНакладная>");
			expect(xml).toContain("<Document.ОтражениеЗарплатыВБухучете>");
		});

		it("generates CSV files for Universal 1C import with UTF-8 BOM", () => {
			const salesCsv = generateRetailSalesCsv(samplePackage.retailSalesDocument);
			expect(salesCsv.startsWith("\uFEFF")).toBe(true);
			expect(salesCsv).toContain("НомерДокумента;Дата;Касса;Склад;Код804н;Номенклатура");
			expect(salesCsv).toContain("90.01.1");
			expect(salesCsv).toContain("Без НДС");

			const matCsv = generateMaterialsWriteoffCsv(
				samplePackage.materialWriteoffDocument,
			);
			expect(matCsv.startsWith("\uFEFF")).toBe(true);
			expect(matCsv).toContain("НомерДокумента;Дата;СкладОтправитель;Подразделение");
			expect(matCsv).toContain("20.01");
			expect(matCsv).toContain("10.01");

			const payCsv = generatePayrollCsv(samplePackage.payrollDocument!);
			expect(payCsv.startsWith("\uFEFF")).toBe(true);
			expect(payCsv).toContain("ТабельныйНомер;Сотрудник;Должность;Специальность");
			expect(payCsv).toContain("70");
			expect(payCsv).toContain("20.01");
		});
	});

	describe("3. SHA-256 Idempotency & Double Posting Protection", () => {
		it("generates deterministic SHA-256 hash for identical packages", () => {
			const hash1 = computeCommerceMlSha256(samplePackage);
			const hash2 = computeCommerceMlSha256(samplePackage);
			expect(hash1).toBe(hash2);
			expect(hash1).toMatch(/^[a-f0-9]{64}$/);
		});

		it("alters SHA-256 hash when even a single kopeck or character changes", () => {
			const hashOriginal = computeCommerceMlSha256(samplePackage);

			const modifiedPkg = JSON.parse(JSON.stringify(samplePackage));
			modifiedPkg.retailSalesDocument.totalRevenueKopecks += 100; // 1.00 RUB difference

			const hashModified = computeCommerceMlSha256(modifiedPkg);
			expect(hashOriginal).not.toBe(hashModified);
		});
	});

	describe("4. Package Integrity & Accounting Balance Validator", () => {
		it("validates mathematically balanced package successfully", () => {
			const integrity = validatePackageIntegrity(samplePackage);
			expect(integrity.isValid).toBe(true);
			expect(integrity.errors.length).toBe(0);
			expect(integrity.totalsKop.salesGross).toBe(
				samplePackage.retailSalesDocument.totalRevenueKopecks,
			);
			expect(integrity.totalsKop.materialsCost).toBe(
				samplePackage.materialWriteoffDocument.totalCostKopecks,
			);
		});

		it("detects and flags payment balance discrepancies", () => {
			const corruptedPkg = JSON.parse(JSON.stringify(samplePackage));
			corruptedPkg.retailSalesDocument.payments[0].amountKopecks += 50000; // Unbalanced +500 RUB

			const integrity = validatePackageIntegrity(corruptedPkg);
			expect(integrity.isValid).toBe(false);
			expect(
				integrity.errors.some((e) =>
					e.includes("Несходимость оплат в Отчете о розничных продажах"),
				),
			).toBe(true);
		});
	});
});
