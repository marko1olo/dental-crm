import { z } from "zod";

export const dmsRegistryClinicInfoSchema = z.object({
	nameRu: z.string().min(1, { message: "Наименование клиники обязательно" }),
	inn: z.string().min(10).max(12, { message: "ИНН должен содержать 10-12 цифр" }),
	kpp: z.string().min(9).max(9, { message: "КПП должен содержать 9 цифр" }).optional().or(z.literal("")),
	ogrn: z.string().min(13).max(15, { message: "ОГРН/ОГРНИП должен содержать 13-15 цифр" }),
	addressRu: z.string().min(1, { message: "Адрес клиники обязателен" }),
	phone: z.string().min(1, { message: "Телефон клиники обязателен" }),
	email: z.string().email().optional(),
	medicalLicenseNumber: z.string().min(1, { message: "Номер медицинской лицензии обязателен" }),
	bankNameRu: z.string().optional(),
	bankBik: z.string().optional(),
	bankAccount: z.string().optional(),
	bankCorrAccount: z.string().optional(),
	chiefDoctorNameRu: z.string().min(1, { message: "ФИО главного врача обязательно" }),
	chiefAccountantNameRu: z.string().min(1, { message: "ФИО главного бухгалтера обязательно" }),
});

export const dmsRegistryInsuranceCompanyInfoSchema = z.object({
	companyId: z.string().min(1),
	nameRu: z.string().min(1, { message: "Наименование страховой компании обязательно" }),
	inn: z.string().min(10).max(12, { message: "ИНН страховой компании обязателен" }),
	kpp: z.string().optional(),
	contractNumber: z.string().min(1, { message: "Номер договора обязателен" }),
	contractDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Дата договора должна быть в формате YYYY-MM-DD" }),
});

export const dmsRegistryRecordSchema = z.object({
	recordId: z.string().min(1),
	serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	patientFullName: z.string().min(1),
	patientBirthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	patientGender: z.enum(["M", "F", "М", "Ж"]),
	patientSnils: z.string().optional(),
	policyNumber: z.string().min(1),
	guaranteeLetterNumber: z.string().min(1),
	guaranteeLetterDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
	icd10Code: z.string().min(1),
	icd10DescriptionRu: z.string().min(1),
	toothNumberFdi: z.number().int().min(0).max(85).optional(),
	serviceCode804n: z.string().min(1),
	serviceNameRu: z.string().min(1),
	doctorFullName: z.string().min(1),
	doctorSpecialtyRu: z.string().optional(),
	doctorSnils: z.string().optional(),
	quantity: z.number().int().positive(),
	unitPriceKopecks: z.number().int().nonnegative(),
	totalGrossKopecks: z.number().int().nonnegative(),
	franchisePercent: z.number().int().min(0).max(100),
	patientPaidKopecks: z.number().int().nonnegative(),
	insurerClaimKopecks: z.number().int().nonnegative(),
});

export const dmsRegistryDataSchema = z.object({
	registryNumber: z.string().min(1, { message: "Номер реестра обязателен" }),
	registryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	clinic: dmsRegistryClinicInfoSchema,
	insuranceCompany: dmsRegistryInsuranceCompanyInfoSchema,
	records: z.array(dmsRegistryRecordSchema),
});
