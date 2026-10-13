/**
 * StagePaymentScheduleTab.tsx — Вкладка графика этапов и оплат (DENTE CRM).
 *
 * Содержит:
 * 1. Карточку общего прогресса и сводных сумм (выполнено, оплачено, в эскроу, остаток).
 * 2. Список карточек этапов с финансовой разбивкой, клиническими вехами и контекстным меню.
 */

import React from "react";
import {
	CheckCircle2,
	Coins,
	CreditCard,
	FileCheck,
	Lock,
	MoreVertical,
	QrCode,
} from "lucide-react";
import { formatKopecksRu } from "@dental/shared";
import {
	STAGE_STATUS_UI_MAP,
	getStagePresetByKind,
	type StagePaymentStatus,
} from "./stagePaymentPresets.js";
import type { MilestoneStage, StagePaymentTotals } from "./stagePaymentEngine.js";

export interface StagePaymentScheduleTabProps {
	readonly stages: readonly MilestoneStage[];
	readonly totals: StagePaymentTotals;
	readonly activeStageMenuId: string | null;
	readonly onToggleStageMenu: (stageId: string) => void;
	readonly onPayAdvance: (stageId: string) => void;
	readonly onStageStatusChange: (stageId: string, newStatus: StagePaymentStatus) => void;
	readonly onOpenActTab: (stageId: string) => void;
	readonly onOpenInstallmentModal: (stage: MilestoneStage) => void;
	readonly onOpenFiscalTab: (stageId: string) => void;
}

