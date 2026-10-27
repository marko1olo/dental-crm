/**
 * apps/web/src/components/visit/clinicalCatalog/clinicalProtocolsMatcher.ts
 *
 * Интеллектуальный матчер клинических протоколов по запросу врача у кресла (<2мс).
 */

import { GROUPED_CLINICAL_PROCEDURES } from "./clinicalProtocolsData";
import { buildProcedureVisitNotePatch, extractFdiToothFromText } from "./clinicalProtocolsPatches";
import type {
	ClinicalProtocolMatchResult,
	GroupedClinicalProcedure,
	SpecialtyCategoryKey,
} from "./clinicalProtocolsTypes";

function inferCategoryFromQuery(lower: string, targetTooth: number | null, fallback: SpecialtyCategoryKey): SpecialtyCategoryKey {
	if (fallback !== "all") return fallback;
	if (lower.includes("детск") || lower.includes("молочн") || lower.includes("ребен") || (targetTooth && targetTooth >= 51 && targetTooth <= 85)) return "pediatric";
	if (lower.includes("удал") || lower.includes("имплант") || lower.includes("синус") || lower.includes("альвеолит") || lower.includes("резекци") || lower.includes("экзостоз") || lower.includes("пластик")) return "surgery";
	if (lower.includes("коронк") || lower.includes("винир") || lower.includes("протез") || lower.includes("оттиск") || lower.includes("слепк") || lower.includes("вкладк")) return "orthopedics";
	if (lower.includes("гигиен") || lower.includes("чистк") || lower.includes("air flow") || lower.includes("air-flow") || lower.includes("скейлинг") || lower.includes("фторирован")) return "hygiene";
	if (lower.includes("отбеливан") || lower.includes("zoom") || lower.includes("opalescence")) return "bleaching";
	if (lower.includes("пародонт") || lower.includes("гингивит") || lower.includes("десн") || lower.includes("кюретаж") || lower.includes("вектор")) return "periodontics";
	if (lower.includes("кариес") || lower.includes("пульпит") || lower.includes("периодонтит") || lower.includes("эндодонт") || lower.includes("канал")) return "therapy";
	return "all";
}

function calculateProtocolScore(proc: GroupedClinicalProcedure, lower: string, promptTokens: string[], inferredCategory: SpecialtyCategoryKey): number {
	let score = 0;
	const nameLower = proc.procedureName.toLowerCase();
	if (inferredCategory !== "all" && proc.categoryKey === inferredCategory) score += 30;

	if (lower.includes("ретинир") && nameLower.includes("ретинированного")) score += 150;
	if (lower.includes("удал") && !lower.includes("ретинир") && nameLower === "удаление зуба") score += 120;
	if (lower.includes("синус") && nameLower.includes("синус-лифтинг")) score += 150;
	if (lower.includes("имплант") && !nameLower.includes("удаление") && nameLower.includes("имплантация")) score += 120;
	if (lower.includes("кариес") && lower.includes("глубок") && nameLower === "кариес дентина") score += 140;
	if (lower.includes("кариес") && lower.includes("эмал") && nameLower === "кариес эмали") score += 140;
	if (lower.includes("кариес") && !lower.includes("глубок") && !lower.includes("эмал") && nameLower === "кариес дентина") score += 100;
	if (lower.includes("пульпит") && nameLower.startsWith("пульпит")) score += 130;
	if (lower.includes("периодонтит") && nameLower.startsWith("периодонтит")) score += 130;
	if (lower.includes("коронк") && nameLower.includes("коронку на своих зубах")) score += 130;
	if (lower.includes("винир") && nameLower.includes("виниры")) score += 140;
	if (lower.includes("гигиен") && nameLower.includes("гигиена")) score += 140;
	if (lower.includes("отбеливан") && nameLower.includes("отбеливание")) score += 130;

	for (const token of promptTokens) {
		if (nameLower.includes(token)) score += 25;
		if (proc.matchedIcd10 && proc.matchedIcd10.toLowerCase().includes(token)) score += 20;
		if (proc.treatment?.text.toLowerCase().includes(token)) score += 10;
		if (proc.complaints?.text.toLowerCase().includes(token)) score += 5;
	}
	return score;
}

export function findBestClinicalProtocol(
	rawQuery: string,
	optionsOrTooth?: number | null | { specialty?: SpecialtyCategoryKey; toothNumber?: number | null; currentForm?: Record<string, any> },
): ClinicalProtocolMatchResult | null {
	const text = rawQuery.trim();
	if (!text) return null;

	const options = typeof optionsOrTooth === "number" ? { toothNumber: optionsOrTooth } : (optionsOrTooth ?? {});
	const targetTooth = options.toothNumber ?? extractFdiToothFromText(text);
	const lower = text.toLowerCase();
	const cleanPrompt = lower
		.replace(/\b(дента|пожалуйста|заполни|поставь|примени|выбери|протокол|протоколы|шаблон|дневник|карту|приёма|приема|соап|soap|зуб|зуба|зубе|зубов|на|для|в|по|с|со|области)\b/gi, " ")
		.replace(/\b\d{2}\b/g, " ").replace(/[.,:;!?"'(){}[\]-]/g, " ").replace(/\s+/g, " ").trim();

	const inferredCategory = inferCategoryFromQuery(lower, targetTooth, options.specialty ?? "all");
	const promptTokens = cleanPrompt.split(/\s+/).filter((t) => t.length >= 3);
	const scored = GROUPED_CLINICAL_PROCEDURES.map((proc) => ({ proc, score: calculateProtocolScore(proc, lower, promptTokens, inferredCategory) }))
		.filter((item) => item.score > 0).sort((a, b) => b.score - a.score);

	const best = scored[0];
	const selected = best?.proc ?? GROUPED_CLINICAL_PROCEDURES.find((p) => p.procedureName.toLowerCase().includes("кариес дентина")) ?? GROUPED_CLINICAL_PROCEDURES[0];
	if (!selected) return null;

	const patch = buildProcedureVisitNotePatch(selected, options.currentForm, targetTooth);
	const bestName = selected.procedureName.toLowerCase();
	let recommendedToothState: "treatment" | "done" | "missing" | "idle" = "treatment";
	if (selected.categoryKey === "surgery" && (bestName.includes("удаление") || bestName.includes("ретинир"))) recommendedToothState = "missing";
	else if (selected.categoryKey === "orthopedics" || bestName.includes("имплант") || bestName.includes("коронк") || bestName.includes("винир") || bestName.includes("пломб")) recommendedToothState = "done";
	else if (selected.categoryKey === "hygiene" || selected.categoryKey === "bleaching" || bestName.includes("осмотр") || bestName.includes("норма")) recommendedToothState = "idle";

	return {
		procedure: selected,
		procedureId: selected.id,
		procedureName: selected.procedureName,
		categoryKey: selected.categoryKey,
		categoryName: selected.categoryName,
		score: best ? best.score : 10,
		targetTooth,
		tooth: targetTooth,
		specialtyKey: selected.categoryKey,
		...(selected.matchedIcd10 ? { matchedIcd10: selected.matchedIcd10 } : {}),
		patch,
		recommendedToothState,
		alternatives: scored.length > 0 ? scored.slice(1, 4).map((s) => s.proc) : GROUPED_CLINICAL_PROCEDURES.slice(1, 4),
	};
}
