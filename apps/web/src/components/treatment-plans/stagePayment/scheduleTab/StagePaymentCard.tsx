/**
 * apps/web/src/components/treatment-plans/stagePayment/scheduleTab/StagePaymentCard.tsx
 *
 * Карточка одного этапа плана лечения в графике оплат.
 */

import React from "react";
import { formatKopecksRu } from "@dental/shared";
import { STAGE_STATUS_UI_MAP, getStagePresetByKind, type StagePaymentStatus } from "../stagePaymentPresets.js";
import type { MilestoneStage } from "../stagePaymentEngine.js";
import { StagePaymentCardActions } from "./StagePaymentCardActions";

export interface StagePaymentCardProps {
	readonly stage: MilestoneStage;
	readonly activeStageMenuId: string | null;
	readonly onToggleStageMenu: (stageId: string) => void;
	readonly onPayAdvance: (stageId: string) => void;
	readonly onStageStatusChange: (stageId: string, newStatus: StagePaymentStatus) => void;
	readonly onOpenActTab: (stageId: string) => void;
	readonly onOpenInstallmentModal: (stage: MilestoneStage) => void;
	readonly onOpenFiscalTab: (stageId: string) => void;
}

export const StagePaymentCard: React.FC<StagePaymentCardProps> = ({
	stage,
	activeStageMenuId,
	onToggleStageMenu,
	onPayAdvance,
	onStageStatusChange,
	onOpenActTab,
	onOpenInstallmentModal,
	onOpenFiscalTab,
}) => {
	const preset = getStagePresetByKind(stage.kind);
	const statusMeta = STAGE_STATUS_UI_MAP[stage.status] || STAGE_STATUS_UI_MAP.draft;
	const stageDue = Math.max(0, stage.totalKopecks - (stage.advancePaidKopecks + stage.completionPaidKopecks));

	return (
		<div className={`stage-item-card is-${stage.status.replace("_", "-")}`}>
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="flex items-start gap-3">
					<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--paper-soft)] border border-[var(--line-subtle)] text-[var(--ink)] font-bold text-sm">
						{stage.stageNumber}
					</div>
					<div>
						<div className="flex items-center gap-2">
							<h3 className="font-bold text-base text-[var(--ink)]">{stage.title}</h3>
							<span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${statusMeta.badgeClass}`}>
								{statusMeta.labelRu}
							</span>
						</div>
						<p className="text-xs text-[var(--muted)] mt-0.5">{preset.clinicalGoalRu}</p>
					</div>
				</div>

				<div className="text-right">
					<span className="text-xs text-[var(--muted)] block">Стоимость этапа:</span>
					<span className="text-lg font-extrabold text-[var(--ink)]">{formatKopecksRu(stage.totalKopecks)}</span>
				</div>
			</div>

			<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl bg-[var(--paper-soft)] p-3 text-xs border border-[var(--line-subtle)]">
				<div>
					<span className="text-[var(--muted)] block">Аванс ({preset.defaultAdvancePercent}%):</span>
					<span className="font-semibold text-[var(--ink)]">{formatKopecksRu(stage.advanceRequiredKopecks)}</span>
				</div>
				<div>
					<span className="text-[var(--muted)] block">Внесено аванса:</span>
					<span className={`font-semibold ${stage.advancePaidKopecks >= stage.advanceRequiredKopecks ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600"}`}>
						{formatKopecksRu(stage.advancePaidKopecks)}
					</span>
				</div>
				<div>
					<span className="text-[var(--muted)] block">В эскроу (заморожено):</span>
					<span className="font-semibold text-[var(--teal,var(--brand-primary))]">{formatKopecksRu(stage.escrowLockedKopecks)}</span>
				</div>
				<div>
					<span className="text-[var(--muted)] block">Остаток к доплате:</span>
					<span className="font-semibold text-[var(--ink)]">{formatKopecksRu(stageDue)}</span>
				</div>
			</div>

			<div className="text-xs">
				<span className="font-semibold text-[var(--ink)] block mb-1">Клинические вехи этапа:</span>
				<div className="flex flex-wrap gap-1.5">
					{preset.clinicalMilestones.map((m, i) => (
						<span key={i} className="rounded-md bg-[var(--paper-soft)] text-[var(--muted)] px-2.5 py-0.5 border border-[var(--line-subtle)] text-[11px]">
							• {m}
						</span>
					))}
				</div>
			</div>

			<div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--line)]">
				<div className="text-[11px] text-[var(--muted)] italic">{preset.legalBasisRu}</div>
				<StagePaymentCardActions
					stage={stage}
					activeStageMenuId={activeStageMenuId}
					onToggleStageMenu={onToggleStageMenu}
					onPayAdvance={onPayAdvance}
					onStageStatusChange={onStageStatusChange}
					onOpenActTab={onOpenActTab}
					onOpenInstallmentModal={onOpenInstallmentModal}
					onOpenFiscalTab={onOpenFiscalTab}
				/>
			</div>
		</div>
	);
};
