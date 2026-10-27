import { compileCompletedWorksAct } from "./invoiceActCompiler";
import { invoicePrintStyles } from "./invoiceHtmlStyles";
import type { CompletedWorksActParams } from "./invoiceTypes";

/**
 * Generates official printable HTML for Act of Completed Works & Warranty Certificate (A4).
 */
export function generateCompletedActAndWarrantyHtml(params: CompletedWorksActParams): string {
	const summary = compileCompletedWorksAct(params);
	const actDateStr = params.actDateIso ? new Date(params.actDateIso).toLocaleDateString("ru-RU") : new Date().toLocaleDateString("ru-RU");
	const contractDateStr = params.contractDateIso ? new Date(params.contractDateIso).toLocaleDateString("ru-RU") : actDateStr;

	return `<!DOCTYPE html>
<html lang="ru"><head><meta charset="UTF-8"><title>Акт выполненных работ и гарантийный талон № ${params.actNumber}</title>
<style>${invoicePrintStyles}</style></head>
<body>
	<table class="header-table">
		<tr>
			<td style="width: 60%;">
				<div class="clinic-title">${params.clinic.legalName || params.clinic.name}</div>
				<div>Лицензия № ${params.clinic.licenseNumber || "ЛО41-01137-77/00368421"} от ${params.clinic.licenseDate || "12.10.2021"} г.</div>
				<div>Адрес: ${params.clinic.address}</div>
			</td>
			<td style="width: 40%; text-align: right;">
				<div>ИНН: ${params.clinic.inn} / КПП: ${params.clinic.kpp || "770101001"}</div>
				<div>ОГРН: ${params.clinic.ogrn || "1027700132195"}</div>
				<div>Телефон: <strong>${params.clinic.phone || "+7 (495) 789-01-23"}</strong></div>
			</td>
		</tr>
	</table>
	<div class="doc-title">АКТ ВЫПОЛНЕННЫХ РАБОТ И ГАРАНТИЙНЫЙ ТАЛОН № ${params.actNumber}</div>
	<div class="doc-subtitle">к Договору на оказание платных медицинских услуг № ${params.contractNumber} от ${contractDateStr} г. • Дата составления: <strong>${actDateStr} г.</strong></div>
	<table class="requisites-grid">
		<tr>
			<td class="lbl">Исполнитель:</td><td>${params.clinic.legalName}, ИНН ${params.clinic.inn}</td>
			<td class="lbl">Пациент (Заказчик):</td><td><strong>${params.patient.fullName}</strong>${params.patient.birthDate ? ` (${new Date(params.patient.birthDate).toLocaleDateString("ru-RU")} г.р.)` : ""}</td>
		</tr>
		<tr>
			<td class="lbl">Лечащий врач:</td><td>${params.doctor.fullName}${params.doctor.specialty ? ` (${params.doctor.specialty})` : ""}</td>
			<td class="lbl">Паспорт / Документ:</td><td>${params.patient.passportData || "Предъявлен при первичном приеме"}</td>
		</tr>
		<tr>
			<td class="lbl">Медкарта №:</td><td>${params.patient.medicalCardNumber || "043/у"} (ID: ${params.patient.id || "—"})</td>
			<td class="lbl">Контактный телефон:</td><td>${params.patient.phone || "—"}</td>
		</tr>
	</table>
	<table class="items-table">
		<thead>
			<tr><th style="width: 25px;">№</th><th style="width: 75px;">Код услуги</th><th style="width: 45px;">Зуб</th><th>Наименование оказанной медицинской услуги / работы</th><th style="width: 40px;">Кол.</th><th style="width: 70px;">Цена, ₽</th><th style="width: 80px;">Сумма, ₽</th></tr>
		</thead>
		<tbody>
			${summary.items.map((it, idx) => {
				const sum = it.isWarranty ? 0 : Math.max(0, it.priceRub * it.quantity - (it.discountRub || 0));
				const nameDisplay = it.isWarranty ? `${it.name} <span style="color: #0d9488; font-weight: bold;">[ГАРАНТИЙНАЯ ПЕРЕДЕЛКА 100%]</span>` : it.name;
				return `<tr><td class="num-cell">${idx + 1}</td><td class="num-cell">${it.code804n || "—"}</td><td class="num-cell font-bold">${it.toothNumber || "—"}</td><td>${nameDisplay}</td><td class="num-cell">${it.quantity}</td><td class="money-cell">${it.priceRub.toFixed(2)}</td><td class="money-cell">${sum.toFixed(2)}</td></tr>`;
			}).join("")}
			<tr style="background-color: #f5f5f5; font-weight: bold;"><td colspan="6" style="text-align: right; text-transform: uppercase;">Итого оказано услуг (Без НДС, ст. 149 НК РФ):</td><td class="money-cell" style="font-size: 11pt;">${summary.totalNetRubFormatted} ₽</td></tr>
		</tbody>
	</table>
	<div style="font-size: 9.5pt; margin-bottom: 10px;"><strong>Сумма прописью:</strong> <em>${summary.totalInWords}</em>.</div>
	<div class="warranty-box">
		<div class="warranty-title">ГАРАНТИЙНЫЙ ТАЛОН И ОБЯЗАТЕЛЬСТВА КЛИНИКИ (СтАР и Закон РФ № 2300-1)</div>
		<table class="items-table" style="margin-bottom: 4px; background: #fff;">
			<thead><tr><th>Категория работы / Область</th><th>Зубы</th><th>Гарантийный срок</th><th>Срок службы</th><th>Условия сохранения гарантии</th></tr></thead>
			<tbody>
				${summary.warrantyTerms.map((w) => `<tr><td style="font-weight: bold;">${w.categoryName}</td><td class="num-cell">${w.teethDisplay}</td><td style="color: #047857; font-weight: bold;">${w.warrantyPeriodText}</td><td>${w.serviceLifeText}</td><td style="font-size: 8.5pt;">${w.conditionsText}</td></tr>`).join("")}
			</tbody>
		</table>
		<div class="legal-text">
			1. Услуги выполнены в полном объеме, надлежащего качества и в установленный срок в соответствии с клиническими рекомендациями Минздрава РФ. Заказчик претензий по объему, качеству и срокам к Исполнителю не имеет.<br>
			2. Гарантия сохраняется при условии соблюдения гигиены полости рта и прохождения бесплатных профилактических осмотров и профессиональной гигиены 1 раз в 6 месяцев.
		</div>
	</div>
	<table class="signatures">
		<tr>
			<td>
				<div><strong>Исполнитель:</strong> ${params.clinic.legalName}</div>
				<div>Главный врач / Лечащий врач: <strong>${params.doctor.fullName}</strong></div>
				<div class="sign-line"><span>Подпись: __________________</span><span>/ ${params.doctor.fullName} /</span></div>
				<div style="display: flex; gap: 15px; align-items: center; margin-top: 10px;"><div class="paid-badge">ОПЛАЧЕНО</div><div class="stamp-place">М.П.<br>Клиники</div></div>
			</td>
			<td>
				<div><strong>Пациент (Заказчик):</strong></div><div>ФИО: <strong>${params.patient.fullName}</strong></div>
				<div class="sign-line"><span>Подпись: __________________</span><span>/ ${params.patient.fullName} /</span></div>
				<div style="font-size: 8pt; color: #555; margin-top: 12px; line-height: 1.3;">С объемом, стоимостью оказанных услуг и условиями гарантийного обслуживания ознакомлен и согласен. Работу принял.</div>
			</td>
		</tr>
	</table>
</body></html>`;
}
