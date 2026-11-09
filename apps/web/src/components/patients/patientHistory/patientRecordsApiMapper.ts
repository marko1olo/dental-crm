/**
 * apps/web/src/components/patients/patientHistory/patientRecordsApiMapper.ts
 *
 * DENTE Dental CRM — Канонический преобразователь записей из PostgreSQL (/api/patients/:id/records)
 * в структурированные клинические визиты таймлайна (Мандат 8b / 8ap).
 * Никаких фальшивых протоколов СтАР и регулярок из комментариев.
 */

import type { ClinicalVisitItem } from "./types";

export interface ApiVisitRow {
	id: string;
	appointmentId?: string | null | undefined;
	patientId: string;
	complaint?: string | null | undefined;
	anamnesis?: string | null | undefined;
	objectiveStatus?: string | null | undefined;
	diagnosis?: string | null | undefined;
	treatmentPlan?: string | null | undefined;
	status: string;
	createdAt: string;
}

export interface ApiDiaryRow {
	id: string;
	visitId: string;
	patientId?: string | null | undefined;
	doctorId?: string | null | undefined;
	anamnesis?: string | null | undefined;
	statusLocalis?: string | null | undefined;
	diagnosisIcd10?: string | null | undefined;
	diagnosisTooth?: string | null | undefined;
	treatmentDescription?: string | null | undefined;
	complications?: string | null | undefined;
	comorbidities?: string | null | undefined;
	content?: string | null | undefined;
	isLocked: boolean;
	createdAt: string;
}

const MONTH_NAMES = [
	"Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
	"Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

export function mapApiRecordsToClinicalVisits(
	visits: ApiVisitRow[] = [],
	diaries: ApiDiaryRow[] = [],
): ClinicalVisitItem[] {
	const diaryByVisitId = new Map<string, ApiDiaryRow>();
	for (const d of diaries) {
		if (d.visitId && !diaryByVisitId.has(d.visitId)) {
			diaryByVisitId.set(d.visitId, d);
		}
	}

	const items: ClinicalVisitItem[] = [];

	for (const v of visits) {
		const diary = diaryByVisitId.get(v.id);
		const dateObj = v.createdAt ? new Date(v.createdAt) : new Date();
		const validDate = !isNaN(dateObj.getTime()) ? dateObj : new Date();
		const year = validDate.getFullYear();
		const monthNumber = validDate.getMonth() + 1;
		const monthNameRu = `${MONTH_NAMES[validDate.getMonth()] || "Январь"} ${year}`;
		const time = validDate.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

		const toothNumber = diary?.diagnosisTooth || null;
		const diagnosisCode = diary?.diagnosisIcd10 || v.diagnosis || "K00";
		const diagnosisTitle = v.diagnosis || (diary?.diagnosisIcd10 ? `Диагноз ${diary.diagnosisIcd10}` : "Клинический приём");

		items.push({
			id: v.id,
			date: v.createdAt || validDate.toISOString(),
			time,
			year,
			monthNumber,
			monthNameRu,
			toothNumber,
			diagnosisCode,
			diagnosisTitle,
			doctorName: "Врач-стоматолог",
			specialty: "therapy",
			specialtyLabelRu: "Терапия",
			amountRub: 0,
			isPaid: v.status === "completed",
			paymentStatus: v.status === "completed" ? "paid" : "scheduled",
			complaints: v.complaint || undefined,
			anamnesis: diary?.anamnesis || v.anamnesis || undefined,
			statusLocalis: diary?.statusLocalis || v.objectiveStatus || undefined,
			treatmentProtocol: diary?.treatmentDescription || v.treatmentPlan || diary?.content || undefined,
			isSigned: diary?.isLocked ?? (v.status === "completed"),
		});
	}

	// Обработка автономных дневников без записи в таблице visits
	const handledVisitIds = new Set(visits.map((v) => v.id));
	for (const d of diaries) {
		if (d.visitId && handledVisitIds.has(d.visitId)) continue;
		const dateObj = d.createdAt ? new Date(d.createdAt) : new Date();
		const validDate = !isNaN(dateObj.getTime()) ? dateObj : new Date();
		const year = validDate.getFullYear();
		const monthNumber = validDate.getMonth() + 1;
		const monthNameRu = `${MONTH_NAMES[validDate.getMonth()] || "Январь"} ${year}`;
		const time = validDate.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

		items.push({
			id: d.id,
			date: d.createdAt || validDate.toISOString(),
			time,
			year,
			monthNumber,
			monthNameRu,
			toothNumber: d.diagnosisTooth || null,
			diagnosisCode: d.diagnosisIcd10 || "K00",
			diagnosisTitle: d.diagnosisIcd10 ? `Диагноз ${d.diagnosisIcd10}` : "Дневник приёма",
			doctorName: "Врач-стоматолог",
			specialty: "therapy",
			specialtyLabelRu: "Терапия",
			amountRub: 0,
			isPaid: true,
			paymentStatus: "paid",
			anamnesis: d.anamnesis || undefined,
			statusLocalis: d.statusLocalis || undefined,
			treatmentProtocol: d.treatmentDescription || d.content || undefined,
			isSigned: d.isLocked,
		});
	}

	return items;
}
