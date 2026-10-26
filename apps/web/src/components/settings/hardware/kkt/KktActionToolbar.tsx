import React from "react";
import { Printer, RefreshCw, RotateCcw } from "lucide-react";
import type { CircuitBreakerTelemetry } from "../../../../services/hardware/hardwareTypes.js";

interface Props {
	isChecking: boolean;
	isPrinting: boolean;
	circuitTelemetry: CircuitBreakerTelemetry;
	onCheckHealth: () => void;
	onPrintTestReceipt: () => void;
	onSaveConfig: () => void;
	onResetCircuitBreaker: () => void;
}

export const KktActionToolbar: React.FC<Props> = ({
	isChecking,
	isPrinting,
	circuitTelemetry,
	onCheckHealth,
	onPrintTestReceipt,
	onSaveConfig,
	onResetCircuitBreaker,
}) => {
	const isClosed = circuitTelemetry.state === "CLOSED";

	return (
		<div
			style={{
				display: "flex",
				flexWrap: "wrap",
				alignItems: "center",
				justifyContent: "space-between",
				gap: "10px",
				padding: "12px",
				background: "var(--paper-soft)",
				border: "1px solid var(--line)",
				borderRadius: "8px",
			}}
		>
			<div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" }}>
				<button
					type="button"
					className="hw-btn-compact primary"
					onClick={onCheckHealth}
					data-testid="kkt-btn-check-health"
				>
					<RefreshCw size={13} className={isChecking ? "animate-spin" : ""} />
					<span>Проверить связь с ККТ</span>
				</button>

				<button
					type="button"
					className="hw-btn-compact"
					onClick={onPrintTestReceipt}
					data-testid="kkt-btn-print-test"
				>
					<Printer size={13} className={isPrinting ? "animate-spin" : ""} />
					<span>Печать тестового чека (10.00 руб.)</span>
				</button>

				<button
					type="button"
					className="hw-btn-compact"
					onClick={onSaveConfig}
				>
					Сохранить параметры
				</button>

				{circuitTelemetry.state === "OPEN" && (
					<button
						type="button"
						className="hw-btn-compact"
						style={{ color: "var(--amber, orange)", borderColor: "rgba(245, 158, 11, 0.4)" }}
						onClick={onResetCircuitBreaker}
						title="Сбросить защиту от сбоев после восстановления связи"
					>
						<RotateCcw size={13} />
						<span>Сброс Circuit Breaker (OPEN)</span>
					</button>
				)}
			</div>

			<div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px" }}>
				<span style={{ color: "var(--muted)" }}>Circuit Breaker:</span>
				<span
					style={{
						padding: "2px 6px",
						borderRadius: "4px",
						fontWeight: 600,
						background: isClosed ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
						color: isClosed ? "var(--success, green)" : "var(--danger, red)",
					}}
				>
					{circuitTelemetry.state}
				</span>
			</div>
		</div>
	);
};
