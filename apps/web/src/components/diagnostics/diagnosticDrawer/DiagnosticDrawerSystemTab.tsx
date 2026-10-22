import React from "react";
import { Download } from "lucide-react";

interface DiagnosticDrawerSystemTabProps {
	userRole?: string | null | undefined;
	organizationId?: string | null | undefined;
	onExportReport: () => void | Promise<void>;
}

export const DiagnosticDrawerSystemTab: React.FC<DiagnosticDrawerSystemTabProps> = ({
	userRole,
	organizationId,
	onExportReport,
}) => {
	const resolution = typeof window !== "undefined"
		? `${window.innerWidth}x${window.innerHeight} (${window.devicePixelRatio}x)`
		: "1440x900";

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
			<div className="dente-diagnostic-grid">
				<div className="dente-diagnostic-metric-card">
					<span className="dente-diagnostic-metric-label">Приложение</span>
					<span className="dente-diagnostic-metric-value">DENTE CRM v0.1.0</span>
				</div>

				<div className="dente-diagnostic-metric-card">
					<span className="dente-diagnostic-metric-label">Окружение</span>
					<span className="dente-diagnostic-metric-value">{import.meta.env?.MODE || "development"}</span>
				</div>

				<div className="dente-diagnostic-metric-card">
					<span className="dente-diagnostic-metric-label">Клиентская сессия</span>
					<span style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>
						{userRole ? `Роль: ${userRole}` : "Не авторизован"}
					</span>
					{organizationId && (
						<span style={{ fontSize: 11, color: "var(--muted, #64748b)" }}>
							Org: {organizationId.slice(0, 12)}…
						</span>
					)}
				</div>

				<div className="dente-diagnostic-metric-card">
					<span className="dente-diagnostic-metric-label">Браузер / Экран</span>
					<span style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>{resolution}</span>
				</div>
			</div>

			<div
				style={{
					padding: 16,
					borderRadius: 8,
					background: "var(--paper-strong, #ffffff)",
					border: "1px solid var(--glass-border, rgba(0,0,0,0.08))",
					display: "flex",
					flexDirection: "column",
					gap: 12,
				}}
			>
				<h4 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
					Экспорт диагностического пакета
				</h4>
				<p style={{ margin: 0, fontSize: 13, color: "var(--muted, #64748b)", lineHeight: 1.5 }}>
					Диагностический отчет содержит полную техническую информацию о состоянии системы,
					параметрах браузера, последних 500 событиях консоли и 200 сетевых запросах.
					Все пароли, токены и номера банковских карт автоматически маскируются (152-ФЗ).
				</p>
				<div>
					<button
						type="button"
						className="dente-diagnostic-action-btn dente-diagnostic-primary-btn"
						style={{ minHeight: 36, height: 36, padding: "0 16px", fontSize: 13, fontWeight: 600 }}
						onClick={onExportReport}
					>
						<Download size={16} />
						<span>Выгрузить диагностический отчет (.json)</span>
					</button>
				</div>
			</div>
		</div>
	);
};
