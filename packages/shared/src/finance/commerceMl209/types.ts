import { z } from "zod";
import { type OneCPartyInfo, oneCPartyInfoSchema } from "../oneCEnterpriseExport.js";

export const COMMERCEML_VERSION_209 = "2.09" as const;
export const COMMERCEML_XMLNS = "urn:1C.ru:commerceml_2" as const;
export const ENTERPRISEDATA_VERSION_113 = "1.13" as const;
export const ENTERPRISEDATA_XMLNS = "http://v8.1c.ru/edi/edi_stnd/EnterpriseData/1.13" as const;
export const TAX_EXEMPTION_ARTICLE_149_RU = "пп. 2 п. 2 ст. 149 НК РФ" as const;

export const DEFAULT_OKEI_PIECE_CODE = "796" as const;
export const DEFAULT_OKEI_PIECE_NAME = "шт" as const;
export const DEFAULT_OKEI_LITER_CODE = "112" as const;
export const DEFAULT_OKEI_KG_CODE = "166" as const;
export const DEFAULT_OKEI_PACK_CODE = "778" as const;

export const oneCChartOfAccountsSchema = z.object({
	accountSalesRevenue: z.string().default("90.01.1"),
	accountSalesCost: z.string().default("90.02.1"),
	accountMaterials: z.string().default("10.01"),
	accountConsumables: z.string().default("10.06"),
	accountProductionCost: z.string().default("20.01"),
	accountGeneralExpense: z.string().default("26"),
	accountCashDesk: z.string().default("50.01"),
	accountBankCurrent: z.string().default("51"),
	accountAcquiringTransit: z.string().default("57.03"),
	accountBuyersSettlement: z.string().default("62.01"),
	accountAdvancesReceived: z.string().default("62.02"),
	accountRetailBuyers: z.string().default("62.Р"),
	accountPayroll: z.string().default("70"),
	accountNdfl: z.string().default("68.01"),
	accountSocialTaxes: z.string().default("69.01"),
});
export type OneCChartOfAccounts = z.infer<typeof oneCChartOfAccountsSchema>;

export const DEFAULT_1C_CHART_OF_ACCOUNTS: OneCChartOfAccounts = {
	accountSalesRevenue: "90.01.1",
	accountSalesCost: "90.02.1",
	accountMaterials: "10.01",
	accountConsumables: "10.06",
	accountProductionCost: "20.01",
	accountGeneralExpense: "26",
	accountCashDesk: "50.01",
	accountBankCurrent: "51",
	accountAcquiringTransit: "57.03",
	accountBuyersSettlement: "62.01",
	accountAdvancesReceived: "62.02",
	accountRetailBuyers: "62.Р",
	accountPayroll: "70",
	accountNdfl: "68.01",
	accountSocialTaxes: "69.01",
};

export const oneCClinicProfileSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1).max(255),
	fullName: z.string().min(1).max(500),
	inn: z.string().min(10).max(12),
	kpp: z.string().max(9).optional().nullable(),
	ogrn: z.string().max(15).optional().nullable(),
	address: z.string().min(1).max(500),
	phone: z.string().min(1).max(50),
	email: z.string().email().optional().nullable(),
	bankAccount: z.string().max(20).optional().nullable(),
	bankBik: z.string().max(9).optional().nullable(),
	bankName: z.string().max(255).optional().nullable(),
	bankCorrAccount: z.string().max(20).optional().nullable(),
	chiefDoctorName: z.string().max(255).optional().nullable(),
	chiefAccountantName: z.string().max(255).optional().nullable(),
	defaultWarehouseName: z.string().default("Основной склад клиники"),
	defaultCashRegisterName: z.string().default("Касса №1 (АТОЛ 27Ф, ФФД 1.2)"),
	prefix1C: z.string().default("DN"),
});
export type OneCClinicProfile = z.infer<typeof oneCClinicProfileSchema>;

export const DEFAULT_CLINIC_PROFILE_1C: OneCClinicProfile = {
	id: "clinic-dente",
	name: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
	fullName: "Общество с ограниченной ответственностью «ДЕНТЕ СТОМАТОЛОГИЯ»",
	inn: "7701234560",
	kpp: "770101001",
	ogrn: "1207700123454",
	address: "101000, г. Москва, ул. Стоматологическая, д. 10, стр. 1",
	phone: "",
	email: "buh@dente-clinic.ru",
	bankAccount: "40702810938000012345",
	bankBik: "044525225",
	bankName: "ПАО СБЕРБАНК Г. МОСКВА",
	bankCorrAccount: "30101810400000000225",
	chiefDoctorName: "Главный врач",
	chiefAccountantName: "Главный бухгалтер",
	defaultWarehouseName: "Основной склад клиники",
	defaultCashRegisterName: "Касса №1 (АТОЛ 27Ф, ФФД 1.2)",
	prefix1C: "DN",
};

