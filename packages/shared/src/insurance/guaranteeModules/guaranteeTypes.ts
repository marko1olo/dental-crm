import { z } from "zod";
import type { Kopecks } from "../../utils/money.js";

export type DmsInsuranceCompanyId =
	| "sogaz"
	| "alfastrakhovanie"
	| "ingosstrakh"
	| "reso_garantiya"
	| "vsk"
	| "soglasie"
	| "rosgosstrakh"
	| "kapital_life"
	| "other";

export interface DmsInsuranceCompany {
	readonly id: DmsInsuranceCompanyId;
	readonly shortNameRu: string;
	readonly fullNameRu: string;
	readonly inn: string;
	readonly ogrn: string;
	readonly kpp: string;
	readonly phone: string;
	readonly email: string;
	readonly websiteUrl: string;
	readonly defaultFranchiseRates: readonly number[];
	readonly descriptionRu: string;
}

export type DmsGuaranteeLetterStatus =
	| "draft"
	| "pending_approval"
	| "approved"
	| "active"
	| "billed"
	| "paid"
	| "exhausted"
	| "expired"
	| "cancelled";

export interface DmsLetterTransaction {
	readonly id: string;
	readonly letterId: string;
	readonly dateIso: string;
	readonly transactionRef: string;
	readonly amountKopecks: Kopecks;
	readonly balanceAfterKopecks: Kopecks;
	readonly descriptionRu: string;
	readonly doctorName?: string | undefined;
}

export interface DmsGuaranteeLetter {
	readonly id: string;
	readonly letterNumber: string;
	readonly issueDate: string;
	readonly validFrom: string;
	readonly validTo: string;
	readonly companyId: DmsInsuranceCompanyId;
	readonly companyName: string;
	readonly policyNumber: string;
	readonly patientFullName: string;
	readonly patientBirthDate: string;
	readonly patientSnils?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly programNameRu?: string | undefined;
	readonly limitKopecks: Kopecks;
	readonly usedKopecks: Kopecks;
	readonly remainingLimitKopecks: Kopecks;
	readonly defaultFranchisePercent: number;
	readonly allowed804nPrefixes?: readonly string[] | undefined;
	readonly excluded804nCodes?: readonly string[] | undefined;
	readonly status: DmsGuaranteeLetterStatus;
	readonly notes?: string | undefined;
	readonly transactions?: readonly DmsLetterTransaction[] | undefined;
}

export const dmsGuaranteeLetterSchema = z.object({
	id: z.string().min(1, { message: "ID гарантийного письма обязателен" }),
	letterNumber: z.string().min(1, { message: "Номер гарантийного письма обязателен" }),
	issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Дата выдачи: YYYY-MM-DD" }),
	validFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Дата начала: YYYY-MM-DD" }),
	validTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Дата окончания: YYYY-MM-DD" }),
	companyId: z.enum([
		"sogaz", "alfastrakhovanie", "ingosstrakh", "reso_garantiya",
		"vsk", "soglasie", "rosgosstrakh", "kapital_life", "other",
	]),
	companyName: z.string().min(1, { message: "Наименование страховой компании обязательно" }),
	policyNumber: z.string().min(1, { message: "Номер полиса ДМС обязателен" }),
	patientFullName: z.string().min(1, { message: "ФИО застрахованного обязательно" }),
	patientBirthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Дата рождения: YYYY-MM-DD" }),
	patientSnils: z.string().optional(),
	patientPhone: z.string().optional(),
	programNameRu: z.string().optional(),
	limitKopecks: z.number().int().nonnegative(),
	usedKopecks: z.number().int().nonnegative(),
	remainingLimitKopecks: z.number().int().nonnegative(),
	defaultFranchisePercent: z.number().int().min(0).max(100),
	allowed804nPrefixes: z.array(z.string()).optional(),
	excluded804nCodes: z.array(z.string()).optional(),
	status: z.enum([
		"draft", "pending_approval", "approved", "active",
		"billed", "paid", "exhausted", "expired", "cancelled",
	]),
	notes: z.string().optional(),
});
