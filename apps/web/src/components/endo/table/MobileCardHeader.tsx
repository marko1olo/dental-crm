import React from "react";
import { Trash2 } from "lucide-react";
import type { EndoCanalData } from "@dental/shared";

interface MobileCardHeaderProps {
	readonly canal: EndoCanalData;
	readonly index: number;
	readonly suggestedCanalNames: string[];
	readonly onChange: (id: string, field: keyof EndoCanalData, value: any) => void;
	readonly onRemove: (id: string) => void;
	readonly onToggleObliteration?: ((id: string) => void) | undefined;
}

export const MobileCardHeader: React.FC<MobileCardHeaderProps> = ({
	canal,
	index,
	suggestedCanalNames,
	onChange,
	onRemove,
	onToggleObliteration,
}) => (
	<div className="flex items-center justify-between gap-2 flex-wrap">
		<div className="flex-1 min-w-0">
			<div className="flex items-center gap-2 flex-wrap">
				<span className="text-[11px] font-black text-rose-600 dark:text-rose-400 shrink-0">
					Канал #{index + 1}:
				</span>
				<input
					type="text"
					list="endo-canal-names-list"
					aria-label={`Название канала ${index + 1} моб`}
					value={canal.canalName}
					onChange={(e) => onChange(canal.id, "canalName", e.target.value)}
					className="h-9 px-2.5 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-white font-black text-sm focus:ring-2 focus:ring-rose-500 outline-none w-28 text-center"
				/>
				<button
					type="button"
					onClick={() => onToggleObliteration?.(canal.id)}
					className={`secondary-button min-h-[36px] px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
						canal.isObliterated
							? "bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/50"
							: "bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-[var(--muted,#64748b)] border border-[var(--line,#cbd5e1)] dark:border-slate-700"
					}`}
					title="Облитерирован / не найден (Мандат 8e)"
					data-testid={`btn-toggle-obliterated-mob-${canal.canalName}`}
				>
					{canal.isObliterated ? "⚠️ Облитерирован" : "Облитерация?"}
				</button>
			</div>
			{suggestedCanalNames.length > 0 && (
				<div className="flex items-center gap-1.5 mt-2 flex-wrap">
					{suggestedCanalNames.map((sName) => (
						<button
							key={sName}
							type="button"
							onClick={() => onChange(canal.id, "canalName", sName)}
							className={`secondary-button min-h-[32px] px-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer inline-flex items-center justify-center ${
								canal.canalName === sName
									? "bg-rose-600 text-white shadow-xs"
									: "bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-[var(--muted,#64748b)] hover:bg-[var(--surface-muted,#e2e8f0)] dark:hover:bg-slate-700 border border-[var(--line,#e2e8f0)] dark:border-slate-700"
							}`}
						>
							{sName}
						</button>
					))}
				</div>
			)}
		</div>
		<button
			type="button"
			onClick={() => onRemove(canal.id)}
			className="icon-button secondary-button min-h-[44px] min-w-[44px] rounded-xl text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center justify-center transition-colors cursor-pointer shrink-0"
			title={`Удалить канал ${canal.canalName}`}
			aria-label={`Удалить канал ${canal.canalName}`}
		>
			<Trash2 size={18} />
		</button>
	</div>
);
