import { Settings } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { getToothConfig, getToothPath } from "../../utils/math/toothGeometry";

export type ToothState =
	| "Caries"
	| "Pulpitis"
	| "Periodontitis"
	| "Missing"
	| "Crown"
	| "Implant"
	| "Filled"
	| "Healthy"
	| "Planned_Implant";

/**
 * Русские названия состояний — для доступного имени зуба.
 *
 * Объявлено здесь, рядом с самим типом ToothState: OdontogramModule уже
 * импортирует ToothChart, и обратный импорт замкнул бы цикл. Record без
 * необязательных ключей заставляет компилятор потребовать перевод при
 * добавлении нового состояния.
 */
export const TOOTH_STATE_LABELS: Record<ToothState, string> = {
	Caries: "кариес",
	Pulpitis: "пульпит",
	Periodontitis: "периодонтит",
	Filled: "пломба",
	Crown: "коронка",
	Implant: "имплантат",
	Planned_Implant: "имплантат в плане",
	Missing: "отсутствует",
	Healthy: "здоров",
};

import type { EndoToothClinicalData } from "./EndoCanalLogModal";

export interface ToothData {
	toothNumber: number;
	state: ToothState;
	surfaces?: string[];
	notes?: string;
	clinicalData?: EndoToothClinicalData | Record<string, unknown>;
}

