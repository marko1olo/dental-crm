import { escapeHtml } from "./contractEscapeHtml";

export interface ConsentClinicMeta {
	clinicName: string;
	clinicAddress: string;
	clinicInn: string;
	clinicOgrn: string;
	clinicPhone: string;
	medicalLicenseNumber: string;
	medicalLicenseDate: string;
	medicalLicenseIssuer: string;
	consentSuffix: string;
	consentDateFormatted: string;
}

export function renderConsentHeaderHtml(meta: ConsentClinicMeta): string {
	return `
	<div class="no-print">
		<span><strong>Бланк информированного добровольного согласия (ИДС) для ручного заполнения.</strong></span>
		<div class="no-print-actions">
			<button class="btn-print" onclick="window.print()">Печать (Ctrl+P)</button>
			<button class="btn-close" onclick="window.close()">Закрыть</button>
		</div>
	</div>

	<table class="header-grid">
		<tr>
			<td class="clinic-info">
				<div class="clinic-title">${escapeHtml(meta.clinicName)}</div>
				<div>Адрес: ${escapeHtml(meta.clinicAddress)} | Тел.: ${escapeHtml(meta.clinicPhone)}</div>
				<div>ОГРН: ${escapeHtml(meta.clinicOgrn)} | ИНН: ${escapeHtml(meta.clinicInn)}</div>
				<div>Лицензия на осуществление медицинской деятельности: <strong>№ ${escapeHtml(meta.medicalLicenseNumber)}</strong> от ${escapeHtml(meta.medicalLicenseDate)} г., выданная: ${escapeHtml(meta.medicalLicenseIssuer)}.</div>
			</td>
			<td class="legal-badge-cell" style="width: 220px;">
				<div class="legal-badge">Согласие ИДС</div>
				<div>Информированное согласие</div>
				<div style="font-weight: bold; color: #0f172a;">В медицинскую карту пациента</div>
			</td>
		</tr>
	</table>

	<h1>ИНФОРМИРОВАННОЕ ДОБРОВОЛЬНОЕ СОГЛАСИЕ № БЛАНК-ИДС-${escapeHtml(meta.consentSuffix)}</h1>
	<div class="subtitle">на медицинское вмешательство, первичный стоматологический осмотр и диагностику</div>

	<div class="doc-header">
		<div>г. Москва</div>
		<div>${escapeHtml(meta.consentDateFormatted)}</div>
	</div>`;
}
