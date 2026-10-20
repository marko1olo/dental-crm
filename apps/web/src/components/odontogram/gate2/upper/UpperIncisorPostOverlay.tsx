import type React from "react";

export interface UpperIncisorPostOverlayProps {
	postShaftPath: string;
	coreStumpPath: string;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * DENTE Dental CRM — Maxillary Incisor Straight-Canal Fiber Post & Core Overlay
 * Translucent quartz fiberglass post in straight canal with coronal composite core.
 * Mandate 8b <= 120 lines.
 */
export const UpperIncisorPostOverlay: React.FC<UpperIncisorPostOverlayProps> = ({
	postShaftPath,
	coreStumpPath,
	isDark = false,
	className,
}) => {
	const postFill = isDark ? "rgba(186, 230, 253, 0.75)" : "rgba(224, 242, 254, 0.85)";
	const postStroke = isDark ? "#38bdf8" : "#0284c7";
	const coreFill = isDark ? "rgba(14, 165, 233, 0.35)" : "rgba(56, 189, 248, 0.30)";

	return (
		<g
			id="upper-incisor-post-core-overlay"
			data-post-type="fiberglass"
			className={className}
		>
			<path
				id="fiber-post-shaft"
				d={postShaftPath}
				fill={postFill}
				stroke={postStroke}
				strokeWidth="0.6"
			/>
			<path
				id="composite-core-stump"
				d={coreStumpPath}
				fill={coreFill}
				stroke={postStroke}
				strokeWidth="0.7"
				strokeDasharray="2.5 1.5"
			/>
		</g>
	);
};
