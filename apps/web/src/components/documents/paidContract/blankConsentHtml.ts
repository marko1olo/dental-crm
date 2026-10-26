/**
 * paidContract/blankConsentHtml.ts
 * Generates fallback printable HTML for Informed Consent blank (Mandate 8b <= 120 lines, Mandate 8e)
 */

import type { BlankContractOptions, BlankContractPatientInfo } from "./blankContractTypes";
import { escapeHtml, getBlankPrintStyles } from "./blankContractStyles";

export function generateBlankConsentFallbackHtml(
	patient?: BlankContractPatientInfo | null,
	options?: BlankContractOptions,
): string {
	const clinicName = options?.clinicName?.trim() || "ООО «Стоматологическая клиника»";
	const clinicAddress = options?.clinicAddress?.trim() || "________________________________________________";
	const clinicInn = options?.clinicInn?.trim() || "____________";
	const clinicOgrn = options?.clinicOgrn?.trim() || "_____________";
	const clinicPhone = options?.clinicPhone?.trim() || "________________________";
	const licenseNumber = options?.medicalLicenseNumber?.trim() || "ЛО41-01137-77/00368421";
	const licenseDate = options?.medicalLicenseDate?.trim() || "12.10.2021";
	const licenseIssuer = options?.medicalLicenseIssuer?.trim() || "Департамент здравоохранения города Москвы";

	const customerName = patient?.fullName?.trim() || "________________________________________________";
	const customerBirthDate = patient?.birthDate?.trim() || "«_____» _________________ _______ г.";
	const customerPhone = patient?.phone?.trim() || "________________________";
	const customerPassport =
		patient?.administrativeProfile?.identityDocument?.trim() ||
		"серия _______ № ______________, выдан ________________________________________________";
	const customerAddress =
		patient?.administrativeProfile?.registrationAddress?.trim() ||
		patient?.administrativeProfile?.residentialAddress?.trim() ||
		"____________________________________________________________________";
	const doctorName = options?.doctorName?.trim() || "________________________";
	const consentDate = options?.contractDate?.trim() || "«_____» _________________ 202___ г.";

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8" />
	<title>Информированное согласие (Бланк)</title>
	<style>${getBlankPrintStyles()}</style>
</head>
<body>
	<table class="header-grid">
		<tr>
			<td style="width: 65%;">
				<div class="clinic-title">${escapeHtml(clinicName)}</div>
				<div class="clinic-info">
					Адрес: ${escapeHtml(clinicAddress)}<br />
					ИНН: ${escapeHtml(clinicInn)} · ОГРН: ${escapeHtml(clinicOgrn)}<br />
					Лицензия: № ${escapeHtml(licenseNumber)} от ${escapeHtml(licenseDate)} г. (${escapeHtml(licenseIssuer)})<br />
					Тел.: ${escapeHtml(clinicPhone)}
				</div>
			</td>
			<td class="legal-badge-cell" style="width: 35%;">
				<div class="legal-badge">Приказ Минздрава РФ</div>
				<div>ст. 20 Федерального закона № 323-ФЗ</div>
			</td>
		</tr>
	</table>

	<h1>ИНФОРМИРОВАННОЕ ДОБРОВОЛЬНОЕ СОГЛАСИЕ</h1>
	<div class="subtitle">на медицинское вмешательство при оказании стоматологической помощи</div>

	<div class="doc-header">
		<div>г. Москва</div>
		<div>${escapeHtml(consentDate)}</div>
	</div>

	<div class="preamble">
		Я, нижеподписавшийся(аяся) <strong>${escapeHtml(customerName)}</strong>, дата рождения ${escapeHtml(customerBirthDate)}, паспорт: ${escapeHtml(customerPassport)}, адрес: ${escapeHtml(customerAddress)}, телефон: ${escapeHtml(customerPhone)}, даю согласие на медицинское вмешательство.
	</div>

	<div class="section-title">1. СВЕДЕНИЯ О ПРЕДСТОЯЩЕМ ВМЕШАТЕЛЬСТВЕ</div>
	<p>Мне разъяснены цели, методы оказания медицинской помощи, связанный с ними риск, возможные варианты вмешательств, последствия и результаты лечения.</p>
	<p>Лечащий врач: <span class="blank-line">${escapeHtml(doctorName)}</span></p>

	<div class="section-title">2. СОМАТИЧЕСКИЙ СТАТУС И АЛЛЕРГИЧЕСКИЕ РЕАКЦИИ</div>
	<p>Я проинформировал(а) врача обо всех имеющихся заболеваниях и аллергических реакциях: <span class="blank-line" style="min-width: 250px;"></span></p>

	<div class="section-title">3. ДОБРОВОЛЬНОЕ ПОДТВЕРЖДЕНИЕ</div>
	<p>Я подтверждаю, что текст настоящего согласия прочитан мной лично, мне понятен смысл всех медицинских терминов.</p>

	<div class="signature-area" style="margin-top: 24px; display: flex; justify-content: space-between; font-size: 8.5pt;">
		<div>Подпись врача: _____________________ / ${escapeHtml(doctorName)} /</div>
		<div>Подпись Пациента: _____________________ / ${escapeHtml(customerName)} /</div>
	</div>
	<script>if (window.opener) { setTimeout(function() { window.print(); }, 250); }</script>
</body>
</html>`;
}
