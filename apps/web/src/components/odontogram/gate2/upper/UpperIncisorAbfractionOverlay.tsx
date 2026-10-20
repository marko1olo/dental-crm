import type React from "react";

export interface UpperIncisorAbfractionOverlayProps {
	wedgePath: string;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * DENTE Dental CRM — Maxillary Incisor Cervical Abfraction V-Notch Overlay
 * V-shaped microstructural stress fracture at CEJ with exposed sclerotic dentin.
 * Mandate 8b <= 120 lines.
 */
export const UpperIncisorAbfractionOverlay: React.FC<UpperIncisorAbfractionOverlayProps> = ({
	wedgePath,
	isDark = false,
	className,
}) => {
	return (
		<g
			id="upper-incisor-abfraction-overlay"
			data-pathology="cervical_abfraction"
			className={className}
		>
			<path
				id="abfraction-notch"
				d={wedgePath}
				fill="#b45309"
				opacity="0.85"
				stroke={isDark ? "rgba(245, 158, 11, 0.85)" : "#92400e"}
				strokeWidth="0.6"
				strokeLinejoin="round"
			/>
			<path
				d={wedgePath}
				fill="none"
				stroke="rgba(254, 243, 199, 0.45)"
				strokeWidth="0.3"
			/>
		</g>
	);
};
