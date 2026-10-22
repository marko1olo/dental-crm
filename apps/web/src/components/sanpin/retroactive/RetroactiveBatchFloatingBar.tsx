import React from "react";
import { Save } from "lucide-react";

export interface RetroactiveBatchFloatingBarProps {
	readonly isLoggingDayCycle: boolean;
	readonly onRecordDayCycle: () => void;
}

export function RetroactiveBatchFloatingBar({
	isLoggingDayCycle,
	onRecordDayCycle,
}: RetroactiveBatchFloatingBarProps) {
	return (
		<div
			className="sanpin-mobile-floating-bar"
			style={{
				position: "sticky",
				bottom: 0,
				left: 0,
				right: 0,
				zIndex: 40,
				padding: "0.75rem 1rem env(safe-area-inset-bottom, 0.75rem)",
				background: "var(--paper-soft, rgba(255, 255, 255, 0.9))",
				backdropFilter: "blur(20px)",
				WebkitBackdropFilter: "blur(20px)",
				borderTop: "1px solid var(--line, #e2e8f0)",
				display: "flex",
				gap: "0.5rem",
				alignItems: "center",
				boxShadow: "0 -2px 10px rgba(0, 0, 0, 0.05)",
			}}
		>
			<button
				type="button"
				onClick={onRecordDayCycle}
				aria-busy={isLoggingDayCycle}
				className="sanpin-btn sanpin-btn-primary"
				style={{
					flex: 1,
					minHeight: "48px",
					fontSize: "0.9rem",
					fontWeight: 800,
					background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)",
					cursor: "pointer",
					borderRadius: "12px",
				}}
				data-testid="mobile-record-day-autoclave-cycle-btn"
			>
				<Save size={18} />
				<span>{isLoggingDayCycle ? "Фиксация..." : "Зафиксировать дневной цикл автоклавирования"}</span>
			</button>
		</div>
	);
}
