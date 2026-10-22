import React from "react";
import type { EndoCanalData } from "@dental/shared";

interface DesktopNameCellProps {
	readonly canal: EndoCanalData;
	readonly index: number;
	readonly suggestedCanalNames: string[];
	readonly onChange: (id: string, field: keyof EndoCanalData, value: any) => void;
	readonly onToggleObliteration?: ((id: string) => void) | undefined;
}

export const DesktopNameCell: React.FC<DesktopNameCellProps> = ({
	canal,
	index,
	suggestedCanalNames,
	onChange,
	onToggleObliteration,
}) => (
	<td className="py-1.5 px-3">
		<input
			type="text"
			list="endo-canal-names-list"
			aria-label={`Название канала ${index + 1}`}
			value={canal.canalName}
			onChange={(e) => onChange(canal.id, "canalName", e.target.value)}
			className="w-full h-8 sm:h-8.5 px-2.5 rounded-lg border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--surface,#f8fafc)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-white font-bold text-xs focus:ring-2 focus:ring-rose-500 outline-none truncate min-w-0"
		/>
		<div className="flex items-center gap-1 mt-1 flex-wrap">
			{suggestedCanalNames.map((sName) => (
				<button
					key={sName}
					type="button"
					onClick={() => onChange(canal.id, "canalName", sName)}
					className={`secondary-button h-4 px-1 rounded text-[9px] font-mono font-bold transition-all cursor-pointer inline-flex items-center justify-center ${
						canal.canalName === sName
							? "bg-rose-600 text-white shadow-xs"
							: "bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 text-[var(--muted,#64748b)] hover:bg-[var(--surface-muted,#e2e8f0)] dark:hover:bg-slate-700 border border-[var(--line,#e2e8f0)] dark:border-slate-700"
					}`}
					title={`Выбрать анатомический канал ${sName}`}
				>
					{sName}
				</button>
			))}
			<button
				type="button"
				onClick={() => onToggleObliteration?.(canal.id)}
				className={`secondary-button h-4 px-1 rounded text-[9px] font-bold transition-all cursor-pointer inline-flex items-center gap-0.5 ${
					canal.isObliterated
						? "bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/50"
						: "bg-transparent text-[var(--muted,#64748b)] hover:text-amber-700 dark:hover:text-amber-300 border border-dashed border-[var(--line,#cbd5e1)] dark:border-slate-700"
				}`}
				title="Отметить канал как облитерированный / склерозированный (Мандат 8e)"
				data-testid={`btn-toggle-obliterated-${canal.canalName}`}
			>
				{canal.isObliterated ? "⚠️ Облитерирован" : "Облитерация?"}
			</button>
		</div>
	</td>
);
