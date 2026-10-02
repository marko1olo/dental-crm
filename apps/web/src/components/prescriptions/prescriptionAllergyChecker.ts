export interface AllergyConflictDrugItem {
	readonly id: string;
	readonly tradeName: string;
	readonly latinName: string;
}

export type PrescriptionAllergyType = "penicillin" | "nsaid" | "anesthetic";

export interface PrescriptionAllergyConflict {
	readonly type: PrescriptionAllergyType;
	readonly matchedAllergyTerm: string;
	readonly conflictingDrugs: readonly AllergyConflictDrugItem[];
}

export interface PrescriptionDrugItemLike {
	readonly id: string;
	readonly tradeName: string;
	readonly latinName: string;
	readonly category?: string | undefined;
	readonly form?: string | undefined;
	readonly dosage?: string | undefined;
	readonly quantity?: string | undefined;
	readonly dispenseLatin?: string | undefined;
	readonly signaRussian?: string | undefined;
}

const PENICILLIN_KEYWORDS = [
	"пеницилл",
	"амоксициллин",
	"амоксиклав",
	"аугментин",
	"флемоксин",
	"ампициллин",
	"penicillin",
	"amoxicillin",
	"amoxiclav",
	"augmentin",
	"ampicillin",
] as const;

const NSAID_KEYWORDS = [
	"нпвс",
	"нпвп",
	"nsaid",
	"аспирин",
	"аспиринов",
	"ацетилсалицил",
	"нимесил",
	"нимесулид",
	"nimesil",
	"nimesulide",
	"кеторол",
	"кеторолак",
	"кетанов",
	"ketorol",
	"ketorolac",
	"ketanov",
	"ибупрофен",
	"нурофен",
	"ibuprofen",
	"nurofen",
	"декскетопрофен",
	"дексалгин",
	"dexketoprofen",
	"dexalgin",
	"кетопрофен",
	"кетонал",
	"ketoprofen",
	"диклофенак",
	"diclofenac",
	"мелоксикам",
	"meloxicam",
	"анальгетик",
] as const;

const ANESTHETIC_KEYWORDS = [
	"анестетик",
	"анестезия",
	"лидокаин",
	"новокаин",
	"прокаин",
	"артикаин",
	"ультракаин",
	"септонест",
	"убистезин",
	"мепивакаин",
	"скандонест",
	"бупивакаин",
	"anesthetic",
	"lidocaine",
	"novocaine",
	"procaine",
	"articaine",
	"ultracain",
	"septonest",
	"ubistesin",
	"mepivacaine",
	"scandonest",
	"bupivacaine",
] as const;

function extractAllergyTerms(patientAllergies: unknown): string {
	if (!patientAllergies) return "";
	const rawList: string[] = [];
	if (Array.isArray(patientAllergies)) {
		for (const item of patientAllergies) {
			if (typeof item === "string" && item.trim()) {
				rawList.push(item.trim());
			}
		}
	} else if (typeof patientAllergies === "string" && patientAllergies.trim()) {
		const parts = patientAllergies.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
		rawList.push(...parts);
	}
	return rawList.join(" ").toLowerCase();
}

export function hasPenicillinAllergy(patientAllergies: unknown): boolean {
	const text = extractAllergyTerms(patientAllergies);
	return PENICILLIN_KEYWORDS.some((kw) => text.includes(kw));
}

export function hasNsaidAllergy(patientAllergies: unknown): boolean {
	const text = extractAllergyTerms(patientAllergies);
	return NSAID_KEYWORDS.some((kw) => text.includes(kw));
}

export function hasAnestheticAllergy(patientAllergies: unknown): boolean {
	const text = extractAllergyTerms(patientAllergies);
	return ANESTHETIC_KEYWORDS.some((kw) => text.includes(kw));
}

export function isDrugConflictingWithAllergies(
	drug: PrescriptionDrugItemLike,
	patientAllergies: unknown,
): boolean {
	return getDrugAllergyConflictType(drug, patientAllergies) !== null;
}

