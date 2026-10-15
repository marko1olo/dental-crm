/**
 * ShiftBatchDeductionModal.tsx — 1-клик пакетное списание расходников за смену (Мандаты 8e, 8n).
 *
 * Инварианты:
 * 1. Старшая медсестра или администратор при закрытии смены видит сводку всех оказанных за день услуг.
 * 2. Расходники списываются автоматически по техкартам (BOM) оказанных услуг без поштучного прокликивания.
 * 3. Soft Negative Stock (Мандат 8n): если позиция уходит в минус, списание не блокируется,
 *    а уходит в мягкий минус с формированием фоновой заявки в бэкофисе.
 * 4. Тач-таргеты >= 44x44px, семантические токены var(--paper), var(--ink), var(--line).
 */

import {
	AlertTriangle,
	CheckCircle2,
	ChevronRight,
	Clock,
	Layers,
	Loader2,
	PackageCheck,
	Sparkles,
	Syringe,
	X,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { showToast } from "../GlobalToast.js";

export interface ShiftSummaryProcedure {
	name: string;
	code?: string;
	count: number;
}

export interface ShiftConsumableItem {
	itemId: string;
	itemName: string;
	category: string;
	unit: string;
	qtyToDeduct: number;
	currentStock: number;
	projectedStock: number;
	isOverdraft: boolean;
	deficit: number;
}

export interface ShiftSummaryData {
	date: string;
	shiftStats: {
		completedVisitsCount: number;
		totalProceduresCount: number;
		breakdown: ShiftSummaryProcedure[];
	};
	consumablesSummary: ShiftConsumableItem[];
	totalItemsCount: number;
	overdraftItemsCount: number;
	isAlreadyDeducted: boolean;
}

export interface ShiftBatchDeductionModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly organizationId: string;
	readonly onDeductionComplete?: () => void;
}

