import { and, eq, gte, lte } from "drizzle-orm";
import {
	basisPointsFromPercent,
	computeCommerceMlSha256,
	DEFAULT_OKEI_PIECE_CODE,
	type Kopecks,
	multiplyKopecksFractional,
	type OneCChartOfAccounts,
	type OneCClinicProfile,
	type OneCMaterialWriteoffDocument,
	type OneCMaterialWriteoffItem,
	type OneCPayrollDocument,
	type OneCPayrollEmployeeItem,
	percentageOfKopecks,
	rublesToKopecks,
} from "@dental/shared";
import type { TenantDb } from "../../../../db/rls.js";
import {
	doctorPayrollStatements,
	inventoryItems,
	inventoryTransactions,
	users,
} from "../../../../db/schema.js";

export async function fetchAndBuildWriteoffDocument(
	tx: TenantDb,
	params: {
		readonly orgId: string;
		readonly startTimestamp: Date;
		readonly endTimestamp: Date;
		readonly cleanDate: string;
		readonly startDateIso: string;
		readonly prefix: string;
		readonly clinic: OneCClinicProfile;
		readonly chartOfAccounts: OneCChartOfAccounts;
	},
): Promise<OneCMaterialWriteoffDocument> {
	const { orgId, startTimestamp, endTimestamp, cleanDate, startDateIso, prefix, clinic, chartOfAccounts } = params;

	const [invRows, invItemList] = await Promise.all([
		tx
			.select({
				id: inventoryTransactions.id,
				itemId: inventoryTransactions.itemId,
				inventoryItemId: inventoryTransactions.inventoryItemId,
				qty: inventoryTransactions.qty,
				unitCostRub: inventoryTransactions.unitCostRub,
				unitCostKopecks: inventoryTransactions.unitCostKopecks,
				notes: inventoryTransactions.notes,
			})
			.from(inventoryTransactions)
			.where(
				and(
					eq(inventoryTransactions.organizationId, orgId),
					gte(inventoryTransactions.createdAt, startTimestamp),
					lte(inventoryTransactions.createdAt, endTimestamp),
				),
			),
		tx.select().from(inventoryItems).where(eq(inventoryItems.organizationId, orgId)),
	]);

	const invMap = new Map(invItemList.map((i) => [i.id, i]));
	const writeoffItems: OneCMaterialWriteoffItem[] = [];

	for (const tr of invRows) {
		const item = (tr.itemId ? invMap.get(tr.itemId) : undefined) ?? (tr.inventoryItemId ? invMap.get(tr.inventoryItemId) : undefined);
		const qty = Math.abs(Number(tr.qty) || 1);
		const trCostKop = tr.unitCostKopecks != null ? Number(tr.unitCostKopecks) : 0;
		const itemCostKop = item?.unitCostKopecks != null ? Number(item.unitCostKopecks) : 0;
		const unitCostKop =
			trCostKop !== 0
				? trCostKop
				: itemCostKop !== 0
					? itemCostKop
					: rublesToKopecks(Number(tr.unitCostRub ?? item?.unitCostRub ?? 0));
		const totalCostKop = multiplyKopecksFractional(unitCostKop as Kopecks, qty);

		writeoffItems.push({
			id: tr.id,
			article: item?.sku || item?.id || tr.id,
			name: item?.name || tr.notes || "Расходный материал",
			batchNumber: item?.lotNumber ?? null,
			expirationDateIso: item?.expirationDate ?? null,
			unitCode: DEFAULT_OKEI_PIECE_CODE,
			unitName: item?.unit || "шт",
			quantity: qty,
			unitCostKopecks: unitCostKop,
			totalCostKopecks: totalCostKop,
			debitAccount: chartOfAccounts.accountProductionCost,
			creditAccount: chartOfAccounts.accountMaterials,
			costItemTitleRu: "Списание материалов ЦСО и склада",
		});
	}

	const doc: OneCMaterialWriteoffDocument = {
		id: `doc-writeoff-${cleanDate}`,
		documentNumber: `${prefix}-СПИС-${cleanDate}`,
		documentDateIso: startDateIso,
		documentTime: "20:30:00",
		periodLabelRu: `Списание материалов за ${startDateIso}`,
		senderWarehouseName: clinic.defaultWarehouseName || "Основной склад клиники",
		recipientDepartmentName: "Лечебное отделение (ЦСО)",
		items: writeoffItems,
		totalCostKopecks: writeoffItems.reduce((s, it) => s + it.totalCostKopecks, 0),
		responsiblePersonName: clinic.chiefAccountantName || null,
		reasonRu: "Автоматическое списание по нормам BOM и актам стерилизации ЦСО",
	};
	doc.sha256Hash = computeCommerceMlSha256(doc);
	return doc;
}

