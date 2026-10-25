/**
 * STATUTORY ELN EMR DIARY SNIPPET & CLINICAL REGISTER GENERATOR
 * Clean Russian clinical tone without Soviet Order numbers (Mandate 8x & 8ap)
 */

import type { SickLeavePatientData, SickLeaveFormState, SickLeaveRegistryEntry } from "./types.js";
import { calculateDaysBetween, formatDateRu } from "./dentalIcd10DurationNorms.js";
export { generateSickLeavePatientMemoHtml } from "./sickLeavePatientMemoHtml.js";

export function generateSickLeaveRegistryEntry(
	form: SickLeaveFormState,
	patient: SickLeavePatientData,
	medicalCardNumber = "карта-приема/2026",
): SickLeaveRegistryEntry {
	const totalDays = form.periods.reduce(
		(acc, p) => acc + calculateDaysBetween(p.dateFrom, p.dateTo),
		0,
	);
	const firstDate = form.periods[0]?.dateFrom || form.issueDate;
	const lastDate = form.periods[form.periods.length - 1]?.dateTo || form.issueDate;
	const periodText = `с ${formatDateRu(firstDate)} по ${formatDateRu(lastDate)} (${totalDays} кал. дн.)`;

	const isVk = form.isVkRequired && Boolean(form.vkProtocol);
	const entryNum = isVk
		? form.vkProtocol?.protocolNumber || "1"
		: `ВН-${form.elnNumber.slice(-4)}`;
	const entryDate = isVk
		? form.vkProtocol?.protocolDate || form.issueDate
		: form.issueDate;

	const vkReason = isVk
		? `Продление временной нетрудоспособности свыше 15 дней при тяжелом клиническом течении (${form.icd10Code}).`
		: `Экспертиза временной нетрудоспособности лечащим врачом единолично (до 15 дн.).`;

	const vkDecision = isVk
		? form.vkProtocol?.expertDecision ||
			`Продлить ЭЛН № ${form.elnNumber} с ${formatDateRu(form.vkProtocol?.extensionDateFrom || firstDate)} по ${formatDateRu(form.vkProtocol?.extensionDateTo || lastDate)}. Повторный осмотр ${formatDateRu(form.vkProtocol?.nextReviewDate || lastDate)}.`
		: `Выдать ЭЛН № ${form.elnNumber} на срок ${totalDays} дн. с ${formatDateRu(firstDate)} по ${formatDateRu(lastDate)}. Режим: Амбулаторный.`;

	return {
		entryNumber: entryNum,
		date: entryDate,
		patientFio: patient.patientFio,
		birthDate: patient.patientBirthDate,
		snils: patient.patientSnils,
		medicalCardNumber,
		diagnosis: form.diagnosisText,
		icd10: form.icd10Code,
		sickLeaveNumber: form.elnNumber,
		incapacityPeriodText: periodText,
		totalDays,
		vkReason,
		vkDecisionText: vkDecision,
		chairpersonSign: form.vkProtocol?.chairpersonFio || (form.isVkRequired ? "Председатель ВК" : "Лечащий врач"),
		membersSign: form.vkProtocol?.memberFios ?? [],
	};
}

/** Backward compatibility alias */
export const generateForm036uEntry = generateSickLeaveRegistryEntry;

export function generateEmrDiarySnippet(
	form: SickLeaveFormState,
	patient: SickLeavePatientData,
	isDraft = false,
): string {
	const totalDays = form.periods.reduce(
		(acc, p) => acc + calculateDaysBetween(p.dateFrom, p.dateTo),
		0,
	);
	const firstDate = form.periods[0]?.dateFrom || form.issueDate;
	const lastDate = form.periods[form.periods.length - 1]?.dateTo || form.issueDate;

	let snippet = isDraft
		? `[ЭКСПЕРТИЗА ВРЕМЕННОЙ НЕТРУДОСПОСОБНОСТИ (ЭЛН) — ЧЕРНОВИК ОФОРМЛЯЕТСЯ]\n`
		: `[ЭКСПЕРТИЗА ВРЕМЕННОЙ НЕТРУДОСПОСОБНОСТИ (ЭЛН)]\n`;

	if (isDraft) {
		snippet += `[Черновик ЭЛН № ${form.elnNumber}, оформляется в медицинской карте]\n`;
	} else {
		snippet += `Оформлен электронный листок нетрудоспособности № ${form.elnNumber}.\n`;
	}
	snippet += `Причина ВН: код ${form.reasonCode} (${form.icd10Code} - ${form.diagnosisText}).\n`;
	snippet += `Период освобождения от работы: с ${formatDateRu(firstDate)} по ${formatDateRu(lastDate)} (${totalDays} кал. дн.). Режим: амбулаторный.\n`;

	if (form.isVkRequired && form.vkProtocol) {
		snippet += `Согласование: Протокол № ${form.vkProtocol.protocolNumber} от ${formatDateRu(form.vkProtocol.protocolDate)}. Обоснование: ${form.vkProtocol.clinicalSubstantiation}.\n`;
	}

	if (form.violationCode && form.violationDate) {
		snippet += `Отметка о нарушении режима: код ${form.violationCode} от ${formatDateRu(form.violationDate)}.\n`;
	}

	if (form.closingCode === "31" && form.workResumeDate) {
		snippet += `Исход: статус 31 (Приступить к работе с ${formatDateRu(form.workResumeDate)}). Трудоспособность восстановлена.\n`;
	} else if (form.closingCode === "32") {
		snippet += `Исход: статус 32 (Продолжает болеть, выдан новый ЭЛН ${form.nextElnNumber || ""}).\n`;
	}

	if (isDraft) {
		snippet += `Место работы: ${patient.employerName || "Уточняется"}. Памятка пациенту выдана. [Черновик ЭЛН: оформляется].`;
	} else {
		snippet += `Место работы: ${patient.employerName}. Памятка пациенту выдана. Документ зарегистрирован.`;
	}
	return snippet;
}
