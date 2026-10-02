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
	getFefoTrafficLight,
	getWarehouseFefoTrafficLight,
	type FefoTrafficLightInfo,
} from "./fefoTrafficLight.js";
import type { InventoryItem } from "./inventoryDataMappers.js";

export type ExpiryTrafficStatus = "good" | "warning_soon" | "expired" | "normal" | "unknown";

export interface ExpiryTrafficLightInfo {
	readonly status: ExpiryTrafficStatus;
	readonly color: "emerald" | "amber" | "rose" | "teal" | "neutral";
	readonly daysLeft: number | null;
	readonly labelRu: string;
	readonly badgeTextRu: string;
	readonly isBlocked: boolean;
	readonly className: string;
}

/**
 * Расчет светофора срока годности по Мандатам 8e, 8n, 8v:
 * 1. Зеленый: срок годности > 6 месяцев (> 180 дней).
 * 2. Янтарный (предупреждение): срок годности < 30 дней («Истекает скоро — первоочередной отпуск»).
 * 3. Красный (просрочено): daysLeft <= 0. Блокировка отпуска с 1-клик кнопкой «Акт утилизации по СанПиН 3.3686-21».
 */
export function getExpiryTrafficLight(
	expirationDate: string | null | undefined,
	referenceDate: Date = new Date(),
): ExpiryTrafficLightInfo {
	if (!expirationDate || !expirationDate.trim()) {
		return {
			status: "unknown",
			color: "neutral",
			daysLeft: null,
			labelRu: "Срок не указан",
			badgeTextRu: "Бессрочно / Не указан",
			isBlocked: false,
			className: "text-[var(--muted)] bg-[var(--paper-soft)] border-[var(--line)]",
		};
	}

	const trimmed = expirationDate.trim();
	let isoCandidate: string;
	if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
		isoCandidate = trimmed;
	} else if (/^\d{2}\.\d{2}\.\d{4}$/.test(trimmed)) {
		const [dd, mm, yyyy] = trimmed.split(".");
		isoCandidate = `${yyyy}-${mm}-${dd}`;
	} else {
		isoCandidate = trimmed;
	}

	const expires = new Date(`${isoCandidate}T00:00:00Z`);
	if (Number.isNaN(expires.getTime())) {
		return {
			status: "unknown",
			color: "neutral",
			daysLeft: null,
			labelRu: "Некорректная дата",
			badgeTextRu: "Некорректная дата",
			isBlocked: false,
			className: "text-[var(--muted)] bg-[var(--paper-soft)] border-[var(--line)]",
		};
	}

	const startOfDay = (d: Date) =>
		Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
	const daysLeft = Math.round(
		(startOfDay(expires) - startOfDay(referenceDate)) / (1000 * 60 * 60 * 24),
	);

	const readable = `${String(expires.getUTCDate()).padStart(2, "0")}.${String(expires.getUTCMonth() + 1).padStart(2, "0")}.${expires.getUTCFullYear()}`;

	// Красный: просрочено (daysLeft <= 0)
	if (daysLeft <= 0) {
		const overdueDays = Math.abs(daysLeft);
		return {
			status: "expired",
			color: "rose",
			daysLeft,
			labelRu:
				daysLeft === 0
					? `Истекает сегодня (${readable})`
					: `Просрочено на ${overdueDays} дн. (${readable})`,
			badgeTextRu: "Просрочено — отпуск заблокирован",
			isBlocked: true,
			className: "text-rose-700 dark:text-rose-300 bg-rose-500/15 border-rose-500/40",
		};
	}

	// Янтарный: < 30 дней — первоочередной отпуск FEFO
	if (daysLeft < 30) {
		return {
			status: "warning_soon",
			color: "amber",
			daysLeft,
			labelRu: `Истекает через ${daysLeft} дн. (${readable})`,
			badgeTextRu: "Истекает скоро — первоочередной отпуск",
			isBlocked: false,
			className: "text-amber-700 dark:text-amber-300 bg-amber-500/15 border-amber-500/40",
		};
	}

	// Зеленый: > 6 месяцев (> 180 дней)
	if (daysLeft > 180) {
		return {
			status: "good",
			color: "emerald",
			daysLeft,
			labelRu: `Годен до ${readable}`,
			badgeTextRu: "Срок в норме (> 6 мес)",
			isBlocked: false,
			className: "text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 border-emerald-500/30",
		};
	}

	// Промежуточный нормальный срок (от 1 до 6 месяцев)
	return {
		status: "normal",
		color: "teal",
		daysLeft,
		labelRu: `Годен до ${readable}`,
		badgeTextRu: `Срок в норме (${Math.round(daysLeft / 30)} мес)`,
		isBlocked: false,
		className:
			"text-[var(--teal-dark,#0f766e)] dark:text-teal-300 bg-[var(--teal-surface)] border-[var(--teal-soft)]",
	};
}

