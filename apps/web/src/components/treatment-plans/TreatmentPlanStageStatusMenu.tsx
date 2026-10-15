import React, { useRef, useEffect } from "react";
import { Check, ChevronDown } from "lucide-react";
import type { TreatmentPlanStage, TreatmentPlanStageStatus } from "./types";
import { STAGE_STATUS_CONFIG } from "./treatmentPlanStageConfig";

export interface TreatmentPlanStageStatusMenuProps {
	readonly stage: TreatmentPlanStage;
	readonly currentStatus: TreatmentPlanStageStatus;
	readonly isStatusMenuOpen: boolean;
	readonly setIsStatusMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
	readonly onSelectStatus: (newStatus: TreatmentPlanStageStatus, e?: React.MouseEvent) => void;
}

export const TreatmentPlanStageStatusMenu: React.FC<TreatmentPlanStageStatusMenuProps> = ({
	stage,
	currentStatus,
	isStatusMenuOpen,
	setIsStatusMenuOpen,
	onSelectStatus,
}) => {
	const statusMenuRef = useRef<HTMLDivElement>(null);
	const statusConfig = STAGE_STATUS_CONFIG[currentStatus] || STAGE_STATUS_CONFIG.agreed;
	const StatusIcon = statusConfig.icon;

	useEffect(() => {
		if (!isStatusMenuOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") setIsStatusMenuOpen(false);
		};
		const handleClickOutside = (e: MouseEvent) => {
			if (statusMenuRef.current && !statusMenuRef.current.contains(e.target as Node)) {
				setIsStatusMenuOpen(false);
			}
		};
		document.addEventListener("keydown", handleKeyDown);
		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("keydown", handleKeyDown);
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isStatusMenuOpen, setIsStatusMenuOpen]);

	return (
		<div className="relative inline-flex items-center" ref={statusMenuRef} onClick={(e) => e.stopPropagation()}>
			<button
				type="button"
				onClick={(e) => { e.stopPropagation(); setIsStatusMenuOpen((p) => !p); }}
				className={`text-[11.5px] px-2.5 py-0.5 rounded-full font-bold border ${statusConfig.badge} flex items-center gap-1 cursor-pointer hover:opacity-90 transition-opacity touch-manipulation`}
				title="Смена статуса этапа (Черновик -> Согласован -> В работе -> Завершен)"
				data-testid={`stage-${stage.stageNumber}-status-badge`}
				aria-expanded={isStatusMenuOpen}
			>
				<StatusIcon size={11} />
				<span>{statusConfig.label}</span>
				<ChevronDown size={10} className={`transition-transform ${isStatusMenuOpen ? "rotate-180" : ""}`} />
			</button>

			{isStatusMenuOpen && (
				<div className="absolute left-0 top-full mt-1 z-50 flex flex-col gap-0.5 p-1 bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--line,var(--border,#cbd5e1))] rounded-xl shadow-xl min-w-[140px] text-xs animate-in fade-in zoom-in-95 duration-100" role="menu">
					{(["draft", "agreed", "in_progress", "completed"] as const).map((st) => {
						const cfg = STAGE_STATUS_CONFIG[st];
						const ItemIcon = cfg.icon;
						const isCurrent = currentStatus === st;
						return (
							<button
								key={st}
								type="button"
								onClick={(e) => onSelectStatus(st, e)}
								className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors ${
									isCurrent ? "bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] font-bold" : "text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)]"
								}`}
								role="menuitem"
							>
								<ItemIcon size={12} />
								<span>{cfg.label}</span>
								{isCurrent && <Check size={12} className="ml-auto text-[var(--teal-dark,var(--teal))] shrink-0" />}
							</button>
						);
					})}
				</div>
			)}
		</div>
	);
};
