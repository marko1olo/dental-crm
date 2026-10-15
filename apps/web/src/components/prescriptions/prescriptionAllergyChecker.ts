import { checkMedicationSafetyContraindications } from "@dental/shared";

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

	const ssotSafety = checkMedicationSafetyContraindications(drug.id, [text]);
	if (ssotSafety.hasConflict) {
		if (drug.category === "antibiotic" || PENICILLIN_KEYWORDS.some((kw) => drugText.includes(kw))) {
			return "penicillin";
		}
		if (drug.category === "anesthetic") {
			return "anesthetic";
		}
		return "nsaid";
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

export const ULCER_GASTRITIS_KEYWORDS = [
	"язвенная болезнь",
	"язва желудка",
	"язва",
	"язвенн",
	"хронический гастрит",
	"острый гастрит",
	"гастрит",
	"эрозивн",
	"эрозия жкт",
	"желуд",
	"рефлюкс",
	"гэрб",
	"ulcer",
	"gastritis",
	"gerd",
	"peptic",
] as const;

export interface PrescriptionSomaticWarning {
	readonly id: string;
	readonly type: "ulcer_gastritis_nsaid";
	readonly messageRu: string;
	readonly recommendationRu: string;
	readonly matchedTerm: string;
	readonly affectedDrugs: readonly string[];
}

export function hasUlcerGastritisCondition(patientHistory: unknown): boolean {
	const text = extractAllergyTerms(patientHistory);
	return ULCER_GASTRITIS_KEYWORDS.some((kw) => text.includes(kw));
}

export function detectPrescriptionSomaticWarnings(
	patientAnamnesisOrHistory: unknown,
	activeDrugs: readonly PrescriptionDrugItemLike[],
): readonly PrescriptionSomaticWarning[] {
	if (!patientAnamnesisOrHistory || activeDrugs.length === 0) return [];

	const text = extractAllergyTerms(patientAnamnesisOrHistory);
	if (!text) return [];

	const matchedUlcer = ULCER_GASTRITIS_KEYWORDS.find((kw) => text.includes(kw));
	if (!matchedUlcer) return [];

	const nsaidDrugs = activeDrugs.filter((drug) => {
		if (drug.category === "nsaid") return true;
		const drugText = `${drug.id} ${drug.tradeName} ${drug.latinName}`.toLowerCase();
		return NSAID_KEYWORDS.some((kw) => drugText.includes(kw));
	});

	if (nsaidDrugs.length === 0) return [];

	return [
		{
			id: "somatic_ulcer_gastritis_nsaid",
			type: "ulcer_gastritis_nsaid",
			messageRu: `У пациента в соматическом анамнезе выявлено поражение ЖКТ («${matchedUlcer}»). Назначены препараты группы НПВП (${nsaidDrugs.map((d) => d.tradeName).join(", ")}).`,
			recommendationRu: "Рекомендуется назначить гастропротекцию (Омепразол 20 мг утром за 30 мин до еды) или заменить на Парацетамол.",
			matchedTerm: matchedUlcer,
			affectedDrugs: nsaidDrugs.map((d) => d.id),
		},
	];
}

