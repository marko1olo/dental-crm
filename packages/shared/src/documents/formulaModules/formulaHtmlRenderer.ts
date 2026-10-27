import type { GraphicalDentalFormulaOptions } from "./formulaTypes.js";
import {
	PERMANENT_UPPER_RIGHT,
	PERMANENT_UPPER_LEFT,
	PERMANENT_LOWER_RIGHT,
	PERMANENT_LOWER_LEFT,
} from "./fdiConstants.js";
import { buildConsolidatedTeethMap } from "./teethMapBuilder.js";
import { renderQuadrantHtml } from "./quadrantRenderer.js";
import { computeFormulaStatsAndLegend } from "./formulaLegendRenderer.js";
import { renderDeciduousArchesHtml } from "./fdiPediatricRenderer.js";

/**
 * Рендерит полиграфическую векторную зубную формулу FDI (11..48 и 51..85)
 * в печатные бланки планов лечения и амбулаторной карты пациента.
 */
export function renderGraphicalDentalFormulaHtml(options: GraphicalDentalFormulaOptions = {}): string {
	const teethMap = buildConsolidatedTeethMap(options);
	const stats = computeFormulaStatsAndLegend(teethMap);
	const title = options.title || "Зубная формула пациента (FDI World Dental Federation)";
	const deciduousSection = renderDeciduousArchesHtml(teethMap, options.showDeciduous);

	return `
<!-- BEGIN_GRAPHICAL_DENTAL_FORMULA -->
<div class="dental-formula-container" style="
  box-sizing: border-box;
  margin: 10px 0 14px 0;
  padding: 10px 12px;
  background: #ffffff;
  border: 1.5px solid #0f172a;
  border-radius: 6px;
  font-family: 'PT Astra Sans', Arial, Helvetica, sans-serif;
  page-break-inside: avoid;
  break-inside: avoid;
">
  <!-- Заголовок схемы -->
  <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; margin-bottom: 8px;">
    <div style="font-size: 9pt; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.3px;">
      ${title}
    </div>
    <div style="font-size: 8pt; color: #475569;">
      Индекс КПУ(з): <strong style="color: #0369a1; font-size: 9pt;">${stats.dmftTotal}</strong> (К=${stats.cariesCount + stats.pulpitisCount}, П=${stats.filledCount}, У=${stats.missingCount})
    </div>
  </div>

  <!-- Верхняя челюсть -->
  <div style="margin-bottom: 6px;">
    <div style="display: flex; justify-content: space-between; font-size: 7pt; font-weight: 700; color: #475569; text-transform: uppercase; margin-bottom: 2px;">
      <span>Верхняя челюсть справа (18–11)</span>
      <span style="color: #0284c7;">Сагиттальная линия</span>
      <span>Верхняя челюсть слева (21–28)</span>
    </div>
    <div style="display: flex; gap: 4px; align-items: center;">
      ${renderQuadrantHtml(PERMANENT_UPPER_RIGHT, teethMap, true)}
      <div style="width: 2px; height: 50px; background: #0284c7; flex-shrink: 0;" title="Срединная линия"></div>
      ${renderQuadrantHtml(PERMANENT_UPPER_LEFT, teethMap, true)}
    </div>
  </div>

  ${deciduousSection}

  <!-- Разделитель челюстей (Окклюзионная плоскость) -->
  <div style="display: flex; align-items: center; margin: 4px 0;">
    <div style="flex: 1; height: 1.5px; background: #0f172a;"></div>
    <span style="font-size: 7pt; font-weight: 800; color: #0f172a; padding: 0 8px; text-transform: uppercase; letter-spacing: 0.5px;">
      Окклюзионная линия смыкания
    </span>
    <div style="flex: 1; height: 1.5px; background: #0f172a;"></div>
  </div>

  <!-- Нижняя челюсть -->
  <div style="margin-top: 6px;">
    <div style="display: flex; gap: 4px; align-items: center;">
      ${renderQuadrantHtml(PERMANENT_LOWER_RIGHT, teethMap, false)}
      <div style="width: 2px; height: 50px; background: #0284c7; flex-shrink: 0;" title="Срединная линия"></div>
      ${renderQuadrantHtml(PERMANENT_LOWER_LEFT, teethMap, false)}
    </div>
    <div style="display: flex; justify-content: space-between; font-size: 7pt; font-weight: 700; color: #475569; text-transform: uppercase; margin-top: 2px;">
      <span>Нижняя челюсть справа (48–41)</span>
      <span style="color: #0284c7;">Сагиттальная линия</span>
      <span>Нижняя челюсть слева (31–38)</span>
    </div>
  </div>

  ${stats.legendHtml}
</div>
<!-- END_GRAPHICAL_DENTAL_FORMULA -->
  `;
}
