import React from "react";
import type { EndoCanalData } from "@dental/shared";
import {
	CURATED_ISO_MAF_OPTIONS,
	EXTENDED_MAF_ISO_OPTIONS,
	TAPER_OPTIONS,
} from "../endoCanalConstants";

interface DesktopMafTaperCellsProps {
	readonly canal: EndoCanalData;
	readonly onChange: (id: string, field: keyof EndoCanalData, value: any) => void;
	readonly renderIsoColorBadge?: ((mafOption: string) => React.ReactNode) | undefined;
}

export const DesktopMafTaperCells: React.FC<DesktopMafTaperCellsProps> = ({
	canal,
	onChange,
}) => (
	<>
		{/* Мастер-файл (MAF) */}
		<td className="py-1.5 px-3">
			<div className="flex items-center min-w-0">
				<select
					aria-label={`Мастер-апикальный файл MAF для канала ${canal.canalName}`}
					value={canal.masterApicalFile}
					onChange={(e) => onChange(canal.id, "masterApicalFile", e.target.value)}
					className="w-full h-8 sm:h-8.5 px-2 rounded-lg border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--surface,#f8fafc)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-white text-xs font-mono font-bold focus:ring-2 focus:ring-rose-500 outline-none truncate min-w-0"
				>
					<optgroup label="Основные размеры MAF">
						{CURATED_ISO_MAF_OPTIONS.map((opt) => (
							<option key={opt} value={opt}>
								{opt}
							</option>
						))}
					</optgroup>
					<optgroup label="Дополнительные размеры">
						{EXTENDED_MAF_ISO_OPTIONS.map((opt) => (
							<option key={opt} value={opt}>
								{opt}
							</option>
						))}
					</optgroup>
				</select>
			</div>
		</td>

		{/* Taper (Конусность инструмента) */}
		<td className="py-1.5 px-3">
			<select
				aria-label={`Конусность канала ${canal.canalName}`}
				value={canal.taper}
				onChange={(e) => onChange(canal.id, "taper", e.target.value)}
				className="w-full h-8 sm:h-8.5 px-2 rounded-lg border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--surface,#f8fafc)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-white text-xs font-mono focus:ring-2 focus:ring-rose-500 outline-none truncate min-w-0"
			>
				{TAPER_OPTIONS.map((opt) => (
					<option key={opt} value={opt}>
						{opt}
					</option>
				))}
			</select>
		</td>
	</>
);
