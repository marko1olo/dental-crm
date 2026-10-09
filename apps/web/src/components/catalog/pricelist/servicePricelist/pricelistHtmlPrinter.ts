import {
	CATEGORY_LABELS,
	PRICE_TIER_LABELS,
	SPECIALTY_LABELS,
	type Order804nCategory,
	type PriceTierKind,
	type ServicePricelistItem,
} from '../servicePricelistPresets';
import { calculateTierPrice, formatRubles } from './currencyMath';
import type { ClinicPricelistPrintInfo } from './types';

// =============================================================================
// LAYER 2: PRINTABLE OFFICIAL CLINIC PRICELIST HTML GENERATOR (A4)
// =============================================================================

/**
 * Generates an official printable A4 document with statutory compliance headers.
 */
export function generatePrintablePricelistHtml(
	clinicInfo: ClinicPricelistPrintInfo,
	items: readonly ServicePricelistItem[],
	tier: PriceTierKind = 'standard',
): string {
	const activeItems = items.filter((i) => !i.isArchived && i.isActive);

	// Group items by category
	const groupedByCategory = new Map<Order804nCategory, ServicePricelistItem[]>();
	for (const item of activeItems) {
		const list = groupedByCategory.get(item.category) ?? [];
		list.push(item);
		groupedByCategory.set(item.category, list);
	}

	let categorySectionsHtml = '';

	for (const [category, catItems] of groupedByCategory.entries()) {
		const categoryTitle = CATEGORY_LABELS[category] ?? category;

		const rowsHtml = catItems
			.map((item, idx) => {
				const price = calculateTierPrice(item.basePriceRub, tier, item.tierPrices?.[tier]);
				return `
					<tr>
						<td class="col-num">${idx + 1}</td>
						<td class="col-code"><code>${item.code804n}</code></td>
						<td class="col-name">
							<div class="commercial-title">${item.commercialTitle}</div>
							<div class="statutory-title">${item.statutoryTitle804n}</div>
						</td>
						<td class="col-spec">${SPECIALTY_LABELS[item.specialty] ?? item.specialty}</td>
						<td class="col-price">${formatRubles(price)}</td>
					</tr>
				`;
			})
			.join('');

		categorySectionsHtml += `
			<div class="pricelist-category-section">
				<h3 class="category-heading">${categoryTitle}</h3>
				<table class="pricelist-table">
					<thead>
						<tr>
							<th class="col-num">№</th>
							<th class="col-code">Код услуги</th>
							<th class="col-name">Наименование медицинской услуги</th>
							<th class="col-spec">Специальность</th>
							<th class="col-price">Цена (руб.)</th>
						</tr>
					</thead>
					<tbody>
						${rowsHtml}
					</tbody>
				</table>
			</div>
		`;
	}

	return `
<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Официальный прейскурант медицинских услуг — ${clinicInfo.clinicName}</title>
	<style>
		@page {
			size: A4;
			margin: 15mm 12mm 15mm 12mm;
		}
		body {
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
			color: #111827;
			background: #ffffff;
			margin: 0;
			padding: 0;
			font-size: 9.5pt;
			line-height: 1.35;
		}
		.header {
			border-bottom: 2px solid #0284c7;
			padding-bottom: 8px;
			margin-bottom: 12px;
			display: flex;
			justify-content: space-between;
			align-items: flex-start;
		}
		.clinic-info h1 {
			margin: 0 0 4px 0;
			font-size: 14pt;
			color: #0f172a;
			font-weight: 800;
			text-transform: uppercase;
		}
		.clinic-details {
			font-size: 8pt;
			color: #475569;
		}
		.approval-block {
			text-align: right;
			font-size: 8pt;
			border: 1px dashed #94a3b8;
			padding: 6px 10px;
			border-radius: 4px;
		}
		.approval-block .title {
			font-weight: bold;
			text-transform: uppercase;
		}
		.pricelist-title-banner {
			text-align: center;
			margin: 12px 0 16px 0;
		}
		.pricelist-title-banner h2 {
			margin: 0;
			font-size: 12pt;
			font-weight: 800;
			color: #0f172a;
		}
		.pricelist-title-banner .sub {
			font-size: 8pt;
			color: #64748b;
			margin-top: 2px;
		}
		.category-heading {
			background: #f1f5f9;
			border-left: 4px solid #0284c7;
			padding: 4px 8px;
			margin: 14px 0 6px 0;
			font-size: 10pt;
			font-weight: 700;
			color: #0f172a;
			page-break-after: avoid;
		}
		.pricelist-table {
			width: 100%;
			border-collapse: collapse;
			margin-bottom: 8px;
			font-size: 8.5pt;
			page-break-inside: auto;
		}
		.pricelist-table tr {
			page-break-inside: avoid;
			page-break-after: auto;
		}
		.pricelist-table th {
			background: #f8fafc;
			border: 1px solid #cbd5e1;
			padding: 5px 6px;
			font-weight: 700;
			text-align: left;
			font-size: 8pt;
			color: #334155;
		}
		.pricelist-table td {
			border: 1px solid #e2e8f0;
			padding: 4px 6px;
			vertical-align: top;
		}
		.col-num { width: 24px; text-align: center; color: #64748b; }
		.col-code { width: 95px; font-weight: 600; }
		.col-code code { font-family: monospace; font-size: 8pt; color: #0369a1; }
		.col-name { width: auto; }
		.commercial-title { font-weight: 600; color: #0f172a; }
		.statutory-title { font-size: 7.5pt; color: #64748b; margin-top: 1px; }
		.col-spec { width: 130px; font-size: 7.5pt; color: #475569; }
		.col-price { width: 85px; text-align: right; font-weight: 700; color: #0f172a; font-variant-numeric: tabular-nums; }
		.footer-legal {
			margin-top: 20px;
			border-top: 1px solid #cbd5e1;
			padding-top: 10px;
			font-size: 7.5pt;
			color: #64748b;
			page-break-inside: avoid;
		}
		.signatures {
			display: flex;
			justify-content: space-between;
			margin-top: 24px;
			padding-top: 12px;
			font-size: 8.5pt;
			page-break-inside: avoid;
		}
		.sign-line {
			border-top: 1px solid #000000;
			width: 200px;
			margin-top: 30px;
			text-align: center;
			font-size: 7.5pt;
			color: #64748b;
		}
	</style>
</head>
<body>
	<div class="header">
		<div class="clinic-info">
			<h1>${clinicInfo.clinicName}</h1>
			<div class="clinic-details">
				<div>${clinicInfo.clinicAddress}${clinicInfo.clinicPhone ? ` · Тел: ${clinicInfo.clinicPhone}` : ''}</div>
				<div>Лицензия на осуществление медицинской деятельности: ${clinicInfo.clinicLicense}</div>
				${clinicInfo.inn || clinicInfo.ogrn ? `<div>${clinicInfo.inn ? `ИНН: ${clinicInfo.inn}` : ''}${clinicInfo.inn && clinicInfo.ogrn ? ' · ' : ''}${clinicInfo.ogrn ? `ОГРН: ${clinicInfo.ogrn}` : ''}</div>` : ''}
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
		${clinicInfo.isConsumerCornerStand ? '<div style="font-size: 8pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #0284c7; margin-bottom: 2px;">Информационный стенд «Уголок потребителя»</div>' : ''}
		<h2>ПРЕЙСКУРАНТ ЦЕН НА МЕДИЦИНСКИЕ СТОМАТОЛОГИЧЕСКИЕ УСЛУГИ</h2>
		<div class="sub">
			Введен в действие с ${clinicInfo.effectiveDateRu} г. (${PRICE_TIER_LABELS[tier]})
			· Номенклатура услуг составлена в строгом соответствии с Приказом Минздрава России № 804н
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
		${clinicInfo.isConsumerCornerStand ? '<div style="margin-top: 4px;">Сведения о надзорных органах: Территориальный орган Росздравнадзора, Управление Роспотребнадзора, орган исполнительной власти субъекта РФ в сфере охраны здоровья. Прейскурант доступен для ознакомления каждому пациенту по первому требованию.</div>' : ''}
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
