import { escapeHtml, formatDateRu } from "../documentPrintFormatters";
import { ORDER_1094N_NAME, FORM_107_1_U_TITLE, type PrescriptionForm107Input } from "./types";
import { prescriptionPrintCss } from "./styles";

export function generatePrescriptionForm107Html(input: PrescriptionForm107Input): string {
	const { seriesNumber, dateIso, validityDays, clinic, patient, doctor, medications, isChronicCare, chronicPeriodicity } = input;
	const dateFormatted = formatDateRu(dateIso);
	const validityText = validityDays === 15 ? "15 дней (Срочно / ПКУ)" : validityDays === 30 ? "30 дней (Льготный)" : validityDays === 365 ? "1 год (По специальному назначению)" : "60 дней (Стандартный)";

	const medItems = medications.map((item, idx) => {
		const latin = /^Rp\s*[.:]/i.test(item.mnnLatin) ? item.mnnLatin : `Rp.: ${item.mnnLatin}`;
		const dosage = item.dosage ? ` ${item.dosage}` : "";
		const dtd = /^D\.?\s*t\.?\s*d\.?/i.test(item.formAndDispenseLatin) ? item.formAndDispenseLatin : `D.t.d. ${item.formAndDispenseLatin}`;
		const signa = /^(?:D\.?\s*)?S[.:]?\s*/i.test(item.signaRu) ? item.signaRu : `S. ${item.signaRu}`;
		return `<div class="rp-item"><div class="rp-line-main">${idx + 1}. ${escapeHtml(latin)}${escapeHtml(dosage)}</div><div class="rp-line-dispense">${escapeHtml(dtd)}</div><div class="rp-line-signa">${escapeHtml(signa)}</div>${item.tradeNameRu ? `<div class="rp-trade-name">[Торговое наименование: ${escapeHtml(item.tradeNameRu)}]</div>` : ""}</div>`;
	}).join("");

	return `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><title>Рецепт ${escapeHtml(seriesNumber)} — ${escapeHtml(patient.fullName)}</title><style>${prescriptionPrintCss}</style></head><body><div class="rx-sheet"><div><div class="header-row"><div class="clinic-stamp-box"><strong>${escapeHtml(clinic.legalName)}</strong><br>Адрес: ${escapeHtml(clinic.address)}<br>${clinic.phone ? `Тел: ${escapeHtml(clinic.phone)} | ` : ""}ИНН: ${escapeHtml(clinic.inn)} | ОГРН: ${escapeHtml(clinic.ogrn)}<br>Лицензия № ${escapeHtml(clinic.licenseNumber)}${clinic.licenseDate ? ` от ${escapeHtml(clinic.licenseDate)}` : ""}</div><div class="form-statutory-info">Министерство здравоохранения РФ<br>Медицинская документация<br><strong>${FORM_107_1_U_TITLE}</strong><br>${ORDER_1094N_NAME}</div></div><div class="rx-title">РЕЦЕПТ</div><div class="rx-series">Серия <strong>${escapeHtml(seriesNumber)}</strong> от <strong>${dateFormatted}</strong></div><div class="patient-block">Ф.И.О. пациента: <strong>${escapeHtml(patient.fullName)}</strong><br>Дата рождения: ${patient.birthDate ? formatDateRu(patient.birthDate) : "____________________"} | № амбулаторной карты: <strong>${escapeHtml(patient.cardNumber || "б/н")}</strong><br>${patient.address ? `Адрес: ${escapeHtml(patient.address)}<br>` : ""}Лечащий врач: <strong>${escapeHtml(doctor.fullName)}</strong>${doctor.specialty ? ` (${escapeHtml(doctor.specialty)})` : ""}</div><div class="rp-container">${medItems}</div></div><div class="footer-section"><div>Срок действия рецепта: <strong>${validityText}</strong>${isChronicCare && chronicPeriodicity ? `<br>По специальному назначению: <em>${escapeHtml(chronicPeriodicity)}</em>` : ""}</div><div class="footer-grid"><div>Подпись и личная печать врача:<br><br>________________________ / ${escapeHtml(doctor.fullName)}</div><div style="display: flex; align-items: center;"><div class="clinic-stamp-circle">ШТАМП<br>«ДЛЯ РЕЦЕПТОВ»</div><div class="doctor-stamp-circle">М.П.<br>ВРАЧ</div></div></div></div></div></body></html>`;
}
