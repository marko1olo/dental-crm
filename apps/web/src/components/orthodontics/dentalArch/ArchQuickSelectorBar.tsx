import React from "react";
import { RotateCcw } from "lucide-react";
import { BracesBracket } from "../../icons/DentalIcons";
import type { TargetArch } from "../orthoProtocolTypes";

export interface ArchQuickSelectorBarProps {
	readonly targetArch: TargetArch;
	readonly onSelectArch: (arch: TargetArch) => void;
	readonly onSelectAnterior: () => void;
	readonly onClearTeeth: () => void;
}

export const ArchQuickSelectorBar: React.FC<ArchQuickSelectorBarProps> = ({
	targetArch,
	onSelectArch,
	onSelectAnterior,
	onClearTeeth,
}) => {
	return (
		<div className="flex items-center justify-between mb-2">
			<span className="text-xs font-black uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
				<BracesBracket size={14} className="text-[var(--primary)]" />
				Зубная формула (активация)
			</span>
			<div className="flex items-center gap-1 flex-wrap">
				<button
					type="button"
					onClick={() => onSelectArch("upper")}
					className={`px-2.5 py-1 text-[11px] font-bold rounded-xl border transition-all cursor-pointer ${
						targetArch === "upper"
							? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-xs"
							: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-soft)]"
					}`}
				>
					Вся ВЧ
				</button>
				<button
					type="button"
					onClick={() => onSelectArch("lower")}
					className={`px-2.5 py-1 text-[11px] font-bold rounded-xl border transition-all cursor-pointer ${
						targetArch === "lower"
							? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-xs"
							: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-soft)]"
					}`}
				>
					Вся НЧ
				</button>
				<button
					type="button"
					onClick={() => onSelectArch("both")}
					className={`px-2.5 py-1 text-[11px] font-bold rounded-xl border transition-all cursor-pointer ${
						targetArch === "both"
							? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-xs"
							: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-soft)]"
					}`}
				>
					Обе челюсти
				</button>
				<button
					type="button"
					onClick={onSelectAnterior}
					className="px-2.5 py-1 text-[11px] font-bold rounded-xl border bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-soft)] cursor-pointer"
				>
					Фронт
				</button>
				<button
					type="button"
					onClick={onClearTeeth}
					className="p-1.5 rounded-lg text-[var(--muted)] hover:text-rose-500 transition-colors cursor-pointer"
					title="Сбросить выбор"
				>
					<RotateCcw size={14} />
				</button>
			</div>
		</div>
	);
};
