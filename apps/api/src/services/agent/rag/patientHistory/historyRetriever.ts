/**
 * historyRetriever.ts — Layer 2 Patient EHR Chronology Retriever & Vector Indexer.
 * 
 * Fetches and transforms 5-year chronological medical data (043/u diary entries,
 * ICD-10 diagnoses, drug allergies, X-rays/CT scans, odontogram state changes,
 * and treatment items) into dense semantic vector chunks, and executes hybrid
 * semantic search ranking.
 */

import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { db as defaultDb } from "../../../../db/client.js";
import {
	appointments,
	imagingStudies,
	patientDrugAllergies,
	toothStateHistory,
	toothStates,
	treatmentItems,
	users,
	visitDiaries,
	visits,
} from "../../../../db/schema.js";
import {
	extractAnesthesia,
	extractMaterials,
} from "../../tools/voiceDictationParser.js";
import { cosineSimilarity } from "../embeddingService.js";
import {
	computeDenseEmbeddingVector,
	extractFdiTeethFromText,
	extractNormalizedKeywords,
	parseClinicalHistoryQuery,
} from "./embeddingPipeline.js";
import type {
	BuildPatientIndexOptions,
	MemoryMatchResult,
	ParsedClinicalQuery,
	PatientHistoryMemoryChunk,
	SearchPatientHistoryOptions,
} from "./types.js";

/**
 * Extracts Unix millisecond timestamp from standard UUIDv7 string (first 48 bits).
 */
export function extractTimestampFromUuidV7(id?: string | null): Date | null {
	if (!id) return null;
	try {
		const hex = id.replace(/-/g, "").slice(0, 12);
		if (hex.length === 12) {
			const ms = Number.parseInt(hex, 16);
			if (!Number.isNaN(ms) && ms > 1500000000000 && ms < 2500000000000) {
				return new Date(ms);
			}
		}
	} catch (uuidErr: unknown) {
		console.warn("[patientHistoryMemory] Failed to extract timestamp from UUIDv7:", uuidErr);
	}
	return null;
}

/**
 * Builds high-density semantic memory chunks from all clinical databases for a patient,
 * bounded by a 5-year chronological window (or specified horizon).
 */
