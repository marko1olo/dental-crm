/**
 * prescriptionMemoFormatter.ts — Patient Prescription Memo Plain Text Formatter
 * DENTE Dental CRM (Mandate 8b <= 120 lines).
 */

import type { PatientPrescriptionMemoParams } from "./prescriptionEngineTypes";

export function formatPatientPrescriptionMemo(
	params: PatientPrescriptionMemoParams,
): string {
	const { clinicName, clinicPhone, prescriptionDate, medications } = params;

	const patient = params.patientName || params.patientFullName || "";
	const doctor = params.doctorName || params.doctorFullName || "";
	const dateStr = prescriptionDate || new Date().toLocaleDateString("ru-RU");

	const medsList = medications.map((med, idx) => {
		const tradeName =
			med.tradeNameRu ||
			("nameRu" in med ? String(med.nameRu) : undefined) ||
			med.id;
		const details = med.activeSubstanceRu
			? ` (${med.activeSubstanceRu}${med.formRu ? `, ${med.formRu}` : ""})`
			: "";
		const cleanSigna = med.signaRu
			.replace(/^(?:D\.?\s*)?S[.:]?\s*/i, "")
			.trim();
		return `${idx + 1}. ${tradeName}${details}:\n   Способ применения: ${cleanSigna}`;
	});

	const lines = [
		`Схема приёма лекарственных препаратов (клиника «${clinicName}»):`,
		`Пациент: ${patient}`,
		`Лечащий врач: ${doctor}`,
		`Дата назначения: ${dateStr}`,
		"Назначенные препараты:",
		...medsList,
		`Памятка: строго соблюдайте назначенную дозировку и график приёма. Не прекращайте курс антибиотиков раньше указанного срока. При любых признаках непереносимости или аллергии немедленно свяжитесь с клиникой${clinicPhone ? `: ${clinicPhone}` : ""}.`,
		"Рекомендации: официальный регламент назначения и отпуска лекарственных препаратов.",
	];

	return lines.join("\n");
}
