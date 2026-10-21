import React from "react";
export interface LabAttachPresetItem {
	readonly label: string;
	readonly path: string;
	readonly type: "stl" | "ply" | "photo";
}

export function LabAttachPresetList({
	presets,
	filePath,
	onSelect,
}: {
	readonly presets: readonly LabAttachPresetItem[];
	readonly filePath: string;
	readonly onSelect: (preset: LabAttachPresetItem) => void;
}) {
	return (
		<div className="space-y-1.5">
			<span className="text-[11px] font-semibold text-[var(--muted,#64748b)] block">
				Быстрые пресеты клинических файлов:
			</span>
			<div className="flex flex-wrap gap-1.5">
				{presets.map((pr) => (
					<button
						key={pr.label}
						type="button"
						onClick={() => onSelect(pr)}
						className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer text-left ${
							filePath === pr.path
								? "bg-teal-500/15 border-teal-500/40 text-teal-800 dark:text-teal-200 font-bold"
								: "bg-[var(--paper-soft,#f1f5f9)] hover:bg-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] border-[var(--line,#cbd5e1)]"
						}`}
					>
						{pr.label}
					</button>
				))}
			</div>
		</div>
	);
}
