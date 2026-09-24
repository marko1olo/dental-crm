import { z } from "zod";

/**
 * Zod Schema for Patient Identity Record used across ingestion, import, and duplicate resolution.
 */
export const patientIdentityRecordSchema = z.object({
	fullName: z.string().trim().min(1, "ФИО обязательно"),
	phone: z.string().trim().nullable().optional(),
	birthDate: z.string().trim().nullable().optional(),
	snils: z.string().trim().nullable().optional(),
	passport: z.string().trim().nullable().optional(),
	omsNumber: z.string().trim().nullable().optional(),
});
export type PatientIdentityRecord = z.infer<typeof patientIdentityRecordSchema>;

export const identityResolutionActionSchema = z.enum([
	"AUTO_MERGE",
	"MANUAL_REVIEW",
	"CREATE_NEW",
]);
export type IdentityResolutionAction = z.infer<typeof identityResolutionActionSchema>;

export interface IdentityMatchBreakdown {
	snilsMatch: boolean | null;
	passportMatch: boolean | null;
	omsMatch: boolean | null;
	phoneMatch: boolean | null;
	nameSimilarity: number;
	birthDateMatch: boolean | null;
	signals: string[];
}

export interface IdentityResolutionResult {
	confidence: number;
	action: IdentityResolutionAction;
	breakdown: IdentityMatchBreakdown;
}

// biome-ignore lint/complexity/noStaticOnlyClass: automated suppression
export class IdentityResolutionEngine {
	/**
	 * Calculates the Levenshtein distance between two strings.
	 */
	static levenshteinDistance(a: string, b: string): number {
		if (a.length === 0) return b.length;
		if (b.length === 0) return a.length;

		const matrix = Array.from({ length: a.length + 1 }, () =>
			new Array(b.length + 1).fill(0),
		);

		for (let i = 0; i <= a.length; i++) {
			const row = matrix[i];
			if (row) row[0] = i;
		}
		for (let j = 0; j <= b.length; j++) {
			const row = matrix[0];
			if (row) row[j] = j;
		}

		for (let i = 1; i <= a.length; i++) {
			const row = matrix[i];
			const prevRow = matrix[i - 1];
			if (!row || !prevRow) continue;
			for (let j = 1; j <= b.length; j++) {
				const cost = a[i - 1] === b[j - 1] ? 0 : 1;
				row[j] = Math.min(
					(prevRow[j] ?? 0) + 1, // deletion
					(row[j - 1] ?? 0) + 1, // insertion
					(prevRow[j - 1] ?? 0) + cost, // substitution
				);
			}
		}
		return matrix[a.length]?.[b.length] ?? 0;
	}

	/**
	 * Normalizes a phone number to E.164 format.
	 * Strips all non-digit characters. Assumes Russian +7 if starts with 8 and length 11.
	 * Returns null if string has fewer than 10 digits or is otherwise invalid.
	 */
	static normalizePhone(phone: string | null | undefined): string | null {
		if (!phone) return null;
		const cleaned = phone.replace(/\D/g, "");
		if (!cleaned || cleaned.length < 10 || cleaned.length > 15) {
			return null;
		}
		if (cleaned.length === 11 && cleaned.startsWith("8")) {
			return `+7${cleaned.substring(1)}`;
		}
		if (cleaned.length === 10) {
			return `+7${cleaned}`;
		}
		return `+${cleaned}`;
	}

	/**
	 * Normalizes date to canonical ISO YYYY-MM-DD.
	 * Supports formats: YYYY-MM-DD, DD.MM.YYYY, DD/MM/YYYY.
	 */
	static normalizeBirthDate(birthDate: string | null | undefined): string | null {
		if (!birthDate) return null;
		const trimmed = birthDate.trim();
		if (!trimmed) return null;

		if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
			return trimmed;
		}
		const ruMatch = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(trimmed);
		if (ruMatch && ruMatch[1] && ruMatch[2] && ruMatch[3]) {
			const day = ruMatch[1].padStart(2, "0");
			const month = ruMatch[2].padStart(2, "0");
			const year = ruMatch[3];
			return `${year}-${month}-${day}`;
		}
		const slashMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
		if (slashMatch && slashMatch[1] && slashMatch[2] && slashMatch[3]) {
			const day = slashMatch[1].padStart(2, "0");
			const month = slashMatch[2].padStart(2, "0");
			const year = slashMatch[3];
			return `${year}-${month}-${day}`;
		}

