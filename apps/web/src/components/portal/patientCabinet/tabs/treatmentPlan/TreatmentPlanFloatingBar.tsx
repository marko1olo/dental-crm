import React from "react";
import { Calendar } from "lucide-react";

interface TreatmentPlanFloatingBarProps {
	readonly nextStageTitle?: string | undefined;
	readonly onBookAppointment: () => void;
}

export const TreatmentPlanFloatingBar: React.FC<TreatmentPlanFloatingBarProps> = ({
	nextStageTitle,
	onBookAppointment,
}) => {
	return (
		<div
			className="pc-floating-bottom-bar"
			style={{
				position: "sticky",
				bottom: 0,
				left: 0,
				right: 0,
				padding: "12px 16px",
				paddingBottom: "max(12px, env(safe-area-inset-bottom))",
				backgroundColor: "var(--paper-card, var(--paper-strong))",
				backdropFilter: "blur(20px)",
				WebkitBackdropFilter: "blur(20px)",
				borderTop: "1px solid var(--line)",
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				gap: "12px",
				zIndex: 50,
				marginTop: "16px",
				borderRadius: "16px 16px 0 0",
				boxShadow: "0 -4px 16px rgba(0, 0, 0, 0.06)",
			}}
			data-testid="treatment-plan-floating-bar"
		>
			<div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
				<span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>
					Следующий этап
				</span>
				<strong style={{ fontSize: "13px", color: "var(--ink)", lineHeight: 1.2, wordBreak: "break-word" }}>
					{nextStageTitle || "Курс завершён"}
				</strong>
			</div>

			<button
				type="button"
				onClick={onBookAppointment}
				data-testid="book-next-stage-btn"
				style={{
					minHeight: "48px",
					padding: "10px 18px",
					borderRadius: "12px",
					backgroundColor: "var(--primary, #0d9488)",
					color: "#ffffff",
					fontWeight: 600,
					fontSize: "14px",
					border: "none",
					display: "flex",
					alignItems: "center",
					gap: "8px",
					cursor: "pointer",
					touchAction: "manipulation",
					boxShadow: "0 4px 12px rgba(13, 148, 136, 0.22)",
					flexShrink: 0,
				}}
			>
				<Calendar size={18} />
				<span>Записаться на этап</span>
			</button>
		</div>
	);
};
