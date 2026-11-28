import {
	type DmsGuaranteeLetter,
	kopecksToRubles,
	rublesToKopecks,
	todayDateKeyInTimeZone,
} from "@dental/shared";
import type { dmsGuaranteeLetters, insuranceContracts } from "../../../db/schema.js";

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export function isValidUuid(id: unknown): id is string {
	return typeof id === "string" && UUID_REGEX.test(id);
}

/**
 * Resolves BIGINT kopecks column as SSOT, falling back to legacy numeric rubles column
 * only when kopecks is null or still 0 while rubles holds a non-zero legacy value.
 */
export function resolveDbKopecks(
	kopecksCol: bigint | number | null | undefined,
	rubCol: string | number | null | undefined,
): number {
	const kop = kopecksCol != null ? Number(kopecksCol) : 0;
	if (kop !== 0) return kop;
	return rubCol != null ? rublesToKopecks(Number(rubCol)) : 0;
}

export type DbInsuranceContractRow = typeof insuranceContracts.$inferSelect;

export function formatInsuranceContractResponse(c: DbInsuranceContractRow) {
	const annualLimitKop = resolveDbKopecks(c.annualLimitKopecks, c.annualLimitRub);
	const resolvedAnnualLimitRub =
		annualLimitKop > 0
			? kopecksToRubles(annualLimitKop)
			: c.annualLimitRub != null
				? Number(c.annualLimitRub)
				: c.annualLimitKopecks != null
					? 0
					: null;

	return {
		...c,
		coverageTherapyPct: Number(c.coverageTherapyPct),
		coverageSurgeryPct: Number(c.coverageSurgeryPct),
		coverageOrthoPct: Number(c.coverageOrthoPct),
		coverageHygienePct: Number(c.coverageHygienePct),
		patientFranchisePct: Number(c.patientFranchisePct),
		annualLimitKopecks: annualLimitKop,
		annualLimitRub: resolvedAnnualLimitRub,
	};
}

export function safeToIsoString(date: unknown, fallback?: string): string {
	if (date instanceof Date && !Number.isNaN(date.getTime())) {
		return date.toISOString();
	}
	if (typeof date === "string" || typeof date === "number") {
		const parsed = new Date(date);
		if (!Number.isNaN(parsed.getTime())) {
			return parsed.toISOString();
		}
	}
	return fallback ?? new Date().toISOString();
}

export type DbGuaranteeLetterRow = typeof dmsGuaranteeLetters.$inferSelect;

export function formatGuaranteeLetterResponse(l: DbGuaranteeLetterRow, todayIso: string = todayDateKeyInTimeZone("Europe/Samara")) {
	const limitKop = resolveDbKopecks(l.maxCoverageKopecks, l.maxCoverageRub);
	const usedKop = resolveDbKopecks(l.usedAmountKopecks, l.usedAmountRub);
	const remainingLimitKop = Math.max(0, limitKop - usedKop);
	const franchiseFixedKop = resolveDbKopecks(l.franchiseFixedKopecks, l.franchiseFixedRub);
	const maxRub = limitKop > 0 ? kopecksToRubles(limitKop) : Number(l.maxCoverageRub);
	const usedRub = usedKop > 0 ? kopecksToRubles(usedKop) : Number(l.usedAmountRub);

	let computedStatus = l.status;
	if ((l.status === "active" || l.status === "approved") && l.validUntil && l.validUntil < todayIso) {
		computedStatus = "expired";
	} else if ((l.status === "active" || l.status === "approved") && (limitKop > 0 ? usedKop >= limitKop : usedRub >= maxRub)) {
		computedStatus = "exhausted";
	}

	return {
		...l,
		validTo: l.validUntil,
		limitKopecks: limitKop,
		usedKopecks: usedKop,
		remainingLimitKopecks: remainingLimitKop,
		maxCoverageKopecks: limitKop,
		usedAmountKopecks: usedKop,
		franchiseFixedKopecks: franchiseFixedKop,
		status: computedStatus as DmsGuaranteeLetter["status"],
		maxCoverageRub: maxRub,
		usedAmountRub: usedRub,
		franchisePct: Number(l.franchisePct),
		franchiseType: (l.franchiseType as "percent" | "fixed_rub") || "percent",
		franchiseFixedRub:
			franchiseFixedKop > 0
				? kopecksToRubles(franchiseFixedKop)
				: Number(l.franchiseFixedRub),
		programExclusions: (l.programExclusions as string[]) || [],
		approvedServiceCodes: (l.approvedServiceCodes as string[]) || [],
		approvedTeethFdi: (l.approvedTeethFdi as string[]) || [],
		approvedDiagnosisCodes: (l.approvedDiagnosisCodes as string[]) || [],
		createdAt: safeToIsoString(l.createdAt),
		updatedAt: safeToIsoString(l.updatedAt),
	};
}
