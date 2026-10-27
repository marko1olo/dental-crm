import React from "react";
import { Tooth46SurgeryOverlay, type Tooth46SurgeryOverlayProps } from "./Tooth46SurgeryOverlay";

export type ToothUpperSurgeryOverlayProps = Tooth46SurgeryOverlayProps;

/**
 * DENTE Dental CRM — Surgical Overlays for Upper Jaw (Maxilla) Teeth (11..18).
 * Inverted Grade-5 Titanium Implant fixture (into maxillary bone Y=85->13),
 * emergence profile through crest, and extraction cross.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const ToothUpperSurgeryOverlay: React.FC<ToothUpperSurgeryOverlayProps> = ({
	showImplant = false,
	implantStage = "pure",
	renderScrewAccessOnly = false,
	showMissing = false,
	isDark = false,
	className,
}) => {
	return (
		<g
			id="tooth-upper-surgical-overlays"
			transform="translate(0, 158) scale(1, -1)"
			className={className}
		>
			<Tooth46SurgeryOverlay
				showImplant={showImplant}
				implantStage={implantStage}
				renderScrewAccessOnly={renderScrewAccessOnly}
				showMissing={showMissing}
				isDark={isDark}
			/>
		</g>
	);
};
