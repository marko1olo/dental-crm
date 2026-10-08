/**
 * clinicalPromptBuilder.ts — Layer 2 Clinical Context Synthesis & Agent Tool.
 * 
 * Synthesizes medically rigorous Russian clinical summaries answering the doctor's
 * query directly, builds structured Copilot prompt contexts with 152-FZ PII protection,
 * and exports the agent tool `clinical.search_patient_history`.
 */

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db as defaultDb } from "../../../../db/client.js";
import { patients } from "../../../../db/schema.js";
import type { AgentContext } from "../../context.js";
import type { ToolDefinition } from "../../tools/tool.js";
import { retrieveAndRankHistoryMatches } from "./historyRetriever.js";
import { sanitizePatientHistoryPii } from "./patientDataSanitizer.js";
import type {
	ClinicalRagPromptOptions,
	MemoryMatchResult,
	ParsedClinicalQuery,
	PatientHistorySearchResult,
	SearchPatientHistoryOptions,
} from "./types.js";

/**
 * Synthesizes a natural, concise, medically rigorous Russian summary answering
 * the doctor's query directly based on ranked records.
 */
export function synthesizeClinicalAnswerRu(
	query: ParsedClinicalQuery,
	matches: MemoryMatchResult[],
	totalScanned: number,
): string {
	if (matches.length === 0) {
		if (query.extractedTeeth.length > 0) {
			return `В истории болезни за последние 5 лет записей о лечении зуба FDI ${query.extractedTeeth.join(", ")} не обнаружено (проверено записей: ${totalScanned}).`;
		}
		if (query.intent === "allergy_check") {
			return `Аллергологический анамнез чист: данных о лекарственной аллергии или непереносимости в карте пациента не зафиксировано.`;
		}
		return `По запросу "${query.rawQuery}" в 5-летней истории ЭМК 043/у релевантных клинических записей не найдено (проверено ${totalScanned} событий).`;
	}

	const top = matches[0];
	if (!top) {
		return `По запросу "${query.rawQuery}" в 5-летней истории ЭМК 043/у релевантных клинических записей не найдено.`;
	}

	const rawDate = top.visitDate ? new Date(top.visitDate) : new Date();
	const dateRu = !Number.isNaN(rawDate.getTime())
		? rawDate.toLocaleDateString("ru-RU")
		: "ранее";

	switch (query.intent) {
		case "tooth_treatment_history": {
			const toothStr =
				query.extractedTeeth.length > 0
					? `зуба FDI ${query.extractedTeeth.join(", ")}`
					: top.toothNumber
						? `зуба FDI ${top.toothNumber}`
						: "зуба";

			const details: string[] = [];
			if (top.doctorFullName) details.push(`врач: ${top.doctorFullName}`);
			if (top.diagnosis?.code) details.push(`диагноз: ${top.diagnosis.code}`);
			if (top.materials && top.materials.length > 0)
				details.push(`материалы: ${top.materials.join(", ")}`);
			if (top.anesthesia) details.push(`анестезия: ${top.anesthesia}`);
			if (top.complications)
				details.push(`⚠️ осложнения: ${top.complications}`);

			const extraMatches = matches
				.slice(1, 3)
				.filter((m) => m.toothNumber === top.toothNumber);
			let extraStr = "";
			if (extraMatches.length > 0) {
				extraStr = ` Также зафиксированы приемы: ${extraMatches.map((m) => `${new Date(m.visitDate).toLocaleDateString("ru-RU")} (${m.summary})`).join("; ")}.`;
			}

			return `Лечение ${toothStr} проводилось ${dateRu} (${details.join("; ")}).${extraStr}`;
		}

		case "anesthesia_complications": {
			const compMatches = matches.filter(
				(m) =>
					m.complications ||
					m.summary.toLowerCase().includes("осложнен") ||
					m.summary.toLowerCase().includes("обморок") ||
					m.summary.toLowerCase().includes("аллерг"),
			);

			if (compMatches.length === 0) {
				const anesthesias = Array.from(
					new Set(matches.map((m) => m.anesthesia).filter(Boolean)),
				);
				const anesthList =
					anesthesias.length > 0
						? `Применялась анестезия: ${anesthesias.join("; ")}.`
						: "";
				return `Осложнений и патологических реакций после анестезии в карте не зафиксировано (всего приемов: ${matches.length}). ${anesthList}`;
			}

			const compDesc = compMatches
				.map(
					(m) =>
						`${new Date(m.visitDate).toLocaleDateString("ru-RU")} — ${m.complications || m.summary} (врач: ${m.doctorFullName || "—"})`,
				)
				.join("; ");
			return `⚠️ Внимание! Зафиксированы осложнения / реакции: ${compDesc}.`;
		}

		case "allergy_check": {
			const allergyMatches = matches.filter(
				(m) => m.category === "allergy_anamnesis",
			);
			if (allergyMatches.length === 0) {
				return `Аллергологический статус: аллергий на указанные препараты не зарегистрировано.`;
			}
			return `⚠️ Аллергоанамнез: ${allergyMatches.map((m) => m.summary).join("; ")}.`;
		}

		case "imaging_search": {
			const imgList = matches
				.map(
					(m) =>
						`${new Date(m.visitDate).toLocaleDateString("ru-RU")} — ${m.summary}`,
				)
				.join("; ");
			return `Найдено рентген-снимков (${matches.length}): ${imgList}.`;
		}

		case "materials_used": {
			const matList = matches
				.filter((m) => m.materials && m.materials.length > 0)
				.map(
					(m) =>
						`${new Date(m.visitDate).toLocaleDateString("ru-RU")}${m.toothNumber ? ` (зуб ${m.toothNumber})` : ""}: ${m.materials?.join(", ")}`,
				)
				.join("; ");
			return matList.length > 0
				? `Использованные материалы: ${matList}.`
				: `Информация по материалам: ${top.summary}.`;
		}

		default: {
			return `Найдено ${matches.length} релевантных записей. Наиболее значимая: ${top.summary} (от ${dateRu}).`;
		}
	}
}

