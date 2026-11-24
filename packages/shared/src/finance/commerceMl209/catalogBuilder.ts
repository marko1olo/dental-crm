import { escapeCsvCell } from "../../insurance/registryModules/registrySanitizer.js";
import { formatKopToRub, formatKopToRubLocale, computeCommerceMlSha256 } from "./xmlUtils.js";
import type {
	OneCCommerceMlPackage,
	OneCRetailSalesDocument,
	OneCMaterialWriteoffDocument,
	OneCPayrollDocument,
} from "./types.js";

function qCsv(val: string | number | undefined | null): string {
	const cell = escapeCsvCell(val ?? "");
	return cell.startsWith('"') && cell.endsWith('"') ? cell : `"${cell.replace(/"/g, '""')}"`;
}

export function generateRetailSalesCsv(doc: OneCRetailSalesDocument): string {
	const header = "НомерДокумента;Дата;Касса;Склад;Код804н;Номенклатура;Зуб;ЕдИзм;Количество;Цена;Скидка;Сумма;СтавкаНДС;ВрачФИО;СчетУчета;НоменклатурнаяГруппа\n";
	const rows = doc.items.map((it) => {
		const toothStr = it.toothNumber ? String(it.toothNumber) : "";
		return `${qCsv(doc.documentNumber)};${qCsv(doc.documentDateIso)};${qCsv(doc.cashRegisterName)};${qCsv(doc.warehouseName)};${qCsv(it.code804n || "")};${qCsv(it.name)};${qCsv(toothStr)};${qCsv(it.unitName || "шт")};${it.quantity};${formatKopToRub(it.priceKopecks)};${formatKopToRub(it.discountKopecks)};${formatKopToRub(it.totalKopecks)};${qCsv(it.vatRate || "Без НДС")};${qCsv(it.doctorName || "")};"90.01.1";${qCsv(it.nomenclatureGroup || "Стоматологические услуги")}`;
	});
	return `\uFEFF${header}${rows.join("\n")}`;
}

export function generateMaterialWriteoffCsv(doc: OneCMaterialWriteoffDocument): string {
	const header = "НомерДокумента;Дата;СкладОтправитель;ПодразделениеПолучатель;Артикул;Номенклатура;Партия;СрокГодности;ЕдИзм;Количество;Себестоимость;Сумма;СчетДебета;СчетКредита;СтатьяЗатрат\n";
	const rows = doc.items.map((it) =>
		`${qCsv(doc.documentNumber)};${qCsv(doc.documentDateIso)};${qCsv(doc.senderWarehouseName)};${qCsv(doc.recipientDepartmentName)};${qCsv(it.article)};${qCsv(it.name)};${qCsv(it.batchNumber || "")};${qCsv(it.expirationDateIso || "")};${qCsv(it.unitName)};${it.quantity};${formatKopToRub(it.unitCostKopecks)};${formatKopToRub(it.totalCostKopecks)};${qCsv(it.debitAccount)};${qCsv(it.creditAccount)};${qCsv(it.costItemTitleRu)}`,
	);
	return `\uFEFF${header}${rows.join("\n")}`;
}

export function generatePayrollReflectionCsv(doc: OneCPayrollDocument): string {
	const header = "НомерДокумента;Дата;Период;ТабельныйНомер;Сотрудник;Должность;Специальность;ВидНачисления;СуммаНачислено;НДФЛ13;СтраховыеВзносы;КВыплате;СчетДт;СчетКт;СтатьяЗатрат\n";
	const rows = doc.employees.map((emp) =>
		`${qCsv(doc.documentNumber)};${qCsv(doc.documentDateIso)};${qCsv(doc.periodLabelRu)};${qCsv(emp.employeeTabNumber)};${qCsv(emp.employeeName)};${qCsv(emp.positionTitleRu)};${qCsv(emp.specialtyRu)};${qCsv(emp.calculationTypeTitleRu)};${formatKopToRub(emp.grossEarnedKopecks)};${formatKopToRub(emp.ndfl13Kopecks)};${formatKopToRub(emp.socialInsuranceTaxesKopecks)};${formatKopToRub(emp.netPayoutKopecks)};${qCsv(emp.debitAccount)};${qCsv(emp.creditAccountPayroll)};${qCsv(emp.costItemTitleRu)}`,
	);
	return `\uFEFF${header}${rows.join("\n")}`;
}

