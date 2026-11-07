import { X } from "lucide-react";
import type React from "react";
import { getToothFolkAndAnatomicalNameRu } from "../../../lib/clinicalProtocols";
import { TOOTH_STATE_LABELS, type ToothState } from "../ToothChart";

export interface ToothRadialHeaderProps {
	readonly toothNumber: number;
	readonly currentState?: ToothState | undefined;
	readonly onClose: () => void;
	readonly isMobile?: boolean | undefined;
	readonly selectedTeethCount?: number | undefined;
}

export const ToothRadialHeader: React.FC<ToothRadialHeaderProps> = ({
	toothNumber,
	currentState = "Healthy",
	onClose,
	isMobile = false,
	selectedTeethCount,
}) => {
	const isBatch = Boolean(selectedTeethCount && selectedTeethCount > 1);

	return (
		<div className="flex items-center justify-between border-b border-[var(--line-subtle)] pb-2">
			<div className="flex items-center gap-2.5 min-w-0">
				<span className={`${isMobile ? "min-w-[44px] min-h-[44px] w-11 h-11 text-xl" : "w-9 h-9 text-lg"} rounded-xl bg-teal-500/15 border border-teal-500/30 text-[var(--teal)] font-black flex items-center justify-center font-mono shrink-0 shadow-2xs`}>
					{toothNumber}
				</span>
				<div className="flex flex-col min-w-0">
					<div className="flex items-center gap-1.5 flex-wrap">
						<span className={`${isMobile ? "text-sm font-extrabold" : "text-xs font-black"} text-[var(--ink)] leading-snug break-words`}>
							{getToothFolkAndAnatomicalNameRu(toothNumber)}
						</span>
						{isBatch && (
							<span
								className="px-2 py-0.5 rounded-md bg-teal-500/20 text-[var(--teal)] border border-teal-500/40 text-[10px] font-mono font-black shadow-2xs whitespace-nowrap"
								data-testid="radial-batch-mode-indicator"
							>
								Пакет: {selectedTeethCount} зубов
							</span>
						)}
					</div>
					<span className="text-[11px] text-[var(--muted)] flex items-center gap-1">
						<span>Статус:</span>
						<span className="font-extrabold text-[var(--ink)]">
							{TOOTH_STATE_LABELS[currentState]}
						</span>
					</span>
				</div>
			</div>
			<button
				type="button"
				onClick={onClose}
				className={`${isMobile ? "min-w-[44px] min-h-[44px] w-11 h-11 rounded-full" : "w-7 h-7 rounded-lg"} bg-[var(--paper-soft)] hover:bg-rose-500 hover:text-white text-[var(--muted)] flex items-center justify-center transition-all cursor-pointer shrink-0 border border-[var(--line)]`}
				title="Закрыть (Esc)"
				aria-label="Закрыть меню"
			>
				<X size={isMobile ? 20 : 15} />
			</button>
		</div>
	);
};
