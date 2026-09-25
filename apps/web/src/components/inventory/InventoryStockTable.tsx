import {
	AlertTriangle,
	ArrowDownToLine,
	ArrowUpFromLine,
	CheckCircle2,
	Clock,
	FileText,
	Minus,
	Package,
	Plus,
	Search,
	ShieldAlert,
	Trash2,
	Zap,
} from "lucide-react";
import React, { useCallback, useMemo, useState } from "react";
import { showToast } from "../GlobalToast.js";
import type { InventoryItem } from "./useInventoryLogic.js";

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
 * Расчет светофора срока годности по Мандатам 8e, 8v:
 * 1. Зеленый: срок годности > 6 месяцев (> 180 дней).
 * 2. Янтарный (предупреждение): срок годности < 30 дней («Истекает скоро — первоочередной отпуск»).
 * 3. Красный (просрочено): daysLeft <= 0. Блокировка обычного отпуска с 1-клик кнопкой «Акт утилизации по СанПиН 3.3686-21».
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
			labelRu: daysLeft === 0 ? `Истекает сегодня (${readable})` : `Просрочено на ${overdueDays} дн. (${readable})`,
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
		className: "text-[var(--teal-dark,#0f766e)] dark:text-teal-300 bg-[var(--teal-surface)] border-[var(--teal-soft)]",
	};
}

export interface InventoryStockTableProps {
	readonly items: readonly InventoryItem[];
	readonly onDeductItem?: (item: InventoryItem, quantity: number) => void | Promise<void>;
	readonly onReceiveItem?: (item: InventoryItem, quantity: number) => void | Promise<void>;
	readonly onCreateDisposalAct?: (item: InventoryItem) => void | Promise<void>;
	readonly onSelectItem?: (item: InventoryItem) => void;
	readonly isLoading?: boolean;
	readonly className?: string;
}

