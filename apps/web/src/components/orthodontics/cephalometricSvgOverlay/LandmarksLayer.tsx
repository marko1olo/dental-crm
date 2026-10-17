import React from "react";
import { CEPHALOMETRIC_LANDMARKS, type LandmarkKey, type LandmarkMap } from "../cephalometricMath";

const OFFSETS: Record<string, { dx: number; dy: number; align?: "start" | "middle" | "end" }> = {
	S: { dx: -30, dy: -14, align: "end" },
	N: { dx: 18, dy: -10, align: "start" },
	Or: { dx: 18, dy: 16, align: "start" },
	Po: { dx: -34, dy: -12, align: "end" },
	ANS: { dx: 18, dy: -6, align: "start" },
	PNS: { dx: -40, dy: -4, align: "end" },
	A: { dx: 18, dy: 2, align: "start" },
	B: { dx: 18, dy: 0, align: "start" },
	Pog: { dx: 26, dy: -6, align: "start" },
	Gn: { dx: 26, dy: 18, align: "start" },
	Me: { dx: -6, dy: 30, align: "middle" },
	Go: { dx: -34, dy: 18, align: "end" },
	U1t: { dx: -42, dy: -16, align: "end" },
	U1a: { dx: -54, dy: -4, align: "end" },
	L1t: { dx: 26, dy: 14, align: "start" },
	L1a: { dx: -54, dy: 4, align: "end" },
};

interface LandmarksLayerProps {
	landmarks: LandmarkMap;
	showLabels: boolean;
	activeTargetKey: LandmarkKey | null;
	hoveredKey: LandmarkKey | null;
	draggingKey: LandmarkKey | null;
	onHoverKey: (key: LandmarkKey | null) => void;
	onStartDrag: (key: LandmarkKey) => void;
	onSelectTargetKey: (key: LandmarkKey | null) => void;
	onRemoveLandmark?: ((key: LandmarkKey) => void) | undefined;
}

export const LandmarksLayer: React.FC<LandmarksLayerProps> = ({
	landmarks, showLabels, activeTargetKey, hoveredKey, draggingKey,
	onHoverKey, onStartDrag, onSelectTargetKey, onRemoveLandmark,
}) => {
	return (
		<g className="landmarks-layer">
			{CEPHALOMETRIC_LANDMARKS.map((lm) => {
				const pt = landmarks[lm.key];
				if (!pt) return null;
				const isActive = activeTargetKey === lm.key;
				const isHovered = hoveredKey === lm.key;
				const isDragging = draggingKey === lm.key;
				const offset = OFFSETS[lm.key] ?? { dx: 16, dy: 4, align: "start" };
				const targetX = pt.x + offset.dx;
				const targetY = pt.y + offset.dy;
				const badgeWidth = Math.max(22, lm.code.length * 7.5 + 8);
				const badgeHeight = 18;
				const badgeX = offset.align === "end" ? targetX - badgeWidth : offset.align === "middle" ? targetX - badgeWidth / 2 : targetX;
				const badgeY = targetY - badgeHeight / 2;
				const leaderEndX = offset.align === "end" ? badgeX + badgeWidth : offset.align === "middle" ? targetX : badgeX;

				return (
					<g
						key={lm.key}
						className="landmark-handle cursor-pointer"
						onMouseEnter={() => onHoverKey(lm.key)}
						onMouseLeave={() => onHoverKey(null)}
						onMouseDown={(e) => { e.stopPropagation(); onStartDrag(lm.key); onSelectTargetKey(lm.key); }}
						onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onRemoveLandmark?.(lm.key); }}
					>
						{showLabels && Math.hypot(offset.dx, offset.dy) > 16 && (
							<line x1={pt.x} y1={pt.y} x2={leaderEndX} y2={targetY} stroke={lm.color} strokeWidth="1.2" strokeDasharray="2 2" opacity="0.85" pointerEvents="none" />
						)}
						<circle cx={pt.x} cy={pt.y} r={22} fill="transparent" className="touch-hit-area" />
						{(isActive || isHovered || isDragging) && (
							<circle cx={pt.x} cy={pt.y} r={isDragging ? 20 : 16} fill="none" stroke={lm.color} strokeWidth="2.5" className="animate-ping opacity-75" />
						)}
						<circle cx={pt.x} cy={pt.y} r={isHovered || isDragging ? 10 : 8} fill={lm.color} fillOpacity="0.3" stroke={lm.color} strokeWidth="2" />
						<circle cx={pt.x} cy={pt.y} r={isHovered || isDragging ? 5 : 4} fill={lm.color} stroke="#ffffff" strokeWidth="2" />
						{showLabels && (
							<g className="landmark-label-badge pointer-events-none select-none">
								<rect x={badgeX} y={badgeY} width={badgeWidth} height={badgeHeight} rx={4} fill="rgba(15, 23, 42, 0.88)" stroke={isActive || isHovered || isDragging ? lm.color : "rgba(255, 255, 255, 0.3)"} strokeWidth={isActive || isHovered || isDragging ? "1.6" : "0.8"} />
								<text x={badgeX + badgeWidth / 2} y={targetY + 0.5} fill={isActive || isHovered || isDragging ? "#38bdf8" : "#ffffff"} fontSize={isHovered || isActive ? "12" : "11"} fontWeight="bold" fontFamily="ui-monospace, monospace" textAnchor="middle" dominantBaseline="central">
									{lm.code}
								</text>
							</g>
						)}
					</g>
				);
			})}
		</g>
	);
};
