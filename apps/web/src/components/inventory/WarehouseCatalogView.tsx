import { Minus, PackageCheck, Plus, Search, Zap } from "lucide-react";
import React from "react";
import { useMemo, useState } from "react";
import {
	formatCategoryRu,
	WAREHOUSE_CATALOG_CATEGORIES,
	type WarehouseCatalogCategory,
	type WarehouseCatalogCategoryTab,
} from "./catalog/warehouseCatalogTypes.js";
import type { InventoryItem } from "./useInventoryLogic.js";

export type { WarehouseCatalogCategory, WarehouseCatalogCategoryTab };
export { formatCategoryRu, WAREHOUSE_CATALOG_CATEGORIES };

export interface WarehouseCatalogViewProps {
	readonly organizationId: string;
	readonly items: readonly InventoryItem[];
	readonly isLoading?: boolean | undefined;
	readonly onRefresh?: (() => void) | undefined;
	readonly onSelectItem?: ((item: InventoryItem) => void) | undefined;
	readonly onDeductItem?:
		| ((item: InventoryItem, qty?: number) => void)
		| undefined;
	readonly onReceiveItem?:
		| ((item: InventoryItem, qty?: number) => void)
		| undefined;
	readonly onOpenBatches?: ((item?: InventoryItem) => void) | undefined;
	readonly onOpenReceiptModal?: (() => void) | undefined;
	readonly onOpenAuditModal?: (() => void) | undefined;
	readonly onOpenProtocolDeduction?: (() => void) | undefined;
}