export { getWarehouseFefoTrafficLight, getFefoTrafficLight };

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
					? `Списано ${qty} ед. «${item.name}» (зафиксирован мягкий овердрафт по Мандату 8n)`
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
			<table
				className="inventory-view-table"
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
								width: 105,
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
								width: 175,
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
								width: 120,
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
								width: 85,
								textAlign: "right",
							}}
						>
							Мин. запас
						</th>

						{/* 6. Себестоимость */}
						<th
							className="inventory-col-cost"
							style={{
								padding: "8px 18px 8px 8px",
								fontSize: 11,
								color: "var(--muted)",
								fontWeight: 600,
								borderBottom: "1px solid var(--line)",
								textTransform: "uppercase",
								letterSpacing: 0.5,
								whiteSpace: "nowrap",
								width: 135,
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
								padding: "8px 8px",
								fontSize: 11,
								color: "var(--muted)",
								fontWeight: 600,
								borderBottom: "1px solid var(--line)",
								textTransform: "uppercase",
								letterSpacing: 0.5,
								textAlign: "center",
								width: 220,
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
												className="h-8 px-4 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-xs font-bold hover:bg-[var(--teal-surface)] hover:border-[var(--teal)] transition-colors cursor-pointer"
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
									<div className="flex flex-col items-center gap-3 max-w-md mx-auto text-center">
										<Package size={36} className="text-teal-600 dark:text-teal-400" />
										<span className="text-[var(--ink)] font-bold text-base">
											На складе пока нет материалов и партий
										</span>
										<span className="text-[var(--muted)] text-xs leading-relaxed">
											Оформите первую приходную накладную для оприходования медикаментов, анестетиков и расходников по FEFO.
										</span>
										<div className="flex flex-wrap items-center justify-center gap-2 mt-2">
											{onOpenWaybills && (
												<button
													type="button"
													onClick={onOpenWaybills}
													className="h-8 px-3.5 rounded-lg bg-[var(--teal)] text-white text-xs font-bold shadow-xs hover:bg-[var(--teal-dark,#0f766e)] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
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
													className="h-8 px-3 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-xs font-semibold hover:border-[var(--teal)] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
													data-testid="empty-state-add-first-material-btn"
												>
													<Plus size={14} />
													<span>Создать вручную</span>
												</button>
											)}
										</div>
									</div>
								)}
							</td>
						</tr>
					) : (
						filteredItems.map((item) => {
							const stock = Number(item.stockQuantity ?? 0);
							const isLowStock = stock <= (item.criticalThreshold ?? 5);
							const isOverdraft = stock <= 0;
							const unitCostRaw = Number(item.unitCostRub);
							const unitCost = Number.isFinite(unitCostRaw) ? unitCostRaw : null;
							const lineValue =
								unitCost !== null && Number.isFinite(stock) ? stock * unitCost : null;
							const catInfo = getCategoryBadge(item.category);
							const writeQty = pendingQuantities[item.id] || 1;

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
													title={isOverdraft ? "Овердрафт: остаток 0 или ниже" : "Критический остаток"}
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
													title="Мягкий овердрафт: не блокирует прием пациента (Мандат 8n)"
												>
													<ShieldAlert size={10} className="shrink-0" />
													<span>Овердрафт (0-блокировка)</span>
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
											padding: "8px 18px 8px 8px",
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
											padding: "8px 8px",
											verticalAlign: "middle",
											textAlign: "center",
											whiteSpace: "nowrap",
										}}
									>
										<div className="flex items-center justify-center gap-1 whitespace-nowrap shrink-0">
											{expiryTraffic.isBlocked ? (
												/* Красный: блокировка отпуска пациентам + 1-клик Акт утилизации СанПиН 3.3686-21 */
												<button
													type="button"
													onClick={() => setDisposalPromptItem(item)}
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
														onClick={() =>
															handleExecuteDeduct(item, writeQty, isOverdraft)
														}
														className={`h-7 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 whitespace-nowrap shrink-0 ${
															isOverdraft
																? "bg-amber-600 hover:bg-amber-500 text-white shadow-xs"
																: expiryTraffic.status === "warning_soon"
																? "bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 border border-rose-500/25 ring-1 ring-amber-400"
																: "bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 border border-rose-500/25"
														}`}
														title={
															isOverdraft
																? "Списать в мягкий овердрафт: клинический процесс не блокируется (Мандат 8n)"
																: "Списать расход материала по FEFO"
														}
														data-testid={`btn-item-writeoff-${item.id}`}
													>
														<span className="hidden" data-testid={`btn-deduct-fefo-${item.id}`}>
															{isOverdraft ? "Списать (Овердрафт)" : "Списать"}
														</span>
														{isOverdraft ? (
															<>
																<ShieldAlert size={12} className="shrink-0" />
																<span>Списать (Овердрафт)</span>
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
														onClick={() => handleExecuteReceive(item, writeQty)}
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
													onClick={() =>
														setActiveMenuRowId((prev) =>
															prev === item.id ? null : item.id,
														)
													}
													className="w-6 h-7 rounded-lg text-xs transition-all cursor-pointer inline-flex items-center justify-center bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--line)]"
													title="Дополнительные операции"
													data-testid={`btn-item-more-${item.id}`}
													aria-expanded={activeMenuRowId === item.id}
												>
													<MoreHorizontal size={13} />
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
														{onEditItem && (
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
														)}
														{onDeleteItem && (
															<>
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
															</>
														)}
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

			{/* Модалка утверждения акта утилизации СанПиН 3.3686-21 */}
			{disposalPromptItem && (
				<div
					className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4"
					role="dialog"
					aria-modal="true"
					aria-labelledby="disposal-act-title"
				>
					<div className="bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] rounded-xl w-full max-w-lg p-5 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
						<div className="flex items-start gap-3">
							<div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
								<Trash2 size={20} />
							</div>
							<div className="min-w-0 flex-1">
								<h3
									id="disposal-act-title"
									className="text-base font-black leading-tight text-rose-700 dark:text-rose-300"
								>
									Акт утилизации по СанПиН 3.3686-21
								</h3>
								<p className="text-xs text-[var(--muted)] mt-0.5">
									Оформление акта списания просроченных медицинских изделий и препаратов (Класс Б / Класс Г).
								</p>
							</div>
						</div>

						<div className="p-3.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] text-xs space-y-1.5">
							<div>
								<span className="text-[var(--muted)]">Материал:</span>{" "}
								<strong className="text-[var(--ink)] font-bold">{disposalPromptItem.name}</strong>
							</div>
							{disposalPromptItem.lotNumber && (
								<div>
									<span className="text-[var(--muted)]">Партия/Серия:</span>{" "}
									<span className="font-mono font-semibold">{disposalPromptItem.lotNumber}</span>
								</div>
							)}
							<div>
								<span className="text-[var(--muted)]">Истекший срок годности:</span>{" "}
								<span className="text-rose-600 dark:text-rose-400 font-bold">
									{disposalPromptItem.expirationDate || "Просрочено"}
								</span>
							</div>
							<div>
								<span className="text-[var(--muted)]">Количество к утилизации:</span>{" "}
								<span className="font-bold">
									{pendingQuantities[disposalPromptItem.id] || 1}{" "}
									{disposalPromptItem.unit || "шт."}
								</span>
							</div>
							<div className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-500/10 p-2 rounded border border-amber-500/20 mt-2">
								Медицинский отпуск пациентам заблокирован. Материал передается на уничтожение специализированной организации по договору утилизации медотходов.
							</div>
						</div>

						<div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--line)]">
							<button
								type="button"
								onClick={() => setDisposalPromptItem(null)}
								className="h-9 px-4 rounded-lg border border-[var(--line)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer"
							>
								Отмена
							</button>
							<button
								type="button"
								onClick={() => handleExecuteDisposalAct(disposalPromptItem)}
								className="h-9 px-4 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer active:scale-98"
								data-testid="confirm-sanpin-disposal-act-btn"
							>
								<FileText size={14} />
								<span>Утвердить акт утилизации</span>
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export const WarehouseItemsTable = InventoryStockTable;
export default InventoryStockTable;
