import { escapeHtml } from "./contractEscapeHtml";

export interface ContractClinicMeta {
	clinicName: string;
	clinicAddress: string;
	clinicInn: string;
	clinicOgrn: string;
	clinicKpp: string;
	clinicPhone: string;
	clinicWebsite: string;
	medicalLicenseNumber: string;
	medicalLicenseDate: string;
	medicalLicenseIssuer: string;
	contractSuffix: string;
	contractDateFormatted: string;
}

export function renderContractHeaderHtml(meta: ContractClinicMeta): string {
	return `
	<div class="no-print">
		<span><strong>Договор на лечение со строками _______ для ручного заполнения</strong> (ст. 124 УК РФ, Правила оказания медицинских услуг).</span>
		<div class="no-print-actions">
			<button class="btn-print" onclick="window.print()">Печать (Ctrl+P)</button>
			<button class="btn-close" onclick="window.close()">Закрыть</button>
		</div>
	</div>

	<table class="header-grid">
		<tr>
			<td class="clinic-info">
				<div class="clinic-title">${escapeHtml(meta.clinicName)}</div>
				<div>Адрес: ${escapeHtml(meta.clinicAddress)} | Тел.: ${escapeHtml(meta.clinicPhone)} | Сайт: ${escapeHtml(meta.clinicWebsite)}</div>
				<div>ОГРН: ${escapeHtml(meta.clinicOgrn)} | ИНН: ${escapeHtml(meta.clinicInn)} | КПП: ${escapeHtml(meta.clinicKpp)}</div>
				<div>Лицензия на медицинскую деятельность: <strong>№ ${escapeHtml(meta.medicalLicenseNumber)}</strong> от ${escapeHtml(meta.medicalLicenseDate)} г., выданная: ${escapeHtml(meta.medicalLicenseIssuer)}.</div>
			</td>
			<td class="legal-badge-cell" style="width: 220px;">
				<div class="legal-badge">Договор на лечение</div>
				<div>Медицинские услуги</div>
				<div>Правила оказания мед. услуг</div>
				<div style="font-weight: bold; color: #0f172a;">ст. 84 Федерального закона № 323-ФЗ</div>
			</td>
		</tr>
	</table>

	<h1>ДОГОВОР № БЛАНК-${escapeHtml(meta.contractSuffix)}</h1>
	<div class="subtitle">на оказание платных медицинских (стоматологических) услуг</div>

	<div class="doc-header">
		<div>г. Москва</div>
		<div>${escapeHtml(meta.contractDateFormatted)}</div>
	</div>`;
}
