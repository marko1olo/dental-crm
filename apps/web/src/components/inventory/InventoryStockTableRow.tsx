/**
 * InventoryStockTableRow.tsx
 * DENTE Dental CRM — Компонент строки складской таблицы материалов.
 * Поддержка FEFO светофора, контроля сроков годности, овердрафта и операций.
 */

import {
	AlertTriangle,
	ArrowDownToLine,
	ArrowUpFromLine,
	Edit2,
	MoreHorizontal,
	Printer,
	QrCode,
	ShieldAlert,
	ShieldCheck,
	Trash2,
	TrendingUp,
} from "lucide-react";
import React from "react";
import { money } from "../../AppHelpers.js";
import { showToast } from "../GlobalToast.js";
import type { InventoryItem } from "./inventoryDataMappers.js";
import {
	formatExpDate,
	getCategoryBadge,
	getExpiryTrafficLight,
	getWarehouseFefoTrafficLight,
	type FefoTrafficLightInfo,
} from "./inventoryExpiryUtils.js";

export interface InventoryStockTableRowProps {
	readonly item: InventoryItem;
	readonly writeQty: number;
	readonly isMenuOpen: boolean;
	readonly menuRef?: React.RefObject<HTMLDivElement | null> | undefined;
	readonly onToggleMenu: () => void;
	readonly onCloseMenu: () => void;
	readonly onSelectItem?: ((item: InventoryItem) => void) | undefined;
	readonly onDeductItem: (item: InventoryItem, qty: number, isOverdraft: boolean) => void;
	readonly onReceiveItem: (item: InventoryItem, qty: number) => void;
	readonly onOpenDisposalModal: (item: InventoryItem) => void;
	readonly onOpenWarehouseManager?: (() => void) | undefined;
	readonly onOpenInventoryAudit?: (() => void) | undefined;
	readonly onEditItem?: ((item: InventoryItem) => void) | undefined;
	readonly onDeleteItem?: ((id: string, name: string) => void) | undefined;
}

