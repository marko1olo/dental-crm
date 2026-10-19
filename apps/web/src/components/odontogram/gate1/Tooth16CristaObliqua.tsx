import type React from "react";
import { TOOTH16_GEOMETRY } from "./tooth16GeometryConstants";

export interface Tooth16CristaObliquaProps {
	isDark?: boolean;
}

/**
 * DENTE Dental CRM — Crista Obliqua (Oblique Ridge) Component for Upper Molars
 * Runs obliquely from ML cusp apex to DB cusp apex (Wheeler Dental Anatomy).
 * Mandate 8b <= 120 lines.
 */
export const Tooth16CristaObliqua: React.FC<Tooth16CristaObliquaProps> = ({
	isDark = false,
}) => {
	const shadowStroke = isDark
		? "rgba(15, 23, 42, 0.50)"
		: "rgba(100, 116, 139, 0.35)";

	return (
		<g id="tooth16-crista-obliqua">
			<path
				d={TOOTH16_GEOMETRY.cristaObliquaRidge}
				stroke="url(#dente16-crista-ridge)"
				strokeWidth="2.2"
				strokeLinecap="round"
				fill="none"
			/>
			<path
				d={TOOTH16_GEOMETRY.cristaObliquaShadow}
				stroke={shadowStroke}
				strokeWidth="0.8"
				fill="none"
			/>
		</g>
	);
};
