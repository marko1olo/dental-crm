import type { ToothStateData } from "./formulaTypes.js";
import { normalizeToothStatus } from "./statusNormalizer.js";
import { renderToothSvg } from "./toothSvgRenderer.js";

/**
 * Рендерит отдельный квадрант зубного ряда (8 зубов) в HTML.
 */
export function renderQuadrantHtml(
	teethNumbers: readonly number[],
	teethMap: Map<number, ToothStateData>,
	isUpper: boolean,
): string {
	const cells = teethNumbers.map((num) => {
		const toothData = teethMap.get(num);
		const statusInfo = normalizeToothStatus(toothData?.status, toothData?.statusCode);

		return `
      <div class="fdi-tooth-cell" style="
        flex: 1;
        min-width: 0;
        text-align: center;
        padding: 3px 1px;
        background: ${statusInfo.category !== "sound" ? statusInfo.badgeBg : "#ffffff"};
        border: 1px solid ${statusInfo.category !== "sound" ? statusInfo.color : "#e2e8f0"};
        border-radius: 4px;
        margin: 0 1px;
        box-sizing: border-box;
      ">
        <div style="font-size: 8pt; font-weight: 800; color: #0f172a; line-height: 1;">
          ${num}
        </div>
        <div style="margin: 2px 0;">
          ${renderToothSvg(num, statusInfo, isUpper)}
        </div>
        <div style="
          font-size: 7pt;
          font-weight: 700;
          color: ${statusInfo.color};
          line-height: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        ">
          ${statusInfo.code}
        </div>
      </div>
    `;
	}).join("");

	return `
    <div style="display: flex; flex: 1; gap: 1px;">
      ${cells}
    </div>
  `;
}
