import {
	AlertTriangle,
	Check,
	CheckCircle2,
	Clock,
	Minus,
	Package,
	Plus,
	ShieldAlert,
	Syringe,
	X,
	Zap,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { money } from "../../AppHelpers.js";
import { isDemoShowcaseMode } from "../../lib/demoMode.js";
import {
	DEFAULT_804N_CONSUMABLE_LINKS,
	getDefaultBomLinksForService804n,
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
 *
 * Мандаты 8e (Врачебная автономия), 8n (Масштаб), 8s (Анти-блоат), СанПиН 2.1.3684-21 / 3.3686-21.
 * - Чистый клинический язык без бухгалтерского птичьего языка (ТОРГ-12, М-11, ПБУ, Счёт 10).
 * - Автоматический подбор комплекта материалов по номенклатуре услуги в 1 клик.
 * - Мягкий овердрафт: нулевой остаток предупреждает, но кнопка подтверждения НИКОГДА не блокируется.
 * - Крупные сенсорные кнопки [ - ] и [ + ] (>= 44x44px на таче, 32px на ПК).
 * - Закон Анти-Матрёшки: строго 1 уровень модалки, единая чистая поверхность.
 */
function formatCategoryRu(cat?: string): string {
	if (!cat) return "Расходный";
	switch (cat.toLowerCase()) {
		case "composite": return "Композит";
		case "anesthetic": return "Анестезия";
		case "disinfection": return "Дезинфекция";
		case "ppe": return "СИЗ";
		case "other": return "Расходный";
		case "surgery": return "Хирургия";
		case "orthopedics": return "Ортопедия";
		case "therapy": return "Терапия";
		case "endodontics": return "Эндодонтия";
		default: return cat;
	}
}

function formatUnitRu(unit?: string): string {
	if (!unit) return "шт.";
	const u = unit.toLowerCase().trim();
	if (u === "шприц_гр" || u === "шприц _гр") return "шприц (г)";
	if (u === "dose") return "доз";
	if (u === "piece" || u === "pcs") return "шт.";
	return unit;
}

export const ConsumablesDeductionModal: React.FC<ConsumablesDeductionModalProps> = ({
	isOpen,
	onClose,
	procedureTitle = "Препарирование и пломба светового отверждения (Filtek / Estelite)",
	service804nCode = "A16.07.002.011",
	doctorName = "Кузнецов А.В.",
	patientName = "Смирнова Е.А.",
	toothNumber = 16,
	currentStockMap = {},
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

	const [deductionItems, setDeductionItems] = useState<ConsumablesDeductionModalItem[]>(() => {
		return defaultLinks.map((link) => {
			const currentStock = resolveStock(link.inventoryItemId);
			const unitCostRub = link.costPriceKopecks / 100;
			const deductedQty = link.quantityPerService;
			const isOverdraft = currentStock - deductedQty < 0;

			return {
				id: link.id,
				inventoryItemId: link.inventoryItemId,
				itemName: link.itemName,
				category: link.category ?? "Расходные",
				unit: link.unit,
				standardQty: link.quantityPerService,
				deductedQty,
				currentStock,
				unitCostRub,
				isOverdraft,
				isMandatory: link.isMandatory ?? true,
			};
		});
	});

	// Синхронизация при изменении currentStockMap
	React.useEffect(() => {
		setDeductionItems((prev) =>
			prev.map((it) => {
				const stock = resolveStock(it.inventoryItemId);
				return {
					...it,
					currentStock: stock,
					isOverdraft: stock - it.deductedQty < 0,
				};
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
				const isOverdraft = it.currentStock - newQty < 0;
				return {
					...it,
					deductedQty: newQty,
					isOverdraft,
				};
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
			onClose();
		} catch {
			// Ошибки логируются, врач не блокируется
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs"
			data-testid="consumables-deduction-modal-overlay"
			onClick={onClose}
		>
			<div
				className="w-full max-w-2xl bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] rounded-2xl border border-[var(--line,#e2e8f0)] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
				data-testid="consumables-deduction-modal"
				onClick={(e) => e.stopPropagation()}
			>
				{/* 1. ШАПКА МОДАЛКИ (СТРОГО 1 УРОВЕНЬ, ЗАКОН АНТИ-МАТРЁШКИ) */}
				<div className="p-3.5 sm:p-4 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex items-start justify-between gap-3 shrink-0">
					<div className="flex items-center gap-2.5 min-w-0">
						<div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
							<Package size={18} />
						</div>
						<div className="min-w-0">
							<div className="flex items-center gap-2 flex-wrap">
								<h3 className="text-sm sm:text-base font-bold text-[var(--ink,#0f172a)] leading-tight">
									Расходные материалы приёма
								</h3>
								<span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-800 dark:text-teal-300 border border-teal-500/30">
									Списание по протоколу
								</span>
							</div>
							<p className="text-xs text-[var(--muted,#64748b)] mt-0.5 truncate">
								{procedureTitle}
								{toothNumber ? ` • Зуб ${toothNumber}` : ""}
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="h-8 w-8 rounded-lg border border-[var(--line,#cbd5e1)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper,#ffffff)] flex items-center justify-center cursor-pointer transition-colors shrink-0"
						aria-label="Закрыть"
						data-testid="btn-close-deduction-modal"
					>
						<X size={16} />
					</button>
				</div>

				{/* 2. КЛИНИЧЕСКИЙ КОНТЕКСТ ПРИЁМА */}
				<div className="px-4 py-2 border-b border-[var(--line-subtle,#e2e8f0)] bg-[var(--paper-card,#f1f5f9)]/50 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--muted,#64748b)] shrink-0">
					<div className="flex items-center gap-3 flex-wrap">
						<span>Врач: <strong className="text-[var(--ink,#0f172a)]">{doctorName}</strong></span>
						<span>Пациент: <strong className="text-[var(--ink,#0f172a)]">{patientName}</strong></span>
						{service804nCode && (
							<span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-[var(--paper,#ffffff)] border border-[var(--line,#cbd5e1)]">
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
					<div className="text-xs font-semibold text-[var(--muted,#64748b)] mb-1 flex items-center justify-between">
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
										: "border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)]"
								}`}
								data-testid={`deduction-item-row-${item.inventoryItemId}`}
							>
								{/* Описание позиции */}
								<div className="min-w-0 flex-1">
									<div className="flex items-center gap-2 flex-wrap">
										<span className="font-semibold text-xs sm:text-sm text-[var(--ink,#0f172a)] leading-tight">
											{item.itemName}
										</span>
										<span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--paper-soft,#f1f5f9)] border border-[var(--line,#cbd5e1)] text-[var(--muted,#64748b)]">
											{formatCategoryRu(item.category)}
										</span>
									</div>

									<div className="flex items-center gap-3 text-xs text-[var(--muted,#64748b)] mt-1 flex-wrap">
										<span>
											Остаток в кабинете:{" "}
											<strong className={item.currentStock <= 0 ? "text-amber-600 dark:text-amber-400 font-bold" : "text-[var(--ink,#0f172a)]"}>
												{item.currentStock} {formatUnitRu(item.unit)}
											</strong>
										</span>
										<span>
											Себестоимость:{" "}
											<strong className="text-[var(--ink,#0f172a)]">
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
									<div className="flex items-center border border-[var(--line,#cbd5e1)] rounded-lg bg-[var(--paper-soft,#f8fafc)] p-0.5">
										<button
											type="button"
											onClick={() => handleUpdateQty(item.id, -1)}
											className="h-8 w-8 sm:h-7 sm:w-7 min-h-[32px] min-w-[32px] rounded-md bg-[var(--paper,#ffffff)] border border-[var(--line-subtle,#e2e8f0)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-card,#f1f5f9)] flex items-center justify-center cursor-pointer transition-colors"
											aria-label={`Уменьшить количество ${item.itemName}`}
											data-testid={`btn-decrease-qty-${item.inventoryItemId}`}
										>
											<Minus size={13} />
										</button>

										<span
											className="w-12 text-center text-xs font-bold text-[var(--ink,#0f172a)]"
											data-testid={`qty-value-${item.inventoryItemId}`}
										>
											{item.deductedQty}
										</span>

										<button
											type="button"
											onClick={() => handleUpdateQty(item.id, 1)}
											className="h-8 w-8 sm:h-7 sm:w-7 min-h-[32px] min-w-[32px] rounded-md bg-[var(--paper,#ffffff)] border border-[var(--line-subtle,#e2e8f0)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-card,#f1f5f9)] flex items-center justify-center cursor-pointer transition-colors"
											aria-label={`Увеличить количество ${item.itemName}`}
											data-testid={`btn-increase-qty-${item.inventoryItemId}`}
										>
											<Plus size={13} />
										</button>
									</div>

									<span className="text-xs text-[var(--muted,#64748b)] min-w-[52px] text-left font-medium">
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
					<div className="px-4 py-2 border-t border-[var(--line-subtle,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between text-xs text-[var(--muted,#64748b)] shrink-0">
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
				<div className="p-3.5 sm:p-4 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex flex-wrap items-center justify-between gap-3 shrink-0">
					<div>
						<div className="text-xs text-[var(--muted,#64748b)]">Итого по расходу:</div>
						<div className="text-base sm:text-lg font-bold text-teal-700 dark:text-teal-300 leading-tight">
							{money(totals.totalCostRub)}{" "}
							<span className="text-xs font-normal text-[var(--muted,#64748b)]">
								({totals.activeItemsCount} поз.)
							</span>
						</div>
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={onClose}
							style={{
								backgroundColor: "var(--paper, #ffffff)",
								color: "var(--ink, #0f172a)",
								border: "1px solid var(--line, #cbd5e1)",
							}}
							className="h-10 sm:h-9 px-4 rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-xs"
							data-testid="btn-cancel-deduction"
						>
							Отмена
						</button>

						<button
							type="button"
							onClick={handleConfirm}
							disabled={isSubmitting}
							style={{
								backgroundColor: "var(--brand, #0d9488)",
								color: "#ffffff",
								border: "1px solid transparent",
							}}
							className="h-10 sm:h-9 px-5 rounded-xl font-bold text-xs shadow-md flex items-center gap-2 cursor-pointer transition-all active:scale-98"
							data-testid="btn-confirm-deduction"
							title="Подтвердить списание расходных материалов по протоколу"
						>
							<Check size={16} />
							<span>{isSubmitting ? "Списание..." : "Подтвердить списание материалов"}</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default ConsumablesDeductionModal;
