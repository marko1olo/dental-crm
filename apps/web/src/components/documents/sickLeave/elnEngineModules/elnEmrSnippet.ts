/**
 * STATUTORY ELN EMR DIARY SNIPPET & JOURNAL 036 GENERATOR
 */

import type { SickLeavePatientData, SickLeaveFormState, Form036uEntry } from "./types.js";
import { calculateDaysBetween, formatDateRu } from "./dentalIcd10DurationNorms.js";

export function generateForm036uEntry(
	form: SickLeaveFormState,
	patient: SickLeavePatientData,
	medicalCardNumber = "карта-приема/2026-08",
): Form036uEntry {
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
		? `Продление временной нетрудоспособности свыше 15 дней по Приказу Минздрава № 1089н при тяжелом течении (${form.icd10Code}).`
		: `Экспертиза временной нетрудоспособности лечащим врачом единолично (до 15 дн.).`;

	const vkDecision = isVk
		? form.vkProtocol?.expertDecision ||
			`Продлить ЭЛН № ${form.elnNumber} с ${formatDateRu(form.vkProtocol?.extensionDateFrom || firstDate)} по ${formatDateRu(form.vkProtocol?.extensionDateTo || lastDate)}. Повторный осмотр ВК ${formatDateRu(form.vkProtocol?.nextReviewDate || lastDate)}.`
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
		membersSign: form.vkProtocol ? form.vkProtocol.memberFios : [],
	};
}

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
		snippet += `[Черновик ЭЛН № ${form.elnNumber}, оформляется в карте 043/у]\n`;
	} else {
		snippet += `Оформлен ЭЛН № ${form.elnNumber} (Приказ Минздрава РФ № 1089н).\n`;
	}
	snippet += `Причина ВН: код ${form.reasonCode} (${form.icd10Code} - ${form.diagnosisText}).\n`;
	snippet += `Период освобождения от работы: с ${formatDateRu(firstDate)} по ${formatDateRu(lastDate)} (продолжительность: ${totalDays} кал. дн.). Режим: амбулаторный.\n`;

	if (form.isVkRequired && form.vkProtocol) {
		snippet += `Решение Врачебной комиссии (ВК): Протокол № ${form.vkProtocol.protocolNumber} от ${formatDateRu(form.vkProtocol.protocolDate)}. Обоснование: ${form.vkProtocol.clinicalSubstantiation}. Председатель ВК: ${form.vkProtocol.chairpersonFio}.\n`;
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
		snippet += `Место работы: ${patient.employerName || "Уточняется"}. Памятка пациенту выдана. [Черновик ЭЛН: оформляется, ожидает передачи в СФР].`;
	} else {
		snippet += `Место работы: ${patient.employerName}. Памятка пациенту выдана. ЭЛН передан в СФР/ЕГИСЗ.`;
	}
	return snippet;
}

