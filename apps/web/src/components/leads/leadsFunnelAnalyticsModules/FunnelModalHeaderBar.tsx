/**
 * DENTE Dental CRM — Funnel Modal Header Bar
 * Mandate 8b (<= 120 lines)
 */

import { BarChart3 } from "lucide-react";
import { FunnelModalHeaderActions } from "./FunnelModalHeaderActions";
import { FunnelModalPeriodBar } from "./FunnelModalPeriodBar";
import type { FunnelTimePeriod } from "./types";

export interface FunnelModalHeaderBarProps {
	readonly period: FunnelTimePeriod;
	readonly onSelectPeriod: (period: FunnelTimePeriod) => void;
	readonly isBudgetDrawerOpen: boolean;
	readonly onToggleBudgetDrawer: () => void;
	readonly onCopySummary: () => void;
	readonly onExportCsv: () => void;
	readonly onClose: () => void;
	readonly onOpenLeakDetector?: (() => void) | undefined;
}

export function FunnelModalHeaderBar({
	period,
	onSelectPeriod,
	isBudgetDrawerOpen,
	onToggleBudgetDrawer,
	onCopySummary,
	onExportCsv,
	onClose,
	onOpenLeakDetector,
}: FunnelModalHeaderBarProps) {
	return (
		<>
			{/* 1. HEADER & ACTIONS */}
			<header
				style={{
					padding: "18px 24px",
					borderBottom: "1px solid var(--line)",
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					flexWrap: "wrap",
					gap: "12px",
					background: "var(--paper-soft)",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
					<div
						style={{
							width: 40,
							height: 40,
							borderRadius: 10,
							background: "rgba(15, 118, 110, 0.15)",
							color: "var(--teal)",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}}
					>
						<BarChart3 size={22} />
					</div>
					<div>
						<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
							<h2
								style={{
									margin: 0,
									fontSize: 18,
									fontWeight: 700,
									color: "var(--ink)",
									letterSpacing: "-0.01em",
								}}
							>
								Сквозная Воронка & Маркетинг
							</h2>
							<span
								style={{
									fontSize: 10,
									fontWeight: 700,
									padding: "2px 8px",
									borderRadius: 12,
									background: "var(--teal)",
									color: "var(--on-teal, var(--paper))",
									textTransform: "uppercase",
									letterSpacing: "0.05em",
								}}
							>
								CRM Intelligence
							</span>
						</div>
						<p
							style={{
								margin: "2px 0 0",
								fontSize: 12,
								color: "var(--muted)",
							}}
						>
							Конверсии от лида до оплаты в кассу • Юнит-экономика CAC/LTV •
							Маркетинговые каналы
						</p>
					</div>
				</div>

				<FunnelModalHeaderActions
					onOpenLeakDetector={onOpenLeakDetector}
					onCopySummary={onCopySummary}
					onExportCsv={onExportCsv}
					onClose={onClose}
				/>
			</header>

			{/* 2. 0-CLICK PERIOD SELECTOR & QUICK STATS */}
			<FunnelModalPeriodBar
				period={period}
				onSelectPeriod={onSelectPeriod}
				isBudgetDrawerOpen={isBudgetDrawerOpen}
				onToggleBudgetDrawer={onToggleBudgetDrawer}
			/>
		</>
	);
}
