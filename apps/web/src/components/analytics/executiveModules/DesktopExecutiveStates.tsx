import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export function DesktopExecutiveLoadingState() {
	return (
		<div className="executive-dashboard" style={{ padding: "3rem", textAlign: "center" }}>
			<RefreshCw className="animate-spin" size={32} style={{ margin: "0 auto 1rem", color: "var(--teal, #0d9488)" }} />
			<div style={{ fontSize: "1.125rem", fontWeight: 600 }}>Загрузка рабочего стола директора...</div>
			<div style={{ color: "var(--muted, #64748b)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
				Формирование показателей выручки, P&amp;L и загрузки кресел
			</div>
		</div>
	);
}

interface DesktopExecutiveErrorStateProps {
	readonly error?: string | null;
	readonly reload: () => void;
}

export function DesktopExecutiveErrorState({ error, reload }: DesktopExecutiveErrorStateProps) {
	return (
		<div className="executive-dashboard" style={{ padding: "2rem" }}>
			<div className="executive-panel" style={{ textAlign: "center" }}>
				<AlertTriangle size={36} style={{ color: "var(--err-fg, #ef4444)", margin: "0 auto 1rem" }} />
				<div style={{ fontSize: "1.125rem", fontWeight: 700 }}>Не удалось сформировать дашборд</div>
				<div style={{ color: "var(--muted, #64748b)", margin: "0.5rem 0 1.5rem" }}>
					{error || "Проверьте сетевое подключение и обновите страницу"}
				</div>
				<button type="button" className="secondary-button executive-refresh-btn" onClick={reload}>
					<RefreshCw size={16} /> Повторить попытку
				</button>
			</div>
		</div>
	);
}
