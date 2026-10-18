import React, { useEffect, useRef, useState } from "react";
import { MoreVertical } from "lucide-react";
import type { TreatmentPlanStage, TreatmentPlanStageStatus } from "../types";
import type { StageStatusConfigItem } from "../TreatmentPlanStageFooter";
import type { StageFooterActionFlags } from "./stageFooterHelpers";
import { StageFooterStatusPicker } from "./StageFooterStatusPicker";
import { StageFooterSecondaryActions } from "./StageFooterSecondaryActions";

export interface StageFooterMenuProps {
	readonly stage: TreatmentPlanStage;
	readonly currentStatus: TreatmentPlanStageStatus;
	readonly stageStatusConfig: Record<TreatmentPlanStageStatus, StageStatusConfigItem>;
	readonly flags: StageFooterActionFlags;
	readonly onSelectStatus: (newStatus: TreatmentPlanStageStatus, e?: React.MouseEvent) => void;
	readonly onExecuteWriteOffStage?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onPayStage?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onExportStageEstimate?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onOpenLabOrder?: ((teeth?: number[], options?: Record<string, unknown>) => void) | undefined;
	readonly onOneClickLabOrder?: ((teeth?: number[]) => void) | undefined;
	readonly onApplyStageDiscount?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onOpenInstallment?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onDeleteStage?: ((stage: TreatmentPlanStage) => void) | undefined;
}

export const StageFooterMenu: React.FC<StageFooterMenuProps> = ({
	stage,
	currentStatus,
	stageStatusConfig,
	flags,
	onSelectStatus,
	onExecuteWriteOffStage,
	onPayStage,
	onExportStageEstimate,
	onOpenLabOrder,
	onOneClickLabOrder,
	onApplyStageDiscount,
	onOpenInstallment,
	onDeleteStage,
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") setIsOpen(false);
		};
		const handleClickOutside = (e: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
				setIsOpen(false);
			}
		};
		document.addEventListener("keydown", handleKeyDown);
		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("keydown", handleKeyDown);
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isOpen]);

	return (
		<div className="relative inline-flex items-center" ref={menuRef}>
			<button
				type="button"
				onClick={() => setIsOpen((prev) => !prev)}
				className="h-9 w-9 min-h-[36px] min-w-[36px] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11 [@media(pointer:coarse)]:min-h-[44px] [@media(pointer:coarse)]:min-w-[44px] rounded-lg border border-[var(--line,var(--border,#cbd5e1))] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] cursor-pointer flex items-center justify-center shrink-0 shadow-2xs transition-colors touch-manipulation"
				title="Дополнительные действия этапа"
				aria-label="Дополнительные действия этапа"
				aria-expanded={isOpen}
				data-testid={`stage-${stage.stageNumber}-menu-btn`}
			>
				<MoreVertical size={14} className="text-[var(--muted,#64748b)]" />
			</button>

			{isOpen && (
				<div
					className="absolute right-0 bottom-full mb-1.5 z-50 flex flex-col gap-0.5 p-1.5 bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--line,var(--border,#cbd5e1))] rounded-xl shadow-xl min-w-[220px] text-xs animate-in fade-in zoom-in-95 duration-100"
					role="menu"
				>
					<StageFooterStatusPicker
						currentStatus={currentStatus}
						stageStatusConfig={stageStatusConfig}
						onSelectStatus={onSelectStatus}
						onClose={() => setIsOpen(false)}
					/>

					<div className="my-1 border-t border-[var(--line,var(--border,#cbd5e1))]" />

					<StageFooterSecondaryActions
						stage={stage}
						flags={flags}
						onClose={() => setIsOpen(false)}
						onExecuteWriteOffStage={onExecuteWriteOffStage}
						onPayStage={onPayStage}
						onExportStageEstimate={onExportStageEstimate}
						onOpenLabOrder={onOpenLabOrder}
						onOneClickLabOrder={onOneClickLabOrder}
						onApplyStageDiscount={onApplyStageDiscount}
						onOpenInstallment={onOpenInstallment}
						onDeleteStage={onDeleteStage}
					/>
				</div>
			)}
		</div>
	);
};