export const StagePaymentScheduleTab: React.FC<StagePaymentScheduleTabProps> = ({
	stages,
	totals,
	activeStageMenuId,
	onToggleStageMenu,
	onPayAdvance,
	onStageStatusChange,
	onOpenActTab,
	onOpenInstallmentModal,
	onOpenFiscalTab,
}) => {
	return (
		<div className="flex flex-col gap-5">
			{/* Progress Bar & Summary Card */}
			<div className="stage-progress-card">
				<div className="flex flex-wrap items-center justify-between gap-4">
					<div>
						<span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted,#64748b)]">
							Прогресс закрытия комплексного плана
						</span>
						<div className="flex items-baseline gap-2 mt-0.5">
							<span className="text-2xl font-extrabold text-[var(--ink,#0f172a)]">
								{totals.progressPercent}%
							</span>
							<span className="text-xs text-[var(--muted,#64748b)]">
								(Выполнено и принято: {formatKopecksRu(totals.totalActCompletedKopecks)} из {formatKopecksRu(totals.grandTotalKopecks)})
							</span>
						</div>
					</div>

					<div className="flex flex-wrap items-center gap-4 text-xs">
						<div className="rounded-lg bg-[var(--paper)] border border-[var(--line)] px-3 py-1.5 shadow-xs">
							<span className="text-[var(--muted)] block">Всего оплачено:</span>
							<span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
								{formatKopecksRu(totals.totalPaidKopecks)}
							</span>
						</div>
						<div className="rounded-lg bg-[var(--paper)] border border-[var(--line)] px-3 py-1.5 shadow-xs">
							<span className="text-[var(--muted)] block">В эскроу (резерв):</span>
							<span className="font-bold text-[var(--teal,var(--brand-primary))] text-sm">
								{formatKopecksRu(totals.totalEscrowLockedKopecks)}
							</span>
						</div>
						<div className="rounded-lg bg-[var(--paper)] border border-[var(--line)] px-3 py-1.5 shadow-xs">
							<span className="text-[var(--muted)] block">Остаток к доплате:</span>
							<span className="font-bold text-amber-600 dark:text-amber-400 text-sm">
								{formatKopecksRu(totals.remainingDueKopecks)}
							</span>
						</div>
					</div>
				</div>

				{/* Progress Track */}
				<div className="stage-progress-track">
					<div
						className="stage-progress-fill"
						style={{ width: `${totals.progressPercent}%` }}
					/>
				</div>
			</div>

			{/* Stage Cards List */}
			<div className="flex flex-col gap-4">
				{stages.map((stage) => {
					const preset = getStagePresetByKind(stage.kind);
					const statusMeta = STAGE_STATUS_UI_MAP[stage.status] || STAGE_STATUS_UI_MAP.draft;
					const stageDue = Math.max(
						0,
						stage.totalKopecks - (stage.advancePaidKopecks + stage.completionPaidKopecks),
					);

					return (
						<div
							key={stage.id}
							className={`stage-item-card is-${stage.status.replace("_", "-")}`}
						>
							{/* Stage Top Row */}
							<div className="flex flex-wrap items-start justify-between gap-3">
								<div className="flex items-start gap-3">
									<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--paper-soft)] border border-[var(--line-subtle)] text-[var(--ink)] font-bold text-sm">
										{stage.stageNumber}
									</div>
									<div>
										<div className="flex items-center gap-2">
											<h3 className="font-bold text-base text-[var(--ink)]">
												{stage.title}
											</h3>
											<span
												className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${statusMeta.badgeClass}`}
											>
												{statusMeta.labelRu}
											</span>
										</div>
										<p className="text-xs text-[var(--muted)] mt-0.5">
											{preset.clinicalGoalRu}
										</p>
									</div>
								</div>

								{/* Stage Total Amount */}
								<div className="text-right">
									<span className="text-xs text-[var(--muted)] block">
										Стоимость этапа:
									</span>
									<span className="text-lg font-extrabold text-[var(--ink)]">
										{formatKopecksRu(stage.totalKopecks)}
									</span>
								</div>
							</div>

							{/* Financial Breakdown Grid */}
							<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl bg-[var(--paper-soft)] p-3 text-xs border border-[var(--line-subtle)]">
								<div>
									<span className="text-[var(--muted)] block">Аванс ({preset.defaultAdvancePercent}%):</span>
									<span className="font-semibold text-[var(--ink)]">
										{formatKopecksRu(stage.advanceRequiredKopecks)}
									</span>
								</div>
								<div>
									<span className="text-[var(--muted)] block">Внесено аванса:</span>
									<span className={`font-semibold ${stage.advancePaidKopecks >= stage.advanceRequiredKopecks ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600"}`}>
										{formatKopecksRu(stage.advancePaidKopecks)}
									</span>
								</div>
								<div>
									<span className="text-[var(--muted)] block">В эскроу (заморожено):</span>
									<span className="font-semibold text-[var(--teal,var(--brand-primary))]">
										{formatKopecksRu(stage.escrowLockedKopecks)}
									</span>
								</div>
								<div>
									<span className="text-[var(--muted)] block">Остаток к доплате:</span>
									<span className="font-semibold text-[var(--ink)]">
										{formatKopecksRu(stageDue)}
									</span>
								</div>
							</div>

							{/* Clinical Milestones */}
							<div className="text-xs">
								<span className="font-semibold text-[var(--ink)] block mb-1">
									Клинические вехи этапа:
								</span>
								<div className="flex flex-wrap gap-1.5">
									{preset.clinicalMilestones.map((m, i) => (
										<span
											key={i}
											className="rounded-md bg-[var(--paper-soft)] text-[var(--muted)] px-2.5 py-0.5 border border-[var(--line-subtle)] text-[11px]"
										>
											• {m}
										</span>
									))}
								</div>
							</div>

							{/* Action Bar */}
							<div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--line)]">
								<div className="text-[11px] text-[var(--muted)] italic">
									{preset.legalBasisRu}
								</div>

								<div className="flex items-center gap-1.5 shrink-0">
									{stage.status === "draft" && (
										<button
											type="button"
											onClick={() => onPayAdvance(stage.id)}
											className="stage-action-btn primary"
										>
											<Coins className="h-4 w-4" />
											<span>Внести аванс ({formatKopecksRu(stage.advanceRequiredKopecks)})</span>
										</button>
									)}

									{stage.status === "advance_paid" && (
										<button
											type="button"
											onClick={() => onStageStatusChange(stage.id, "in_progress")}
											className="stage-action-btn primary"
										>
											<Lock className="h-4 w-4" />
											<span>Взять в работу (Эскроу)</span>
										</button>
									)}

									{stage.status === "in_progress" && (
										<button
											type="button"
											onClick={() => onOpenActTab(stage.id)}
											className="stage-action-btn primary"
										>
											<FileCheck className="h-4 w-4" />
											<span>Закрыть актом</span>
										</button>
									)}

									{/* Secondary Actions Context Menu */}
									<div className="relative">
										<button
											type="button"
											onClick={() => onToggleStageMenu(stage.id)}
											className="p-1.5 h-8 w-8 min-w-[32px] flex items-center justify-center cursor-pointer rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] transition-colors shadow-xs"
											title="Дополнительные действия этапа"
											aria-label="Дополнительные действия этапа"
											aria-expanded={activeStageMenuId === stage.id}
											data-testid={`stage-actions-menu-btn-${stage.id}`}
										>
											<MoreVertical className="h-4 w-4 text-[var(--muted)]" />
										</button>

										{activeStageMenuId === stage.id && (
											<div
												className="absolute right-0 top-full mt-1 w-64 rounded-xl bg-[var(--paper-strong)] border border-[var(--line)] shadow-xl z-30 py-1.5 text-xs animate-in fade-in zoom-in-95 duration-100"
												role="menu"
											>
												{stage.status === "draft" && (
													<button
														type="button"
														onClick={() => {
															onStageStatusChange(stage.id, "in_progress");
															onToggleStageMenu(stage.id);
														}}
														className="w-full px-3 py-2 text-left hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer text-[var(--ink)] transition-colors"
														title="Начать оказание услуг на этапе без обязательного аванса (доверие, гарантия, экстренный приём)"
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
															onToggleStageMenu(stage.id);
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
														onToggleStageMenu(stage.id);
													}}
													className="w-full px-3 py-2 text-left hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer text-[var(--ink)] transition-colors"
													title="Оформить беспроцентную банковскую рассрочку на этап (Сбер / Т-Банк / Подели)"
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
														onToggleStageMenu(stage.id);
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
								</div>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};

export default StagePaymentScheduleTab;
