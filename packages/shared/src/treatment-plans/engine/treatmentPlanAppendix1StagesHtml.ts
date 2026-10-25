/**
 * treatmentPlanAppendix1StagesHtml.ts — Генерация HTML-таблиц этапов для Приложения №1.
 */

import type { TreatmentPlanStageSummary } from "./types.js";
import { escapeHtml, formatRublesFromKopecks } from "./treatmentPlanFormatters.js";

export function renderAppendix1StagesHtml(stages: readonly TreatmentPlanStageSummary[]): string {
	let itemCounter = 0;

	return stages
		.filter((s) => s.itemCount > 0)
		.map((stage) => {
			const itemsRows = stage.items.map((it) => {
				itemCounter += 1;
				const toothDisplay = it.toothNumber ? `Зуб ${it.toothNumber}` : "—";
				const surfacesDisplay = it.surfaces.length > 0 ? ` (${it.surfaces.join(", ")})` : "";
				const materialDisplay = it.materialNameRu ? `<br><small style="color: #475569;">Материал: ${escapeHtml(it.materialNameRu)}</small>` : "";

				return `<tr>
					<td style="text-align: center; border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 11px;">${itemCounter}</td>
					<td style="text-align: center; border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 11px; font-weight: bold; font-family: monospace;">${escapeHtml(it.code804n)}</td>
					<td style="border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 11px;"><strong>${escapeHtml(it.nameRu)}</strong>${surfacesDisplay}${materialDisplay}</td>
					<td style="text-align: center; border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 11px; font-weight: bold;">${toothDisplay}</td>
					<td style="text-align: center; border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 11px;">${it.quantity}</td>
					<td style="text-align: right; border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 11px;">${formatRublesFromKopecks(it.unitPriceKopecks)}</td>
					<td style="text-align: right; border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 11px;">${formatRublesFromKopecks(it.discountKopecks)}</td>
					<td style="text-align: right; border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 11px; font-weight: bold;">${formatRublesFromKopecks(it.totalCostKopecks)}</td>
				</tr>`;
			}).join("");

			return `
			<div class="stage-section" style="margin-top: 14px; margin-bottom: 14px; page-break-inside: avoid;">
				<div style="background-color: #f1f5f9; padding: 8px 12px; border-left: 4px solid #0284c7; font-weight: bold; font-size: 12px; margin-bottom: 4px; display: flex; justify-content: space-between;">
					<span>${escapeHtml(stage.titleRu)}</span>
					<span style="color: #0369a1;">Итого по этапу: ${formatRublesFromKopecks(stage.stageCostKopecks)}</span>
				</div>
				<p style="font-size: 10px; color: #64748b; margin: 2px 0 6px 0; font-style: italic;">Цель этапа: ${escapeHtml(stage.clinicalGoalRu)} (Ориентировочно: ${stage.estimatedVisits} визита(ов), ${stage.estimatedDurationDays} дн.)</p>
				<table style="width: 100%; border-collapse: collapse; margin-bottom: 6px;">
					<thead>
						<tr style="background-color: #f8fafc; font-size: 10px; text-transform: uppercase; color: #475569;">
							<th style="border: 1px solid #cbd5e1; padding: 6px; width: 30px;">№</th>
							<th style="border: 1px solid #cbd5e1; padding: 6px; width: 90px;">Код Приказа МЗ РФ № 804н</th>
							<th style="border: 1px solid #cbd5e1; padding: 6px;">Наименование медицинской услуги</th>
							<th style="border: 1px solid #cbd5e1; padding: 6px; width: 60px;">Зуб</th>
							<th style="border: 1px solid #cbd5e1; padding: 6px; width: 40px;">Кол-во</th>
							<th style="border: 1px solid #cbd5e1; padding: 6px; width: 75px;">Цена, руб.</th>
							<th style="border: 1px solid #cbd5e1; padding: 6px; width: 65px;">Скидка</th>
							<th style="border: 1px solid #cbd5e1; padding: 6px; width: 85px;">Стоимость</th>
						</tr>
					</thead>
					<tbody>${itemsRows}</tbody>
				</table>
			</div>`;
		}).join("");
}