function formatFefoDateRu(exp?: string | null): { text: string; badgeClass: string } {
	if (!exp || !exp.trim()) {
		return { text: "—", badgeClass: "text-[var(--muted)]" };
	}
	const trimmed = exp.trim();
	let expires: Date;
	if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
		expires = new Date(`${trimmed}T00:00:00Z`);
	} else if (/^\d{2}\.\d{2}\.\d{4}$/.test(trimmed)) {
		const [d, m, y] = trimmed.split(".");
		expires = new Date(`${y}-${m}-${d}T00:00:00Z`);
	} else {
		expires = new Date(trimmed);
	}
	if (Number.isNaN(expires.getTime())) {
		return { text: trimmed, badgeClass: "text-[var(--muted)]" };
	}
	const now = new Date();
	const diffDays = Math.round((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
	const dateText = `${String(expires.getUTCDate()).padStart(2, "0")}.${String(expires.getUTCMonth() + 1).padStart(2, "0")}.${expires.getUTCFullYear()}`;

	if (diffDays <= 0) {
		return {
			text: `${dateText} (просрочен)`,
			badgeClass: "text-rose-600 dark:text-rose-400 font-medium bg-rose-500/10 border border-rose-500/25 px-1.5 py-0.5 rounded-md text-[11px]",
		};
	}
	if (diffDays < 30) {
		return {
			text: `${dateText} (${diffDays} дн.)`,
			badgeClass: "text-amber-600 dark:text-amber-400 font-medium bg-amber-500/10 border border-amber-500/25 px-1.5 py-0.5 rounded-md text-[11px]",
		};
	}
	return {
		text: dateText,
		badgeClass: "text-[var(--muted)] text-xs",
	};
}

function formatCostRu(cost?: string | number | null): string {
	if (cost === null || cost === undefined || cost === "") return "0,00 ₽";
	const num = typeof cost === "number" ? cost : parseFloat(String(cost).replace(",", "."));
	if (!Number.isFinite(num)) return "0,00 ₽";
	return `${num.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽`;
}

export const WarehouseCatalogView: React.FC<WarehouseCatalogViewProps> = ({
	items,
	onSelectItem,
	onDeductItem,
	onReceiveItem,
	onOpenReceiptModal,
	onOpenProtocolDeduction,
}) => {
	const [searchQuery, setSearchQuery] = useState("");

	const filtered = useMemo(() => {
		if (!searchQuery.trim()) return items.slice();
		const q = searchQuery.toLowerCase().trim();
		return items.filter(
			(i) =>
				i.name.toLowerCase().includes(q) ||
				Boolean(i.sku?.toLowerCase().includes(q)),
		);
	}, [items, searchQuery]);

	return (
		<div
			className="warehouse-catalog-view flex flex-col gap-2 p-2 w-full overflow-x-clip"
			data-testid="warehouse-catalog-view"
		>
			{/* Apple HIG Toolbar: 1 строка, 1 Primary CTA кнопка, вторичные действия нейтральные */}
			<div className="h-auto sm:h-9 min-h-[36px] px-3 py-1.5 sm:py-0 bg-[var(--paper)] border border-[var(--line)] rounded-xl flex flex-wrap items-center justify-between gap-2 shrink-0">
				<div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-xs">
					<Search size={14} className="text-[var(--muted)] shrink-0" />
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Поиск по каталогу..."
						className="w-full text-xs bg-transparent border-none outline-none text-[var(--ink)] placeholder:text-[var(--muted)]"
					/>
				</div>
				<div className="flex items-center flex-wrap gap-2 text-xs">
					<span className="text-[var(--muted)] hidden sm:inline">Позиций в клинике:</span>
					<strong className="text-[var(--ink)] mr-1">{items.length}</strong>

					{/* Вторичное действие: Оприходовать */}
					<button
						type="button"
						onClick={() => {
							if (onOpenReceiptModal) {
								onOpenReceiptModal();
							} else if (typeof window !== "undefined") {
								window.dispatchEvent(new CustomEvent("dente:open-warehouse-inbound"));
							}
						}}
						className="btn-open-receipt-modal h-8 sm:h-7 px-2.5 rounded-lg border border-[var(--line)] hover:bg-[var(--paper-soft)] text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors text-[var(--ink)]"
						data-testid="btn-open-receipt-modal"
					>
						<Plus size={13} className="text-[var(--muted)]" />
						<span>Оприходовать</span>
					</button>

					{/* Ровно 1 Primary CTA кнопка: Списать расходники за смену */}
					<button
						type="button"
						onClick={() => {
							if (onOpenProtocolDeduction) {
								onOpenProtocolDeduction();
							} else if (onDeductItem && filtered.length > 0) {
								onDeductItem(filtered[0]);
							} else if (typeof window !== "undefined") {
								window.dispatchEvent(new CustomEvent("dente:open-warehouse-deduction"));
							}
						}}
						className="btn-open-protocol-deduction h-8 sm:h-7 px-3 rounded-lg bg-[var(--primary)] text-white hover:opacity-90 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-xs transition-opacity"
						data-testid="btn-open-protocol-deduction"
					>
						<PackageCheck size={13} />
						<span>Списать расходники за смену</span>
					</button>
				</div>
			</div>

			{/* Десктопная калиброванная таблица из 7 колонок */}
			<div className="hidden sm:block border border-[var(--line)] rounded-xl overflow-hidden bg-[var(--paper)]">
				<table style={{ tableLayout: "fixed", width: "100%" }} className="w-full text-left text-xs border-collapse">
					<thead className="bg-[var(--paper-soft)] border-b border-[var(--line)] font-semibold text-[var(--muted)]">
						<tr>
							<th className="py-2.5 px-3">Наименование</th>
							<th style={{ width: "140px" }} className="py-2.5 px-3">Категория</th>
							<th style={{ width: "100px" }} className="py-2.5 px-3">Артикул</th>
							<th style={{ width: "120px" }} className="py-2.5 px-3 text-right">Остаток</th>
							<th style={{ width: "140px" }} className="py-2.5 px-3 text-center">Срок годности FEFO</th>
							<th style={{ width: "110px" }} className="py-2.5 px-3 text-right">Себестоимость</th>
							<th style={{ width: "100px" }} className="py-2.5 px-3 text-center">Действия</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-[var(--line-subtle)]">
						{filtered.map((it) => {
							const fefo = formatFefoDateRu(it.expirationDate);
							return (
								<tr
									key={it.id}
									className="hover:bg-[var(--paper-soft)] cursor-pointer transition-colors"
									onClick={() => onSelectItem?.(it)}
								>
									<td className="py-2.5 px-3 font-medium text-[var(--ink)]">
										<div className="truncate leading-tight">{it.name}</div>
										{it.lotNumber && (
											<span className="text-[10px] text-[var(--muted)] block">
												Партия: {it.lotNumber}
											</span>
										)}
									</td>
									<td className="py-2.5 px-3 text-[var(--muted)] truncate">
										{formatCategoryRu(it.category)}
									</td>
									<td className="py-2.5 px-3 font-mono text-[11px] text-[var(--muted)] truncate">
										{it.sku || "—"}
									</td>
									<td className="py-2.5 px-3 text-right">
										{it.stockQuantity < 0 ? (
											<div>
												<span className="font-mono font-bold text-amber-600 dark:text-amber-400">
													{it.stockQuantity} {it.unit || "шт."}
												</span>
												<span className="block text-[10px] text-amber-600/80 dark:text-amber-400/80">
													овердрафт
												</span>
											</div>
										) : (
											<span className="font-mono font-bold text-[var(--ink)]">
												{it.stockQuantity} {it.unit || "шт."}
											</span>
										)}
									</td>
									<td className="py-2.5 px-3 text-center">
										<span className={fefo.badgeClass}>{fefo.text}</span>
									</td>
									<td className="py-2.5 px-3 text-right font-mono text-[var(--ink)]">
										{formatCostRu(it.unitCostRub)}
									</td>
									<td className="py-2.5 px-3 text-center">
										<button
											type="button"
											onClick={(e) => {
												e.stopPropagation();
												onDeductItem?.(it);
											}}
											className="h-7 px-2.5 rounded-lg border border-[var(--line)] hover:bg-[var(--paper-soft)] text-xs font-medium inline-flex items-center gap-1 cursor-pointer transition-colors text-[var(--ink)]"
											title={`Списать ${it.name}`}
										>
											<Minus size={12} className="text-amber-500" />
											<span>Списать</span>
										</button>
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>

			{/* Мобильные Grouped List карточки (Apple HIG Mandate 8ze, min-h-[52px], touch target >= 44x44px) */}
			<div className="sm:hidden flex flex-col gap-2">
				{filtered.map((it) => {
					const fefo = formatFefoDateRu(it.expirationDate);
					return (
						<div
							key={it.id}
							onClick={() => onSelectItem?.(it)}
							className="p-3.5 min-h-[52px] rounded-xl border border-[var(--line)] bg-[var(--paper)] flex flex-col gap-2 hover:bg-[var(--paper-soft)] cursor-pointer transition-colors shadow-2xs"
						>
							<div className="flex items-start justify-between gap-2">
								<div className="min-w-0 flex-1">
									<span className="font-semibold text-xs text-[var(--ink)] block leading-tight truncate">
										{it.name}
									</span>
									<span className="text-[11px] text-[var(--muted)]">
										{formatCategoryRu(it.category)} {it.sku ? `• Арт. ${it.sku}` : ""}
									</span>
								</div>
								<div className="text-right shrink-0">
									{it.stockQuantity < 0 ? (
										<div>
											<span className="font-mono font-bold text-xs text-amber-600 dark:text-amber-400 block">
												{it.stockQuantity} {it.unit || "шт."}
											</span>
											<span className="text-[10px] text-amber-600/80 dark:text-amber-400/80">овердрафт</span>
										</div>
									) : (
										<span className="font-mono font-bold text-xs text-[var(--ink)]">
											{it.stockQuantity} {it.unit || "шт."}
										</span>
									)}
								</div>
							</div>

							<div className="flex items-center justify-between pt-1.5 border-t border-[var(--line-subtle)] gap-2 text-xs">
								<div className="flex items-center gap-1.5">
									<span className="text-[11px] text-[var(--muted)]">Годен:</span>
									<span className={fefo.badgeClass}>{fefo.text}</span>
								</div>
								<div className="flex items-center gap-2">
									<span className="font-mono text-xs text-[var(--ink)] font-medium">
										{formatCostRu(it.unitCostRub)}
									</span>
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											onDeductItem?.(it);
										}}
										className="h-11 min-h-[44px] min-w-[44px] px-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-xs font-semibold inline-flex items-center justify-center gap-1 cursor-pointer transition-colors text-[var(--ink)]"
										aria-label={`Списать ${it.name}`}
									>
										<Minus size={14} className="text-amber-500" />
										<span>Списать</span>
									</button>
								</div>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};

export default WarehouseCatalogView;
