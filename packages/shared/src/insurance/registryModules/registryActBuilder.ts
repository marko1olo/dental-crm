import { escapeXml } from "../../cda/c14n.js";
import { formatKopecksRu } from "../../utils/money.js";
import type { DmsRegistryData } from "./registryTypes.js";
import { calculateDmsRegistryTotals } from "./registryKopeckCalculator.js";
import { ACT_A4_HTML_STYLE } from "./registryHtmlStyles.js";

/**
 * Generates an A4 Printable HTML Bilateral Acceptance Act (Акт сдачи-приемки оказанных услуг) for DMS Insurer Billing.
 */
export function generateDmsAcceptanceActA4Html(data: DmsRegistryData): string {
	const totals = calculateDmsRegistryTotals(data.records);

	const rowsHtml = data.records.map((rec, index) => {
		return `<tr>
			<td class="text-center">${index + 1}</td>
			<td class="text-center whitespace-nowrap">${escapeXml(rec.serviceDate)}</td>
			<td class="font-medium">${escapeXml(rec.patientFullName)}<div class="text-muted text-xs">Полис: ${escapeXml(rec.policyNumber)}</div></td>
			<td class="text-center">${escapeXml(rec.guaranteeLetterNumber)}</td>
			<td class="font-mono text-xs">${escapeXml(rec.serviceCode804n)}</td>
			<td>${escapeXml(rec.serviceNameRu)}</td>
			<td class="text-center">${rec.quantity}</td>
			<td class="text-right whitespace-nowrap">${formatKopecksRu(rec.totalGrossKopecks)}</td>
			<td class="text-right whitespace-nowrap">${formatKopecksRu(rec.patientPaidKopecks)}</td>
			<td class="text-right whitespace-nowrap font-bold">${formatKopecksRu(rec.insurerClaimKopecks)}</td>
			<td class="text-xs">${escapeXml(rec.doctorFullName)}</td>
		</tr>`;
	}).join("\n");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="UTF-8">
	<title>Акт сдачи-приемки услуг ДМС № ${escapeXml(data.registryNumber)}</title>
	<style>${ACT_A4_HTML_STYLE}</style>
</head>
<body>
	<div class="act-header">
		<div class="party-box">
			<div class="party-title">Исполнитель (Медицинская организация):</div>
			<b>${escapeXml(data.clinic.nameRu)}</b><br>
			ИНН: ${escapeXml(data.clinic.inn)} | КПП: ${escapeXml(data.clinic.kpp || "—")} | ОГРН: ${escapeXml(data.clinic.ogrn)}<br>
			Адрес: ${escapeXml(data.clinic.addressRu)}<br>
			Лицензия № ${escapeXml(data.clinic.medicalLicenseNumber)} | Тел: ${escapeXml(data.clinic.phone)}
		</div>
		<div class="party-box" style="text-align: right;">
			<div class="party-title">Заказчик (Страховщик):</div>
			<b>${escapeXml(data.insuranceCompany.nameRu)}</b><br>
			ИНН: ${escapeXml(data.insuranceCompany.inn)}<br>
			Договор ДМС № ${escapeXml(data.insuranceCompany.contractNumber)} от ${escapeXml(data.insuranceCompany.contractDate)} г.
		</div>
	</div>
	<div class="act-title">
		<h1>Акт сдачи-приемки оказанных медицинских услуг ДМС № ${escapeXml(data.registryNumber)}</h1>
		<p>к Договору ДМС № ${escapeXml(data.insuranceCompany.contractNumber)} от ${escapeXml(data.insuranceCompany.contractDate)} г. (Дата составления: ${escapeXml(data.registryDate)})</p>
	</div>
	<div class="preamble">
		Мы, нижеподписавшиеся, представитель Исполнителя в лице Главного врача <b>${escapeXml(data.clinic.chiefDoctorNameRu)}</b>, с одной стороны,
		и представитель Заказчика (Страховщика) <b>${escapeXml(data.insuranceCompany.nameRu)}</b>, с другой стороны, составили настоящий Акт о том,
		что в период с ${escapeXml(data.periodStart)} по ${escapeXml(data.periodEnd)} Исполнителем были надлежащим образом оказаны медицинские стоматологические услуги
		застрахованным лицам Заказчика согласно следующему реестру:
	</div>
	<table class="act-table">
		<thead>
			<tr>
				<th style="width: 25px;">№</th><th style="width: 60px;">Дата</th><th>Застрахованный / Полис</th>
				<th style="width: 75px;">№ Гар. письма</th><th style="width: 75px;">Код 804н</th><th>Наименование услуги</th>
				<th style="width: 30px;">Кол</th><th style="width: 65px;">Стоимость</th><th style="width: 65px;">Пациент</th>
				<th style="width: 75px;">К возмещению</th><th style="width: 90px;">Врач</th>
			</tr>
		</thead>
		<tbody>${rowsHtml}</tbody>
	</table>
	<div class="totals-summary">
		<div>
			<div style="font-size: 8.5px; text-transform: uppercase; color: #475569; font-weight: 600;">Итого к перечислению Страховщиком (прописью):</div>
			<div style="font-size: 11px; font-weight: 700; color: #0f172a; margin-top: 2px;">${escapeXml(totals.totalInsurerClaimInWordsRu)}</div>
		</div>
		<div style="text-align: right;">
			<div>Всего услуг: <b>${totals.totalRecordsCount}</b> (пациентов: <b>${totals.uniquePatientsCount}</b>)</div>
			<div>Общая стоимость: <b>${formatKopecksRu(totals.totalGrossKopecks)}</b></div>
			<div>Сооплата пациентов (франшиза): <b>${formatKopecksRu(totals.totalPatientPaidKopecks)}</b></div>
			<div style="font-size: 12px; font-weight: 800; color: #0f172a; margin-top: 3px;">К возмещению Страховщиком: ${formatKopecksRu(totals.totalInsurerClaimKopecks)}</div>
		</div>
	</div>
	<div class="legal-clauses">
		<p>1. Вышеуказанные медицинские услуги оказаны в полном объеме, своевременно и с надлежащим качеством в соответствии со стандартами медицинской помощи и условиями Договора ДМС.</p>
		<p>2. Стороны взаимных претензий по объему, качеству и срокам оказания медицинских услуг не имеют.</p>
		<p>3. Сумма к перечислению Заказчиком на расчетный счет Исполнителя: <b>${formatKopecksRu(totals.totalInsurerClaimKopecks)}</b> (${escapeXml(totals.totalInsurerClaimInWordsRu)}). НДС не облагается на основании пп. 2 п. 2 ст. 149 Налогового кодекса РФ.</p>
	</div>
	<div class="signatures">
		<div class="sign-col">
			<div class="sign-role">ОТ ИСПОЛНИТЕЛЯ:</div>
			<div>Главный врач: ________________ / ${escapeXml(data.clinic.chiefDoctorNameRu)} /</div>
			<div style="margin-top: 6px;">Главный бухгалтер: ________________ / ${escapeXml(data.clinic.chiefAccountantNameRu)} /</div>
			<div class="stamp">М.П.</div>
		</div>
		<div class="sign-col">
			<div class="sign-role">ОТ ЗАКАЗЧИКА (СТРАХОВЩИКА):</div>
			<div>Представитель: ________________ / _______________________ /</div>
			<div style="margin-top: 6px;">Доверенность № ___________ от «____» ____________ 202___ г.</div>
			<div class="stamp">М.П.</div>
		</div>
	</div>
</body>
</html>`;
}
