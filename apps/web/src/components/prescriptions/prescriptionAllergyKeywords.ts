/**
 * prescriptionAllergyKeywords.ts — Clinical Keywords for Allergies and Somatic Anamnesis
 * Architecture: Decomposed module <= 120 lines (Mandate 8b).
 */

export const PENICILLIN_KEYWORDS = [
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

export const NSAID_KEYWORDS = [
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

export const ANESTHETIC_KEYWORDS = [
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

export function extractAllergyTerms(patientAllergies: unknown): string {
	if (!patientAllergies) return "";
	const rawList: string[] = [];
	if (Array.isArray(patientAllergies)) {
		for (const item of patientAllergies) {
			if (typeof item === "string" && item.trim()) {
				rawList.push(item.trim());
			}
		}
	} else if (typeof patientAllergies === "string" && patientAllergies.trim()) {
		const parts = patientAllergies
			.split(/[,;\n]+/)
			.map((s) => s.trim())
			.filter(Boolean);
		rawList.push(...parts);
	}
	return rawList.join(" ").toLowerCase();
}
