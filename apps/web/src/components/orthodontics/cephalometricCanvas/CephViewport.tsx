import React from "react";
import type { LandmarkKey, LandmarkMap, Point2D } from "../cephalometricMath";
import type { XrayFilterMode } from "../CephalometricHudStrip";
import { CephalometricSvgOverlay } from "../CephalometricSvgOverlay";
import { getXrayFilterStyle } from "./cephFilterStyles";
import { VIEWBOX_WIDTH, VIEWBOX_HEIGHT } from "./types";

interface CephViewportProps {
	imageUrl: string;
	pan: Point2D;
	zoom: number;
	brightness: number;
	contrast: number;
	filterMode: XrayFilterMode;
	landmarks: LandmarkMap;
	showPlanes: boolean;
	showPolygon: boolean;
	showLabels: boolean;
	calibrationPoints: Point2D[];
	activeTargetKey: LandmarkKey | null;
	hoveredKey: LandmarkKey | null;
	draggingKey: LandmarkKey | null;
	onHoverKey: (key: LandmarkKey | null) => void;
	onStartDrag: (key: LandmarkKey) => void;
	onSelectTargetKey: (key: LandmarkKey | null) => void;
	onRemoveLandmark?: ((key: LandmarkKey) => void) | undefined;
	svgRef: React.RefObject<SVGSVGElement | null>;
}

export const CephViewport: React.FC<CephViewportProps> = ({
	imageUrl,
	pan,
	zoom,
	brightness,
	contrast,
	filterMode,
	landmarks,
	showPlanes,
	showPolygon,
	showLabels,
	calibrationPoints,
	activeTargetKey,
	hoveredKey,
	draggingKey,
	onHoverKey,
	onStartDrag,
	onSelectTargetKey,
	onRemoveLandmark,
	svgRef,
}) => {
	return (
		<div
			className="relative transition-transform duration-75 origin-center"
			style={{
				transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
				width: VIEWBOX_WIDTH,
				height: VIEWBOX_HEIGHT,
			}}
		>
			<div
				className="absolute inset-0 w-full h-full rounded-xl overflow-hidden bg-slate-900"
				style={getXrayFilterStyle(brightness, contrast, filterMode)}
			>
				<img
					src={imageUrl}
					alt="Lateral Cephalogram X-Ray (ТРГ боковая)"
					loading="lazy"
					decoding="async"
					className="w-full h-full object-contain pointer-events-none"
				/>
			</div>

			<CephalometricSvgOverlay
				landmarks={landmarks}
				showPlanes={showPlanes}
				showPolygon={showPolygon}
				showLabels={showLabels}
				calibrationPoints={calibrationPoints}
				activeTargetKey={activeTargetKey}
				hoveredKey={hoveredKey}
				draggingKey={draggingKey}
				onHoverKey={onHoverKey}
				onStartDrag={onStartDrag}
				onSelectTargetKey={onSelectTargetKey}
				onRemoveLandmark={onRemoveLandmark}
				viewBoxWidth={VIEWBOX_WIDTH}
				viewBoxHeight={VIEWBOX_HEIGHT}
				svgRef={svgRef}
			/>
		</div>
	);
};
