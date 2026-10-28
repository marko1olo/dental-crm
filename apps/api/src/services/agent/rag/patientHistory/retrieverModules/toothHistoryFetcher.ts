import { and, desc, eq, gte } from "drizzle-orm";
import { toothStateHistory, toothStates } from "../../../../../db/schema.js";
import {
	computeDenseEmbeddingVector,
	extractNormalizedKeywords,
} from "../embeddingPipeline.js";
import type { PatientHistoryMemoryChunk } from "../types.js";
import type { HistoryFetcherContext } from "./retrieverTypes.js";

export async function fetchToothHistoryMemoryChunks(ctx: HistoryFetcherContext): Promise<PatientHistoryMemoryChunk[]> {
	const { db, organizationId, patientId, cutoffDate, doctorNameById, options } = ctx;
	if (options.includeOdontogram === false) return [];

	const chunks: PatientHistoryMemoryChunk[] = [];
	let stateLogs: any[] = [];
	try {
		stateLogs = (await db.select().from(toothStateHistory).where(
			and(eq(toothStateHistory.organizationId, organizationId), eq(toothStateHistory.patientId, patientId), gte(toothStateHistory.changedAt, cutoffDate)),
		).orderBy(desc(toothStateHistory.changedAt))) || [];
	} catch { stateLogs = []; }

	for (const log of stateLogs) {
		if (!log || !log.id) continue;
		const rawDate = log.changedAt ? new Date(log.changedAt) : new Date();
		const dateStr = rawDate.toISOString();
		const dateRu = rawDate.toLocaleDateString("ru-RU");
		const doctorName = log.changedByUserId ? (doctorNameById.get(log.changedByUserId) ?? "Врач-стоматолог") : "Лечащий врач";
		const logSummary = `Зуб FDI ${log.toothNumber}: изменение статуса от ${dateRu} (${doctorName}) — с '${log.previousState || "норма"}' на '${log.newState}'${log.reason ? `. Причина: ${log.reason}` : ""}`;

		chunks.push({
			id: `chunk_tooth_hist_${log.id}`, patientId, organizationId, category: "odontogram_tooth_state",
			date: dateStr, toothNumber: log.toothNumber, doctorUserId: log.changedByUserId ?? undefined,
			doctorFullName: doctorName, visitId: log.visitId ?? undefined, summary: logSummary, rawContent: logSummary,
			keywords: extractNormalizedKeywords(`${logSummary} зуб ${log.toothNumber} ${log.newState} ${log.previousState || ""}`),
			vector: computeDenseEmbeddingVector(logSummary),
		});
	}

	let currentStates: any[] = [];
	try {
		currentStates = (await db.select().from(toothStates).where(
			and(eq(toothStates.organizationId, organizationId), eq(toothStates.patientId, patientId)),
		)) || [];
	} catch { currentStates = []; }

	for (const ts of currentStates) {
		if (!ts || !ts.id) continue;
		if (ts.state === "healthy" && !ts.notes) continue;
		const rawDate = ts.updatedAt ? new Date(ts.updatedAt) : ts.createdAt ? new Date(ts.createdAt) : new Date();
		const dateStr = rawDate.toISOString();
		const stateSummary = `Текущий статус одонтограммы (зуб FDI ${ts.toothNumber}): ${ts.state}${ts.notes ? `. Заметки: ${ts.notes}` : ""}`;

		chunks.push({
			id: `chunk_tooth_state_${ts.id}`, patientId, organizationId, category: "odontogram_tooth_state",
			date: dateStr, toothNumber: ts.toothNumber, summary: stateSummary, rawContent: stateSummary,
			keywords: extractNormalizedKeywords(`${stateSummary} зуб ${ts.toothNumber} ${ts.state}`),
			vector: computeDenseEmbeddingVector(stateSummary),
		});
	}

	return chunks;
}
