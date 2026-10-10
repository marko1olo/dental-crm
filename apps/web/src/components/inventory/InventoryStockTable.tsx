import {
	AlertTriangle,
	ArrowDownToLine,
	ArrowUpFromLine,
	CheckCircle2,
	Clock,
	Edit2,
	FileText,
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
	TrendingUp,
	X,
	Zap,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { money } from "../../AppHelpers.js";
import { showToast } from "../GlobalToast.js";
import {
	getExpiryTrafficLight,
	getCategoryBadge,
	formatExpDate,
	getWarehouseFefoTrafficLight,
	getFefoTrafficLight,
	type ExpiryTrafficStatus,
	type ExpiryTrafficLightInfo,
	type FefoTrafficLightInfo,
} from "./inventoryExpiryUtils.js";
import type { InventoryItem } from "./inventoryDataMappers.js";
import { InventoryMobileCards } from "./InventoryMobileCards.js";
import { InventoryDisposalActModal } from "./InventoryDisposalActModal.js";
import { InventoryStockTableRow } from "./InventoryStockTableRow.js";

export {
	getExpiryTrafficLight,
	getCategoryBadge,
	formatExpDate,
	getWarehouseFefoTrafficLight,
	getFefoTrafficLight,
	type ExpiryTrafficStatus,
	type ExpiryTrafficLightInfo,
	type FefoTrafficLightInfo,
};

export interface InventoryStockTableProps {
	readonly items: readonly InventoryItem[];
	readonly isLoading?: boolean;
	readonly organizationId?: string;
	readonly searchQuery?: string;
	readonly loadError?: string | null;
	readonly hasMore?: boolean;
	readonly remainingCount?: number;
	readonly onShowMore?: () => void;
	readonly onSelectItem?: (item: InventoryItem) => void;
	readonly onDeductItem?: ((item: InventoryItem, quantity?: number) => void | Promise<void>) | undefined;
	readonly onReceiveItem?: ((item: InventoryItem, quantity?: number) => void | Promise<void>) | undefined;
	readonly onDeleteItem?: (id: string, name: string) => void;
	readonly onEditItem?: (item: InventoryItem) => void;
	readonly onCreateDisposalAct?: (item: InventoryItem) => void | Promise<void>;
	readonly onOpenWaybills?: () => void;
	readonly onOpenAddModal?: () => void;
	readonly onOpenWarehouseManager?: () => void;
	readonly onOpenInventoryAudit?: () => void;
	readonly onRetry?: () => void;
	readonly className?: string;
}

export type WarehouseItemsTableProps = InventoryStockTableProps;

export const InventoryStockTable: React.FC<InventoryStockTableProps> = ({
	items,
	isLoading = false,
	organizationId = "",
	searchQuery: externalSearchQuery,
	loadError = null,
	hasMore,
	remainingCount,
	onShowMore,
	onSelectItem,
	onDeductItem,
	onReceiveItem,
	onDeleteItem,
	onEditItem,
	onCreateDisposalAct,
	onOpenWaybills,
	onOpenAddModal,
	onOpenWarehouseManager,
	onOpenInventoryAudit,
	onRetry,
	className = "",
}) => {
	const [localSearchQuery, setLocalSearchQuery] = useState("");
	const [activeMenuRowId, setActiveMenuRowId] = useState<string | null>(null);
	const [disposalPromptItem, setDisposalPromptItem] = useState<InventoryItem | null>(null);
	const [pendingQuantities, setPendingQuantities] = useState<Record<string, number>>({});
	const rowMenuRef = useRef<HTMLDivElement>(null);

	const effectiveSearch =
		externalSearchQuery !== undefined ? externalSearchQuery : localSearchQuery;

	useEffect(() => {
		const handleOutside = (e: MouseEvent) => {
			if (rowMenuRef.current && !rowMenuRef.current.contains(e.target as Node)) {
				setActiveMenuRowId(null);
			}
		};
		if (activeMenuRowId) {
			document.addEventListener("mousedown", handleOutside);
		}
		return () => document.removeEventListener("mousedown", handleOutside);
	}, [activeMenuRowId]);

	const handleStepQuantity = useCallback((itemId: string, delta: number) => {
		setPendingQuantities((prev) => {
			const current = prev[itemId] || 1;
			const nextVal = Math.max(1, current + delta);
			return { ...prev, [itemId]: nextVal };
		});
	}, []);

	const filteredItems = useMemo(() => {
		if (!effectiveSearch || !effectiveSearch.trim()) return items;
		const query = effectiveSearch.toLowerCase().trim();
		return items.filter(
			(item) =>
				item.name.toLowerCase().includes(query) ||
				(item.sku && item.sku.toLowerCase().includes(query)) ||
				(item.barcode && item.barcode.toLowerCase().includes(query)) ||
				(item.lotNumber && item.lotNumber.toLowerCase().includes(query)),
		);
	}, [items, effectiveSearch]);

	const handleExecuteDisposalAct = (item: InventoryItem) => {
		const actNumber = `САНПИН-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
		if (onCreateDisposalAct) {
			onCreateDisposalAct(item);
		} else {
			showToast(
				`Оформлен акт утилизации ${actNumber} по СанПиН 3.3686-21 для «${item.name}» (Класс Б/Г). Партия списана.`,
				"info",
			);
		}
		setDisposalPromptItem(null);
	};

	const handleExecuteDeduct = (item: InventoryItem, qty: number, isOverdraft: boolean) => {
		if (onDeductItem) {
			onDeductItem(item, qty);
		} else {
			showToast(
				isOverdraft
					? `Списано ${qty} ед. «${item.name}» (расход сверх остатка / списание с дефицитом)`
					: `Списано ${qty} ед. «${item.name}» по FEFO`,
				isOverdraft ? "info" : "success",
			);
		}
	};

	const handleExecuteReceive = (item: InventoryItem, qty: number) => {
		if (onReceiveItem) {
			onReceiveItem(item, qty);
		} else {
			showToast(`Оприходовано ${qty} ед. «${item.name}» на склад`, "success");
		}
	};

	return (
		<div
			className={`inventory-view-table-wrapper inventory-stock-table-container ${className}`.trim()}
			style={{
				flex: 1,
				overflowX: "auto",
				overflowY: "auto",
				maxWidth: "100%",
				width: "100%",
				boxSizing: "border-box",
				background: "var(--paper)",
				borderRadius: 8,
				border: "1px solid var(--line)",
			}}
			data-testid="inventory-stock-table"
			role="region"
			aria-label="Складской учет материалов и контроль сроков годности FEFO"
		>
			{/* Мобильный слой: Apple iOS HIG Grouped List Cards (вместо сжатого десктопа и 8 колонок) */}
			<div className="inventory-mobile-cards-wrapper block md:hidden p-2.5" data-testid="inventory-mobile-cards-view">
				<InventoryMobileCards
					items={filteredItems}
					isLoading={isLoading}
					effectiveSearch={effectiveSearch}
					loadError={loadError}
					onSelectItem={onSelectItem}
					onDeductItem={handleExecuteDeduct}
					onReceiveItem={handleExecuteReceive}
					onOpenWaybills={onOpenWaybills}
					onOpenAddModal={onOpenAddModal}
					onRetry={onRetry}
					onOpenDisposalModal={(item) => setDisposalPromptItem(item)}
					onOpenWarehouseManager={onOpenWarehouseManager}
					onOpenInventoryAudit={onOpenInventoryAudit}
					onEditItem={onEditItem}
					onDeleteItem={onDeleteItem}
				/>
			</div>

			<table
				className="inventory-view-table hidden md:table"
				style={{
					width: "100%",
					tableLayout: "fixed",
					borderCollapse: "collapse",
					textAlign: "left",
				}}
				data-testid="inventory-view-table"
				role="table"
			>
				<thead
					style={{
						position: "sticky",
						top: 0,
						background: "var(--paper-soft)",
						zIndex: 10,
					}}
				>
					<tr>
						{/* 1. Наименование */}
						<th
							className="inventory-col-name"
							style={{
								padding: "8px 10px",
								fontSize: 11,
								color: "var(--muted)",
								fontWeight: 600,
								borderBottom: "1px solid var(--line)",
								textTransform: "uppercase",
								letterSpacing: 0.5,
								whiteSpace: "nowrap",
							}}
						>
							Наименование
						</th>

						{/* 2. Категория */}
						<th
							className="inventory-col-category"
							style={{
								padding: "8px 8px",
								fontSize: 11,
								color: "var(--muted)",
								fontWeight: 600,
								borderBottom: "1px solid var(--line)",
								textTransform: "uppercase",
								letterSpacing: 0.5,
								whiteSpace: "nowrap",
								width: 100,
							}}
						>
							Категория
						</th>

						{/* 3. Срок годности / Партия */}
						<th
							className="inventory-col-fefo"
							style={{
								padding: "8px 8px",
								fontSize: 11,
								color: "var(--muted)",
								fontWeight: 600,
								borderBottom: "1px solid var(--line)",
								textTransform: "uppercase",
								letterSpacing: 0.5,
								whiteSpace: "nowrap",
								width: 165,
							}}
						>
							<div className="leading-tight">
								<div>Срок годности</div>
								<div className="text-[10px] opacity-75 font-normal tracking-normal">Партия / FEFO</div>
							</div>
						</th>

						{/* 4. Остаток */}
						<th
							className="inventory-col-stock"
							style={{
								padding: "8px 8px",
								fontSize: 11,
								color: "var(--muted)",
								fontWeight: 600,
								borderBottom: "1px solid var(--line)",
								textTransform: "uppercase",
								letterSpacing: 0.5,
								whiteSpace: "nowrap",
								width: 95,
								textAlign: "right",
							}}
						>
							Остаток
						</th>

						{/* 5. Мин. запас */}
						<th
							className="inventory-col-threshold"
							style={{
								padding: "8px 8px",
								fontSize: 11,
								color: "var(--muted)",
								fontWeight: 600,
								borderBottom: "1px solid var(--line)",
								textTransform: "uppercase",
								letterSpacing: 0.5,
								whiteSpace: "nowrap",
								width: 80,
								textAlign: "right",
							}}
						>
							Мин. запас
						</th>

						{/* 6. Себестоимость */}
						<th
							className="inventory-col-cost"
							style={{
								padding: "8px 10px 8px 8px",
								fontSize: 11,
								color: "var(--muted)",
								fontWeight: 600,
								borderBottom: "1px solid var(--line)",
								textTransform: "uppercase",
								letterSpacing: 0.5,
								whiteSpace: "nowrap",
								width: 110,
								textAlign: "right",
							}}
						>
							<div className="leading-tight">
								<div>Себестоимость</div>
								<div className="text-[10px] opacity-75 font-normal tracking-normal">за единицу</div>
							</div>
						</th>

						{/* 7. Действия */}
						<th
							className="inventory-col-actions"
							style={{
								padding: "8px 10px 8px 8px",
								fontSize: 11,
								color: "var(--muted)",
								fontWeight: 600,
								borderBottom: "1px solid var(--line)",
								textTransform: "uppercase",
								letterSpacing: 0.5,
								textAlign: "right",
								width: 215,
								whiteSpace: "nowrap",
							}}
						>
							Действия
						</th>
					</tr>
				</thead>

				<tbody>
					{filteredItems.length === 0 ? (
						<tr>
							<td
								colSpan={7}
								style={{
									padding: "32px 16px",
									textAlign: "center",
									color: "var(--muted)",
								}}
							>
								{loadError ? (
									<div className="flex flex-col items-center gap-3">
										<AlertTriangle size={24} className="text-rose-600 dark:text-rose-400" />
										<span className="text-[var(--ink)] font-semibold text-sm">
											{loadError}
										</span>
										{onRetry && (
											<button
												type="button"
												onClick={onRetry}
												disabled={isLoading}
												className="secondary-button h-8 px-4 rounded-lg text-xs font-bold inline-flex items-center justify-center cursor-pointer"
												style={{ height: 32, minHeight: 32, borderRadius: 8 }}
											>
												{isLoading ? "Загружаем..." : "Повторить"}
											</button>
										)}
									</div>
								) : effectiveSearch ? (
									<div className="flex flex-col items-center gap-2">
										<Search size={28} className="text-[var(--muted)] opacity-60" />
										<span className="text-[var(--ink)] font-semibold text-sm">
											Материалы не найдены по запросу «{effectiveSearch}»
										</span>
										<span className="text-[var(--muted)] text-xs">
											Проверьте правильность наименования, артикула SKU или штрихкода партии.
										</span>
									</div>
								) : (
									<div className="flex flex-col items-center gap-3 max-w-md mx-auto text-center" data-testid="inventory-empty-state-card">
										<Package size={36} className="text-teal-600 dark:text-teal-400" />
										<span className="text-[var(--ink)] font-bold text-base" data-testid="inventory-empty-state-title">
											Материалы не заприходованы. Добавить первую партию
										</span>
										<span className="text-[var(--muted)] text-xs leading-relaxed">
											Оформите первую приходную накладную для оприходования медикаментов, анестетиков и расходников по FEFO.
										</span>
										<div className="flex flex-wrap items-center justify-center gap-2 mt-2">
											{onOpenWaybills && (
												<button
													type="button"
													onClick={onOpenWaybills}
													className="primary-button h-8 px-3.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
													style={{ height: 32, minHeight: 32, borderRadius: 8 }}
													data-testid="empty-state-acceptance-waybills-btn"
												>
													<FileText size={14} />
													<span>Приходная накладная</span>
												</button>
											)}
											{onOpenAddModal && (
												<button
													type="button"
													onClick={onOpenAddModal}
													className="secondary-button h-8 px-3.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
													style={{
														height: 32,
														minHeight: 32,
														borderRadius: 8,
														border: "1px solid var(--line)",
														background: "var(--paper-soft)",
														color: "var(--ink)",
													}}
													data-testid="empty-state-add-first-material-btn"
												>
													<Plus size={14} />
													<span>Добавить первую партию</span>
												</button>
											)}
										</div>
									</div>
								)}
							</td>
						</tr>
					) : (
						filteredItems.map((item) => (
							<InventoryStockTableRow
								key={item.id}
								item={item}
								writeQty={pendingQuantities[item.id] || 1}
								isMenuOpen={activeMenuRowId === item.id}
								menuRef={rowMenuRef}
								onToggleMenu={() =>
									setActiveMenuRowId((prev) =>
										prev === item.id ? null : item.id,
									)
								}
								onCloseMenu={() => setActiveMenuRowId(null)}
								onSelectItem={onSelectItem}
								onDeductItem={handleExecuteDeduct}
								onReceiveItem={handleExecuteReceive}
								onOpenDisposalModal={(targetItem) =>
									setDisposalPromptItem(targetItem)
								}
								onOpenWarehouseManager={onOpenWarehouseManager}
								onOpenInventoryAudit={onOpenInventoryAudit}
								onEditItem={onEditItem}
								onDeleteItem={onDeleteItem}
							/>
						))
					)}
					{hasMore && onShowMore && (
						<tr>
							<td colSpan={7} style={{ textAlign: "center", padding: "14px" }}>
								<button
									type="button"
									className="btn-inventory-show-more h-8 px-4 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-xs font-semibold hover:border-[var(--teal)] transition-colors cursor-pointer inline-flex items-center gap-1.5"
									onClick={onShowMore}
									title="Подгрузить следующие материалы склада"
								>
									<span>Показать ещё 40 материалов (осталось {remainingCount ?? 0})</span>
								</button>
							</td>
						</tr>
					)}
				</tbody>
			</table>

			{/* Модалка утверждения акта утилизации СанПиН 3.3686-21 */}
			{disposalPromptItem && (
				<InventoryDisposalActModal
					item={disposalPromptItem}
					quantity={pendingQuantities[disposalPromptItem.id] || 1}
					onClose={() => setDisposalPromptItem(null)}
					onConfirm={handleExecuteDisposalAct}
				/>
			)}
		</div>
	);
};

export const WarehouseItemsTable = InventoryStockTable;
export default InventoryStockTable;