export const generateMaterialsWriteoffCsv = generateMaterialWriteoffCsv;
export const generatePayrollCsv = generatePayrollReflectionCsv;

export function generateCombinedCsvBundle(pkg: OneCCommerceMlPackage): {
	retailSalesCsv: string;
	writeoffsCsv: string;
	payrollCsv: string;
} {
	return {
		retailSalesCsv: generateRetailSalesCsv(pkg.retailSalesDocument),
		writeoffsCsv: generateMaterialWriteoffCsv(pkg.materialWriteoffDocument),
		payrollCsv: pkg.payrollDocument ? generatePayrollReflectionCsv(pkg.payrollDocument) : "",
	};
}

export function generateAccountantExecutiveSummary(pkg: OneCCommerceMlPackage): string {
	const salesTotal = formatKopToRubLocale(pkg.retailSalesDocument.totalRevenueKopecks);
	const materialsTotal = formatKopToRubLocale(pkg.materialWriteoffDocument.totalCostKopecks);
	const payrollTotal = pkg.payrollDocument ? formatKopToRubLocale(pkg.payrollDocument.totalGrossKopecks) : "0,00 ₽";
	const ndflTotal = pkg.payrollDocument ? formatKopToRubLocale(pkg.payrollDocument.totalNdflKopecks) : "0,00 ₽";
	const netTotal = pkg.payrollDocument ? formatKopToRubLocale(pkg.payrollDocument.totalNetPayoutKopecks) : "0,00 ₽";

	const tenderSum = (t: string) => formatKopToRubLocale(pkg.retailSalesDocument.payments.filter((p) => p.tenderType === t).reduce((s, p) => s + p.amountKopecks, 0));

	return `================================================================================
ПАКЕТ ВЫГРУЗКИ В 1С:ПРЕДПРИЯТИЕ 8.3 (CommerceML 2.09)
Организация: ${pkg.clinic.fullName} (ИНН: ${pkg.clinic.inn}, КПП: ${pkg.clinic.kpp || "—"})
Период: ${pkg.exportPeriodStartIso} — ${pkg.exportPeriodEndIso}
Дата и время формирования: ${pkg.generatedAtIso}
Контрольный хэш пакета (SHA-256): ${computeCommerceMlSha256(pkg)}
================================================================================

1. ДОКУМЕНТ «ОТЧЕТ О РОЗНИЧНЫХ ПРОДАЖАХ» (54-ФЗ)
   Номер: ${pkg.retailSalesDocument.documentNumber} от ${pkg.retailSalesDocument.documentDateIso}
   Касса: ${pkg.retailSalesDocument.cashRegisterName}
   Выручка от медуслуг (Счет 90.01.1): ${salesTotal} (Без НДС, ст. 149 НК РФ)
   Способы оплаты:
     - Наличные в кассу (Счет 50.01): ${tenderSum("cash")}
     - Банковские карты / Эквайринг (Счет 57.03): ${tenderSum("card_acquiring")}
     - СБП / Расчетный счет (Счет 51): ${tenderSum("sbp")}

2. ДОКУМЕНТ «ТРЕБОВАНИЕ-НАКЛАДНАЯ / СПИСАНИЕ МАТЕРИАЛОВ»
   Номер: ${pkg.materialWriteoffDocument.documentNumber} от ${pkg.materialWriteoffDocument.documentDateIso}
   Склад списания (Кредит 10.01/10.06): ${pkg.materialWriteoffDocument.senderWarehouseName}
   Подразделение затрат (Дебет 20.01): ${pkg.materialWriteoffDocument.recipientDepartmentName}
   Сумма списанной себестоимости: ${materialsTotal}

3. ДОКУМЕНТ «ОТРАЖЕНИЕ ЗАРПЛАТЫ В БУХУЧЕТЕ»
   Номер: ${pkg.payrollDocument ? pkg.payrollDocument.documentNumber : "—"}
   Начислено сотрудникам (ФОТ, Кредит 70): ${payrollTotal}
   Удержано НДФЛ 13% (Кредит 68.01): ${ndflTotal}
   К выплате сотрудникам на руки: ${netTotal}

================================================================================
ИТОГО ПО ПАКЕТУ:
  • Доходы клиники: +${salesTotal}
  • Себестоимость материалов: -${materialsTotal}
  • Начисленный ФОТ врачей и ассистентов: -${payrollTotal}
================================================================================`;
}
