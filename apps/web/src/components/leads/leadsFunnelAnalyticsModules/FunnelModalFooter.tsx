import React from "react";
/**
 * DENTE Dental CRM — Funnel Modal Footer
 * Mandate 8b (<= 120 lines)
 */

export interface FunnelModalFooterProps {
	readonly onClose: () => void;
}

export function FunnelModalFooter({ onClose }: FunnelModalFooterProps) {
	return (
		<footer
			style={{
				padding: "12px 24px",
				background: "var(--paper-soft)",
				borderTop: "1px solid var(--line)",
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
			}}
		>
			<div style={{ fontSize: 11, color: "var(--muted)" }}>
				Сквозная воронка ДЕНТЕ CRM • Расчет в реальном времени
			</div>
			<button
				type="button"
				className="primary-button"
				onClick={onClose}
				style={{ height: 34, padding: "0 18px", fontSize: 12 }}
			>
				Закрыть
			</button>
		</footer>
	);
}
