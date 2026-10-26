/**
 * paidContract/blankContractHtml.ts
 * Generates fallback printable HTML for Decree 736 blank contract (Mandate 8b <= 120 lines, Mandate 8e)
 */

import type { BlankContractOptions, BlankContractPatientInfo } from "./blankContractTypes";
import { escapeHtml, getBlankPrintStyles } from "./blankContractStyles";

export function generateBlankContractFallbackHtml(
	patient?: BlankContractPatientInfo | null,
	options?: BlankContractOptions,
): string {
	const clinicName = options?.clinicName?.trim() || "ООО «Стоматологическая клиника»";
	const clinicAddress = options?.clinicAddress?.trim() || "________________________________________________";
	const clinicInn = options?.clinicInn?.trim() || "____________";
	const clinicOgrn = options?.clinicOgrn?.trim() || "_____________";
	const clinicKpp = options?.clinicKpp?.trim() || "_________";
	const clinicPhone = options?.clinicPhone?.trim() || "________________________";
	const clinicWebsite = options?.clinicWebsite?.trim() || "www.стоматология.рф";
	const licNum = options?.medicalLicenseNumber?.trim() || "ЛО41-01137-77/00368421";
	const licDate = options?.medicalLicenseDate?.trim() || "12.10.2021";
	const licIssuer = options?.medicalLicenseIssuer?.trim() || "Департамент здравоохранения города Москвы";

	const customerName = patient?.fullName?.trim() || "________________________________________________";
	const birthDate = patient?.birthDate?.trim() || "«_____» _________________ _______ г.";
	const customerPhone = patient?.phone?.trim() || "________________________";
	const passport = patient?.administrativeProfile?.identityDocument?.trim() || "серия _______ № ______________, выдан ________________________________________________";
	const address = patient?.administrativeProfile?.registrationAddress?.trim() || patient?.administrativeProfile?.residentialAddress?.trim() || "____________________________________________________________________";
	const snils = patient?.administrativeProfile?.snils?.trim() || "_______-_______-_______ ___";
	const inn = patient?.administrativeProfile?.taxpayerInn?.trim() || "____________";
	const email = patient?.email?.trim() || patient?.administrativeProfile?.email?.trim() || "________________________";
	const doctor = options?.doctorName?.trim() || "________________________";

	const contractSuffix = options?.contractNumber?.trim()
		? (options.contractNumber.startsWith("БЛАНК-") ? options.contractNumber.slice(6) : options.contractNumber)
		: Date.now().toString().slice(-6);
	const contractDate = options?.contractDate?.trim() || "«_____» _________________ 202___ г.";

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8" />
	<title>Договор на лечение (Бланк)</title>
	<style>${getBlankPrintStyles()}</style>
</head>
<body>
	<table class="header-grid">
		<tr>
			<td style="width: 65%;">
				<div class="clinic-title">${escapeHtml(clinicName)}</div>
				<div class="clinic-info">
					Адрес: ${escapeHtml(clinicAddress)}<br />
					ИНН: ${escapeHtml(clinicInn)} · КПП: ${escapeHtml(clinicKpp)} · ОГРН: ${escapeHtml(clinicOgrn)}<br />
					Лицензия: № ${escapeHtml(licNum)} от ${escapeHtml(licDate)} г. (${escapeHtml(licIssuer)})<br />
					Тел.: ${escapeHtml(clinicPhone)} · Сайт: ${escapeHtml(clinicWebsite)}
				</div>
			</td>
			<td class="legal-badge-cell" style="width: 35%;">
				<div class="legal-badge">Постановление Правительства РФ № 736</div>
				<div>ст. 84 Федерального закона № 323-ФЗ</div>
			</td>
		</tr>
	</table>

	<h1>ДОГОВОР № БЛАНК-${escapeHtml(contractSuffix)}</h1>
	<div class="subtitle">на оказание платных медицинских стоматологических услуг</div>

	<div class="doc-header">
		<div>г. Москва</div>
		<div>${escapeHtml(contractDate)}</div>
	</div>

	<div class="preamble">
		<strong>${escapeHtml(clinicName)}</strong>, осуществляющее деятельность на основании Лицензии № ${escapeHtml(licNum)}, именуемое «Исполнитель», с одной стороны, и <strong>${escapeHtml(customerName)}</strong>, именуемый(ая) «Пациент» (Заказчик), заключили настоящий Договор:
	</div>

	<div class="section-title">1. ПРЕДМЕТ ДОГОВОРА И УВЕДОМЛЕНИЕ О ГОСУДАРСТВЕННЫХ ГАРАНТИЯХ</div>
	<p>1.1. Исполнитель обязуется оказать Пациенту платные стоматологические услуги, а Пациент обязуется оплатить их.</p>
	<p>1.2. Лечащий врач: <span class="blank-line">${escapeHtml(doctor)}</span></p>
	<p>1.3. <strong>УВЕДОМЛЕНИЕ О ПРОГРАММЕ ГОСГАРАНТИЙ:</strong> До заключения Договора Исполнитель уведомил Пациента о возможности получения медпомощи по полису ОМС. Пациент добровольно выбирает платные услуги.</p>

	<div class="section-title">2. СТОИМОСТЬ УСЛУГ И ПОРЯДОК РАСЧЕТОВ</div>
	<p>2.1. Предварительная стоимость услуг до осмотра врача: <strong>0 руб. 00 коп. (прочерк: _______ руб. ___ коп.)</strong></p>
	<p>2.2. Окончательная стоимость согласовывается сторонами в плане лечения и актах оказанных услуг.</p>

	<div class="section-title">3. УСЛОВИЯ ОКАЗАНИЯ УСЛУГ И ПРЕДУПРЕЖДЕНИЕ ПАЦИЕНТА</div>
	<p>3.1. Услуги предоставляются при наличии оформленного информированного добровольного согласия (ИДС).</p>
	<p>3.2. Несоблюдение указаний лечащего врача может снизить качество предоставляемой услуги.</p>

	<table class="parties-table">
		<tr>
			<td>
				<strong>ИСПОЛНИТЕЛЬ:</strong><br />
				<strong>${escapeHtml(clinicName)}</strong><br />
				Адрес: ${escapeHtml(clinicAddress)}<br />
				ИНН: ${escapeHtml(clinicInn)} · КПП: ${escapeHtml(clinicKpp)} · ОГРН: ${escapeHtml(clinicOgrn)}<br />
				Лицензия: № ${escapeHtml(licNum)} от ${escapeHtml(licDate)} г.<br />
				Тел.: ${escapeHtml(clinicPhone)}<br /><br />
				Подпись Исполнителя: _____________________ / М.П.
			</td>
			<td>
				<strong>ПАЦИЕНТ / ЗАКАЗЧИК:</strong><br />
				ФИО: <strong>${escapeHtml(customerName)}</strong><br />
				Дата рождения: ${escapeHtml(birthDate)}<br />
				Паспорт: ${escapeHtml(passport)}<br />
				СНИЛС: ${escapeHtml(snils)} · ИНН: ${escapeHtml(inn)}<br />
				Адрес: ${escapeHtml(address)}<br />
				Тел.: ${escapeHtml(customerPhone)} · Email: ${escapeHtml(email)}<br /><br />
				Подпись Пациента: _____________________ / ${escapeHtml(customerName)} /
			</td>
		</tr>
	</table>
	<script>if (window.opener) { setTimeout(function() { window.print(); }, 250); }</script>
</body>
</html>`;
}
