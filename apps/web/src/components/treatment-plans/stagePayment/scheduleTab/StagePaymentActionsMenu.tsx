/**
 * apps/web/src/components/treatment-plans/stagePayment/scheduleTab/StagePaymentActionsMenu.tsx
 *
 * Выпадающее контекстное меню дополнительных действий этапа.
 */

import React from "react";
import { CheckCircle2, CreditCard, FileCheck, MoreVertical, QrCode } from "lucide-react";
import type { MilestoneStage } from "../stagePaymentEngine.js";
import type { StagePaymentStatus } from "../stagePaymentPresets.js";

export interface StagePaymentActionsMenuProps {
	readonly stage: MilestoneStage;
	readonly isOpen: boolean;
	readonly onToggle: () => void;
	readonly onStageStatusChange: (stageId: string, newStatus: StagePaymentStatus) => void;
	readonly onOpenActTab: (stageId: string) => void;
	readonly onOpenInstallmentModal: (stage: MilestoneStage) => void;
	readonly onOpenFiscalTab: (stageId: string) => void;
}

export const StagePaymentActionsMenu: React.FC<StagePaymentActionsMenuProps> = ({
	stage,
	isOpen,
	onToggle,
	onStageStatusChange,
	onOpenActTab,
	onOpenInstallmentModal,
	onOpenFiscalTab,
}) => {
	return (
		<div className="relative">
			<button
				type="button"
				onClick={onToggle}
				className="p-1.5 h-8 w-8 min-w-[32px] flex items-center justify-center cursor-pointer rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] transition-colors shadow-xs"
				title="Дополнительные действия этапа"
				aria-label="Дополнительные действия этапа"
				aria-expanded={isOpen}
				data-testid={`stage-actions-menu-btn-${stage.id}`}
			>
				<MoreVertical className="h-4 w-4 text-[var(--muted)]" />
			</button>

			{isOpen && (
				<div
					className="absolute right-0 top-full mt-1 w-64 rounded-xl bg-[var(--paper-strong)] border border-[var(--line)] shadow-xl z-30 py-1.5 text-xs animate-in fade-in zoom-in-95 duration-100"
					role="menu"
				>
					{stage.status === "draft" && (
						<button
							type="button"
							onClick={() => {
								onStageStatusChange(stage.id, "in_progress");
								onToggle();
							}}
							className="w-full px-3 py-2 text-left hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer text-[var(--ink)] transition-colors"
							title="Начать оказание услуг на этапе без обязательного аванса"
							data-testid={`stage-start-no-advance-btn-${stage.id}`}
							role="menuitem"
						>
							<CheckCircle2 className="h-4 w-4 text-[var(--ok,#10b981)] shrink-0" />
							<span>Взять в работу без аванса</span>
						</button>
					)}

					{stage.status === "advance_paid" && (
						<button
							type="button"
							onClick={() => {
								onOpenActTab(stage.id);
								onToggle();
							}}
							className="w-full px-3 py-2 text-left hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer text-[var(--ink)] transition-colors"
							role="menuitem"
						>
							<FileCheck className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0" />
							<span>Закрыть актом</span>
						</button>
					)}

					<button
						type="button"
						onClick={() => {
							onOpenInstallmentModal(stage);
							onToggle();
						}}
						className="w-full px-3 py-2 text-left hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer text-[var(--ink)] transition-colors"
						title="Оформить беспроцентную банковскую рассрочку"
						data-testid={`stage-installment-btn-${stage.id}`}
						role="menuitem"
					>
						<CreditCard className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
						<span>Оформить рассрочку</span>
					</button>

					<button
						type="button"
						onClick={() => {
							onOpenFiscalTab(stage.id);
							onToggle();
						}}
						className="w-full px-3 py-2 text-left hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer text-[var(--ink)] transition-colors"
						data-testid={`stage-fiscal-btn-${stage.id}`}
						role="menuitem"
					>
						<QrCode className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
						<span>Кассовый чек</span>
					</button>
				</div>
			)}
		</div>
	);
};