export const ShiftBatchDeductionModal: React.FC<ShiftBatchDeductionModalProps> = ({
	isOpen,
	onClose,
	organizationId,
	onDeductionComplete,
}) => {
	const [isLoading, setIsLoading] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [summaryData, setSummaryData] = useState<ShiftSummaryData | null>(null);
	const [loadError, setLoadError] = useState<string | null>(null);

	// Загрузка сводки смены при открытии
	useEffect(() => {
		if (!isOpen) return;

		let isMounted = true;
		setIsLoading(true);
		setLoadError(null);

		const fetchSummary = async () => {
			try {
				const res = await fetch(`/api/inventory/${organizationId}/shift-summary`);
				if (!res.ok) {
					// Fallback на unparameterized роут
					const fallbackRes = await fetch("/api/inventory/shift-summary");
					if (!fallbackRes.ok) throw new Error("Не удалось загрузить сводку смены");
					const data = await fallbackRes.json();
					if (isMounted) setSummaryData(data);
					return;
				}
				const data = await res.json();
				if (isMounted) setSummaryData(data);
			} catch (err) {
				if (isMounted) {
					setLoadError(err instanceof Error ? err.message : "Ошибка загрузки данных смены");
				}
			} finally {
				if (isMounted) setIsLoading(false);
			}
		};

		fetchSummary();

		return () => {
			isMounted = false;
		};
	}, [isOpen, organizationId]);

	// Закрытие по клавише Escape
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && isOpen && !isSubmitting) {
				onClose();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, isSubmitting, onClose]);

	// Выполнение 1-кликового списания
	const handleExecuteShiftDeduction = async () => {
		if (isSubmitting) return;
		setIsSubmitting(true);

		try {
			const res = await fetch(`/api/inventory/${organizationId}/shift-deduct`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					date: summaryData?.date,
					notes: "Пакетное списание расходников за смену медсестрой (1 клик)",
				}),
			});

			if (!res.ok) {
				// Fallback
				const fallbackRes = await fetch("/api/inventory/shift-deduct", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						organizationId,
						date: summaryData?.date,
					}),
				});
				if (!fallbackRes.ok) {
					throw new Error("Сбой проведения списания за смену");
				}
			}

			showToast(
				"Расходники за смену успешно списаны пакетом в 1 клик. Дефицитные позиции направлены в фоновую заявку поставщику.",
				"success",
			);

			if (onDeductionComplete) {
				onDeductionComplete();
			}
			onClose();
		} catch (err) {
			showToast(
				err instanceof Error ? err.message : "Не удалось выполнить списание за смену",
				"error",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	if (!isOpen) return null;

	const modalContent = (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
			role="dialog"
			aria-modal="true"
			aria-labelledby="shift-deduction-title"
			onClick={(e) => {
				if (e.target === e.currentTarget && !isSubmitting) onClose();
			}}
		>
			<div className="relative w-full max-w-3xl my-auto rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-[var(--ink)]">
				{/* ШАПКА */}
				<div className="px-5 py-4 border-b border-[var(--line)] flex items-center justify-between gap-3 bg-[var(--paper-soft)] shrink-0">
					<div className="flex items-center gap-3 min-w-0">
						<div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0">
							<PackageCheck className="w-5 h-5" />
						</div>
						<div className="min-w-0">
							<div className="flex items-center gap-2 flex-wrap">
								<h2 id="shift-deduction-title" className="text-base font-bold truncate">
									Списание расходников за смену
								</h2>
								<span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--primary)]/15 text-[var(--primary)] shrink-0">
									1 клик по техкартам BOM
								</span>
							</div>
							<p className="text-xs text-[var(--ink-muted)] truncate">
								Старшая медсестра / Администратор при закрытии смены • Мягкий овердрафт
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						disabled={isSubmitting}
						className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-xl flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)] transition-colors cursor-pointer shrink-0 disabled:opacity-50"
						aria-label="Закрыть"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* ТЕЛО МОДАЛКИ */}
				<div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4">
					{isLoading ? (
						<div className="py-12 flex flex-col items-center justify-center gap-3 text-[var(--ink-muted)]">
							<Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
							<span className="text-sm font-medium">Расчёт технологических карт смены...</span>
						</div>
					) : loadError ? (
						<div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
							{loadError}
						</div>
					) : summaryData ? (
						<>
							{/* КЛИНИЧЕСКАЯ СВОДКА СМЕНЫ */}
							<div className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-2">
								<div className="flex items-center justify-between gap-2 text-xs font-semibold">
									<div className="flex items-center gap-1.5 text-[var(--ink)]">
										<Clock className="w-4 h-4 text-[var(--primary)]" />
										<span>Оказано услуг за сегодня ({summaryData.date}):</span>
									</div>
									<span className="text-[var(--ink-muted)]">
										Визитов: <strong>{summaryData.shiftStats.completedVisitsCount}</strong>
									</span>
								</div>

								<div className="flex flex-wrap gap-1.5 pt-1">
									{summaryData.shiftStats.breakdown.map((proc, idx) => (
										<span
											key={idx}
											className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--paper)] border border-[var(--line-subtle)] text-xs text-[var(--ink)] shadow-2xs"
										>
											<span className="font-bold text-[var(--primary)]">{proc.count}x</span>
											<span>{proc.name}</span>
										</span>
									))}
								</div>
							</div>

							{/* ПРЕДУПРЕЖДЕНИЕ О МЯГКОМ ОВЕРДРАФТЕ (Мандат 8n) */}
							{summaryData.overdraftItemsCount > 0 && (
								<div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-200">
									<AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
									<div className="space-y-0.5 leading-relaxed">
										<strong className="font-bold block">
											Мягкий овердрафт активен для {summaryData.overdraftItemsCount} поз.
										</strong>
										<span>
											Прием и касса не блокируются. Отрицательный остаток зафиксирован в журнале,
											в бэкофисе сформирована тихая заявка поставщику.
										</span>
									</div>
								</div>
							)}

							{/* ТАБЛИЦА РАСХОДНИКОВ К СПИСАНИЮ */}
							<div className="space-y-2">
								<div className="flex items-center justify-between text-xs text-[var(--ink-muted)] px-1 font-semibold">
									<span>Материалы по техкартам ({summaryData.totalItemsCount} поз.)</span>
									<span>Расход за смену → Остаток</span>
								</div>

								<div className="rounded-xl border border-[var(--line)] overflow-hidden divide-y divide-[var(--line)] bg-[var(--paper)]">
									{summaryData.consumablesSummary.map((item) => (
										<div
											key={item.itemId}
											className="p-3 flex items-center justify-between gap-3 text-xs hover:bg-[var(--paper-soft)] transition-colors"
										>
											<div className="min-w-0 space-y-0.5">
												<div className="font-semibold text-[var(--ink)] truncate">
													{item.itemName}
												</div>
												<div className="text-[11px] text-[var(--ink-muted)]">
													{item.category} • на складе: {item.currentStock} {item.unit}
												</div>
											</div>

											<div className="text-right shrink-0 space-y-0.5">
												<div className="font-bold text-sm text-[var(--ink)] font-mono">
													-{item.qtyToDeduct} {item.unit}
												</div>
												<div>
													{item.isOverdraft ? (
														<span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded-md">
															Дефицит: {item.projectedStock} {item.unit}
														</span>
													) : (
														<span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
															Останется: {item.projectedStock} {item.unit}
														</span>
													)}
												</div>
											</div>
										</div>
									))}
								</div>
							</div>
						</>
					) : null}
				</div>

				{/* ПОДВАЛ И CTA ДЕЙСТВИЕ */}
				<div className="px-5 py-4 border-t border-[var(--line)] bg-[var(--paper-soft)] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
					<div className="text-xs text-[var(--ink-muted)] text-center sm:text-left">
						{summaryData?.isAlreadyDeducted ? (
							<span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
								<CheckCircle2 className="w-3.5 h-3.5 inline" /> Смена за сегодня уже была списана
							</span>
						) : (
							<span>Списание проведётся без созыва комиссии в 1 клик</span>
						)}
					</div>

					<div className="flex items-center gap-2 w-full sm:w-auto">
						<button
							type="button"
							onClick={onClose}
							disabled={isSubmitting}
							className="flex-1 sm:flex-none h-11 min-h-[44px] px-4 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-xs font-semibold cursor-pointer transition-colors"
						>
							Отмена
						</button>

						<button
							type="button"
							onClick={handleExecuteShiftDeduction}
							disabled={isSubmitting || isLoading || !summaryData}
							data-testid="btn-confirm-shift-batch-deduction"
							className="flex-1 sm:flex-none h-11 min-h-[44px] px-5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-strong)] text-white text-xs font-bold inline-flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-colors disabled:opacity-50"
						>
							{isSubmitting ? (
								<>
									<Loader2 className="w-4 h-4 animate-spin" />
									<span>Списание...</span>
								</>
							) : (
								<>
									<PackageCheck className="w-4 h-4" />
									<span>Списать расходники за смену</span>
								</>
							)}
						</button>
					</div>
				</div>
			</div>
		</div>
	);

	return typeof document !== "undefined"
		? createPortal(modalContent, document.body)
		: modalContent;
};

export default ShiftBatchDeductionModal;
