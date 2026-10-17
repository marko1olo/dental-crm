import React from "react";
import { Zap } from "lucide-react";
import { RoutinePresets } from "./clinicalPresets/RoutinePresets";
import { AuxiliaryPresets } from "./clinicalPresets/AuxiliaryPresets";
import { CanonicalChairsidePresets } from "./clinicalPresets/CanonicalChairsidePresets";
import type { OrthoClinicalPresetsSectionProps } from "./clinicalPresets/types";

export type { OrthoClinicalPresetsSectionProps };

export const OrthoClinicalPresetsSection: React.FC<OrthoClinicalPresetsSectionProps> = (props) => {
	return (
		<div
			data-testid="ortho-quick-presets-panel"
			className="bg-[var(--paper-soft)] p-3 rounded-xl border border-[var(--line)] flex flex-col gap-2.5"
		>
			<div className="flex items-center justify-between flex-wrap gap-1">
				<span className="text-xs font-black uppercase tracking-wider text-[var(--ink)] flex items-center gap-1.5">
					<Zap size={14} className="text-[var(--primary)]" />
					Клинические пресеты
				</span>
				<span className="text-[12px] font-medium text-[var(--muted)]">
					Мгновенное заполнение параметров и дневника приёма
				</span>
			</div>
			<RoutinePresets {...props} />
			<AuxiliaryPresets {...props} />
			<CanonicalChairsidePresets {...props} />
		</div>
	);
};
