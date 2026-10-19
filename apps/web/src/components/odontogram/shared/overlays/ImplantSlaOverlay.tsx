import type React from "react";
import { DENTE_SHADER_IDS } from "../defs/shaderConstants";
import type { ImplantSlaProps } from "../types/implantTypes";

/**
 * Universal Grade-5 SLA Titanium Dental Implant Fixture Overlay.
 * Renders anatomical conical threaded fixture, polished micro-collar, and abutment.
 * Mandate 8b <= 120 lines.
 */
export const ImplantSlaOverlay: React.FC<ImplantSlaProps> = ({
	geometry,
	showAbutment = true,
	className,
}) => {
	const s = DENTE_SHADER_IDS;

	return (
		<g
			id="dente-titanium-implant-sla"
			className={className}
			data-implant-sla="true"
		>
			{/* Grade-5 SLA Sandblasted Titanium Fixture Body */}
			<path
				d={geometry.fixtureBodyPath}
				fill={`url(#${s.titaniumBody})`}
				stroke="#334155"
				strokeWidth="0.8"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>

			{/* Micro-Threaded Spiral Retention Rings */}
			{geometry.threads.map((threadD) => (
				<path
					key={`sla-thread-${threadD.slice(0, 32)}`}
					d={threadD}
					fill="none"
					stroke="#1e293b"
					strokeWidth="0.9"
					strokeLinecap="round"
					vectorEffect="non-scaling-stroke"
				/>
			))}

			{/* Machined Polished Cervical Micro-Collar */}
			<path
				d={geometry.collarPath}
				fill={`url(#${s.titaniumCollar})`}
				stroke="#475569"
				strokeWidth="0.6"
				vectorEffect="non-scaling-stroke"
			/>

			{/* Prosthetic Titanium Abutment with Drive Slot */}
			{showAbutment && (
				<path
					d={geometry.abutmentPath}
					fill={`url(#${s.titaniumAbutment})`}
					stroke="#334155"
					strokeWidth="0.7"
					strokeLinejoin="round"
					vectorEffect="non-scaling-stroke"
				/>
			)}
		</g>
	);
};
