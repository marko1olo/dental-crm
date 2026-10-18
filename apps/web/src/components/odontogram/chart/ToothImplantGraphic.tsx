import type React from "react";
import type { ToothState } from "./toothChartTypes";
import type { ToothVisualProps } from "./ToothColors";
import { UpperImplantGraphic } from "./implant/UpperImplantGraphic";
import { LowerImplantGraphic } from "./implant/LowerImplantGraphic";

export interface ToothImplantGraphicProps {
	number: number;
	state: ToothState;
	scaledWidth: string;
	scaledHeight: string;
	transform: string;
	cfg: { viewX: number; viewWidth: number; viewHeight: number };
	geom: { crown: string };
	colors: ToothVisualProps;
	isTop: boolean;
}

export const ToothImplantGraphic: React.FC<ToothImplantGraphicProps> = ({
	number,
	state,
	scaledWidth,
	scaledHeight,
	transform,
	cfg,
	geom,
	colors,
	isTop,
}) => (
	<svg
		width={scaledWidth}
		height={scaledHeight}
		style={{ transform }}
		viewBox={`${cfg.viewX} 0 ${cfg.viewWidth} ${cfg.viewHeight}`}
		preserveAspectRatio="none"
		className={`tooth-svg-element ${
			colors.isPulsing ? "animate-pulse stroke-[2.5px]" : ""
		}`}
	>
		<title>{`Имплант зуба ${number}`}</title>
		<g className="tooth-group-implant">
			{/* Titanium Threaded Fixture with SLA Microgrooves & Helical Threads */}
			{isTop ? <UpperImplantGraphic /> : <LowerImplantGraphic />}

			{/* Restorative Crown on Abutment */}
			<path
				d={geom.crown}
				fill={colors.crownFill}
				stroke={colors.stroke}
				strokeWidth="2.2"
				strokeLinejoin="round"
			/>

			{/* Planned Surgical Trajectory Guideline if planned */}
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
