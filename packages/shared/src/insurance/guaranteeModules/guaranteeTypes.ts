import type { Kopecks } from "../../money.js";

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

export { dmsGuaranteeLetterSchema } from "../../schemas/documentChainAndDmsSchemas.js";
