import React from "react";
import { Sparkles } from "lucide-react";

export interface ComparatorEmptyStateProps {
	onClose?: (() => void) | undefined;
}

export const ComparatorEmptyState: React.FC<ComparatorEmptyStateProps> = ({ onClose }) => {
	return (
		<div
			className="plan-comparator-empty-state"
			data-testid="plan-comparator-empty-state"
			style={{
				padding: "4rem 2rem",
				textAlign: "center",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				gap: "1rem",
				minHeight: "360px",
			}}
		>
			<Sparkles size={48} style={{ opacity: 0.3, color: "var(--teal, #0d9488)" }} />
			<div style={{ fontWeight: 700, fontSize: "1.25rem", color: "var(--plan-text-main, #0f172a)" }}>
				Варианты планов лечения пока не сформированы
			</div>
			<p style={{ maxWidth: "480px", fontSize: "0.875rem", color: "var(--plan-text-muted, #64748b)", lineHeight: 1.5 }}>
				Для сравнения вариантов сформируйте альтернативные планы в конструкторе планов лечения или включите демонстрационный режим витрины.
			</p>
			<button
				type="button"
				onClick={onClose}
				className="plan-action-btn-secondary"
				style={{ marginTop: "0.5rem" }}
				data-testid="btn-comparator-empty-close"
			>
				<span>Вернуться в карту пациента</span>
			</button>
		</div>
	);
};
