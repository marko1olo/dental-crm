/**
 * TreatmentPlanStageFooter.tsx — Подвал этапа плана лечения
 * с итоговой суммой, первичными кнопками действий (В работу / Смета / Оплата / Акт)
 * и оверфлоу-меню вторичных действий (ЗТЛ, рассрочка, скидка, удаление).
 */

import React, { useEffect, useRef, useState } from "react";
import {
	Check,
	CreditCard,
	MoreVertical,
	Package,
	Percent,
	Play,
	Printer,
	Trash2,
	Zap,
} from "lucide-react";
import { DentalLabOrder } from "../icons/DentalIcons.js";
import type { TreatmentPlanStage, TreatmentPlanStageStatus } from "./types";

export interface StageStatusConfigItem {
	readonly label: string;
	readonly badge: string;
	readonly icon: React.ComponentType<{ size?: number; className?: string }>;
}

export interface TreatmentPlanStageFooterProps {
	readonly stage: TreatmentPlanStage;
	readonly currentStatus: TreatmentPlanStageStatus;
	readonly stageStatusConfig: Record<TreatmentPlanStageStatus, StageStatusConfigItem>;
	readonly onStartStage?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onExecuteWriteOffStage?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onPayStage?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onExportStageEstimate?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onOpenLabOrder?: ((teeth?: number[]) => void) | undefined;
	readonly onOneClickLabOrder?: ((teeth?: number[]) => void) | undefined;
	readonly onApplyStageDiscount?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onOpenInstallment?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onDeleteStage?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onSelectStatus: (newStatus: TreatmentPlanStageStatus, e?: React.MouseEvent) => void;
	readonly onStartStageClick: (e?: React.MouseEvent) => void;
}

