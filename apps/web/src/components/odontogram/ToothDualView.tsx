import React, { useMemo } from "react";
import type { ToothData, ToothState } from "./ToothChart";
import {
	getToothTransform,
	getLateralPath,
	getOcclusalPath,
	getToothDisplayConfig,
	getCanalObturationClipConfig,
	isUpperTooth,
	isDeciduousTooth,
	PERIAPICAL_LESION_SIZES,
	PATTERN_DEFINITIONS,
} from "./ToothSVGPaths";

export interface ToothDualViewProps {
	tooth: ToothData;
	selected?: boolean;
	readonly?: boolean;
	showLateral?: boolean;
	showOcclusal?: boolean;
	onSurfaceClick?: (surface: "O" | "V" | "L" | "M" | "D", toothNumber: number) => void;
	onToothClick?: (toothNumber: number) => void;
	className?: string;
}

export const ToothDualView: React.FC<ToothDualViewProps> = ({
	tooth,
	selected = false,
	readonly = false,
	showLateral = true,
	showOcclusal = true,
	onSurfaceClick,
	onToothClick,
	className = "",
}) => {
	const toothNumber = tooth.toothNumber;
	const isUpper = isUpperTooth(toothNumber);
	const isDeciduous = isDeciduousTooth(toothNumber);
	const toothTransform = useMemo(() => getToothTransform(toothNumber), [toothNumber]);
	const lateralPaths = useMemo(() => getLateralPath(toothNumber), [toothNumber]);
	const occlusalPaths = useMemo(() => getOcclusalPath(toothNumber), [toothNumber]);
	const displayConfig = useMemo(() => getToothDisplayConfig(toothNumber), [toothNumber]);

	// Bridge Pontic: missing natural root, floating prosthetic crown
	const isBridgePontic = tooth.bridgeRole === "pontic";
	const isBridgePillar = tooth.bridgeRole === "pillar";
	const isMissing = tooth.state === "Missing" && !isBridgePontic;

	// Dimensions for lateral SVG
	const lateralDimensions = useMemo(() => {
		const vb = lateralPaths.viewBox.split(" ").map(Number);
		const vbWidth = vb[2] || 60;
		const vbHeight = vb[3] || 130;
		const aspectRatio = vbWidth / vbHeight;
		const baseWidth = 55;
		const displayWidth = Math.round(baseWidth * displayConfig.scale);
		const displayHeight = Math.round(displayWidth / aspectRatio);
		return { displayWidth, displayHeight, vbWidth, vbHeight };
	}, [lateralPaths.viewBox, displayConfig.scale]);

	// Canal obturation clipPath config
	const canalClipConfig = useMemo(() => {
		return getCanalObturationClipConfig(toothNumber, tooth.canalObturationLevel);
	}, [toothNumber, tooth.canalObturationLevel]);

	// Periapical lesion size (small: 6px, medium: 10px, large: 16px)
	const lesionRadius = useMemo(() => {
		if (typeof tooth.periapicalLesionSize === "number") {
			return tooth.periapicalLesionSize;
		}
		if (tooth.periapicalLesionSize) {
			return PERIAPICAL_LESION_SIZES[tooth.periapicalLesionSize] ?? 6;
		}
		return tooth.periapicalLesion ? 6 : null;
	}, [tooth.periapicalLesionSize, tooth.periapicalLesion]);

	// Color resolution based on tooth state
	const colors = useMemo(() => {
		switch (tooth.state) {
			case "Caries":
				return {
					crownFill: "#fee2e2",
					crownStroke: "#ef4444",
					rootFill: "#fff1f2",
					rootStroke: "#f87171",
					pulpFill: "#dc2626",
				};
			case "Pulpitis":
				return {
					crownFill: "#fee2e2",
					crownStroke: "#dc2626",
					rootFill: "#fff1f2",
					rootStroke: "#dc2626",
					pulpFill: "#dc2626",
				};
			case "Periodontitis":
				return {
					crownFill: "#ffedd5",
					crownStroke: "#ea580c",
					rootFill: "#fff7ed",
					rootStroke: "#f97316",
					pulpFill: "#ea580c",
				};
			case "Filled":
				return {
					crownFill: "#e0f2fe",
					crownStroke: "#0284c7",
					rootFill: "#f8fafc",
					rootStroke: "#64748b",
					pulpFill: "#e2e8f0",
				};
			case "Crown":
				return {
					crownFill: isBridgePontic ? "#dbeafe" : "#fef3c7",
					crownStroke: isBridgePontic ? "#2563eb" : "#d97706",
					rootFill: "#f8fafc",
					rootStroke: "#64748b",
					pulpFill: "#e2e8f0",
				};
			case "Implant":
			case "Planned_Implant":
				return {
					crownFill: "#f1f5f9",
					crownStroke: "#475569",
					rootFill: "#cbd5e1",
					rootStroke: "#334155",
					pulpFill: "#94a3b8",
				};
			case "Missing":
				return {
					crownFill: "transparent",
					crownStroke: "#94a3b8",
					rootFill: "transparent",
					rootStroke: "#94a3b8",
					pulpFill: "transparent",
				};
			default:
				return {
					crownFill: isBridgePontic ? "#dbeafe" : "#ffffff",
					crownStroke: isBridgePontic ? "#2563eb" : "#64748b",
					rootFill: "#f8fafc",
					rootStroke: "#64748b",
					pulpFill: "#fee2e2",
				};
		}
	}, [tooth.state, isBridgePontic]);

	const opacity = isMissing ? 0.3 : 1.0;
	const anchors = lateralPaths.anchors;

	return (
		<div
			className={`tooth-dual-view flex flex-col items-center select-none transition-all p-1 rounded-lg ${
				selected ? "ring-2 ring-blue-500 bg-blue-50/50 dark:bg-blue-950/30" : "hover:bg-slate-100/50 dark:hover:bg-slate-800/40"
			} ${className}`}
			onClick={() => onToothClick?.(toothNumber)}
			role="button"
			tabIndex={0}
			aria-label={`Зуб ${toothNumber}`}
		>
			{/* Lateral Projection View */}
			{showLateral && (
				<div
					className="lateral-view-wrapper flex items-center justify-center relative"
					style={{
						height: `${displayConfig.displayHeight}px`,
						width: `${Math.max(lateralDimensions.displayWidth, 36)}px`,
					}}
				>
					<svg
						width={lateralDimensions.displayWidth}
						height={lateralDimensions.displayHeight}
						viewBox={lateralPaths.viewBox}
						className="lateral-svg-element"
						style={{
							transform: toothTransform,
							transformOrigin: "center center",
							opacity,
						}}
					>
						<defs>
							{canalClipConfig.needsClip && (
								<clipPath id={canalClipConfig.clipId}>
									<rect
										x={canalClipConfig.x}
										y={canalClipConfig.y}
										width={canalClipConfig.width}
										height={canalClipConfig.height}
									/>
								</clipPath>
							)}
						</defs>

						{/* Roots (hidden if tooth is pontic) */}
						{!isBridgePontic && (
							<g className="lateral-roots-layer">
								{lateralPaths.root && (
									<path
										d={lateralPaths.root}
										fill={colors.rootFill}
										stroke={colors.rootStroke}
										strokeWidth="0.8"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
								)}
								{lateralPaths.roots?.map((rPath, idx) => (
									<path
										key={`root-${idx}`}
										d={rPath}
										fill={colors.rootFill}
										stroke={colors.rootStroke}
										strokeWidth="0.8"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
								))}
							</g>
						)}

						{/* Pulp Chamber & Canals with clipPath obturation */}
						{!isBridgePontic && lateralPaths.pulp && (
							<g className="lateral-pulp-layer">
								{/* Pulp Outline */}
								<path
									d={lateralPaths.pulp}
									fill="none"
									stroke="rgba(225, 29, 72, 0.4)"
									strokeWidth="0.6"
								/>
								{/* Pulp Fill with optional clipPath */}
								<path
									d={lateralPaths.pulp}
									fill={
										tooth.canalObturation === "bioceramic"
											? "#0d9488"
											: tooth.canalObturation === "calcium_hydroxide"
												? "#ca8a04"
												: tooth.canalObturation === "gutta_percha"
													? "#e11d48"
													: colors.pulpFill
									}
									fillOpacity="0.85"
									stroke="none"
									clipPath={canalClipConfig.needsClip ? `url(#${canalClipConfig.clipId})` : undefined}
								/>
							</g>
						)}

						{/* Post in canal */}
						{tooth.hasPost && anchors && (
							<g className="lateral-post-layer">
								<rect
									x={anchors.rootCenter.x - 1.5}
									y={anchors.rootCenter.y - 12}
									width="3"
									height="22"
									rx="1"
									fill="#64748b"
									stroke="#334155"
									strokeWidth="0.5"
								/>
							</g>
						)}

						{/* Crown */}
						<g className="lateral-crown-layer">
							<path
								d={lateralPaths.crown}
								fill={isBridgePontic ? "#93c5fd" : colors.crownFill}
								fillOpacity={isBridgePontic ? "0.9" : "1"}
								stroke={isBridgePontic ? "#2563eb" : colors.crownStroke}
								strokeWidth={isBridgePontic || isBridgePillar ? "1.2" : "0.8"}
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
							{/* Pontic Hygienic Clearance Indicator */}
							{isBridgePontic && (
								<path
									d={`M ${anchors.crownCenter.x - 12},${anchors.crownCenter.y - 18} Q ${anchors.crownCenter.x},${anchors.crownCenter.y - 12} ${anchors.crownCenter.x + 12},${anchors.crownCenter.y - 18}`}
									fill="none"
									stroke="#2563eb"
									strokeWidth="1.2"
									strokeLinecap="round"
								/>
							)}
						</g>

						{/* Lateral Pathology: Periapical Lesion at Apex */}
						{lesionRadius !== null && anchors && !isBridgePontic && (
							<circle
								cx={anchors.apex.x}
								cy={anchors.apex.y}
								r={lesionRadius}
								fill="#ea580c"
								fillOpacity="0.75"
								stroke="#c2410c"
								strokeWidth="1"
								className="animate-pulse"
							/>
						)}

						{/* Lateral Pathology: Crown Fracture Zigzag */}
						{tooth.hasFracture && anchors && (
							<path
								d={`M ${anchors.crownCenter.x - 4},${anchors.crownCenter.y - 12} L ${anchors.crownCenter.x + 1},${anchors.crownCenter.y - 6} L ${anchors.crownCenter.x - 2},${anchors.crownCenter.y} L ${anchors.crownCenter.x + 3},${anchors.crownCenter.y + 6} L ${anchors.crownCenter.x - 1},${anchors.crownCenter.y + 12}`}
								fill="none"
								stroke="#dc2626"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						)}

						{/* Lateral Pathology: Apicoectomy line at apex */}
						{tooth.hasApicoectomy && anchors && !isBridgePontic && (
							<line
								x1={anchors.apex.x - 12}
								y1={anchors.apex.y + 2}
								x2={anchors.apex.x + 12}
								y2={anchors.apex.y + 2}
								stroke="#dc2626"
								strokeWidth="2.5"
								strokeLinecap="round"
							/>
						)}
					</svg>
				</div>
			)}

			{/* Occlusal / Cenital View (5-Surfaces with Napkin Midline Alignment) */}
			{showOcclusal && (
				<div className="occlusal-view-wrapper mt-1">
					<svg
						width="38"
						height="38"
						viewBox="0 0 50 50"
						className="occlusal-svg-element"
						style={{
							transform: toothTransform,
							transformOrigin: "center center",
							opacity,
						}}
					>
						{/* Background Circle */}
						<circle cx="25" cy="25" r="22" fill="#ffffff" stroke="#94a3b8" strokeWidth="1" />

						{/* 5 Surfaces: O, V, L, M, D */}
						{(["O", "V", "L", "M", "D"] as const).map((sKey) => {
							const isActive = tooth.surfaces?.includes(sKey);
							return (
								<path
									key={`surf-${sKey}`}
									d={occlusalPaths.surfaces[sKey]}
									fill={
										isActive
											? "#3b82f6"
											: tooth.state === "Caries"
												? "#fecaca"
												: tooth.state === "Filled"
													? "#bfdbfe"
													: "#f8fafc"
									}
									stroke="#64748b"
									strokeWidth="0.8"
									className={`transition-colors ${!readonly ? "cursor-pointer hover:fill-blue-300 dark:hover:fill-blue-700" : ""}`}
									onClick={(e) => {
										if (readonly) return;
										e.stopPropagation();
										onSurfaceClick?.(sKey, toothNumber);
									}}
								>
									<title>{`Поверхность ${sKey} зуба ${toothNumber}`}</title>
								</path>
							);
						})}

						{/* Radial Dividers */}
						{occlusalPaths.highlight.map((dLine, idx) => (
							<path
								key={`div-${idx}`}
								d={dLine}
								fill="none"
								stroke="#cbd5e1"
								strokeWidth="0.8"
								pointerEvents="none"
							/>
						))}
					</svg>
				</div>
			)}

			{/* Tooth Number & Status Indicator */}
			<div className="text-[11px] font-semibold mt-1 text-slate-700 dark:text-slate-300">
				{toothNumber}
				{isBridgePontic && <span className="text-[9px] text-blue-600 dark:text-blue-400 ml-0.5 font-bold">[П]</span>}
				{isBridgePillar && <span className="text-[9px] text-amber-600 dark:text-amber-400 ml-0.5 font-bold">[О]</span>}
			</div>
		</div>
	);
};
