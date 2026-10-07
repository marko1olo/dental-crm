import {
	AlertTriangle,
	ArrowDownToLine,
	ArrowUpFromLine,
	Camera,
	Check,
	Clock,
	Edit2,
	Minus,
	MoreHorizontal,
	Package,
	Plus,
	Printer,
	QrCode,
	Search,
	ShieldAlert,
	ShieldCheck,
	Trash2,
	X,
	Zap,
} from "lucide-react";
import React, { useCallback, useMemo, useState } from "react";
import { money } from "../../AppHelpers.js";
import { showToast } from "../GlobalToast.js";
import type { InventoryItem } from "./inventoryDataMappers.js";
import {
	getExpiryTrafficLight,
	getWarehouseFefoTrafficLight,
	type ExpiryTrafficLightInfo,
	type FefoTrafficLightInfo,
} from "./InventoryStockTable.js";

const CATEGORY_MAP: Record<string, { label: string; className: string }> = {
	anesthesia: { label: "Анестезия", className: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30" },
	therapy: { label: "Терапия", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" },
	composite: { label: "Композиты", className: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/30" },
	disposables: { label: "Расходники", className: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30" },
	ppe: { label: "Расходники", className: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30" },
	surgery: { label: "Хирургия", className: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30" },
	hygiene: { label: "Гигиена", className: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30" },
	endo: { label: "Эндодонтия", className: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30" },
	implant: { label: "Имплантаты", className: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30" },
	suture: { label: "Шовный матер.", className: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30" },
};

function getCategoryBadge(category?: string): { label: string; className: string } {
	if (!category) {
		return { label: "Материалы", className: "bg-[var(--paper-soft)] text-[var(--muted)] border-[var(--line)]" };
	}
	const norm = category.toLowerCase().trim();
	return CATEGORY_MAP[norm] || { label: category, className: "bg-[var(--paper-soft)] text-[var(--muted)] border-[var(--line)]" };
}

function formatExpDate(exp?: string | null): string {
	if (!exp) return "—";
	const trimmed = exp.trim();
	if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
		const [y, m, d] = trimmed.split("-");
		return `${d}.${m}.${y}`;
	}
	if (/^\d{4}-\d{2}$/.test(trimmed)) {
		const [y, m] = trimmed.split("-");
		return `${m}.${y}`;
	}
	return trimmed;
}

export interface InventoryMobileCardsProps {
	readonly items: readonly InventoryItem[];
	readonly isLoading?: boolean | undefined;
	readonly effectiveSearch?: string | undefined;
	readonly loadError?: string | null | undefined;
	readonly onSelectItem?: ((item: InventoryItem) => void) | undefined;
	readonly onDeductItem?: ((item: InventoryItem, quantity: number, isOverdraft: boolean) => void) | undefined;
	readonly onReceiveItem?: ((item: InventoryItem, quantity: number) => void) | undefined;
	readonly onOpenWaybills?: (() => void) | undefined;
	readonly onOpenAddModal?: (() => void) | undefined;
	readonly onRetry?: (() => void) | undefined;
	readonly onOpenDisposalModal?: ((item: InventoryItem) => void) | undefined;
	readonly onOpenWarehouseManager?: (() => void) | undefined;
	readonly onOpenInventoryAudit?: (() => void) | undefined;
	readonly onEditItem?: ((item: InventoryItem) => void) | undefined;
	readonly onDeleteItem?: ((id: string, name: string) => void) | undefined;
}

/**
 * InventoryMobileCards — Grouped List Cards (Apple Health / iOS Settings style).
 * 
 * В соответствии с Apple Mobile HIG и Anti-Desktop-Squeeze:
 * 1. Запрет на горизонтально скроллящуюся таблицу с 8 колонками на смартфонах.
 * 2. Карточка товара: название, остаток крупно (24-28px bold), критический лимит, срок годности (FEFO светофор).
 * 3. Нативный Bottom Sheet снизу экрана для списания и оприходования с крупными кнопками (+ / - >= 48px) и сканером ШК.
 */
export const InventoryMobileCards: React.FC<InventoryMobileCardsProps> = ({
	items,
	isLoading = false,
	effectiveSearch = "",
	loadError = null,
	onSelectItem,
	onDeductItem,
	onReceiveItem,
	onOpenWaybills,
	onOpenAddModal,
	onRetry,
	onOpenDisposalModal,
	onOpenWarehouseManager,
	onOpenInventoryAudit,
	onEditItem,
	onDeleteItem,
}) => {
	// Bottom Sheet состояние для выбранного товара
	const [activeSheetItem, setActiveSheetItem] = useState<InventoryItem | null>(null);
	const [sheetQuantity, setSheetQuantity] = useState<number>(1);
	const [isScannerActive, setIsScannerActive] = useState<boolean>(false);
	const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

	const openSheet = useCallback((item: InventoryItem) => {
		setActiveSheetItem(item);
		setSheetQuantity(1);
		setIsScannerActive(false);
		setActiveMenuId(null);
	}, []);

	const closeSheet = useCallback(() => {
		setActiveSheetItem(null);
		setIsScannerActive(false);
	}, []);

	const handleStepQuantity = useCallback((delta: number) => {
		setSheetQuantity((prev) => Math.max(1, prev + delta));
	}, []);

	const handleExecuteDeductInSheet = useCallback(() => {
		if (!activeSheetItem) return;
		const stock = Number(activeSheetItem.stockQuantity ?? 0);
		const isOverdraft = stock <= 0;
		if (onDeductItem) {
			onDeductItem(activeSheetItem, sheetQuantity, isOverdraft);
		} else {
			showToast(
				isOverdraft
					? `Списано ${sheetQuantity} ед. «${activeSheetItem.name}» (расход сверх остатка / списание с дефицитом)`
					: `Списано ${sheetQuantity} ед. «${activeSheetItem.name}» по FEFO`,
				isOverdraft ? "info" : "success",
			);
		}
		closeSheet();
	}, [activeSheetItem, sheetQuantity, onDeductItem, closeSheet]);

	const handleExecuteReceiveInSheet = useCallback(() => {
		if (!activeSheetItem) return;
		if (onReceiveItem) {
			onReceiveItem(activeSheetItem, sheetQuantity);
		} else {
			showToast(`Оприходовано ${sheetQuantity} ед. «${activeSheetItem.name}» на склад`, "success");
		}
		closeSheet();
	}, [activeSheetItem, sheetQuantity, onReceiveItem, closeSheet]);

	const handleSimulateScan = useCallback(() => {
		setIsScannerActive(true);
		setTimeout(() => {
			if (activeSheetItem) {
				showToast(`Штрихкод ${activeSheetItem.barcode || "460700123456"} успешно распознан`, "success");
			}
			setIsScannerActive(false);
		}, 800);
	}, [activeSheetItem]);

	const now = useMemo(() => new Date(), []);

	if (items.length === 0) {
		return (
			<div className="p-6 text-center text-[var(--muted)] flex flex-col items-center gap-3 bg-[var(--paper)] rounded-2xl border border-[var(--line)]">
				<Package size={36} className="text-teal-600 dark:text-teal-400" />
				<span className="text-[var(--ink)] font-bold text-sm">
					{effectiveSearch ? `Ничего не найдено по запросу «${effectiveSearch}»` : "На складе пока нет материалов"}
				</span>
				<span className="text-xs text-[var(--muted)] max-w-xs">
					{effectiveSearch ? "Проверьте написание наименования или партии" : "Оформите приходную накладную или добавьте позицию вручную"}
				</span>
				<div className="flex flex-wrap items-center justify-center gap-2 mt-2">
					{onOpenWaybills && (
						<button
							type="button"
							onClick={onOpenWaybills}
							className="min-h-[44px] px-4 rounded-xl bg-[var(--teal)] text-white text-xs font-bold shadow-xs hover:bg-[var(--teal-dark,#0f766e)] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
						>
							<ArrowDownToLine size={15} />
							<span>Приходная накладная</span>
						</button>
					)}
					{onOpenAddModal && (
						<button
							type="button"
							onClick={onOpenAddModal}
							className="min-h-[44px] px-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-xs font-semibold hover:border-[var(--teal)] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
						>
							<Plus size={15} />
							<span>Создать позицию</span>
						</button>
					)}
				</div>
			</div>
		);
	}

	return (
		<div className="inventory-mobile-grouped-cards space-y-2.5" data-testid="inventory-mobile-cards-list">
			{items.map((item) => {
				const stock = Number(item.stockQuantity ?? 0);
				const isLowStock = stock <= (item.criticalThreshold ?? 5);
				const isOverdraft = stock <= 0;
				const unitCostRaw = Number(item.unitCostRub);
				const unitCost = Number.isFinite(unitCostRaw) ? unitCostRaw : null;
				const lineValue = unitCost !== null && Number.isFinite(stock) ? stock * unitCost : null;
				const catInfo = getCategoryBadge(item.category);

				const expiryTraffic: ExpiryTrafficLightInfo = getExpiryTrafficLight(item.expirationDate, now);
				const fefoInfo: FefoTrafficLightInfo | null = item.expirationDate
					? getWarehouseFefoTrafficLight(item.expirationDate, now)
					: null;

				return (
					<div
						key={item.id}
						className={`rounded-2xl border p-3.5 transition-all bg-[var(--paper)] flex flex-col gap-2.5 ${
							expiryTraffic.isBlocked
								? "border-rose-500/40 bg-rose-500/5 dark:bg-rose-950/20 shadow-xs"
								: isOverdraft
								? "border-amber-500/40 bg-amber-500/5 dark:bg-amber-950/20 shadow-xs"
								: "border-[var(--line)] shadow-xs"
						}`}
						data-testid={`mobile-stock-card-${item.id}`}
					>
						{/* 1. Название и категория */}
						<div className="flex items-start justify-between gap-2">
							<div className="min-w-0 flex-1">
								<div className="flex items-center gap-1.5 flex-wrap">
									<span
										className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${catInfo.className}`}
									>
										{catInfo.label}
									</span>
									{item.lotNumber && (
										<span className="text-[10px] font-mono text-[var(--muted)] font-medium">
											Партия: #{item.lotNumber}
										</span>
									)}
								</div>
								<h4
									className="text-sm font-bold text-[var(--ink)] leading-snug mt-1 cursor-pointer hover:text-[var(--teal)] transition-colors"
									onClick={() => (onSelectItem ? onSelectItem(item) : openSheet(item))}
								>
									{item.name}
								</h4>
								{(item.sku || item.barcode) && (
									<div className="text-[10px] text-[var(--muted)] font-mono flex items-center gap-2 mt-0.5">
										{item.sku && <span>SKU: {item.sku}</span>}
										{item.barcode && <span>ШК: {item.barcode}</span>}
									</div>
								)}
							</div>

							{/* Кнопка контекстного меню */}
							<div className="relative shrink-0">
								<button
									type="button"
									onClick={() => setActiveMenuId((prev) => (prev === item.id ? null : item.id))}
									className="min-h-[40px] min-w-[40px] rounded-xl text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center bg-[var(--paper-soft)] border border-[var(--line)] cursor-pointer"
									aria-label="Действия с материалом"
								>
									<MoreHorizontal size={16} />
								</button>
								{activeMenuId === item.id && (
									<div className="absolute right-0 top-full mt-1 bg-[var(--paper)] border border-[var(--line)] rounded-xl shadow-xl p-1.5 z-40 min-w-[200px] flex flex-col gap-1 text-xs">
										{onEditItem && (
											<button
												type="button"
												onClick={() => {
													setActiveMenuId(null);
													onEditItem(item);
												}}
												className="min-h-[36px] w-full px-2.5 py-1.5 rounded-lg text-left text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer font-medium"
											>
												<Edit2 size={14} className="text-teal-600" />
												<span>Редактировать</span>
											</button>
										)}
										{onOpenWarehouseManager && (
											<button
												type="button"
												onClick={() => {
													setActiveMenuId(null);
													onOpenWarehouseManager();
												}}
												className="min-h-[36px] w-full px-2.5 py-1.5 rounded-lg text-left text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer font-medium"
											>
												<Zap size={14} className="text-blue-600" />
												<span>История движений</span>
											</button>
										)}
										{onOpenInventoryAudit && (
											<button
												type="button"
												onClick={() => {
													setActiveMenuId(null);
													onOpenInventoryAudit();
												}}
												className="min-h-[36px] w-full px-2.5 py-1.5 rounded-lg text-left text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer font-medium"
											>
												<ShieldCheck size={14} className="text-emerald-600" />
												<span>Инвентаризация</span>
											</button>
										)}
										{onDeleteItem && (
											<button
												type="button"
												onClick={() => {
													setActiveMenuId(null);
													onDeleteItem(item.id, item.name);
												}}
												className="min-h-[36px] w-full px-2.5 py-1.5 rounded-lg text-left text-rose-600 hover:bg-rose-500/10 flex items-center gap-2 cursor-pointer font-medium border-t border-[var(--line)] mt-0.5"
											>
												<Trash2 size={14} />
												<span>Удалить позицию</span>
											</button>
										)}
									</div>
								)}
							</div>
						</div>

						{/* 2. Ключевые показатели: Остаток крупно, Срок годности FEFO */}
						<div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line-subtle)] items-center">
							{/* Остаток */}
							<div>
								<span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] block">
									Остаток на складе
								</span>
								<div className="flex items-baseline gap-1 mt-0.5">
									<span
										className={`text-2xl font-black font-mono tracking-tight ${
											isOverdraft
												? "text-amber-600 dark:text-amber-400"
												: isLowStock
												? "text-rose-600 dark:text-rose-400"
												: "text-[var(--ink)]"
										}`}
									>
										{stock}
									</span>
									<span className="text-xs text-[var(--muted)] font-medium">
										{item.unit || "шт."}
									</span>
								</div>
								<div className="mt-0.5">
									{isOverdraft ? (
										<span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
											<ShieldAlert size={11} className="shrink-0" />
											<span>Расход сверх остатка</span>
										</span>
									) : isLowStock ? (
										<span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400">
											<AlertTriangle size={11} className="shrink-0" />
											<span>Дефицит (мин: {item.criticalThreshold ?? 5})</span>
										</span>
									) : (
										<span className="text-[10px] text-[var(--muted)]">
											Мин. запас: {item.criticalThreshold ?? 5} {item.unit || "шт."}
										</span>
									)}
								</div>
							</div>

							{/* Срок годности FEFO */}
							<div className="text-right flex flex-col items-end">
								<span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] block">
									Срок годности (FEFO)
								</span>
								{item.expirationDate ? (
									<div className="mt-0.5 space-y-0.5">
										<div className="inline-flex items-center gap-1.5 justify-end">
											<span
												style={{
													width: 7,
													height: 7,
													borderRadius: "50%",
													backgroundColor: fefoInfo?.dotColor || "#10b981",
													flexShrink: 0,
												}}
												aria-hidden="true"
											/>
											<span className="text-xs font-bold text-[var(--ink)] font-mono">
												{formatExpDate(item.expirationDate)}
											</span>
										</div>
										<div>
											<span
												className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${expiryTraffic.className}`}
											>
												{expiryTraffic.badgeTextRu}
											</span>
										</div>
									</div>
								) : (
									<div className="mt-0.5">
										<span className="text-xs text-[var(--muted)] italic">Бессрочно</span>
									</div>
								)}
								{unitCost !== null && (
									<span className="text-[10px] font-mono text-[var(--muted)] mt-1 block">
										{money(unitCost)}/ед.
									</span>
								)}
							</div>
						</div>

						{/* 3. Кнопка быстрого вызова нативного Bottom Sheet (touch target >= 44px) */}
						<div className="pt-0.5">
							{expiryTraffic.isBlocked ? (
								<button
									type="button"
									onClick={() => (onOpenDisposalModal ? onOpenDisposalModal(item) : openSheet(item))}
									className="min-h-[44px] w-full px-3 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-98 transition-all"
								>
									<Trash2 size={15} className="shrink-0" />
									<span>Оформить акт утилизации СанПиН 3.3686-21</span>
								</button>
							) : (
								<button
									type="button"
									onClick={() => openSheet(item)}
									className="min-h-[44px] w-full px-3 py-2.5 rounded-xl bg-[var(--teal-surface)] hover:bg-[var(--teal-soft)] border border-[var(--teal)] text-[var(--teal-dark,#0f766e)] font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-all shadow-xs"
									data-testid={`btn-mobile-sheet-open-${item.id}`}
								>
									<ArrowDownToLine size={15} className="shrink-0" />
									<span>Списание / Приход партии (FEFO)</span>
								</button>
							)}
						</div>
					</div>
				);
			})}

			{/* ─── НАТИВНЫЙ BOTTOM SHEET СНИЗУ ЭКРАНА (APPLE iOS HIG) ─── */}
			{activeSheetItem && (
				<div
					className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-150"
					role="dialog"
					aria-modal="true"
					aria-labelledby="mobile-sheet-title"
					data-testid="warehouse-mobile-bottom-sheet"
					onClick={(e) => {
						if (e.target === e.currentTarget) closeSheet();
					}}
				>
					<div
						className="w-full rounded-t-[24px] bg-[var(--paper)] border-t border-[var(--line)] shadow-2xl p-4 pb-8 space-y-4 max-h-[90dvh] overflow-y-auto animate-in slide-in-from-bottom duration-200"
						style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom, 2rem))" }}
					>
						{/* Тактильный хэндл шторки (Apple HIG drag handle 36x5px) */}
						<div className="w-9 h-1.5 rounded-full bg-[var(--line-strong,#94a3b8)] mx-auto -mt-1 mb-2 opacity-80" />

						{/* Шапка шторки */}
						<div className="flex items-start justify-between gap-3 border-b border-[var(--line)] pb-3">
							<div className="min-w-0 flex-1">
								<div className="flex items-center gap-1.5 mb-1 flex-wrap">
									<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--teal-surface)] text-[var(--teal-dark,#0f766e)] border border-[var(--teal)]">
										Складской оборот FEFO
									</span>
									{activeSheetItem.lotNumber && (
										<span className="text-[10px] font-mono text-[var(--muted)]">
											#{activeSheetItem.lotNumber}
										</span>
									)}
								</div>
								<h3 id="mobile-sheet-title" className="text-base font-extrabold text-[var(--ink)] leading-snug">
									{activeSheetItem.name}
								</h3>
								<p className="text-xs text-[var(--muted)] mt-0.5">
									Текущий остаток:{" "}
									<strong className="text-[var(--ink)] font-mono font-bold">
										{activeSheetItem.stockQuantity} {activeSheetItem.unit || "шт."}
									</strong>
									{activeSheetItem.expirationDate && (
										<span> • Годен до {formatExpDate(activeSheetItem.expirationDate)}</span>
									)}
								</p>
							</div>

							<button
								type="button"
								onClick={closeSheet}
								className="min-h-[44px] min-w-[44px] w-10 h-10 rounded-full border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center cursor-pointer shrink-0 transition-colors"
								aria-label="Закрыть шторку"
							>
								<X size={18} />
							</button>
						</div>

						{/* Крупный шаговый переключатель количества (Stepper >= 48px) */}
						<div className="p-3.5 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-2.5">
							<div className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] text-center">
								Количество единиц:
							</div>
							<div className="flex items-center justify-center gap-3">
								<button
									type="button"
									onClick={() => handleStepQuantity(-1)}
									className="min-w-[56px] min-h-[56px] w-14 h-14 rounded-2xl border-2 border-[var(--line)] bg-[var(--paper)] text-2xl font-black text-[var(--ink)] flex items-center justify-center cursor-pointer active:scale-95 shadow-xs transition-all"
									aria-label="Уменьшить количество"
									data-testid="stepper-minus-btn"
								>
									<Minus size={22} />
								</button>

								<div className="flex-1 text-center">
									<div className="text-3xl font-black font-mono text-[var(--ink)] tracking-tight">
										{sheetQuantity}
									</div>
									<div className="text-xs text-[var(--muted)] font-medium">
										{activeSheetItem.unit || "ед."}
									</div>
								</div>

								<button
									type="button"
									onClick={() => handleStepQuantity(1)}
									className="min-w-[56px] min-h-[56px] w-14 h-14 rounded-2xl border-2 border-[var(--line)] bg-[var(--paper)] text-2xl font-black text-[var(--ink)] flex items-center justify-center cursor-pointer active:scale-95 shadow-xs transition-all"
									aria-label="Увеличить количество"
									data-testid="stepper-plus-btn"
								>
									<Plus size={22} />
								</button>
							</div>

							{/* Быстрые чипсы предустановок */}
							<div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
								{[1, 5, 10].map((val) => (
									<button
										key={val}
										type="button"
										onClick={() => setSheetQuantity(val)}
										className={`min-h-[36px] px-3 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
											sheetQuantity === val
												? "bg-[var(--teal)] text-white border-[var(--teal)]"
												: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:border-[var(--teal)]"
										}`}
									>
										+{val}
									</button>
								))}
								{Number(activeSheetItem.stockQuantity ?? 0) > 0 && (
									<button
										type="button"
										onClick={() => setSheetQuantity(Math.max(1, Number(activeSheetItem.stockQuantity)))}
										className="min-h-[36px] px-3 rounded-lg text-xs font-bold border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-[var(--teal)] transition-colors cursor-pointer"
									>
										Весь остаток ({activeSheetItem.stockQuantity})
									</button>
								)}
							</div>
						</div>

						{/* Сканер штрихкода */}
						<div className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-xs">
							<div className="flex items-center gap-2 min-w-0">
								<QrCode size={16} className="text-teal-600 shrink-0" />
								<span className="text-[var(--ink)] font-semibold truncate">
									Штрихкод: {activeSheetItem.barcode || "б/ш"}
								</span>
							</div>
							<button
								type="button"
								onClick={handleSimulateScan}
								disabled={isScannerActive}
								className="min-h-[36px] px-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] text-xs font-bold hover:border-[var(--teal)] flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
							>
								<Camera size={13} className={isScannerActive ? "animate-pulse text-teal-600" : ""} />
								<span>{isScannerActive ? "Сканирование..." : "Сканировать ШК"}</span>
							</button>
						</div>

						{/* Главные действия (Primary Actions >= 48px) */}
						<div className="flex flex-col gap-2.5 pt-1">
							{/* Списание по FEFO */}
							<button
								type="button"
								onClick={handleExecuteDeductInSheet}
								className="min-h-[50px] w-full px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all cursor-pointer"
								data-testid="sheet-deduct-btn"
							>
								<ArrowUpFromLine size={18} className="shrink-0" />
								<span>
									Списать {sheetQuantity} {activeSheetItem.unit || "ед."} (FEFO)
								</span>
							</button>

							{/* Оприходование */}
							<button
								type="button"
								onClick={handleExecuteReceiveInSheet}
								className="min-h-[50px] w-full px-4 rounded-xl bg-[var(--teal)] hover:bg-[var(--teal-dark,#0f766e)] text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all cursor-pointer"
								data-testid="sheet-receive-btn"
							>
								<ArrowDownToLine size={18} className="shrink-0" />
								<span>
									Оприходовать {sheetQuantity} {activeSheetItem.unit || "ед."}
								</span>
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default InventoryMobileCards;
