import { and, eq } from "drizzle-orm";
import {
	DEFAULT_1C_CHART_OF_ACCOUNTS,
	type OneCChartOfAccounts,
	type OneCClinicProfile,
	type OneCCommerceMlPackage,
	type OneCRetailSalesDocument,
	computeCommerceMlSha256,
	generateCommerceMl209PackageXml,
	validatePackageIntegrity,
} from "@dental/shared";
import { withTenantCtx } from "../../../../db/rls.js";
import { clinics, organizations, warehouses } from "../../../../db/schema.js";
import { exportCommerceMlParamsSchema, type CommerceMlPackageResult, type ExportCommerceMlParams } from "../types.js";
import { fetchAndReconcilePayments } from "./paymentReconciliation.js";
import { fetchAndReconcileMedicalServices } from "./medicalServicesReconciliation.js";
import { fetchAndBuildPayrollDocument, fetchAndBuildWriteoffDocument } from "./materialsAndPayrollReconciliation.js";
import { registerExportedPackageTx } from "./reconciliationStore.js";

export async function buildCommerceMlPackage(params: ExportCommerceMlParams): Promise<CommerceMlPackageResult> {
	const parsed = exportCommerceMlParamsSchema.parse(params);
	const orgId = parsed.organizationId;
	const { startDateIso, endDateIso } = parsed;
	const startTimestamp = new Date(`${startDateIso}T00:00:00.000Z`);
	const endTimestamp = new Date(`${endDateIso}T23:59:59.999Z`);
	const cleanDate = startDateIso.replace(/-/g, "");

	const coaOverrides = parsed.chartOfAccountsOverrides;
	const chartOfAccounts: OneCChartOfAccounts = {
		accountSalesRevenue: coaOverrides?.accountSalesRevenue ?? DEFAULT_1C_CHART_OF_ACCOUNTS.accountSalesRevenue,
		accountSalesCost: coaOverrides?.accountSalesCost ?? DEFAULT_1C_CHART_OF_ACCOUNTS.accountSalesCost,
		accountMaterials: coaOverrides?.accountMaterials ?? DEFAULT_1C_CHART_OF_ACCOUNTS.accountMaterials,
		accountConsumables: coaOverrides?.accountConsumables ?? DEFAULT_1C_CHART_OF_ACCOUNTS.accountConsumables,
		accountProductionCost: coaOverrides?.accountProductionCost ?? DEFAULT_1C_CHART_OF_ACCOUNTS.accountProductionCost,
		accountGeneralExpense: coaOverrides?.accountGeneralExpense ?? DEFAULT_1C_CHART_OF_ACCOUNTS.accountGeneralExpense,
		accountCashDesk: coaOverrides?.accountCashDesk ?? DEFAULT_1C_CHART_OF_ACCOUNTS.accountCashDesk,
		accountBankCurrent: coaOverrides?.accountBankCurrent ?? DEFAULT_1C_CHART_OF_ACCOUNTS.accountBankCurrent,
		accountAcquiringTransit: coaOverrides?.accountAcquiringTransit ?? DEFAULT_1C_CHART_OF_ACCOUNTS.accountAcquiringTransit,
		accountBuyersSettlement: coaOverrides?.accountBuyersSettlement ?? DEFAULT_1C_CHART_OF_ACCOUNTS.accountBuyersSettlement,
		accountAdvancesReceived: coaOverrides?.accountAdvancesReceived ?? DEFAULT_1C_CHART_OF_ACCOUNTS.accountAdvancesReceived,
		accountRetailBuyers: coaOverrides?.accountRetailBuyers ?? DEFAULT_1C_CHART_OF_ACCOUNTS.accountRetailBuyers,
		accountPayroll: coaOverrides?.accountPayroll ?? DEFAULT_1C_CHART_OF_ACCOUNTS.accountPayroll,
		accountNdfl: coaOverrides?.accountNdfl ?? DEFAULT_1C_CHART_OF_ACCOUNTS.accountNdfl,
		accountSocialTaxes: coaOverrides?.accountSocialTaxes ?? DEFAULT_1C_CHART_OF_ACCOUNTS.accountSocialTaxes,
	};

	return withTenantCtx(orgId, async (tx) => {
		const [orgRecord] = await tx
			.select()
			.from(organizations)
			.where(eq(organizations.id, orgId))
			.limit(1);

		const [clinicRow] = await tx
			.select()
			.from(clinics)
			.where(eq(clinics.organizationId, orgId))
			.limit(1);

		const [defaultWarehouse] = await tx
			.select({ name: warehouses.name })
			.from(warehouses)
			.where(and(eq(warehouses.organizationId, orgId), eq(warehouses.isDefault, true)))
			.limit(1);

		const overrides = parsed.clinicProfileOverrides;
		const orgName = overrides?.name ?? orgRecord?.name ?? clinicRow?.name ?? "Организация";
		const prefix = overrides?.prefix1C || "DN";

		const clinic: OneCClinicProfile = {
			id: orgId,
			name: orgName,
			fullName: overrides?.fullName ?? (orgRecord?.name ? `ООО «${orgRecord.name}»` : orgName),
			inn: overrides?.inn ?? orgRecord?.inn ?? "",
			kpp: overrides?.kpp ?? orgRecord?.kpp ?? null,
			ogrn: overrides?.ogrn ?? orgRecord?.ogrn ?? null,
			address: overrides?.address ?? clinicRow?.address ?? orgRecord?.legalAddress ?? "",
			phone: overrides?.phone ?? clinicRow?.phone ?? "",
			email: overrides?.email ?? orgRecord?.email ?? null,
			bankAccount: overrides?.bankAccount ?? null,
			bankBik: overrides?.bankBik ?? null,
			bankName: overrides?.bankName ?? null,
			bankCorrAccount: overrides?.bankCorrAccount ?? null,
			chiefDoctorName: overrides?.chiefDoctorName ?? orgRecord?.signatoryName ?? null,
			chiefAccountantName: overrides?.chiefAccountantName ?? orgRecord?.signatoryName ?? null,
			defaultWarehouseName: overrides?.defaultWarehouseName ?? defaultWarehouse?.name ?? "Основной склад клиники",
			defaultCashRegisterName: overrides?.defaultCashRegisterName ?? "Касса №1",
			prefix1C: prefix,
		};

		const [payRes, medRes, writeoffDoc, payrollDoc] = await Promise.all([
			fetchAndReconcilePayments(tx, { orgId, startTimestamp, endTimestamp, cleanDate, clinic, chartOfAccounts }),
			fetchAndReconcileMedicalServices(tx, { orgId, startTimestamp, endTimestamp, cleanDate, startDateIso, prefix }),
			fetchAndBuildWriteoffDocument(tx, { orgId, startTimestamp, endTimestamp, cleanDate, startDateIso, prefix, clinic, chartOfAccounts }),
			parsed.includePayroll
				? fetchAndBuildPayrollDocument(tx, { orgId, cleanDate, startDateIso, prefix, chartOfAccounts })
				: Promise.resolve(null),
		]);

		const salesDoc: OneCRetailSalesDocument = {
			id: `doc-sales-${cleanDate}`,
			documentNumber: `${prefix}-РОЗН-${cleanDate}`,
			documentDateIso: startDateIso,
			documentTime: "20:00:00",
			periodLabelRu: `Смена ${startDateIso}`,
			cashRegisterName: clinic.defaultCashRegisterName || "Касса №1",
			warehouseName: clinic.defaultWarehouseName || "Основной склад клиники",
			items: medRes.retailSaleItems,
			payments: payRes.paymentBreakdowns,
			totalRevenueKopecks: medRes.totalRevenueKop,
			totalDiscountKopecks: medRes.totalDiscountKop,
			totalVatKopecks: 0,
			cashierName: clinic.chiefAccountantName || null,
			comment: "Выгрузка кассовой смены и чеков 54-ФЗ в 1С:Бухгалтерия 8.3",
		};
		salesDoc.sha256Hash = computeCommerceMlSha256(salesDoc);

		const pkg: OneCCommerceMlPackage = {
			packageId: `pkg-${cleanDate}-${prefix}`,
			generatedAtIso: new Date().toISOString(),
			exportPeriodStartIso: startDateIso,
			exportPeriodEndIso: endDateIso,
			clinic,
			chartOfAccounts,
			retailSalesDocument: salesDoc,
			medicalActs: parsed.includeMedicalActs ? medRes.medicalActs : [],
			materialWriteoffDocument: writeoffDoc,
			payrollDocument: payrollDoc,
		};
		pkg.sha256Hash = computeCommerceMlSha256(pkg);

		const xml = generateCommerceMl209PackageXml(pkg);
		const sha256 = pkg.sha256Hash;
		const integrity = validatePackageIntegrity(pkg);

		await registerExportedPackageTx(tx, orgId, sha256, {
			exportedAtIso: pkg.generatedAtIso,
			packageId: pkg.packageId,
			packageKind: "shift_export",
			documentCount: 1 + pkg.medicalActs.length + (pkg.payrollDocument ? 1 : 0) + 1,
			totalAmountKopecks: BigInt(salesDoc.totalRevenueKopecks),
		});

		return { package: pkg, xml, sha256, integrity };
	});
}
