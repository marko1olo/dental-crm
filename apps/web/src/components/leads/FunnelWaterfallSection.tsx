/**
 * DENTE Dental CRM — Funnel Waterfall Section Component
 * Mandate 8b (<= 120 lines)
 */

import { BarChart3, ChevronDown, ChevronUp } from "lucide-react";
import type React from "react";
import { FunnelWaterfallStageItem } from "./FunnelWaterfallStageItem";
import type { FunnelStageMetric } from "./leadsFunnelTypes";

export interface FunnelWaterfallSectionProps {
	readonly stages: readonly FunnelStageMetric[];
	readonly totalLeads: number;
	readonly isOpen: boolean;
	readonly onToggle: () => void;
}

export const FunnelWaterfallSection: React.FC<FunnelWaterfallSectionProps> = ({
	stages,
	totalLeads,
	isOpen,
	onToggle,
}) => {
	return (
		<div
			style={{
				background: "var(--paper)",
				border: "1px solid var(--line)",
				borderRadius: 14,
				padding: "20px",
			}}
		>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					marginBottom: 16,
					flexWrap: "wrap",
					gap: 8,
				}}
			>
				<div>
					<h3
						style={{
							margin: 0,
							fontSize: 15,
							fontWeight: 700,
							color: "var(--ink)",
							display: "flex",
							alignItems: "center",
							gap: 6,
						}}
					>
						<BarChart3 size={18} color="var(--brand-500)" />
						Клиническая Сквозная Воронка Пациентов
					</h3>
					<p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--muted)" }}>
						Абсолютное количество и пошаговая конверсия между этапами
					</p>
				</div>
				<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
					<div
						style={{
							fontSize: 12,
							fontWeight: 600,
							color: "var(--muted)",
							background: "var(--paper-soft)",
							padding: "4px 10px",
							borderRadius: 8,
							border: "1px solid var(--line)",
						}}
					>
						Выборка: {totalLeads} обращений
					</div>
					<button
						type="button"
						onClick={onToggle}
						style={{
							height: 32,
							padding: "0 10px",
							borderRadius: 8,
							fontSize: 12,
							fontWeight: 600,
							border: "1px solid var(--line)",
							background: isOpen
								? "rgba(15, 118, 110, 0.15)"
								: "var(--paper-soft)",
							color: isOpen ? "var(--teal)" : "var(--ink)",
							cursor: "pointer",
							display: "flex",
							alignItems: "center",
							gap: 6,
						}}
						aria-expanded={isOpen}
						data-testid="toggle-leads-waterfall-btn"
					>
						{isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
						{isOpen ? "Скрыть детализацию" : "Показать расширенную аналитику"}
					</button>
				</div>
			</div>

			{!isOpen && (
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						fontSize: 12,
						padding: "10px 14px",
						background: "var(--paper-soft)",
						borderRadius: 10,
						border: "1px solid var(--line)",
						flexWrap: "wrap",
						gap: 8,
					}}
					data-testid="leads-waterfall-compact-strip"
				>
					<span style={{ color: "var(--muted)" }}>
						6 клинических этапов:{" "}
						<strong style={{ color: "var(--ink)" }}>
							{stages[0]?.count ?? 0}
						</strong>{" "}
						лидов →{" "}
						<strong style={{ color: "var(--teal)" }}>
							{stages[2]?.count ?? 0}
						</strong>{" "}
						записей →{" "}
						<strong style={{ color: "var(--warn-fg)" }}>
							{stages[3]?.count ?? 0}
						</strong>{" "}
						явок (Show-up) →{" "}
						<strong style={{ color: "var(--ok-fg)" }}>
							{stages[5]?.count ?? 0}
						</strong>{" "}
						оплат в кассу.
					</span>
					<button
						type="button"
						onClick={onToggle}
						style={{
							background: "none",
							border: "none",
							color: "var(--teal)",
							fontWeight: 600,
							cursor: "pointer",
							fontSize: 12,
							display: "inline-flex",
							alignItems: "center",
							gap: 4,
						}}
					>
						<span>Развернуть воронку</span>
						<ChevronDown size={13} />
					</button>
				</div>
			)}

			{isOpen && (
				<div
					style={{ display: "flex", flexDirection: "column", gap: "10px" }}
					data-testid="leads-waterfall-expanded"
				>
					{stages.map((st, idx) => (
						<FunnelWaterfallStageItem
							key={st.key}
							st={st}
							idx={idx}
							totalLeads={totalLeads}
							stagesLength={stages.length}
						/>
					))}
				</div>
			)}
		</div>
	);
};
