/**
 * apps/web/src/components/visit/clinicalCatalog/clinicalProtocolsSearch.ts
 *
 * Индексированный быстрый поиск по клиническим процедурам и чанкам СтАР.
 */

import { ALL_CLINICAL_CHUNKS_1142, GROUPED_CLINICAL_PROCEDURES } from "./clinicalProtocolsData";
import type {
	ChunkType,
	ClinicalChunk1142,
	GroupedClinicalProcedure,
	SpecialtyCategoryKey,
} from "./clinicalProtocolsTypes";

export function searchClinicalChunks(
	query: string,
	categoryKey: SpecialtyCategoryKey = "all",
	chunkType?: ChunkType,
): readonly ClinicalChunk1142[] {
	const q = query.trim().toLowerCase();
	let pool = ALL_CLINICAL_CHUNKS_1142;

	if (categoryKey !== "all") {
		pool = pool.filter((c) => c.categoryKey === categoryKey);
	}
	if (chunkType) {
		pool = pool.filter((c) => c.chunkType === chunkType);
	}
	if (!q) {
		return pool;
	}

	return pool.filter((c) => {
		return (
			c.name.toLowerCase().includes(q) ||
			c.procedureName.toLowerCase().includes(q) ||
			c.text.toLowerCase().includes(q) ||
			Boolean(c.icd10 && c.icd10.toLowerCase().includes(q))
		);
	});
}

export function searchGroupedProcedures(
	query: string,
	categoryKey: SpecialtyCategoryKey = "all",
): readonly GroupedClinicalProcedure[] {
	const q = query.trim().toLowerCase();
	let pool = GROUPED_CLINICAL_PROCEDURES;

	if (categoryKey !== "all" && categoryKey !== "icd10") {
		pool = pool.filter((p) => p.categoryKey === categoryKey);
	}
	if (!q) {
		return pool;
	}

	return pool.filter((p) => {
		return (
			p.procedureName.toLowerCase().includes(q) ||
			p.categoryName.toLowerCase().includes(q) ||
			Boolean(p.matchedIcd10 && p.matchedIcd10.toLowerCase().includes(q)) ||
			Boolean(p.complaints?.text && p.complaints.text.toLowerCase().includes(q)) ||
			Boolean(p.treatment?.text && p.treatment.text.toLowerCase().includes(q)) ||
			Boolean(p.objective?.text && p.objective.text.toLowerCase().includes(q))
		);
	});
}