export const InventoryStockTableRow: React.FC<InventoryStockTableRowProps> = ({
	item,
	writeQty,
	isMenuOpen,
	menuRef,
	onToggleMenu,
	onCloseMenu,
	onSelectItem,
	onDeductItem,
	onReceiveItem,
	onOpenDisposalModal,
	onOpenWarehouseManager,
	onOpenInventoryAudit,
	onEditItem,
	onDeleteItem,
}) => {
	const stock = Number(item.stockQuantity ?? 0);
	const isLowStock = stock <= (item.criticalThreshold ?? 5);
	const isOverdraft = stock <= 0;
	const unitCostRaw = Number(item.unitCostRub);
	const unitCost = Number.isFinite(unitCostRaw) ? unitCostRaw : null;
	const lineValue =
		unitCost !== null && Number.isFinite(stock) ? stock * unitCost : null;
	const catInfo = getCategoryBadge(item.category);

	// FEFO Светофор: канонический расчет по Мандату 8e / 8n
	const now = new Date();
	const expiryTraffic = getExpiryTrafficLight(item.expirationDate, now);
	const fefoInfo: FefoTrafficLightInfo | null = item.expirationDate
		? getWarehouseFefoTrafficLight(item.expirationDate, now)
		: null;

	return (
		<tr
			key={item.id}
			className={`inventory-item-row hover:bg-[var(--paper-soft)] transition-colors ${
				expiryTraffic.isBlocked ? "bg-rose-500/5 dark:bg-rose-950/10" : ""
			}`}
			style={{
				borderBottom: "1px solid var(--line)",
			}}
			data-testid={`stock-row-${item.id}`}
		>
			{/* 1. Наименование */}
			<td
				className="inventory-col-name"
				style={{
					padding: "8px 10px",
					verticalAlign: "middle",
				}}
			>
				<div className="flex items-center gap-2 min-w-0">
					{isLowStock && (
						<span
							title={isOverdraft ? "Мягкий учет расхода при нехватке (списание с дефицитом): остаток 0 или ниже" : "Критический остаток"}
							className="inline-flex shrink-0"
						>
							<AlertTriangle
								size={14}
								className={
									isOverdraft
										? "text-amber-600 dark:text-amber-400 shrink-0"
										: "text-rose-600 dark:text-rose-400 shrink-0"
								}
							/>
						</span>
					)}
					<div className="min-w-0 flex-1">
						<div
							className="font-bold text-[13px] text-[var(--ink)] truncate cursor-pointer hover:text-[var(--teal)] transition-colors"
							title={item.name}
							onClick={() => onSelectItem?.(item)}
						>
							{item.name}
						</div>
						<div className="text-[10px] text-[var(--muted)] font-mono flex items-center gap-2 mt-0.5 truncate">
							{item.sku && <span>SKU: {item.sku}</span>}
							{item.barcode && <span>ШК: {item.barcode}</span>}
							{item.lotNumber && (
								<span className="font-semibold text-[var(--ink)]">
									Партия: {item.lotNumber}
								</span>
							)}
						</div>
					</div>
				</div>
			</td>

			{/* 2. Категория */}
			<td
				className="inventory-col-category"
				style={{
					padding: "8px 8px",
					verticalAlign: "middle",
					whiteSpace: "nowrap",
				}}
			>
				<span
					className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${catInfo.className}`}
				>
					{catInfo.label}
				</span>
			</td>

			{/* 3. Срок годности / Партия */}
			<td
				className="inventory-col-fefo"
				style={{
					padding: "8px 8px",
					verticalAlign: "middle",
					whiteSpace: "nowrap",
				}}
			>
				{item.expirationDate ? (
					<div
						className="flex flex-col items-start gap-0.5 whitespace-nowrap"
						data-fefo-status={fefoInfo?.status || expiryTraffic.status}
						data-testid={`inventory-fefo-traffic-${fefoInfo?.status || "green"}`}
					>
						<div className="inline-flex items-center gap-1.5 whitespace-nowrap">
							<span
								style={{
									width: 7,
									height: 7,
									borderRadius: "50%",
									backgroundColor: fefoInfo?.dotColor || "#10b981",
									flexShrink: 0,
								}}
								data-fefo-dot={fefoInfo?.status || "green"}
								aria-hidden="true"
							/>
							<span
								className={`text-xs font-semibold whitespace-nowrap ${fefoInfo?.className || ""}`}
								title={expiryTraffic.labelRu}
							>
								до {formatExpDate(item.expirationDate)}
							</span>
						</div>
						<div className="flex items-center gap-1.5 flex-wrap">
							<span
								className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${expiryTraffic.className}`}
								data-testid={`traffic-light-badge-${item.id}`}
								title={expiryTraffic.labelRu}
							>
								{expiryTraffic.badgeTextRu}
							</span>
							<span
								className="hidden"
								data-testid="fefo-traffic-badge"
							>
								{fefoInfo?.badgeText}
							</span>
						</div>
					</div>
				) : (
					<div className="flex flex-col items-start gap-0.5 whitespace-nowrap">
						<span className="text-xs text-[var(--muted)] italic">
							Бессрочно
						</span>
						<span
							className={`inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold border ${expiryTraffic.className}`}
							data-testid={`traffic-light-badge-${item.id}`}
						>
							{expiryTraffic.badgeTextRu}
						</span>
					</div>
				)}
			</td>

			{/* 4. Остаток */}
			<td
				className="inventory-col-stock"
				style={{
					padding: "8px 8px",
					verticalAlign: "middle",
					textAlign: "right",
					whiteSpace: "nowrap",
				}}
			>
				<div className="flex flex-col items-end gap-0.5 whitespace-nowrap">
					<span
						className={`inventory-stock-badge font-mono font-bold ${
							isOverdraft ? "overdraft text-amber-600 dark:text-amber-400" : isLowStock ? "low text-orange-600 dark:text-orange-400" : "normal text-[var(--ink)]"
						}`}
					>
						{stock}&nbsp;{item.unit || "шт."}
					</span>
					{isOverdraft && (
						<span
							className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30"
							data-testid={`soft-overdraft-badge-${item.id}`}
							title="Мягкий учет расхода при нехватке (списание с дефицитом): не блокирует приём пациента"
						>
							<ShieldAlert size={10} className="shrink-0" />
							<span>Мягкий учет расхода (дефицит)</span>
						</span>
					)}
				</div>
			</td>

			{/* 5. Мин. запас */}
			<td
				className="inventory-col-threshold"
				style={{
					padding: "8px 8px",
					verticalAlign: "middle",
					textAlign: "right",
					whiteSpace: "nowrap",
				}}
			>
				<span className="font-mono text-xs text-[var(--muted)]">
					{item.criticalThreshold ?? 5}&nbsp;{item.unit || "шт."}
				</span>
			</td>

			{/* 6. Себестоимость */}
			<td
				className="inventory-col-cost"
				style={{
					padding: "8px 12px 8px 8px",
					verticalAlign: "middle",
					textAlign: "right",
					whiteSpace: "nowrap",
				}}
			>
				<div className="flex flex-col items-end gap-0.5 whitespace-nowrap">
					<span className="font-mono text-xs font-semibold text-[var(--ink)]">
						{unitCost !== null ? money(unitCost) : "—"}
					</span>
					{lineValue !== null && lineValue > 0 && (
						<span className="text-[10px] text-[var(--muted)] font-mono">
							∑&nbsp;{money(lineValue)}
						</span>
					)}
				</div>
			</td>

			{/* 7. Действия */}
			<td
				className="inventory-col-actions"
				style={{
					padding: "8px 12px 8px 8px",
					verticalAlign: "middle",
					textAlign: "right",
					whiteSpace: "nowrap",
				}}
			>
				<div className="flex items-center justify-end gap-1 whitespace-nowrap shrink-0">
					{expiryTraffic.isBlocked ? (
						/* Красный: блокировка отпуска пациентам + Акт утилизации СанПиН 3.3686-21 */
						<button
							type="button"
							onClick={() => onOpenDisposalModal(item)}
							className="h-7 px-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs active:scale-98"
							title="Срок годности истек: сформировать Акт утилизации по СанПиН 3.3686-21"
							data-testid={`btn-sanpin-disposal-act-${item.id}`}
						>
							<Trash2 size={12} className="shrink-0" />
							<span>Акт утилизации СанПиН 3.3686-21</span>
						</button>
					) : (
						/* Разрешено: списание по FEFO с поддержкой мягкого овердрафта */
						<>
							<button
								type="button"
								onClick={() => onDeductItem(item, writeQty, isOverdraft)}
								className={`h-7 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 whitespace-nowrap shrink-0 ${
									isOverdraft
										? "bg-amber-600 hover:bg-amber-500 text-white shadow-xs"
										: expiryTraffic.status === "warning_soon"
										? "bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 border border-rose-500/25 ring-1 ring-amber-400"
										: "bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 border border-rose-500/25"
								}`}
								title={
									isOverdraft
										? "Списать расход сверх остатка (списание с дефицитом): клинический процесс не блокируется"
										: "Списать расход материала по FEFO"
								}
								data-testid={`btn-item-writeoff-${item.id}`}
							>
								<span className="hidden" data-testid={`btn-deduct-fefo-${item.id}`}>
									{isOverdraft ? "Списать (с дефицитом)" : "Списать"}
								</span>
								{isOverdraft ? (
									<>
										<ShieldAlert size={12} className="shrink-0" />
										<span>Списать (с дефицитом)</span>
									</>
								) : (
									<>
										<ArrowUpFromLine size={12} className="shrink-0" />
										<span>Списание</span>
									</>
								)}
							</button>

							<button
								type="button"
								onClick={() => onReceiveItem(item, writeQty)}
								className="h-7 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 whitespace-nowrap shrink-0 bg-[var(--teal-soft)] text-[var(--teal-dark,#0f766e)] hover:bg-[var(--teal-surface)] border border-[var(--teal)]"
								title="Оприходовать материал на склад"
								data-testid={`btn-item-arrival-${item.id}`}
							>
								<ArrowDownToLine size={12} className="shrink-0" />
								<span>Приход</span>
							</button>
						</>
					)}

					{/* Меню дополнительных действий */}
					<div className="relative inline-block shrink-0">
						<button
							type="button"
							onClick={onToggleMenu}
							className="w-6 h-7 rounded-lg text-xs transition-all cursor-pointer inline-flex items-center justify-center bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--line)]"
							title="Дополнительные операции"
							data-testid={`btn-item-more-${item.id}`}
							aria-expanded={isMenuOpen}
						>
							<MoreHorizontal size={13} />
						</button>

						{isMenuOpen && (
							<div
								ref={menuRef}
								className="absolute right-0 top-full mt-1 bg-[var(--paper)] border border-[var(--line)] rounded-xl shadow-lg p-1.5 z-40 min-w-[190px] flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-100"
								role="menu"
							>
								<button
									type="button"
									onClick={() => {
										onCloseMenu();
										if (item.barcode) {
											navigator.clipboard?.writeText(item.barcode);
											showToast(`Штрихкод скопирован: ${item.barcode}`, "info");
										} else {
											showToast(
												"У позиции нет штрихкода (задайте в редактировании)",
												"info",
											);
										}
									}}
									className="w-full px-2.5 py-1.5 rounded-lg text-xs text-left font-medium text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors"
									role="menuitem"
								>
									<QrCode size={13} className="text-teal-600 dark:text-teal-400 shrink-0" />
									<span>Штрихкод {item.barcode ? `(${item.barcode})` : ""}</span>
								</button>
								{onOpenWarehouseManager && (
									<button
										type="button"
										onClick={() => {
											onCloseMenu();
											onOpenWarehouseManager();
										}}
										className="w-full px-2.5 py-1.5 rounded-lg text-xs text-left font-medium text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors"
										role="menuitem"
									>
										<TrendingUp size={13} className="text-blue-600 shrink-0" />
										<span>История движений</span>
									</button>
								)}
								<button
									type="button"
									onClick={() => {
										onCloseMenu();
										showToast(
											`Печать этикетки «${item.name}» (штрихкод: ${item.barcode || "б/ш"}) отправлена`,
											"info",
										);
									}}
									className="w-full px-2.5 py-1.5 rounded-lg text-xs text-left font-medium text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors"
									role="menuitem"
								>
									<Printer size={13} className="text-indigo-600 shrink-0" />
									<span>Печать этикетки</span>
								</button>
								{onOpenInventoryAudit && (
									<button
										type="button"
										onClick={() => {
											onCloseMenu();
											onOpenInventoryAudit();
										}}
										className="w-full px-2.5 py-1.5 rounded-lg text-xs text-left font-medium text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors"
										role="menuitem"
									>
										<ShieldCheck size={13} className="text-emerald-600 shrink-0" />
										<span>Инвентаризация (сверка)</span>
									</button>
								)}
								{onEditItem && (
									<button
										type="button"
										onClick={() => {
											onCloseMenu();
											onEditItem(item);
										}}
										className="w-full px-2.5 py-1.5 rounded-lg text-xs text-left font-medium text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors"
										role="menuitem"
									>
										<Edit2 size={13} className="text-teal-600 dark:text-teal-400 shrink-0" />
										<span>Редактировать</span>
									</button>
								)}
								{onDeleteItem && (
									<>
										<div className="h-px bg-[var(--line)] my-0.5" />
										<button
											type="button"
											onClick={() => {
												onCloseMenu();
												onDeleteItem(item.id, item.name);
											}}
											className="w-full px-2.5 py-1.5 rounded-lg text-xs text-left font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 cursor-pointer transition-colors"
											role="menuitem"
										>
											<Trash2 size={13} className="shrink-0" />
											<span>Удалить позицию</span>
										</button>
									</>
								)}
							</div>
						)}
					</div>
				</div>
			</td>
		</tr>
	);
};

export default InventoryStockTableRow;
