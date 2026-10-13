import React from "react";
import { FileText, HeartPulse, History } from "lucide-react";
import { ToothMolar } from "../../icons/DentalIcons";
import type { PatientCardActiveTab } from "./patientCardTypes";

export interface PatientCardActionsProps {
	activeTab: PatientCardActiveTab;
	onTabChange: (tab: PatientCardActiveTab) => void;
}

export const PatientCardActions: React.FC<PatientCardActionsProps> = React.memo(
	function PatientCardActions({ activeTab, onTabChange }) {
		return (
			<div className="flex p-1 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] gap-1 overflow-x-auto scrollbar-none [scrollbar-width:none]">
				<button
					type="button"
					onClick={() => onTabChange("timeline")}
					className={`flex-1 min-h-[38px] py-1.5 px-3 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
						activeTab === "timeline"
							? "bg-[var(--paper)] text-[var(--ink)] shadow-xs font-bold border border-[var(--line)]"
							: "text-[var(--muted)] hover:text-[var(--ink)]"
					}`}
					data-testid="tab-segment-timeline"
				>
					<History className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
					<span>История визитов</span>
				</button>

				<button
					type="button"
					onClick={() => onTabChange("formula")}
					className={`flex-1 min-h-[38px] py-1.5 px-3 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
						activeTab === "formula"
							? "bg-[var(--paper)] text-[var(--ink)] shadow-xs font-bold border border-[var(--line)]"
							: "text-[var(--muted)] hover:text-[var(--ink)]"
					}`}
					data-testid="tab-segment-formula"
				>
					<ToothMolar className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
					<span>Зубная формула</span>
				</button>

				<button
					type="button"
					onClick={() => onTabChange("anamnesis")}
					className={`flex-1 min-h-[38px] py-1.5 px-3 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
						activeTab === "anamnesis"
							? "bg-[var(--paper)] text-[var(--ink)] shadow-xs font-bold border border-[var(--line)]"
							: "text-[var(--muted)] hover:text-[var(--ink)]"
					}`}
					data-testid="tab-segment-anamnesis"
				>
					<HeartPulse className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
					<span>Соматика & Безопасность</span>
				</button>

				<button
					type="button"
					onClick={() => onTabChange("documents")}
					className={`flex-1 min-h-[38px] py-1.5 px-3 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
						activeTab === "documents"
							? "bg-[var(--paper)] text-[var(--ink)] shadow-xs font-bold border border-[var(--line)]"
							: "text-[var(--muted)] hover:text-[var(--ink)]"
					}`}
					data-testid="tab-segment-documents"
				>
					<FileText className="w-3.5 h-3.5 text-amber-500 shrink-0" />
					<span>Документы & Выписки</span>
				</button>
			</div>
		);
	},
);

PatientCardActions.displayName = "PatientCardActions";
