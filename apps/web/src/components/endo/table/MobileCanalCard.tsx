import React from "react";
import { Zap } from "lucide-react";
import type { EndoCanalData } from "@dental/shared";
import type { EndoStageStamp } from "../endoCanalTypes";
import { MobileCardHeader } from "./MobileCardHeader";
import { MobileLengthSection } from "./MobileLengthSection";
import { MobileParamsSection } from "./MobileParamsSection";

export interface MobileCanalCardProps {
	readonly canal: EndoCanalData;
	readonly index: number;
	readonly suggestedCanalNames: string[];
	readonly stageStamp: EndoStageStamp;
	readonly handleCanalChange: (id: string, field: keyof EndoCanalData, value: any) => void;
	readonly handleAdjustCanalLength: (id: string, delta: number) => void;
	readonly handleCanalLengthInputChange: (id: string, val: string) => void;
	readonly handleSetCanalLength: (id: string, val: number) => void;
	readonly handleRemoveCanal: (id: string) => void;
	readonly renderIsoColorBadge: (mafOption: string) => React.ReactNode;
	readonly handleToggleCanalObliteration?: ((id: string) => void) | undefined;
	readonly onSelectSealer: (canal: EndoCanalData) => void;
}

export const MobileCanalCard: React.FC<MobileCanalCardProps> = ({
	canal,
	index,
	suggestedCanalNames,
	stageStamp,
	handleCanalChange,
	handleAdjustCanalLength,
	handleCanalLengthInputChange,
	handleSetCanalLength,
	handleRemoveCanal,
	renderIsoColorBadge,
	handleToggleCanalObliteration,
	onSelectSealer,
}) => (
	<div className="p-3.5 rounded-2xl bg-[var(--surface,#f8fafc)] dark:bg-slate-900 border border-[var(--line,#e2e8f0)] dark:border-slate-800 shadow-sm space-y-3">
		<MobileCardHeader
			canal={canal}
			index={index}
			suggestedCanalNames={suggestedCanalNames}
			onChange={handleCanalChange}
			onRemove={handleRemoveCanal}
			onToggleObliteration={handleToggleCanalObliteration}
		/>

		{/* Apex Locator Status Badge (Apple HIG Touch Ergonomics) */}
		<div className="flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300/60 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 shadow-2xs">
			<div className="flex items-center gap-1.5 text-xs font-bold">
				<Zap size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
				<span>Апекслокатор: 0.0 (Apex)</span>
			</div>
			<span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300">
				{canal.isObliterated ? "Облитерирован (0 мм)" : canal.workingLengthMm ? `WL: ${canal.workingLengthMm} мм` : "0.0 (Норма)"}
			</span>
		</div>

		<MobileLengthSection
			canal={canal}
			onAdjustLength={handleAdjustCanalLength}
			onInputChange={handleCanalLengthInputChange}
			onSetLength={handleSetCanalLength}
			onToggleObliteration={handleToggleCanalObliteration}
		/>

		<MobileParamsSection
			canal={canal}
			stageStamp={stageStamp}
			onChange={handleCanalChange}
			renderIsoColorBadge={renderIsoColorBadge}
			onSelectSealer={onSelectSealer}
		/>
	</div>
);
