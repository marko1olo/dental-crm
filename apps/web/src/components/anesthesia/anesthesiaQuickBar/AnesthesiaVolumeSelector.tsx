import { Check } from "lucide-react";

export interface AnesthesiaVolumeSelectorProps {
	readonly disabled?: boolean | undefined;
	readonly selectedCarpulesCount: number;
	readonly onSelectCarpulesCount: (count: number) => void;
	readonly isAspirationNegative: boolean;
	readonly onToggleAspirationNegative: () => void;
}

export function AnesthesiaVolumeSelector({
	disabled,
	selectedCarpulesCount,
	onSelectCarpulesCount,
	isAspirationNegative,
	onToggleAspirationNegative,
}: AnesthesiaVolumeSelectorProps) {
	const stepDown = () =>
		onSelectCarpulesCount(
			Math.max(0.5, Math.round((selectedCarpulesCount - 0.5) * 10) / 10),
		);
	const stepUp = () =>
		onSelectCarpulesCount(
			Math.min(6.0, Math.round((selectedCarpulesCount + 0.5) * 10) / 10),
		);

	return (
		<div className="flex items-center gap-2 flex-wrap pt-1">
			<fieldset
				className="inline-flex items-center gap-1 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] p-0.5 shadow-2xs m-0"
				aria-label="Объём анестезии"
			>
				{[
					{ count: 0.5, label: "0.5 карп.", id: "anesthesia-dose-05carp" },
					{
						count: 1.0,
						label: "1 карп. (1.7 мл)",
						id: "anesthesia-dose-1carp",
					},
					{
						count: 2.0,
						label: "2 карп. (3.4 мл)",
						id: "anesthesia-dose-2carp",
					},
				].map((preset) => (
					<button
						key={preset.count}
						type="button"
						disabled={disabled}
						onClick={() => onSelectCarpulesCount(preset.count)}
						data-testid={preset.id}
						className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer min-h-[44px] sm:min-h-[32px] ${
							selectedCarpulesCount === preset.count
								? "bg-[var(--teal-surface)] text-[var(--teal-strong)] font-bold border border-[var(--teal)]"
								: "bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--line-subtle)]"
						}`}
					>
						{preset.label}
					</button>
				))}
			</fieldset>

			<fieldset
				className="inline-flex items-center rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] p-0.5 shadow-2xs shrink-0 m-0"
				aria-label="Счётчик карпул"
			>
				<button
					type="button"
					disabled={disabled || selectedCarpulesCount <= 0.5}
					onClick={stepDown}
					className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] sm:h-8 sm:w-8 rounded-lg text-xs font-black text-[var(--ink)] bg-[var(--paper)] border border-[var(--line-subtle)] hover:bg-[var(--paper-soft)] cursor-pointer disabled:opacity-30 active:scale-95 transition-all"
					title="Уменьшить дозу на 0.5 карпулы"
					data-testid="btn-decrease-carpules"
				>
					−
				</button>
				<span
					className="px-2 text-xs font-bold font-mono text-[var(--ink)] select-none whitespace-nowrap"
					data-testid="selected-carpules-display"
					title={`${selectedCarpulesCount} карпула (${(selectedCarpulesCount * 1.7).toFixed(1)} мл)`}
				>
					{selectedCarpulesCount} карп. (
					{(selectedCarpulesCount * 1.7).toFixed(1)} мл)
				</span>
				<button
					type="button"
					disabled={disabled || selectedCarpulesCount >= 6.0}
					onClick={stepUp}
					className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] sm:h-8 sm:w-8 rounded-lg text-xs font-black text-[var(--ink)] bg-[var(--paper)] border border-[var(--line-subtle)] hover:bg-[var(--paper-soft)] cursor-pointer disabled:opacity-30 active:scale-95 transition-all"
					title="Увеличить дозу на 0.5 карпулы"
					data-testid="btn-increase-carpules"
				>
					+
				</button>
			</fieldset>

			<label
				data-testid="label-aspiration-negative-norm"
				className="inline-flex items-center gap-1.5 px-2.5 py-1 min-h-[32px] rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-xs font-medium cursor-pointer transition-colors select-none"
			>
				<input
					type="checkbox"
					checked={isAspirationNegative}
					onChange={onToggleAspirationNegative}
					disabled={disabled}
					data-testid="checkbox-aspiration-negative-norm"
					className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-[var(--line)] cursor-pointer accent-teal-600"
				/>
				<span className="flex items-center gap-1 text-[var(--ink)]">
					<Check size={13} className="text-emerald-600 font-bold" />
					<span>Аспирационная проба отрицательная (норма)</span>
				</span>
			</label>
		</div>
	);
}
