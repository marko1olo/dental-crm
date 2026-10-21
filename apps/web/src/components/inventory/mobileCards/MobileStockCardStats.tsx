import { AlertTriangle } from "lucide-react";
import React from "react";
import { money } from "../../../AppHelpers.js";
import type { InventoryItem } from "../inventoryDataMappers.js";
import {
	formatExpDate,
	type ExpiryTrafficLightInfo,
	type FefoTrafficLightInfo,
} from "../inventoryExpiryUtils.js";

export interface MobileStockCardStatsProps {
	readonly item: InventoryItem;
	readonly stock: number;
	readonly isLowStock: boolean;
	readonly isOverdraft: boolean;
	readonly unitCost: number | null;
	readonly expiryTraffic: ExpiryTrafficLightInfo;
	readonly fefoInfo: FefoTrafficLightInfo | null;
}

export const MobileStockCardStats: React.FC<MobileStockCardStatsProps> = ({
	item,
	stock,
	isLowStock,
	isOverdraft,
	unitCost,
	expiryTraffic,
	fefoInfo,
}) => {
	return (
		<div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line-subtle)] items-center">
			<div>
				<span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] block">
					Остаток на складе
				</span>
				<div className="flex items-baseline gap-1 mt-0.5">
					<span
						className={`text-2xl font-black font-mono tracking-tight ${
							isOverdraft ? "text-amber-600 dark:text-amber-400" : isLowStock ? "text-rose-600 dark:text-rose-400" : "text-[var(--ink)]"
						}`}
					>
						{stock}
					</span>
					<span className="text-xs text-[var(--muted)] font-medium">
						{item.unit || "шт."}
					</span>
				</div>
				<div className="mt-0.5">
					{stock < 0 ? (
						<span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 dark:text-amber-200 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30">
							<AlertTriangle size={11} className="text-amber-600 dark:text-amber-400 shrink-0" />
							<span>⚠️ Требуется закупка / отрицательный остаток: {stock} {item.unit || "шт."}</span>
						</span>
					) : isOverdraft ? (
						<span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 dark:text-amber-200 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30">
							<AlertTriangle size={11} className="text-amber-600 dark:text-amber-400 shrink-0" />
							<span>⚠️ Требуется закупка / нулевой остаток</span>
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
							<span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${expiryTraffic.className}`}>
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
	);
};

export default MobileStockCardStats;
