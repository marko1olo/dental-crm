import { Sparkles } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import {
	DenteToothSvgDefs,
	type ToothData,
	type ToothState,
	TOOTH_STATE_LABELS,
	type ToothVisualProps,
} from "./ToothChart";
import { getToothConfig, getToothPath } from "../../utils/math/toothGeometry";

export interface AnatomicalSvgOdontogramProps {
	teethData: ToothData[];
	pediatricMode?: boolean | undefined;
	mixedDentition?: boolean | undefined;
	topTeeth?: number[] | undefined;
	bottomTeeth?: number[] | undefined;
	selectedTeeth?: number[] | undefined;
	onToothClick: (num: number, rect: DOMRect, surface?: string | undefined) => void;
	useSurfaces?: boolean | undefined;
	hideHeader?: boolean | undefined;
	hideLegend?: boolean | undefined;
	className?: string | undefined;
}

const TOP_TEETH = [
	18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
];
const BOTTOM_TEETH = [
	48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38,
];
const PEDIATRIC_TOP_TEETH = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65];
const PEDIATRIC_BOTTOM_TEETH = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75];
const MIXED_TOP_TEETH = [16, 55, 54, 53, 52, 51, 61, 62, 63, 64, 65, 26];
const MIXED_BOTTOM_TEETH = [46, 85, 84, 83, 82, 81, 71, 72, 73, 74, 75, 36];

const MIN_ARCH_SCALE = 0.5;

function scaleCssPx(value: string, factor: number): string {
	const parsed = Number.parseFloat(value);
	if (!Number.isFinite(parsed)) return value;
	return `${parsed * factor}px`;
}

const getAnatomicalToothColors = (state: ToothState): ToothVisualProps => {
	switch (state) {
		case "Healthy":
			return {
				fill: "url(#dente-enamel-healthy)",
				crownFill: "url(#dente-enamel-healthy)",
				rootFill: "url(#dente-root-dentin)",
				stroke: "var(--tooth-root-stroke, #94a3b8)",
				opacity: "1",
				badgeColor: "#10b981",
				badgeBg: "rgba(16, 185, 129, 0.12)",
				badgeText: "#059669",
			};
		case "Caries":
			return {
				fill: "url(#dente-caries-grad)",
				crownFill: "url(#dente-caries-grad)",
				rootFill: "url(#dente-root-dentin)",
				stroke: "#991b1b",
				opacity: "1",
				badgeColor: "#ef4444",
				badgeBg: "rgba(239, 68, 68, 0.15)",
				badgeText: "#b91c1c",
			};
		case "Pulpitis":
			return {
				fill: "url(#dente-pulpitis-grad)",
				crownFill: "url(#dente-pulpitis-grad)",
				rootFill: "url(#dente-root-dentin)",
				stroke: "#7e22ce",
				opacity: "1",
				badgeColor: "#a855f7",
				badgeBg: "rgba(168, 85, 247, 0.15)",
				badgeText: "#7e22ce",
			};
		case "Periodontitis":
			return {
				fill: "url(#dente-periodontitis-grad)",
				crownFill: "url(#dente-periodontitis-grad)",
				rootFill: "url(#dente-root-dentin)",
				stroke: "#c2410c",
				opacity: "1",
				badgeColor: "#f97316",
				badgeBg: "rgba(249, 115, 22, 0.15)",
				badgeText: "#c2410c",
			};
		case "Filled":
			return {
				fill: "url(#dente-filled-grad)",
				crownFill: "url(#dente-filled-grad)",
				rootFill: "url(#dente-root-dentin)",
				stroke: "#0f766e",
				opacity: "1",
				badgeColor: "#10b981",
				badgeBg: "rgba(16, 185, 129, 0.15)",
				badgeText: "#0f766e",
			};
		case "Crown":
			return {
				fill: "url(#dente-crown-zirconia)",
				crownFill: "url(#dente-crown-zirconia)",
				rootFill: "url(#dente-root-dentin)",
				stroke: "#1d4ed8",
				opacity: "1",
				badgeColor: "#3b82f6",
				badgeBg: "rgba(59, 130, 246, 0.15)",
				badgeText: "#1d4ed8",
			};
		case "Implant":
			return {
				fill: "url(#dente-implant-gold)",
				crownFill: "url(#dente-implant-gold)",
				rootFill: "url(#dente-implant-titanium)",
				stroke: "#b45309",
				opacity: "1",
				badgeColor: "#f59e0b",
				badgeBg: "rgba(245, 158, 11, 0.15)",
				badgeText: "#b45309",
			};
		case "Planned_Implant":
			return {
				fill: "url(#dente-implant-gold)",
				crownFill: "url(#dente-implant-gold)",
				rootFill: "url(#dente-implant-titanium)",
				stroke: "#6366f1",
				opacity: "1",
				isPulsing: true,
				badgeColor: "#6366f1",
				badgeBg: "rgba(99, 102, 241, 0.15)",
				badgeText: "#4f46e5",
			};
		case "Missing":
			return {
				fill: "var(--odontogram-surface)",
				crownFill: "none",
				rootFill: "none",
				stroke: "var(--tooth-root-stroke, #94a3b8)",
				opacity: "0.28",
				isMissing: true,
				badgeColor: "#94a3b8",
				badgeBg: "rgba(148, 163, 184, 0.15)",
				badgeText: "#64748b",
			};
		default:
			return {
				fill: "url(#dente-enamel-healthy)",
				crownFill: "url(#dente-enamel-healthy)",
				rootFill: "url(#dente-root-dentin)",
				stroke: "var(--tooth-root-stroke, #94a3b8)",
				opacity: "1",
				badgeColor: "#10b981",
				badgeBg: "rgba(16, 185, 129, 0.12)",
				badgeText: "#059669",
			};
	}
};

