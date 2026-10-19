import type React from "react";
import { DENTE_SHADER_IDS } from "../defs/shaderConstants";
import type { CanalPostProps } from "../types/canalPostTypes";

/**
 * Universal Canal Post & Core Overlay.
 * Supports translucent quartz fiberglass post, cast cobalt-chromium, or cast gold post-and-core.
 * Mandate 8b <= 120 lines.
 */
export const CanalPostOverlay: React.FC<CanalPostProps> = ({
	postShaftPath,
	coreStumpPath,
	material = "fiber",
	trajectories,
	className,
}) => {
	const s = DENTE_SHADER_IDS;

	const postFill =
		material === "gold_cast"
			? `url(#${s.crownGold})`
			: material === "metal_cast"
				? `url(#${s.titaniumBody})`
				: `url(#${s.fiberPost})`;

	const postStroke =
		material === "gold_cast"
			? "rgba(180, 83, 9, 0.75)"
			: material === "metal_cast"
				? "#475569"
				: "rgba(148, 163, 184, 0.80)";

	const coreFill =
		material === "gold_cast"
			? `url(#${s.crownGold})`
			: material === "metal_cast"
				? `url(#${s.titaniumBody})`
				: `url(#${s.compositeCore})`;

	const coreStroke =
		material === "gold_cast"
			? "rgba(180, 83, 9, 0.85)"
			: material === "metal_cast"
				? "#334155"
				: "rgba(2, 132, 199, 0.90)";

	return (
		<g
			id="dente-canal-post-and-core"
			data-post-material={material}
			className={className}
		>
			{/* Primary Root Canal Post Shaft */}
			<path
				d={postShaftPath}
				fill={postFill}
				stroke={postStroke}
				strokeWidth="0.6"
				vectorEffect="non-scaling-stroke"
			/>

			{/* Additional Root Canal Trajectories in Multi-Rooted Teeth */}
			{trajectories?.map((t) => (
				<path
					key={`traj-${t.id}`}
					d={t.canalPath}
					fill={postFill}
					stroke={postStroke}
					strokeWidth="0.6"
					vectorEffect="non-scaling-stroke"
				/>
			))}

			{/* Coronal Core Build-up Stump */}
			{coreStumpPath && (
				<path
					d={coreStumpPath}
					fill={coreFill}
					stroke={coreStroke}
					strokeWidth="0.7"
					strokeDasharray={material === "fiber" ? "2.5 1.5" : "none"}
					vectorEffect="non-scaling-stroke"
				/>
			)}
		</g>
	);
};
