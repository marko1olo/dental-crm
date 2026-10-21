export interface AnesthesiaMobileDrawerVolumeProps {
	disabled?: boolean | undefined;
	selectedCarpulesCount: number;
	onStep: (delta: number) => void;
}

export function AnesthesiaMobileDrawerVolume({
	disabled,
	selectedCarpulesCount,
	onStep,
}: AnesthesiaMobileDrawerVolumeProps) {
	return (
		<div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
			<span className="text-xs font-semibold text-[var(--ink)]">
				Объём: {selectedCarpulesCount} карп. (
				{(selectedCarpulesCount * 1.7).toFixed(1)} мл)
			</span>
			<div className="flex items-center gap-1.5">
				<button
					type="button"
					disabled={disabled || selectedCarpulesCount <= 0.5}
					onClick={() => onStep(-0.5)}
					className="w-9 h-9 rounded-lg bg-[var(--paper)] border border-[var(--line)] font-bold text-base flex items-center justify-center"
				>
					−
				</button>
				<button
					type="button"
					disabled={disabled || selectedCarpulesCount >= 6.0}
					onClick={() => onStep(0.5)}
					className="w-9 h-9 rounded-lg bg-[var(--paper)] border border-[var(--line)] font-bold text-base flex items-center justify-center"
				>
					+
				</button>
			</div>
		</div>
	);
}
