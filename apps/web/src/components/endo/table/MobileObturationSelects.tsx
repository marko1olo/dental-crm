import React from "react";
import { ChevronDown } from "lucide-react";
import type { EndoCanalData } from "@dental/shared";
import {
	OBTURATION_TECHNIQUE_OPTIONS,
	type EndoStageStamp,
} from "../endoCanalConstants";

interface MobileObturationSelectsProps {
	readonly canal: EndoCanalData;
	readonly stageStamp: EndoStageStamp;
	readonly onChange: (id: string, field: keyof EndoCanalData, value: any) => void;
	readonly onSelectSealer: (canal: EndoCanalData) => void;
}

export const MobileObturationSelects: React.FC<MobileObturationSelectsProps> = ({
	canal,
	stageStamp,
	onChange,
	onSelectSealer,
}) => (
	<>
		<div>
			<label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
				Обтурация:
			</label>
			<select
				aria-label={`Обтурация моб ${canal.canalName}`}
				value={canal.obturationTechnique}
				onChange={(e) => onChange(canal.id, "obturationTechnique", e.target.value)}
				className="w-full min-h-[44px] px-2 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-white text-xs focus:ring-2 focus:ring-rose-500 outline-none truncate"
			>
				{stageStamp === "TEMP_CAOH2" && (
					<option value="Временная обтурация Ca(OH)2 (Metapex / Calcept)">
						Ca(OH)2 (Metapex/Calcept)
					</option>
				)}
				{OBTURATION_TECHNIQUE_OPTIONS.map((opt) => (
					<option key={opt} value={opt}>
						{opt}
					</option>
				))}
			</select>
		</div>

		<div className="pt-0.5">
			<label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
				Силер (обтурация):
			</label>
			<button
				type="button"
				aria-label={`Выбрать силер для ${canal.canalName}`}
				onClick={() => onSelectSealer(canal)}
				className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-white text-xs font-semibold flex items-center justify-between transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/60 active:scale-98 cursor-pointer"
			>
				<span className="truncate pr-1 text-rose-600 dark:text-rose-400 font-bold">
					{canal.sealer || (stageStamp === "TEMP_CAOH2" ? "Metapex / Calasept" : "AH Plus (Dentsply)")}
				</span>
				<span className="text-[11px] font-bold text-slate-400 shrink-0 flex items-center gap-0.5">
					Выбрать <ChevronDown size={12} />
				</span>
			</button>
		</div>
	</>
);
