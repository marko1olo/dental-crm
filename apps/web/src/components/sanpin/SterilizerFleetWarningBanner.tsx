import { ShieldAlert } from "lucide-react";
import type React from "react";

export interface SterilizerFleetWarningBannerProps {
	readonly expiredVerificationCount: number;
}

export const SterilizerFleetWarningBanner: React.FC<SterilizerFleetWarningBannerProps> = ({
	expiredVerificationCount,
}) => {
	if (expiredVerificationCount <= 0) return null;

	return (
		<div
			style={{
				padding: "0.5rem 0.75rem",
				borderRadius: "6px",
				background: "rgba(220, 38, 38, 0.08)",
				border: "1px solid rgba(220, 38, 38, 0.3)",
				display: "flex",
				alignItems: "center",
				gap: "0.5rem",
				fontSize: "0.8rem",
				color: "#dc2626",
				fontWeight: 600,
			}}
		>
			<ShieldAlert size={16} />
			<span>
				Внимание: у {expiredVerificationCount} аппарата(ов) истёк срок поверки и калибровки! Эксплуатация без действующей поверки запрещена правилами безопасности.
			</span>
		</div>
	);
};
