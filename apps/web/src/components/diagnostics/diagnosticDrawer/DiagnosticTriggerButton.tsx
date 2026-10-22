import React from "react";
import { Terminal } from "lucide-react";

interface DiagnosticTriggerButtonProps {
	errorCount: number;
	onClick: () => void;
}

export const DiagnosticTriggerButton: React.FC<DiagnosticTriggerButtonProps> = ({ errorCount, onClick }) => {
	return (
		<button
			type="button"
			className="dente-diagnostic-trigger"
			onClick={onClick}
			title="Открыть панель диагностики «Под капотом» (Ctrl+Shift+D)"
			aria-label="Открыть панель диагностики"
		>
			<Terminal size={16} />
			<span>Под капотом</span>
			{errorCount > 0 && <span className="dente-diagnostic-badge">{errorCount}</span>}
		</button>
	);
};
