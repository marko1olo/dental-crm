import React from "react";
import { TOOTH46_POST_CORE_GEOMETRY } from "../../Tooth46PostCoreGeometry";
import type { PostCoreType } from "../../tooth46Types";
import { scopeOdontogramId, useOdontogramIdPrefix, useToothNumber } from "../../OdontogramSharedDefsContext";

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
	const tNum = useToothNumber() ?? 46;
	const prefix = useOdontogramIdPrefix();
	const sid = (id: string) => scopeOdontogramId(prefix, id);
	const rootFill = `url(#${sid("dente-root-dentin")})`;
	const metalFill = `url(#${sid("dente-crown-metal")})`;
	const g = TOOTH46_POST_CORE_GEOMETRY;
	const ferruleStroke = isDark
		? "rgba(203, 213, 225, 0.60)"
		: "rgba(71, 85, 105, 0.45)";
	const chamferStroke = isDark
		? "rgba(148, 163, 184, 0.85)"
		: "rgba(100, 116, 139, 0.70)";

	return (
		<g id={sid(`tooth${tNum}-post-core-assembly`)} className={className}>
			{/* Natural Prepared Tooth Ferrule Collar (1.5-2mm above CEJ) */}
			<path
				id={sid(`tooth${tNum}-prep-ferrule`)}
				d={g.ferruleCollar}
				fill={rootFill}
				stroke={ferruleStroke}
				strokeWidth="0.8"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>
			{/* Circular Chamfer Margin Finish Line */}
			<path
				id={sid(`tooth${tNum}-prep-chamfer-margin`)}
				d={g.chamferMarginLine}
				fill="none"
				stroke={chamferStroke}
				strokeWidth="0.7"
				strokeLinecap="round"
				vectorEffect="non-scaling-stroke"
			/>

			{type === "cast" ? (
				<g id={sid(`tooth${tNum}-cast-post-core`)} data-testid="tooth46-post-core-cast">
					<path
						d={g.castPostCore.mesialPin}
						fill={metalFill}
						stroke={isDark ? "#94a3b8" : "#475569"}
						strokeWidth="0.6"
						strokeLinejoin="round"
						vectorEffect="non-scaling-stroke"
					/>
					<path
						d={g.castPostCore.distalPost}
						fill={metalFill}
						stroke={isDark ? "#94a3b8" : "#475569"}
						strokeWidth="0.6"
						strokeLinejoin="round"
						vectorEffect="non-scaling-stroke"
					/>
					<path
						d={g.castPostCore.coreStump}
						fill={metalFill}
						stroke={isDark ? "#94a3b8" : "#475569"}
						strokeWidth="0.8"
						strokeLinejoin="round"
						vectorEffect="non-scaling-stroke"
					/>
				</g>
			) : (
				<g id={sid(`tooth${tNum}-fiber-post-core`)} data-testid="tooth46-post-core-fiber">
					<path
						d={g.fiberPostCore.postShaft}
						fill={`url(#${sid("dente-fiber-post")})`}
						stroke="rgba(148, 163, 184, 0.85)"
						strokeWidth="0.6"
						strokeLinejoin="round"
						vectorEffect="non-scaling-stroke"
					/>
					<path
						d={g.fiberPostCore.coreStump}
						fill={`url(#${sid("dente-composite-core")})`}
						stroke={isDark ? "rgba(245, 158, 11, 0.85)" : "rgba(180, 83, 9, 0.85)"}
						strokeWidth="0.75"
						strokeLinejoin="round"
						vectorEffect="non-scaling-stroke"
					/>
				</g>
			)}
		</g>
	);
};
