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
	| "ugoria"
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
	| "pending_letter"
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
	readonly validUntil?: string | undefined;
	readonly companyId: DmsInsuranceCompanyId;
	readonly companyName: string;
	readonly insurerId?: string | undefined;
	readonly insurerName?: string | undefined;
	readonly policyNumber: string;
	readonly patientFullName: string;
	readonly patientBirthDate: string;
	readonly patientId?: string | undefined;
	readonly patientSnils?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly programKey?: string | undefined;
	readonly programNameRu?: string | undefined;
	readonly limitKopecks: Kopecks;
	readonly totalLimitKopecks?: Kopecks | undefined;
	readonly usedKopecks: Kopecks;
	readonly usedAmountKopecks?: Kopecks | undefined;
	readonly remainingLimitKopecks: Kopecks;
	readonly defaultFranchisePercent: number;
	readonly allowed804nPrefixes?: readonly string[] | undefined;
	readonly excluded804nCodes?: readonly string[] | undefined;
	readonly approvedNomenclatureCodes?: readonly string[] | undefined;
	readonly approvedTeeth?: readonly string[] | undefined;
	readonly diagnosisMkb10?: readonly string[] | undefined;
	readonly curatorFullName?: string | undefined;
	readonly curatorPhone?: string | undefined;
	readonly curatorEmail?: string | undefined;
	readonly attachedXrayUris?: readonly string[] | undefined;
	readonly status: DmsGuaranteeLetterStatus;
	readonly notes?: string | undefined;
	readonly transactions?: readonly DmsLetterTransaction[] | undefined;
}

export const dmsGuaranteeLetterSchema = z.object({
	id: z.string().min(1, { message: "ID гарантийного письма обязателен" }),
	letterNumber: z.string().min(1, { message: "Номер гарантийного письма обязателен" }),
	issueDate: z.string().min(1),
	validFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Дата начала: YYYY-MM-DD" }),
	validTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Дата окончания: YYYY-MM-DD" }),
	validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Дата окончания: YYYY-MM-DD" }).optional(),
	companyId: z.enum([
		"sogaz", "alfastrakhovanie", "ingosstrakh", "reso_garantiya",
		"vsk", "soglasie", "rosgosstrakh", "kapital_life", "ugoria", "other",
	]),
	companyName: z.string().min(1, { message: "Наименование страховой компании обязательно" }),
	policyNumber: z.string().min(1, { message: "Номер полиса ДМС обязателен" }),
	patientFullName: z.string().min(1, { message: "ФИО застрахованного обязательно" }),
	patientBirthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Дата рождения: YYYY-MM-DD" }),
	insurerId: z.string().optional(),
	insurerName: z.string().optional(),
	patientId: z.string().optional(),
	patientSnils: z.string().optional(),
	patientPhone: z.string().optional(),
	programKey: z.string().optional(),
	programNameRu: z.string().optional(),
	limitKopecks: z.number().int().nonnegative(),
	totalLimitKopecks: z.number().int().nonnegative().optional(),
	usedKopecks: z.number().int().nonnegative(),
	usedAmountKopecks: z.number().int().nonnegative().optional(),
	remainingLimitKopecks: z.number().int().nonnegative(),
	defaultFranchisePercent: z.number().int().min(0).max(100),
	allowed804nPrefixes: z.array(z.string()).optional(),
	excluded804nCodes: z.array(z.string()).optional(),
	approvedNomenclatureCodes: z.array(z.string()).optional(),
	approvedTeeth: z.array(z.string()).optional(),
	diagnosisMkb10: z.array(z.string()).optional(),
	curatorFullName: z.string().optional(),
	curatorPhone: z.string().optional(),
	curatorEmail: z.string().optional(),
	attachedXrayUris: z.array(z.string()).optional(),
	status: z.enum([
		"draft", "pending_letter", "pending_approval", "approved", "active",
		"billed", "paid", "exhausted", "expired", "cancelled",
	]),
	notes: z.string().optional(),
});
