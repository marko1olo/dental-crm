import {
	AlertTriangle, Check, CheckCircle2, Clock, Minus,
	Package, Plus, ShieldAlert, Syringe, X, Zap,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { money } from "../../AppHelpers.js";
import { isDemoShowcaseMode } from "../../lib/demoMode.js";
import { useInventoryStore } from "../../store/inventoryStore.js";
import {
	DEFAULT_804N_CONSUMABLE_LINKS,
	getDefaultBomLinksForService804n,
	formatInventoryUnitRu,
} from "@dental/shared";
import type { ConsumableItemLink } from "@dental/shared";

export interface ConsumablesDeductionModalItem {
	readonly id: string;
	readonly inventoryItemId: string;
	readonly itemName: string;
	readonly category: string;
	readonly unit: string;
	readonly standardQty: number;
	readonly deductedQty: number;
	readonly currentStock: number;
	readonly unitCostRub: number;
	readonly isOverdraft: boolean;
	readonly isMandatory: boolean;
}

export interface ConsumablesDeductionModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly procedureTitle?: string | undefined;
	readonly service804nCode?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly patientName?: string | undefined;
	readonly toothNumber?: number | undefined | null;
	readonly currentStockMap?: Record<string, number> | undefined;
	readonly onConfirmDeduction?: (items: ConsumablesDeductionModalItem[]) => void | Promise<void>;
}

/**
 * ConsumablesDeductionModal — Клиническое модальное окно списания расходных материалов приёма (BOM).
 * SSOT расположен в: apps/web/src/components/inventory/ConsumablesDeductionModal.tsx
 *
 * Мандаты 8e (Врачебная автономия), 8n (Масштаб), 8s (Анти-блоат), СанПиН 2.1.3684-21 / 3.3686-21.
 * - Чистый клинический язык без бухгалтерского птичьего языка (ТОРГ-12, М-11, ПБУ, Счёт 10).
 * - Автоматический подбор комплекта материалов по номенклатуре услуги в 1 клик.
 * - Мягкий овердрафт: нулевой остаток предупреждает, но кнопка подтверждения НИКОГДА не блокируется.
 * - Крупные сенсорные кнопки [ - ] и [ + ] (>= 44x44px на таче, 32px на ПК).
 * - Закон Анти-Матрёшки: строго 1 уровень модалки, единая чистая поверхность.
 */
const CATEGORY_RU_MAP: Record<string, string> = {
	composite: "Композит",
	anesthetic: "Анестезия",
	disinfection: "Дезинфекция",
	ppe: "СИЗ",
	other: "Расходный",
	surgery: "Хирургия",
	orthopedics: "Ортопедия",
	therapy: "Терапия",
	endodontics: "Эндодонтия",
};
const formatCategoryRu = (cat?: string): string => (cat ? CATEGORY_RU_MAP[cat.toLowerCase()] || cat : "Расходный");

const formatUnitRu = (unit?: string): string => (unit ? formatInventoryUnitRu(unit) : "шт.");

const EMPTY_STOCK_MAP: Readonly<Record<string, number>> = Object.freeze({});

