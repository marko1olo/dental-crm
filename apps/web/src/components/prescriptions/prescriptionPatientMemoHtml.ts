/**
 * prescriptionPatientMemoHtml.ts — Patient Friendly Medication Memo HTML Renderer
 * Decomposed module <= 120 lines (Mandate 8b).
 */

import type { PrescriptionDrugItem } from "./PrescriptionPrintModal";

export function cleanHumanInstruction(signa: string): string {
	if (!signa) return "";
	return signa
		.replace(/^(?:D\.?\s*)?S[.:]?\s*/i, "")
		.replace(/^(?:Rp[.:]?\s*)/i, "")
		.replace(/^(?:D\.?t\.?d\.?\s*N?\s*\d*\.?\s*)/i, "")
		.trim();
}

export interface PatientMemoPrintHtmlOptions {
	clinic: string;
	address: string;
	phone: string;
	patientName: string;
	patientBirth?: string;
	patientCard?: string;
	docName: string;
	docSpecialty?: string;
	prescriptionDate: string;
	activeItems: readonly PrescriptionDrugItem[];
}

export function generatePatientMemoPrintHtml(
	opts: PatientMemoPrintHtmlOptions,
): string {
	const {
		clinic,
		address,
		phone,
		patientName,
		patientBirth,
		patientCard,
		docName,
		docSpecialty,
		prescriptionDate,
		activeItems,
	} = opts;

	const medRows = activeItems
		.map((item, idx) => {
			const humanSigna = cleanHumanInstruction(item.signaRussian);
			const details = [item.form, item.dosage].filter(Boolean).join(" · ");
			return `<div style="border:1px solid #d1d5db;border-left:4px solid #0d9488;background:#fff;border-radius:6px;padding:8px 12px;margin-bottom:8px;">
				<div style="font-size:11pt;font-weight:700;color:#111827;">${idx + 1}. ${item.tradeName}</div>
				${details ? `<div style="font-size:9pt;color:#4b5563;">Форма: ${details}</div>` : ""}
				<div style="margin-top:4px;font-size:10pt;color:#1f2937;font-weight:600;background:#f0fdf4;padding:4px 8px;border-radius:4px;">Способ применения: ${humanSigna}</div>
			</div>`;
		})
		.join("");

	return `<!DOCTYPE html><html><head><meta charset="utf-8" />
	<title>Памятка — ${patientName || "Пациент"}</title>
	<style>
		@page { size: A5 portrait; margin: 8mm; }
		body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 10pt; color: #111; margin: 0; padding: 0; }
		.header { border-bottom: 2px solid #0d9488; padding-bottom: 6px; margin-bottom: 10px; }
		.alert-box { margin-top: 10px; background: #fffbeb; border-left: 4px solid #f59e0b; padding: 6px 10px; font-size: 8.5pt; color: #92400e; }
	</style></head><body>
	<div class="header">
		<div style="font-size:12pt;font-weight:700;color:#0f766e;">${clinic}</div>
		<div style="font-size:8.5pt;color:#4b5563;">${address} | Тел: <strong>${phone}</strong> | Врач: ${docName}${docSpecialty ? ` (${docSpecialty})` : ""}</div>
	</div>
	<div style="text-align:center;font-size:13pt;font-weight:800;margin:8px 0 4px 0;">ПАМЯТКА ДЛЯ ПАЦИЕНТА</div>
	<div style="text-align:center;font-size:9pt;color:#4b5563;margin-bottom:10px;">Схема приёма назначенных препаратов</div>
	<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:6px 10px;margin-bottom:10px;font-size:9.5pt;">
		Пациент: <strong>${patientName || "Пациент"}</strong>${patientBirth ? ` | Д.Р.: <strong>${patientBirth}</strong>` : ""}${patientCard ? ` | Карта: <strong>${patientCard}</strong>` : ""} | Дата: <strong>${prescriptionDate}</strong>
	</div>
	<div>${medRows}</div>
	<div class="alert-box">
		<strong>Важно:</strong> Соблюдайте дозировку и кратность. При признаках аллергии прекратите приём и свяжитесь с клиникой: <strong>${phone}</strong>.
	</div>
	<div style="margin-top:10px;border-top:1px solid #e5e7eb;padding-top:6px;display:flex;justify-content:space-between;font-size:8.5pt;color:#4b5563;">
		<div>Клиника «${clinic}»</div><div>Дата: ${prescriptionDate}</div>
	</div></body></html>`;
}
