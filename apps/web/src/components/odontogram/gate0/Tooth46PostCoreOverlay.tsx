import type React from "react";
import { TOOTH46_POST_CORE_GEOMETRY } from "./Tooth46PostCoreGeometry";
import type { PostCoreType } from "./tooth46Types";

export interface Tooth46PostCoreOverlayProps {
	type?: PostCoreType | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Endodontic / Orthopedic Post-and-Core Overlay for Tooth 46.
 * Supports:
 * 1. "cast": 2-root Cast metal post-and-core (КШВ: Co-Cr / Gold) with primary distal post + mesial anti-rotational pin.
 * 2. "fiber": Quartz fiberglass post (СВШ) with resin cement and composite core.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth46PostCoreOverlay: React.FC<Tooth46PostCoreOverlayProps> = ({
	type = "fiber",
	isDark = false,
	className,
}) => {
	const g = TOOTH46_POST_CORE_GEOMETRY;

	if (type === "cast") {
		const c = g.castPostCore;
		const castStroke = isDark ? "#94a3b8" : "#475569";
		return (
			<g
				id="tooth46-cast-post-core"
				data-testid="tooth46-post-core-cast"
				className={className}
			>
				{/* Auxiliary Mesial Anti-Rotational Pin */}
				<path
					d={c.mesialPin}
					fill="url(#dente-crown-metal)"
					stroke={castStroke}
					strokeWidth="0.6"
					strokeLinejoin="round"
					vectorEffect="non-scaling-stroke"
				/>
				{/* Primary Distal Canal Post */}
				<path
					d={c.distalPost}
					fill="url(#dente-crown-metal)"
					stroke={castStroke}
					strokeWidth="0.6"
					strokeLinejoin="round"
					vectorEffect="non-scaling-stroke"
				/>
				{/* Monolithic Cast Coronal Stump */}
				<path
					d={c.coreStump}
					fill="url(#dente-crown-metal)"
					stroke={castStroke}
					strokeWidth="0.8"
					strokeLinejoin="round"
					vectorEffect="non-scaling-stroke"
				/>
			</g>
		);
	}

	const f = g.fiberPostCore;
	return (
		<g
			id="tooth46-fiber-post-core"
			data-testid="tooth46-post-core-fiber"
			className={className}
		>
			{/* Translucent Quartz Fiberglass Post in Distal Canal */}
			<path
				d={f.postShaft}
				fill="url(#dente-fiber-post)"
				stroke="rgba(148, 163, 184, 0.85)"
				strokeWidth="0.6"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>
			{/* Nanohybrid Composite Core Stump */}
			<path
				d={f.coreStump}
				fill="url(#dente-composite-core)"
				stroke="rgba(2, 132, 199, 0.90)"
				strokeWidth="0.7"
				strokeDasharray="2.5 1.5"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>
		</g>
	);
};
