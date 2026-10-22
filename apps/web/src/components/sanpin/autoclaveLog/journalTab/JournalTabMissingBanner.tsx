import React from "react";
import { AlertTriangle } from "lucide-react";
import { Autoclave } from "../../../icons/DentalIcons";
import type { MissingSterilizationDaysAuditResult } from "../autoclaveLogEngine.js";

export interface JournalTabMissingBannerProps {
	readonly audit: MissingSterilizationDaysAuditResult | null;
	readonly onGenerateBatch: () => void;
}

export const JournalTabMissingBanner: React.FC<JournalTabMissingBannerProps> = ({ audit, onGenerateBatch }) => {
	if (!audit?.isMissingAutoclaveLog) return null;

	return (
		<div className="flex items-center justify-between bg-red-500/10 border border-red-500/30 rounded-xl p-3 gap-3">
			<div className="flex items-center gap-3">
				<AlertTriangle size={20} color="#ef4444" className="shrink-0" />
				<div>
					<div className="font-semibold text-red-900 dark:text-red-300 text-sm">
						Внимание: за смену были приемы пациентов, но цикл автоклавирования не зарегистрирован
					</div>
					<div className="text-xs text-red-700 dark:text-red-400 mt-0.5">{audit.recommendationRu}</div>
				</div>
			</div>
			<button
				type="button"
				onClick={onGenerateBatch}
				className="autoclave-btn-primary min-h-[36px] whitespace-nowrap shrink-0 px-3 inline-flex items-center gap-1.5 text-xs font-semibold rounded-lg"
			>
				<Autoclave size={16} />
				<span>Заполнить автоклав нормой</span>
			</button>
		</div>
	);
};
