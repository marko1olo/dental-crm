import React from "react";
import {
	CEPHALOMETRIC_LANDMARKS,
	type LandmarkKey,
	type LandmarkMap,
	type Point2D,
	projectPointOntoLine,
} from "./cephalometricMath";

export interface CephalometricSvgOverlayProps {
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
	onRemoveLandmark?: (key: LandmarkKey) => void;
	viewBoxWidth: number;
	viewBoxHeight: number;
	svgRef: React.RefObject<SVGSVGElement | null>;
}

export function CephalometricSvgOverlay({
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
	viewBoxWidth,
	viewBoxHeight,
	svgRef,
}: CephalometricSvgOverlayProps) {
	const S = landmarks.S;
	const N = landmarks.N;
	const Or = landmarks.Or;
	const Po = landmarks.Po;
	const A = landmarks.A;
	const B = landmarks.B;
	const Pog = landmarks.Pog;
	const Gn = landmarks.Gn ?? landmarks.Me;
	const Me = landmarks.Me ?? landmarks.Gn;
	const Go = landmarks.Go;
	const ANS = landmarks.ANS;
	const PNS = landmarks.PNS;
	const U1t = landmarks.U1t;
	const U1a = landmarks.U1a;
	const L1t = landmarks.L1t;
	const L1a = landmarks.L1a;

	// Occlusal Plane points
	const opAnt: Point2D | null = U1t && L1t
		? { x: (U1t.x + L1t.x) / 2, y: (U1t.y + L1t.y) / 2 }
		: ANS && Me
			? { x: (ANS.x + Me.x) / 2, y: (ANS.y + Me.y) / 2 }
			: null;

	const opPost: Point2D | null = PNS && Go
		? { x: (PNS.x + Go.x) / 2, y: (PNS.y + Go.y) / 2 }
		: opAnt
			? { x: opAnt.x - 160, y: opAnt.y - 12 }
			: null;

	// Wits projections
	const projA = A && opPost && opAnt ? projectPointOntoLine(A, opPost, opAnt) : null;
	const projB = B && opPost && opAnt ? projectPointOntoLine(B, opPost, opAnt) : null;

	return (
		<svg
			ref={svgRef}
			viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
			className="absolute inset-0 w-full h-full overflow-visible pointer-events-auto"
		>
			{/* Planes and Guides */}
			{showPlanes && (
				<g className="planes-layer opacity-75">
					{/* S-N Line (Cranial Base) */}
					{S && N && (
						<line
							x1={S.x}
							y1={S.y}
							x2={N.x}
							y2={N.y}
							stroke="#06b6d4"
							strokeWidth="2.5"
							strokeDasharray="6 3"
						/>
					)}

					{/* Frankfort Horizontal Plane (Po - Or) */}
					{Po && Or && (
						<line
							x1={Po.x - 30}
							y1={Po.y}
							x2={Or.x + 60}
							y2={Or.y}
							stroke="#0284c7"
							strokeWidth="2"
							strokeDasharray="5 2.5"
						/>
					)}

					{/* Palatal Plane (PNS-ANS) */}
					{PNS && ANS && (
						<line
							x1={PNS.x}
							y1={PNS.y}
							x2={ANS.x}
							y2={ANS.y}
							stroke="#10b981"
							strokeWidth="2"
							strokeDasharray="4 2"
						/>
					)}

					{/* Mandibular Plane (Go-Me / Go-Gn) */}
					{Go && (Me || Gn) && (
						<line
							x1={Go.x}
							y1={Go.y}
							x2={(Me ?? Gn)!.x}
							y2={(Me ?? Gn)!.y}
							stroke="#f59e0b"
							strokeWidth="2.5"
							strokeDasharray="5 2.5"
						/>
					)}

					{/* Functional Occlusal Plane */}
					{opPost && opAnt && (
						<line
							x1={opPost.x}
							y1={opPost.y}
							x2={opAnt.x + 30}
							y2={opAnt.y}
							stroke="#a855f7"
							strokeWidth="1.8"
							strokeDasharray="3 3"
						/>
					)}

					{/* Downs Y-Axis Growth Line (S -> Gn) */}
					{S && (Gn || Me) && (
						<line
							x1={S.x}
							y1={S.y}
							x2={(Gn ?? Me)!.x}
							y2={(Gn ?? Me)!.y}
							stroke="#eab308"
							strokeWidth="1.5"
							strokeDasharray="4 2"
						/>
					)}

					{/* Wits Perpendicular Projection Drop Lines */}
					{projA && A && (
						<line
							x1={A.x}
							y1={A.y}
							x2={projA.x}
							y2={projA.y}
							stroke="#ec4899"
							strokeWidth="1.5"
							strokeDasharray="2 2"
						/>
					)}
					{projB && B && (
						<line
							x1={B.x}
							y1={B.y}
							x2={projB.x}
							y2={projB.y}
							stroke="#ec4899"
							strokeWidth="1.5"
							strokeDasharray="2 2"
						/>
					)}
				</g>
			)}

			{/* Cephalometric Polygon Lines (Steiner / Tweed / Downs Polygon) */}
			{showPolygon && (
				<g className="polygon-layer">
					{/* N-A Line */}
					{N && A && (
						<line
							x1={N.x}
							y1={N.y}
							x2={A.x}
							y2={A.y}
							stroke="#10b981"
							strokeWidth="2"
						/>
					)}

					{/* N-B Line */}
					{N && B && (
						<line
							x1={N.x}
							y1={N.y}
							x2={B.x}
							y2={B.y}
							stroke="#f59e0b"
							strokeWidth="2"
						/>
					)}

					{/* N-Pog Line (Downs Facial Plane) */}
					{N && Pog && (
						<line
							x1={N.x}
							y1={N.y}
							x2={Pog.x}
							y2={Pog.y}
							stroke="#e2e8f0"
							strokeWidth="1.8"
							strokeDasharray="4 2"
						/>
					)}

					{/* A-Pog Line (Downs Angle of Convexity segment) */}
					{A && Pog && (
						<line
							x1={A.x}
							y1={A.y}
							x2={Pog.x}
							y2={Pog.y}
							stroke="#34d399"
							strokeWidth="1.5"
							strokeDasharray="3 3"
						/>
					)}

					{/* A-B Line */}
					{A && B && (
						<line
							x1={A.x}
							y1={A.y}
							x2={B.x}
							y2={B.y}
							stroke="#f43f5e"
							strokeWidth="1.5"
							strokeDasharray="3 2"
						/>
					)}

					{/* S-Go Line (Posterior Face Height) */}
					{S && Go && (
						<line
							x1={S.x}
							y1={S.y}
							x2={Go.x}
							y2={Go.y}
							stroke="#06b6d4"
							strokeWidth="1.8"
						/>
					)}

					{/* Upper Incisor Axis (U1a - U1t) */}
					{U1a && U1t && (
						<line
							x1={U1a.x - (U1t.x - U1a.x) * 0.4}
							y1={U1a.y - (U1t.y - U1a.y) * 0.4}
							x2={U1t.x + (U1t.x - U1a.x) * 0.4}
							y2={U1t.y + (U1t.y - U1a.y) * 0.4}
							stroke="#ec4899"
							strokeWidth="2.5"
						/>
					)}

					{/* Lower Incisor Axis (L1a - L1t) */}
					{L1a && L1t && (
						<line
							x1={L1a.x - (L1t.x - L1a.x) * 0.4}
							y1={L1a.y - (L1t.y - L1a.y) * 0.4}
							x2={L1t.x + (L1t.x - L1a.x) * 0.4}
							y2={L1t.y + (L1t.y - L1a.y) * 0.4}
							stroke="#8b5cf6"
							strokeWidth="2.5"
						/>
					)}
				</g>
			)}

			{/* Calibration Line Rendering */}
			{calibrationPoints.map((pt, idx) => (
				<circle
					key={idx}
					cx={pt.x}
					cy={pt.y}
					r="6"
					fill="#f59e0b"
					stroke="#ffffff"
					strokeWidth="2"
				/>
			))}
			{calibrationPoints.length === 2 && calibrationPoints[0] && calibrationPoints[1] && (
				<line
					x1={calibrationPoints[0].x}
					y1={calibrationPoints[0].y}
					x2={calibrationPoints[1].x}
					y2={calibrationPoints[1].y}
					stroke="#f59e0b"
					strokeWidth="3"
				/>
			)}

			{/* Interactive Landmark Handles & Touch Pins (Target Area >= 44x44px) */}
			{CEPHALOMETRIC_LANDMARKS.map((lm) => {
				const pt = landmarks[lm.key];
				if (!pt) return null;

				const isActive = activeTargetKey === lm.key;
				const isHovered = hoveredKey === lm.key;
				const isDragging = draggingKey === lm.key;

				// Smart directional offsets to prevent label collision on chin and cranial base
				const offsets: Record<string, { dx: number; dy: number; align?: "start" | "middle" | "end" }> = {
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

				const offset = offsets[lm.key] ?? { dx: 16, dy: 4, align: "start" };
				const targetX = pt.x + offset.dx;
				const targetY = pt.y + offset.dy;
				const codeLength = lm.code.length;
				const badgeWidth = Math.max(22, codeLength * 7.5 + 8);
				const badgeHeight = 18;
				const badgeX =
					offset.align === "end"
						? targetX - badgeWidth
						: offset.align === "middle"
							? targetX - badgeWidth / 2
							: targetX;
				const badgeY = targetY - badgeHeight / 2;
				const textAnchorX = badgeX + badgeWidth / 2;
				const textAnchorY = targetY + 0.5;

				// Leader line anchor calculation
				const hasLeader = Math.hypot(offset.dx, offset.dy) > 16;
				const leaderEndX =
					offset.align === "end"
						? badgeX + badgeWidth
						: offset.align === "middle"
							? targetX
							: badgeX;
				const leaderEndY = targetY;

				return (
					<g
						key={lm.key}
						className="landmark-handle cursor-pointer"
						onMouseEnter={() => onHoverKey(lm.key)}
						onMouseLeave={() => onHoverKey(null)}
						onMouseDown={(e) => {
							e.stopPropagation();
							onStartDrag(lm.key);
							onSelectTargetKey(lm.key);
						}}
						onContextMenu={(e) => {
							e.preventDefault();
							e.stopPropagation();
							onRemoveLandmark?.(lm.key);
						}}
					>
						{/* Leader Line to avoid label collision */}
						{showLabels && hasLeader && (
							<line
								x1={pt.x}
								y1={pt.y}
								x2={leaderEndX}
								y2={leaderEndY}
								stroke={lm.color}
								strokeWidth="1.2"
								strokeDasharray="2 2"
								opacity="0.85"
								pointerEvents="none"
							/>
						)}

						{/* Invisible Touch Hit Area Circle: Radius 22px = 44px touch diameter (WCAG 2.1) */}
						<circle
							cx={pt.x}
							cy={pt.y}
							r={22}
							fill="transparent"
							className="touch-hit-area"
						/>

						{/* Pulsing Target Glow for active / hovered point */}
						{(isActive || isHovered || isDragging) && (
							<circle
								cx={pt.x}
								cy={pt.y}
								r={isDragging ? 20 : 16}
								fill="none"
								stroke={lm.color}
								strokeWidth="2.5"
								className="animate-ping opacity-75"
							/>
						)}

						{/* Outer Ring */}
						<circle
							cx={pt.x}
							cy={pt.y}
							r={isHovered || isDragging ? 10 : 8}
							fill={lm.color}
							fillOpacity="0.3"
							stroke={lm.color}
							strokeWidth="2"
						/>

						{/* Core Dot */}
						<circle
							cx={pt.x}
							cy={pt.y}
							r={isHovered || isDragging ? 5 : 4}
							fill={lm.color}
							stroke="#ffffff"
							strokeWidth="2"
						/>

						{/* Landmark Pill Badge with High-Contrast Text */}
						{showLabels && (
							<g className="landmark-label-badge pointer-events-none select-none">
								<rect
									x={badgeX}
									y={badgeY}
									width={badgeWidth}
									height={badgeHeight}
									rx={4}
									fill="rgba(15, 23, 42, 0.88)"
									stroke={isActive || isHovered || isDragging ? lm.color : "rgba(255, 255, 255, 0.3)"}
									strokeWidth={isActive || isHovered || isDragging ? "1.6" : "0.8"}
								/>
								<text
									x={textAnchorX}
									y={textAnchorY}
									fill={isActive || isHovered || isDragging ? "#38bdf8" : "#ffffff"}
									fontSize={isHovered || isActive ? "12" : "11"}
									fontWeight="bold"
									fontFamily="ui-monospace, monospace"
									textAnchor="middle"
									dominantBaseline="central"
								>
									{lm.code}
								</text>
							</g>
						)}
					</g>
				);
			})}
		</svg>
	);
}
