export interface LabPromptQuickPresetsProps {
	readonly quickPresets: string[];
	readonly value: string;
	readonly onSelect: (preset: string) => void;
}

export function LabPromptQuickPresets({
	quickPresets,
	value,
	onSelect,
}: LabPromptQuickPresetsProps) {
	if (!quickPresets || quickPresets.length === 0) return null;

	return (
		<div className="space-y-1.5 pt-0.5">
			<span className="text-[11px] font-semibold text-[var(--muted,#64748b)] block">
				Быстрый выбор причины:
			</span>
			<div className="flex flex-wrap gap-1.5">
				{quickPresets.map((preset) => (
					<button
						key={preset}
						type="button"
						onClick={() => onSelect(preset)}
						className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer text-left ${
							value === preset
								? "bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-300 font-bold"
								: "bg-[var(--paper-soft,#f1f5f9)] hover:bg-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] border-[var(--line,#cbd5e1)]"
						}`}
					>
						{preset}
					</button>
				))}
			</div>
		</div>
	);
}
