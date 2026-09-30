/**
 * DENTE Dental CRM — Anatomical Implant SVG Renderer
 *
 * Renders titanium SLA fixture with crestal microgrooves, self-tapping helical threads,
 * internal hex connector, TiN transgingival abutment collar, and restorative crown.
 */

import React from "react";
import type { ToothState, ToothVisualProps } from "./ToothChart";
import type { AnatomicalToothGeometry } from "./anatomicalToothGeometries";

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
				{isTop ? (
					<g className="implant-upper-fixture">
						{/* Tapered Titanium SLA Fixture */}
						<path
							d="M 28 85 L 34 25 Q 50 12 66 25 L 72 85 Z"
							fill="url(#titanium-implant-gradient)"
							stroke="#334155"
							strokeWidth="1.8"
							strokeLinejoin="round"
						/>
						{/* Crestal Micro-grooves */}
						<rect
							x="29"
							y="80"
							width="42"
							height="4"
							fill="url(#implant-microgrooves-pattern)"
						/>
						<line
							x1="28.5"
							y1="82"
							x2="71.5"
							y2="82"
							stroke="#94a3b8"
							strokeWidth="1"
							strokeDasharray="2 2"
						/>

						{/* Self-Tapping Helical Thread Ridges */}
						<line x1="36" y1="31" x2="64" y2="33" stroke="#f1f5f9" strokeWidth="1.5" />
						<line x1="36" y1="32.5" x2="64" y2="34.5" stroke="#1e293b" strokeWidth="1.2" />
						<line x1="34" y1="43" x2="66" y2="45" stroke="#f1f5f9" strokeWidth="1.5" />
						<line x1="34" y1="44.5" x2="66" y2="46.5" stroke="#1e293b" strokeWidth="1.2" />
						<line x1="32" y1="55" x2="68" y2="57" stroke="#f1f5f9" strokeWidth="1.5" />
						<line x1="32" y1="56.5" x2="68" y2="58.5" stroke="#1e293b" strokeWidth="1.2" />
						<line x1="30" y1="67" x2="70" y2="69" stroke="#f1f5f9" strokeWidth="1.5" />
						<line x1="30" y1="68.5" x2="70" y2="70.5" stroke="#1e293b" strokeWidth="1.2" />
						<line x1="29" y1="77" x2="71" y2="79" stroke="#f1f5f9" strokeWidth="1.5" />
						<line x1="29" y1="78.5" x2="71" y2="80.5" stroke="#1e293b" strokeWidth="1.2" />

						{/* Apical Vent Cutting Flute Slot */}
						<path
							d="M 46 14 L 50 28 L 54 14"
							stroke="#1e293b"
							strokeWidth="1.6"
							fill="none"
							strokeLinecap="round"
						/>

						{/* Internal Hex Connector */}
						<polygon
							points="44,83 56,83 60,86 56,89 44,89 40,86"
							fill="url(#implant-hex-gradient)"
							stroke="#475569"
							strokeWidth="0.8"
						/>
						{/* Gold/TiN Transgingival Abutment Collar */}
						<rect
							x="27"
							y="83"
							width="46"
							height="6"
							rx="2"
							fill="url(#gold-crown-gradient)"
							stroke="#b45309"
							strokeWidth="1.2"
						/>
					</g>
				) : (
					<g className="implant-lower-fixture">
						{/* Tapered Titanium SLA Fixture */}
						<path
							d="M 28 75 L 34 135 Q 50 148 66 135 L 72 75 Z"
							fill="url(#titanium-implant-gradient)"
							stroke="#334155"
							strokeWidth="1.8"
							strokeLinejoin="round"
						/>
						{/* Crestal Micro-grooves */}
						<rect
							x="29"
							y="76"
							width="42"
							height="4"
							fill="url(#implant-microgrooves-pattern)"
						/>
						<line
							x1="28.5"
							y1="78"
							x2="71.5"
							y2="78"
							stroke="#94a3b8"
							strokeWidth="1"
							strokeDasharray="2 2"
						/>

						{/* Self-Tapping Helical Thread Ridges */}
						<line x1="29" y1="81" x2="71" y2="83" stroke="#f1f5f9" strokeWidth="1.5" />
						<line x1="29" y1="82.5" x2="71" y2="84.5" stroke="#1e293b" strokeWidth="1.2" />
						<line x1="30" y1="93" x2="70" y2="95" stroke="#f1f5f9" strokeWidth="1.5" />
						<line x1="30" y1="94.5" x2="70" y2="96.5" stroke="#1e293b" strokeWidth="1.2" />
						<line x1="32" y1="105" x2="68" y2="107" stroke="#f1f5f9" strokeWidth="1.5" />
						<line x1="32" y1="106.5" x2="68" y2="108.5" stroke="#1e293b" strokeWidth="1.2" />
						<line x1="34" y1="117" x2="66" y2="119" stroke="#f1f5f9" strokeWidth="1.5" />
						<line x1="34" y1="118.5" x2="66" y2="120.5" stroke="#1e293b" strokeWidth="1.2" />
						<line x1="36" y1="129" x2="64" y2="131" stroke="#f1f5f9" strokeWidth="1.5" />
						<line x1="36" y1="130.5" x2="64" y2="132.5" stroke="#1e293b" strokeWidth="1.2" />

						{/* Apical Vent Cutting Flute Slot */}
						<path
							d="M 46 146 L 50 132 L 54 146"
							stroke="#1e293b"
							strokeWidth="1.6"
							fill="none"
							strokeLinecap="round"
						/>

						{/* Internal Hex Connector */}
						<polygon
							points="44,71 56,71 60,68 56,65 44,65 40,68"
							fill="url(#implant-hex-gradient)"
							stroke="#475569"
							strokeWidth="0.8"
						/>
						{/* Gold/TiN Transgingival Abutment Collar */}
						<rect
							x="27"
							y="71"
							width="46"
							height="6"
							rx="2"
							fill="url(#gold-crown-gradient)"
							stroke="#b45309"
							strokeWidth="1.2"
						/>
					</g>
				)}

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
