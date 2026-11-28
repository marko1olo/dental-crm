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
import { parseClosedPeriodRange } from "../../../../routes/payrollModules/payrollTypesAndQueries.js";

const WRITEOFF_DEDUCTION_TYPES = new Set([
	"auto_deduct",
	"usage",
	"write_off",
	"emergency_overdraft",
	"shift_batch_deduction",
	"treatment_consumable",
	"manual_writeoff",
	"write_off_mdlp",
]);

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
				transactionType: inventoryTransactions.transactionType,
				qty: inventoryTransactions.qty,
				quantityChanged: inventoryTransactions.quantityChanged,
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
	const aggregatedByItem = new Map<
		string,
		{
			id: string;
			item: typeof invItemList[number] | undefined;
			notes: string | null;
			netQty: number;
			unitCostKop: number;
		}
	>();

	for (const tr of invRows) {
		const isDeduction = WRITEOFF_DEDUCTION_TYPES.has(tr.transactionType);
		const isStorno = tr.transactionType === "storno";
		if (!isDeduction && !isStorno) {
			// Приходы/закупки ("receipt", "purchase", "in", etc.) не являются списанием материалов в производство.
			continue;
		}
		const item = (tr.itemId ? invMap.get(tr.itemId) : undefined) ?? (tr.inventoryItemId ? invMap.get(tr.inventoryItemId) : undefined);
		const rawQty = Number(tr.qty ?? tr.quantityChanged ?? 0);
		const absQty = Math.abs(Number.isFinite(rawQty) && rawQty !== 0 ? rawQty : 1);
		const signedQty = isStorno ? -absQty : absQty;

		const trCostKop = tr.unitCostKopecks != null ? Number(tr.unitCostKopecks) : 0;
		const itemCostKop = item?.unitCostKopecks != null ? Number(item.unitCostKopecks) : 0;
		const unitCostKop = Math.max(
			0,
			trCostKop !== 0
				? trCostKop
				: itemCostKop !== 0
					? itemCostKop
					: rublesToKopecks(Number(tr.unitCostRub ?? item?.unitCostRub ?? 0)),
		);

		const groupKey = `${item?.id ?? tr.itemId ?? tr.inventoryItemId ?? tr.id}::${unitCostKop}`;
		const existing = aggregatedByItem.get(groupKey);
		if (existing) {
			existing.netQty += signedQty;
		} else {
			aggregatedByItem.set(groupKey, {
				id: tr.id,
				item,
				notes: tr.notes,
				netQty: signedQty,
				unitCostKop,
			});
		}
	}

	const writeoffItems: OneCMaterialWriteoffItem[] = [];
	for (const entry of aggregatedByItem.values()) {
		if (entry.netQty <= 0) continue;
		const roundedQty = Math.round(entry.netQty * 1000) / 1000;
		if (roundedQty <= 0) continue;
		const totalCostKop = multiplyKopecksFractional(entry.unitCostKop as Kopecks, roundedQty);

		writeoffItems.push({
			id: entry.id,
			article: entry.item?.sku || entry.item?.id || entry.id,
			name: entry.item?.name || entry.notes || "Расходный материал",
			batchNumber: entry.item?.lotNumber ?? null,
			expirationDateIso: entry.item?.expirationDate ?? null,
			unitCode: DEFAULT_OKEI_PIECE_CODE,
			unitName: entry.item?.unit || "шт",
			quantity: roundedQty,
			unitCostKopecks: entry.unitCostKop,
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
		readonly endDateIso?: string | undefined;
		readonly prefix: string;
		readonly chartOfAccounts: OneCChartOfAccounts;
	},
): Promise<OneCPayrollDocument | null> {
	const { orgId, cleanDate, startDateIso, endDateIso, prefix, chartOfAccounts } = params;
	const periodMonth = startDateIso.slice(0, 7);
	const effectiveEndIso = (endDateIso ?? startDateIso).slice(0, 10);
	const endMonth = effectiveEndIso.slice(0, 7);
	const exportStartMs = new Date(`${startDateIso.slice(0, 10)}T00:00:00.000Z`).getTime();
	const exportEndMs = new Date(`${effectiveEndIso}T23:59:59.999Z`).getTime();

	const allRows = await tx
		.select({
			statementId: doctorPayrollStatements.id,
			doctorId: doctorPayrollStatements.doctorId,
			period: doctorPayrollStatements.period,
			grossRevenueKopecks: doctorPayrollStatements.grossRevenueKopecks,
			categoryPercent: doctorPayrollStatements.categoryPercent,
			fixedSalaryKopecks: doctorPayrollStatements.fixedSalaryKopecks,
			totalAccruedKopecks: doctorPayrollStatements.totalAccruedKopecks,
			ndfl13Kopecks: doctorPayrollStatements.ndfl13Kopecks,
			netPayoutKopecks: doctorPayrollStatements.netPayoutKopecks,
			doctorFullName: users.fullName,
			doctorRole: users.role,
			doctorSpecialties: users.specialties,
		})
		.from(doctorPayrollStatements)
		.innerJoin(users, eq(users.id, doctorPayrollStatements.doctorId))
		.where(eq(doctorPayrollStatements.organizationId, orgId));

	const rows = allRows.filter((row) => {
		if (row.period === periodMonth || row.period === endMonth || row.period === `${startDateIso.slice(0, 10)}..${effectiveEndIso}`) {
			return true;
		}
		const range = parseClosedPeriodRange(row.period);
		if (!range) return false;
		return range.start.getTime() <= exportEndMs && range.end.getTime() >= exportStartMs;
	});

	if (rows.length === 0) {
		return null;
	}

	const payrollEmployees: OneCPayrollEmployeeItem[] = rows.map((row, idx) => {
		const grossEarnedKop = Number(row.totalAccruedKopecks ?? 0);
		const grossRevKop = Number(row.grossRevenueKopecks ?? 0);
		const ndflKop = Number(row.ndfl13Kopecks ?? 0);
		const fixedSalaryKop = Number(row.fixedSalaryKopecks ?? 0);
		const netPayoutKop =
			row.netPayoutKopecks !== 0
				? row.netPayoutKopecks
				: (grossEarnedKop - ndflKop);
		// Самозанятые (НПД) и аренда кресла (ИП) не облагаются страховыми взносами клиники (30% ЕСН).
		const isSelfEmployedOrRental = (fixedSalaryKop > 0 && ndflKop === 0) || (grossEarnedKop > 0 && ndflKop === 0);
		const socialInsuranceTaxesKopecks = isSelfEmployedOrRental
			? 0
			: percentageOfKopecks(grossEarnedKop, basisPointsFromPercent(30));
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
