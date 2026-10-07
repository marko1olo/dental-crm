import {
	AlertTriangle,
	ArrowDownToLine,
	ArrowUpFromLine,
	CheckCircle2,
	Clock,
	Layers,
	Package,
	Search,
	ShieldAlert,
	Trash2,
	X,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { money } from "../../AppHelpers.js";
import type { InventoryItem } from "../inventory/useInventoryLogic.js";
import {
	getFefoTrafficLight,
	type FefoTrafficStatus,
} from "../inventory/fefoTrafficLight.js";

export interface WarehouseBatchTrackingModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly items: readonly InventoryItem[];
	readonly selectedItem?: InventoryItem | null | undefined;
	readonly onDeductBatch?: ((item: InventoryItem, qty: number, lotNumber: string) => void | Promise<void>) | undefined;
	readonly onReceiveBatch?: ((item: InventoryItem, qty: number, lotNumber: string, expirationDate: string) => void | Promise<void>) | undefined;
	readonly onWriteOffExpired?: ((item: InventoryItem, lotNumber: string) => void) | undefined;
}

type BatchFilter = "all" | "expired" | "warning_soon" | "good";

/**
 * Модальное окно партионного учёта FEFO (First Expired, First Out)
 * по СанПиН 3.3686-21 и Мандатам 8e, 8n (лимит < 800 строк).
 * Гарантирует списание партий с минимальным остаточным сроком годности.
 */
