import React from "react";
import { Camera } from "lucide-react";

export const PlanBeforeAfterEmpty: React.FC = () => {
	return (
		<div
			className="pc-card pc-before-after-empty"
			data-testid="plan-before-after-empty"
			style={{
				padding: "32px 16px",
				textAlign: "center",
				backgroundColor: "var(--pc-surface, #1e293b)",
				borderRadius: "12px",
				border: "1px dashed var(--pc-border, #334155)",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				gap: "10px",
			}}
		>
			<Camera size={32} style={{ color: "var(--pc-text-muted, #94a3b8)", opacity: 0.6 }} />
			<h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--pc-text-main, var(--ink, #0f172a))" }}>
				Клинический фотопротокол формируется
			</h4>
			<p style={{ margin: 0, fontSize: "12px", color: "var(--pc-text-muted, #94a3b8)", maxWidth: "340px" }}>
				Фотографии зубов до и после лечения будут загружены вашим лечащим врачом после завершения лечения.
			</p>
		</div>
	);
};
