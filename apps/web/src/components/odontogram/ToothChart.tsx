import { Settings } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { getToothConfig, getToothPath } from "../../utils/math/toothGeometry";

export type ToothState =
	| "Caries"
	| "Pulpitis"
	| "Missing"
	| "Crown"
	| "Implant"
	| "Filled"
	| "Healthy"
	| "Planned_Implant";

export interface ToothData {
	toothNumber: number;
	state: ToothState;
	surfaces?: string[];
}

export interface ToothChartProps {
	teethData: ToothData[];
	pediatricMode?: boolean;
	selectedTeeth?: number[];
	onToothClick: (num: number, rect: DOMRect, surface?: string) => void;
	useSurfaces?: boolean | undefined;
}

const TOP_TEETH = [
	18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
];
const BOTTOM_TEETH = [
	48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38,
];
const PEDIATRIC_TOP_TEETH = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65];
const PEDIATRIC_BOTTOM_TEETH = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75];

const FULL_ARCH_WIDTH = 960; // Extra breathing room to prevent any possible subpixel flexbox overflow

const getToothColors = (state: ToothState) => {
	switch (state) {
		case "Healthy":
			return {
				fill: "var(--tooth-crown-fill)",
				stroke: "var(--tooth-root-stroke)",
				opacity: "1",
			};
		case "Caries":
			return { fill: "#ef4444", stroke: "#b91c1c", opacity: "1" };
		case "Pulpitis":
			return { fill: "#a855f7", stroke: "#7e22ce", opacity: "1" };
		case "Missing":
			return {
				fill: "var(--odontogram-paper)",
				stroke: "var(--tooth-root-stroke)",
				opacity: "0.2",
			};
		case "Crown":
			return { fill: "#60a5fa", stroke: "#2563eb", opacity: "1" };
		case "Filled":
			return { fill: "#2dd4bf", stroke: "#0f766e", opacity: "1" };
		case "Planned_Implant":
			return {
				fill: "#fde047",
				stroke: "#eab308",
				opacity: "1",
				isPulsing: true,
			};
		case "Implant":
			return { fill: "#fbbf24", stroke: "#d97706", opacity: "1" };
		default:
			return {
				fill: "var(--odontogram-paper)",
				stroke: "var(--tooth-root-stroke)",
				opacity: "1",
			};
	}
};

