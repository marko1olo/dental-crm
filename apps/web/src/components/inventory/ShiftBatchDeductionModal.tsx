/**
 * ShiftBatchDeductionModal.tsx — Единый SSOT пакетного списания расходных материалов DENTE (Мандаты 8e, 8n).
 *
 * Инварианты:
 * 1. Единый модуль консолидирует:
 *    - Списание расходников за смену (Батч дня в 1 клик по принятым пациентам)
 *    - Быстрые клинические пакеты (Анестезия, Гигиена, Пломба, Хирургия, Стерилизация, Карпулы)
 *    - Списание по протоколу процедуры (BOM конкретной услуги)
 * 2. Soft Negative Stock (Мандат 8n): если позиция уходит в минус, списание не блокируется,
 *    а уходит в мягкий минус с формированием фоновой заявки в бэкофисе.
 * 3. Тач-таргеты >= 44x44px, семантические токены var(--paper), var(--ink), var(--line), var(--teal).
 * 4. Строго <= 800 строк на файл (Мандат 8b).
 */

import {
	AlertTriangle,
	CheckCircle2,
	Clock,
	Layers,
	Loader2,
	PackageCheck,
	X,
	Zap,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { showToast } from "../GlobalToast.js";
import {
	type ClinicalPackageId,
	handleOneClickPackageWriteOff,
	type OneClickPackageWriteOffResult,
} from "./warehousePackageWriteOffEngine.js";
import type { InventoryItem } from "./useInventoryLogic.js";
import { ShiftBatchPackagesTab } from "./shiftBatchModules/ShiftBatchPackagesTab.js";
import { ShiftBatchProcedureTab } from "./shiftBatchModules/ShiftBatchProcedureTab.js";
import { isDemoShowcaseMode } from "../../utils/demoModeEngine.js";

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

export type ShiftBatchMode = "shift" | "packages" | "procedure";

export interface ShiftBatchDeductionModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly organizationId?: string | undefined;
	readonly onDeductionComplete?: () => void;
	readonly onConfirmDeduction?: () => void;
	readonly initialMode?: ShiftBatchMode | undefined;
	readonly procedureTitle?: string | undefined;
	readonly serviceCode?: string | undefined;
	readonly service804nCode?: string | undefined;
	readonly toothNumber?: number | undefined;
	readonly doctorName?: string | undefined;
	readonly patientName?: string | undefined;
	readonly warehouseItems?: readonly InventoryItem[] | undefined;
	readonly currentStockMap?: Record<string, number> | undefined;
}

const getDemoShiftSummary = (): ShiftSummaryData => {
	const todayStr = new Date().toISOString().slice(0, 10);
	return {
		date: todayStr,
		shiftStats: {
			completedVisitsCount: 6,
			totalProceduresCount: 9,
			breakdown: [
				{ name: "Лечение кариеса (световая пломба)", count: 4 },
				{ name: "Профессиональная гигиена Air-Flow", count: 2 },
				{ name: "Эндодонтия (механическая обработка)", count: 2 },
				{ name: "Удаление зуба сложное", count: 1 },
			],
		},
		consumablesSummary: [
			{
				itemId: "demo-item-gloves",
				itemName: "Перчатки смотровые нитриловые (пара)",
				category: "Расходные материалы",
				unit: "пар",
				qtyToDeduct: 14,
				currentStock: 120,
				projectedStock: 106,
				isOverdraft: false,
				deficit: 0,
			},
			{
				itemId: "demo-item-articaine",
				itemName: "Артикаин 1:100 000 (карпула 1.7 мл)",
				category: "Анестетики",
				unit: "карп.",
				qtyToDeduct: 8,
				currentStock: 45,
				projectedStock: 37,
				isOverdraft: false,
				deficit: 0,
			},
			{
				itemId: "demo-item-needles",
				itemName: "Иглы карпульные 0.3x21 мм",
				category: "Расходные материалы",
				unit: "шт.",
				qtyToDeduct: 8,
				currentStock: 92,
				projectedStock: 84,
				isOverdraft: false,
				deficit: 0,
			},
			{
				itemId: "demo-item-masks",
				itemName: "Маски трехслойные медицинские",
				category: "Расходные материалы",
				unit: "шт.",
				qtyToDeduct: 14,
				currentStock: 80,
				projectedStock: 66,
				isOverdraft: false,
				deficit: 0,
			},
			{
				itemId: "demo-item-saliva",
				itemName: "Слюноотсосы одноразовые",
				category: "Расходные материалы",
				unit: "шт.",
				qtyToDeduct: 10,
				currentStock: 6,
				projectedStock: -4,
				isOverdraft: true,
				deficit: 4,
			},
			{
				itemId: "demo-item-composite",
				itemName: "Композит световой Filtek Ultimate A2 (шприц)",
				category: "Пломбировочные материалы",
				unit: "порц.",
				qtyToDeduct: 4,
				currentStock: 15,
				projectedStock: 11,
				isOverdraft: false,
				deficit: 0,
			},
		],
		totalItemsCount: 6,
		overdraftItemsCount: 1,
		isAlreadyDeducted: false,
	};
};

