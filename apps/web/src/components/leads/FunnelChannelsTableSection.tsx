/**
 * DENTE Dental CRM — Funnel Channels Table Section Component
 * Mandate 8b (<= 120 lines)
 */

import React from "react";
import { ChevronDown, ChevronUp, Globe } from "lucide-react";
import { FunnelChannelsTableExpanded } from "./FunnelChannelsTableExpanded";
import type {
	ChannelFunnelMetric,
	MarketingMetricsSummary,
} from "./leadsFunnelTypes";

export interface FunnelChannelsTableSectionProps {
	readonly channels: readonly ChannelFunnelMetric[];
	readonly summary: MarketingMetricsSummary;
	readonly isOpen: boolean;
	readonly onToggle: () => void;
}

export const FunnelChannelsTableSection: React.FC<
	FunnelChannelsTableSectionProps
> = ({ channels, summary, isOpen, onToggle }) => {
	return (
		<div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 14, padding: "20px" }}>
			<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
				<div>
					<h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--ink)", display: "flex", alignItems: "center", gap: 6 }}>
						<Globe size={18} color="var(--brand-500)" />
						Эффективность Рекламных Каналов
					</h3>
					<p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--muted)" }}>
						Сравнение CPL, CAC, среднего чека и окупаемости инвестиций (ROMI)
					</p>
				</div>
				<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
					<div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", background: "var(--paper-soft)", padding: "4px 10px", borderRadius: 8, border: "1px solid var(--line)" }}>
						Каналов: {channels.length}
					</div>
					<button
						type="button"
						onClick={onToggle}
						style={{
							height: 32, padding: "0 10px", borderRadius: 8, fontSize: 12, fontWeight: 600,
							border: "1px solid var(--line)", background: isOpen ? "rgba(15, 118, 110, 0.15)" : "var(--paper-soft)",
							color: isOpen ? "var(--teal)" : "var(--ink)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
						}}
						aria-expanded={isOpen}
						data-testid="toggle-channels-table-btn"
					>
						{isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
						{isOpen ? "Скрыть таблицу" : "Показать аналитику по каналам"}
					</button>
				</div>
			</div>

			{!isOpen && (
				<div
					style={{
						display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12,
						padding: "10px 14px", background: "var(--paper-soft)", borderRadius: 10, border: "1px solid var(--line)", flexWrap: "wrap", gap: 8,
					}}
					data-testid="channels-compact-strip"
				>
					<span style={{ color: "var(--muted)" }}>
						Рекламных каналов: <strong style={{ color: "var(--ink)" }}>{channels.length}</strong> • Бюджет: <strong style={{ color: "var(--ink)" }}>{summary.totalMarketingSpendRub.toLocaleString("ru-RU")} ₽</strong> • CPL: <strong style={{ color: "var(--teal)" }}>{summary.cplRub.toLocaleString("ru-RU")} ₽</strong> • CAC: <strong style={{ color: "var(--accent)" }}>{summary.cacRub.toLocaleString("ru-RU")} ₽</strong> • Выручка: <strong style={{ color: "var(--ok-fg)" }}>{summary.totalRevenueRub.toLocaleString("ru-RU")} ₽</strong>
					</span>
					<button
						type="button"
						onClick={onToggle}
						style={{ background: "none", border: "none", color: "var(--teal)", fontWeight: 600, cursor: "pointer", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }}
					>
						<span>Развернуть таблицу каналов</span>
						<ChevronDown size={13} />
					</button>
				</div>
			)}

			{isOpen && (
				<div data-testid="channels-table-expanded">
					<FunnelChannelsTableExpanded channels={channels} />
				</div>
			)}
		</div>
	);
};
