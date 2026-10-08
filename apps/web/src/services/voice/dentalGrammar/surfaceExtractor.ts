/**
 * surfaceExtractor.ts — Layer 1: Выделение анатомических поверхностей зубов (MODBL)
 */

export function extractToothSurfaces(text: string): string[] {
	if (!text) return [];
	const norm = text.toLowerCase().replace(/ё/g, "е");
	const surfaces = new Set<string>();

	if (norm.includes("mod") || norm.includes("м од") || norm.includes("мод")) {
		return ["M", "O", "D"];
	}
	if (norm.includes("mo") || norm.includes("мо") || norm.includes("медиально-окклюзи")) {
		surfaces.add("M");
		surfaces.add("O");
	}
	if (norm.includes("od") || norm.includes("од") || norm.includes("окклюзионно-дистальн")) {
		surfaces.add("O");
		surfaces.add("D");
	}
	if (norm.includes("окклюзион") || norm.includes("жевательн") || norm.includes("режущ")) {
		surfaces.add("O");
	}
	if (norm.includes("вестибулярн") || norm.includes("щечн") || norm.includes("губн")) {
		surfaces.add("V");
	}
	if (norm.includes("медиальн") || norm.includes("мезиальн")) {
		surfaces.add("M");
	}
	if (norm.includes("дистальн")) {
		surfaces.add("D");
	}
	if (norm.includes("язычн")) {
		surfaces.add("L");
	}
	if (norm.includes("небн") || norm.includes("нёбн")) {
		surfaces.add("P");
	}
	if (norm.includes("пришеечн") || norm.includes("v класс") || norm.includes("5 класс")) {
		surfaces.add("V");
	}

	return Array.from(surfaces);
}
