export interface AllergyConflictDrugItem {
	readonly id: string;
	readonly tradeName: string;
	readonly latinName: string;
}

export interface PrescriptionAllergyConflict {
	readonly type: "penicillin" | "nsaid";
	readonly matchedAllergyTerm: string;
	readonly conflictingDrugs: readonly AllergyConflictDrugItem[];
}

export interface PrescriptionDrugItemLike {
	readonly id: string;
	readonly tradeName: string;
	readonly latinName: string;
	readonly category?: string;
}

export function detectPrescriptionAllergyConflicts(
	patientAllergies: readonly string[] | string[] | string | null | undefined,
	activeDrugs: readonly PrescriptionDrugItemLike[],
): readonly PrescriptionAllergyConflict[] {
	if (!patientAllergies || activeDrugs.length === 0) return [];

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

	if (rawList.length === 0) return [];
	const combinedText = rawList.join(" ").toLowerCase();

	const conflicts: PrescriptionAllergyConflict[] = [];

	// 1. Проверка аллергии на пенициллины (амоксициллин, амоксиклав, аугментин, флемоксин, ампициллин и др.)
	const penicillinKeywords = [
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
	];
	const matchedPenicillinKeyword = penicillinKeywords.find((kw) => combinedText.includes(kw));

	if (matchedPenicillinKeyword) {
		const penicillinDrugs = activeDrugs.filter((drug) => {
			const drugText = `${drug.id} ${drug.tradeName} ${drug.latinName}`.toLowerCase();
			return penicillinKeywords.some((kw) => drugText.includes(kw));
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
	const nsaidKeywords = [
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
	];
	const matchedNsaidKeyword = nsaidKeywords.find((kw) => combinedText.includes(kw));

	if (matchedNsaidKeyword) {
		const nsaidDrugs = activeDrugs.filter((drug) => {
			if (drug.category === "nsaid") return true;
			const drugText = `${drug.id} ${drug.tradeName} ${drug.latinName}`.toLowerCase();
			return [
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
				"аспирин",
				"ацетилсалицил",
				"aspirin",
				"мелоксикам",
				"meloxicam",
			].some((kw) => drugText.includes(kw));
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

	return conflicts;
}
