import {
	type DmsGuaranteeLetter,
	kopecksToRubles,
	rublesToKopecks,
} from "@dental/shared";
import type { dmsGuaranteeLetters } from "../../../db/schema.js";

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export function isValidUuid(id: unknown): id is string {
	return typeof id === "string" && UUID_REGEX.test(id);
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

export function formatGuaranteeLetterResponse(l: DbGuaranteeLetterRow, todayIso: string = new Date().toISOString().slice(0, 10)) {
	const maxRub = Number(l.maxCoverageRub);
	const usedRub = Number(l.usedAmountRub);
	const limitKop = l.maxCoverageKopecks != null
		? Number(l.maxCoverageKopecks)
		: rublesToKopecks(maxRub);
	const usedKop = l.usedAmountKopecks != null && Number(l.usedAmountKopecks) > 0
		? Number(l.usedAmountKopecks)
		: rublesToKopecks(usedRub);
	const remainingLimitKop = Math.max(0, limitKop - usedKop);
	const franchiseFixedKop = l.franchiseFixedKopecks != null
		? Number(l.franchiseFixedKopecks)
		: rublesToKopecks(Number(l.franchiseFixedRub));

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
		franchiseFixedRub: Number(l.franchiseFixedRub),
		programExclusions: (l.programExclusions as string[]) || [],
		approvedServiceCodes: (l.approvedServiceCodes as string[]) || [],
		approvedTeethFdi: (l.approvedTeethFdi as string[]) || [],
		approvedDiagnosisCodes: (l.approvedDiagnosisCodes as string[]) || [],
		createdAt: safeToIsoString(l.createdAt),
		updatedAt: safeToIsoString(l.updatedAt),
	};
}