/**
 * Searches across the patient's 5-year semantic EHR memory, ranking records by
 * dense vector cosine similarity, BM25 keyword matching, FDI tooth exact alignment,
 * and temporal recency.
 */
export async function searchPatientHistoryMemory(
	options: SearchPatientHistoryOptions,
): Promise<PatientHistorySearchResult> {
	const { parsedQuery, chunks, topMatches } =
		await retrieveAndRankHistoryMatches(options);

	// Synthesize concise Russian clinical answer
	const synthesizedAnswerRu = synthesizeClinicalAnswerRu(
		parsedQuery,
		topMatches,
		chunks.length,
	);

	return {
		patientId: options.patientId,
		query: options.query,
		parsedQuery,
		totalRecordsScanned: chunks.length,
		matchesCount: topMatches.length,
		matches: topMatches,
		synthesizedAnswerRu,
	};
}

/**
 * Builds a structured Markdown context block for feeding into Copilot / LLM prompts,
 * with optional 152-FZ PII anonymization.
 */
export function buildClinicalRagPromptContext(
	result: PatientHistorySearchResult,
	options: ClinicalRagPromptOptions = {},
): string {
	const lines: string[] = [];

	lines.push("### КЛИНИЧЕСКАЯ ПАМЯТЬ ПАЦИЕНТА (ЭМК 043/у — 5 ЛЕТ):");
	lines.push(`- Запрос врача: "${result.query}"`);
	lines.push(`- Клинический вывод: ${result.synthesizedAnswerRu}`);
	lines.push("");

	if (result.matches.length > 0) {
		lines.push("#### РЕЛЕВАНТНЫЕ ЗАПИСИ ИЗ ИСТОРИИ БОЛЕЗНИ:");
		for (const m of result.matches) {
			let summaryText = m.summary;
			if (options.sanitizePii) {
				summaryText = sanitizePatientHistoryPii(summaryText);
			}

			const toothStr = m.toothNumber ? ` [Зуб FDI ${m.toothNumber}]` : "";
			const dateStr = new Date(m.visitDate).toLocaleDateString("ru-RU");
			lines.push(`- ${dateStr}${toothStr}: ${summaryText} (релевантность: ${m.relevance})`);
		}
	}

	return lines.join("\n");
}