const AnatomicalToothSVG = ({
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
	const colors = getAnatomicalToothColors(state);

	const scaledWidth = scaleCssPx(cfg.width, scale);
	const scaledHeight = scaleCssPx(cfg.height, scale);

	const isRightSide =
		(number >= 21 && number <= 28) ||
		(number >= 31 && number <= 38) ||
		(number >= 61 && number <= 65) ||
		(number >= 71 && number <= 75);
	const transform = `scaleX(${isRightSide ? -1 : 1})`;

	const renderImplant = () => (
		<svg
			width={scaledWidth}
			height={scaledHeight}
			style={{ transform }}
			viewBox={`${cfg.viewX} 0 ${cfg.viewWidth} ${cfg.viewHeight}`}
			preserveAspectRatio="none"
			className={`tooth-svg-element ${
				colors.isPulsing ? "animate-pulse stroke-[2.5px]" : ""
			}`}
		>
			<title>{`Имплант зуба ${number}`}</title>
			<g className="tooth-group-implant">
				{isTop ? (
					<g className="implant-upper-fixture">
						<path
							d="M 28 85 L 34 25 Q 50 12 66 25 L 72 85 Z"
							fill="url(#dente-implant-titanium)"
							stroke="#475569"
							strokeWidth="1.8"
							strokeLinejoin="round"
						/>
						<line x1="36" y1="32" x2="64" y2="32" stroke="#f1f5f9" strokeWidth="1.5" />
						<line x1="36" y1="33.5" x2="64" y2="33.5" stroke="#1e293b" strokeWidth="1.2" />
						<line x1="34" y1="44" x2="66" y2="44" stroke="#f1f5f9" strokeWidth="1.5" />
						<line x1="34" y1="45.5" x2="66" y2="45.5" stroke="#1e293b" strokeWidth="1.2" />
						<line x1="32" y1="56" x2="68" y2="56" stroke="#f1f5f9" strokeWidth="1.5" />
						<line x1="32" y1="57.5" x2="68" y2="57.5" stroke="#1e293b" strokeWidth="1.2" />
						<line x1="30" y1="68" x2="70" y2="68" stroke="#f1f5f9" strokeWidth="1.5" />
						<line x1="30" y1="69.5" x2="70" y2="69.5" stroke="#1e293b" strokeWidth="1.2" />
						<line x1="29" y1="78" x2="71" y2="78" stroke="#f1f5f9" strokeWidth="1.5" />
						<line x1="29" y1="79.5" x2="71" y2="79.5" stroke="#1e293b" strokeWidth="1.2" />
						<line x1="28.5" y1="82" x2="71.5" y2="82" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />
						<path d="M 48 14 L 50 28 L 52 14" stroke="#334155" strokeWidth="1.5" fill="none" strokeLinecap="round" />
						<rect x="27" y="83" width="46" height="6" rx="2" fill="url(#dente-implant-gold)" stroke="#b45309" strokeWidth="1.2" />
					</g>
				) : (
					<g className="implant-lower-fixture">
						<path
							d="M 28 75 L 34 135 Q 50 148 66 135 L 72 75 Z"
							fill="url(#dente-implant-titanium)"
							stroke="#475569"
							strokeWidth="1.8"
							strokeLinejoin="round"
						/>
						<line x1="29" y1="82" x2="71" y2="82" stroke="#f1f5f9" strokeWidth="1.5" />
						<line x1="29" y1="83.5" x2="71" y2="83.5" stroke="#1e293b" strokeWidth="1.2" />
						<line x1="30" y1="94" x2="70" y2="94" stroke="#f1f5f9" strokeWidth="1.5" />
						<line x1="30" y1="95.5" x2="70" y2="95.5" stroke="#1e293b" strokeWidth="1.2" />
						<line x1="32" y1="106" x2="68" y2="106" stroke="#f1f5f9" strokeWidth="1.5" />
						<line x1="32" y1="107.5" x2="68" y2="107.5" stroke="#1e293b" strokeWidth="1.2" />
						<line x1="34" y1="118" x2="66" y2="118" stroke="#f1f5f9" strokeWidth="1.5" />
						<line x1="34" y1="119.5" x2="66" y2="119.5" stroke="#1e293b" strokeWidth="1.2" />
						<line x1="36" y1="130" x2="64" y2="130" stroke="#f1f5f9" strokeWidth="1.5" />
						<line x1="36" y1="131.5" x2="64" y2="131.5" stroke="#1e293b" strokeWidth="1.2" />
						<line x1="28.5" y1="78" x2="71.5" y2="78" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />
						<path d="M 48 146 L 50 132 L 52 146" stroke="#334155" strokeWidth="1.5" fill="none" strokeLinecap="round" />
						<rect x="27" y="71" width="46" height="6" rx="2" fill="url(#dente-implant-gold)" stroke="#b45309" strokeWidth="1.2" />
					</g>
				)}

				<path
					d={geom.crown}
					fill={colors.crownFill}
					stroke={colors.stroke}
					strokeWidth="2.2"
					strokeLinejoin="round"
				/>

				{state === "Planned_Implant" && (
					<line
						x1="50"
						y1="10"
						x2="50"
						y2="140"
						stroke="#6366f1"
						strokeWidth="1.6"
						strokeDasharray="4 3"
						strokeLinecap="round"
					/>
				)}
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
			className={`tooth-svg-element ${
				colors.isPulsing ? "animate-pulse stroke-[2.5px]" : ""
			}`}
		>
			<title>{`Схема зуба ${number}`}</title>
			<g className="tooth-group-standard">
				{state === "Periodontitis" &&
					geom.apex?.map((pt, idx) => (
						<g key={`halo-${idx}`} className="periapical-halo-group">
							<circle cx={pt.x} cy={pt.y} r="14" fill="url(#dente-periapical-halo)" />
							<circle cx={pt.x} cy={pt.y} r="7" fill="#ea580c" opacity="0.6" />
							<circle cx={pt.x} cy={pt.y} r="3" fill="#ffedd5" opacity="0.85" />
						</g>
					))}

				<path
					d={geom.root}
					fill={colors.rootFill}
					stroke={colors.isMissing ? "var(--tooth-root-stroke, #94a3b8)" : "var(--tooth-root-stroke, #64748b)"}
					strokeWidth={colors.isMissing ? "1.4" : "1.8"}
					strokeDasharray={colors.isMissing ? "4 3" : undefined}
					strokeLinejoin="round"
					className="tooth-root-path"
				/>

				<path
					d={geom.crown}
					fill={colors.crownFill}
					fillOpacity={colors.opacity}
					stroke={colors.stroke}
					strokeWidth={colors.isMissing ? "1.4" : "2.2"}
					strokeDasharray={colors.isMissing ? "4 3" : undefined}
					strokeLinejoin="round"
					className="tooth-crown-path"
				/>

				{!colors.isMissing && (
					<path
						d={isTop ? "M 25 85 Q 50 82 75 85" : "M 25 75 Q 50 78 75 75"}
						fill="none"
						stroke="rgba(100, 116, 139, 0.4)"
						strokeWidth="1"
						strokeLinecap="round"
					/>
				)}

				{geom.canals && state === "Pulpitis" && (
					<g filter="url(#dente-glow-purple)">
						<path
							d={geom.canals}
							fill="none"
							stroke="url(#dente-pulp-canal-neon)"
							strokeWidth="3.2"
							strokeLinecap="round"
							strokeLinejoin="round"
							opacity="0.95"
						/>
						<path
							d={geom.canals}
							fill="none"
							stroke="#ffffff"
							strokeWidth="1.2"
							strokeLinecap="round"
							opacity="0.9"
						/>
					</g>
				)}

				{geom.core && state === "Pulpitis" && (
					<path
						d={geom.core}
						fill="#c084fc"
						stroke="#7e22ce"
						strokeWidth="1.5"
						opacity="0.8"
					/>
				)}

				{geom.canals && state === "Filled" && (
					<g>
						<path
							d={geom.canals}
							fill="none"
							stroke="#0d9488"
							strokeWidth="2.8"
							strokeLinecap="round"
							strokeLinejoin="round"
							opacity="0.9"
						/>
						<path
							d={geom.canals}
							fill="none"
							stroke="#a7f3d0"
							strokeWidth="1.2"
							strokeLinecap="round"
							opacity="0.85"
						/>
					</g>
				)}

				{state === "Crown" && (
					<path
						d={isTop ? "M 22 85 Q 50 82 78 85 Q 50 88 22 85" : "M 22 75 Q 50 78 78 75 Q 50 72 22 75"}
						fill="url(#dente-cervical-collar)"
						stroke="#334155"
						strokeWidth="1.2"
					/>
				)}

				{!colors.isMissing && state !== "Crown" && (
					<path
						d={isTop ? "M 32 135 Q 50 145 68 135" : "M 32 30 Q 50 20 68 30"}
						fill="none"
						stroke="rgba(255, 255, 255, 0.65)"
						strokeWidth="1.4"
						strokeLinecap="round"
						opacity="0.75"
					/>
				)}

				{geom.fissures && state !== "Crown" && !colors.isMissing && (
					<path
						d={geom.fissures}
						fill="none"
						stroke={state === "Caries" ? "#7f1d1d" : "rgba(15, 23, 42, 0.35)"}
						strokeWidth="1"
						strokeLinecap="round"
					/>
				)}

				{colors.isMissing && (
					<g opacity="0.65">
						<line
							x1={cfg.viewX + 8}
							y1="35"
							x2={cfg.viewX + cfg.viewWidth - 8}
							y2="115"
							stroke="var(--odontogram-ink-muted, #64748b)"
							strokeWidth="2.4"
							strokeLinecap="round"
						/>
						<line
							x1={cfg.viewX + cfg.viewWidth - 8}
							y1="35"
							x2={cfg.viewX + 8}
							y2="115"
							stroke="var(--odontogram-ink-muted, #64748b)"
							strokeWidth="2.4"
							strokeLinecap="round"
						/>
					</g>
				)}

				{useSurfaces && (
					<g
						transform={`translate(${cfg.viewX + cfg.viewWidth / 2 - 12}, ${isTop ? 95 : 35})`}
						stroke="rgba(255,255,255,0.7)"
						strokeWidth="0.5"
						className="tooth-surface-interactive-group"
					>
						{/* O */}
						<g
							role="tab"
							tabIndex={0}
							aria-label={`Поверхность O зуба ${number}`}
							style={{ cursor: "pointer" }}
							onClick={(e) => {
								e.stopPropagation();
								onClick(e as unknown as React.MouseEvent, number, "O");
							}}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									e.preventDefault();
									e.stopPropagation();
									onClick(e as unknown as React.MouseEvent, number, "O");
								}
							}}
						>
							<polygon
								points="8,8 16,8 16,16 8,16"
								fill={
									surfaces?.includes("O")
										? state === "Filled"
											? "#10b981"
											: "#ef4444"
										: "transparent"
								}
								style={{ transition: "fill 0.2s" }}
							/>
						</g>

						{/* V */}
						<g
							role="tab"
							tabIndex={0}
							aria-label={`Поверхность V зуба ${number}`}
							style={{ cursor: "pointer" }}
							onClick={(e) => {
								e.stopPropagation();
								onClick(e as unknown as React.MouseEvent, number, "V");
							}}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									e.preventDefault();
									e.stopPropagation();
									onClick(e as unknown as React.MouseEvent, number, "V");
								}
							}}
						>
							<polygon
								points="0,0 24,0 16,8 8,8"
								fill={
									surfaces?.includes("V") || surfaces?.includes("B")
										? state === "Filled"
											? "#10b981"
											: "#ef4444"
										: "transparent"
								}
								style={{ transition: "fill 0.2s" }}
							/>
						</g>

						{/* L/P */}
						<g
							role="tab"
							tabIndex={0}
							aria-label={`Поверхность ${isTop ? "P" : "L"} зуба ${number}`}
							style={{ cursor: "pointer" }}
							onClick={(e) => {
								e.stopPropagation();
								onClick(
									e as unknown as React.MouseEvent,
									number,
									isTop ? "P" : "L",
								);
							}}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									e.preventDefault();
									e.stopPropagation();
									onClick(
										e as unknown as React.MouseEvent,
										number,
										isTop ? "P" : "L",
									);
								}
							}}
						>
							<polygon
								points="8,16 16,16 24,24 0,24"
								fill={
									surfaces?.includes("L") || surfaces?.includes("P")
										? state === "Filled"
											? "#10b981"
											: "#ef4444"
										: "transparent"
								}
								style={{ transition: "fill 0.2s" }}
							/>
						</g>

						{/* D */}
						<g
							role="tab"
							tabIndex={0}
							aria-label={`Поверхность D зуба ${number}`}
							style={{ cursor: "pointer" }}
							onClick={(e) => {
								e.stopPropagation();
								onClick(e as unknown as React.MouseEvent, number, "D");
							}}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									e.preventDefault();
									e.stopPropagation();
									onClick(e as unknown as React.MouseEvent, number, "D");
								}
							}}
						>
							<polygon
								points="0,0 8,8 8,16 0,24"
								fill={
									surfaces?.includes("D")
										? state === "Filled"
											? "#10b981"
											: "#ef4444"
										: "transparent"
								}
								style={{ transition: "fill 0.2s" }}
							/>
						</g>

						{/* M */}
						<g
							role="tab"
							tabIndex={0}
							aria-label={`Поверхность M зуба ${number}`}
							style={{ cursor: "pointer" }}
							onClick={(e) => {
								e.stopPropagation();
								onClick(e as unknown as React.MouseEvent, number, "M");
							}}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									e.preventDefault();
									e.stopPropagation();
									onClick(e as unknown as React.MouseEvent, number, "M");
								}
							}}
						>
							<polygon
								points="24,0 24,24 16,16 16,8"
								fill={
									surfaces?.includes("M")
										? state === "Filled"
											? "#10b981"
											: "#ef4444"
										: "transparent"
								}
								style={{ transition: "fill 0.2s" }}
							/>
						</g>
					</g>
				)}
			</g>
		</svg>
	);

	const renderNumberBadge = () => (
		<span
			className={`tooth-number-badge ${isSelected ? "selected" : ""}`}
			style={{ fontSize: scale < 0.85 ? "10px" : undefined }}
		>
			<span
				className="tooth-status-dot"
				style={{ backgroundColor: colors.badgeColor }}
			/>
			<span className="tooth-number-text">{number}</span>
		</span>
	);

	return (
		<button
			type="button"
			className={`tooth-svg-wrapper ${isTop ? "top" : "bottom"} ${
				isSelected ? "selected ring-2 ring-indigo-500/70" : ""
			}`}
			data-tooth-id={number}
			aria-label={`Зуб ${number}, ${TOOTH_STATE_LABELS[state]}`}
			aria-pressed={isSelected ? true : undefined}
			onClick={(e) => onClick(e, number)}
			onKeyDown={(e) => {
				if (e.key !== "Enter" && e.key !== " ") return;
				e.preventDefault();
				onClick(e as unknown as React.MouseEvent, number);
			}}
		>
			{isTop && renderNumberBadge()}
			{state === "Implant" || state === "Planned_Implant"
				? renderImplant()
				: renderStandard()}
			{!isTop && renderNumberBadge()}
		</button>
	);
};

