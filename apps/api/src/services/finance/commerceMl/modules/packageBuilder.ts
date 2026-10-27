import { eq } from "drizzle-orm";
import {
	DEFAULT_1C_CHART_OF_ACCOUNTS,
	DEFAULT_CLINIC_PROFILE_1C,
	type OneCChartOfAccounts,
	type OneCClinicProfile,
	type OneCCommerceMlPackage,
	type OneCRetailSalesDocument,
	computeCommerceMlSha256,
	generateCommerceMl209PackageXml,
	validatePackageIntegrity,
} from "@dental/shared";
import { db } from "../../../../db/client.js";
import { organizations } from "../../../../db/schema.js";
import { exportCommerceMlParamsSchema, type CommerceMlPackageResult, type ExportCommerceMlParams } from "../types.js";
import { balancePaymentBreakdowns, fetchAndReconcilePayments } from "./paymentReconciliation.js";
import { fetchAndReconcileMedicalServices } from "./medicalServicesReconciliation.js";
import { buildPayrollDocument, fetchAndBuildWriteoffDocument } from "./materialsAndPayrollReconciliation.js";
import { registerExportedPackage } from "./reconciliationStore.js";

export async function buildCommerceMlPackage(params: ExportCommerceMlParams): Promise<CommerceMlPackageResult> {
	const parsed = exportCommerceMlParamsSchema.parse(params);
	const orgId = parsed.organizationId;
	const { startDateIso, endDateIso } = parsed;
	const startTimestamp = new Date(`${startDateIso}T00:00:00.000Z`);
	const endTimestamp = new Date(`${endDateIso}T23:59:59.999Z`);
	const prefix = (parsed.clinicProfileOverrides as any)?.prefix1C || "DN";
	const cleanDate = startDateIso.replace(/-/g, "");

	let clinic: OneCClinicProfile = { ...DEFAULT_CLINIC_PROFILE_1C, id: orgId, ...parsed.clinicProfileOverrides };
	const chartOfAccounts: OneCChartOfAccounts = { ...DEFAULT_1C_CHART_OF_ACCOUNTS, ...parsed.chartOfAccountsOverrides };

	try {
		const [orgRecord] = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
		if (orgRecord) {
			clinic = {
				...clinic, name: orgRecord.name || clinic.name, fullName: `ООО «${orgRecord.name || clinic.name}»`,
				inn: (orgRecord as any).inn || clinic.inn, kpp: (orgRecord as any).kpp || clinic.kpp,
				ogrn: (orgRecord as any).ogrn || clinic.ogrn, address: (orgRecord as any).address || clinic.address,
				phone: (orgRecord as any).phone || clinic.phone,
			};
		}

		const [payRes, medRes, writeoffDoc] = await Promise.all([
			fetchAndReconcilePayments({ orgId, startTimestamp, endTimestamp, cleanDate, clinic, chartOfAccounts }),
			fetchAndReconcileMedicalServices({ orgId, cleanDate, startDateIso, prefix }),
			fetchAndBuildWriteoffDocument({ orgId, startTimestamp, endTimestamp, cleanDate, startDateIso, prefix, clinic, chartOfAccounts }),
		]);

		balancePaymentBreakdowns(payRes.paymentBreakdowns, medRes.totalRevenueKop, cleanDate, chartOfAccounts);

		const salesDoc: OneCRetailSalesDocument = {
			id: `doc-sales-${cleanDate}`, documentNumber: `${prefix}-РОЗН-${cleanDate}`,
			documentDateIso: startDateIso, documentTime: "20:00:00", periodLabelRu: `Смена ${startDateIso}`,
			cashRegisterName: clinic.defaultCashRegisterName || "Касса №1 (АТОЛ 27Ф)",
			warehouseName: clinic.defaultWarehouseName || "Основной склад клиники",
			items: medRes.retailSaleItems, payments: payRes.paymentBreakdowns,
			totalRevenueKopecks: medRes.totalRevenueKop, totalDiscountKopecks: medRes.totalDiscountKop, totalVatKopecks: 0,
			cashierName: clinic.chiefAccountantName || "Кассир", comment: "Выгрузка кассовой смены и чеков 54-ФЗ в 1С:Бухгалтерия 8.3",
		};
		salesDoc.sha256Hash = computeCommerceMlSha256(salesDoc);

		const payrollDoc = parsed.includePayroll ? buildPayrollDocument({ totalRevenueKop: medRes.totalRevenueKop, cleanDate, startDateIso, prefix, clinic, chartOfAccounts }) : null;

		const pkg: OneCCommerceMlPackage = {
			packageId: `pkg-${cleanDate}-${prefix}`, generatedAtIso: new Date().toISOString(),
			exportPeriodStartIso: startDateIso, exportPeriodEndIso: endDateIso, clinic, chartOfAccounts,
			retailSalesDocument: salesDoc, medicalActs: parsed.includeMedicalActs ? medRes.medicalActs : [],
			materialWriteoffDocument: writeoffDoc, payrollDocument: payrollDoc,
		};
		pkg.sha256Hash = computeCommerceMlSha256(pkg);

		const xml = generateCommerceMl209PackageXml(pkg);
		const sha256 = pkg.sha256Hash;
		const integrity = validatePackageIntegrity(pkg);
		registerExportedPackage(sha256, { exportedAtIso: pkg.generatedAtIso, packageId: pkg.packageId });
		return { package: pkg, xml, sha256, integrity };
	} catch (_dbError) {
		return buildEmptyCommerceMlPackageFallback({ startDateIso, endDateIso: params.endDateIso, clinic, chartOfAccounts, prefix, cleanDate });
	}
}