const ToothSVG = ({
	number,
	state,
	scale,
	isSelected,
	onClick,
	surfaces,
	useSurfaces,
}: {
	number: number;
	state: ToothState;
	scale: number;
	isSelected?: boolean;
	onClick: (e: React.MouseEvent, num: number, surface?: string) => void;
	surfaces?: string[] | undefined;
	useSurfaces?: boolean | undefined;
}) => {
	const isTop = number < 30 || (number >= 51 && number <= 65);
	const geom = getToothPath(number);
	const cfg = getToothConfig(number);
	const colors = getToothColors(state);

	const scaledWidth = cfg.width;
	const scaledHeight = cfg.height;

	const isRightSide =
		(number >= 21 && number <= 28) || (number >= 31 && number <= 38);
	const transform = `scaleX(${isRightSide ? -1 : 1})`;

	const renderImplant = () => (
		<svg
			width={scaledWidth}
			height={scaledHeight}
			style={{ transform }}
			viewBox={`${cfg.viewX} 0 ${cfg.viewWidth} ${cfg.viewHeight}`}
			preserveAspectRatio="none"
			className={
				colors.isPulsing
					? "animate-pulse drop-shadow-[0_0_8px_rgba(253,224,71,0.5)]"
					: ""
			}
		>
			<g>
				<path
					d={geom.root}
					fill="var(--tooth-root-fill, #e2e8f0)"
					stroke={colors.stroke}
					strokeWidth="2"
					strokeLinejoin="round"
				/>
				<path
					d={geom.crown}
					fill={colors.fill}
					stroke={colors.stroke}
					strokeWidth="2.2"
					strokeLinejoin="round"
				/>
				<line
					x1="25"
					y1="60"
					x2="75"
					y2="60"
					stroke={colors.stroke}
					strokeWidth="2"
				/>
				<line
					x1="30"
					y1="80"
					x2="70"
					y2="80"
					stroke={colors.stroke}
					strokeWidth="2"
				/>
				<line
					x1="35"
					y1="100"
					x2="65"
					y2="100"
					stroke={colors.stroke}
					strokeWidth="2"
				/>
			</g>
		</svg>
	);

	const renderStandard = () => (
		<svg
			width={scaledWidth}
			height={scaledHeight}
			style={{ transform }}
			viewBox={`${cfg.viewX} 0 ${cfg.viewWidth} ${cfg.viewHeight}`}
			preserveAspectRatio="none"
			className={
				colors.isPulsing
					? "animate-pulse drop-shadow-[0_0_8px_rgba(253,224,71,0.5)]"
					: ""
			}
		>
			<g>
				<path
					d={geom.root}
					fill="var(--tooth-root-fill, #e2e8f0)"
					stroke="var(--tooth-root-stroke, #94a3b8)"
					strokeWidth="1.5"
					strokeLinejoin="round"
				/>
				{geom.canals && state === "Filled" && (
					<path
						d={geom.canals}
						fill="none"
						stroke="#14b8a6"
						strokeWidth="2.5"
						strokeLinecap="round"
						opacity="0.85"
					/>
				)}
				<path
					d={geom.crown}
					fill={colors.fill}
					fillOpacity={colors.opacity}
					stroke={colors.stroke}
					strokeWidth="2.2"
					strokeLinejoin="round"
				/>
				{geom.fissures && (
					<path
						d={geom.fissures}
						fill="none"
						stroke="rgba(0,0,0,0.3)"
						strokeWidth="0.8"
					/>
				)}
				
				
				{/* Interactive Surfaces */}
				{useSurfaces && (
					<g transform={`translate(${cfg.viewX + cfg.viewWidth / 2 - 12}, 25)`} stroke="rgba(255,255,255,0.7)" strokeWidth="0.5">
					<polygon 
						points="8,8 16,8 16,16 8,16" 
						fill={surfaces?.includes("O") ? "#ef4444" : "transparent"} 
						style={{ cursor: "pointer", transition: "fill 0.2s" }}
						onMouseEnter={(e) => { if(!surfaces?.includes("O")) e.currentTarget.style.fill = "rgba(239, 68, 68, 0.3)" }}
						onMouseLeave={(e) => { if(!surfaces?.includes("O")) e.currentTarget.style.fill = "transparent" }}
						onClick={(e) => { e.stopPropagation(); onClick(e, number, "O"); }}
					/>
					<polygon 
						points="0,0 24,0 16,8 8,8" 
						fill={surfaces?.includes("V") || surfaces?.includes("B") ? "#ef4444" : "transparent"} 
						style={{ cursor: "pointer", transition: "fill 0.2s" }}
						onMouseEnter={(e) => { if(!(surfaces?.includes("V") || surfaces?.includes("B"))) e.currentTarget.style.fill = "rgba(239, 68, 68, 0.3)" }}
						onMouseLeave={(e) => { if(!(surfaces?.includes("V") || surfaces?.includes("B"))) e.currentTarget.style.fill = "transparent" }}
						onClick={(e) => { e.stopPropagation(); onClick(e, number, isTop ? "V" : "V"); }}
					/>
					<polygon 
						points="8,16 16,16 24,24 0,24" 
						fill={surfaces?.includes("L") || surfaces?.includes("P") ? "#ef4444" : "transparent"} 
						style={{ cursor: "pointer", transition: "fill 0.2s" }}
						onMouseEnter={(e) => { if(!(surfaces?.includes("L") || surfaces?.includes("P"))) e.currentTarget.style.fill = "rgba(239, 68, 68, 0.3)" }}
						onMouseLeave={(e) => { if(!(surfaces?.includes("L") || surfaces?.includes("P"))) e.currentTarget.style.fill = "transparent" }}
						onClick={(e) => { e.stopPropagation(); onClick(e, number, isTop ? "P" : "L"); }}
					/>
					<polygon 
						points="0,0 8,8 8,16 0,24" 
						fill={surfaces?.includes("M") ? "#ef4444" : "transparent"} 
						style={{ cursor: "pointer", transition: "fill 0.2s" }}
						onMouseEnter={(e) => { if(!surfaces?.includes("M")) e.currentTarget.style.fill = "rgba(239, 68, 68, 0.3)" }}
						onMouseLeave={(e) => { if(!surfaces?.includes("M")) e.currentTarget.style.fill = "transparent" }}
						onClick={(e) => { e.stopPropagation(); onClick(e, number, "M"); }}
					/>
					<polygon 
						points="24,0 24,24 16,16 16,8" 
						fill={surfaces?.includes("D") ? "#ef4444" : "transparent"} 
						style={{ cursor: "pointer", transition: "fill 0.2s" }}
						onMouseEnter={(e) => { if(!surfaces?.includes("D")) e.currentTarget.style.fill = "rgba(239, 68, 68, 0.3)" }}
						onMouseLeave={(e) => { if(!surfaces?.includes("D")) e.currentTarget.style.fill = "transparent" }}
						onClick={(e) => { e.stopPropagation(); onClick(e, number, "D"); }}
					/>
					</g>
				)}
			</g>
		</svg>
	);

	return (
		<div
			className={`tooth-svg-wrapper ${isTop ? "top" : "bottom"} ${isSelected ? "selected" : ""}`}
			data-tooth-id={number}
			onClick={(e) => onClick(e, number)}
			style={
				isSelected
					? {
							outline: "2px solid #10b981",
							outlineOffset: "2px",
							borderRadius: "8px",
							background: "rgba(16, 185, 129, 0.1)",
						}
					: {}
			}
		>
			{isTop && (
				<span
					className="tooth-number"
					style={{ fontSize: scale < 0.85 ? "10px" : undefined }}
				>
					{number}
				</span>
			)}
			{state === "Implant" || state === "Planned_Implant"
				? renderImplant()
				: renderStandard()}
			{!isTop && (
				<span
					className="tooth-number"
					style={{ fontSize: scale < 0.85 ? "10px" : undefined }}
				>
					{number}
				</span>
			)}
		</div>
	);
};

