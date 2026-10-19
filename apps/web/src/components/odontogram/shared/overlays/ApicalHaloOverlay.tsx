import type React from "react";
import { DENTE_SHADER_IDS } from "../defs/shaderConstants";
import type { ApicalHaloProps } from "../types/apicalHaloTypes";

/**
 * Universal Periapical Pathology Halo Overlay.
 * Maps biological inflammatory lesions (granuloma, flame periodontitis, radicular cyst)
 * to arbitrary apex coordinates for 1-, 2-, and 3-rooted teeth.
 * Mandate 8b <= 120 lines.
 */
export const ApicalHaloOverlay: React.FC<ApicalHaloProps> = ({
	apices,
	defaultRadius = 7,
	lesionType = "granuloma",
	className,
}) => {
	const s = DENTE_SHADER_IDS;

	return (
		<g
			id="dente-periapical-lesion-overlay"
			className={className}
			data-lesion-type={lesionType}
		>
			{apices.map((apex) => {
				const activeType = apex.lesionType ?? lesionType;
				const r = apex.r ?? defaultRadius;

				if (activeType === "periodontitis_flame") {
					return (
						<g key={`apex-flame-${apex.id}`}>
							{apex.customFlamePath ? (
								<path
									d={apex.customFlamePath}
									fill={`url(#${s.periapicalFlame})`}
									stroke="rgba(239, 68, 68, 0.60)"
									strokeWidth="0.6"
								/>
							) : (
								<circle
									cx={apex.x}
									cy={apex.y}
									r={r * 1.3}
									fill={`url(#${s.periapicalFlame})`}
									stroke="rgba(249, 115, 22, 0.60)"
									strokeWidth="0.6"
									strokeDasharray="2 1.5"
								/>
							)}
						</g>
					);
				}

				if (activeType === "radicular_cyst") {
					return (
						<g key={`apex-cyst-${apex.id}`}>
							<circle
								cx={apex.x}
								cy={apex.y}
								r={r * 1.4}
								fill="#3b0707"
								opacity="0.90"
								stroke="#f8fafc"
								strokeWidth="0.8"
								strokeDasharray="3 1"
							/>
							<circle
								cx={apex.x}
								cy={apex.y}
								r={r * 0.9}
								fill="#1c1917"
								opacity="0.80"
							/>
						</g>
					);
				}

				// Standard Inflammatory Granuloma
				return (
					<circle
						key={`apex-granuloma-${apex.id}`}
						cx={apex.x}
						cy={apex.y}
						r={r}
						fill={`url(#${s.periapicalHalo})`}
						stroke="rgba(185, 28, 28, 0.40)"
						strokeWidth="0.5"
					/>
				);
			})}
		</g>
	);
};
