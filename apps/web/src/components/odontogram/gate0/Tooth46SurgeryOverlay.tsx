import type React from "react";
import { TOOTH46_PATHOLOGY_GEOMETRY } from "./Tooth46PathologyGeometry";

export interface Tooth46SurgeryOverlayProps {
	showImplant?: boolean | undefined;
	showMissing?: boolean | undefined;
	className?: string | undefined;
}

/**
 * DENTE Dental CRM — Surgical Overlays for Tooth 46
 * Grade-5 SLA Titanium Implant Fixture & Missing Tooth Extraction Cross.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth46SurgeryOverlay: React.FC<Tooth46SurgeryOverlayProps> = ({
	showImplant = false,
	showMissing = false,
	className,
}) => {
	const g = TOOTH46_PATHOLOGY_GEOMETRY;

	return (
		<g id="tooth46-surgical-overlays" className={className}>
			{showImplant && (
				<g id="tooth46-titanium-implant" data-testid="tooth46-implant">
					<path
						d={g.implant.fixtureBody}
						fill="url(#dente-titanium-body)"
						stroke="#334155"
						strokeWidth="0.8"
						strokeLinejoin="round"
					/>
					{g.implant.threads.map((t) => (
						<path
							key={`m-${t.slice(0, 10)}`}
							d={t}
							data-component="implant-macro-thread"
							fill="url(#dente-titanium-body)"
							stroke="#1e293b"
							strokeWidth="0.75"
						/>
					))}
					{g.implant.microThreads.map((m) => (
						<path
							key={`u-${m.slice(0, 10)}`}
							d={m}
							data-component="implant-micro-thread"
							fill="none"
							stroke="#475569"
							strokeWidth="0.6"
						/>
					))}
					<path d={g.implant.fluteLeft} fill="#0f172a" opacity="0.45" />
					<path d={g.implant.fluteRight} fill="#0f172a" opacity="0.45" />
					<path
						d={g.implant.collar}
						fill="url(#dente-titanium-collar)"
						stroke="#475569"
						strokeWidth="0.7"
					/>
					<path
						d={g.implant.abutment}
						data-component="implant-abutment"
						fill="url(#dente-titanium-abutment)"
						stroke="#334155"
						strokeWidth="0.8"
					/>
					<path
						d={g.implant.hexSocket}
						fill="#1e293b"
						stroke="#0f172a"
						strokeWidth="0.5"
					/>
					<path
						d={g.implant.specular}
						fill="none"
						stroke="#ffffff"
						strokeWidth="0.9"
						strokeOpacity="0.75"
						strokeLinecap="round"
					/>
				</g>
			)}

			{showMissing && (
				<g id="tooth46-missing-cross" data-testid="tooth46-missing">
					<path
						d={g.missing.socketGhost}
						fill="none"
						stroke="#94a3b8"
						strokeWidth="0.7"
						strokeDasharray="2 2"
						strokeOpacity="0.4"
					/>
					<path
						d={g.missing.crossLine1}
						fill="none"
						stroke="#dc2626"
						strokeWidth="2.8"
						strokeLinecap="round"
						vectorEffect="non-scaling-stroke"
					/>
					<path
						d={g.missing.crossLine2}
						fill="none"
						stroke="#dc2626"
						strokeWidth="2.8"
						strokeLinecap="round"
						vectorEffect="non-scaling-stroke"
					/>
				</g>
			)}
		</g>
	);
};
