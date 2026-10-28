import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { appointments, visitDiaries, visits } from "../../../../../db/schema.js";
import { extractAnesthesia, extractMaterials } from "../../../tools/voiceDictationParser.js";
import {
	computeDenseEmbeddingVector,
	extractFdiTeethFromText,
	extractNormalizedKeywords,
} from "../embeddingPipeline.js";
import type { PatientHistoryMemoryChunk } from "../types.js";
import type { HistoryFetcherContext } from "./retrieverTypes.js";

export async function fetchDiaryMemoryChunks(ctx: HistoryFetcherContext): Promise<PatientHistoryMemoryChunk[]> {
	const { db, organizationId, patientId, cutoffDate, doctorNameById, visitDateById } = ctx;
	let patientVisits: any[] = [];
	try {
		patientVisits = (await db.select({
			id: visits.id, status: visits.status, complaint: visits.complaint, anamnesis: visits.anamnesis,
			objectiveStatus: visits.objectiveStatus, diagnosis: visits.diagnosis, treatmentPlan: visits.treatmentPlan,
			doctorSummary: visits.doctorSummary, appointmentId: visits.appointmentId, signedAt: visits.signedAt, createdAt: visits.createdAt,
		}).from(visits).where(and(eq(visits.organizationId, organizationId), eq(visits.patientId, patientId), gte(visits.createdAt, cutoffDate))).orderBy(desc(visits.createdAt))) || [];
	} catch { patientVisits = []; }

	const apptIds = patientVisits.map((v) => v?.appointmentId).filter((id): id is string => typeof id === "string" && id.length > 0);
	const apptDoctorMap = new Map<string, string>();
	if (apptIds.length > 0) {
		try {
			const appts = (await db.select({ id: appointments.id, doctorUserId: appointments.doctorUserId }).from(appointments).where(and(eq(appointments.organizationId, organizationId), inArray(appointments.id, apptIds)))) || [];
			for (const a of appts) if (a?.id && a?.doctorUserId) apptDoctorMap.set(a.id, a.doctorUserId);
		} catch { /* noop */ }
	}

	const visitIds = patientVisits.map((v) => v?.id).filter((id): id is string => typeof id === "string" && id.length > 0);
	let diaries: any[] = [];
	if (visitIds.length > 0) {
		try {
			diaries = (await db.select().from(visitDiaries).where(and(eq(visitDiaries.organizationId, organizationId), inArray(visitDiaries.visitId, visitIds)))) || [];
		} catch { diaries = []; }
	}
	const diaryByVisitId = new Map<string, typeof visitDiaries.$inferSelect>();
	for (const d of diaries) if (d?.visitId) diaryByVisitId.set(d.visitId, d);

	for (const v of patientVisits) {
		if (v?.id) {
			const d = v.signedAt ? new Date(v.signedAt) : v.createdAt ? new Date(v.createdAt) : new Date();
			visitDateById.set(v.id, d);
		}
	}

	const chunks: PatientHistoryMemoryChunk[] = [];
	for (const v of patientVisits) {
		if (!v || !v.id) continue;
		const d = diaryByVisitId.get(v.id);
		const doctorId = d?.doctorId ?? (v.appointmentId ? apptDoctorMap.get(v.appointmentId) : undefined);
		const doctorName = doctorId ? (doctorNameById.get(doctorId) ?? "Врач-стоматолог") : "Лечащий врач";
		const rawDate = v.signedAt ? new Date(v.signedAt) : v.createdAt ? new Date(v.createdAt) : new Date();
		const isoDate = rawDate.toISOString();
		const dateRu = rawDate.toLocaleDateString("ru-RU");

		const combinedText = [
			v.complaint ? `Жалобы: ${v.complaint}` : "", v.anamnesis ? `Анамнез: ${v.anamnesis}` : "",
			v.objectiveStatus ? `Объективный статус: ${v.objectiveStatus}` : "", v.diagnosis ? `Диагноз: ${v.diagnosis}` : "",
			v.treatmentPlan ? `План: ${v.treatmentPlan}` : "", v.doctorSummary ? `Резюме: ${v.doctorSummary}` : "",
			d?.statusLocalis ? `Status Localis: ${d.statusLocalis}` : "", d?.treatmentDescription ? `Лечение: ${d.treatmentDescription}` : "",
			d?.diagnosisIcd10 ? `МКБ-10: ${d.diagnosisIcd10}` : "", d?.diagnosisTooth ? `Зуб: ${d.diagnosisTooth}` : "",
			d?.complications ? `Осложнения: ${d.complications}` : "", d?.comorbidities ? `Сопутствующие: ${d.comorbidities}` : "",
			d?.content ? `Дневник: ${d.content}` : "",
		].filter(Boolean).join("\n");

		const teeth = extractFdiTeethFromText(combinedText);
		const primaryTooth = d?.diagnosisTooth && !Number.isNaN(Number(d.diagnosisTooth)) ? Number(d.diagnosisTooth) : teeth[0];
		const materials = extractMaterials(combinedText);
		const anesthesiaParsed = extractAnesthesia(combinedText);
		const anesthesiaText = anesthesiaParsed?.rawText ? `${anesthesiaParsed.rawText} (${anesthesiaParsed.drug ?? "анестетик"} ${anesthesiaParsed.volumeMl ? `${anesthesiaParsed.volumeMl} мл` : ""})` : undefined;
		const icd10Code = d?.diagnosisIcd10 || v.diagnosis || undefined;
		const complicationsText = d?.complications?.trim() || undefined;

		const summaryParts = [`Прием от ${dateRu} (Врач: ${doctorName})`];
		if (primaryTooth) summaryParts.push(`Зуб FDI ${primaryTooth}`);
		if (icd10Code) summaryParts.push(`Диагноз: ${icd10Code}`);
		if (materials.length > 0) summaryParts.push(`Материалы: ${materials.join(", ")}`);
		if (anesthesiaText) summaryParts.push(`Анестезия: ${anesthesiaText}`);
		if (complicationsText) summaryParts.push(`Осложнения: ${complicationsText}`);
		if (v.doctorSummary) summaryParts.push(`Итог: ${v.doctorSummary}`);
		const summary = summaryParts.join("; ");

		chunks.push({
			id: `chunk_visit_${v.id}`, patientId, organizationId, category: "visit_diary_043u",
			date: isoDate, toothNumber: primaryTooth, toothCodes: teeth.map(String), doctorUserId: doctorId,
			doctorFullName: doctorName, visitId: v.id, diagnosisCode: icd10Code, materials, anesthesia: anesthesiaText,
			complications: complicationsText, summary, rawContent: combinedText,
			keywords: extractNormalizedKeywords(`${combinedText} ${summary} ${doctorName}`),
			vector: computeDenseEmbeddingVector(`${summary} ${combinedText} ${doctorName}`),
			metadata: { status: v.status, isSigned: v.signedAt !== null },
		});

		if (complicationsText || combinedText.toLowerCase().includes("осложнен") || combinedText.toLowerCase().includes("обморок") || combinedText.toLowerCase().includes("парестези")) {
			const compSummary = `Осложнение на приеме ${dateRu} (${doctorName}): ${complicationsText || v.doctorSummary || "Особые реакции при лечении"}`;
			chunks.push({
				id: `chunk_comp_${v.id}`, patientId, organizationId, category: "complication_event",
				date: isoDate, toothNumber: primaryTooth, doctorFullName: doctorName, visitId: v.id,
				anesthesia: anesthesiaText, complications: complicationsText ?? "Реакция на вмешательство",
				summary: compSummary, rawContent: combinedText,
				keywords: extractNormalizedKeywords(`${compSummary} ${complicationsText} анестезия осложнение`),
				vector: computeDenseEmbeddingVector(`${compSummary} ${complicationsText} анестезия`),
			});
		}
	}
	return chunks;
}