export const oneCPaymentTenderTypeSchema = z.enum([
	"cash", "card_acquiring", "sbp", "bank_transfer", "dms", "certificate_deposit", "advance_offset",
]);
export type OneCPaymentTenderType = z.infer<typeof oneCPaymentTenderTypeSchema>;

export const oneCPaymentBreakdownItemSchema = z.object({
	id: z.string().min(1),
	tenderType: oneCPaymentTenderTypeSchema,
	tenderTitleRu: z.string().min(1),
	amountKopecks: z.number().int().nonnegative(),
	accountCode: z.string().min(1),
	acquiringBankName: z.string().optional().nullable(),
	acquiringTerminalId: z.string().optional().nullable(),
	acquiringContractNumber: z.string().optional().nullable(),
	fiscalReceiptNumber: z.string().optional().nullable(),
	fiscalSign: z.string().optional().nullable(),
});
export type OneCPaymentBreakdownItem = z.infer<typeof oneCPaymentBreakdownItemSchema>;

export const oneCRetailSaleItemSchema = z.object({
	id: z.string().min(1),
	code804n: z.string().optional().nullable(),
	name: z.string().min(1).max(500),
	toothNumber: z.number().int().optional().nullable(),
	unitCode: z.string().default(DEFAULT_OKEI_PIECE_CODE),
	unitName: z.string().default(DEFAULT_OKEI_PIECE_NAME),
	quantity: z.number().positive().default(1),
	priceKopecks: z.number().int().nonnegative(),
	discountKopecks: z.number().int().nonnegative().default(0),
	totalKopecks: z.number().int().nonnegative(),
	vatRate: z.string().default("Без НДС"),
	vatAmountKopecks: z.number().int().default(0),
	doctorName: z.string().optional().nullable(),
	nomenclatureGroup: z.string().default("Стоматологические услуги"),
});
export type OneCRetailSaleItem = z.infer<typeof oneCRetailSaleItemSchema>;

export const oneCRetailSalesDocumentSchema = z.object({
	id: z.string().min(1),
	documentNumber: z.string().min(1),
	documentDateIso: z.string(),
	documentTime: z.string().default("18:00:00"),
	periodLabelRu: z.string().min(1),
	cashRegisterName: z.string().min(1),
	warehouseName: z.string().min(1),
	items: z.array(oneCRetailSaleItemSchema).default([]),
	payments: z.array(oneCPaymentBreakdownItemSchema).default([]),
	totalRevenueKopecks: z.number().int().nonnegative(),
	totalDiscountKopecks: z.number().int().nonnegative().default(0),
	totalVatKopecks: z.number().int().default(0),
	cashierName: z.string().optional().nullable(),
	comment: z.string().optional().nullable(),
	sha256Hash: z.string().length(64).optional(),
});
export type OneCRetailSalesDocument = z.infer<typeof oneCRetailSalesDocumentSchema>;

export const oneCMedicalActItemSchema = z.object({
	id: z.string().min(1),
	code804n: z.string().optional().nullable(),
	name: z.string().min(1).max(500),
	toothNumber: z.number().int().optional().nullable(),
	unitCode: z.string().default(DEFAULT_OKEI_PIECE_CODE),
	unitName: z.string().default(DEFAULT_OKEI_PIECE_NAME),
	quantity: z.number().positive().default(1),
	priceKopecks: z.number().int().nonnegative(),
	discountKopecks: z.number().int().nonnegative().default(0),
	totalKopecks: z.number().int().nonnegative(),
	vatRate: z.string().default("Без НДС"),
	vatAmountKopecks: z.number().int().default(0),
	attendingDoctorName: z.string().optional().nullable(),
	attendingDoctorSpecialty: z.string().optional().nullable(),
});
export type OneCMedicalActItem = z.infer<typeof oneCMedicalActItemSchema>;

export const oneCMedicalActDocumentSchema = z.object({
	id: z.string().min(1),
	actNumber: z.string().min(1),
	documentDateIso: z.string(),
	documentTime: z.string().default("12:00:00"),
	patient: oneCPartyInfoSchema,
	contractNumber: z.string().optional().nullable(),
	contractDateIso: z.string().optional().nullable(),
	attendingDoctorName: z.string().optional().nullable(),
	items: z.array(oneCMedicalActItemSchema).min(1),
	totalKopecks: z.number().int().nonnegative(),
	comment: z.string().optional().nullable(),
	sha256Hash: z.string().length(64).optional(),
});
export type OneCMedicalActDocument = z.infer<typeof oneCMedicalActDocumentSchema>;

