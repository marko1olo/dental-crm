import type React from "react";
import { memo } from "react";
import { getToothFolkAndAnatomicalNameRu } from "../../../../lib/clinicalProtocols";
import { type ToothState, TOOTH_STATE_LABELS } from "../toothChartTypes";

export interface ToothCarouselHeaderProps {
	toothNumber: number;
	currentState: ToothState;
}

export const ToothCarouselHeader: React.FC<ToothCarouselHeaderProps> = memo(({
	toothNumber,
	currentState,
}) => {
	return (
		<div className="flex flex-col items-center text-center w-full px-2">
			<div className="flex items-center gap-2">
				<span className="w-8 h-8 rounded-xl bg-teal-500/15 border border-teal-500/30 text-[var(--teal,#0d9488)] font-black text-lg flex items-center justify-center font-mono">
					{toothNumber}
				</span>
				<h3 className="text-sm font-extrabold text-[var(--odontogram-ink)] leading-tight truncate">
					{getToothFolkAndAnatomicalNameRu(toothNumber)}
				</h3>
			</div>
			<span className="text-xs text-[var(--odontogram-ink-muted)] mt-0.5">
				Статус: <strong className="text-[var(--odontogram-ink)] font-bold">{TOOTH_STATE_LABELS[currentState]}</strong>
			</span>
		</div>
	);
});
ToothCarouselHeader.displayName = "ToothCarouselHeader";
