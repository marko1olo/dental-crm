import type React from "react";
import { TOOTH46_PATHOLOGY_GEOMETRY } from "./Tooth46PathologyGeometry";

export interface Tooth46SurgeryOverlayProps {
	showImplant?: boolean;
	showMissing?: boolean;
	className?: string;
}

export const Tooth46SurgeryOverlay: React.FC<Tooth46SurgeryOverlayProps> = ({
	showImplant = false,
	showMissing = false,
	className,
}) => {
	const g = TOOTH46_PATHOLOGY_GEOMETRY;

	return (
		<g id="tooth46-surgical-overlays" className={className}>
			{/* Grade-5 Titanium Implant Fixture & Abutment */}
			{showImplant && (
				<g id="tooth46-titanium-implant">
					<path
						d={g.implant.fixtureBody}
						fill="url(#dente-titanium-body)"
						stroke="#334155"
						strokeWidth="0.8"
					/>
					{g.implant.threads.map((t) => (
						<path
							key={t}
							d={t}
							fill="none"
							stroke="#1e293b"
							strokeWidth="0.9"
						/>
					))}
					<path
						d={g.implant.collar}
						fill="url(#dente-titanium-collar)"
						stroke="#475569"
						strokeWidth="0.6"
					/>
					<path
						d={g.implant.abutment}
						fill="url(#dente-titanium-abutment)"
						stroke="#334155"
						strokeWidth="0.7"
					/>
				</g>
			)}

			{/* Extracted Tooth Clinical Red Cross */}
			{showMissing && (
				<g id="tooth46-missing-cross">
					<path
						d={g.missing.crossLine1}
						fill="none"
						stroke="#ef4444"
						strokeWidth="2.5"
						strokeLinecap="round"
					/>
					<path
						d={g.missing.crossLine2}
						fill="none"
						stroke="#ef4444"
						strokeWidth="2.5"
						strokeLinecap="round"
					/>
				</g>
			)}
		</g>
	);
};
