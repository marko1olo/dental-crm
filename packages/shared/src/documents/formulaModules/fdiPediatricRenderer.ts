import type { ToothStateData } from "./formulaTypes.js";
import {
	DECIDUOUS_UPPER_RIGHT,
	DECIDUOUS_UPPER_LEFT,
	DECIDUOUS_LOWER_RIGHT,
	DECIDUOUS_LOWER_LEFT,
} from "./fdiConstants.js";
import { renderQuadrantHtml } from "./quadrantRenderer.js";

/**
 * Рендерит секцию молочного прикуса (51..85) в HTML, если обнаружены временные зубы.
 */
export function renderDeciduousArchesHtml(
	teethMap: Map<number, ToothStateData>,
	showDeciduous?: boolean,
): string {
	const hasDeciduousTeeth =
		showDeciduous ||
		Array.from(teethMap.keys()).some((num) => num >= 51 && num <= 85);

	if (!hasDeciduousTeeth) return "";

	return `
  <!-- Молочный прикус (верхний ряд 55..51 и 61..65) -->
  <div style="margin: 4px 0; padding: 4px 8px; background: #f8fafc; border-radius: 4px;">
    <div style="text-align: center; font-size: 6.5pt; color: #64748b; margin-bottom: 2px; text-transform: uppercase; font-weight: 700;">
      Молочный прикус (55–51 | 61–65)
    </div>
    <div style="display: flex; gap: 4px; align-items: center; max-width: 70%; margin: 0 auto;">
      ${renderQuadrantHtml(DECIDUOUS_UPPER_RIGHT, teethMap, true)}
      <div style="width: 2px; height: 40px; background: #94a3b8; flex-shrink: 0;"></div>
      ${renderQuadrantHtml(DECIDUOUS_UPPER_LEFT, teethMap, true)}
    </div>
  </div>

  <!-- Молочный прикус (нижний ряд 85..81 и 71..75) -->
  <div style="margin: 4px 0; padding: 4px 8px; background: #f8fafc; border-radius: 4px;">
    <div style="display: flex; gap: 4px; align-items: center; max-width: 70%; margin: 0 auto;">
      ${renderQuadrantHtml(DECIDUOUS_LOWER_RIGHT, teethMap, false)}
      <div style="width: 2px; height: 40px; background: #94a3b8; flex-shrink: 0;"></div>
      ${renderQuadrantHtml(DECIDUOUS_LOWER_LEFT, teethMap, false)}
    </div>
    <div style="text-align: center; font-size: 6.5pt; color: #64748b; margin-top: 2px; text-transform: uppercase; font-weight: 700;">
      Молочный прикус (85–81 | 71–75)
    </div>
  </div>
  `;
}
