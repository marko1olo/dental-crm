import type React from "react";
import { MissingToothCrossOverlay } from "../../shared/overlays/MissingToothCrossOverlay";
import type { IncisorOverlaysGeometry } from "../types/upperIncisorGeometryTypes";
import type { UpperIncisorLayerFlags } from "../types/upperIncisorTypes";
import { UpperIncisorAbfractionOverlay } from "./UpperIncisorAbfractionOverlay";
import { UpperIncisorPostOverlay } from "./UpperIncisorPostOverlay";
import { UpperIncisorTraumaOverlay } from "./UpperIncisorTraumaOverlay";
import { UpperIncisorVeneerOverlay } from "./UpperIncisorVeneerOverlay";
import { UpperIncisorWearOverlay } from "./UpperIncisorWearOverlay";

export interface UpperIncisorOverlaysProps {
	layers: UpperIncisorLayerFlags;
	overlays: IncisorOverlaysGeometry;
	crownMonolithPath: string;
	rootMonolithPath: string;
	isDark?: boolean | undefined;
}

/**
 * DENTE Dental CRM — Maxillary Incisor Clinical Overlays Layer
 * Groups Veneer, Trauma, Wear, Abfraction, Post & Core, and Missing Overlays.
 * Mandate 8b <= 120 lines.
 */
export const UpperIncisorOverlays: React.FC<UpperIncisorOverlaysProps> = ({
	layers,
	overlays: o,
	crownMonolithPath,
	rootMonolithPath,
	isDark = false,
}) => {
	return (
		<g id="upper-incisor-overlays-group">
			{layers.veneer && (
				<UpperIncisorVeneerOverlay
					facingPath={o.veneerFacingPath}
					chamferMargin={o.veneerChamferMargin}
					incisalHalo={o.veneerIncisalHalo}
					shade={layers.veneerShade ?? "A1"}
					prepType={layers.veneerPrep ?? "chamfer"}
					isDark={isDark}
				/>
			)}
			{layers.trauma && layers.trauma !== "none" && (
				<UpperIncisorTraumaOverlay
					traumaType={layers.trauma}
					ellis2MesialPath={o.traumaEllis2Mesial}
					ellis2DistalPath={o.traumaEllis2Distal}
					ellis4LinePath={o.traumaEllis4Line}
					crownMonolithPath={crownMonolithPath}
					isDark={isDark}
				/>
			)}
			{Boolean(layers.wearDegree) && (
				<UpperIncisorWearOverlay
					degree={layers.wearDegree ?? 0}
					degree1Path={o.wearDegree1Path}
					degree2Path={o.wearDegree2Path}
					degree3Path={o.wearDegree3Path}
					isDark={isDark}
				/>
			)}
			{layers.abfraction && (
				<UpperIncisorAbfractionOverlay
					wedgePath={o.abfractionWedge}
					isDark={isDark}
				/>
			)}
			{layers.fiberPost && (
				<UpperIncisorPostOverlay
					postShaftPath={o.fiberPostShaft}
					coreStumpPath={o.compositeCoreStump}
					isDark={isDark}
				/>
			)}
			{layers.missing && (
				<MissingToothCrossOverlay ghostRootPath={rootMonolithPath} />
			)}
		</g>
	);
};
