import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	COMMERCEML_VERSION_209,
	ENTERPRISEDATA_VERSION_113,
	TAX_EXEMPTION_ARTICLE_149_RU,
	createRealisticShiftExportPackage,
	formatKopToRub,
	formatKopToRubLocale,
	generateAccountantExecutiveSummary,
	generateCombinedCsvBundle,
	generateCommerceMl209Xml,
	generateEnterpriseData113Xml,
	generateMaterialWriteoffCsv,
	generatePayrollReflectionCsv,
	generateRetailSalesCsv,
	type OneCChartOfAccounts,
	type OneCClinicProfile,
	type OneCCommerceMlPackage,
	validateOneCClinicCredentials,
	validatePackageIntegrity,
} from "../oneCCommerceMlEngine";

describe("1C:Enterprise CommerceML 2.09 & EnterpriseData 1.13 Engine", () => {
	const testDateIso = "2026-08-28";
	const samplePackage: OneCCommerceMlPackage = createRealisticShiftExportPackage(testDateIso);

	describe("Realistic Shift Package Integrity & Exact Kopeck Math", () => {
		it("generates a 100% valid package with zero discrepancies", () => {
			const integrity = validatePackageIntegrity(samplePackage);
			assert.equal(integrity.isValid, true, `Validation errors: ${integrity.errors.join("; ")}`);
			assert.equal(integrity.errors.length, 0);
		});

		it("ensures retail sales item sums match total revenue kopecks exactly", () => {
			const sumItems = samplePackage.retailSalesDocument.items.reduce(
				(sum, it) => sum + it.totalKopecks,
				0,
			);
			assert.equal(sumItems, samplePackage.retailSalesDocument.totalRevenueKopecks);
			assert.equal(sumItems, 14750000); // 147,500.00 RUB
		});

		it("ensures payment tender breakdown strictly matches total sales revenue", () => {
			const sumPayments = samplePackage.retailSalesDocument.payments.reduce(
				(sum, p) => sum + p.amountKopecks,
				0,
			);
			assert.equal(sumPayments, samplePackage.retailSalesDocument.totalRevenueKopecks);
		});

		it("ensures material writeoff line items match total BOM cost exactly", () => {
			const sumMaterials = samplePackage.materialWriteoffDocument.items.reduce(
				(sum, it) => sum + it.totalCostKopecks,
				0,
			);
			assert.equal(sumMaterials, samplePackage.materialWriteoffDocument.totalCostKopecks);
		});

		it("ensures payroll gross, ndfl, social taxes and net payout balance for every employee", () => {
			for (const emp of samplePackage.payrollDocument.employees) {
				assert.equal(
					emp.grossEarnedKopecks - emp.ndfl13Kopecks,
					emp.netPayoutKopecks,
					`Discrepancy for ${emp.employeeName}`,
				);
			}

			const totalGross = samplePackage.payrollDocument.employees.reduce(
				(sum, e) => sum + e.grossEarnedKopecks,
				0,
			);
			const totalNet = samplePackage.payrollDocument.employees.reduce(
				(sum, e) => sum + e.netPayoutKopecks,
				0,
			);
			const totalNdfl = samplePackage.payrollDocument.employees.reduce(
				(sum, e) => sum + e.ndfl13Kopecks,
				0,
			);

			assert.equal(totalGross, samplePackage.payrollDocument.totalGrossKopecks);
			assert.equal(totalNet, samplePackage.payrollDocument.totalNetPayoutKopecks);
			assert.equal(totalNdfl, samplePackage.payrollDocument.totalNdflKopecks);
		});

		it("catches arithmetic discrepancies when data is manipulated", () => {
			const corruptedPackage: OneCCommerceMlPackage = {
				...samplePackage,
				retailSalesDocument: {
					...samplePackage.retailSalesDocument,
					totalRevenueKopecks: samplePackage.retailSalesDocument.totalRevenueKopecks + 100, // +1.00 RUB discrepancy
				},
			};

			const result = validatePackageIntegrity(corruptedPackage);
			assert.equal(result.isValid, false);
			assert.ok(result.errors.some((e) => e.includes("Несходимость выручки")));
		});

		it("catches employee Gross - NDFL != Net discrepancy", () => {
			const corruptedPackage: OneCCommerceMlPackage = {
				...samplePackage,
				payrollDocument: {
					...samplePackage.payrollDocument,
					employees: [
						{
							...samplePackage.payrollDocument.employees[0]!,
							netPayoutKopecks: samplePackage.payrollDocument.employees[0]!.netPayoutKopecks + 500,
						},
						...samplePackage.payrollDocument.employees.slice(1),
					],
				},
			};

			const result = validatePackageIntegrity(corruptedPackage);
			assert.equal(result.isValid, false);
			assert.ok(result.errors.some((e) => e.includes("Ошибка расчета сотрудника")));
		});
	});

	describe("CommerceML 2.09 XML Package Generator", () => {
		it("renders valid CommerceML 2.09 XML with all required sections and namespaces", () => {
			const xml = generateCommerceMl209Xml(samplePackage);

			assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
			assert.ok(xml.includes('xmlns="urn:1C.ru:commerceml_2"'));
			assert.ok(xml.includes(`ВерсияСхемы="${COMMERCEML_VERSION_209}"`));
			assert.ok(xml.includes("<Классификатор>"));
			assert.ok(xml.includes("<Владелец>"));
			assert.ok(xml.includes("<ИНН>7701234560</ИНН>"));
			assert.ok(xml.includes("<КПП>770101001</КПП>"));
			assert.ok(xml.includes("<РасчетныеСчета>"));
		});

		it("renders Document 1 (Отчет о розничных продажах) with 804n nomenclature and payments", () => {
			const xml = generateCommerceMl209Xml(samplePackage);

			assert.ok(xml.includes("<ХозяйственнаяОперация>Отчет о розничных продажах</ХозяйственнаяОперация>"));
			assert.ok(xml.includes("<Сумма>147500.00</Сумма>"));
			assert.ok(xml.includes("<Код804н>A16.07.002.001</Код804н>"));
			assert.ok(xml.includes("<Код804н>A16.07.054.001</Код804н>"));
			assert.ok(xml.includes("<СтавкаНДС>Без НДС</СтавкаНДС>"));
			assert.ok(xml.includes(`<Значение>${TAX_EXEMPTION_ARTICLE_149_RU}</Значение>`));
			assert.ok(xml.includes("<ВидОплаты>Наличные в кассу (50.01)</ВидОплаты>"));
			assert.ok(xml.includes("<ВидОплаты>Оплата банковской картой / Эквайринг (57.03)</ВидОплаты>"));
			assert.ok(xml.includes("<ВидОплаты>Система быстрых платежей / QR (51)</ВидОплаты>"));
		});

		it("renders Document 2 (Требование-накладная / BOM) with batch numbers and accounts", () => {
			const xml = generateCommerceMl209Xml(samplePackage);

			assert.ok(xml.includes("<ХозяйственнаяОперация>Требование-накладная</ХозяйственнаяОперация>"));
			assert.ok(xml.includes("<СкладОтправитель>Основной склад клиники</СкладОтправитель>"));
			assert.ok(xml.includes("<ПодразделениеПолучатель>Лечебное отделение</ПодразделениеПолучатель>"));
			assert.ok(xml.includes("<Материалы>"));
			assert.ok(xml.includes("<Артикул>MAT-FLT-250</Артикул>"));
			assert.ok(xml.includes("<Артикул>MAT-STRAUM-BLX</Артикул>"));
			assert.ok(xml.includes("<Партия>Партия №2408-A</Партия>"));
			assert.ok(xml.includes("<СчетДебета>20.01</СчетДебета>"));
			assert.ok(xml.includes("<СчетКредита>10.01</СчетКредита>"));
		});

		it("renders Document 3 (Отражение зарплаты в бухучете) with piece-rate and staff payroll", () => {
			const xml = generateCommerceMl209Xml(samplePackage);

			assert.ok(xml.includes("<ХозяйственнаяОперация>Отражение зарплаты в бухучете</ХозяйственнаяОперация>"));
			assert.ok(xml.includes("<ТабельныйНомер>ВР-001</ТабельныйНомер>"));
			assert.ok(xml.includes("<ФИО>Барабаш С.В.</ФИО>"));
			assert.ok(xml.includes("<ТабельныйНомер>ВР-002</ТабельныйНомер>"));
			assert.ok(xml.includes("<ФИО>Васильев Д.М.</ФИО>"));
			assert.ok(xml.includes("<СчетКредитаЗарплата>70</СчетКредитаЗарплата>"));
			assert.ok(xml.includes("<СчетКредитаНДФЛ>68.01</СчетКредитаНДФЛ>"));
			assert.ok(xml.includes("<СчетКредитаВзносы>69.01</СчетКредитаВзносы>"));
		});

		it("properly escapes XML special characters in clinic and product names", () => {
			const customClinic: Partial<OneCClinicProfile> = {
				name: 'ООО "ДЕНТЕ & ПАРТНЕРЫ <ЭЛИТ>"',
				fullName: 'Общество с ограниченной ответственностью "ДЕНТЕ & ПАРТНЕРЫ <ЭЛИТ>"',
			};
			const pkgWithSpecialChars = createRealisticShiftExportPackage(testDateIso, customClinic);
			const xml = generateCommerceMl209Xml(pkgWithSpecialChars);

			assert.ok(xml.includes("&quot;ДЕНТЕ &amp; ПАРТНЕРЫ &lt;ЭЛИТ&gt;&quot;"));
			assert.ok(!xml.includes('<Наименование>ООО "ДЕНТЕ & ПАРТНЕРЫ <ЭЛИТ>"</Наименование>'));
		});
	});

	describe("EnterpriseData v1.13 XML Generator", () => {
		it("renders valid EnterpriseData 1.13 XML schema and document structures", () => {
			const xml = generateEnterpriseData113Xml(samplePackage);

			assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
			assert.ok(xml.includes(`xmlns="http://v8.1c.ru/edi/edi_stnd/EnterpriseData/${ENTERPRISEDATA_VERSION_113}"`));
			assert.ok(xml.includes("<Header>"));
			assert.ok(xml.includes("<Source>CRM_DENTE</Source>"));
			assert.ok(xml.includes("<Destination>1C_ACCOUNTING_30</Destination>"));
			assert.ok(xml.includes("<Document.ОтчетОРозничныхПродажах>"));
			assert.ok(xml.includes("<Document.ТребованиеНакладная>"));
			assert.ok(xml.includes("<Document.ОтражениеЗарплатыВБухучете>"));
		});

		it("contains exact monetary amounts in EnterpriseData format", () => {
			const xml = generateEnterpriseData113Xml(samplePackage);

			assert.ok(xml.includes("<Amount>147500.00</Amount>"));
			assert.ok(xml.includes("<TotalCost>24567.50</TotalCost>"));
			assert.ok(xml.includes("<TotalGross>36625.00</TotalGross>"));
		});
	});

	describe("Universal CSV Exporters for 1C", () => {
		it("generates valid Retail Sales CSV starting with UTF-8 BOM", () => {
			const csv = generateRetailSalesCsv(samplePackage.retailSalesDocument);

			assert.ok(csv.startsWith("\uFEFF"));
			assert.ok(csv.includes("НомерДокумента;Дата;Касса;Склад;Код804н;Номенклатура;Зуб;ЕдИзм;Количество;Цена;Скидка;Сумма;СтавкаНДС;ВрачФИО;СчетУчета;НоменклатурнаяГруппа"));
			assert.ok(csv.includes("A16.07.002.001"));
			assert.ok(csv.includes("A16.07.054.001"));
			assert.ok(csv.includes("Барабаш С.В."));
		});

		it("generates valid Material Writeoff CSV with batch numbers and accounts", () => {
			const csv = generateMaterialWriteoffCsv(samplePackage.materialWriteoffDocument);

			assert.ok(csv.startsWith("\uFEFF"));
			assert.ok(csv.includes("НомерДокумента;Дата;СкладОтправитель;ПодразделениеПолучатель;Артикул;Номенклатура;Партия;СрокГодности;ЕдИзм;Количество;Себестоимость;Сумма;СчетДебета;СчетКредита;СтатьяЗатрат"));
			assert.ok(csv.includes("MAT-FLT-250"));
			assert.ok(csv.includes("20.01"));
			assert.ok(csv.includes("10.01"));
		});

		it("generates valid Payroll Reflection CSV with employee calculations", () => {
			const csv = generatePayrollReflectionCsv(samplePackage.payrollDocument);

			assert.ok(csv.startsWith("\uFEFF"));
			assert.ok(csv.includes("НомерДокумента;Дата;Период;ТабельныйНомер;Сотрудник;Должность;Специальность;ВидНачисления;СуммаНачислено;НДФЛ13;СтраховыеВзносы;КВыплате;СчетДт;СчетКт;СтатьяЗатрат"));
			assert.ok(csv.includes("ВР-001"));
			assert.ok(csv.includes("Барабаш С.В."));
			assert.ok(csv.includes("3625.00"));
			assert.ok(csv.includes("471.25"));
		});

		it("generates combined CSV bundle containing all 3 files", () => {
			const bundle = generateCombinedCsvBundle(samplePackage);

			assert.ok(bundle.retailSalesCsv.length > 50);
			assert.ok(bundle.writeoffsCsv.length > 50);
			assert.ok(bundle.payrollCsv.length > 50);
		});
	});

	describe("Clinic Credentials & Requisites Validator", () => {
		it("validates correct Russian clinic requisites", () => {
			const clinic: OneCClinicProfile = {
				id: "c1",
				name: "ООО «ДЕНТЕ»",
				fullName: "ООО «ДЕНТЕ»",
				inn: "7701234560",
				kpp: "770101001",
				ogrn: "1207700123454",
				address: "г. Москва",
				phone: "+7 (495) 123-45-67",
				bankAccount: "40702810938000012345",
				bankBik: "044525225",
			};

			const res = validateOneCClinicCredentials(clinic);
			assert.equal(res.isValid, true);
			assert.equal(res.errors.length, 0);
		});

		it("detects invalid INN, KPP, BIK and bank accounts", () => {
			const invalidClinic: OneCClinicProfile = {
				id: "c1",
				name: "",
				fullName: "",
				inn: "0000000000", // Invalid INN (all zeros)
				kpp: "123", // Invalid KPP (too short)
				ogrn: "12345", // Invalid OGRN
				address: "",
				phone: "",
				bankAccount: "12345", // Invalid account
				bankBik: "123", // Invalid BIK
			};

			const res = validateOneCClinicCredentials(invalidClinic);
			assert.equal(res.isValid, false);
			assert.ok(res.errors.length >= 4);
		});
	});

	describe("Chief Accountant Executive Summary", () => {
		it("generates structured text summary for chief accountant", () => {
			const summary = generateAccountantExecutiveSummary(samplePackage);

			assert.ok(summary.includes("ПАКЕТ ВЫГРУЗКИ В 1С:ПРЕДПРИЯТИЕ 8.3"));
			assert.ok(summary.includes("ДОКУМЕНТ «ОТЧЕТ О РОЗНИЧНЫХ ПРОДАЖАХ»"));
			assert.ok(summary.includes("ДОКУМЕНТ «ТРЕБОВАНИЕ-НАКЛАДНАЯ / СПИСАНИЕ МАТЕРИАЛОВ»"));
			assert.ok(summary.includes("ДОКУМЕНТ «ОТРАЖЕНИЕ ЗАРПЛАТЫ В БУХУЧЕТЕ»"));
			assert.ok(summary.includes("ИТОГО ПО ПАКЕТУ:"));
		});
	});

	describe("Kopeck Formatters", () => {
		it("formats kopecks to 2-decimal string", () => {
			assert.equal(formatKopToRub(14750000), "147500.00");
			assert.equal(formatKopToRub(0), "0.00");
			assert.equal(formatKopToRub(18750), "187.50");
		});

		it("formats kopecks to locale string with currency symbol", () => {
			const formatted = formatKopToRubLocale(100000);
			assert.ok(formatted.includes("1") && formatted.includes("000") && formatted.includes("₽"));
		});
	});
});
