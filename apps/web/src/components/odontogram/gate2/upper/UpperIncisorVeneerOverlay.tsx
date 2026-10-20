import type React from "react";
import type { IncisorVeneerPrep, IncisorVeneerShade } from "../types/upperIncisorTypes";

export interface UpperIncisorVeneerOverlayProps {
	facingPath: string;
	chamferMargin: string;
	incisalHalo: string;
	shade?: IncisorVeneerShade | undefined;
	prepType?: IncisorVeneerPrep | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

const SHADE_TINT_MAP: Record<IncisorVeneerShade, string> = {
	BL1: "rgba(255, 255, 255, 0.96)",
	BL2: "rgba(250, 250, 252, 0.94)",
	A1: "rgba(248, 250, 252, 0.92)",
	A2: "rgba(245, 243, 237, 0.90)",
	A3: "rgba(240, 236, 224, 0.90)",
	B1: "rgba(252, 251, 247, 0.93)",
	B2: "rgba(246, 243, 232, 0.91)",
};

/**
 * DENTE Dental CRM — Maxillary Incisor E-Max Porcelain Veneer Overlay
 * 0.3-0.5mm thickness, translucent incisal edge, chamfer margin, high-glass specular.
 * Mandate 8b <= 120 lines.
 */
export const UpperIncisorVeneerOverlay: React.FC<UpperIncisorVeneerOverlayProps> = ({
	facingPath,
	chamferMargin,
	incisalHalo,
	shade = "A1",
	prepType = "chamfer",
	isDark = false,
	className,
}) => {
	const tint = SHADE_TINT_MAP[shade];
	const marginStroke = isDark
		? "rgba(186, 230, 253, 0.70)"
		: "rgba(56, 189, 248, 0.85)";

	return (
		<g
			id="upper-incisor-veneer-overlay"
			data-veneer-shade={shade}
			data-veneer-prep={prepType}
			className={className}
		>
			<path
				id="veneer-emax-facing"
				d={facingPath}
				fill={tint}
				stroke={isDark ? "rgba(224, 242, 254, 0.60)" : "rgba(125, 211, 252, 0.65)"}
				strokeWidth="0.75"
				strokeLinejoin="round"
			/>
			<path
				id="veneer-chamfer-margin"
				d={chamferMargin}
				fill="none"
				stroke={marginStroke}
				strokeWidth={prepType === "chamfer" ? "0.9" : "0.6"}
				strokeLinecap="round"
			/>
			<path
				id="veneer-translucent-incisal-halo"
				d={incisalHalo}
				fill="none"
				stroke="rgba(186, 230, 253, 0.75)"
				strokeWidth="1.2"
				strokeLinecap="round"
			/>
			<ellipse
				id="veneer-glass-specular"
				cx="46"
				cy="120"
				rx="8"
				ry="16"
				transform="rotate(-12 46 120)"
				fill="rgba(255, 255, 255, 0.40)"
				opacity="0.85"
			/>
		</g>
	);
};