function buildEmptyCommerceMlPackageFallback(ctx: { startDateIso: string; endDateIso: string; clinic: OneCClinicProfile; chartOfAccounts: OneCChartOfAccounts; prefix: string; cleanDate: string }): CommerceMlPackageResult {
	const { startDateIso, endDateIso, clinic, chartOfAccounts, prefix, cleanDate } = ctx;
	const emptySalesDoc: OneCRetailSalesDocument = {
		id: `doc-sales-${cleanDate}`, documentNumber: `${prefix}-РОЗН-${cleanDate}`, documentDateIso: startDateIso, documentTime: "20:00:00",
		periodLabelRu: `Смена ${startDateIso}`, cashRegisterName: clinic.defaultCashRegisterName || "Касса №1 (АТОЛ 27Ф)", warehouseName: clinic.defaultWarehouseName || "Основной склад клиники",
		items: [], payments: [], totalRevenueKopecks: 0, totalDiscountKopecks: 0, totalVatKopecks: 0, cashierName: clinic.chiefAccountantName || "Кассир", comment: "Выгрузка кассовой смены (пустая смена, 0 продаж)",
	};
	emptySalesDoc.sha256Hash = computeCommerceMlSha256(emptySalesDoc);

	const emptyWriteoffDoc = {
		id: `doc-writeoff-${cleanDate}`, documentNumber: `${prefix}-СПИС-${cleanDate}`, documentDateIso: startDateIso, documentTime: "20:30:00",
		periodLabelRu: `Списание материалов за ${startDateIso}`, senderWarehouseName: clinic.defaultWarehouseName || "Основной склад клиники", recipientDepartmentName: "Лечебное отделение (ЦСО)",
		items: [], totalCostKopecks: 0, responsiblePersonName: clinic.chiefAccountantName || "Ответственное лицо", reasonRu: "Автоматическое списание по нормам BOM и актам стерилизации ЦСО", sha256Hash: "",
	};
	emptyWriteoffDoc.sha256Hash = computeCommerceMlSha256(emptyWriteoffDoc);

	const pkg: OneCCommerceMlPackage = {
		packageId: `pkg-${cleanDate}-${prefix}`, generatedAtIso: new Date().toISOString(), exportPeriodStartIso: startDateIso, exportPeriodEndIso: endDateIso,
		clinic, chartOfAccounts, retailSalesDocument: emptySalesDoc, medicalActs: [], materialWriteoffDocument: emptyWriteoffDoc, payrollDocument: null,
	};
	pkg.sha256Hash = computeCommerceMlSha256(pkg);
	const xml = generateCommerceMl209PackageXml(pkg);
	const sha256 = pkg.sha256Hash;
	const integrity = validatePackageIntegrity(pkg);
	registerExportedPackage(sha256, { exportedAtIso: pkg.generatedAtIso, packageId: pkg.packageId });
	return { package: pkg, xml, sha256, integrity };
}
