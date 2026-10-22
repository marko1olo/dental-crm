import React from "react";
import { Activity, X } from "lucide-react";

interface DiagnosticDrawerHeaderProps {
	onClose: () => void;
}

export const DiagnosticDrawerHeader: React.FC<DiagnosticDrawerHeaderProps> = ({ onClose }) => {
	return (
		<div className="dente-diagnostic-header">
			<div className="dente-diagnostic-title-group">
				<Activity size={20} color="var(--brand-primary, var(--teal))" />
				<h2 className="dente-diagnostic-title">Диагностика и Observability</h2>
				<span className="dente-diagnostic-env-tag">
					{import.meta.env?.MODE || "development"}
				</span>
			</div>
			<button
				type="button"
				className="dente-diagnostic-close-btn"
				onClick={onClose}
				title="Закрыть (Esc)"
				aria-label="Закрыть панель диагностики"
			>
				<X size={20} />
			</button>
		</div>
	);
};
