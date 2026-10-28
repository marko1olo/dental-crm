import { and, desc, eq, gte } from "drizzle-orm";
import { db as defaultDb } from "../../../../../db/client.js";
import { imagingStudies, patientDrugAllergies, users } from "../../../../../db/schema.js";
import { computeDenseEmbeddingVector, extractNormalizedKeywords } from "../embeddingPipeline.js";
import type { BuildPatientIndexOptions, PatientHistoryMemoryChunk } from "../types.js";
import { fetchDiaryMemoryChunks } from "./diaryHistoryFetcher.js";
import { fetchFinancialHistoryMemoryChunks } from "./financialHistoryFetcher.js";
import type { HistoryFetcherContext } from "./retrieverTypes.js";
import { fetchToothHistoryMemoryChunks } from "./toothHistoryFetcher.js";

export function extractTimestampFromUuidV7(id?: string | null): Date | null {
	if (!id) return null;
	try {
		const hex = id.replace(/-/g, "").slice(0, 12);
		if (hex.length === 12) {
			const ms = Number.parseInt(hex, 16);
			if (!Number.isNaN(ms) && ms > 1500000000000 && ms < 2500000000000) return new Date(ms);
		}
	} catch { /* noop */ }
	return null;
}

export async function buildPatientHistoryMemoryIndex(
	// biome-ignore lint/suspicious/noExplicitAny: Drizzle client
	targetDb: any, organizationId: string, patientId: string, options: BuildPatientIndexOptions = {},
): Promise<PatientHistoryMemoryChunk[]> {
	const dbClient = targetDb ?? defaultDb;
	const maxAgeYears = options.maxAgeYears ?? 5;
	const cutoffDate = new Date();
	cutoffDate.setFullYear(cutoffDate.getFullYear() - maxAgeYears);

	let staffUsers: any[] = [];
	try {
		staffUsers = (await dbClient.select({ id: users.id, fullName: users.fullName, role: users.role }).from(users).where(eq(users.organizationId, organizationId))) || [];
	} catch { staffUsers = []; }
	const doctorNameById = new Map<string, string>();
	for (const u of staffUsers) if (u?.id && u?.fullName) doctorNameById.set(u.id, u.fullName);

	const visitDateById = new Map<string, Date>();
	const ctx: HistoryFetcherContext = { db: dbClient, organizationId, patientId, cutoffDate, doctorNameById, options, visitDateById };

	const diaryChunks = await fetchDiaryMemoryChunks(ctx);
	const toothChunks = await fetchToothHistoryMemoryChunks(ctx);
	const financialChunks = await fetchFinancialHistoryMemoryChunks(ctx);

	const allergyChunks: PatientHistoryMemoryChunk[] = [];
	if (options.includeAllergies !== false) {
		let allergies: any[] = [];
		try {
			allergies = (await dbClient.select().from(patientDrugAllergies).where(and(eq(patientDrugAllergies.organizationId, organizationId), eq(patientDrugAllergies.patientId, patientId)))) || [];
		} catch { allergies = []; }
		for (const a of allergies) {
			if (!a || !a.id) continue;
			const dateStr = (a.diagnosedDate ? new Date(a.diagnosedDate) : a.createdAt ? new Date(a.createdAt) : new Date()).toISOString();
			const allergySummary = `Аллергия / Непереносимость: ${a.allergenGroup} (МНН: ${a.drugInnLatin || "—"}), тяжесть: ${a.reactionSeverity}, проявления: ${a.clinicalManifestations}${a.hasSamterTriad ? " [Триада Самтера / Аспириновая астма]" : ""}${a.notes ? `. Прим: ${a.notes}` : ""}`;
			allergyChunks.push({
				id: `chunk_allergy_${a.id}`, patientId, organizationId, category: "allergy_anamnesis", date: dateStr,
				summary: allergySummary, rawContent: allergySummary, keywords: extractNormalizedKeywords(`${allergySummary} аллергия анафилаксия непереносимость ${a.allergenGroup} ${a.drugInnLatin || ""}`),
				vector: computeDenseEmbeddingVector(allergySummary), metadata: { severity: a.reactionSeverity, hasSamterTriad: a.hasSamterTriad, isConfirmed: a.isConfirmedByAllergist },
			});
		}
	}

	const imagingChunks: PatientHistoryMemoryChunk[] = [];
	if (options.includeImaging !== false) {
		let studies: any[] = [];
		try {
			studies = (await dbClient.select().from(imagingStudies).where(and(eq(imagingStudies.organizationId, organizationId), eq(imagingStudies.patientId, patientId), gte(imagingStudies.capturedAt, cutoffDate))).orderBy(desc(imagingStudies.capturedAt))) || [];
		} catch { studies = []; }
		for (const s of studies) {
			if (!s || !s.id) continue;
			const rawDate = s.capturedAt ? new Date(s.capturedAt) : new Date();
			const dateStr = rawDate.toISOString();
			const dateRu = rawDate.toLocaleDateString("ru-RU");
			const toothNum = s.toothCode && !Number.isNaN(Number(s.toothCode)) ? Number(s.toothCode) : undefined;
			const studySummary = `Рентген-исследование (${(s.kind || "XRAY").toUpperCase()}) от ${dateRu}: ${s.title || "Снимок"}, область: ${s.region || "зубной ряд"}${toothNum ? `, зуб FDI ${toothNum}` : ""}${s.aiSummary ? `. AI-анализ: ${s.aiSummary}` : ""}`;
			imagingChunks.push({
				id: `chunk_img_${s.id}`, patientId, organizationId, category: "imaging_xray", date: dateStr, toothNumber: toothNum,
				toothCodes: s.toothCode ? [s.toothCode] : undefined, visitId: s.visitId ?? undefined, summary: studySummary,
				rawContent: `${studySummary} ${s.sourceName || ""}`, keywords: extractNormalizedKeywords(`${studySummary} снимок рентген клкт оптг кт`),
				vector: computeDenseEmbeddingVector(studySummary), metadata: { kind: s.kind, status: s.status },
			});
		}
	}

	return [...diaryChunks, ...allergyChunks, ...imagingChunks, ...toothChunks, ...financialChunks];
}
