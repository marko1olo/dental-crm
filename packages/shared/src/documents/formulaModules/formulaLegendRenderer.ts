import type { ToothStateData } from "./formulaTypes.js";
import { normalizeToothStatus } from "./statusNormalizer.js";
import {
	PERMANENT_UPPER_RIGHT,
	PERMANENT_UPPER_LEFT,
	PERMANENT_LOWER_RIGHT,
	PERMANENT_LOWER_LEFT,
} from "./fdiConstants.js";

export interface FormulaStatsResult {
	cariesCount: number;
	pulpitisCount: number;
	filledCount: number;
	crownCount: number;
	implantCount: number;
	missingCount: number;
	soundCount: number;
	dmftTotal: number;
	legendHtml: string;
}

export function computeFormulaStatsAndLegend(teethMap: Map<number, ToothStateData>): FormulaStatsResult {
	let cariesCount = 0;
	let pulpitisCount = 0;
	let filledCount = 0;
	let crownCount = 0;
	let implantCount = 0;
	let missingCount = 0;
	let soundCount = 0;

	for (const num of [...PERMANENT_UPPER_RIGHT, ...PERMANENT_UPPER_LEFT, ...PERMANENT_LOWER_RIGHT, ...PERMANENT_LOWER_LEFT]) {
		const t = teethMap.get(num);
		const norm = normalizeToothStatus(t?.status, t?.statusCode);
		switch (norm.category) {
			case "caries":
				cariesCount++;
				break;
			case "pulpitis":
			case "periodontitis":
				pulpitisCount++;
				break;
			case "filled":
				filledCount++;
				break;
			case "crown":
				crownCount++;
				break;
			case "implant":
				implantCount++;
				break;
			case "missing":
				missingCount++;
				break;
			default:
				soundCount++;
				break;
		}
	}

	const dmftTotal = cariesCount + pulpitisCount + filledCount + missingCount;

	const legendHtml = `
  <!-- Легенда клинических обозначений -->
  <div style="margin-top: 8px; padding-top: 6px; border-top: 1px dashed #cbd5e1; display: flex; flex-wrap: wrap; gap: 8px; font-size: 7pt; line-height: 1.2;">
    <span style="display: inline-flex; align-items: center; gap: 3px;">
      <span style="width: 8px; height: 8px; background: #ffffff; border: 1px solid #94a3b8; border-radius: 2px;"></span>
      <strong>H</strong> — Здоровый (${soundCount})
    </span>
    <span style="display: inline-flex; align-items: center; gap: 3px;">
      <span style="width: 8px; height: 8px; background: #f87171; border: 1px solid #dc2626; border-radius: 2px;"></span>
      <strong style="color: #dc2626;">C</strong> — Кариес (${cariesCount})
    </span>
    <span style="display: inline-flex; align-items: center; gap: 3px;">
      <span style="width: 8px; height: 8px; background: #ef4444; border: 1px solid #991b1b; border-radius: 2px;"></span>
      <strong style="color: #991b1b;">P/Pt</strong> — Пульпит/Периодонтит (${pulpitisCount})
    </span>
    <span style="display: inline-flex; align-items: center; gap: 3px;">
      <span style="width: 8px; height: 8px; background: #34d399; border: 1px solid #059669; border-radius: 2px;"></span>
      <strong style="color: #059669;">П</strong> — Пломба (${filledCount})
    </span>
    <span style="display: inline-flex; align-items: center; gap: 3px;">
      <span style="width: 8px; height: 8px; background: #60a5fa; border: 1px solid #2563eb; border-radius: 2px;"></span>
      <strong style="color: #2563eb;">К</strong> — Коронка (${crownCount})
    </span>
    <span style="display: inline-flex; align-items: center; gap: 3px;">
      <span style="width: 8px; height: 8px; background: #818cf8; border: 1px solid #4f46e5; border-radius: 2px;"></span>
      <strong style="color: #4f46e5;">И</strong> — Имплантат (${implantCount})
    </span>
    <span style="display: inline-flex; align-items: center; gap: 3px;">
      <span style="width: 8px; height: 8px; background: #e2e8f0; border: 1px solid #94a3b8; border-radius: 2px;"></span>
      <strong style="color: #64748b;">0</strong> — Отсутствует (${missingCount})
    </span>
  </div>`;

	return {
		cariesCount,
		pulpitisCount,
		filledCount,
		crownCount,
		implantCount,
		missingCount,
		soundCount,
		dmftTotal,
		legendHtml,
	};
}
