/**
 * marketingSegmentsPresets.ts — Default Patient Segments for DENTE Clinic Marketing.
 * Governed by Mandate 8b (<= 120 lines).
 */

import type { PatientSegmentOption } from "./marketingTypes";

export const DEFAULT_PATIENT_SEGMENTS: readonly PatientSegmentOption[] = [
	{
		id: "no_visit_6m",
		name: "Пациенты без визита > 6 мес.",
		count: 142,
		description: "Прошли лечение более полугода назад, требуется контрольный осмотр и гигиена",
	},
	{
		id: "missed_hygiene",
		name: "Пропустили регулярную гигиену",
		count: 48,
		description: "Индивидуальный график профгигиены нарушен более чем на 2 месяца",
	},
	{
		id: "ortho_therapy",
		name: "Ортодонтия и терапия",
		count: 95,
		description: "Пациенты с активными или незавершенными планами терапевтического лечения",
	},
	{
		id: "all_active",
		name: "Вся активная база клиники",
		count: 240,
		description: "Все пациенты с заполненными контактными данными и согласием на информирование",
	},
];
