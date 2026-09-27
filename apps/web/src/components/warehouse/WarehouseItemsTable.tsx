import {
	AlertTriangle,
	ArrowDownToLine,
	ArrowUpFromLine,
	Edit2,
	FileText,
	MoreHorizontal,
	Package,
	Plus,
	Printer,
	QrCode,
	Search,
	ShieldCheck,
	Trash2,
	TrendingUp,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { money } from "../../AppHelpers.js";
import { showToast } from "../GlobalToast.js";
import {
	getFefoTrafficLight,
	type FefoTrafficLightInfo,
} from "../inventory/NurseCarpuleDisposalModal.js";
import type { InventoryItem } from "../inventory/inventoryDataMappers.js";

export interface WarehouseItemsTableProps {
	readonly items: readonly InventoryItem[];
	readonly isLoading: boolean;
	readonly organizationId: string;
	readonly searchQuery: string;
	readonly loadError: string | null;
	readonly hasMore?: boolean;
	readonly remainingCount?: number;
	readonly onShowMore?: () => void;
	readonly onSelectItem: (item: InventoryItem) => void;
	readonly onDeductItem: (item: InventoryItem) => void;
	readonly onReceiveItem: (item: InventoryItem) => void;
	readonly onDeleteItem: (id: string, name: string) => void;
	readonly onEditItem: (item: InventoryItem) => void;
	readonly onOpenWaybills: () => void;
	readonly onOpenAddModal: () => void;
	readonly onOpenWarehouseManager?: () => void;
	readonly onOpenInventoryAudit?: () => void;
	readonly onRetry: () => void;
}

/**
 * Определение читаемой категории материала и стилей плашки
 */
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

/**
 * Форматирование даты окончания срока годности без временных сдвигов
 */
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

export const WarehouseItemsTable: React.FC<WarehouseItemsTableProps> = ({
	items,
	isLoading,
	organizationId,
	searchQuery,
	loadError,
	hasMore,
	remainingCount,
	onShowMore,
	onSelectItem,
	onDeductItem,
	onReceiveItem,
	onDeleteItem,
	onEditItem,
	onOpenWaybills,
	onOpenAddModal,
	onOpenWarehouseManager,
	onOpenInventoryAudit,
	onRetry,
}) => {
	const [activeMenuRowId, setActiveMenuRowId] = useState<string | null>(null);
	const rowMenuRef = useRef<HTMLDivElement>(null);

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

	return (
		<div
			className="inventory-view-table-wrapper"
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
		>
			<table
				className="inventory-view-table"
				style={{
					width: "100%",
					minWidth: "980px",
					borderCollapse: "collapse",
					textAlign: "left",
				}}
				data-testid="inventory-view-table"
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
						{/* 1. Артикул / Штрихкод */}
						<th
							className="inventory-col-sku"
							style={{
								padding: "8px 10px",
								fontSize: 11,
								color: "var(--muted)",
								fontWeight: 600,
								borderBottom: "1px solid var(--line)",
								textTransform: "uppercase",
								letterSpacing: 0.5,
								whiteSpace: "nowrap",
								width: 115,
								minWidth: 115,
								maxWidth: 120,
							}}
						>
							<div className="leading-tight">
								<div>АРТИКУЛ</div>
								<div className="text-[10px] opacity-75 font-normal tracking-normal">ШТРИХКОД</div>
							</div>
						</th>

						{/* 2. Наименование */}
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
								minWidth: 200,
							}}
						>
							Наименование
						</th>

						{/* 3. Категория */}
						<th
							className="inventory-col-category"
							style={{
								padding: "8px 10px",
								fontSize: 11,
								color: "var(--muted)",
								fontWeight: 600,
								borderBottom: "1px solid var(--line)",
								textTransform: "uppercase",
								letterSpacing: 0.5,
								whiteSpace: "nowrap",
								width: 110,
								minWidth: 110,
								maxWidth: 120,
							}}
						>
							Категория
						</th>

						{/* 4. Остаток */}
						<th
							className="inventory-col-stock"
							style={{
								padding: "8px 10px",
								fontSize: 11,
								color: "var(--muted)",
								fontWeight: 600,
								borderBottom: "1px solid var(--line)",
								textTransform: "uppercase",
								letterSpacing: 0.5,
								whiteSpace: "nowrap",
								width: 95,
								minWidth: 95,
								maxWidth: 105,
								textAlign: "right",
							}}
						>
							Остаток
						</th>

						{/* 5. Срок годности / FEFO */}
						<th
							className="inventory-col-fefo"
							style={{
								padding: "8px 10px",
								fontSize: 11,
								color: "var(--muted)",
								fontWeight: 600,
								borderBottom: "1px solid var(--line)",
								textTransform: "uppercase",
								letterSpacing: 0.5,
								whiteSpace: "nowrap",
								width: 155,
								minWidth: 155,
								maxWidth: 165,
							}}
						>
							<div className="leading-tight">
								<div>СРОК ГОДНОСТИ</div>
								<div className="text-[10px] opacity-75 font-normal tracking-normal">FEFO ПРИОРИТЕТ</div>
							</div>
						</th>

						{/* 6. Партия / Поставщик */}
						<th
							className="inventory-col-lot"
							style={{
								padding: "8px 10px",
								fontSize: 11,
								color: "var(--muted)",
								fontWeight: 600,
								borderBottom: "1px solid var(--line)",
								textTransform: "uppercase",
								letterSpacing: 0.5,
								whiteSpace: "nowrap",
								width: 125,
								minWidth: 125,
								maxWidth: 135,
							}}
						>
							<div className="leading-tight">
								<div>ПАРТИЯ</div>
								<div className="text-[10px] opacity-75 font-normal tracking-normal">ПОСТАВЩИК</div>
							</div>
						</th>

						{/* 7. Действия */}
						<th
							className="inventory-col-actions"
							style={{
								padding: "8px 10px",
								fontSize: 11,
								color: "var(--muted)",
								fontWeight: 600,
								borderBottom: "1px solid var(--line)",
								textTransform: "uppercase",
								letterSpacing: 0.5,
								textAlign: "right",
								width: 175,
								minWidth: 175,
								maxWidth: 180,
								whiteSpace: "nowrap",
							}}
						>
							Действия
						</th>
					</tr>
				</thead>

				<tbody>
					{items.length === 0 ? (
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
										<button
											type="button"
											onClick={onRetry}
											disabled={isLoading}
											className="h-8 px-4 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-xs font-bold hover:bg-[var(--teal-surface)] hover:border-[var(--teal)] transition-colors cursor-pointer"
										>
											{isLoading ? "Загружаем..." : "Повторить"}
										</button>
									</div>
								) : !organizationId ? (
									<span>
										Склад не загружен: клиника не определена. Обновите страницу или войдите в кабинет заново.
									</span>
								) : searchQuery ? (
									<div className="flex flex-col items-center gap-2">
										<Search size={28} className="text-[var(--muted)] opacity-60" />
										<span className="text-[var(--ink)] font-semibold text-sm">
											Материалы не найдены по запросу «{searchQuery}»
										</span>
										<span className="text-[var(--muted)] text-xs">
											Проверьте правильность наименования, артикула SKU или штрихкода партии.
										</span>
									</div>
								) : (
									<div className="flex flex-col items-center gap-3 max-w-md mx-auto text-center">
										<Package size={36} className="text-teal-600 dark:text-teal-400" />
										<span className="text-[var(--ink)] font-bold text-base">
											На складе пока нет материалов и партий
										</span>
										<span className="text-[var(--muted)] text-xs leading-relaxed">
											Оформите первую приходную накладную для оприходования медикаментов, анестетиков и расходников по FEFO.
										</span>
										<div className="flex flex-wrap items-center justify-center gap-2 mt-2">
											<button
												type="button"
												onClick={onOpenWaybills}
												className="h-8 px-3.5 rounded-lg bg-[var(--teal)] text-white text-xs font-bold shadow-xs hover:bg-[var(--teal-dark,#0f766e)] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
												data-testid="empty-state-acceptance-waybills-btn"
											>
												<FileText size={14} />
												<span>Оформить накладную (FEFO)</span>
											</button>
											<button
												type="button"
												onClick={onOpenAddModal}
												className="h-8 px-3 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-xs font-semibold hover:border-[var(--teal)] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
												data-testid="empty-state-add-first-material-btn"
											>
												<Plus size={14} />
												<span>Создать вручную</span>
											</button>
										</div>
									</div>
								)}
							</td>
						</tr>
					) : (
						items.map((item) => {
							const isLowStock = item.stockQuantity <= item.criticalThreshold;
							const isOverdraft = item.stockQuantity <= 0;
							const unitCostRaw = Number(item.unitCostRub);
							const unitCost = Number.isFinite(unitCostRaw) ? unitCostRaw : null;
							const lineValue =
								unitCost !== null && Number.isFinite(item.stockQuantity)
									? item.stockQuantity * unitCost
									: null;
							const catInfo = getCategoryBadge(item.category);
							const fefoInfo: FefoTrafficLightInfo | null = item.expirationDate
								? getFefoTrafficLight(item.expirationDate)
								: null;

							return (
								<tr
									key={item.id}
									className="inventory-item-row hover:bg-[var(--paper-soft)] transition-colors"
									style={{
										borderBottom: "1px solid var(--line)",
									}}
									data-testid={`stock-row-${item.id}`}
								>
									{/* 1. Артикул / Штрихкод */}
									<td
										className="inventory-col-sku"
										style={{
											padding: "8px 10px",
											verticalAlign: "middle",
											whiteSpace: "nowrap",
										}}
									>
										<div className="flex flex-col items-start gap-0.5 whitespace-nowrap">
											{item.barcode ? (
												<span
													className="font-mono text-[11px] text-[var(--ink)] tracking-tight px-1 py-0.2 rounded bg-[var(--paper-soft)] border border-[var(--line)] select-all truncate max-w-[105px]"
													title={`Штрихкод: ${item.barcode}`}
												>
													{item.barcode}
												</span>
											) : (
												<span className="text-[11px] text-[var(--muted)] font-mono">
													{item.sku ? item.sku : "—"}
												</span>
											)}
											{item.barcode && item.sku && (
												<span className="text-[10px] text-[var(--muted)] font-mono truncate max-w-[105px]">
													{item.sku}
												</span>
											)}
										</div>
									</td>

									{/* 2. Наименование */}
									<td
										className="inventory-col-name"
										style={{
											padding: "8px 10px",
											verticalAlign: "middle",
										}}
									>
										<div className="flex items-center gap-2 min-w-0">
											{isLowStock && (
												<AlertTriangle
													size={14}
													className="text-rose-600 dark:text-rose-400 shrink-0"
													title="Критический остаток"
												/>
											)}
											<div className="min-w-0 flex-1">
												<div
													className="font-bold text-[13px] text-[var(--ink)] truncate cursor-pointer hover:text-[var(--teal)] transition-colors"
													title={item.name}
													onClick={() => onSelectItem(item)}
												>
													{item.name}
												</div>
												<div className="text-[11px] text-[var(--muted)] flex items-center gap-2 mt-0.5">
													{unitCost !== null && (
														<span>
															{money(unitCost)}&nbsp;/&nbsp;{item.unit || "шт."}
														</span>
													)}
													{lineValue !== null && lineValue > 0 && (
														<span className="opacity-75">
															итого: {money(lineValue)}
														</span>
													)}
												</div>
											</div>
										</div>
									</td>

									{/* 3. Категория */}
									<td
										className="inventory-col-category"
										style={{
											padding: "8px 10px",
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

									{/* 4. Остаток */}
									<td
										className="inventory-col-stock"
										style={{
											padding: "8px 10px",
											verticalAlign: "middle",
											textAlign: "right",
											whiteSpace: "nowrap",
										}}
									>
										<div className="flex flex-col items-end gap-0.5 whitespace-nowrap">
											<span
												className={`inventory-stock-badge ${
													isOverdraft ? "overdraft" : isLowStock ? "low" : "normal"
												}`}
											>
												{item.stockQuantity}&nbsp;{item.unit || "шт."}
											</span>
											<span className="text-[10px] text-[var(--muted)] font-mono">
												мин:&nbsp;{item.criticalThreshold}&nbsp;{item.unit || "шт."}
											</span>
										</div>
									</td>

									{/* 5. Срок годности / FEFO */}
									<td
										className="inventory-col-fefo"
										style={{
											padding: "8px 10px",
											verticalAlign: "middle",
											whiteSpace: "nowrap",
										}}
									>
										{fefoInfo ? (
											<div
												className="flex flex-col items-start gap-0.5 whitespace-nowrap"
												data-fefo-status={fefoInfo.status}
												data-testid={`inventory-fefo-traffic-${fefoInfo.status}`}
											>
												<div className="inline-flex items-center gap-1.5 whitespace-nowrap">
													<span
														style={{
															width: 7,
															height: 7,
															borderRadius: "50%",
															backgroundColor: fefoInfo.dotColor,
															flexShrink: 0,
														}}
														data-fefo-dot={fefoInfo.status}
														aria-hidden="true"
													/>
													<span
														className={`text-xs font-semibold whitespace-nowrap ${fefoInfo.className}`}
														title={fefoInfo.tooltip || fefoInfo.label}
													>
														до {formatExpDate(item.expirationDate)}
													</span>
												</div>
												<span
													className={`inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider ${fefoInfo.bgClass} ${fefoInfo.textClass}`}
													data-testid="fefo-traffic-badge"
													title={fefoInfo.tooltip || fefoInfo.label}
												>
													{fefoInfo.status === "yellow" && fefoInfo.daysLeft > 0
														? `FEFO ПРИОРИТЕТ (${fefoInfo.daysLeft} дн)`
														: fefoInfo.badgeText}
												</span>
											</div>
										) : (
											<span className="text-xs text-[var(--muted)] italic">
												Бессрочно
											</span>
										)}
									</td>

									{/* 6. Партия / Поставщик */}
									<td
										className="inventory-col-lot"
										style={{
											padding: "8px 10px",
											verticalAlign: "middle",
											whiteSpace: "nowrap",
										}}
									>
										<div className="flex flex-col items-start gap-0.5 whitespace-nowrap">
											<div
												className="text-xs font-bold font-mono text-[var(--ink)] truncate max-w-[115px]"
												title={item.lotNumber ? `Партия: ${item.lotNumber}` : "Без номера партии"}
											>
												{item.lotNumber ? item.lotNumber : "—"}
											</div>
											<div
												className="text-[11px] text-[var(--muted)] truncate max-w-[115px]"
												title={item.supplier || "Стомторг"}
											>
												{item.supplier || "Стомторг"}
											</div>
										</div>
									</td>

									{/* 7. Действия */}
									<td
										className="inventory-col-actions"
										style={{
											padding: "8px 6px",
											verticalAlign: "middle",
											textAlign: "right",
											whiteSpace: "nowrap",
										}}
									>
										<div className="flex items-center justify-end gap-1 whitespace-nowrap shrink-0">
											<button
												type="button"
												onClick={() => onDeductItem(item)}
												className="h-7 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1 whitespace-nowrap shrink-0 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 border border-rose-500/25"
												title="Списать расход материала"
												data-testid={`btn-item-writeoff-${item.id}`}
											>
												<ArrowUpFromLine size={12} className="shrink-0" />
												<span>Списание</span>
											</button>

											<button
												type="button"
												onClick={() => onReceiveItem(item)}
												className="h-7 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1 whitespace-nowrap shrink-0 bg-[var(--teal-soft)] text-[var(--teal-dark,#0f766e)] hover:bg-[var(--teal-surface)] border border-[var(--teal)]"
												title="Оприходовать материал на склад"
												data-testid={`btn-item-arrival-${item.id}`}
											>
												<ArrowDownToLine size={12} className="shrink-0" />
												<span>Приход</span>
											</button>

											<div className="relative inline-block shrink-0">
												<button
													type="button"
													onClick={() =>
														setActiveMenuRowId((prev) =>
															prev === item.id ? null : item.id,
														)
													}
													className="w-7 h-7 rounded-lg text-xs transition-all cursor-pointer inline-flex items-center justify-center bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--line)]"
													title="Дополнительные операции"
													data-testid={`btn-item-more-${item.id}`}
													aria-expanded={activeMenuRowId === item.id}
												>
													<MoreHorizontal size={14} />
												</button>

												{activeMenuRowId === item.id && (
													<div
														ref={rowMenuRef}
														className="absolute right-0 top-full mt-1 bg-[var(--paper)] border border-[var(--line)] rounded-xl shadow-lg p-1.5 z-40 min-w-[190px] flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-100"
														role="menu"
													>
														<button
															type="button"
															onClick={() => {
																setActiveMenuRowId(null);
																if (item.barcode) {
																	navigator.clipboard?.writeText(item.barcode);
																	showToast(`Штрихкод скопирован: ${item.barcode}`, "info");
																} else {
																	showToast("У позиции нет штрихкода (задайте в редактировании)", "info");
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
																	setActiveMenuRowId(null);
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
																setActiveMenuRowId(null);
																showToast(`Печать этикетки «${item.name}» (штрихкод: ${item.barcode || "б/ш"}) отправлена`, "info");
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
																	setActiveMenuRowId(null);
																	onOpenInventoryAudit();
																}}
																className="w-full px-2.5 py-1.5 rounded-lg text-xs text-left font-medium text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors"
																role="menuitem"
															>
																<ShieldCheck size={13} className="text-emerald-600 shrink-0" />
																<span>Инвентаризация (сверка)</span>
															</button>
														)}
														<button
															type="button"
															onClick={() => {
																setActiveMenuRowId(null);
																onEditItem(item);
															}}
															className="w-full px-2.5 py-1.5 rounded-lg text-xs text-left font-medium text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors"
															role="menuitem"
														>
															<Edit2 size={13} className="text-teal-600 dark:text-teal-400 shrink-0" />
															<span>Редактировать</span>
														</button>
														<div className="h-px bg-[var(--line)] my-0.5" />
														<button
															type="button"
															onClick={() => {
																setActiveMenuRowId(null);
																onDeleteItem(item.id, item.name);
															}}
															className="w-full px-2.5 py-1.5 rounded-lg text-xs text-left font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 cursor-pointer transition-colors"
															role="menuitem"
														>
															<Trash2 size={13} className="shrink-0" />
															<span>Удалить позицию</span>
														</button>
													</div>
												)}
											</div>
										</div>
									</td>
								</tr>
							);
						})
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
		</div>
	);
};

export default WarehouseItemsTable;