export async function fetchAndBuildPayrollDocument(
	tx: TenantDb,
	params: {
		readonly orgId: string;
		readonly cleanDate: string;
		readonly startDateIso: string;
		readonly prefix: string;
		readonly chartOfAccounts: OneCChartOfAccounts;
	},
): Promise<OneCPayrollDocument | null> {
	const { orgId, cleanDate, startDateIso, prefix, chartOfAccounts } = params;
	const periodMonth = startDateIso.slice(0, 7);

	const rows = await tx
		.select({
			statementId: doctorPayrollStatements.id,
			doctorId: doctorPayrollStatements.doctorId,
			grossRevenueKopecks: doctorPayrollStatements.grossRevenueKopecks,
			grossRevenueRub: doctorPayrollStatements.grossRevenueRub,
			categoryPercent: doctorPayrollStatements.categoryPercent,
			totalAccruedKopecks: doctorPayrollStatements.totalAccruedKopecks,
			totalAccruedRub: doctorPayrollStatements.totalAccruedRub,
			ndfl13Kopecks: doctorPayrollStatements.ndfl13Kopecks,
			ndfl13Rub: doctorPayrollStatements.ndfl13Rub,
			netPayoutKopecks: doctorPayrollStatements.netPayoutKopecks,
			netPayoutRub: doctorPayrollStatements.netPayoutRub,
			doctorFullName: users.fullName,
			doctorRole: users.role,
			doctorSpecialties: users.specialties,
		})
		.from(doctorPayrollStatements)
		.innerJoin(users, eq(users.id, doctorPayrollStatements.doctorId))
		.where(
			and(
				eq(doctorPayrollStatements.organizationId, orgId),
				eq(doctorPayrollStatements.period, periodMonth),
			),
		);

	if (rows.length === 0) {
		return null;
	}

	const payrollEmployees: OneCPayrollEmployeeItem[] = rows.map((row, idx) => {
		const grossEarnedKop =
			row.totalAccruedKopecks !== 0
				? row.totalAccruedKopecks
				: rublesToKopecks(Number(row.totalAccruedRub) || 0);
		const grossRevKop =
			row.grossRevenueKopecks !== 0
				? row.grossRevenueKopecks
				: rublesToKopecks(Number(row.grossRevenueRub) || 0);
		const ndflKop =
			row.ndfl13Kopecks !== 0
				? row.ndfl13Kopecks
				: rublesToKopecks(Number(row.ndfl13Rub) || 0);
		const netPayoutKop =
			row.netPayoutKopecks !== 0
				? row.netPayoutKopecks
				: Math.max(0, grossEarnedKop - ndflKop);
		const socialInsuranceTaxesKopecks = percentageOfKopecks(grossEarnedKop, basisPointsFromPercent(30));
		const specialties = Array.isArray(row.doctorSpecialties)
			? row.doctorSpecialties.filter((s): s is string => typeof s === "string" && s.trim().length > 0).join(", ")
			: "";

		return {
			id: row.statementId,
			employeeTabNumber: `ВР-${String(idx + 1).padStart(3, "0")}`,
			employeeName: row.doctorFullName,
			positionTitleRu: row.doctorRole || "Врач",
			specialtyRu: specialties || "Стоматология",
			calculationTypeTitleRu: `Сдельная оплата труда (${Number(row.categoryPercent) || 0}% от базы)`,
			grossRevenueGeneratedKopecks: grossRevKop,
			grossEarnedKopecks: grossEarnedKop,
			ndfl13Kopecks: ndflKop,
			socialInsuranceTaxesKopecks,
			netPayoutKopecks: netPayoutKop,
			debitAccount: chartOfAccounts.accountProductionCost,
			creditAccountPayroll: chartOfAccounts.accountPayroll,
			creditAccountNdfl: chartOfAccounts.accountNdfl,
			creditAccountSocial: chartOfAccounts.accountSocialTaxes,
			costItemTitleRu: "Оплата труда врачебного персонала",
		};
	});

	const doc: OneCPayrollDocument = {
		id: `doc-payroll-${cleanDate}`,
		documentNumber: `${prefix}-ФОТ-${cleanDate}`,
		documentDateIso: startDateIso,
		documentTime: "21:00:00",
		registrationPeriodIso: `${periodMonth}-01`,
		periodLabelRu: `Смена ${startDateIso}`,
		employees: payrollEmployees,
		totalGrossKopecks: payrollEmployees.reduce((s, e) => s + e.grossEarnedKopecks, 0),
		totalNdflKopecks: payrollEmployees.reduce((s, e) => s + e.ndfl13Kopecks, 0),
		totalSocialTaxesKopecks: payrollEmployees.reduce((s, e) => s + e.socialInsuranceTaxesKopecks, 0),
		totalNetPayoutKopecks: payrollEmployees.reduce((s, e) => s + e.netPayoutKopecks, 0),
		comment: "Отражение начислений заработной платы по сдельным ведомостям клиники",
	};
	doc.sha256Hash = computeCommerceMlSha256(doc);
	return doc;
}
