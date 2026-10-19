import type React from "react";

export interface Tooth16SurgeryOverlayProps {
	showImplant?: boolean;
	showMissing?: boolean;
}

/**
 * DENTE Dental CRM — Surgery Overlay for Upper Molars 16 / 26
 * Grade-5 Wide Platform Titanium Implant & Missing Tooth extraction cross.
 * Mandate 8b <= 120 lines.
 */
export const Tooth16SurgeryOverlay: React.FC<Tooth16SurgeryOverlayProps> = ({
	showImplant = false,
	showMissing = false,
}) => {
	return (
		<g id="tooth16-surgery-overlay">
			{/* 1. Titanium Implant Grade-5 (Maxillary Molar Wide Neck 5.5mm) */}
			{showImplant && (
				<g id="tooth16-implant-group">
					<defs>
						<linearGradient
							id="dente16-implant-body"
							x1="0"
							y1="0"
							x2="1"
							y2="0"
						>
							<stop offset="0%" stopColor="#cbd5e1" stopOpacity="0.95" />
							<stop offset="35%" stopColor="#94a3b8" stopOpacity="0.95" />
							<stop offset="65%" stopColor="#475569" stopOpacity="0.95" />
							<stop offset="100%" stopColor="#1e293b" stopOpacity="0.95" />
						</linearGradient>
					</defs>

					{/* Conical screw body replacing roots */}
					<path
						id="tooth16-implant-screw"
						d="M 38,96 L 42,24 C 44,20 56,20 58,24 L 62,96 Z"
						fill="url(#dente16-implant-body)"
						stroke="#334155"
						strokeWidth="0.8"
					/>

					{/* Micro-threads & Macro-threads */}
					<g stroke="#1e293b" strokeWidth="0.8" fill="none">
						<line x1="39" y1="90" x2="61" y2="90" />
						<line x1="40" y1="82" x2="60" y2="82" />
						<line x1="41" y1="74" x2="59" y2="74" />
						<line x1="42" y1="66" x2="58" y2="66" />
						<line x1="43" y1="58" x2="57" y2="58" />
						<line x1="44" y1="50" x2="56" y2="50" />
						<line x1="45" y1="42" x2="55" y2="42" />
						<line x1="46" y1="34" x2="54" y2="34" />
					</g>

					{/* Titanium Abutment connection */}
					<path
						id="tooth16-implant-abutment"
						d="M 42,96 L 44,106 L 56,106 L 58,96 Z"
						fill="#94a3b8"
						stroke="#475569"
						strokeWidth="0.8"
					/>
				</g>
			)}

			{/* 2. Clinical Extraction Cross (Missing Tooth) */}
			{showMissing && (
				<g
					id="tooth16-missing-cross"
					stroke="#ef4444"
					strokeWidth="3.2"
					strokeLinecap="round"
				>
					<line x1="16" y1="18" x2="84" y2="150" />
					<line x1="84" y1="18" x2="16" y2="150" />
				</g>
			)}
		</g>
	);
};
