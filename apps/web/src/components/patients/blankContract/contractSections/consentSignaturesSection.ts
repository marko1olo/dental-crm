import { escapeHtml } from "./contractEscapeHtml";

export interface ConsentSignaturesMeta {
	customerName: string;
	doctorName: string;
}

export function renderConsentSignaturesHtml(meta: ConsentSignaturesMeta): string {
	return `
	<div class="signatures-row">
		<div class="sign-box">
			<strong>Пациент (Заказчик / Представитель):</strong><br />
			ФИО: ${escapeHtml(meta.customerName)}<br />
			<div class="sign-line"></div>
			<div class="sign-hint">(личная подпись / «_____» _________________ 202___ г.)</div>
		</div>
		<div class="sign-box">
			<strong>Лечащий врач-стоматолог:</strong><br />
			ФИО: ${escapeHtml(meta.doctorName)}<br />
			<div class="sign-line"></div>
			<div class="sign-hint">(подпись медицинского работника / дата)</div>
		</div>
	</div>`;
}
