/**
 * DENTE Dental CRM — Anatomical Implant SVG Renderer
 * Compliant with Mandate 8b (<= 120 lines).
 */

import React from "react";
import type { ToothState, ToothVisualProps } from "./ToothChart";
import type { AnatomicalToothGeometry } from "./anatomicalToothGeometries";
import { UpperImplantFixture } from "./anatomicalImplant/UpperImplantFixture";
import { LowerImplantFixture } from "./anatomicalImplant/LowerImplantFixture";

export interface AnatomicalImplantSVGProps {
	number: number;
	state: ToothState;
	isTop: boolean;
	scaledWidth: string;
	scaledHeight: string;
	transform?: string | undefined;
	geom: AnatomicalToothGeometry;
	colors: ToothVisualProps;
}

export const AnatomicalImplantSVG: React.FC<AnatomicalImplantSVGProps> = ({
	number,
	state,
	isTop,
	scaledWidth,
	scaledHeight,
	transform,
	geom,
	colors,
}) => {
	return (
		<svg
			width={scaledWidth}
			height={scaledHeight}
			style={{ transform }}
			viewBox={`${geom.viewBox.x} ${geom.viewBox.y} ${geom.viewBox.width} ${geom.viewBox.height}`}
			preserveAspectRatio="none"
			className={`tooth-svg-element ${
				colors.isPulsing ? "animate-pulse stroke-[2.5px]" : ""
			}`}
		>
			<title>{`Имплант зуба ${number}`}</title>
			<g className="tooth-group-implant">
				{isTop ? <UpperImplantFixture /> : <LowerImplantFixture />}

				{/* Restorative Crown on Abutment */}
				<path
					d={geom.crownPath}
					fill={colors.crownFill}
					stroke={colors.stroke}
					strokeWidth="2.2"
					strokeLinejoin="round"
				/>

				{/* Planned Surgical Trajectory Guideline */}
				{state === "Planned_Implant" && (
					<line
						x1="50"
						y1="10"
						x2="50"
						y2="140"
						stroke="#64748b"
						strokeWidth="1.6"
						strokeDasharray="4 3"
						strokeLinecap="round"
					/>
				)}
			</g>
		</svg>
	);
};
