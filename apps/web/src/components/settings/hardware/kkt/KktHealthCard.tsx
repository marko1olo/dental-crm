import React from "react";
import type { KktDeviceHealthStatus } from "../../../../services/hardware/hardwareTypes.js";

interface Props {
	healthStatus: KktDeviceHealthStatus | null;
}

export const KktHealthCard: React.FC<Props> = ({ healthStatus }) => {
	if (!healthStatus) {
		return null;
	}

	return (
		<div
			data-testid="kkt-health-status-card"
			style={{
				display: "grid",
				gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
				gap: "10px",
				padding: "12px",
				background: "var(--paper)",
				border: "1px solid var(--line)",
				borderRadius: "8px",
				fontSize: "12px",
			}}
		>
			<div>
				<span style={{ color: "var(--muted)" }}>Модель:</span>
				<div style={{ fontWeight: 600, color: "var(--ink)" }}>{healthStatus.modelName}</div>
			</div>
			<div>
				<span style={{ color: "var(--muted)" }}>Бумага в принтере:</span>
				<div style={{ fontWeight: 600, color: healthStatus.paperOk ? "var(--success, green)" : "var(--danger, red)" }}>
					{healthStatus.paperOk ? "В норме (рулон OK)" : "Закончилась бумага"}
				</div>
			</div>
			<div>
				<span style={{ color: "var(--muted)" }}>ФН и фискализация:</span>
				<div style={{ fontWeight: 600, color: healthStatus.fnFiscalized ? "var(--success, green)" : "var(--amber, orange)" }}>
					{healthStatus.fnFiscalized ? `ФН активен (${healthStatus.fnSerial})` : "Не фискализирован"}
				</div>
			</div>
			<div>
				<span style={{ color: "var(--muted)" }}>Отклик сокета:</span>
				<div style={{ fontWeight: 600, color: "var(--ink)" }}>{healthStatus.latencyMs} мс</div>
			</div>
		</div>
	);
};
