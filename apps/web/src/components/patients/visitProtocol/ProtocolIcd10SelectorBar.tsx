import React from "react";
import { Sparkles } from "lucide-react";
import { COMMON_ICD10_PRESETS } from "./types";

export interface ProtocolIcd10SelectorBarProps {
	readonly selectedTooth: string;
	readonly onToothChange: (tooth: string) => void;
	readonly onSelectPreset: (preset: (typeof COMMON_ICD10_PRESETS)[number]) => void;
}

export const ProtocolIcd10SelectorBar: React.FC<ProtocolIcd10SelectorBarProps> = ({
	selectedTooth,
	onToothChange,
	onSelectPreset,
}) => {
	return (
		<div className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--glass-border)] print:hidden">
			<div className="flex items-center justify-between gap-2 flex-wrap">
				<span className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
					<Sparkles className="w-3.5 h-3.5 text-teal-500" />
					<span>Заполнение дневника по диагнозу:</span>
				</span>
				<div className="flex items-center gap-1 text-[11px] font-bold text-[var(--muted)]">
					<span>Зуб:</span>
					<input
						type="text"
						value={selectedTooth}
						onChange={(e) => onToothChange(e.target.value)}
						className="w-12 h-6 px-1 text-center font-mono font-black rounded border border-[var(--glass-border)] bg-[var(--paper)] text-[var(--ink)]"
						placeholder="16"
					/>
				</div>
			</div>

			<div className="flex items-center gap-1.5 flex-wrap">
				{COMMON_ICD10_PRESETS.map((item) => (
					<button
						key={item.code}
						type="button"
						data-testid={`btn-icd10-${item.code.toLowerCase().replace(".", "")}`}
						onClick={() => onSelectPreset(item)}
						className="px-2.5 py-1 text-xs font-bold rounded-lg border border-[var(--glass-border)] bg-[var(--paper)] hover:border-[var(--teal)] hover:bg-[var(--teal-soft)] text-[var(--ink)] transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
						title={`${item.code} ${item.title}`}
					>
						<span className="font-mono text-teal-600 font-extrabold">{item.code}</span>
						<span>{item.shortBadge}</span>
					</button>
				))}
			</div>
		</div>
	);
};
