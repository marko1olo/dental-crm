import { and, eq, gte, lte } from "drizzle-orm";
import { Decimal } from "decimal.js";
import {
	DEFAULT_OKEI_PIECE_CODE,
	type OneCChartOfAccounts,
	type OneCClinicProfile,
	type OneCMaterialWriteoffDocument,
	type OneCMaterialWriteoffItem,
	type OneCPayrollDocument,
	type OneCPayrollEmployeeItem,
	computeCommerceMlSha256,
	rubToKopecks,
} from "@dental/shared";
import { db } from "../../../../db/client.js";
import {
	inventoryItems,
	inventoryTransactions,
} from "../../../../db/schema.js";

export async function fetchAndBuildWriteoffDocument(params: {
	readonly orgId: string;
	readonly startTimestamp: Date;
	readonly endTimestamp: Date;
	readonly cleanDate: string;
	readonly startDateIso: string;
	readonly prefix: string;
	readonly clinic: OneCClinicProfile;
	readonly chartOfAccounts: OneCChartOfAccounts;
}): Promise<OneCMaterialWriteoffDocument> {
	const { orgId, startTimestamp, endTimestamp, cleanDate, startDateIso, prefix, clinic, chartOfAccounts } = params;

	const [invRows, invItemList] = await Promise.all([
		db.select({ id: inventoryTransactions.id, itemId: inventoryTransactions.itemId, qty: inventoryTransactions.qty, unitCostRub: inventoryTransactions.unitCostRub, notes: inventoryTransactions.notes })
			.from(inventoryTransactions)
			.where(and(eq(inventoryTransactions.organizationId, orgId), gte(inventoryTransactions.createdAt, startTimestamp), lte(inventoryTransactions.createdAt, endTimestamp)))
			.limit(50),
		db.select().from(inventoryItems).where(eq(inventoryItems.organizationId, orgId)),
	]);

	const invMap = new Map(invItemList.map((i) => [i.id, i]));
	const writeoffItems: OneCMaterialWriteoffItem[] = [];

	for (const tr of invRows) {
		const item = tr.itemId ? invMap.get(tr.itemId) : undefined;
		const qty = Math.abs(Number(tr.qty) || 1);
		const unitCostKop = rubToKopecks(Number(tr.unitCostRub || item?.unitCostRub || 100));
		const totalCostKop = new Decimal(unitCostKop).times(qty).toNumber();

		writeoffItems.push({
			id: tr.id, article: item?.sku || item?.id || "MAT-GEN",
			name: item?.name || tr.notes || "Расходный материал клиники",
			batchNumber: item?.lotNumber || "Партия №1", expirationDateIso: item?.expirationDate || "2028-12-31",
			unitCode: DEFAULT_OKEI_PIECE_CODE, unitName: item?.unit || "шт",
			quantity: qty, unitCostKopecks: unitCostKop, totalCostKopecks: totalCostKop,
			debitAccount: chartOfAccounts.accountProductionCost, creditAccount: chartOfAccounts.accountMaterials,
			costItemTitleRu: "Списание материалов ЦСО и склада",
		});
	}

	const doc: OneCMaterialWriteoffDocument = {
		id: `doc-writeoff-${cleanDate}`, documentNumber: `${prefix}-СПИС-${cleanDate}`,
		documentDateIso: startDateIso, documentTime: "20:30:00",
		periodLabelRu: `Списание материалов за ${startDateIso}`,
		senderWarehouseName: clinic.defaultWarehouseName || "Основной склад клиники",
		recipientDepartmentName: "Лечебное отделение (ЦСО)",
		items: writeoffItems,
		totalCostKopecks: writeoffItems.reduce((s, it) => s + it.totalCostKopecks, 0),
		responsiblePersonName: clinic.chiefAccountantName || "Ответственное лицо",
		reasonRu: "Автоматическое списание по нормам BOM и актам стерилизации ЦСО",
	};
	doc.sha256Hash = computeCommerceMlSha256(doc);
	return doc;
}

export function buildPayrollDocument(params: {
	readonly totalRevenueKop: number;
	readonly cleanDate: string;
	readonly startDateIso: string;
	readonly prefix: string;
	readonly clinic: OneCClinicProfile;
	readonly chartOfAccounts: OneCChartOfAccounts;
}): OneCPayrollDocument | null {
	const { totalRevenueKop, cleanDate, startDateIso, prefix, clinic, chartOfAccounts } = params;
	if (totalRevenueKop <= 0) return null;

	const chiefDoctorGrossEarnedKopecks = new Decimal(totalRevenueKop).times(25).div(100).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
	const chiefDoctorNdflKopecks = new Decimal(chiefDoctorGrossEarnedKopecks).times(13).div(100).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
	const chiefDoctorSocialInsuranceKopecks = new Decimal(chiefDoctorGrossEarnedKopecks).times(30).div(100).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
	const chiefDoctorNetPayoutKopecks = Math.max(0, new Decimal(chiefDoctorGrossEarnedKopecks).minus(chiefDoctorNdflKopecks).toNumber());

	const payrollEmployees: OneCPayrollEmployeeItem[] = [{
		id: "emp-001", employeeTabNumber: "ВР-001", employeeName: clinic.chiefDoctorName || "Главный врач",
		positionTitleRu: "Врач стоматолог-терапевт", specialtyRu: "Терапевтическая стоматология",
		calculationTypeTitleRu: "Сдельная оплата труда (25% от выручки)",
		grossRevenueGeneratedKopecks: totalRevenueKop, grossEarnedKopecks: chiefDoctorGrossEarnedKopecks,
		ndfl13Kopecks: chiefDoctorNdflKopecks, socialInsuranceTaxesKopecks: chiefDoctorSocialInsuranceKopecks,
		netPayoutKopecks: chiefDoctorNetPayoutKopecks, debitAccount: chartOfAccounts.accountProductionCost,
		creditAccountPayroll: chartOfAccounts.accountPayroll, creditAccountNdfl: chartOfAccounts.accountNdfl,
		creditAccountSocial: chartOfAccounts.accountSocialTaxes, costItemTitleRu: "Оплата труда врачебного персонала",
	}];

	const doc: OneCPayrollDocument = {
		id: `doc-payroll-${cleanDate}`, documentNumber: `${prefix}-ФОТ-${cleanDate}`,
		documentDateIso: startDateIso, documentTime: "21:00:00",
		registrationPeriodIso: `${startDateIso.slice(0, 7)}-01`, periodLabelRu: `Смена ${startDateIso}`,
		employees: payrollEmployees,
		totalGrossKopecks: payrollEmployees.reduce((s, e) => s + e.grossEarnedKopecks, 0),
		totalNdflKopecks: payrollEmployees.reduce((s, e) => s + e.ndfl13Kopecks, 0),
		totalSocialTaxesKopecks: payrollEmployees.reduce((s, e) => s + e.socialInsuranceTaxesKopecks, 0),
		totalNetPayoutKopecks: payrollEmployees.reduce((s, e) => s + e.netPayoutKopecks, 0),
		comment: "Отражение заработной платы (Форма Т-51 / Т-13)",
	};
	doc.sha256Hash = computeCommerceMlSha256(doc);
	return doc;
}