function splitArchAtMidline(teeth: number[]): { left: number[]; right: number[] } {
	if (teeth.length <= 1) return { left: teeth, right: [] };
	let splitIndex = teeth.findIndex((num, i) => {
		if (i === 0) return false;
		const prev = teeth[i - 1];
		if (!prev) return false;
		const prevQ = Math.floor(prev / 10);
		const currQ = Math.floor(num / 10);
		return prevQ !== currQ;
	});
	if (splitIndex <= 0) {
		splitIndex = Math.ceil(teeth.length / 2);
	}
	return {
		left: teeth.slice(0, splitIndex),
		right: teeth.slice(splitIndex),
	};
}

export const AnatomicalSvgOdontogram: React.FC<AnatomicalSvgOdontogramProps> = ({
	teethData = [],
	pediatricMode,
	mixedDentition,
	topTeeth: customTopTeeth,
	bottomTeeth: customBottomTeeth,
	selectedTeeth = [],
	onToothClick,
	useSurfaces,
	hideHeader = false,
	hideLegend = false,
	className = "",
}) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const archContainerRef = useRef<HTMLDivElement>(null);
	const [archScale, setArchScale] = useState(1);
	const appliedArchScaleRef = useRef(1);

	const topTeethList =
		customTopTeeth ??
		(mixedDentition
			? MIXED_TOP_TEETH
			: pediatricMode
				? PEDIATRIC_TOP_TEETH
				: TOP_TEETH);
	const bottomTeethList =
		customBottomTeeth ??
		(mixedDentition
			? MIXED_BOTTOM_TEETH
			: pediatricMode
				? PEDIATRIC_BOTTOM_TEETH
				: BOTTOM_TEETH);

	useEffect(() => {
		const element = archContainerRef.current;
		if (!element) return;

		const recalculate = () => {
			const element = archContainerRef.current;
			if (!element) return;
			const available = Math.max(0, element.clientWidth - 16);
			const row = element.querySelector<HTMLElement>(".teeth-row");
			if (!available || !row) return;

			const applied = appliedArchScaleRef.current;
			const naturalWidth = row.scrollWidth / applied;
			if (!Number.isFinite(naturalWidth) || naturalWidth <= 0) return;

			const next = Math.min(
				1,
				Math.max(MIN_ARCH_SCALE, available / naturalWidth),
			);
			if (Math.abs(applied - next) < 0.005) return;
			appliedArchScaleRef.current = next;
			setArchScale(next);
		};

		recalculate();
		const observer = new ResizeObserver(recalculate);
		observer.observe(element);
		return () => observer.disconnect();
	}, []);

	const handleToothClick = (
		e: React.MouseEvent,
		num: number,
		surface?: string,
	) => {
		const rect = e.currentTarget.getBoundingClientRect();
		onToothClick(num, rect, surface);
	};

	const topSplit = splitArchAtMidline(topTeethList);
	const bottomSplit = splitArchAtMidline(bottomTeethList);

	return (
		<div className={`tooth-chart-container ${className}`.trim()} ref={containerRef}>
			<DenteToothSvgDefs />

			{!hideHeader && (
				<div className="tooth-chart-header">
					<h2 className="tooth-chart-title">
						<Sparkles size={18} className="text-indigo-600 dark:text-indigo-400" />
						<span>3D Анатомическая формула (FDI)</span>
						{pediatricMode && (
							<span className="text-xs px-2 py-0.5 rounded-full bg-pink-100 dark:bg-pink-950/70 text-pink-700 dark:text-pink-300 font-bold border border-pink-300 dark:border-pink-800">
								Детская
							</span>
						)}
					</h2>
					{!hideLegend && (
						<div className="tooth-chart-legend">
							<span className="tooth-chart-legend-item">
								<span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm" /> Кариес
							</span>
							<span className="tooth-chart-legend-item">
								<span className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-sm" /> Пульпит
							</span>
							<span className="tooth-chart-legend-item">
								<span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-sm" /> Периодонтит
							</span>
							<span className="tooth-chart-legend-item">
								<span className="w-2.5 h-2.5 rounded-full bg-teal-500 shadow-sm" /> Пломба
							</span>
							<span className="tooth-chart-legend-item">
								<span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm" /> Коронка
							</span>
							<span className="tooth-chart-legend-item">
								<span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm" /> Имплант
							</span>
							<span className="tooth-chart-legend-item">
								<span className="w-2.5 h-2.5 rounded-full bg-indigo-400 border border-indigo-500" /> План
							</span>
							<span className="tooth-chart-legend-item">
								<span className="w-2.5 h-2.5 rounded-full bg-slate-400 opacity-50" /> Отсутствует
							</span>
						</div>
					)}
				</div>
			)}

			<div className="tooth-chart-arch-container" ref={archContainerRef}>
				<div
					className="tooth-chart-arch-wrapper"
					style={{
						minWidth: "max-content",
						margin: "0 auto",
						position: "relative",
					}}
				>
					{/* Upper Arch (Maxilla) */}
					<div className="teeth-row top-row">
						<div className="tooth-quadrant-group top-left-quad">
							{topSplit.left.map((num) => {
								const tData = (teethData ?? []).find((t) => t.toothNumber === num);
								return (
									<AnatomicalToothSVG
										key={num}
										number={num}
										scale={archScale}
										state={tData ? tData.state : "Healthy"}
										surfaces={tData?.surfaces}
										useSurfaces={useSurfaces}
										isSelected={selectedTeeth.includes(num)}
										onClick={handleToothClick}
									/>
								);
							})}
						</div>

						<div className="tooth-arch-midline-guide top-guide" title="Сагиттальная линия (Midline)">
							<div className="midline-notch" />
						</div>

						<div className="tooth-quadrant-group top-right-quad">
							{topSplit.right.map((num) => {
								const tData = (teethData ?? []).find((t) => t.toothNumber === num);
								return (
									<AnatomicalToothSVG
										key={num}
										number={num}
										scale={archScale}
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

					<div className="teeth-divider">
						<div className="divider-line" />
						<div className="divider-center" title="Центр окклюзионной плоскости">
							<div className="divider-diamond" />
						</div>
					</div>

					{/* Lower Arch (Mandible) */}
					<div className="teeth-row bottom-row">
						<div className="tooth-quadrant-group bottom-left-quad">
							{bottomSplit.left.map((num) => {
								const tData = (teethData ?? []).find((t) => t.toothNumber === num);
								return (
									<AnatomicalToothSVG
										key={num}
										number={num}
										scale={archScale}
										state={tData ? tData.state : "Healthy"}
										surfaces={tData?.surfaces}
										useSurfaces={useSurfaces}
										isSelected={selectedTeeth.includes(num)}
										onClick={handleToothClick}
									/>
								);
							})}
						</div>

						<div className="tooth-arch-midline-guide bottom-guide" title="Сагиттальная линия (Midline)">
							<div className="midline-notch" />
						</div>

						<div className="tooth-quadrant-group bottom-right-quad">
							{bottomSplit.right.map((num) => {
								const tData = (teethData ?? []).find((t) => t.toothNumber === num);
								return (
									<AnatomicalToothSVG
										key={num}
										number={num}
										scale={archScale}
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
		</div>
	);
};