export const TreatmentPlanStageFooter: React.FC<TreatmentPlanStageFooterProps> = ({
	stage,
	currentStatus,
	stageStatusConfig,
	onStartStage,
	onExecuteWriteOffStage,
	onPayStage,
	onExportStageEstimate,
	onOpenLabOrder,
	onOneClickLabOrder,
	onApplyStageDiscount,
	onOpenInstallment,
	onDeleteStage,
	onSelectStatus,
	onStartStageClick,
}) => {
	const [isStageMenuOpen, setIsStageMenuOpen] = useState<boolean>(false);
	const stageMenuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!isStageMenuOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") setIsStageMenuOpen(false);
		};
		const handleClickOutside = (e: MouseEvent) => {
			if (stageMenuRef.current && !stageMenuRef.current.contains(e.target as Node)) {
				setIsStageMenuOpen(false);
			}
		};
		document.addEventListener("keydown", handleKeyDown);
		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("keydown", handleKeyDown);
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isStageMenuOpen]);

	const isLabOrderEligible =
		stage.stageKind === "stage_3_orthopedics" ||
		stage.stageNumber === 3 ||
		stage.items.some(
			(it) =>
				it.category === "Ортопедия" ||
				it.category === "Детская ортопедия" ||
				/коронк|мост|протез|винир|вкладк|абатмент|бюгел/i.test(it.name),
		);

	const isAction1Start = Boolean(onStartStage);
	const isAction1WriteOff = !isAction1Start && Boolean(onExecuteWriteOffStage && stage.items.length > 0);

	const isAction2Estimate = Boolean(onExportStageEstimate);
	const isAction2Pay = !isAction2Estimate && Boolean(onPayStage && (stage.totalRub || 0) > 0);
	const isAction2WriteOff =
		!isAction2Estimate &&
		!isAction2Pay &&
		!isAction1WriteOff &&
		Boolean(onExecuteWriteOffStage && stage.items.length > 0);

	const showWriteOffInMenu = Boolean(
		onExecuteWriteOffStage && stage.items.length > 0 && !isAction1WriteOff && !isAction2WriteOff,
	);
	const showPayInMenu = Boolean(onPayStage && (stage.totalRub || 0) > 0 && !isAction2Pay);
	const showEstimateInMenu = Boolean(onExportStageEstimate && !isAction2Estimate);

	const hasSecondaryActions = Boolean(
		showWriteOffInMenu ||
		showPayInMenu ||
		showEstimateInMenu ||
		(onOpenLabOrder && isLabOrderEligible) ||
		(onOneClickLabOrder && isLabOrderEligible) ||
		(onOpenInstallment && stage.totalRub > 0) ||
		onApplyStageDiscount ||
		onDeleteStage,
	);

	return (
		<div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 text-xs font-semibold text-[var(--muted,#64748b)] border-t border-[var(--line,var(--border,#cbd5e1))] bg-[var(--paper-soft,#f8fafc)] rounded-b-2xl">
			<div className="flex items-center gap-2">
				<span>Итого за этап:</span>
				<span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
					{(stage.totalRub || 0).toLocaleString("ru-RU")} ₽
				</span>
			</div>

			{/* Action Buttons: Max 1-2 Direct Actions + More Menu '...' (Mandate 8d Sin 3, Miller's Law) */}
			<div className="flex items-center justify-end gap-2 flex-wrap">
				{/* Primary Direct Action 1: 'В работу' or 'Акт и списание' */}
				{isAction1Start ? (
					<button
						type="button"
						onClick={onStartStageClick}
						className="h-8 sm:h-8 min-h-[32px] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-h-[44px] px-3 rounded-lg text-[13px] font-semibold text-sky-800 dark:text-sky-200 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 cursor-pointer transition-colors flex items-center justify-center gap-1.5 shrink-0 touch-manipulation shadow-2xs"
						title={`Взять этап №${stage.stageNumber} «${stage.title}» в работу`}
						data-testid={`stage-${stage.stageNumber}-start-btn`}
					>
						<Play size={13} className="text-sky-600 dark:text-sky-400 shrink-0 fill-current" />
						<span>В работу</span>
					</button>
				) : isAction1WriteOff ? (
					<button
						type="button"
						onClick={() => onExecuteWriteOffStage!(stage)}
						className="h-8 sm:h-8 min-h-[32px] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-h-[44px] px-3 rounded-lg text-[13px] font-medium text-[var(--teal-dark,var(--teal))] bg-[var(--teal-soft,var(--paper-soft))] hover:bg-[var(--teal-soft,var(--paper-soft))] border border-[var(--teal,var(--brand-primary))]/30 cursor-pointer transition-colors flex items-center justify-center gap-1.5 shrink-0 touch-manipulation shadow-2xs"
						title="Сформировать Акт выполненных работ и провести списание ТМЦ со склада"
						data-testid={`stage-${stage.stageNumber}-writeoff-btn`}
					>
						<Package size={14} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
						<span>Акт и списание</span>
					</button>
				) : null}

				{/* Primary Direct Action 2: 'Смета' or 'Оплатить этап' or 'Акт и списание' */}
				{isAction2Estimate ? (
					<button
						type="button"
						onClick={() => onExportStageEstimate!(stage)}
						className="h-8 sm:h-8 min-h-[32px] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-h-[44px] px-3 rounded-lg text-[13px] font-medium text-[var(--ink,#0f172a)] bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,var(--border,#cbd5e1))] cursor-pointer transition-colors flex items-center justify-center gap-1.5 shrink-0 touch-manipulation shadow-2xs"
						title={`Печать сметы и спецификации по этапу №${stage.stageNumber}`}
						data-testid={`stage-${stage.stageNumber}-estimate-btn`}
					>
						<Printer size={14} className="text-[var(--muted,#64748b)] shrink-0" />
						<span>Смета</span>
					</button>
				) : isAction2Pay ? (
					<button
						type="button"
						onClick={() => onPayStage!(stage)}
						className="h-8 sm:h-8 min-h-[32px] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-h-[44px] px-3 rounded-lg text-[13px] font-semibold text-emerald-800 dark:text-emerald-200 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 cursor-pointer transition-colors flex items-center justify-center gap-1.5 shrink-0 touch-manipulation shadow-2xs"
						title={`Принять оплату за этап №${stage.stageNumber} (${(stage.totalRub || 0).toLocaleString("ru-RU")} ₽)`}
						data-testid={`stage-${stage.stageNumber}-pay-btn`}
					>
						<CreditCard size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
						<span>Оплатить этап</span>
					</button>
				) : isAction2WriteOff ? (
					<button
						type="button"
						onClick={() => onExecuteWriteOffStage!(stage)}
						className="h-8 sm:h-8 min-h-[32px] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-h-[44px] px-3 rounded-lg text-[13px] font-medium text-[var(--teal-dark,var(--teal))] bg-[var(--teal-soft,var(--paper-soft))] hover:bg-[var(--teal-soft,var(--paper-soft))] border border-[var(--teal,var(--brand-primary))]/30 cursor-pointer transition-colors flex items-center justify-center gap-1.5 shrink-0 touch-manipulation shadow-2xs"
						title="Сформировать Акт выполненных работ и провести списание ТМЦ со склада"
						data-testid={`stage-${stage.stageNumber}-writeoff-btn`}
					>
						<Package size={14} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
						<span>Акт и списание</span>
					</button>
				) : null}

				{/* Secondary Stage Operations Overflow Popover Menu [...] (Miller's Law, Mandate 8d Sin 3) */}
				{hasSecondaryActions && (
					<div className="relative inline-flex items-center" ref={stageMenuRef}>
						<button
							type="button"
							onClick={() => setIsStageMenuOpen((prev) => !prev)}
							className="h-8 w-8 min-h-[32px] min-w-[32px] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11 [@media(pointer:coarse)]:min-h-[44px] [@media(pointer:coarse)]:min-w-[44px] rounded-lg border border-[var(--line,var(--border,#cbd5e1))] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] cursor-pointer flex items-center justify-center shrink-0 shadow-2xs transition-colors touch-manipulation"
							title="Дополнительные действия этапа"
							aria-label="Дополнительные действия этапа"
							aria-expanded={isStageMenuOpen}
							data-testid={`stage-${stage.stageNumber}-menu-btn`}
						>
							<MoreVertical size={14} className="text-[var(--muted,#64748b)]" />
						</button>

						{isStageMenuOpen && (
							<div
								className="absolute right-0 bottom-full mb-1.5 z-50 flex flex-col gap-0.5 p-1.5 bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--line,var(--border,#cbd5e1))] rounded-xl shadow-xl min-w-[220px] text-xs animate-in fade-in zoom-in-95 duration-100"
								role="menu"
							>
								{/* 0. Смена статуса этапа (Mandate 8e: Doctor Autonomy) */}
								<div className="px-2.5 py-1 text-[11.5px] font-semibold text-[var(--muted,#64748b)] uppercase tracking-wider">
									Статус этапа:
								</div>
								{(["draft", "agreed", "in_progress", "completed"] as const).map((st) => {
									const cfg = stageStatusConfig[st];
									const ItemIcon = cfg.icon;
									const isCurrent = currentStatus === st;
									return (
										<button
											key={st}
											type="button"
											onClick={(e) => {
												setIsStageMenuOpen(false);
												onSelectStatus(st, e);
											}}
											className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-2 cursor-pointer transition-colors h-7 ${
												isCurrent
													? "font-bold text-[var(--teal-dark,var(--teal))] bg-[var(--teal-soft,var(--paper-soft))]"
													: "font-medium text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)]"
											}`}
											role="menuitem"
										>
											<ItemIcon size={12} />
											<span>{cfg.label}</span>
											{isCurrent && (
												<Check size={12} className="ml-auto text-[var(--teal-dark,var(--teal))] shrink-0" />
											)}
										</button>
									);
								})}

								<div className="my-1 border-t border-[var(--line,var(--border,#cbd5e1))]" />

								{/* 1. Акт и списание (если не вынесен на карточку) */}
								{showWriteOffInMenu && (
									<button
										type="button"
										onClick={() => {
											setIsStageMenuOpen(false);
											onExecuteWriteOffStage!(stage);
										}}
										className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[var(--teal-dark,var(--teal))] hover:bg-[var(--teal-soft,var(--paper-soft))] transition-colors flex items-center gap-2 cursor-pointer touch-manipulation h-8"
										title="Сформировать Акт выполненных работ и провести списание ТМЦ со склада"
										data-testid={`stage-${stage.stageNumber}-writeoff-menu-btn`}
										role="menuitem"
									>
										<Package size={14} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
										<span>Акт и списание</span>
									</button>
								)}

								{/* 2. Оплатить этап (если не вынесен на карточку) */}
								{showPayInMenu && (
									<button
										type="button"
										onClick={() => {
											setIsStageMenuOpen(false);
											onPayStage!(stage);
										}}
										className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-800 dark:text-emerald-200 hover:bg-emerald-500/10 transition-colors flex items-center gap-2 cursor-pointer touch-manipulation h-8"
										title={`Принять оплату за этап №${stage.stageNumber} (${(stage.totalRub || 0).toLocaleString("ru-RU")} ₽)`}
										data-testid={`stage-${stage.stageNumber}-pay-menu-btn`}
										role="menuitem"
									>
										<CreditCard size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
										<span>Оплатить этап</span>
									</button>
								)}

								{/* 3. Экспорт сметы этапа (если не вынесен на карточку) */}
								{showEstimateInMenu && (
									<button
										type="button"
										onClick={() => {
											setIsStageMenuOpen(false);
											onExportStageEstimate!(stage);
										}}
										className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] transition-colors flex items-center gap-2 cursor-pointer touch-manipulation h-8"
										title="Печать или экспорт сметы по данному этапу"
										data-testid={`stage-${stage.stageNumber}-export-btn`}
										role="menuitem"
									>
										<Printer size={14} className="text-[var(--muted,#64748b)] shrink-0" />
										<span>Экспорт сметы этапа</span>
									</button>
								)}

								{/* 4. Наряд-заказ в ЗТЛ */}
								{onOpenLabOrder && isLabOrderEligible && (
									<button
										type="button"
										onClick={() => {
											setIsStageMenuOpen(false);
											const stageTeeth = stage.items
												.map((it) => it.toothNumber)
												.filter((t): t is number => typeof t === "number" && t > 0);
											onOpenLabOrder(stageTeeth.length > 0 ? stageTeeth : undefined);
										}}
										className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] transition-colors flex items-center gap-2 cursor-pointer touch-manipulation h-8"
										title="Оформить наряд-заказ в зуботехническую лабораторию"
										data-testid={`stage-${stage.stageNumber}-lab-order-btn`}
										role="menuitem"
									>
										<DentalLabOrder size={14} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
										<span>Наряд-заказ в ЗТЛ</span>
									</button>
								)}

								{/* 5. 1-клик ЗТЛ */}
								{onOneClickLabOrder && isLabOrderEligible && (
									<button
										type="button"
										onClick={() => {
											setIsStageMenuOpen(false);
											const stageTeeth = stage.items
												.map((it) => it.toothNumber)
												.filter((t): t is number => typeof t === "number" && t > 0);
											onOneClickLabOrder(stageTeeth.length > 0 ? stageTeeth : undefined);
										}}
										className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold text-amber-900 dark:text-amber-200 hover:bg-amber-500/15 transition-colors flex items-center gap-2 cursor-pointer touch-manipulation h-8"
										title="Оформить наряд в ЗТЛ (Диоксид циркония / E.max, цвет VITA A2, +7 раб. дней)"
										data-testid={`stage-${stage.stageNumber}-lab-order-one-click-btn`}
										role="menuitem"
									>
										<Zap size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
										<span>Наряд ЗТЛ (Цирконий A2)</span>
									</button>
								)}

								{/* 6. Скидка на этап */}
								{onApplyStageDiscount && (
									<button
										type="button"
										onClick={() => {
											setIsStageMenuOpen(false);
											onApplyStageDiscount(stage);
										}}
										className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] transition-colors flex items-center gap-2 cursor-pointer touch-manipulation h-8"
										title="Применить скидку к этапу лечения"
										data-testid={`stage-${stage.stageNumber}-discount-btn`}
										role="menuitem"
									>
										<Percent size={14} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
										<span>Скидка на этап</span>
									</button>
								)}

								{/* 7. Рассрочка на этап */}
								{onOpenInstallment && stage.totalRub > 0 && (
									<button
										type="button"
										onClick={() => {
											setIsStageMenuOpen(false);
											onOpenInstallment(stage);
										}}
										className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-800 dark:text-emerald-200 hover:bg-emerald-500/10 transition-colors flex items-center gap-2 cursor-pointer touch-manipulation h-8"
										title={`Оформить беспроцентную банковскую рассрочку (Сбер / Т-Банк / Подели) на этап №${stage.stageNumber}`}
										data-testid={`stage-${stage.stageNumber}-installment-btn`}
										role="menuitem"
									>
										<CreditCard size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
										<span>Рассрочка на этап</span>
									</button>
								)}

								{/* 8. Удалить этап */}
								{onDeleteStage && (
									<>
										<div className="my-1 border-t border-[var(--line,var(--border,#cbd5e1))]" />
										<button
											type="button"
											onClick={() => {
												setIsStageMenuOpen(false);
												onDeleteStage(stage);
											}}
											className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center gap-2 cursor-pointer touch-manipulation h-8"
											title="Удалить данный этап из плана лечения"
											data-testid={`stage-${stage.stageNumber}-delete-btn`}
											role="menuitem"
										>
											<Trash2 size={14} className="text-rose-600 dark:text-rose-400 shrink-0" />
											<span>Удалить этап</span>
										</button>
									</>
								)}
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
};