export interface ToothChartProps {
	teethData: ToothData[];
	pediatricMode?: boolean;
	mixedDentition?: boolean;
	topTeeth?: number[];
	bottomTeeth?: number[];
	selectedTeeth?: number[];
	onToothClick: (num: number, rect: DOMRect, surface?: string) => void;
	useSurfaces?: boolean | undefined;
	hideHeader?: boolean;
	hideLegend?: boolean;
	className?: string;
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

/**
 * Нижняя граница масштаба. Дуга масштабируется под экран мобильного устройства.
 */
const MIN_ARCH_SCALE = 0.5;

/** "56px" × 0.68 → "38.08px". Нечисловое значение возвращается как есть. */
function scaleCssPx(value: string, factor: number): string {
	const parsed = Number.parseFloat(value);
	if (!Number.isFinite(parsed)) return value;
	return `${parsed * factor}px`;
}

export interface ToothVisualProps {
	fill: string;
	crownFill: string;
	rootFill: string;
	stroke: string;
	opacity: string;
	isPulsing?: boolean;
	isMissing?: boolean;
	badgeColor: string;
	badgeBg: string;
	badgeText: string;
}

const getToothColors = (state: ToothState): ToothVisualProps => {
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

/**
 * Shared SVG Defs component rendered once for high-fidelity dental shaders.
 */
export const DenteToothSvgDefs: React.FC = () => (
	<svg
		aria-hidden="true"
		className="absolute -top-[9999px] -left-[9999px] w-0 h-0 pointer-events-none opacity-0"
		style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
	>
		<defs>
			{/* Enamel Healthy Gradient (Natural Ivory & Specular Highlight) */}
			<linearGradient id="dente-enamel-healthy" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
				<stop offset="35%" stopColor="#f8fafc" stopOpacity="1" />
				<stop offset="80%" stopColor="#e2e8f0" stopOpacity="1" />
				<stop offset="100%" stopColor="#cbd5e1" stopOpacity="1" />
			</linearGradient>

			{/* Root Dentin / Cementum Gradient */}
			<linearGradient id="dente-root-dentin" x1="0%" y1="0%" x2="100%" y2="0%">
				<stop offset="0%" stopColor="#e2e8f0" stopOpacity="0.9" />
				<stop offset="35%" stopColor="#f1f5f9" stopOpacity="1" />
				<stop offset="70%" stopColor="#e2e8f0" stopOpacity="0.95" />
				<stop offset="100%" stopColor="#cbd5e1" stopOpacity="1" />
			</linearGradient>

			{/* Caries Rich Cavitation Radial Gradient */}
			<radialGradient id="dente-caries-grad" cx="50%" cy="50%" r="65%">
				<stop offset="0%" stopColor="#f87171" stopOpacity="1" />
				<stop offset="50%" stopColor="#ef4444" stopOpacity="1" />
				<stop offset="85%" stopColor="#dc2626" stopOpacity="1" />
				<stop offset="100%" stopColor="#991b1b" stopOpacity="1" />
			</radialGradient>

			{/* Pulpitis Royal Violet Gradient */}
			<linearGradient id="dente-pulpitis-grad" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" stopColor="#d8b4fe" stopOpacity="1" />
				<stop offset="35%" stopColor="#c084fc" stopOpacity="1" />
				<stop offset="75%" stopColor="#9333ea" stopOpacity="1" />
				<stop offset="100%" stopColor="#6b21a8" stopOpacity="1" />
			</linearGradient>

			{/* Pulpitis Luminous Canal Neon Glow */}
			<linearGradient id="dente-pulp-canal-neon" x1="0%" y1="0%" x2="0%" y2="100%">
				<stop offset="0%" stopColor="#f472b6" />
				<stop offset="50%" stopColor="#c084fc" />
				<stop offset="100%" stopColor="#a855f7" />
			</linearGradient>

			{/* Periodontitis Flame Orange Gradient */}
			<linearGradient id="dente-periodontitis-grad" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" stopColor="#fdba74" stopOpacity="1" />
				<stop offset="40%" stopColor="#fb923c" stopOpacity="1" />
				<stop offset="80%" stopColor="#ea580c" stopOpacity="1" />
				<stop offset="100%" stopColor="#c2410c" stopOpacity="1" />
			</linearGradient>

			{/* Periapical Inflammatory Shadow / Halo (Root Apex) */}
			<radialGradient id="dente-periapical-halo" cx="50%" cy="50%" r="50%">
				<stop offset="0%" stopColor="#ef4444" stopOpacity="0.9" />
				<stop offset="45%" stopColor="#f97316" stopOpacity="0.65" />
				<stop offset="80%" stopColor="#ea580c" stopOpacity="0.25" />
				<stop offset="100%" stopColor="#ea580c" stopOpacity="0" />
			</radialGradient>

			{/* Filled Crystal Mint Composite Gradient */}
			<linearGradient id="dente-filled-grad" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" stopColor="#6ee7b7" stopOpacity="1" />
				<stop offset="40%" stopColor="#2dd4bf" stopOpacity="1" />
				<stop offset="75%" stopColor="#0d9488" stopOpacity="1" />
				<stop offset="100%" stopColor="#0f766e" stopOpacity="1" />
			</linearGradient>

			{/* Crown Polished Zirconia Ceramic Sheen */}
			<linearGradient id="dente-crown-zirconia" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" stopColor="#dbeafe" stopOpacity="1" />
				<stop offset="25%" stopColor="#93c5fd" stopOpacity="1" />
				<stop offset="60%" stopColor="#3b82f6" stopOpacity="1" />
				<stop offset="90%" stopColor="#1d4ed8" stopOpacity="1" />
				<stop offset="100%" stopColor="#1e3a8a" stopOpacity="1" />
			</linearGradient>

			{/* Crown Cervical Collar Ring */}
			<linearGradient id="dente-cervical-collar" x1="0%" y1="0%" x2="100%" y2="0%">
				<stop offset="0%" stopColor="#94a3b8" />
				<stop offset="35%" stopColor="#f8fafc" />
				<stop offset="70%" stopColor="#64748b" />
				<stop offset="100%" stopColor="#334155" />
			</linearGradient>

			{/* Realistic Titanium Implant Fixture Gradient */}
			<linearGradient id="dente-implant-titanium" x1="0%" y1="0%" x2="100%" y2="0%">
				<stop offset="0%" stopColor="#475569" />
				<stop offset="20%" stopColor="#94a3b8" />
				<stop offset="45%" stopColor="#f1f5f9" />
				<stop offset="75%" stopColor="#64748b" />
				<stop offset="100%" stopColor="#334155" />
			</linearGradient>

			{/* Gold Abutment / TiN Collar */}
			<linearGradient id="dente-implant-gold" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" stopColor="#fef08a" />
				<stop offset="30%" stopColor="#f59e0b" />
				<stop offset="75%" stopColor="#d97706" />
				<stop offset="100%" stopColor="#b45309" />
			</linearGradient>

			{/* Glow Filters */}
			<filter id="dente-glow-purple" x="-30%" y="-30%" width="160%" height="160%">
				<feGaussianBlur stdDeviation="2.5" result="blur" />
				<feComposite in="SourceGraphic" in2="blur" operator="over" />
			</filter>
		</defs>
	</svg>
);

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
				{/* Titanium Threaded Fixture */}
				{isTop ? (
					<g className="implant-upper-fixture">
						{/* Tapered Fixture Body */}
						<path
							d="M 28 85 L 34 25 Q 50 12 66 25 L 72 85 Z"
							fill="url(#dente-implant-titanium)"
							stroke="#475569"
							strokeWidth="1.8"
							strokeLinejoin="round"
						/>
						{/* Multi-tier Spiral/Horizontal Thread Ridges */}
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
						{/* Microthreads near Crest */}
						<line x1="28.5" y1="82" x2="71.5" y2="82" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />
						{/* Apical Vent Slot */}
						<path d="M 48 14 L 50 28 L 52 14" stroke="#334155" strokeWidth="1.5" fill="none" strokeLinecap="round" />
						{/* Golden Transgingival Abutment Collar */}
						<rect x="27" y="83" width="46" height="6" rx="2" fill="url(#dente-implant-gold)" stroke="#b45309" strokeWidth="1.2" />
					</g>
				) : (
					<g className="implant-lower-fixture">
						{/* Tapered Fixture Body */}
						<path
							d="M 28 75 L 34 135 Q 50 148 66 135 L 72 75 Z"
							fill="url(#dente-implant-titanium)"
							stroke="#475569"
							strokeWidth="1.8"
							strokeLinejoin="round"
						/>
						{/* Multi-tier Thread Ridges */}
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
						{/* Microthreads near Crest */}
						<line x1="28.5" y1="78" x2="71.5" y2="78" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />
						{/* Apical Vent Slot */}
						<path d="M 48 146 L 50 132 L 52 146" stroke="#334155" strokeWidth="1.5" fill="none" strokeLinecap="round" />
						{/* Golden Transgingival Abutment Collar */}
						<rect x="27" y="71" width="46" height="6" rx="2" fill="url(#dente-implant-gold)" stroke="#b45309" strokeWidth="1.2" />
					</g>
				)}

				{/* Restorative Crown on Abutment */}
				<path
					d={geom.crown}
					fill={colors.crownFill}
					stroke={colors.stroke}
					strokeWidth="2.2"
					strokeLinejoin="round"
				/>

				{/* Planned Surgical Trajectory Guideline if planned */}
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
				{/* Periapical Inflammatory Shadow/Halo at Root Apex (Periodontitis) */}
				{state === "Periodontitis" &&
					geom.apex?.map((pt, idx) => (
						<g key={`halo-${idx}`} className="periapical-halo-group">
							<circle cx={pt.x} cy={pt.y} r="14" fill="url(#dente-periapical-halo)" />
							<circle cx={pt.x} cy={pt.y} r="7" fill="#ea580c" opacity="0.6" />
							<circle cx={pt.x} cy={pt.y} r="3" fill="#ffedd5" opacity="0.85" />
						</g>
					))}

				{/* Anatomical Root */}
				<path
					d={geom.root}
					fill={colors.rootFill}
					stroke={colors.isMissing ? "var(--tooth-root-stroke, #94a3b8)" : "var(--tooth-root-stroke, #64748b)"}
					strokeWidth={colors.isMissing ? "1.4" : "1.8"}
					strokeDasharray={colors.isMissing ? "4 3" : undefined}
					strokeLinejoin="round"
					className="tooth-root-path"
				/>

				{/* Crown Anatomical Contour */}
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

				{/* Cementoenamel Junction / Cervical Margin Accent */}
				{!colors.isMissing && (
					<path
						d={isTop ? "M 25 85 Q 50 82 75 85" : "M 25 75 Q 50 78 75 75"}
						fill="none"
						stroke="rgba(100, 116, 139, 0.4)"
						strokeWidth="1"
						strokeLinecap="round"
					/>
				)}

				{/* Pulp Chamber & Root Canals for Pulpitis (Rendered on top of crown & root) */}
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

				{/* Pulp Chamber Core for Pulpitis */}
				{geom.core && state === "Pulpitis" && (
					<path
						d={geom.core}
						fill="#c084fc"
						stroke="#7e22ce"
						strokeWidth="1.5"
						opacity="0.8"
					/>
				)}

				{/* Root Canal Obturation Fill for Endodontically Treated (Filled) */}
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

				{/* Crown Cervical Collar Ring (Zirconia / PFM margin ring) */}
				{state === "Crown" && (
					<path
						d={isTop ? "M 22 85 Q 50 82 78 85 Q 50 88 22 85" : "M 22 75 Q 50 78 78 75 Q 50 72 22 75"}
						fill="url(#dente-cervical-collar)"
						stroke="#334155"
						strokeWidth="1.2"
					/>
				)}

				{/* Natural Enamel Specular Highlight Sheen */}
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

				{/* Occlusal Fissures */}
				{geom.fissures && state !== "Crown" && !colors.isMissing && (
					<path
						d={geom.fissures}
						fill="none"
						stroke={state === "Caries" ? "#7f1d1d" : "rgba(15, 23, 42, 0.35)"}
						strokeWidth="1"
						strokeLinecap="round"
					/>
				)}

				{/* Missing Tooth Ghost Diagonal X */}
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

				{/* Interactive Surfaces (O, V, L/P, M, D) */}
				{useSurfaces && (
					<g
						transform={`translate(${cfg.viewX + cfg.viewWidth / 2 - 12}, ${isTop ? 95 : 35})`}
						stroke="rgba(255,255,255,0.7)"
						strokeWidth="0.5"
						className="tooth-surface-interactive-group"
					>
						{/* O - Occlusal */}
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
							onMouseEnter={(e) => {
								if (!surfaces?.includes("O")) {
									const polygon = e.currentTarget.querySelector("polygon");
									if (polygon) polygon.style.fill = "rgba(239, 68, 68, 0.35)";
								}
							}}
							onMouseLeave={(e) => {
								if (!surfaces?.includes("O")) {
									const polygon = e.currentTarget.querySelector("polygon");
									if (polygon) polygon.style.fill = "transparent";
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

						{/* V - Vestibular / Buccal */}
						<g
							role="tab"
							tabIndex={0}
							aria-label={`Поверхность V зуба ${number}`}
							style={{ cursor: "pointer" }}
							onClick={(e) => {
								e.stopPropagation();
								onClick(
									e as unknown as React.MouseEvent,
									number,
									"V",
								);
							}}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									e.preventDefault();
									e.stopPropagation();
									onClick(
										e as unknown as React.MouseEvent,
										number,
										"V",
									);
								}
							}}
							onMouseEnter={(e) => {
								if (!(surfaces?.includes("V") || surfaces?.includes("B"))) {
									const polygon = e.currentTarget.querySelector("polygon");
									if (polygon) polygon.style.fill = "rgba(239, 68, 68, 0.35)";
								}
							}}
							onMouseLeave={(e) => {
								if (!(surfaces?.includes("V") || surfaces?.includes("B"))) {
									const polygon = e.currentTarget.querySelector("polygon");
									if (polygon) polygon.style.fill = "transparent";
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

						{/* L/P - Lingual / Palatal */}
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
							onMouseEnter={(e) => {
								if (!(surfaces?.includes("L") || surfaces?.includes("P"))) {
									const polygon = e.currentTarget.querySelector("polygon");
									if (polygon) polygon.style.fill = "rgba(239, 68, 68, 0.35)";
								}
							}}
							onMouseLeave={(e) => {
								if (!(surfaces?.includes("L") || surfaces?.includes("P"))) {
									const polygon = e.currentTarget.querySelector("polygon");
									if (polygon) polygon.style.fill = "transparent";
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

						{/* D - Distal (Facing away from sagittal midline) */}
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
							onMouseEnter={(e) => {
								if (!surfaces?.includes("D")) {
									const polygon = e.currentTarget.querySelector("polygon");
									if (polygon) polygon.style.fill = "rgba(239, 68, 68, 0.35)";
								}
							}}
							onMouseLeave={(e) => {
								if (!surfaces?.includes("D")) {
									const polygon = e.currentTarget.querySelector("polygon");
									if (polygon) polygon.style.fill = "transparent";
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

						{/* M - Mesial (Facing towards sagittal midline) */}
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
							onMouseEnter={(e) => {
								if (!surfaces?.includes("M")) {
									const polygon = e.currentTarget.querySelector("polygon");
									if (polygon) polygon.style.fill = "rgba(239, 68, 68, 0.35)";
								}
							}}
							onMouseLeave={(e) => {
								if (!surfaces?.includes("M")) {
									const polygon = e.currentTarget.querySelector("polygon");
									if (polygon) polygon.style.fill = "transparent";
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
				isSelected ? "selected" : ""
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

export const SurfaceSelector = ({
	selected,
	onChange,
	size = 100,
	disabled = false,
}: {
	selected: string[];
	onChange: (newSelected: string[]) => void;
	size?: number;
	disabled?: boolean;
}) => {
	const toggle = (surface: string) => {
		if (disabled) return;
		if (selected.includes(surface)) {
			onChange(selected.filter((s) => s !== surface));
		} else {
			onChange([...selected, surface]);
		}
	};

	return (
		<div className="flex flex-col items-center justify-center">
			<svg
				width={size}
				height={size}
				viewBox="0 0 100 100"
				className={`drop-shadow-md group ${
					disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
				}`}
				role="img"
				aria-label="Поверхности зуба"
			>
				<title>Поверхности зуба</title>
				{/* Top (B/V - Вестибулярная) */}
				<polygon
					role="tab"
					tabIndex={0}
					points="0,0 100,0 70,30 30,30"
					fill={
						selected.includes("B") || selected.includes("V")
							? "var(--teal, #0d9488)"
							: "var(--paper-soft, #f8fafc)"
					}
					stroke={
						selected.includes("B") || selected.includes("V")
							? "var(--teal-dark, #0f766e)"
							: "var(--line-strong, #cbd5e1)"
					}
					strokeWidth="2"
					onClick={() => toggle("V")}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							toggle("V");
						}
					}}
					className="hover:opacity-90 transition-colors duration-200"
				/>
				<text
					x="50"
					y="18"
					fill={
						selected.includes("B") || selected.includes("V")
							? "#ffffff"
							: "var(--ink, #0f172a)"
					}
					fontSize="12"
					fontWeight="bold"
					textAnchor="middle"
					pointerEvents="none"
				>
					V
				</text>

				{/* Bottom (L/P - Язычная/Нёбная) */}
				<polygon
					role="tab"
					tabIndex={0}
					points="30,70 70,70 100,100 0,100"
					fill={
						selected.includes("L") || selected.includes("P")
							? "var(--teal, #0d9488)"
							: "var(--paper-soft, #f8fafc)"
					}
					stroke={
						selected.includes("L") || selected.includes("P")
							? "var(--teal-dark, #0f766e)"
							: "var(--line-strong, #cbd5e1)"
					}
					strokeWidth="2"
					onClick={() => toggle("L")}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							toggle("L");
						}
					}}
					className="hover:opacity-90 transition-colors duration-200"
				/>
				<text
					x="50"
					y="90"
					fill={
						selected.includes("L") || selected.includes("P")
							? "#ffffff"
							: "var(--ink, #0f172a)"
					}
					fontSize="12"
					fontWeight="bold"
					textAnchor="middle"
					pointerEvents="none"
				>
					L
				</text>

				{/* Left (M - Мезиальная) */}
				<polygon
					role="tab"
					tabIndex={0}
					points="0,0 30,30 30,70 0,100"
					fill={
						selected.includes("M")
							? "var(--teal, #0d9488)"
							: "var(--paper-soft, #f8fafc)"
					}
					stroke={
						selected.includes("M")
							? "var(--teal-dark, #0f766e)"
							: "var(--line-strong, #cbd5e1)"
					}
					strokeWidth="2"
					onClick={() => toggle("M")}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							toggle("M");
						}
					}}
					className="hover:opacity-90 transition-colors duration-200"
				/>
				<text
					x="12"
					y="54"
					fill={
						selected.includes("M") ? "#ffffff" : "var(--ink, #0f172a)"
					}
					fontSize="12"
					fontWeight="bold"
					textAnchor="middle"
					pointerEvents="none"
				>
					M
				</text>

				{/* Right (D - Дистальная) */}
				<polygon
					role="tab"
					tabIndex={0}
					points="100,0 70,30 70,70 100,100"
					fill={
						selected.includes("D")
							? "var(--teal, #0d9488)"
							: "var(--paper-soft, #f8fafc)"
					}
					stroke={
						selected.includes("D")
							? "var(--teal-dark, #0f766e)"
							: "var(--line-strong, #cbd5e1)"
					}
					strokeWidth="2"
					onClick={() => toggle("D")}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							toggle("D");
						}
					}}
					className="hover:opacity-90 transition-colors duration-200"
				/>
				<text
					x="88"
					y="54"
					fill={
						selected.includes("D") ? "#ffffff" : "var(--ink, #0f172a)"
					}
					fontSize="12"
					fontWeight="bold"
					textAnchor="middle"
					pointerEvents="none"
				>
					D
				</text>

				{/* Center (O - Окклюзионная) */}
				<polygon
					role="tab"
					tabIndex={0}
					points="30,30 70,30 70,70 30,70"
					fill={
						selected.includes("O")
							? "var(--teal, #0d9488)"
							: "var(--paper-soft, #f8fafc)"
					}
					stroke={
						selected.includes("O")
							? "var(--teal-dark, #0f766e)"
							: "var(--line-strong, #cbd5e1)"
					}
					strokeWidth="2"
					onClick={() => toggle("O")}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							toggle("O");
						}
					}}
					className="hover:opacity-90 transition-colors duration-200"
				/>
				<text
					x="50"
					y="54"
					fill={
						selected.includes("O") ? "#ffffff" : "var(--ink, #0f172a)"
					}
					fontSize="12"
					fontWeight="bold"
					textAnchor="middle"
					pointerEvents="none"
				>
					O
				</text>
			</svg>
		</div>
	);
};

/**
 * Splits teeth row into left & right halves at midline for quadrant alignment.
 */
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

export const ToothChart: React.FC<ToothChartProps> = ({
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

	/**
	 * Подгоняет дугу под фактическую ширину контейнера.
	 */
	useEffect(() => {
		const element = archContainerRef.current;
		if (!element) return;

		const recalculate = () => {
			const element = archContainerRef.current;
			if (!element) return;
			// 16px safety buffer for container inner padding
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
			{/* Shared SVG Shaders & Gradients */}
			<DenteToothSvgDefs />

			{!hideHeader && (
				<div className="tooth-chart-header">
					<h2 className="tooth-chart-title">
						<Settings size={18} className="text-teal-600 dark:text-teal-400" />
						<span>Зубная формула (FDI)</span>
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
						{/* Left Half (Q1: 18..11 or Q5: 55..51) */}
						<div className="tooth-quadrant-group top-left-quad">
							{topSplit.left.map((num) => {
								const tData = (teethData ?? []).find((t) => t.toothNumber === num);
								return (
									<ToothSVG
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

						{/* Midline Vertical Guide Line Notch */}
						<div className="tooth-arch-midline-guide top-guide" title="Сагиттальная линия (Midline)">
							<div className="midline-notch" />
						</div>

						{/* Right Half (Q2: 21..28 or Q6: 61..65) */}
						<div className="tooth-quadrant-group top-right-quad">
							{topSplit.right.map((num) => {
								const tData = (teethData ?? []).find((t) => t.toothNumber === num);
								return (
									<ToothSVG
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

					{/* Horizontal Occlusal Arch Divider */}
					<div className="teeth-divider">
						<div className="divider-line" />
						<div className="divider-center" title="Центр окклюзионной плоскости">
							<div className="divider-diamond" />
						</div>
					</div>

					{/* Lower Arch (Mandible) */}
					<div className="teeth-row bottom-row">
						{/* Left Half (Q4: 48..41 or Q8: 85..81) */}
						<div className="tooth-quadrant-group bottom-left-quad">
							{bottomSplit.left.map((num) => {
								const tData = (teethData ?? []).find((t) => t.toothNumber === num);
								return (
									<ToothSVG
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

						{/* Midline Vertical Guide Line Notch */}
						<div className="tooth-arch-midline-guide bottom-guide" title="Сагиттальная линия (Midline)">
							<div className="midline-notch" />
						</div>

						{/* Right Half (Q3: 31..38 or Q7: 71..75) */}
						<div className="tooth-quadrant-group bottom-right-quad">
							{bottomSplit.right.map((num) => {
								const tData = (teethData ?? []).find((t) => t.toothNumber === num);
								return (
									<ToothSVG
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