export async function buildPatientHistoryMemoryIndex(
	// biome-ignore lint/suspicious/noExplicitAny: Drizzle client instance
	targetDb: any,
	organizationId: string,
	patientId: string,
	options: BuildPatientIndexOptions = {},
): Promise<PatientHistoryMemoryChunk[]> {
	const dbClient = targetDb ?? defaultDb;
	const maxAgeYears = options.maxAgeYears ?? 5;
	const cutoffDate = new Date();
	cutoffDate.setFullYear(cutoffDate.getFullYear() - maxAgeYears);

	const chunks: PatientHistoryMemoryChunk[] = [];

	// 1. Fetch Doctor Directory for FIO resolution
	let staffUsers: { id: string; fullName: string; role: string }[] = [];
	try {
		staffUsers =
			(await dbClient
				.select({
					id: users.id,
					fullName: users.fullName,
					role: users.role,
				})
				.from(users)
				.where(eq(users.organizationId, organizationId))) || [];
	} catch {
		staffUsers = [];
	}

	const doctorNameById = new Map<string, string>();
	for (const u of staffUsers) {
		if (u?.id && u?.fullName) {
			doctorNameById.set(u.id, u.fullName);
		}
	}

	// 2. Fetch Outpatient Visits (043/у) and Structured Diaries
	let patientVisits: any[] = [];
	try {
		patientVisits =
			(await dbClient
				.select({
					id: visits.id,
					status: visits.status,
					complaint: visits.complaint,
					anamnesis: visits.anamnesis,
					objectiveStatus: visits.objectiveStatus,
					diagnosis: visits.diagnosis,
					treatmentPlan: visits.treatmentPlan,
					doctorSummary: visits.doctorSummary,
					appointmentId: visits.appointmentId,
					signedAt: visits.signedAt,
					createdAt: visits.createdAt,
				})
				.from(visits)
				.where(
					and(
						eq(visits.organizationId, organizationId),
						eq(visits.patientId, patientId),
						gte(visits.createdAt, cutoffDate),
					),
				)
				.orderBy(desc(visits.createdAt))) || [];
	} catch {
		patientVisits = [];
	}

	// Fetch Appointments for doctor mapping
	const appointmentIds: string[] = patientVisits
		.map((v: { appointmentId?: string | null }) => v?.appointmentId)
		.filter((id): id is string => typeof id === "string" && id.length > 0);

	const apptDoctorMap = new Map<string, string>();
	if (appointmentIds.length > 0) {
		try {
			const appts =
				(await dbClient
					.select({
						id: appointments.id,
						doctorUserId: appointments.doctorUserId,
					})
					.from(appointments)
					.where(
						and(
							eq(appointments.organizationId, organizationId),
							inArray(appointments.id, appointmentIds),
						),
					)) || [];
			for (const a of appts) {
				if (a?.id && a?.doctorUserId) {
					apptDoctorMap.set(a.id, a.doctorUserId);
				}
			}
		} catch {
			// No appointments found or mock fallback
		}
	}

	// Fetch Structured Diaries (visitDiaries)
	const visitIds: string[] = patientVisits
		.map((v: { id?: string }) => v?.id)
		.filter((id): id is string => typeof id === "string" && id.length > 0);
	let diaries: any[] = [];
	if (visitIds.length > 0) {
		try {
			diaries =
				(await dbClient
					.select()
					.from(visitDiaries)
					.where(
						and(
							eq(visitDiaries.organizationId, organizationId),
							inArray(visitDiaries.visitId, visitIds),
						),
					)) || [];
		} catch {
			diaries = [];
		}
	}

	const diaryByVisitId = new Map<string, typeof visitDiaries.$inferSelect>();
	for (const d of diaries) {
		if (d?.visitId) {
			diaryByVisitId.set(d.visitId, d);
		}
	}

	const visitDateById = new Map<string, Date>();
	for (const v of patientVisits) {
		if (v?.id) {
			const d = v.signedAt
				? new Date(v.signedAt)
				: v.createdAt
					? new Date(v.createdAt)
					: extractTimestampFromUuidV7(v.id) || new Date();
			visitDateById.set(v.id, d);
		}
	}

	// Transform visits into memory chunks
	for (const v of patientVisits) {
		if (!v || !v.id) continue;
		const d = diaryByVisitId.get(v.id);
		const doctorId =
			d?.doctorId ??
			(v.appointmentId ? apptDoctorMap.get(v.appointmentId) : undefined);
		const doctorName = doctorId
			? (doctorNameById.get(doctorId) ?? "Врач-стоматолог")
			: "Лечащий врач";

		const rawDate = v.signedAt
			? new Date(v.signedAt)
			: v.createdAt
				? new Date(v.createdAt)
				: new Date();
		const isoDate = rawDate.toISOString();
		const dateRu = rawDate.toLocaleDateString("ru-RU");

		// Extract clinical details
		const combinedText = [
			v.complaint ? `Жалобы: ${v.complaint}` : "",
			v.anamnesis ? `Анамнез: ${v.anamnesis}` : "",
			v.objectiveStatus ? `Объективный статус: ${v.objectiveStatus}` : "",
			v.diagnosis ? `Диагноз: ${v.diagnosis}` : "",
			v.treatmentPlan ? `План: ${v.treatmentPlan}` : "",
			v.doctorSummary ? `Резюме: ${v.doctorSummary}` : "",
			d?.statusLocalis ? `Status Localis: ${d.statusLocalis}` : "",
			d?.treatmentDescription ? `Лечение: ${d.treatmentDescription}` : "",
			d?.diagnosisIcd10 ? `МКБ-10: ${d.diagnosisIcd10}` : "",
			d?.diagnosisTooth ? `Зуб: ${d.diagnosisTooth}` : "",
			d?.complications ? `Осложнения: ${d.complications}` : "",
			d?.comorbidities ? `Сопутствующие: ${d.comorbidities}` : "",
			d?.content ? `Дневник: ${d.content}` : "",
		]
			.filter(Boolean)
			.join("\n");

		const teeth = extractFdiTeethFromText(combinedText);
		const primaryTooth =
			d?.diagnosisTooth && !Number.isNaN(Number(d.diagnosisTooth))
				? Number(d.diagnosisTooth)
				: teeth[0];

		const materials = extractMaterials(combinedText);
		const anesthesiaParsed = extractAnesthesia(combinedText);
		const anesthesiaText = anesthesiaParsed?.rawText
			? `${anesthesiaParsed.rawText} (${anesthesiaParsed.drug ?? "анестетик"} ${anesthesiaParsed.volumeMl ? `${anesthesiaParsed.volumeMl} мл` : ""})`
			: undefined;

		const icd10Code = d?.diagnosisIcd10 || v.diagnosis || undefined;
		const complicationsText = d?.complications?.trim() || undefined;

		// Summary generation
		const summaryParts = [`Прием от ${dateRu} (Врач: ${doctorName})`];
		if (primaryTooth) summaryParts.push(`Зуб FDI ${primaryTooth}`);
		if (icd10Code) summaryParts.push(`Диагноз: ${icd10Code}`);
		if (materials.length > 0)
			summaryParts.push(`Материалы: ${materials.join(", ")}`);
		if (anesthesiaText) summaryParts.push(`Анестезия: ${anesthesiaText}`);
		if (complicationsText) summaryParts.push(`Осложнения: ${complicationsText}`);
		if (v.doctorSummary) summaryParts.push(`Итог: ${v.doctorSummary}`);

		const summary = summaryParts.join("; ");
		const keywords = extractNormalizedKeywords(
			`${combinedText} ${summary} ${doctorName}`,
		);
		const vector = computeDenseEmbeddingVector(
			`${summary} ${combinedText} ${doctorName}`,
		);

		chunks.push({
			id: `chunk_visit_${v.id}`,
			patientId,
			organizationId,
			category: "visit_diary_043u",
			date: isoDate,
			toothNumber: primaryTooth,
			toothCodes: teeth.map(String),
			doctorUserId: doctorId,
			doctorFullName: doctorName,
			visitId: v.id,
			diagnosisCode: icd10Code,
			materials,
			anesthesia: anesthesiaText,
			complications: complicationsText,
			summary,
			rawContent: combinedText,
			keywords,
			vector,
			metadata: {
				status: v.status,
				isSigned: v.signedAt !== null,
			},
		});

		// If explicit complications were present, also index as a distinct complication_event
		if (
			complicationsText ||
			combinedText.toLowerCase().includes("осложнен") ||
			combinedText.toLowerCase().includes("обморок") ||
			combinedText.toLowerCase().includes("парестези")
		) {
			const compSummary = `Осложнение на приеме ${dateRu} (${doctorName}): ${complicationsText || v.doctorSummary || "Особые реакции при лечении"}`;
			chunks.push({
				id: `chunk_comp_${v.id}`,
				patientId,
				organizationId,
				category: "complication_event",
				date: isoDate,
				toothNumber: primaryTooth,
				doctorFullName: doctorName,
				visitId: v.id,
				anesthesia: anesthesiaText,
				complications: complicationsText ?? "Реакция на вмешательство",
				summary: compSummary,
				rawContent: combinedText,
				keywords: extractNormalizedKeywords(
					`${compSummary} ${complicationsText} анестезия осложнение`,
				),
				vector: computeDenseEmbeddingVector(
					`${compSummary} ${complicationsText} анестезия`,
				),
			});
		}
	}

	// 3. Fetch Drug Allergy Anamnesis (Allergies are permanent / 5-year active)
	if (options.includeAllergies !== false) {
		let allergies: any[] = [];
		try {
			allergies =
				(await dbClient
					.select()
					.from(patientDrugAllergies)
					.where(
						and(
							eq(patientDrugAllergies.organizationId, organizationId),
							eq(patientDrugAllergies.patientId, patientId),
						),
					)) || [];
		} catch {
			allergies = [];
		}

		for (const a of allergies) {
			if (!a || !a.id) continue;
			const dateStr = (
				a.diagnosedDate
					? new Date(a.diagnosedDate)
					: a.createdAt
						? new Date(a.createdAt)
						: new Date()
			).toISOString();
			const allergySummary = `Аллергия / Непереносимость: ${a.allergenGroup} (МНН: ${a.drugInnLatin || "—"}), тяжесть: ${a.reactionSeverity}, проявления: ${a.clinicalManifestations}${a.hasSamterTriad ? " [Триада Самтера / Аспириновая астма]" : ""}${a.notes ? `. Прим: ${a.notes}` : ""}`;

			const allergyKeywords = extractNormalizedKeywords(
				`${allergySummary} аллергия анафилаксия непереносимость ${a.allergenGroup} ${a.drugInnLatin || ""}`,
			);

			chunks.push({
				id: `chunk_allergy_${a.id}`,
				patientId,
				organizationId,
				category: "allergy_anamnesis",
				date: dateStr,
				summary: allergySummary,
				rawContent: allergySummary,
				keywords: allergyKeywords,
				vector: computeDenseEmbeddingVector(allergySummary),
				metadata: {
					severity: a.reactionSeverity,
					hasSamterTriad: a.hasSamterTriad,
					isConfirmed: a.isConfirmedByAllergist,
				},
			});
		}
	}

	// 4. Fetch Radiographs and Imaging Studies (X-ray / CT / Panoramic)
	if (options.includeImaging !== false) {
		let studies: any[] = [];
		try {
			studies =
				(await dbClient
					.select()
					.from(imagingStudies)
					.where(
						and(
							eq(imagingStudies.organizationId, organizationId),
							eq(imagingStudies.patientId, patientId),
							gte(imagingStudies.capturedAt, cutoffDate),
						),
					)
					.orderBy(desc(imagingStudies.capturedAt))) || [];
		} catch {
			studies = [];
		}

		for (const s of studies) {
			if (!s || !s.id) continue;
			const rawDate = s.capturedAt ? new Date(s.capturedAt) : new Date();
			const dateStr = rawDate.toISOString();
			const dateRu = rawDate.toLocaleDateString("ru-RU");
			const toothNum =
				s.toothCode && !Number.isNaN(Number(s.toothCode))
					? Number(s.toothCode)
					: undefined;

			const studySummary = `Рентген-исследование (${(s.kind || "XRAY").toUpperCase()}) от ${dateRu}: ${s.title || "Снимок"}, область: ${s.region || "зубной ряд"}${toothNum ? `, зуб FDI ${toothNum}` : ""}${s.aiSummary ? `. AI-анализ: ${s.aiSummary}` : ""}`;

			chunks.push({
				id: `chunk_img_${s.id}`,
				patientId,
				organizationId,
				category: "imaging_xray",
				date: dateStr,
				toothNumber: toothNum,
				toothCodes: s.toothCode ? [s.toothCode] : undefined,
				visitId: s.visitId ?? undefined,
				summary: studySummary,
				rawContent: `${studySummary} ${s.sourceName || ""}`,
				keywords: extractNormalizedKeywords(
					`${studySummary} снимок рентген клкт оптг кт`,
				),
				vector: computeDenseEmbeddingVector(studySummary),
				metadata: {
					kind: s.kind,
					status: s.status,
				},
			});
		}
	}

	// 5. Fetch Odontogram & Tooth State Histories
	if (options.includeOdontogram !== false) {
		let stateLogs: any[] = [];
		try {
			stateLogs =
				(await dbClient
					.select()
					.from(toothStateHistory)
					.where(
						and(
							eq(toothStateHistory.organizationId, organizationId),
							eq(toothStateHistory.patientId, patientId),
							gte(toothStateHistory.changedAt, cutoffDate),
						),
					)
					.orderBy(desc(toothStateHistory.changedAt))) || [];
		} catch {
			stateLogs = [];
		}

		for (const log of stateLogs) {
			if (!log || !log.id) continue;
			const rawDate = log.changedAt ? new Date(log.changedAt) : new Date();
			const dateStr = rawDate.toISOString();
			const dateRu = rawDate.toLocaleDateString("ru-RU");
			const doctorName = log.changedByUserId
				? (doctorNameById.get(log.changedByUserId) ?? "Врач-стоматолог")
				: "Лечащий врач";

			const logSummary = `Зуб FDI ${log.toothNumber}: изменение статуса от ${dateRu} (${doctorName}) — с '${log.previousState || "норма"}' на '${log.newState}'${log.reason ? `. Причина: ${log.reason}` : ""}`;

			chunks.push({
				id: `chunk_tooth_hist_${log.id}`,
				patientId,
				organizationId,
				category: "odontogram_tooth_state",
				date: dateStr,
				toothNumber: log.toothNumber,
				doctorUserId: log.changedByUserId ?? undefined,
				doctorFullName: doctorName,
				visitId: log.visitId ?? undefined,
				summary: logSummary,
				rawContent: logSummary,
				keywords: extractNormalizedKeywords(
					`${logSummary} зуб ${log.toothNumber} ${log.newState} ${log.previousState || ""}`,
				),
				vector: computeDenseEmbeddingVector(logSummary),
			});
		}

		// Current Tooth States
		let currentStates: any[] = [];
		try {
			currentStates =
				(await dbClient
					.select()
					.from(toothStates)
					.where(
						and(
							eq(toothStates.organizationId, organizationId),
							eq(toothStates.patientId, patientId),
						),
					)) || [];
		} catch {
			currentStates = [];
		}

		for (const ts of currentStates) {
			if (!ts || !ts.id) continue;
			if (ts.state === "healthy" && !ts.notes) continue;
			const rawDate = ts.updatedAt
				? new Date(ts.updatedAt)
				: ts.createdAt
					? new Date(ts.createdAt)
					: new Date();
			const dateStr = rawDate.toISOString();
			const dateRu = rawDate.toLocaleDateString("ru-RU");
			const stateSummary = `Текущий статус одонтограммы (зуб FDI ${ts.toothNumber}): ${ts.state}${ts.notes ? `. Заметки: ${ts.notes}` : ""}`;

			chunks.push({
				id: `chunk_tooth_state_${ts.id}`,
				patientId,
				organizationId,
				category: "odontogram_tooth_state",
				date: dateStr,
				toothNumber: ts.toothNumber,
				summary: stateSummary,
				rawContent: stateSummary,
				keywords: extractNormalizedKeywords(
					`${stateSummary} зуб ${ts.toothNumber} ${ts.state}`,
				),
				vector: computeDenseEmbeddingVector(stateSummary),
			});
		}
	}

	// 6. Fetch Treatment Items (Specific Restorative & Surgical Procedures)
	if (options.includeTreatmentItems !== false) {
		let items: any[] = [];
		try {
			items =
				(await dbClient
					.select()
					.from(treatmentItems)
					.where(
						and(
							eq(treatmentItems.organizationId, organizationId),
							eq(treatmentItems.patientId, patientId),
						),
					)
					.orderBy(desc(treatmentItems.id))
					.limit(100)) || [];
		} catch {
			items = [];
		}

		for (const item of items) {
			if (!item || !item.id) continue;
			const rawDate =
				(item.visitId ? visitDateById.get(item.visitId) : null) ||
				extractTimestampFromUuidV7(item.id) ||
				new Date();
			const dateStr = rawDate.toISOString();
			const dateRu = rawDate.toLocaleDateString("ru-RU");
			const toothNum =
				item.toothCode && !Number.isNaN(Number(item.toothCode))
					? Number(item.toothCode)
					: undefined;
			const doctorName = item.plannedDoctorUserId
				? (doctorNameById.get(item.plannedDoctorUserId) ?? "Врач-стоматолог")
				: undefined;

			const itemSummary = `Выполненная процедура от ${dateRu}${toothNum ? ` (зуб FDI ${toothNum})` : ""}: ${item.title} — ${item.priceRub} ₽${doctorName ? ` (врач: ${doctorName})` : ""}${item.notes ? `. Заметка: ${item.notes}` : ""}`;

			chunks.push({
				id: `chunk_item_${item.id}`,
				patientId,
				organizationId,
				category: "treatment_item",
				date: dateStr,
				toothNumber: toothNum,
				toothCodes: item.toothCode ? [item.toothCode] : undefined,
				doctorUserId: item.plannedDoctorUserId ?? undefined,
				doctorFullName: doctorName,
				visitId: item.visitId ?? undefined,
				summary: itemSummary,
				rawContent: itemSummary,
				keywords: extractNormalizedKeywords(
					`${itemSummary} ${item.title} ${toothNum || ""}`,
				),
				vector: computeDenseEmbeddingVector(itemSummary),
			});
		}
	}

	return chunks;
}

