import {
	CATEGORY_LABELS,
	type PriceTierKind,
	type ServiceCategory,
	type ServicePricelistItem,
	SPECIALTY_LABELS,
} from "../servicePricelistPresets";
import { calculateTierPrice, formatRubles } from "./currencyMath";

function renderCategoryRows(
	catItems: readonly ServicePricelistItem[],
	tier: PriceTierKind,
): string {
	return catItems
		.map((item, idx) => {
			const price = calculateTierPrice(
				item.basePriceRub,
				tier,
				item.tierPrices?.[tier],
			);
			const code = item.statutoryCode || item.code804n;
			const statutoryTitle = item.statutoryTitle || item.statutoryTitle804n;
			return `
				<tr>
					<td class="col-num">${idx + 1}</td>
					<td class="col-code"><code>${code}</code></td>
					<td class="col-name">
						<div class="commercial-title">${item.commercialTitle}</div>
						<div class="statutory-title">${statutoryTitle}</div>
					</td>
					<td class="col-spec">${SPECIALTY_LABELS[item.specialty] ?? item.specialty}</td>
					<td class="col-price">${formatRubles(price)}</td>
				</tr>
			`;
		})
		.join("");
}

export function generateCategorySectionsHtml(
	items: readonly ServicePricelistItem[],
	tier: PriceTierKind = "standard",
): string {
	const activeItems = items.filter((i) => !i.isArchived && i.isActive);
	const groupedByCategory = new Map<
		ServiceCategory,
		ServicePricelistItem[]
	>();

	for (const item of activeItems) {
		const list = groupedByCategory.get(item.category) ?? [];
		list.push(item);
		groupedByCategory.set(item.category, list);
	}

	let categorySectionsHtml = "";

	for (const [category, catItems] of groupedByCategory.entries()) {
		const categoryTitle = CATEGORY_LABELS[category] ?? category;
		const rowsHtml = renderCategoryRows(catItems, tier);

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

	return categorySectionsHtml;
}
