import React from "react";
import { Gauge } from "lucide-react";

export interface ShiftIntelligenceHeaderProps {
	readonly showAnalytics: boolean;
	readonly onToggleAnalytics: () => void;
}

export const ShiftIntelligenceHeader: React.FC<ShiftIntelligenceHeaderProps> = ({
	showAnalytics,
	onToggleAnalytics,
}) => (
	<div
		style={{
			display: "flex",
			alignItems: "center",
			justifyContent: "space-between",
			gap: "12px",
			flexWrap: "wrap",
		}}
	>
		<div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
			<div
				style={{
					width: "32px",
					height: "32px",
					borderRadius: "9px",
					background: "var(--teal-soft)",
					color: "var(--teal-dark)",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					flexShrink: 0,
				}}
			>
				<Gauge size={16} aria-hidden="true" />
			</div>
			<div style={{ minWidth: 0 }}>
				<h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--ink)", wordBreak: "break-word", lineHeight: 1.25 }}>
					Операционный контроль смены
				</h4>
				<p style={{ margin: "1px 0 0", fontSize: "12px", color: "var(--ink-2)", fontWeight: 500, wordBreak: "break-word", lineHeight: 1.35 }}>
					Насколько режим клиники и загрузка кресел совпадают с планом на день
				</p>
			</div>
		</div>
		<button
			className="secondary-button"
			type="button"
			aria-expanded={showAnalytics}
			onClick={onToggleAnalytics}
			style={{
				minHeight: "36px",
				height: "36px",
				padding: "0 14px",
				fontSize: "13px",
				fontWeight: 600,
				flexShrink: 0,
				borderRadius: "8px",
				cursor: "pointer",
			}}
		>
			{showAnalytics ? "Скрыть аналитику" : "Показать аналитику"}
		</button>
	</div>
);
