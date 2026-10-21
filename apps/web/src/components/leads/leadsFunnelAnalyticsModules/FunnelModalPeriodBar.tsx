/**
 * DENTE Dental CRM — Funnel Modal Period Selector Bar
 * Mandate 8b (<= 120 lines)
 */

import { ChevronDown, ChevronUp, Sliders } from "lucide-react";
import { FUNNEL_PERIOD_OPTIONS, type FunnelTimePeriod } from "./types";

export interface FunnelModalPeriodBarProps {
	readonly period: FunnelTimePeriod;
	readonly onSelectPeriod: (period: FunnelTimePeriod) => void;
	readonly isBudgetDrawerOpen: boolean;
	readonly onToggleBudgetDrawer: () => void;
}

export function FunnelModalPeriodBar({
	period,
	onSelectPeriod,
	isBudgetDrawerOpen,
	onToggleBudgetDrawer,
}: FunnelModalPeriodBarProps) {
	return (
		<div
			style={{
				padding: "12px 24px",
				background: "var(--paper)",
				borderBottom: "1px solid var(--line)",
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				flexWrap: "wrap",
				gap: "12px",
			}}
		>
			<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
				<span
					style={{
						fontSize: 12,
						fontWeight: 600,
						color: "var(--muted)",
						marginRight: 4,
					}}
				>
					Период:
				</span>
				{FUNNEL_PERIOD_OPTIONS.map((opt) => (
					<button
						key={opt.id}
						type="button"
						onClick={() => onSelectPeriod(opt.id)}
						style={{
							padding: "6px 12px",
							fontSize: 12,
							fontWeight: period === opt.id ? 600 : 500,
							borderRadius: 8,
							border:
								period === opt.id
									? "1px solid var(--teal)"
									: "1px solid var(--line)",
							background:
								period === opt.id
									? "rgba(15, 118, 110, 0.12)"
									: "var(--paper-soft)",
							color: period === opt.id ? "var(--teal)" : "var(--ink)",
							cursor: "pointer",
							transition: "all 0.15s ease",
						}}
					>
						{opt.label}
					</button>
				))}
			</div>

			<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
				<button
					type="button"
					onClick={onToggleBudgetDrawer}
					style={{
						display: "flex",
						alignItems: "center",
						gap: 6,
						fontSize: 12,
						fontWeight: 600,
						padding: "6px 12px",
						borderRadius: 8,
						border: "1px solid var(--line)",
						background: isBudgetDrawerOpen
							? "rgba(59, 130, 246, 0.1)"
							: "var(--paper-soft)",
						color: isBudgetDrawerOpen ? "var(--accent)" : "var(--ink)",
						cursor: "pointer",
					}}
				>
					<Sliders size={14} />
					Настроить рекламные бюджеты
					{isBudgetDrawerOpen ? (
						<ChevronUp size={14} />
					) : (
						<ChevronDown size={14} />
					)}
				</button>
			</div>
		</div>
	);
}
