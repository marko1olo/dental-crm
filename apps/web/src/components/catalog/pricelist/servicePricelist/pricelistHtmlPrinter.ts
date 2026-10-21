import {
	PRICE_TIER_LABELS,
	type PriceTierKind,
	type ServicePricelistItem,
} from "../servicePricelistPresets";
import { generateCategorySectionsHtml } from "./pricelistHtmlCategorySections";
import { PRICELIST_PRINT_CSS } from "./pricelistHtmlPrinterStyles";
import type { ClinicPricelistPrintInfo } from "./types";

/**
 * Generates an official printable A4 document for clinic patients and reception.
 */
export function generatePrintablePricelistHtml(
	clinicInfo: ClinicPricelistPrintInfo,
	items: readonly ServicePricelistItem[],
	tier: PriceTierKind = "standard",
): string {
	const categorySectionsHtml = generateCategorySectionsHtml(items, tier);

	return `
<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Прейскурант стоматологических услуг — ${clinicInfo.clinicName}</title>
	<style>
		${PRICELIST_PRINT_CSS}
	</style>
</head>
<body>
	<div class="header">
		<div class="clinic-info">
			<h1>${clinicInfo.clinicName}</h1>
			<div class="clinic-details">
				<div>${clinicInfo.clinicAddress}${clinicInfo.clinicPhone ? ` · Тел: ${clinicInfo.clinicPhone}` : ""}</div>
				<div>Лицензия на осуществление медицинской деятельности: ${clinicInfo.clinicLicense}</div>
				${clinicInfo.inn || clinicInfo.ogrn ? `<div>${clinicInfo.inn ? `ИНН: ${clinicInfo.inn}` : ""}${clinicInfo.inn && clinicInfo.ogrn ? " · " : ""}${clinicInfo.ogrn ? `ОГРН: ${clinicInfo.ogrn}` : ""}</div>` : ""}
			</div>
		</div>
		<div class="approval-block">
			<div class="title">УТВЕРЖДАЮ:</div>
			<div>Главный врач</div>
			<div>${clinicInfo.chiefDoctorName}</div>
			<div>«___» ____________ 2026 г.</div>
		</div>
	</div>

	<div class="pricelist-title-banner">
		${clinicInfo.isConsumerCornerStand ? '<div style="font-size: 8pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #0284c7; margin-bottom: 2px;">Информационный стенд «Уголок потребителя»</div>' : ""}
		<h2>ПРЕЙСКУРАНТ СТОМАТОЛОГИЧЕСКИХ УСЛУГ КЛИНИКИ</h2>
		<div class="sub">
			Введен в действие с ${clinicInfo.effectiveDateRu} г. (${PRICE_TIER_LABELS[tier]})
			· Прейскурант стоматологических услуг клиники
		</div>
	</div>

	${categorySectionsHtml}

	<div class="footer-legal">
		<strong>Правовое основание и информация для потребителей:</strong>
		Все медицинские стоматологические услуги оказываются в соответствии с законодательством Российской Федерации,
		Правилами предоставления платных медицинских услуг (Постановление Правительства РФ № 736),
		Законом РФ № 2300-1 «О защите прав потребителей» и клиническими рекомендациями Стоматологической Ассоциации России (СтАР).
		На основании подпункта 2 пункта 2 статьи 149 Налогового кодекса Российской Федерации медицинские услуги
		НДС не облагаются (0%).
		${clinicInfo.isConsumerCornerStand ? '<div style="margin-top: 4px;">Сведения о надзорных органах: Территориальный орган Росздравнадзора, Управление Роспотребнадзора, орган исполнительной власти субъекта РФ в сфере охраны здоровья. Прейскурант доступен для ознакомления каждому пациенту по первому требованию.</div>' : ""}
	</div>

	<div class="signatures">
		<div>
			<div>Генеральный директор / Главный врач: ____________________ / ${clinicInfo.chiefDoctorName}</div>
			<div class="sign-line">подпись, М.П.</div>
		</div>
		<div>
			<div>Главный бухгалтер: ____________________ / ____________________</div>
			<div class="sign-line">подпись</div>
		</div>
	</div>
</body>
</html>
	`.trim();
}
