import React from "react";
import { scopeOdontogramId, useOdontogramIdPrefix, useToothNumber } from "./OdontogramSharedDefsContext";
import { Tooth46AbutmentOverlay } from "./Tooth46AbutmentOverlay";
import { TOOTH46_PATHOLOGY_GEOMETRY } from "./Tooth46PathologyGeometry";
import { Tooth46ScrewAccessPlug } from "./Tooth46ScrewAccessPlug";
import type { ImplantStage } from "./tooth46Types";

export interface Tooth46ImplantSuprastructureProps {
	stage: ImplantStage;
	renderScrewAccessOnly?: boolean | undefined;
	className?: string | undefined;
}

/**
 * DENTE Dental CRM — Authentic Titanium Suprastructures for Tooth 46
 * Cover screw, healing abutment (hex socket), custom abutment, screw shaft, temporary.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth46ImplantSuprastructure: React.FC<
	Tooth46ImplantSuprastructureProps
> = ({ stage, renderScrewAccessOnly = false, className }) => {
	const tNum = useToothNumber() ?? 46;
	const prefix = useOdontogramIdPrefix();
	const sid = (id: string) => scopeOdontogramId(prefix, id);
	const collarFill = `url(#${sid("dente-titanium-collar")})`;
	const abutmentFill = `url(#${sid("dente-titanium-abutment")})`;
	const imp = TOOTH46_PATHOLOGY_GEOMETRY.implant;

	if (renderScrewAccessOnly) {
		return <Tooth46ScrewAccessPlug className={className} />;
	}

	return (
		<g id={sid(`tooth${tNum}-implant-suprastructure-group`)} className={className}>
			{stage === "pure" && (
				<g id={sid(`tooth${tNum}-cover-screw`)} data-component="implant-cover-screw">
					<path
						d={imp.coverScrew.cap}
						fill={collarFill}
						stroke="#334155"
						strokeWidth="0.7"
					/>
					<path
						d={imp.coverScrew.hexSlot}
						fill="#1e293b"
						stroke="#0f172a"
						strokeWidth="0.5"
					/>
					<path
						d={imp.coverScrew.centerSlot}
						stroke="#475569"
						strokeWidth="0.6"
					/>
				</g>
			)}
			{stage === "healing_abutment" && (
				<g
					id={sid(`tooth${tNum}-healing-abutment`)}
					data-component="implant-healing-abutment"
				>
					<path
						d={imp.healingAbutment.body}
						data-component="implant-abutment"
						fill={abutmentFill}
						stroke="#334155"
						strokeWidth="0.8"
					/>
					<path
						d={imp.healingAbutment.topCap}
						fill={collarFill}
						opacity="0.6"
					/>
					<path
						d={imp.healingAbutment.hexSocket}
						fill="#1e293b"
						stroke="#0f172a"
						strokeWidth="0.5"
					/>
					<path
						d={imp.healingAbutment.specularHighlight}
						fill="none"
						stroke="#ffffff"
						strokeWidth="0.9"
						strokeOpacity="0.75"
						strokeLinecap="round"
					/>
				</g>
			)}
			{(stage === "crown" ||
				stage === "crown_screw" ||
				stage === "temporary") && <Tooth46AbutmentOverlay stage={stage} />}
		</g>
	);
};