export interface RankedHistorySearchPayload {
	readonly parsedQuery: ParsedClinicalQuery;
	readonly chunks: PatientHistoryMemoryChunk[];
	readonly topMatches: MemoryMatchResult[];
}

/**
 * Executes hybrid dense vector and BM25 ranking across the patient's 5-year semantic memory.
 */
export async function retrieveAndRankHistoryMatches(
	options: SearchPatientHistoryOptions,
): Promise<RankedHistorySearchPayload> {
	const topK = options.topK ?? 10;
	const parsedQuery = parseClinicalHistoryQuery(options.query);
	const queryVector = computeDenseEmbeddingVector(options.query);

	// Load memory chunks (from DB or preloaded cache)
	let chunks: PatientHistoryMemoryChunk[] = options.preloadedChunks ?? [];
	if (chunks.length === 0) {
		chunks = await buildPatientHistoryMemoryIndex(
			options.db ?? defaultDb,
			options.organizationId,
			options.patientId,
			{ maxAgeYears: options.maxAgeYears ?? 5 },
		);
	}

	const scoredMatches: MemoryMatchResult[] = [];

	for (const chunk of chunks) {
		// Category filter check
		if (
			options.categoryFilter &&
			options.categoryFilter.length > 0 &&
			!options.categoryFilter.includes(chunk.category)
		) {
			continue;
		}

		// Tooth filter check (if explicitly requested by caller)
		if (options.toothFilter !== undefined) {
			const matchesTooth =
				chunk.toothNumber === options.toothFilter ||
				(chunk.toothCodes &&
					chunk.toothCodes.includes(String(options.toothFilter)));
			if (!matchesTooth) continue;
		}

		// 1. Vector Cosine Similarity (Weight: 40%)
		const cosine = cosineSimilarity(queryVector, chunk.vector);

		// 2. Keyword & BM25 Match (Weight: 30%)
		let keywordOverlap = 0;
		const highlights: string[] = [];
		const chunkKeywordsSet = new Set(chunk.keywords);

		for (const qk of parsedQuery.extractedKeywords) {
			if (chunkKeywordsSet.has(qk)) {
				keywordOverlap += 1;
				highlights.push(qk);
			} else {
				// Partial substring match for medical roots
				for (const ck of chunkKeywordsSet) {
					if (ck.startsWith(qk) || qk.startsWith(ck)) {
						keywordOverlap += 0.7;
						highlights.push(ck);
						break;
					}
				}
			}
		}

		const keywordScore =
			parsedQuery.extractedKeywords.length > 0
				? Math.min(1, keywordOverlap / parsedQuery.extractedKeywords.length)
				: 0.5;

		// 3. FDI Tooth Exact Match Boost (Weight: 20%)
		let toothBoost = 0;
		if (parsedQuery.extractedTeeth.length > 0) {
			for (const queryTooth of parsedQuery.extractedTeeth) {
				if (
					chunk.toothNumber === queryTooth ||
					(chunk.toothCodes && chunk.toothCodes.includes(String(queryTooth)))
				) {
					toothBoost = 1.0;
					highlights.push(`Зуб FDI ${queryTooth}`);
					break;
				}
			}
		} else {
			// Neutral if no tooth was mentioned in query
			toothBoost = 0.5;
		}

		// 4. Intent & Category Alignment (Weight: 10%)
		let categoryBoost = 0.5;
		if (
			parsedQuery.targetCategory &&
			chunk.category === parsedQuery.targetCategory
		) {
			categoryBoost = 1.0;
		}

		// 5. Target Year Alignment
		if (parsedQuery.targetYear !== undefined) {
			const chunkYear = new Date(chunk.date).getFullYear();
			if (!Number.isNaN(chunkYear) && chunkYear === parsedQuery.targetYear) {
				categoryBoost += 0.3;
			}
		}

		// Combined Hybrid Score (0.0 to 1.0)
		const compositeScore = Math.min(
			1,
			cosine * 0.4 +
				keywordScore * 0.3 +
				toothBoost * 0.2 +
				categoryBoost * 0.1,
		);

		// Relevance tier
		let relevance: "high" | "medium" | "low" = "low";
		if (
			compositeScore >= 0.55 ||
			(toothBoost === 1.0 && compositeScore >= 0.45)
		) {
			relevance = "high";
		} else if (compositeScore >= 0.35) {
			relevance = "medium";
		}

		if (compositeScore >= 0.25) {
			scoredMatches.push({
				chunkId: chunk.id,
				category: chunk.category,
				score: Number(compositeScore.toFixed(3)),
				relevance,
				visitDate: chunk.date,
				toothNumber: chunk.toothNumber,
				doctorFullName: chunk.doctorFullName,
				diagnosis: chunk.diagnosisCode
					? {
							code: chunk.diagnosisCode,
							title: chunk.diagnosisTitle,
						}
					: undefined,
				materials: chunk.materials,
				anesthesia: chunk.anesthesia,
				complications: chunk.complications,
				summary: chunk.summary,
				highlights: Array.from(new Set(highlights)),
			});
		}
	}

	// Sort descending by score, then by date recency
	scoredMatches.sort((a, b) => {
		if (Math.abs(b.score - a.score) > 0.05) {
			return b.score - a.score;
		}
		return new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime();
	});

	const topMatches = scoredMatches.slice(0, topK);

	return {
		parsedQuery,
		chunks,
		topMatches,
	};
}