export function getDrugAllergyConflictType(
	drug: PrescriptionDrugItemLike,
	patientAllergies: unknown,
): PrescriptionAllergyType | null {
	const text = extractAllergyTerms(patientAllergies);
	if (!text) return null;

	const drugText = `${drug.id} ${drug.tradeName} ${drug.latinName}`.toLowerCase();

	if (hasPenicillinAllergy(patientAllergies)) {
		if (PENICILLIN_KEYWORDS.some((kw) => drugText.includes(kw))) {
			return "penicillin";
		}
	}

	if (hasNsaidAllergy(patientAllergies)) {
		if (drug.category === "nsaid" || NSAID_KEYWORDS.some((kw) => drugText.includes(kw))) {
			return "nsaid";
		}
	}

	if (hasAnestheticAllergy(patientAllergies)) {
		if (drug.category === "anesthetic" || ANESTHETIC_KEYWORDS.some((kw) => drugText.includes(kw))) {
			return "anesthetic";
		}
	}

	return null;
}

export function detectPrescriptionAllergyConflicts(
	patientAllergies: readonly string[] | string[] | string | null | undefined,
	activeDrugs: readonly PrescriptionDrugItemLike[],
): readonly PrescriptionAllergyConflict[] {
	if (!patientAllergies || activeDrugs.length === 0) return [];

	const combinedText = extractAllergyTerms(patientAllergies);
	if (!combinedText) return [];

	const conflicts: PrescriptionAllergyConflict[] = [];

	// 1. Проверка аллергии на пенициллины (амоксициллин, амоксиклав, аугментин, флемоксин, ампициллин и др.)
	const matchedPenicillinKeyword = PENICILLIN_KEYWORDS.find((kw) => combinedText.includes(kw));
	if (matchedPenicillinKeyword) {
		const penicillinDrugs = activeDrugs.filter((drug) => {
			const drugText = `${drug.id} ${drug.tradeName} ${drug.latinName}`.toLowerCase();
			return PENICILLIN_KEYWORDS.some((kw) => drugText.includes(kw));
		});

		if (penicillinDrugs.length > 0) {
			conflicts.push({
				type: "penicillin",
				matchedAllergyTerm: matchedPenicillinKeyword,
				conflictingDrugs: penicillinDrugs.map((d) => ({
					id: d.id,
					tradeName: d.tradeName,
					latinName: d.latinName,
				})),
			});
		}
	}

	// 2. Проверка аллергии на НПВС/аспирин (нимесил, кеторол, ибупрофен, кетанов, аспирин и др.)
	const matchedNsaidKeyword = NSAID_KEYWORDS.find((kw) => combinedText.includes(kw));
	if (matchedNsaidKeyword) {
		const nsaidDrugs = activeDrugs.filter((drug) => {
			if (drug.category === "nsaid") return true;
			const drugText = `${drug.id} ${drug.tradeName} ${drug.latinName}`.toLowerCase();
			return NSAID_KEYWORDS.some((kw) => drugText.includes(kw));
		});

		if (nsaidDrugs.length > 0) {
			conflicts.push({
				type: "nsaid",
				matchedAllergyTerm: matchedNsaidKeyword,
				conflictingDrugs: nsaidDrugs.map((d) => ({
					id: d.id,
					tradeName: d.tradeName,
					latinName: d.latinName,
				})),
			});
		}
	}

	// 3. Проверка аллергии на местные анестетики (лидокаин, артикаин, септонест, новокаин и др.)
	const matchedAnestheticKeyword = ANESTHETIC_KEYWORDS.find((kw) => combinedText.includes(kw));
	if (matchedAnestheticKeyword) {
		const anestheticDrugs = activeDrugs.filter((drug) => {
			if (drug.category === "anesthetic") return true;
			const drugText = `${drug.id} ${drug.tradeName} ${drug.latinName}`.toLowerCase();
			return ANESTHETIC_KEYWORDS.some((kw) => drugText.includes(kw));
		});

		if (anestheticDrugs.length > 0) {
			conflicts.push({
				type: "anesthetic",
				matchedAllergyTerm: matchedAnestheticKeyword,
				conflictingDrugs: anestheticDrugs.map((d) => ({
					id: d.id,
					tradeName: d.tradeName,
					latinName: d.latinName,
				})),
			});
		}
	}

	return conflicts;
}
