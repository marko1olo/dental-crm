import React from "react";
import { scopeOdontogramId, useOdontogramIdPrefix, useToothNumber } from "./OdontogramSharedDefsContext";
import { TOOTH46_PATHOLOGY_GEOMETRY } from "./Tooth46PathologyGeometry";
import type { ImplantStage } from "./tooth46Types";

export interface Tooth46AbutmentOverlayProps {
	stage: Extract<ImplantStage, "crown" | "crown_screw" | "temporary">;
}

/**
 * Custom prosthetic & temporary abutments inside crowns for Tooth 46
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth46AbutmentOverlay: React.FC<Tooth46AbutmentOverlayProps> = ({
	stage,
}) => {
	const tNum = useToothNumber() ?? 46;
	const prefix = useOdontogramIdPrefix();
	const sid = (id: string) => scopeOdontogramId(prefix, id);
	const collarFill = `url(#${sid("dente-titanium-collar")})`;
	const abutmentFill = `url(#${sid("dente-titanium-abutment")})`;
	const imp = TOOTH46_PATHOLOGY_GEOMETRY.implant;

	if (stage === "crown") {
		return (
			<g id={sid(`tooth${tNum}-custom-abutment`)} data-component="implant-custom-abutment">
				<path
					d={imp.standardAbutment.shoulder}
					fill={collarFill}
					stroke="#475569"
					strokeWidth="0.6"
				/>
				<path
					d={imp.standardAbutment.stump}
					fill={abutmentFill}
					stroke="#334155"
					strokeWidth="0.8"
				/>
				<path
					d={imp.standardAbutment.finishLine}
					fill="none"
					stroke="#1e293b"
					strokeWidth="0.75"
				/>
				<path
					d={imp.standardAbutment.screwTunnel}
					fill="#1e293b"
					opacity="0.3"
				/>
			</g>
		);
	}

	if (stage === "crown_screw") {
		return (
			<g
				id={sid(`tooth${tNum}-screw-abutment`)}
				data-component="implant-screw-retained-abutment"
			>
				<path
					d={imp.standardAbutment.shoulder}
					fill={collarFill}
					stroke="#475569"
					strokeWidth="0.6"
				/>
				<path
					d={imp.standardAbutment.stump}
					fill={abutmentFill}
					stroke="#334155"
					strokeWidth="0.8"
				/>
				<path
					d={imp.standardAbutment.finishLine}
					fill="none"
					stroke="#1e293b"
					strokeWidth="0.75"
				/>
				<path
					d={imp.screwAccessHole.shaftTunnel}
					stroke="#334155"
					strokeWidth="0.75"
					strokeDasharray="1.5 1.5"
					opacity="0.45"
				/>
			</g>
		);
	}

	return (
		<g id={sid(`tooth${tNum}-temp-abutment`)} data-component="implant-temporary-abutment">
			<path
				d={imp.temporaryAbutment.shoulder}
				fill={collarFill}
				stroke="#475569"
				strokeWidth="0.6"
			/>
			<path
				d={imp.temporaryAbutment.stump}
				fill={abutmentFill}
				stroke="#334155"
				strokeWidth="0.8"
			/>
			{imp.temporaryAbutment.retentionGrooves.map((rg) => (
				<path key={rg} d={rg} stroke="#475569" strokeWidth="0.6" />
			))}
		</g>
	);
};