export const oneCMaterialWriteoffItemSchema = z.object({
	id: z.string().min(1),
	article: z.string().min(1),
	name: z.string().min(1).max(500),
	batchNumber: z.string().optional().nullable(),
	expirationDateIso: z.string().optional().nullable(),
	unitCode: z.string().default(DEFAULT_OKEI_PIECE_CODE),
	unitName: z.string().default(DEFAULT_OKEI_PIECE_NAME),
	quantity: z.number().positive(),
	unitCostKopecks: z.number().int().nonnegative(),
	totalCostKopecks: z.number().int().nonnegative(),
	debitAccount: z.string().default("20.01"),
	creditAccount: z.string().default("10.01"),
	costItemTitleRu: z.string().default("Списание стоматологических материалов (BOM / ЦСО)"),
	relatedServiceCode804n: z.string().optional().nullable(),
	relatedServiceName: z.string().optional().nullable(),
	csoLogId: z.string().optional().nullable(),
	sterilizerCycleNumber: z.string().optional().nullable(),
});
export type OneCMaterialWriteoffItem = z.infer<typeof oneCMaterialWriteoffItemSchema>;

export const oneCMaterialWriteoffDocumentSchema = z.object({
	id: z.string().min(1),
	documentNumber: z.string().min(1),
	documentDateIso: z.string(),
	documentTime: z.string().default("19:00:00"),
	periodLabelRu: z.string().min(1),
	senderWarehouseName: z.string().default("Основной склад клиники"),
	recipientDepartmentName: z.string().default("Лечебное отделение (ЦСО)"),
	items: z.array(oneCMaterialWriteoffItemSchema).default([]),
	totalCostKopecks: z.number().int().nonnegative(),
	responsiblePersonName: z.string().optional().nullable(),
	reasonRu: z.string().default("Списание материалов ЦСО и склада по нормам расхода (BOM)"),
	sha256Hash: z.string().length(64).optional(),
});
export type OneCMaterialWriteoffDocument = z.infer<typeof oneCMaterialWriteoffDocumentSchema>;

export const oneCPayrollEmployeeItemSchema = z.object({
	id: z.string().min(1),
	employeeTabNumber: z.string().min(1),
	employeeName: z.string().min(1),
	positionTitleRu: z.string().min(1),
	specialtyRu: z.string().min(1),
	calculationTypeTitleRu: z.string().min(1),
	grossRevenueGeneratedKopecks: z.number().int().nonnegative(),
	grossEarnedKopecks: z.number().int().nonnegative(),
	ndfl13Kopecks: z.number().int().nonnegative(),
	socialInsuranceTaxesKopecks: z.number().int().nonnegative(),
	netPayoutKopecks: z.number().int().nonnegative(),
	debitAccount: z.string().default("20.01"),
	creditAccountPayroll: z.string().default("70"),
	creditAccountNdfl: z.string().default("68.01"),
	creditAccountSocial: z.string().default("69.01"),
	costItemTitleRu: z.string().default("Оплата труда медицинского персонала"),
});
export type OneCPayrollEmployeeItem = z.infer<typeof oneCPayrollEmployeeItemSchema>;

export const oneCPayrollDocumentSchema = z.object({
	id: z.string().min(1),
	documentNumber: z.string().min(1),
	documentDateIso: z.string(),
	documentTime: z.string().default("20:00:00"),
	registrationPeriodIso: z.string(),
	periodLabelRu: z.string().min(1),
	employees: z.array(oneCPayrollEmployeeItemSchema).default([]),
	totalGrossKopecks: z.number().int().nonnegative(),
	totalNdflKopecks: z.number().int().nonnegative(),
	totalSocialTaxesKopecks: z.number().int().nonnegative(),
	totalNetPayoutKopecks: z.number().int().nonnegative(),
	comment: z.string().optional().nullable(),
	sha256Hash: z.string().length(64).optional(),
});
export type OneCPayrollDocument = z.infer<typeof oneCPayrollDocumentSchema>;

export const oneCCommerceMlPackageSchema = z.object({
	packageId: z.string().min(1),
	generatedAtIso: z.string(),
	exportPeriodStartIso: z.string(),
	exportPeriodEndIso: z.string(),
	clinic: oneCClinicProfileSchema,
	chartOfAccounts: oneCChartOfAccountsSchema.default(DEFAULT_1C_CHART_OF_ACCOUNTS),
	retailSalesDocument: oneCRetailSalesDocumentSchema,
	medicalActs: z.array(oneCMedicalActDocumentSchema).default([]),
	materialWriteoffDocument: oneCMaterialWriteoffDocumentSchema,
	payrollDocument: oneCPayrollDocumentSchema.optional().nullable(),
	sha256Hash: z.string().length(64).optional(),
});
export type OneCCommerceMlPackage = z.infer<typeof oneCCommerceMlPackageSchema>;
