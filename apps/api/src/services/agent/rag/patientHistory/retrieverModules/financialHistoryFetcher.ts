import { and, desc, eq } from "drizzle-orm";
import { treatmentItems } from "../../../../../db/schema.js";
import {
	computeDenseEmbeddingVector,
	extractNormalizedKeywords,
} from "../embeddingPipeline.js";
import type { PatientHistoryMemoryChunk } from "../types.js";
import type { HistoryFetcherContext } from "./retrieverTypes.js";

function extractTimestampFromUuid(id?: string | null): Date | null {
	if (!id) return null;
	try {
		const hex = id.replace(/-/g, "").slice(0, 12);
		if (hex.length === 12) {
			const ms = Number.parseInt(hex, 16);
			if (!Number.isNaN(ms) && ms > 1500000000000 && ms < 2500000000000) {
				return new Date(ms);
			}
		}
	} catch { /* noop */ }
	return null;
}

export async function fetchFinancialHistoryMemoryChunks(ctx: HistoryFetcherContext): Promise<PatientHistoryMemoryChunk[]> {
	const { db, organizationId, patientId, doctorNameById, visitDateById, options } = ctx;
	if (options.includeTreatmentItems === false) return [];

	const chunks: PatientHistoryMemoryChunk[] = [];
	let items: any[] = [];
	try {
		items = (await db.select().from(treatmentItems).where(
			and(eq(treatmentItems.organizationId, organizationId), eq(treatmentItems.patientId, patientId)),
		).orderBy(desc(treatmentItems.id)).limit(100)) || [];
	} catch { items = []; }

	for (const item of items) {
		if (!item || !item.id) continue;
		const rawDate = (item.visitId ? visitDateById.get(item.visitId) : null) || extractTimestampFromUuid(item.id) || new Date();
		const dateStr = rawDate.toISOString();
		const dateRu = rawDate.toLocaleDateString("ru-RU");
		const toothNum = item.toothCode && !Number.isNaN(Number(item.toothCode)) ? Number(item.toothCode) : undefined;
		const doctorName = item.plannedDoctorUserId ? (doctorNameById.get(item.plannedDoctorUserId) ?? "Врач-стоматолог") : undefined;

		const itemSummary = `Выполненная процедура от ${dateRu}${toothNum ? ` (зуб FDI ${toothNum})` : ""}: ${item.title} — ${item.priceRub} ₽${doctorName ? ` (врач: ${doctorName})` : ""}${item.notes ? `. Заметка: ${item.notes}` : ""}`;

		chunks.push({
			id: `chunk_item_${item.id}`, patientId, organizationId, category: "treatment_item",
			date: dateStr, toothNumber: toothNum, toothCodes: item.toothCode ? [item.toothCode] : undefined,
			doctorUserId: item.plannedDoctorUserId ?? undefined, doctorFullName: doctorName,
			visitId: item.visitId ?? undefined, summary: itemSummary, rawContent: itemSummary,
			keywords: extractNormalizedKeywords(`${itemSummary} ${item.title} ${toothNum || ""}`),
			vector: computeDenseEmbeddingVector(itemSummary),
		});
	}

	return chunks;
}