// ─── AGENT TOOL: clinical.search_patient_history ─────────────────────────────

const searchPatientHistorySchema = z.object({
	patientId: z
		.string()
		.uuid("Некорректный UUID пациента")
		.describe("Уникальный идентификатор пациента"),
	query: z
		.string()
		.min(1, "Поисковый запрос не может быть пустым")
		.describe(
			"Семантический запрос по истории болезни пациента (например, 'Когда лечили 36 зуб?', 'Были ли осложнения после анестезии?', 'Какие пломбировочные материалы использовались?')",
		),
	toothNumber: z
		.number()
		.int()
		.min(11)
		.max(85)
		.optional()
		.describe(
			"Опциональный фильтр по номеру зуба FDI (11–48 для постоянного или 51–85 для молочного прикуса)",
		),
	maxAgeYears: z
		.number()
		.min(1)
		.max(20)
		.optional()
		.default(5)
		.describe("Глубина поиска в годах (по умолчанию: 5 лет)"),
	limit: z
		.number()
		.int()
		.min(1)
		.max(50)
		.optional()
		.default(10)
		.describe("Максимальное количество возвращаемых записей"),
});

export const searchPatientHistoryTool: ToolDefinition<
	typeof searchPatientHistorySchema
> = {
	name: "search_patient_history",
	description:
		"Семантическая память и поиск по 5-летней истории болезни пациента (ЭМК 043/у): поиск визитов, дневников, диагнозов МКБ-10, аллергоанамнеза, осложнений анестезии, рентген-снимков, материалов и врачей с точными датами.",
	parameters: searchPatientHistorySchema,
	permissions: ["clinical.read"],
	category: "read",
	handler: async (ctx: AgentContext, args) => {
		const targetDb = ctx.db ?? defaultDb;

		// Validate patient belongs to tenant
		const [patient] = await targetDb
			.select({ id: patients.id, fullName: patients.fullName })
			.from(patients)
			.where(
				and(
					eq(patients.organizationId, ctx.organizationId),
					eq(patients.id, args.patientId),
				),
			)
			.limit(1);

		if (!patient) {
			throw new Error(`Пациент с ID ${args.patientId} не найден в клинике`);
		}

		// Perform hybrid semantic search
		const searchResult = await searchPatientHistoryMemory({
			db: targetDb,
			organizationId: ctx.organizationId,
			patientId: args.patientId,
			query: args.query,
			...(args.limit !== undefined ? { topK: args.limit } : {}),
			...(args.maxAgeYears !== undefined
				? { maxAgeYears: args.maxAgeYears }
				: {}),
			...(args.toothNumber !== undefined
				? { toothFilter: args.toothNumber }
				: {}),
		});

		return {
			patientId: args.patientId,
			patientFullName: patient.fullName,
			query: args.query,
			intent: searchResult.parsedQuery.intent,
			extractedTeeth: searchResult.parsedQuery.extractedTeeth,
			totalRecordsScanned: searchResult.totalRecordsScanned,
			matchesCount: searchResult.matchesCount,
			synthesizedAnswerRu: searchResult.synthesizedAnswerRu,
			matches: searchResult.matches.map((m) => ({
				visitDate: m.visitDate,
				category: m.category,
				toothNumber: m.toothNumber ?? null,
				doctorFullName: m.doctorFullName ?? null,
				diagnosis: m.diagnosis ?? null,
				materials: m.materials ?? [],
				anesthesia: m.anesthesia ?? null,
				complications: m.complications ?? null,
				summary: m.summary,
				score: m.score,
				relevance: m.relevance,
			})),
		};
	},
};