export const InventoryStockTable: React.FC<InventoryStockTableProps> = ({
	items,
	onDeductItem,
	onReceiveItem,
	onCreateDisposalAct,
	onSelectItem,
	isLoading = false,
	className = "",
}) => {
	const [searchQuery, setSearchQuery] = useState("");
	const [trafficFilter, setTrafficFilter] = useState<"all" | "expired" | "soon" | "good" | "overdraft">("all");
	const [disposalPromptItem, setDisposalPromptItem] = useState<InventoryItem | null>(null);
	const [pendingQuantities, setPendingQuantities] = useState<Record<string, number>>({});

	const handleStepQuantity = useCallback((itemId: string, delta: number) => {
		setPendingQuantities((prev) => {
			const current = prev[itemId] || 1;
			const nextVal = Math.max(1, current + delta);
			return { ...prev, [itemId]: nextVal };
		});
	}, []);

	// Обогащение элементов светофором и овердрафтом
	const enrichedItems = useMemo(() => {
		const now = new Date();
		return items.map((item) => {
			const traffic = getExpiryTrafficLight(item.expirationDate, now);
			const stock = Number(item.stockQuantity ?? 0);
			const isOverdraft = stock <= 0;
			return {
				...item,
				stockQuantityNum: stock,
				traffic,
				isOverdraft,
			};
		});
	}, [items]);

	// Фильтрация
	const filteredItems = useMemo(() => {
		return enrichedItems.filter((item) => {
			const matchesSearch =
				item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				(item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
				(item.lotNumber && item.lotNumber.toLowerCase().includes(searchQuery.toLowerCase()));

			if (!matchesSearch) return false;

			if (trafficFilter === "expired") return item.traffic.status === "expired";
			if (trafficFilter === "soon") return item.traffic.status === "warning_soon";
			if (trafficFilter === "good") return item.traffic.status === "good";
			if (trafficFilter === "overdraft") return item.isOverdraft;
			return true;
		});
	}, [enrichedItems, searchQuery, trafficFilter]);

	// Счетчики для табов
	const trafficCounts = useMemo(() => {
		let expired = 0;
		let soon = 0;
		let good = 0;
		let overdraft = 0;
		for (const it of enrichedItems) {
			if (it.traffic.status === "expired") expired++;
			if (it.traffic.status === "warning_soon") soon++;
			if (it.traffic.status === "good") good++;
			if (it.isOverdraft) overdraft++;
		}
		return { total: enrichedItems.length, expired, soon, good, overdraft };
	}, [enrichedItems]);

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

	return (
		<div
			className={`inventory-stock-table-container flex flex-col w-full bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] rounded-xl overflow-hidden shadow-xs ${className}`.trim()}
			data-testid="inventory-stock-table"
			role="region"
			aria-label="Складской учет материалов и контроль сроков годности FEFO"
		>
			{/* ── 1-Row Compact Desktop Toolbar (Mandates 8c, 8d: 32-36px) ── */}
			<div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-[var(--paper-soft)] border-b border-[var(--line)] min-h-[36px] text-xs">
				<div className="flex items-center gap-2 flex-1 min-w-[220px] max-w-sm">
					<div className="relative w-full">
						<Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Поиск материала, партии или SKU..."
							className="w-full h-8 pl-8 pr-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] placeholder:text-[var(--muted)] text-xs focus:outline-none focus:ring-1 focus:ring-[var(--teal)] transition-all"
							data-testid="inventory-stock-search"
						/>
					</div>
				</div>

				{/* Traffic Light Filter Chips */}
				<div className="flex items-center gap-1 flex-wrap" role="group" aria-label="Фильтр светофора сроков годности">
					<button
						type="button"
						onClick={() => setTrafficFilter("all")}
						className={`h-7 px-2.5 rounded-md font-bold text-xs transition-colors cursor-pointer ${
							trafficFilter === "all"
								? "bg-[var(--teal)] text-white"
								: "bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--line)]"
						}`}
						data-testid="filter-traffic-all"
					>
						Все ({trafficCounts.total})
					</button>

					<button
						type="button"
						onClick={() => setTrafficFilter("expired")}
						className={`h-7 px-2.5 rounded-md font-bold text-xs transition-colors cursor-pointer inline-flex items-center gap-1 ${
							trafficFilter === "expired"
								? "bg-rose-600 text-white"
								: "bg-rose-500/10 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20 border border-rose-500/30"
						}`}
						title="Просроченные материалы: отпуск заблокирован по СанПиН"
						data-testid="filter-traffic-expired"
					>
						<span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
						<span>Просрочено ({trafficCounts.expired})</span>
					</button>

					<button
						type="button"
						onClick={() => setTrafficFilter("soon")}
						className={`h-7 px-2.5 rounded-md font-bold text-xs transition-colors cursor-pointer inline-flex items-center gap-1 ${
							trafficFilter === "soon"
								? "bg-amber-600 text-white"
								: "bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 border border-amber-500/30"
						}`}
						title="Истекающие <30 дней: первоочередной отпуск по FEFO"
						data-testid="filter-traffic-soon"
					>
						<span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
						<span>&lt; 30 дней ({trafficCounts.soon})</span>
					</button>

					<button
						type="button"
						onClick={() => setTrafficFilter("good")}
						className={`h-7 px-2.5 rounded-md font-bold text-xs transition-colors cursor-pointer inline-flex items-center gap-1 ${
							trafficFilter === "good"
								? "bg-emerald-600 text-white"
								: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/30"
						}`}
						title="Срок годности в норме (>6 месяцев)"
						data-testid="filter-traffic-good"
					>
						<span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
						<span>&gt; 6 мес ({trafficCounts.good})</span>
					</button>

					{trafficCounts.overdraft > 0 && (
						<button
							type="button"
							onClick={() => setTrafficFilter("overdraft")}
							className={`h-7 px-2.5 rounded-md font-bold text-xs transition-colors cursor-pointer inline-flex items-center gap-1 ${
								trafficFilter === "overdraft"
									? "bg-amber-600 text-white"
									: "bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/40"
							}`}
							title="Позиции с нулевым или отрицательным остатком (мягкий овердрафт)"
							data-testid="filter-traffic-overdraft"
						>
							<ShieldAlert size={12} className="text-amber-600 dark:text-amber-400" />
							<span>Овердрафт ({trafficCounts.overdraft})</span>
						</button>
					)}
				</div>
			</div>

			{/* ── Table Surface ── */}
			<div className="overflow-x-auto w-full">
				<table className="w-full text-left text-xs border-collapse" role="table">
					<thead className="bg-[var(--paper-soft)] text-[var(--muted)] border-b border-[var(--line)] font-semibold select-none">
						<tr>
							<th className="py-2.5 px-3">Материал / Партия</th>
							<th className="py-2.5 px-3">Светофор FEFO</th>
							<th className="py-2.5 px-3 text-right">Остаток на складе</th>
							<th className="py-2.5 px-3 text-center">Кол-во</th>
							<th className="py-2.5 px-3 text-right">Цена / ед.</th>
							<th className="py-2.5 px-3 text-right min-w-[200px]">Действие (Мандаты 8e, 8n)</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-[var(--line)]">
						{isLoading ? (
							<tr>
								<td colSpan={6} className="py-8 text-center text-[var(--muted)]">
									Загрузка складских позиций...
								</td>
							</tr>
						) : filteredItems.length === 0 ? (
							<tr>
								<td colSpan={6} className="py-8 text-center text-[var(--muted)]">
									<Package size={24} className="mx-auto mb-2 opacity-40" />
									<span>Позиции не найдены</span>
								</td>
							</tr>
						) : (
							filteredItems.map((item) => {
								const writeQty = pendingQuantities[item.id] || 1;
								const { traffic, isOverdraft } = item;

								return (
									<tr
										key={item.id}
										className={`hover:bg-[var(--paper-soft)] transition-colors ${
											traffic.isBlocked ? "bg-rose-500/5 dark:bg-rose-950/10" : ""
										}`}
										data-testid={`stock-row-${item.id}`}
									>
										{/* 1. Name & Lot */}
										<td className="py-2 px-3 min-w-[180px] max-w-xs">
											<div
												className="font-bold text-[var(--ink)] truncate cursor-pointer hover:text-[var(--teal)]"
												onClick={() => onSelectItem?.(item)}
												title={item.name}
											>
												{item.name}
											</div>
											<div className="text-[11px] text-[var(--muted)] font-mono flex items-center gap-1.5 flex-wrap">
												{item.sku && <span>SKU: {item.sku}</span>}
												{item.lotNumber && (
													<span className="font-semibold text-[var(--ink)]">
														Партия: {item.lotNumber}
													</span>
												)}
											</div>
										</td>

										{/* 2. Expiry Traffic Light */}
										<td className="py-2 px-3 whitespace-nowrap">
											<div className="flex flex-col items-start gap-0.5">
												<span
													className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${traffic.className}`}
													data-testid={`traffic-light-badge-${item.id}`}
													title={traffic.labelRu}
												>
													{traffic.status === "expired" ? (
														<AlertTriangle size={12} className="text-rose-600 dark:text-rose-400 shrink-0" />
													) : traffic.status === "warning_soon" ? (
														<Clock size={12} className="text-amber-600 dark:text-amber-400 shrink-0" />
													) : (
														<CheckCircle2 size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
													)}
													<span>{traffic.badgeTextRu}</span>
												</span>
												<span className="text-[10px] text-[var(--muted)] font-medium">
													{traffic.labelRu}
												</span>
											</div>
										</td>

										{/* 3. Stock & Overdraft */}
										<td className="py-2 px-3 text-right whitespace-nowrap">
											<div className="font-mono font-bold">
												<span
													className={
														isOverdraft
															? "text-amber-600 dark:text-amber-400"
															: item.stockQuantityNum <= (item.criticalThreshold || 5)
															? "text-orange-600 dark:text-orange-400"
															: "text-[var(--ink)]"
													}
												>
													{item.stockQuantityNum} {item.unit || "шт."}
												</span>
											</div>
											{isOverdraft && (
												<div
													className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30 mt-0.5"
													data-testid={`soft-overdraft-badge-${item.id}`}
													title="Остаток 0: списание разрешено в мягкий овердрафт без блокировки врача (Мандат 8n)"
												>
													<ShieldAlert size={10} />
													<span>Мягкий овердрафт</span>
												</div>
											)}
										</td>

										{/* 4. Stepper Quantity */}
										<td className="py-2 px-3 text-center whitespace-nowrap">
											<div className="inline-flex items-center rounded-lg border border-[var(--line)] bg-[var(--paper)] shadow-2xs">
												<button
													type="button"
													disabled={false}
													onClick={() => handleStepQuantity(item.id, -1)}
													className="w-7 h-7 flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
													aria-label={`Уменьшить количество ${item.name}`}
												>
													<Minus size={12} />
												</button>
												<span className="w-8 text-center font-mono font-bold text-xs">
													{writeQty}
												</span>
												<button
													type="button"
													disabled={false}
													onClick={() => handleStepQuantity(item.id, 1)}
													className="w-7 h-7 flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
													aria-label={`Увеличить количество ${item.name}`}
												>
													<Plus size={12} />
												</button>
											</div>
										</td>

										{/* 5. Unit Price */}
										<td className="py-2 px-3 text-right whitespace-nowrap font-mono text-xs">
											{item.unitCostRub ? `${Number(item.unitCostRub).toFixed(2)} ₽` : "—"}
										</td>

										{/* 6. Action Button (Blocked vs Normal vs Disposal Act) */}
										<td className="py-2 px-3 text-right whitespace-nowrap">
											{traffic.isBlocked ? (
												/* Красный: блокировка обычного списания + 1-клик кнопка утилизации по СанПиН */
												<button
													type="button"
													onClick={() => setDisposalPromptItem(item)}
													className="h-8 px-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs active:scale-98"
													title="Срок годности истек: сформировать Акт утилизации по СанПиН 3.3686-21"
													data-testid={`btn-sanpin-disposal-act-${item.id}`}
												>
													<Trash2 size={13} />
													<span>Акт утилизации СанПиН 3.3686-21</span>
												</button>
											) : (
												/* Разрешено: списание в 1 клик по FEFO (с мягким овердрафтом если остаток 0) */
												<button
													type="button"
													onClick={() => handleExecuteDeduct(item, writeQty, isOverdraft)}
													className={`h-8 px-3 rounded-lg font-bold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-98 ${
														isOverdraft
															? "bg-amber-600 hover:bg-amber-500 text-white"
															: traffic.status === "warning_soon"
															? "bg-[var(--teal)] hover:bg-[var(--teal-dark,#0f766e)] text-white ring-1 ring-amber-400"
															: "bg-[var(--teal)] hover:bg-[var(--teal-dark,#0f766e)] text-white"
													}`}
													title={
														isOverdraft
															? "Списать в мягкий овердрафт: клинический процесс не блокируется (Мандат 8n)"
															: traffic.status === "warning_soon"
															? "Первоочередное списание по FEFO (истекает скоро)"
															: "Списать со склада по FEFO"
													}
													data-testid={`btn-deduct-fefo-${item.id}`}
												>
													{isOverdraft ? (
														<>
															<ShieldAlert size={13} />
															<span>Списать (Овердрафт)</span>
														</>
													) : traffic.status === "warning_soon" ? (
														<>
															<Zap size={13} className="text-amber-300" />
															<span>Списать (FEFO!)</span>
														</>
													) : (
														<>
															<ArrowUpFromLine size={13} />
															<span>Списать</span>
														</>
													)}
												</button>
											)}
										</td>
									</tr>
								);
							})
						)}
					</tbody>
				</table>
			</div>

			{/* ── Modal / Prompt: 1-Click Disposal Act Confirmation per SanPiN 3.3686-21 ── */}
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
								<h3 id="disposal-act-title" className="text-base font-black leading-tight text-rose-700 dark:text-rose-300">
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
								<span className="font-bold">{pendingQuantities[disposalPromptItem.id] || 1} {disposalPromptItem.unit || "шт."}</span>
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

export default InventoryStockTable;
