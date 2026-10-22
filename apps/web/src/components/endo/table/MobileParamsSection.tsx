import React from "react";
import type { EndoCanalData } from "@dental/shared";
import { REFERENCE_POINT_OPTIONS, type EndoStageStamp } from "../endoCanalConstants";
import { MobileMafTaperSelects } from "./MobileMafTaperSelects";
import { MobileObturationSelects } from "./MobileObturationSelects";

interface MobileParamsSectionProps {
	readonly canal: EndoCanalData;
	readonly stageStamp: EndoStageStamp;
	readonly onChange: (id: string, field: keyof EndoCanalData, value: any) => void;
	readonly renderIsoColorBadge: (mafOption: string) => React.ReactNode;
	readonly onSelectSealer: (canal: EndoCanalData) => void;
}

export const MobileParamsSection: React.FC<MobileParamsSectionProps> = ({
	canal,
	stageStamp,
	onChange,
	renderIsoColorBadge,
	onSelectSealer,
}) => (
	<div className="grid grid-cols-1 gap-2 pt-1 border-t border-[var(--line,#e2e8f0)] dark:border-slate-800">
		<div>
			<label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
				Реперный ориентир:
			</label>
			<select
				aria-label={`Реперный ориентир моб ${canal.canalName}`}
				value={canal.referencePoint}
				onChange={(e) => onChange(canal.id, "referencePoint", e.target.value)}
				className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-white text-xs font-semibold focus:ring-2 focus:ring-rose-500 outline-none"
			>
				{REFERENCE_POINT_OPTIONS.map((opt) => (
					<option key={opt} value={opt}>
						{opt}
					</option>
				))}
			</select>
		</div>

		<MobileMafTaperSelects
			canal={canal}
			onChange={onChange}
			renderIsoColorBadge={renderIsoColorBadge}
		/>

		<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
			<MobileObturationSelects
				canal={canal}
				stageStamp={stageStamp}
				onChange={onChange}
				onSelectSealer={onSelectSealer}
			/>
		</div>
	</div>
);