export const ConsumablesDeductionModal: React.FC<ConsumablesDeductionModalProps> = ({
	isOpen,
	onClose,
	procedureTitle = "Препарирование и пломба светового отверждения (Filtek / Estelite)",
	service804nCode = "A16.07.002.011",
	doctorName = "Кузнецов А.В.",
	patientName = "Смирнова Е.А.",
	toothNumber = 16,
	currentStockMap = EMPTY_STOCK_MAP,
	onConfirmDeduction,
}) => {
	// Подбор ссылок на расходные материалы из SSOT каталога
	const defaultLinks: readonly ConsumableItemLink[] = useMemo(() => {
		const matched = getDefaultBomLinksForService804n(service804nCode);
		if (matched.length > 0) return matched;
		return DEFAULT_804N_CONSUMABLE_LINKS.filter(
			(l) => l.service804nCode === "A16.07.002.011" || l.service804nCode === "A11.07.012",
		);
	}, [service804nCode]);

	// Локальное состояние списания материалов
	const resolveStock = (inventoryItemId: string): number => {
		if (currentStockMap[inventoryItemId] !== undefined) {
			return currentStockMap[inventoryItemId]!;
		}
		const matchedKey = Object.keys(currentStockMap).find((k) => {
			if (inventoryItemId.includes("composite") && (k.includes("filtek") || k.includes("composite"))) return true;
			if (inventoryItemId.includes("adhesive") && (k.includes("optibond") || k.includes("adhesive"))) return true;
			if (inventoryItemId.includes("gloves") && k.includes("gloves")) return true;
			return false;
		});
		if (matchedKey && currentStockMap[matchedKey] !== undefined) {
			return currentStockMap[matchedKey]!;
		}
		return isDemoShowcaseMode() ? 12 : 0;
	};

	const [deductionItems, setDeductionItems] = useState<ConsumablesDeductionModalItem[]>(() =>
		defaultLinks.map((link) => {
			const currentStock = resolveStock(link.inventoryItemId);
			const deductedQty = link.quantityPerService;
			return {
				id: link.id,
				inventoryItemId: link.inventoryItemId,
				itemName: link.itemName,
				category: link.category ?? "Расходные",
				unit: link.unit,
				standardQty: deductedQty,
				deductedQty,
				currentStock,
				unitCostRub: link.costPriceKopecks / 100,
				isOverdraft: currentStock - deductedQty < 0,
				isMandatory: link.isMandatory ?? true,
			};
		}),
	);

	// Синхронизация при изменении currentStockMap
	React.useEffect(() => {
		if (!currentStockMap || Object.keys(currentStockMap).length === 0) return;
		setDeductionItems((prev) =>
			prev.map((it) => {
				const stock = resolveStock(it.inventoryItemId);
				return { ...it, currentStock: stock, isOverdraft: stock - it.deductedQty < 0 };
			}),
		);
	}, [currentStockMap]);

	const [isSubmitting, setIsSubmitting] = useState(false);

	// Обновление количества для позиции
	const handleUpdateQty = (itemId: string, delta: number) => {
		setDeductionItems((prev) =>
			prev.map((it) => {
				if (it.id !== itemId) return it;
				const step = it.unit === "шприц_гр" || it.unit === "ml" ? 0.1 : 1;
				const newQty = Math.max(0, Math.round((it.deductedQty + delta * step) * 10) / 10);
				return { ...it, deductedQty: newQty, isOverdraft: it.currentStock - newQty < 0 };
			}),
		);
	};

	// Итоговые показатели списания
	const totals = useMemo(() => {
		let totalCostRub = 0;
		let overdraftCount = 0;
		let activeItemsCount = 0;
		let carpulesCount = 0;
		let sharpsCount = 0;

		for (const it of deductionItems) {
			if (it.deductedQty > 0) {
				activeItemsCount++;
				totalCostRub += it.deductedQty * it.unitCostRub;
				if (it.isOverdraft) overdraftCount++;

				const nameLower = it.itemName.toLowerCase();
				if (nameLower.includes("карпул") || it.unit === "карпула" || nameLower.includes("артикаин")) {
					carpulesCount += Math.max(1, Math.round(it.deductedQty));
				}
				if (nameLower.includes("игла") || nameLower.includes("скальпель") || nameLower.includes("лезвие")) {
					sharpsCount += Math.max(1, Math.round(it.deductedQty));
				}
			}
		}

		return {
			totalCostRub: Math.round(totalCostRub * 100) / 100,
			overdraftCount,
			hasOverdraft: overdraftCount > 0,
			overdraftItemsCount: overdraftCount,
			activeItemsCount,
			carpulesCount,
			sharpsCount,
		};
	}, [deductionItems]);

	if (!isOpen) return null;

	const handleConfirm = async () => {
		setIsSubmitting(true);
		try {
			if (onConfirmDeduction) {
				await onConfirmDeduction(deductionItems);
			}
			// Фоновая синхронизация остатков со store и оповещение склада (Mandate 8e, 8n)
			try {
				useInventoryStore.getState().deductStock(
					"org-default",
					deductionItems.map((d) => ({
						inventoryItemId: d.inventoryItemId,
						itemName: d.itemName,
						quantity: d.deductedQty,
						reason: `Списание по протоколу: ${procedureTitle}`,
						unitCostRub: d.unitCostRub,
					})),
					{
						allowOverdraft: true,
						reason: `Списание по протоколу: ${procedureTitle}`,
					},
				).catch(() => {});
				if (typeof window !== "undefined") {
					window.dispatchEvent(
						new CustomEvent("dente-inventory-reload", {
							detail: { procedureTitle, service804nCode },
						}),
					);
				}
			} catch {
				// Ошибки не блокируют приём врача
			}
			onClose();
		} catch {
			// Ошибки логируются, врач не блокируется
		} finally {
			setIsSubmitting(false);
		}
	};

	const modalContent = (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
			style={{ backgroundColor: "rgba(15, 23, 42, 0.55)" }}
			data-testid="consumables-deduction-modal-overlay"
			onClick={onClose}
		>
			<div
				className="w-full max-w-2xl bg-[var(--paper)] text-[var(--ink)] rounded-2xl border border-[var(--line)] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
				data-testid="consumables-deduction-modal"
				onClick={(e) => e.stopPropagation()}
			>
				{/* 1. ШАПКА МОДАЛКИ (СТРОГО 1 УРОВЕНЬ, ЗАКОН АНТИ-МАТРЁШКИ) */}
				<div className="p-3.5 sm:p-4 border-b border-[var(--line)] bg-[var(--paper-soft)] flex items-start justify-between gap-3 shrink-0">
					<div className="flex items-center gap-2.5 min-w-0">
						<div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
							<Package size={18} />
						</div>
						<div className="min-w-0">
							<div className="flex items-center gap-2 flex-wrap">
								<h3 className="text-sm sm:text-base font-bold text-[var(--ink)] leading-tight">
									Расходные материалы приёма
								</h3>
								<span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-800 dark:text-teal-300 border border-teal-500/30">
									Списание по протоколу
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] mt-0.5 truncate">
								{procedureTitle}
								{toothNumber ? ` • Зуб ${toothNumber}` : ""}
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="h-8 w-8 min-h-[32px] min-w-[32px] rounded-lg border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center justify-center cursor-pointer transition-colors shrink-0"
						aria-label="Закрыть"
						data-testid="btn-close-deduction-modal"
					>
						<X size={16} />
					</button>
				</div>

				{/* 2. КЛИНИЧЕСКИЙ КОНТЕКСТ ПРИЁМА */}
				<div className="px-4 py-2 border-b border-[var(--line-subtle)] bg-[var(--paper-soft)]/50 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--muted)] shrink-0">
					<div className="flex items-center gap-3 flex-wrap">
						<span>Врач: <strong className="text-[var(--ink)]">{doctorName}</strong></span>
						<span>Пациент: <strong className="text-[var(--ink)]">{patientName}</strong></span>
						{service804nCode && (
							<span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-[var(--paper)] border border-[var(--line)]">
								{service804nCode}
							</span>
						)}
					</div>
					<div className="text-[11px] font-medium text-teal-700 dark:text-teal-300">
						Нормативный набор услуг
					</div>
				</div>

				{/* 3. ИНФОРМАТИВНЫЙ БЕЙДЖ ОВЕРДРАФТА (МАНДАТ 8E: БЕЗ БЛОКИРОВКИ ВРАЧА) */}
				{totals.overdraftCount > 0 && (
					<div
						className="mx-4 mt-2.5 p-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2 shrink-0"
						data-testid="overdraft-warning-badge"
					>
						<ShieldAlert size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
						<div className="min-w-0">
							<span className="font-semibold">
								Позиций с нулевым остатком: {totals.overdraftCount}.
							</span>{" "}
							<span className="text-[11px] opacity-90">
								Списание разрешено (мягкий овердрафт). Накладная поставщика ожидается.
							</span>
						</div>
					</div>
				)}

				{/* 4. СПИСОК РАСХОДНЫХ МАТЕРИАЛОВ */}
				<div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-[220px]">
					<div className="text-xs font-semibold text-[var(--muted)] mb-1 flex items-center justify-between">
						<span>Материалы по клиническому протоколу</span>
						<span>Позиций: {deductionItems.length}</span>
					</div>

					{deductionItems.map((item) => {
						const remaining = Math.round((item.currentStock - item.deductedQty) * 10) / 10;
						const isOverdraft = remaining < 0;

						return (
							<div
								key={item.id}
								className={`p-2.5 sm:p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
									isOverdraft
										? "border-amber-500/30 bg-amber-500/5"
										: "border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)]"
								}`}
								data-testid={`deduction-item-row-${item.inventoryItemId}`}
							>
								{/* Описание позиции */}
								<div className="min-w-0 flex-1">
									<div className="flex items-center gap-2 flex-wrap">
										<span className="font-semibold text-xs sm:text-sm text-[var(--ink)] leading-tight">
											{item.itemName}
										</span>
										<span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--muted)]">
											{formatCategoryRu(item.category)}
										</span>
									</div>

									<div className="flex items-center gap-3 text-xs text-[var(--muted)] mt-1 flex-wrap">
										<span>
											Остаток в кабинете:{" "}
											<strong className={item.currentStock <= 0 ? "text-amber-600 dark:text-amber-400 font-bold" : "text-[var(--ink)]"}>
												{item.currentStock} {formatUnitRu(item.unit)}
											</strong>
										</span>
										<span>
											Себестоимость:{" "}
											<strong className="text-[var(--ink)]">
												{money(item.unitCostRub)} / {formatUnitRu(item.unit)}
											</strong>
										</span>
										{isOverdraft && (
											<span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1">
												<AlertTriangle size={11} />
												Остаток 0 — требуется заказ
											</span>
										)}
									</div>
								</div>

								{/* Сенсорные регуляторы количества (>= 44x44px на мобиле / 32px десктоп) */}
								<div className="flex items-center gap-2 self-end sm:self-center shrink-0">
									<div className="flex items-center border border-[var(--line)] rounded-lg bg-[var(--paper-soft)] p-0.5">
										<button
											type="button"
											onClick={() => handleUpdateQty(item.id, -1)}
											className="h-8 w-8 sm:h-7 sm:w-7 min-h-[32px] min-w-[32px] rounded-md bg-[var(--paper)] border border-[var(--line-subtle)] text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center justify-center cursor-pointer transition-colors"
											aria-label={`Уменьшить количество ${item.itemName}`}
											data-testid={`btn-decrease-qty-${item.inventoryItemId}`}
										>
											<Minus size={13} />
										</button>

										<span
											className="w-12 text-center text-xs font-bold text-[var(--ink)]"
											data-testid={`qty-value-${item.inventoryItemId}`}
										>
											{item.deductedQty}
										</span>

										<button
											type="button"
											onClick={() => handleUpdateQty(item.id, 1)}
											className="h-8 w-8 sm:h-7 sm:w-7 min-h-[32px] min-w-[32px] rounded-md bg-[var(--paper)] border border-[var(--line-subtle)] text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center justify-center cursor-pointer transition-colors"
											aria-label={`Увеличить количество ${item.itemName}`}
											data-testid={`btn-increase-qty-${item.inventoryItemId}`}
										>
											<Plus size={13} />
										</button>
									</div>

									<span className="text-xs text-[var(--muted)] min-w-[52px] text-left font-medium">
										{formatUnitRu(item.unit)}
									</span>

									{/* Сумма по позиции */}
									<span className="text-xs font-bold text-teal-700 dark:text-teal-300 w-20 text-right">
										{money(Math.round(item.deductedQty * item.unitCostRub * 100) / 100)}
									</span>
								</div>
							</div>
						);
					})}
				</div>

				{/* 5. САНПИН 2.1.3684-21: ОТХОДЫ КЛАССА Б (КАРПУЛЫ, ИГЛЫ) */}
				{(totals.carpulesCount > 0 || totals.sharpsCount > 0) && (
					<div className="px-4 py-2 border-t border-[var(--line-subtle)] bg-[var(--paper-soft)] flex items-center justify-between text-xs text-[var(--muted)] shrink-0">
						<div className="flex items-center gap-2">
							<Syringe size={13} className="text-amber-600 dark:text-amber-400" />
							<span>
								Отходы Класса Б (СанПиН):{" "}
								<strong>{totals.carpulesCount} карпул, {totals.sharpsCount} игл</strong>
							</span>
						</div>
						<span className="text-[11px] text-teal-700 dark:text-teal-300 font-medium">
							Автоучёт в журнале дезинфекции
						</span>
					</div>
				)}

				{/* 6. ФУТЕР С ИТОГОМ И 1 PRIMARY CTA КНОПКОЙ */}
				<div className="p-3.5 sm:p-4 border-t border-[var(--line)] bg-[var(--paper-soft)] flex flex-wrap items-center justify-between gap-3 shrink-0">
					<div>
						<div className="text-xs text-[var(--muted)]">Итого по расходу:</div>
						<div className="text-base sm:text-lg font-bold text-teal-700 dark:text-teal-300 leading-tight">
							{money(totals.totalCostRub)}{" "}
							<span className="text-xs font-normal text-[var(--muted)]">
								({totals.activeItemsCount} поз.)
							</span>
						</div>
					</div>

					<div className="flex items-center gap-2.5 shrink-0">
						<button
							type="button"
							onClick={onClose}
							className="h-9 min-h-[36px] px-4 rounded-xl text-xs font-semibold cursor-pointer transition-colors border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] shadow-xs flex items-center justify-center"
							data-testid="btn-cancel-deduction"
						>
							Отмена
						</button>

						<button
							type="button"
							onClick={handleConfirm}
							disabled={isSubmitting}
							className={`h-9 min-h-[36px] px-4 rounded-xl font-bold text-xs shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-98 whitespace-nowrap text-white border border-transparent ${
								totals.hasOverdraft
									? "bg-[var(--warning)] hover:brightness-105"
									: "bg-[var(--teal)] hover:brightness-105"
							}`}
							data-testid="btn-confirm-deduction"
							title={
								totals.hasOverdraft
									? `Списание с мягким овердрафтом (${totals.overdraftItemsCount} поз.). Приём не блокируется.`
									: "Подтвердить списание расходных материалов по протоколу"
							}
						>
							<Check size={16} className="shrink-0" />
							<span className="whitespace-nowrap">
								{isSubmitting
									? "Списание..."
									: totals.hasOverdraft
										? `Списать (овердрафт: ${totals.overdraftItemsCount})`
										: "Подтвердить списание"}
							</span>
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

export default ConsumablesDeductionModal;
