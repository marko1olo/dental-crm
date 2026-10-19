import type React from "react";
import { TOOTH16_GEOMETRY } from "./tooth16GeometryConstants";

export interface Tooth16CarabelliCuspProps {
	isDark?: boolean;
}

/**
 * DENTE Dental CRM — Tuberculum Carabelli Component for Upper Molars
 * Anatomical 5th cusp on mesiopalatal line (Wheeler Dental Anatomy).
 * Mandate 8b <= 120 lines.
 */
export const Tooth16CarabelliCusp: React.FC<Tooth16CarabelliCuspProps> = ({
	isDark = false,
}) => {
	const fissureStroke = isDark
		? "rgba(148, 163, 184, 0.70)"
		: "rgba(51, 65, 85, 0.65)";
	const borderStroke = isDark
		? "rgba(148, 163, 184, 0.50)"
		: "rgba(71, 85, 105, 0.35)";

	return (
		<g id="tooth16-carabelli-group">
			<path
				d={TOOTH16_GEOMETRY.carabelliCuspPath}
				fill="url(#dente16-carabelli-gradient)"
				stroke={borderStroke}
				strokeWidth="0.6"
			/>
			<path
				d={TOOTH16_GEOMETRY.carabelliGroove}
				stroke={fissureStroke}
				strokeWidth="0.7"
				fill="none"
			/>
		</g>
	);
};