export const WarehouseBatchTrackingModal: React.FC<WarehouseBatchTrackingModalProps> = ({
	isOpen,
	onClose,
	items,
	selectedItem,
	onDeductBatch,
	onReceiveBatch,
	onWriteOffExpired,
}) => {
	const [searchQuery, setSearchQuery] = useState("");
	const [activeFilter, setActiveFilter] = useState<BatchFilter>("all");
	const [selectedTargetItem, setSelectedTargetItem] = useState<InventoryItem | null>(
		selectedItem || null,
	);
	const [batchActionQty, setBatchActionQty] = useState<string>("1");
	const [batchLotInput, setBatchLotInput] = useState<string>("");
	const [batchExpInput, setBatchExpInput] = useState<string>("");

	React.useEffect(() => {
		if (selectedItem) {
			setSelectedTargetItem(selectedItem);
		} else if (items.length > 0 && !selectedTargetItem) {
			setSelectedTargetItem(items[0] ?? null);
		}
	}, [selectedItem, items]);

	const enrichedBatches = useMemo(() => {
		return items.map((item) => {
			const expDate = item.expirationDate || "2028-12-31";
			const fefoInfo = getFefoTrafficLight(expDate);
			return {
				item,
				lotNumber: item.lotNumber || `ПАРТИЯ-${item.id.slice(0, 6)}`,
				expirationDate: expDate,
				daysLeft: fefoInfo.daysLeft,
				fefoStatus: fefoInfo.status,
				fefoBadge: fefoInfo.badgeText,
				quantity: Number(item.stockQuantity) || 0,
			};
		});
	}, [items]);

	const filteredBatches = useMemo(() => {
		let list = enrichedBatches;

		if (selectedTargetItem) {
			list = list.filter((b) => b.item.id === selectedTargetItem.id);
		}

		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			list = list.filter(
				(b) =>
					b.item.name.toLowerCase().includes(q) ||
					b.lotNumber.toLowerCase().includes(q) ||
					(b.item.sku && b.item.sku.toLowerCase().includes(q)),
			);
		}

		if (activeFilter === "expired") {
			list = list.filter((b) => b.fefoStatus === "red");
		} else if (activeFilter === "warning_soon") {
			list = list.filter((b) => b.fefoStatus === "yellow");
		} else if (activeFilter === "good") {
			list = list.filter((b) => b.fefoStatus === "green");
		}

		// Сортировка по правилу FEFO: сначала партии с минимальным сроком
		return [...list].sort((a, b) => a.daysLeft - b.daysLeft);
	}, [enrichedBatches, selectedTargetItem, searchQuery, activeFilter]);

	const stats = useMemo(() => {
		let expired = 0;
		let warning = 0;
		let good = 0;
		for (const b of enrichedBatches) {
			if (b.fefoStatus === "red") expired++;
			else if (b.fefoStatus === "yellow") warning++;
			else good++;
		}
		return { total: enrichedBatches.length, expired, warning, good };
	}, [enrichedBatches]);

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto"
			data-testid="warehouse-batch-tracking-modal"
			role="dialog"
			aria-modal="true"
			aria-label="Партионный учёт и контроль сроков годности FEFO"
		>
			<div className="bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border border-[var(--line,#e2e8f0)] rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
				{/* ШАПКА МОДАЛЬНОГО ОКНА */}
				<header className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] shrink-0">
					<div className="flex items-center gap-3 min-w-0">
						<div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
							<Layers size={18} />
						</div>
						<div className="min-w-0">
							<h2 className="text-base font-bold leading-tight truncate">
								Партионный учёт и контроль сроков (FEFO)
							</h2>
							<p className="text-xs text-[var(--muted,#64748b)] truncate">
								Приоритетный отпуск серий с минимальным остаточным сроком • СанПиН 3.3686-21
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-card,#f1f5f9)] transition-colors cursor-pointer"
						aria-label="Закрыть окно партионного учёта"
						data-testid="btn-close-batch-modal"
					>
						<X size={18} />
					</button>
				</header>

				{/* ПАНЕЛЬ ФИЛЬТРОВ И ПОИСКА */}
				<div className="p-3 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
					{/* Поиск */}
					<div className="dente-search-wrap relative flex-1 min-w-[200px] max-w-xs">
						<Search size={14} className="dente-search-icon" />
						<input
							type="text"
							className="dente-search-input"
							placeholder="Поиск по партии, серии или названию..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							data-testid="batch-search-input"
						/>
						{searchQuery && (
							<button
								type="button"
								className="dente-search-clear"
								onClick={() => setSearchQuery("")}
								aria-label="Очистить поиск"
							>
								<X size={12} />
							</button>
						)}
					</div>

					{/* Сегментированные фильтры статуса FEFO */}
					<div className="dente-segmented-bar inline-flex items-center gap-1 p-0.5 rounded-lg bg-[var(--paper-soft,#f1f5f9)] border border-[var(--line,#e2e8f0)]">
						<button
							type="button"
							onClick={() => setActiveFilter("all")}
							className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
								activeFilter === "all"
									? "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] shadow-xs"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
							}`}
							data-testid="batch-filter-all"
						>
							Все ({stats.total})
						</button>
						<button
							type="button"
							onClick={() => setActiveFilter("warning_soon")}
							className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
								activeFilter === "warning_soon"
									? "bg-amber-500/20 text-amber-900 dark:text-amber-200 shadow-xs"
									: "text-[var(--muted,#64748b)] hover:text-amber-700"
							}`}
							data-testid="batch-filter-warning"
						>
							Скоро истекает ({stats.warning})
						</button>
						<button
							type="button"
							onClick={() => setActiveFilter("expired")}
							className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
								activeFilter === "expired"
									? "bg-rose-500/20 text-rose-900 dark:text-rose-200 shadow-xs"
									: "text-[var(--muted,#64748b)] hover:text-rose-700"
							}`}
							data-testid="batch-filter-expired"
						>
							Просрочено ({stats.expired})
						</button>
					</div>

					{selectedTargetItem && (
						<button
							type="button"
							onClick={() => setSelectedTargetItem(null)}
							className="h-8 px-2.5 rounded-lg border border-[var(--line,#cbd5e1)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] transition-colors text-xs flex items-center gap-1 cursor-pointer"
							title="Показать партии всех материалов"
							data-testid="batch-reset-item-filter"
						>
							<X size={13} />
							<span>Все материалы</span>
						</button>
					)}
				</div>

				{/* СПИСОК ПАРТИЙ */}
				<div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5 min-h-[240px]">
					{filteredBatches.length === 0 ? (
						<div className="flex flex-col items-center justify-center h-48 text-[var(--muted,#64748b)] text-xs gap-2">
							<Package size={28} className="stroke-[1.5]" />
							<p className="font-medium">Партии по выбранным критериям не найдены</p>
						</div>
					) : (
						<div className="flex flex-col gap-2">
							{filteredBatches.map((batch) => {
								const isExpired = batch.fefoStatus === "red";
								const isWarning = batch.fefoStatus === "yellow";
								const isOverdraft = batch.quantity < 0;

								return (
									<div
										key={`${batch.item.id}-${batch.lotNumber}`}
										className={`p-3 rounded-xl border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 transition-colors ${
											isExpired
												? "bg-rose-500/5 border-rose-500/30"
												: isWarning
													? "bg-amber-500/5 border-amber-500/30"
													: "bg-[var(--paper,#ffffff)] border-[var(--line,#e2e8f0)] hover:border-teal-500/40"
										}`}
										data-testid={`batch-card-${batch.item.id}`}
									>
										{/* Информация о партии */}
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2 flex-wrap mb-1">
												<span className="font-bold text-xs text-[var(--ink,#0f172a)] truncate">
													{batch.item.name}
												</span>
												<span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--paper-soft,#f1f5f9)] border border-[var(--line,#e2e8f0)] text-[var(--muted,#64748b)]">
													Серия: {batch.lotNumber}
												</span>
												{batch.item.sku && (
													<span className="text-[11px] text-[var(--muted,#64748b)]">
														{batch.item.sku}
													</span>
												)}
											</div>

											<div className="flex items-center gap-3 text-xs text-[var(--muted,#64748b)] flex-wrap">
												<span className="flex items-center gap-1 font-medium">
													<Clock size={13} className={isExpired ? "text-rose-600" : isWarning ? "text-amber-600" : "text-teal-600"} />
													Срок годности: <strong>{batch.expirationDate}</strong>
												</span>

												<span
													className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
														isExpired
															? "bg-rose-500/20 text-rose-800 dark:text-rose-200"
															: isWarning
																? "bg-amber-500/20 text-amber-800 dark:text-amber-200"
																: "bg-emerald-500/20 text-emerald-800 dark:text-emerald-200"
													}`}
												>
													{batch.fefoBadge}
												</span>

												<span className="font-semibold text-[var(--ink,#0f172a)]">
													Остаток:{" "}
													<span className={isOverdraft ? "text-amber-600 dark:text-amber-400" : ""}>
														{batch.quantity} {batch.item.unit || "шт."}
													</span>
													{isOverdraft && " (расход сверх остатка)"}
												</span>
											</div>
										</div>

										{/* Действия по партии (Мандат 8e: быстрый отпуск партии, списание просрочки) */}
										<div className="flex items-center gap-2 shrink-0">
											{isExpired ? (
												<button
													type="button"
													onClick={() => onWriteOffExpired?.(batch.item, batch.lotNumber)}
													className="h-8 min-h-[32px] sm:h-8 px-3 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 active:scale-98 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
													data-testid={`btn-writeoff-expired-${batch.item.id}`}
													title="Списать просроченную серию по акту утилизации (ТОРГ-16)"
												>
													<Trash2 size={13} />
													<span>Акт утилизации</span>
												</button>
											) : (
												<>
													<button
														type="button"
														onClick={() => onDeductBatch?.(batch.item, 1, batch.lotNumber)}
														className="h-8 min-h-[32px] sm:h-8 px-2.5 rounded-lg text-xs font-semibold border border-[var(--line,#cbd5e1)] text-[var(--ink,#0f172a)] hover:bg-teal-50 dark:hover:bg-teal-950/40 hover:border-teal-500 transition-all flex items-center gap-1.5 cursor-pointer"
														data-testid={`btn-deduct-batch-${batch.item.id}`}
														title="Списать 1 ед. из этой серии по регламенту FEFO"
													>
														<ArrowDownToLine size={13} className="text-teal-600 dark:text-teal-400" />
														<span>Списать по FEFO</span>
													</button>
													<button
														type="button"
														onClick={() => onReceiveBatch?.(batch.item, 10, batch.lotNumber, batch.expirationDate)}
														className="h-8 min-h-[32px] sm:h-8 px-2.5 rounded-lg text-xs font-semibold border border-[var(--line,#cbd5e1)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f1f5f9)] transition-all flex items-center gap-1 cursor-pointer"
														data-testid={`btn-receive-batch-${batch.item.id}`}
														title="Оприходовать партию (+10 ед.)"
													>
														<ArrowUpFromLine size={13} className="text-emerald-600" />
														<span>+10</span>
													</button>
												</>
											)}
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>

				{/* ФУТЕР */}
				<footer className="px-5 py-3 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between text-xs text-[var(--muted,#64748b)] shrink-0">
					<div className="flex items-center gap-2">
						<ShieldAlert size={14} className="text-teal-600 shrink-0" />
						<span>
							Правило FEFO: при отпуске материалов в процедурный кабинет система предлагает партию с ближайшим сроком.
						</span>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="h-8 min-h-[32px] sm:h-8 px-4 rounded-lg text-xs font-semibold bg-[var(--paper,#ffffff)] border border-[var(--line,#cbd5e1)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f1f5f9)] cursor-pointer"
						data-testid="btn-batch-footer-close"
					>
						Закрыть
					</button>
				</footer>
			</div>
		</div>
	);
};

export default WarehouseBatchTrackingModal;
