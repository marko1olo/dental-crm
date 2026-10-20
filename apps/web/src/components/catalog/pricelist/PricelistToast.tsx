import { CheckCircle2 } from "lucide-react";
import type React from "react";

export const PricelistToast: React.FC<{ readonly message: string | null }> = ({
	message,
}) => {
	if (!message) return null;
	return (
		<div
			className="pricelist-toast"
			style={{
				position: "absolute",
				top: "5rem",
				right: "2rem",
				zIndex: 10001,
				background: "var(--ink)",
				color: "var(--paper)",
				padding: "0.625rem 1.25rem",
				borderRadius: "8px",
				display: "flex",
				alignItems: "center",
				gap: "0.5rem",
				fontSize: "0.875rem",
			}}
		>
			<CheckCircle2 size={16} style={{ color: "var(--ok-fg, #10b981)" }} />
			<span>{message}</span>
		</div>
	);
};
