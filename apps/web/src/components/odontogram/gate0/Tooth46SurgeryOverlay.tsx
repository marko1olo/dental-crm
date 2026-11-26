import React from "react";
import { Tooth46GingivalCuff } from "./Tooth46GingivalCuff";
import { Tooth46ImplantFixture } from "./Tooth46ImplantFixture";
import { Tooth46ImplantSuprastructure } from "./Tooth46ImplantSuprastructure";
import { TOOTH46_PATHOLOGY_GEOMETRY } from "./Tooth46PathologyGeometry";
import type { ImplantStage } from "./tooth46Types";
import { scopeOdontogramId, useOdontogramIdPrefix, useToothNumber } from "./OdontogramSharedDefsContext";

export interface Tooth46SurgeryOverlayProps {
	showImplant?: boolean | undefined;
	implantStage?: ImplantStage | undefined;
	renderScrewAccessOnly?: boolean | undefined;
	showMissing?: boolean | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * DENTE Dental CRM — Surgical Overlays for Tooth 46
 * Grade-5 Titanium Implant, Gingival Cuff & Missing Tooth Extraction Cross.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth46SurgeryOverlay: React.FC<Tooth46SurgeryOverlayProps> = ({
	showImplant = false,
	implantStage = "pure",
	renderScrewAccessOnly = false,
	showMissing = false,
	isDark = false,
	className,
}) => {
	const tNum = useToothNumber() ?? 46;
	const prefix = useOdontogramIdPrefix();
	const sid = (id: string) => scopeOdontogramId(prefix, id);
	const g = TOOTH46_PATHOLOGY_GEOMETRY;

	if (renderScrewAccessOnly && showImplant) {
		return (
			<Tooth46ImplantSuprastructure
				stage={implantStage}
				renderScrewAccessOnly
				className={className}
			/>
		);
	}

	return (
		<g id={sid(`tooth${tNum}-surgical-overlays`)} className={className}>
			{showImplant && (
				<g
					id={sid(`tooth${tNum}-titanium-implant`)}
					data-testid="tooth46-implant"
					data-stage={implantStage}
				>
					<Tooth46ImplantFixture />
					<Tooth46ImplantSuprastructure stage={implantStage} />
					<Tooth46GingivalCuff stage={implantStage} isDark={isDark} />
				</g>
			)}
			{showMissing && (
				<g id={sid(`tooth${tNum}-missing-cross`)} data-testid="tooth46-missing">
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