function escapeXml(unsafe: string): string {
	if (!unsafe) return "";
	return unsafe
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

export function generateSickLeavePatientMemoHtml(
	form: SickLeaveFormState,
	patient: SickLeavePatientData,
): string {
	const reasonTitle = form.diagnosisText || `Код причины: ${form.reasonCode}`;
	const attendingDoctor =
		form.periods[form.periods.length - 1]?.doctorFio || "Лечащий врач";
	const elnQrSvg = `<svg width="80" height="80" viewBox="0 0 80 80"><rect width="80" height="80" fill="#f1f5f9"/><text x="40" y="44" font-size="10" text-anchor="middle" fill="#0f766e">QR: ЭЛН</text></svg>`;

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8"/>
  <title>Памятка пациенту: ЭЛН № ${escapeXml(form.elnNumber)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 16px; color: #0f172a; font-size: 12px; }
    .memo-container { max-width: 720px; margin: 0 auto; border: 1px solid #cbd5e1; padding: 20px; border-radius: 8px; }
    .memo-header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f766e; padding-bottom: 12px; margin-bottom: 12px; }
    .org-title { font-size: 14px; font-weight: bold; color: #0f766e; }
    .org-sub { font-size: 11px; color: #64748b; }
    .eln-badge { font-size: 16px; font-weight: bold; color: #0f766e; text-align: right; }
    .main-title { font-size: 14px; font-weight: bold; text-align: center; margin: 12px 0 4px; }
    .sub-title { font-size: 11px; color: #64748b; text-align: center; margin-bottom: 16px; }
    .data-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; }
    .data-item { display: flex; flex-direction: column; }
    .data-label { font-size: 10px; color: #64748b; }
    .data-val { font-size: 12px; font-weight: 500; }
    table.periods-table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 11px; }
    table.periods-table th, table.periods-table td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
    table.periods-table th { background: #f8fafc; font-weight: 600; }
    .qr-info-box { display: flex; gap: 12px; align-items: center; background: #f8fafc; border: 1px dashed #cbd5e1; padding: 10px; border-radius: 6px; margin: 12px 0; }
    .qr-text { font-size: 11px; line-height: 1.4; }
    .memo-footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 16px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 11px; }
    .sign-line { border-bottom: 1px solid #0f172a; width: 140px; display: inline-block; margin-left: 6px; }
  </style>
</head>
<body>
  <div class="memo-container">
    <div class="memo-header">
      <div>
        <div class="org-title">${escapeXml(form.organizationName || "Стоматологическая клиника ДЕНТЕ")}</div>
        <div class="org-sub">ОГРН: ${escapeXml(form.organizationOgrn || "—")} | Лицензия: ${escapeXml(form.medicalLicenceNumber || "—")}</div>
      </div>
      <div class="eln-badge">№ ${escapeXml(form.elnNumber)}</div>
    </div>
    <div class="main-title">ПАМЯТКА ПАЦИЕНТУ О ВЫДАЧЕ ЭЛЕКТРОННОГО ЛИСТКА НЕТРУДОСПОСОБНОСТИ</div>
    <div class="sub-title">Приказ Минздрава России № 1089н</div>
    <div class="data-grid">
      <div class="data-item"><span class="data-label">Пациент</span><span class="data-val">${escapeXml(patient.patientFio)}</span></div>
      <div class="data-item"><span class="data-label">СНИЛС / Рождение</span><span class="data-val">${escapeXml(patient.patientSnils)} / ${formatDateRu(patient.patientBirthDate)}</span></div>
      <div class="data-item"><span class="data-label">Работодатель</span><span class="data-val">${escapeXml(patient.employerName || "Основное место работы")}</span></div>
      <div class="data-item"><span class="data-label">Диагноз</span><span class="data-val">${escapeXml(reasonTitle)} (${escapeXml(form.icd10Code)})</span></div>
    </div>
    <table class="periods-table">
      <thead><tr><th>Период освобождения</th><th>Дней</th><th>Режим</th><th>Врач</th></tr></thead>
      <tbody>
        ${form.periods.map((p) => `<tr><td>с ${formatDateRu(p.dateFrom)} по ${formatDateRu(p.dateTo)}</td><td>${calculateDaysBetween(p.dateFrom, p.dateTo)}</td><td>Амбулаторный</td><td>${escapeXml(p.doctorFio)}</td></tr>`).join("")}
      </tbody>
    </table>
    <div class="qr-info-box">
      <div>${elnQrSvg}</div>
      <div class="qr-text">Больничный лист передан в СФР. Сообщите номер <strong>${escapeXml(form.elnNumber)}</strong> работодателю. Статус доступен на портале <strong>Госуслуги</strong>. Приступить к работе с: ${form.workResumeDate ? formatDateRu(form.workResumeDate) : '—'}</div>
    </div>
    <div class="memo-footer">
      <div>Лечащий врач: <strong>${escapeXml(attendingDoctor)}</strong> <span class="sign-line"></span></div>
      <div>Дата: ${formatDateRu(form.issueDate)}</div>
    </div>
  </div>
</body>
</html>`;
}
