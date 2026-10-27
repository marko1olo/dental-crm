/**
 * PerioExpressTherapistRow.tsx — Дополнительные клинические шаблоны (гингивит, пародонтит I/III, камень).
 * Архитектурный слой Layer 4: Secondary Presets (Мандат 8b, <= 120 строк).
 */

import React from "react";
import { UltrasonicScaler } from "../../icons/DentalIcons";
import type { PerioExpressPresetId } from "../perioMath";

export interface PerioExpressTherapistRowProps {
	readonly readOnly?: boolean | undefined;
	readonly onApplyExpressPreset: (presetId: PerioExpressPresetId) => void;
	readonly onApplyTherapistPreset: (presetId: string) => void;
}

export const PerioExpressTherapistRow: React.FC<PerioExpressTherapistRowProps> = React.memo(({
	readOnly = false, onApplyExpressPreset, onApplyTherapistPreset,
}) => {
	return (
		<div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-[var(--line)]/50">
			<span className="text-[12px] text-[var(--muted)] font-semibold mr-1 shrink-0">Дополнительные шаблоны:</span>
			<button
				type="button" aria-disabled={readOnly} onClick={() => !readOnly && onApplyExpressPreset("pro_hygiene_express")}
				className="secondary-button shrink-0" data-testid="perio-preset-pro-hygiene-card"
			>
				<UltrasonicScaler size={13} className="text-cyan-600 dark:text-cyan-400" />
				<span>Профгигиена (полный протокол)</span>
			</button>
			<button
				type="button" aria-disabled={readOnly} onClick={() => !readOnly && onApplyTherapistPreset("gingivitis_localized")}
				className="secondary-button shrink-0"
			>
				<span>Гингивит лок.</span>
			</button>
			<button
				type="button" aria-disabled={readOnly} onClick={() => !readOnly && onApplyTherapistPreset("gingivitis_generalized")}
				className="secondary-button shrink-0"
			>
				<span>Гингивит генер.</span>
			</button>
			<button
				type="button" aria-disabled={readOnly} onClick={() => !readOnly && onApplyTherapistPreset("periodontitis_mild")}
				className="secondary-button shrink-0"
			>
				<span>Пародонтит I ст.</span>
			</button>
			<button
				type="button" aria-disabled={readOnly} onClick={() => !readOnly && onApplyTherapistPreset("periodontitis_severe")}
				className="secondary-button shrink-0"
			>
				<span>Пародонтит III ст.</span>
			</button>
			<button
				type="button" aria-disabled={readOnly} onClick={() => !readOnly && onApplyTherapistPreset("dental_calculus")}
				className="secondary-button shrink-0"
			>
				<span>Зубные отложения</span>
			</button>
		</div>
	);
});

PerioExpressTherapistRow.displayName = "PerioExpressTherapistRow";