export const ShiftBatchDeductionModal: React.FC<ShiftBatchDeductionModalProps> = ({
	isOpen,
	onClose,
	organizationId = "org-default",
	onDeductionComplete,
	onConfirmDeduction,
	initialMode = "shift",
	procedureTitle = "Препарирование и пломба светового отверждения (Filtek / Estelite)",
	serviceCode,
	service804nCode = "A16.07.002.011",
	toothNumber = 16,
	doctorName = "Кузнецов А.В.",
	patientName = "Смирнова Е.А.",
	warehouseItems,
	currentStockMap,
}) => {
	const [activeMode, setActiveMode] = useState<ShiftBatchMode>(initialMode);
	const [isLoading, setIsLoading] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const inFlightRef = useRef(false);
	const [summaryData, setSummaryData] = useState<ShiftSummaryData | null>(null);
	const [loadError, setLoadError] = useState<string | null>(null);

	// Состояние для вкладки клинических пакетов
	const [packageQuantityMultiplier, setPackageQuantityMultiplier] = useState<number>(1);
	const [submittingPackageId, setSubmittingPackageId] = useState<string | null>(null);
	const [lastPackageResult, setLastPackageResult] = useState<OneClickPackageWriteOffResult | null>(null);

	// Синхронизация режима при открытии
	useEffect(() => {
		if (isOpen) {
			setActiveMode(initialMode || "shift");
		}
	}, [isOpen, initialMode]);

	// Загрузка сводки смены при открытии
	useEffect(() => {
		if (!isOpen) return;

		let isMounted = true;
		setIsLoading(true);
		setLoadError(null);

		const fetchSummary = async () => {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 2500);

			try {
				let res = await fetch(`/api/warehouse/${organizationId}/shift-summary`, {
					signal: controller.signal,
					headers: { "x-organization-id": organizationId },
				}).catch(() => null);

				if (!res || !res.ok) {
					res = await fetch(`/api/inventory/${organizationId}/shift-summary`, {
						signal: controller.signal,
						headers: { "x-organization-id": organizationId },
					}).catch(() => null);
				}
				if (!res || !res.ok) {
					res = await fetch("/api/warehouse/shift-summary", {
						signal: controller.signal,
					}).catch(() => null);
				}
				if (!res || !res.ok) {
					res = await fetch("/api/inventory/shift-summary", {
						signal: controller.signal,
					}).catch(() => null);
				}

				clearTimeout(timeoutId);

				if (res && res.ok) {
					const data = await res.json();
					if (isMounted) setSummaryData(data);
					return;
				}

				if (isDemoShowcaseMode()) {
					if (isMounted) setSummaryData(getDemoShiftSummary());
					return;
				}

				throw new Error("Не удалось загрузить сводку смены");
			} catch (err) {
				clearTimeout(timeoutId);
				if (isMounted) {
					if (isDemoShowcaseMode()) {
						setSummaryData(getDemoShiftSummary());
					} else {
						setLoadError(err instanceof Error ? err.message : "Ошибка загрузки данных смены");
					}
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

	// Закрытие по Escape
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && isOpen && !isSubmitting && !submittingPackageId) {
				onClose();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, isSubmitting, submittingPackageId, onClose]);

	// 1-клик проведение списания за смену (Батч дня)
	const handleExecuteShiftDeduction = async () => {
		if (inFlightRef.current || isSubmitting) return;
		inFlightRef.current = true;
		setIsSubmitting(true);

		try {
			let res = await fetch(`/api/warehouse/${organizationId}/shift-deduct`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-organization-id": organizationId,
				},
				body: JSON.stringify({
					date: summaryData?.date,
					notes: "Пакетное списание расходников за смену медсестрой (1 клик)",
				}),
			}).catch(() => null);

			if (!res || !res.ok) {
				res = await fetch(`/api/inventory/${organizationId}/shift-deduct`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						date: summaryData?.date,
						notes: "Пакетное списание расходников за смену медсестрой (1 клик)",
					}),
				}).catch(() => null);
			}

			if (res && res.ok) {
				showToast(
					"Расходники за смену успешно списаны пакетом в 1 клик. Дефицитные позиции направлены в фоновую заявку поставщику.",
					"success",
				);
				if (onDeductionComplete) {
					onDeductionComplete();
				}
				onClose();
				return;
			}

			if (isDemoShowcaseMode()) {
				showToast(
					"Расходники за смену успешно списаны пакетом в 1 клик (Демо-режим). Мягкий овердрафт активен.",
					"success",
				);
				if (onDeductionComplete) {
					onDeductionComplete();
				}
				onClose();
				return;
			}

			throw new Error("Сбой проведения списания за смену");
		} catch (err) {
			if (isDemoShowcaseMode()) {
				showToast("Расходники за смену списаны в 1 клик (демо-режим)", "success");
				if (onDeductionComplete) onDeductionComplete();
				onClose();
			} else {
				showToast(
					err instanceof Error ? err.message : "Не удалось выполнить списание за смену",
					"error",
				);
			}
		} finally {
			inFlightRef.current = false;
			setIsSubmitting(false);
		}
	};

	// Списание клинического пакета (1 клик)
	const handlePackageClick = async (packageId: ClinicalPackageId) => {
		if (inFlightRef.current || submittingPackageId) return;
		inFlightRef.current = true;
		setSubmittingPackageId(packageId);

		try {
			const result = await handleOneClickPackageWriteOff({
				packageId,
				warehouseItems,
				currentStockMap,
				organizationId,
				doctorName,
				quantityMultiplier: packageQuantityMultiplier,
				allowSoftOverdraft: true,
			});

			setLastPackageResult(result);
			showToast(result.toastMessage, result.isOverdraft ? "warning" : "success");

			if (onDeductionComplete) {
				onDeductionComplete();
			}
		} catch (err) {
			showToast(err instanceof Error ? err.message : "Ошибка списания пакета", "error");
		} finally {
			inFlightRef.current = false;
			setTimeout(() => {
				setSubmittingPackageId(null);
			}, 300);
		}
	};

	// 1-клик списание по протоколу процедуры
	const handleConfirmProcedureDeduction = async () => {
		if (inFlightRef.current || isSubmitting) return;
		inFlightRef.current = true;
		setIsSubmitting(true);

		try {
			let res = await fetch(`/api/inventory/${organizationId}/deduct/visit`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					serviceCode: serviceCode || service804nCode,
					toothNumber,
					allowSoftOverdraft: true,
				}),
			});

			if (!res.ok) {
				res = await fetch(`/api/warehouse/${organizationId}/deduct/visit`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						serviceCode: serviceCode || service804nCode,
						toothNumber,
						allowSoftOverdraft: true,
					}),
				});
			}

			showToast(
				`Материалы по процедуре «${procedureTitle}» успешно списаны.`,
				"success",
			);

			if (onDeductionComplete) {
				onDeductionComplete();
			}
			onClose();
		} catch (err) {
			showToast(
				err instanceof Error ? err.message : "Не удалось списать материалы по процедуре",
				"error",
			);
		} finally {
			inFlightRef.current = false;
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
			data-testid="shift-batch-deduction-modal"
			data-modal-type="shift-batch"
			onClick={(e) => {
				if (e.target === e.currentTarget && !isSubmitting && !submittingPackageId) {
					onClose();
				}
			}}
		>
			<div className="relative w-full max-w-4xl lg:max-w-5xl my-auto rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-[var(--ink)]">
				{/* ШАПКА С СЕГМЕНТИРОВАННЫМ ПЕРЕКЛЮЧАТЕЛЕМ */}
				<div className="px-5 py-3 border-b border-[var(--line)] flex items-center justify-between gap-3 bg-[var(--paper-soft)] shrink-0">
					<div className="flex items-center gap-3 min-w-0">
						<div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 border border-teal-500/20">
							<PackageCheck className="w-5 h-5" />
						</div>
						<div className="min-w-0">
							<div className="flex items-center gap-2 flex-wrap">
								<h2 id="shift-deduction-title" className="text-base font-bold truncate">
									Списание расходников за смену
								</h2>
								<span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-800 dark:text-teal-200 shrink-0">
									1 клик по техкартам • Мягкий овердрафт
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] truncate">
								Старшая медсестра / Врач • Списание без созыва комиссии в 1 клик
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2">
						{/* Сегментированный переключатель 3 режимов */}
						<div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[var(--paper)] border border-[var(--line)] select-none shrink-0">
							<button
								type="button"
								onClick={() => setActiveMode("shift")}
								className={`h-9 px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
									activeMode === "shift"
										? "bg-teal-600 text-white shadow-xs"
										: "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
								data-testid="tab-mode-shift"
							>
								<PackageCheck className="w-3.5 h-3.5 shrink-0" />
								<span>За смену</span>
							</button>

							<button
								type="button"
								onClick={() => setActiveMode("packages")}
								className={`h-9 px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
									activeMode === "packages"
										? "bg-teal-600 text-white shadow-xs"
										: "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
								data-testid="tab-mode-packages"
							>
								<Zap className="w-3.5 h-3.5 shrink-0" />
								<span>Клинические пакеты</span>
							</button>

							<button
								type="button"
								onClick={() => setActiveMode("procedure")}
								className={`h-9 px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
									activeMode === "procedure"
										? "bg-teal-600 text-white shadow-xs"
										: "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
								data-testid="tab-mode-procedure"
							>
								<Layers className="w-3.5 h-3.5 shrink-0" />
								<span>По процедуре</span>
							</button>
						</div>

						<button
							type="button"
							onClick={onClose}
							disabled={isSubmitting || Boolean(submittingPackageId)}
							className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-xl flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)] transition-colors cursor-pointer shrink-0 disabled:opacity-50"
							aria-label="Закрыть"
						>
							<X className="w-5 h-5" />
						</button>
					</div>
				</div>

				{/* ТЕЛО МОДАЛКИ В ЗАВИСИМОСТИ ОТ РЕЖИМА */}
				<div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4">
					{/* РЕЖИМ 1: СВОДКА ЗА СМЕНУ (БАТЧ ДНЯ) */}
					{activeMode === "shift" && (
						<>
							{isLoading ? (
								<div className="py-14 flex flex-col items-center justify-center gap-3 text-[var(--muted)]">
									<Loader2 className="w-8 h-8 animate-spin text-teal-600" />
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
												<Clock className="w-4 h-4 text-teal-600" />
												<span>Оказано услуг за сегодня ({summaryData.date}):</span>
											</div>
											<span className="text-[var(--muted)]">
												Визитов пациентов: <strong>{summaryData.shiftStats.completedVisitsCount}</strong>
											</span>
										</div>

										<div className="flex flex-wrap gap-1.5 pt-1">
											{summaryData.shiftStats.breakdown.map((proc, idx) => (
												<span
													key={idx}
													className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-xs text-[var(--ink)] shadow-2xs"
												>
													<span className="font-bold text-teal-600">{proc.count}x</span>
													<span>{proc.name}</span>
												</span>
											))}
										</div>
									</div>

									{/* ПРЕДУПРЕЖДЕНИЕ О МЯГКОМ ОВЕРДРАФТЕ (Мандат 8n) */}
									{summaryData.overdraftItemsCount > 0 && (
										<div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
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
										<div className="flex items-center justify-between text-xs text-[var(--muted)] px-1 font-semibold">
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
														<div className="text-[11px] text-[var(--muted)]">
															{item.category} • на складе: {item.currentStock} {item.unit}
														</div>
													</div>

													<div className="text-right shrink-0 space-y-0.5">
														<div className="font-bold text-sm text-[var(--ink)] font-mono tabular-nums">
															-{item.qtyToDeduct} {item.unit}
														</div>
														<div>
															{item.isOverdraft ? (
																<span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded-md font-mono tabular-nums">
																	Дефицит: {item.projectedStock} {item.unit}
																</span>
															) : (
																<span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
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
						</>
					)}

					{/* РЕЖИМ 2: КЛИНИЧЕСКИЕ ПАКЕТЫ (1 КЛИК) */}
					{activeMode === "packages" && (
						<ShiftBatchPackagesTab
							packageQuantityMultiplier={packageQuantityMultiplier}
							setPackageQuantityMultiplier={setPackageQuantityMultiplier}
							submittingPackageId={submittingPackageId}
							onPackageClick={handlePackageClick}
							lastPackageResult={lastPackageResult}
						/>
					)}

					{/* РЕЖИМ 3: ПО ПРОЦЕДУРЕ (BOM) */}
					{activeMode === "procedure" && (
						<ShiftBatchProcedureTab
							procedureTitle={procedureTitle}
							serviceCode={serviceCode}
							service804nCode={service804nCode}
							toothNumber={toothNumber}
							doctorName={doctorName}
							patientName={patientName}
							currentStockMap={currentStockMap}
						/>
					)}
				</div>

				{/* ПОДВАЛ И CTA ДЕЙСТВИЯ */}
				<div className="px-5 py-3 border-t border-[var(--line)] bg-[var(--paper-soft)] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
					<div className="text-xs text-[var(--muted)] text-center sm:text-left min-w-0 flex-1 truncate">
						{activeMode === "shift" && (
							summaryData?.isAlreadyDeducted ? (
								<span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
									<CheckCircle2 className="w-3.5 h-3.5 inline shrink-0" /> Смена за сегодня уже списана
								</span>
							) : (
								<span>Списание по техкартам за смену в 1 клик • Мягкий овердрафт активен</span>
							)
						)}
						{activeMode === "packages" && (
							<span>Выберите пакет и нажмите кнопку списания • Мгновенное списание</span>
						)}
						{activeMode === "procedure" && (
							<span>Списание набора материалов для текущего клинического визита</span>
						)}
					</div>

					<div className="flex items-center gap-2 shrink-0 justify-end">
						<button
							type="button"
							onClick={onClose}
							disabled={isSubmitting || Boolean(submittingPackageId)}
							className="min-h-[44px] sm:min-h-[36px] sm:h-9 px-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap shrink-0"
						>
							Закрыть
						</button>

						{activeMode === "shift" && (
							<button
								type="button"
								onClick={handleExecuteShiftDeduction}
								disabled={isSubmitting || isLoading || !summaryData}
								data-testid="btn-confirm-shift-batch-deduction"
								className="min-h-[44px] sm:min-h-[36px] sm:h-9 px-3.5 sm:px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 sm:gap-2 shadow-xs cursor-pointer transition-all active:scale-98 disabled:opacity-50 whitespace-nowrap shrink-0"
							>
								{isSubmitting ? (
									<>
										<Loader2 className="w-4 h-4 animate-spin shrink-0" />
										<span>Списание...</span>
									</>
								) : (
									<>
										<PackageCheck className="w-4 h-4 shrink-0" />
										<span>
											Списать расходники за смену (
											{summaryData?.shiftStats?.completedVisitsCount ?? 0} визитов)
										</span>
									</>
								)}
							</button>
						)}

						{activeMode === "procedure" && (
							<button
								type="button"
								onClick={handleConfirmProcedureDeduction}
								disabled={isSubmitting}
								data-testid="btn-confirm-procedure-deduction"
								className="min-h-[44px] sm:min-h-[36px] sm:h-9 px-3.5 sm:px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 sm:gap-2 shadow-xs cursor-pointer transition-all active:scale-98 disabled:opacity-50 whitespace-nowrap shrink-0"
							>
								{isSubmitting ? (
									<>
										<Loader2 className="w-4 h-4 animate-spin shrink-0" />
										<span>Списание...</span>
									</>
								) : (
									<>
										<CheckCircle2 className="w-4 h-4 shrink-0" />
										<span>Списать материалы по процедуре</span>
									</>
								)}
							</button>
						)}
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
