import type { DmsGuaranteeLetter, DmsGuaranteeLetterStatus } from "./guaranteeTypes.js";

export interface GuaranteeLetterDbPayload {
	id: string;
	organizationId: string;
	letterNumber: string;
	issueDate: string;
	validFrom: string;
	validTo: string;
	companyId: string;
	companyName: string;
	policyNumber: string;
	patientFullName: string;
	patientBirthDate: string;
	patientSnils?: string | null;
	patientPhone?: string | null;
	programNameRu?: string | null;
	limitKopecks: number;
	usedKopecks: number;
	remainingLimitKopecks: number;
	defaultFranchisePercent: number;
	allowedPrefixesJson?: string | null;
	excludedCodesJson?: string | null;
	status: DmsGuaranteeLetterStatus;
	notes?: string | null;
	transactionsJson?: string | null;
}

export function prepareGuaranteeLetterInsertPayload(
	letter: DmsGuaranteeLetter,
	organizationId: string,
): GuaranteeLetterDbPayload {
	return {
		id: letter.id,
		organizationId,
		letterNumber: letter.letterNumber,
		issueDate: letter.issueDate,
		validFrom: letter.validFrom,
		validTo: letter.validTo,
		companyId: letter.companyId,
		companyName: letter.companyName,
		policyNumber: letter.policyNumber,
		patientFullName: letter.patientFullName,
		patientBirthDate: letter.patientBirthDate,
		patientSnils: letter.patientSnils ?? null,
		patientPhone: letter.patientPhone ?? null,
		programNameRu: letter.programNameRu ?? null,
		limitKopecks: letter.limitKopecks,
		usedKopecks: letter.usedKopecks,
		remainingLimitKopecks: letter.remainingLimitKopecks,
		defaultFranchisePercent: letter.defaultFranchisePercent,
		allowedPrefixesJson: letter.allowed804nPrefixes ? JSON.stringify(letter.allowed804nPrefixes) : null,
		excludedCodesJson: letter.excluded804nCodes ? JSON.stringify(letter.excluded804nCodes) : null,
		status: letter.status,
		notes: letter.notes ?? null,
		transactionsJson: letter.transactions ? JSON.stringify(letter.transactions) : null,
	};
}

export function mapDbRowToGuaranteeLetter(row: Record<string, any>): DmsGuaranteeLetter {
	const parseJsonSafe = <T>(val: unknown, fallback: T): T => {
		if (typeof val === "string") {
			try { return JSON.parse(val) as T; } catch { return fallback; }
		}
		if (Array.isArray(val)) return val as unknown as T;
		return fallback;
	};

	return {
		id: String(row.id),
		letterNumber: String(row.letterNumber ?? ""),
		issueDate: String(row.issueDate ?? "").slice(0, 10),
		validFrom: String(row.validFrom ?? "").slice(0, 10),
		validTo: String(row.validTo ?? "").slice(0, 10),
		companyId: row.companyId ?? "other",
		companyName: String(row.companyName ?? ""),
		policyNumber: String(row.policyNumber ?? ""),
		patientFullName: String(row.patientFullName ?? ""),
		patientBirthDate: String(row.patientBirthDate ?? "").slice(0, 10),
		patientSnils: row.patientSnils ?? undefined,
		patientPhone: row.patientPhone ?? undefined,
		programNameRu: row.programNameRu ?? undefined,
		limitKopecks: Number(row.limitKopecks ?? 0),
		usedKopecks: Number(row.usedKopecks ?? 0),
		remainingLimitKopecks: Number(row.remainingLimitKopecks ?? 0),
		defaultFranchisePercent: Number(row.defaultFranchisePercent ?? 0),
		allowed804nPrefixes: parseJsonSafe<string[] | undefined>(row.allowedPrefixesJson, undefined),
		excluded804nCodes: parseJsonSafe<string[] | undefined>(row.excludedCodesJson, undefined),
		status: (row.status ?? "draft") as DmsGuaranteeLetterStatus,
		notes: row.notes ?? undefined,
		transactions: parseJsonSafe<any[] | undefined>(row.transactionsJson, undefined),
	};
}
