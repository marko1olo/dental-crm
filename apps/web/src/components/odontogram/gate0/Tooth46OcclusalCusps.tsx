import type React from "react";
import {
	TOOTH46_GEOMETRY,
	type Tooth46CuspDef,
} from "./tooth46GeometryConstants";

export interface Tooth46OcclusalCuspsProps {
	showCusps?: boolean;
	showFissures?: boolean;
	renderBaseCrown?: boolean;
	isDark?: boolean;
	className?: string;
}

const renderCusp = (c: Tooth46CuspDef) => (
	<g key={c.id} id={`cusp-${c.id}`}>
		<path d={c.mesialSlope} fill="url(#dente-ridge-highlight)" opacity="0.45" />
		<path d={c.distalSlope} fill="url(#dente-fossa-shadow)" opacity="0.55" />
		<path
			d={c.ridgePath}
			fill="none"
			stroke="url(#dente-ridge-highlight)"
			strokeWidth="1.2"
			strokeLinecap="round"
			vectorEffect="non-scaling-stroke"
		/>
		{/* Pearlescent cusp apex specular sheen */}
		<circle cx={c.apex.x} cy={c.apex.y} r="1.2" fill="#ffffff" opacity="0.85" />
	</g>
);

export const Tooth46OcclusalCusps: React.FC<Tooth46OcclusalCuspsProps> = ({
	showCusps = true,
	showFissures = true,
	renderBaseCrown = true,
	isDark = false,
	className,
}) => {
	const stroke = isDark
		? "rgba(203, 213, 225, 0.70)"
		: "rgba(71, 85, 105, 0.45)";
	const fShadow = isDark ? "rgba(15, 23, 42, 0.92)" : "rgba(51, 65, 85, 0.60)";
	const fCore = isDark
		? "rgba(203, 213, 225, 0.85)"
		: "rgba(71, 85, 105, 0.80)";
	const f = TOOTH46_GEOMETRY.fissures;
	const fissures = [
		{ id: "cnt", d: f.sulcusCentralis },
		{ id: "mb", d: f.sulcusMesiobuccalis },
		{ id: "db", d: f.sulcusDistobuccalis },
		{ id: "lng", d: f.sulcusLingualis },
	];

	return (
		<g id="tooth46-crown" className={className}>
			{renderBaseCrown && (
				<path
					d={TOOTH46_GEOMETRY.crownMonolithPath}
					fill="url(#dente-enamel-porcelain)"
					stroke={stroke}
					strokeWidth="0.8"
					strokeLinejoin="round"
					vectorEffect="non-scaling-stroke"
				/>
			)}

			{/* Buccal Cervical Bulge Ridge (Vestibular 3D convexity in cervical third) */}
			<path
				d={TOOTH46_GEOMETRY.buccalCervicalRidge}
				fill="url(#dente-cervical-ridge)"
				opacity="0.35"
				clipPath="url(#tooth46-crown-clip)"
				pointerEvents="none"
			/>

			{/* True anatomical occlusal basin (replaces primitive ellipse) */}
			<path
				d={TOOTH46_GEOMETRY.occlusalBasinPath}
				fill="url(#dente-fossa-shadow)"
				clipPath="url(#tooth46-crown-clip)"
				pointerEvents="none"
			/>

			{showCusps && (
				<g id="tooth46-cusp-ridges" clipPath="url(#tooth46-crown-clip)">
					{TOOTH46_GEOMETRY.cusps.map(renderCusp)}
				</g>
			)}

			{showFissures && (
				<g id="tooth46-fissures" clipPath="url(#tooth46-crown-clip)">
					{fissures.map((item) => (
						<path
							key={`s-${item.id}`}
							d={item.d}
							fill="none"
							stroke={fShadow}
							strokeWidth="1.3"
							strokeLinecap="round"
							vectorEffect="non-scaling-stroke"
						/>
					))}
					{fissures.map((item) => (
						<path
							key={`c-${item.id}`}
							d={item.d}
							fill="none"
							stroke={fCore}
							strokeWidth="0.6"
							strokeLinecap="round"
							vectorEffect="non-scaling-stroke"
						/>
					))}
				</g>
			)}
		</g>
	);
};