		return null;
	}

	/**
	 * Normalizes SNILS (СНИЛС) to 11 digits string.
	 */
	static normalizeSnils(snils: string | null | undefined): string | null {
		if (!snils) return null;
		const cleaned = snils.replace(/\D/g, "");
		return cleaned.length === 11 ? cleaned : null;
	}

	/**
	 * Normalizes Passport (серия и номер паспорта РФ) to 10 digits.
	 */
	static normalizePassport(passport: string | null | undefined): string | null {
		if (!passport) return null;
		const cleaned = passport.replace(/\D/g, "");
		return cleaned.length === 10 ? cleaned : null;
	}

	/**
	 * Normalizes Mandatory Health Insurance Number (ОМС) to 16 digits.
	 */
	static normalizeOms(oms: string | null | undefined): string | null {
		if (!oms) return null;
		const cleaned = oms.replace(/\D/g, "");
		return cleaned.length === 16 ? cleaned : null;
	}

	/**
	 * Normalizes a name string for comparison.
	 * Lowercases, trims, and replaces multiple spaces with a single space.
	 */
	static normalizeName(name: string | null | undefined): string {
		if (!name) return "";
		return name.toLowerCase().trim().replace(/\s+/g, " ");
	}

	/**
	 * Compares two patient records and returns a confidence score between 0.0 and 1.0.
	 */
	static calculateConfidenceScore(
		incoming: {
			fullName: string;
			phone?: string | null;
			birthDate?: string | null;
			snils?: string | null;
			passport?: string | null;
			omsNumber?: string | null;
		},
		existing: {
			fullName: string;
			phone?: string | null;
			birthDate?: string | null;
			snils?: string | null;
			passport?: string | null;
			omsNumber?: string | null;
		},
	): number {
		return IdentityResolutionEngine.evaluateMatch(incoming, existing).confidence;
	}

	/**
	 * Full multi-factor identity evaluation returning structured confidence and breakdown.
	 */
	static evaluateMatch(
		incoming: {
			fullName: string;
			phone?: string | null;
			birthDate?: string | null;
			snils?: string | null;
			passport?: string | null;
			omsNumber?: string | null;
		},
		existing: {
			fullName: string;
			phone?: string | null;
			birthDate?: string | null;
			snils?: string | null;
			passport?: string | null;
			omsNumber?: string | null;
		},
	): IdentityResolutionResult {
		const signals: string[] = [];

		// 1. SNILS Match (Unique federal identifier under Russian Law 323-FZ)
		const snilsInc = IdentityResolutionEngine.normalizeSnils(incoming.snils);
		const snilsEx = IdentityResolutionEngine.normalizeSnils(existing.snils);
		let snilsMatch: boolean | null = null;

		if (snilsInc && snilsEx) {
			if (snilsInc === snilsEx) {
				snilsMatch = true;
				signals.push("snils_exact_match");
				return {
					confidence: 0.99,
					action: "AUTO_MERGE",
					breakdown: {
						snilsMatch: true,
						passportMatch: null,
						omsMatch: null,
						phoneMatch: null,
						nameSimilarity: 1.0,
						birthDateMatch: null,
						signals,
					},
				};
			}
			snilsMatch = false;
			signals.push("snils_mismatch");
		}

		// 2. Passport Match (10-digit series + number)
		const passInc = IdentityResolutionEngine.normalizePassport(incoming.passport);
		const passEx = IdentityResolutionEngine.normalizePassport(existing.passport);
		let passportMatch: boolean | null = null;

		if (passInc && passEx) {
			if (passInc === passEx) {
				passportMatch = true;
				signals.push("passport_exact_match");
				return {
					confidence: 0.98,
					action: "AUTO_MERGE",
					breakdown: {
						snilsMatch,
						passportMatch: true,
						omsMatch: null,
						phoneMatch: null,
						nameSimilarity: 1.0,
						birthDateMatch: null,
						signals,
					},
				};
			}
			passportMatch = false;
			signals.push("passport_mismatch");
		}

		// 3. OMS Match (16-digit policy)
		const omsInc = IdentityResolutionEngine.normalizeOms(incoming.omsNumber);
		const omsEx = IdentityResolutionEngine.normalizeOms(existing.omsNumber);
		let omsMatch: boolean | null = null;

		if (omsInc && omsEx) {
			if (omsInc === omsEx) {
				omsMatch = true;
				signals.push("oms_exact_match");
				return {
					confidence: 0.96,
					action: "AUTO_MERGE",
					breakdown: {
						snilsMatch,
						passportMatch,
						omsMatch: true,
						phoneMatch: null,
						nameSimilarity: 1.0,
						birthDateMatch: null,
						signals,
					},
				};
			}
			omsMatch = false;
			signals.push("oms_mismatch");
		}

		let score = 0;

		// 4. Phone Match (E.164)
		const phoneInc = IdentityResolutionEngine.normalizePhone(incoming.phone);
		const phoneEx = IdentityResolutionEngine.normalizePhone(existing.phone);
		let phoneMatch: boolean | null = null;

		if (phoneInc && phoneEx) {
			if (phoneInc === phoneEx) {
				score += 0.4;
				phoneMatch = true;
				signals.push("phone_exact_match");
			} else {
				score -= 0.1;
				phoneMatch = false;
				signals.push("phone_mismatch");
			}
		}

		// 5. Name Match (Levenshtein distance)
		const nameInc = IdentityResolutionEngine.normalizeName(incoming.fullName);
		const nameEx = IdentityResolutionEngine.normalizeName(existing.fullName);
		const maxLen = Math.max(nameInc.length, nameEx.length);
		const dist = IdentityResolutionEngine.levenshteinDistance(nameInc, nameEx);
		const nameSimilarity = maxLen === 0 ? 0 : (maxLen - dist) / maxLen;

		score += nameSimilarity * 0.4;
		if (nameSimilarity >= 0.95) {
			signals.push("name_exact_match");
		} else if (nameSimilarity >= 0.8) {
			signals.push("name_high_similarity");
		}

		// 6. BirthDate Match
		const dobInc = IdentityResolutionEngine.normalizeBirthDate(incoming.birthDate);
		const dobEx = IdentityResolutionEngine.normalizeBirthDate(existing.birthDate);
		let birthDateMatch: boolean | null = null;

		if (dobInc && dobEx) {
			if (dobInc === dobEx) {
				score += 0.3;
				birthDateMatch = true;
				signals.push("dob_exact_match");
				if (nameSimilarity > 0.8) {
					score += 0.1;
				}
			} else {
				score -= 0.25;
				birthDateMatch = false;
				signals.push("dob_mismatch");
			}
		}

		if (snilsMatch === false) {
			score -= 0.3;
		}
		if (passportMatch === false) {
			score -= 0.3;
		}

		const finalScore = Math.max(0, Math.min(1.0, Math.round(score * 100) / 100));
		const action = IdentityResolutionEngine.getResolutionAction(finalScore);

		return {
			confidence: finalScore,
			action,
			breakdown: {
				snilsMatch,
				passportMatch,
				omsMatch,
				phoneMatch,
				nameSimilarity: Math.round(nameSimilarity * 100) / 100,
				birthDateMatch,
				signals,
			},
		};
	}

	/**
	 * Determines the action based on the confidence score.
	 */
	static getResolutionAction(
		score: number,
	): IdentityResolutionAction {
		if (score >= 0.85) return "AUTO_MERGE";
		if (score >= 0.65) return "MANUAL_REVIEW";
		return "CREATE_NEW";
	}
}
