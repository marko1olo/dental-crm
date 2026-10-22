import React from "react";
import { Trash2 } from "lucide-react";
import type { EndoCanalData } from "@dental/shared";
import {
	OBTURATION_TECHNIQUE_OPTIONS,
	ENDO_SEALER_OPTIONS,
	type EndoStageStamp,
} from "../endoCanalConstants";

interface DesktopObturationCellsProps {
	readonly canal: EndoCanalData;
	readonly stageStamp: EndoStageStamp;
	readonly onChange: (id: string, field: keyof EndoCanalData, value: any) => void;
	readonly onRemove: (id: string) => void;
}

export const DesktopObturationCells: React.FC<DesktopObturationCellsProps> = ({
	canal,
	stageStamp,
	onChange,
	onRemove,
}) => (
	<>
		{/* Obturation Technique */}
		<td className="py-1.5 px-3">
			<select
				aria-label={`Метод обтурации канала ${canal.canalName}`}
				value={canal.obturationTechnique}
				onChange={(e) => onChange(canal.id, "obturationTechnique", e.target.value)}
				className="w-full h-8 sm:h-8.5 px-2 rounded-lg border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--surface,#f8fafc)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-white text-xs focus:ring-2 focus:ring-rose-500 outline-none truncate min-w-0"
			>
				{stageStamp === "TEMP_CAOH2" && (
					<option value="Временная обтурация Ca(OH)2 (Metapex / Calcept)">
						Временная обтурация Ca(OH)2 (Metapex / Calcept)
					</option>
				)}
				{OBTURATION_TECHNIQUE_OPTIONS.map((opt) => (
					<option key={opt} value={opt}>
						{opt}
					</option>
				))}
			</select>
		</td>

		{/* Sealer */}
		<td className="py-1.5 px-3">
			<select
				aria-label={`Силер для канала ${canal.canalName}`}
				value={
					canal.sealer ||
					(stageStamp === "TEMP_CAOH2"
						? "Metapex / Calasept (Ca(OH)2 временный)"
						: "AH Plus (Dentsply, эпоксидный)")
				}
				onChange={(e) => onChange(canal.id, "sealer", e.target.value)}
				className="w-full h-8 sm:h-8.5 px-2 rounded-lg border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--surface,#f8fafc)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-white text-xs focus:ring-2 focus:ring-rose-500 outline-none truncate min-w-0"
			>
				{ENDO_SEALER_OPTIONS.map((opt) => (
					<option key={opt} value={opt}>
						{opt}
					</option>
				))}
			</select>
		</td>

		{/* Remove Canal */}
		<td className="py-1.5 px-2 text-center">
			<button
				type="button"
				onClick={() => onRemove(canal.id)}
				className="icon-button secondary-button h-8 w-8 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center justify-center transition-colors cursor-pointer"
				title={`Удалить канал ${canal.canalName}`}
			>
				<Trash2 size={16} />
			</button>
		</td>
	</>
);
