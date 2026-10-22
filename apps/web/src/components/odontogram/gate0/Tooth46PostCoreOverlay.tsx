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
	const ferruleStroke = isDark
		? "rgba(203, 213, 225, 0.60)"
		: "rgba(71, 85, 105, 0.45)";
	const chamferStroke = isDark
		? "rgba(148, 163, 184, 0.85)"
		: "rgba(100, 116, 139, 0.70)";

	return (
		<g id="tooth46-post-core-assembly" className={className}>
			{/* Natural Prepared Tooth Ferrule Collar (1.5-2mm above CEJ) */}
			<path
				id="tooth46-prep-ferrule"
				d={g.ferruleCollar}
				fill="url(#dente-root-dentin)"
				stroke={ferruleStroke}
				strokeWidth="0.8"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>
			{/* Circular Chamfer Margin Finish Line */}
			<path
				id="tooth46-prep-chamfer-margin"
				d={g.chamferMarginLine}
				fill="none"
				stroke={chamferStroke}
				strokeWidth="0.7"
				strokeLinecap="round"
				vectorEffect="non-scaling-stroke"
			/>

			{type === "cast" ? (
				<g id="tooth46-cast-post-core" data-testid="tooth46-post-core-cast">
					<path
						d={g.castPostCore.mesialPin}
						fill="url(#dente-crown-metal)"
						stroke={isDark ? "#94a3b8" : "#475569"}
						strokeWidth="0.6"
						strokeLinejoin="round"
						vectorEffect="non-scaling-stroke"
					/>
					<path
						d={g.castPostCore.distalPost}
						fill="url(#dente-crown-metal)"
						stroke={isDark ? "#94a3b8" : "#475569"}
						strokeWidth="0.6"
						strokeLinejoin="round"
						vectorEffect="non-scaling-stroke"
					/>
					<path
						d={g.castPostCore.coreStump}
						fill="url(#dente-crown-metal)"
						stroke={isDark ? "#94a3b8" : "#475569"}
						strokeWidth="0.8"
						strokeLinejoin="round"
						vectorEffect="non-scaling-stroke"
					/>
				</g>
			) : (
				<g id="tooth46-fiber-post-core" data-testid="tooth46-post-core-fiber">
					<path
						d={g.fiberPostCore.postShaft}
						fill="url(#dente-fiber-post)"
						stroke="rgba(148, 163, 184, 0.85)"
						strokeWidth="0.6"
						strokeLinejoin="round"
						vectorEffect="non-scaling-stroke"
					/>
					<path
						d={g.fiberPostCore.coreStump}
						fill="url(#dente-composite-core)"
						stroke="rgba(2, 132, 199, 0.90)"
						strokeWidth="0.7"
						strokeDasharray="2.5 1.5"
						strokeLinejoin="round"
						vectorEffect="non-scaling-stroke"
					/>
				</g>
			)}
		</g>
	);
};