export const ToothChart: React.FC<ToothChartProps> = ({
	teethData,
	pediatricMode,
	selectedTeeth = [],
	onToothClick,
	useSurfaces,
}) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const archContainerRef = useRef<HTMLDivElement>(null);

	const handleToothClick = (e: React.MouseEvent, num: number, surface?: string) => {
		const rect = e.currentTarget.getBoundingClientRect();
		onToothClick(num, rect, surface);
	};

	const getToothState = (num: number) =>
		teethData.find((t) => t.toothNumber === num)?.state || "Healthy";

	const topTeeth = pediatricMode ? PEDIATRIC_TOP_TEETH : TOP_TEETH;
	const bottomTeeth = pediatricMode ? PEDIATRIC_BOTTOM_TEETH : BOTTOM_TEETH;

	return (
		<div className="tooth-chart-container" ref={containerRef}>
			<div className="tooth-chart-header">
				<h2 className="tooth-chart-title">
					<Settings size={18} className="text-zinc-400" />
					Зубная формула (FDI)
				</h2>
				<div className="tooth-chart-legend">
					<span className="tooth-chart-legend-item">
						<div className="w-2.5 h-2.5 rounded-full bg-red-500"></div> Кариес
					</span>
					<span className="tooth-chart-legend-item">
						<div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>{" "}
						Имплант
					</span>
					<span className="tooth-chart-legend-item">
						<div className="w-2.5 h-2.5 rounded-full bg-blue-400"></div> Коронка
					</span>
					<span className="tooth-chart-legend-item">
						<div className="w-2.5 h-2.5 rounded-full bg-yellow-300 animate-pulse shadow-[0_0_5px_#fde047]"></div>{" "}
						План
					</span>
				</div>
			</div>

			<div className="tooth-chart-arch-container" ref={archContainerRef}>
				<div
					style={{
						minWidth: "max-content",
						margin: "0 auto",
						position: "relative",
					}}
				>
					<div className="teeth-row top-row">
						{topTeeth.map((num) => {
							const tData = teethData.find((t) => t.toothNumber === num);
							return (
								<ToothSVG
									key={num}
									number={num}
									scale={1}
									state={tData ? tData.state : "Healthy"}
									surfaces={tData?.surfaces}
									useSurfaces={useSurfaces}
									isSelected={selectedTeeth.includes(num)}
									onClick={handleToothClick}
								/>
							);
						})}
					</div>

					<div className="teeth-divider">
						<div className="divider-line" />
						<div className="divider-center" />
					</div>

					<div className="teeth-row bottom-row">
						{bottomTeeth.map((num) => {
							const tData = teethData.find((t) => t.toothNumber === num);
							return (
								<ToothSVG
									key={num}
									number={num}
									scale={1}
									state={tData ? tData.state : "Healthy"}
									surfaces={tData?.surfaces}
									useSurfaces={useSurfaces}
									isSelected={selectedTeeth.includes(num)}
									onClick={handleToothClick}
								/>
							);
						})}
					</div>
				</div>
			</div>
		</div>
	);
};
