/**
 * DENTE Dental CRM — Anatomical Tooth Colors & Visual Presets
 */

import type { ToothState, ToothVisualProps } from "./ToothChart";
import type { RestorativeMaterialKey } from "./anatomicalToothGeometries";

export const TOP_TEETH = [
	18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
];
export const BOTTOM_TEETH = [
	48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38,
];
export const PEDIATRIC_TOP_TEETH = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65];
export const PEDIATRIC_BOTTOM_TEETH = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75];
export const MIXED_TOP_TEETH = [16, 55, 54, 53, 52, 51, 61, 62, 63, 64, 65, 26];
export const MIXED_BOTTOM_TEETH = [46, 85, 84, 83, 82, 81, 71, 72, 73, 74, 75, 36];

export const TOP_SURFACE_KEYS = ["O", "V", "P", "M", "D", "C"] as const;
export const BOTTOM_SURFACE_KEYS = ["O", "V", "L", "M", "D", "C"] as const;

export const MIN_ARCH_SCALE = 0.28;

export function scaleCssPx(value: string, factor: number): string {
	const parsed = Number.parseFloat(value);
	if (!Number.isFinite(parsed)) return value;
	return `${parsed * factor}px`;
}

export function isLowSpecFilterDisabled(): boolean {
	if (typeof document === "undefined") return false;
	const root = document.documentElement;
	return (
		root.getAttribute("data-hardware-tier") === "low" ||
		root.getAttribute("data-low-spec") === "true" ||
		root.getAttribute("data-perf") === "low" ||
		root.classList.contains("low-spec-mode") ||
		root.classList.contains("low-spec-perf")
	);
}

export const getAnatomicalToothColors = (
	state: ToothState,
	material?: RestorativeMaterialKey,
): ToothVisualProps => {
	switch (state) {
		case "Healthy":
			return {
				fill: "url(#dente-enamel-healthy)",
				crownFill: "url(#dente-enamel-healthy)",
				rootFill: "url(#dente-root-dentin)",
				stroke: "var(--tooth-enamel-stroke, var(--tooth-root-stroke, #94a3b8))",
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
				stroke: "#d97706",
				opacity: "1",
				badgeColor: "#f59e0b",
				badgeBg: "rgba(245, 158, 11, 0.15)",
				badgeText: "#b45309",
			};
		case "Pulpitis":
			return {
				fill: "url(#dente-pulpitis-grad)",
				crownFill: "url(#dente-pulpitis-grad)",
				rootFill: "url(#dente-root-dentin)",
				stroke: "#ef4444",
				opacity: "1",
				badgeColor: "#ef4444",
				badgeBg: "rgba(239, 68, 68, 0.15)",
				badgeText: "#b91c1c",
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
			if (material === "amalgam") {
				return {
					fill: "url(#amalgam-metal-gradient)",
					crownFill: "url(#amalgam-metal-gradient)",
					rootFill: "url(#dente-root-dentin)",
					stroke: "#334155",
					opacity: "1",
					badgeColor: "#64748b",
					badgeBg: "rgba(100, 116, 139, 0.15)",
					badgeText: "#475569",
				};
			}
			if (material === "ceramic_emax") {
				return {
					fill: "url(#ceramic-emax-gradient)",
					crownFill: "url(#ceramic-emax-gradient)",
					rootFill: "url(#dente-root-dentin)",
					stroke: "#0284c7",
					opacity: "1",
					badgeColor: "#38bdf8",
					badgeBg: "rgba(56, 189, 248, 0.15)",
					badgeText: "#0284c7",
				};
			}
			if (material === "gold") {
				return {
					fill: "url(#gold-crown-gradient)",
					crownFill: "url(#gold-crown-gradient)",
					rootFill: "url(#dente-root-dentin)",
					stroke: "#b45309",
					opacity: "1",
					badgeColor: "#f59e0b",
					badgeBg: "rgba(245, 158, 11, 0.15)",
					badgeText: "#b45309",
				};
			}
			return {
				fill: "url(#composite-fill-gradient)",
				crownFill: "url(#composite-fill-gradient)",
				rootFill: "url(#dente-root-dentin)",
				stroke: "#3b82f6",
				opacity: "1",
				badgeColor: "#3b82f6",
				badgeBg: "rgba(59, 130, 246, 0.15)",
				badgeText: "#1d4ed8",
			};
		case "Crown":
			if (material === "gold") {
				return {
					fill: "url(#gold-crown-gradient)",
					crownFill: "url(#gold-crown-gradient)",
					rootFill: "url(#dente-root-dentin)",
					stroke: "#d97706",
					opacity: "1",
					badgeColor: "#f59e0b",
					badgeBg: "rgba(245, 158, 11, 0.15)",
					badgeText: "#b45309",
				};
			}
			if (material === "pfm_crown") {
				return {
					fill: "url(#pfm-crown-gradient)",
					crownFill: "url(#pfm-crown-gradient)",
					rootFill: "url(#dente-root-dentin)",
					stroke: "#3b82f6",
					collarFill: "url(#pfm-metal-collar)",
					opacity: "1",
					badgeColor: "#2563eb",
					badgeBg: "rgba(37, 99, 235, 0.15)",
					badgeText: "#1d4ed8",
				};
			}
			if (material === "ceramic_emax") {
				return {
					fill: "url(#ceramic-emax-gradient)",
					crownFill: "url(#ceramic-emax-gradient)",
					rootFill: "url(#dente-root-dentin)",
					stroke: "#38bdf8",
					opacity: "1",
					badgeColor: "#38bdf8",
					badgeBg: "rgba(56, 189, 248, 0.15)",
					badgeText: "#0284c7",
				};
			}
			return {
				fill: "url(#zirconia-crown-gradient)",
				crownFill: "url(#zirconia-crown-gradient)",
				rootFill: "url(#dente-root-dentin)",
				stroke: "#10b981",
				collarFill: "url(#dente-cervical-collar)",
				opacity: "1",
				badgeColor: "#10b981",
				badgeBg: "rgba(16, 185, 129, 0.15)",
				badgeText: "#065f46",
			};
		case "Implant":
			return {
				fill: "url(#gold-crown-gradient)",
				crownFill: "url(#zirconia-crown-gradient)",
				rootFill: "url(#titanium-implant-gradient)",
				stroke: "#64748b",
				opacity: "1",
				badgeColor: "#64748b",
				badgeBg: "rgba(100, 116, 139, 0.15)",
				badgeText: "#475569",
			};
		case "Planned_Implant":
			return {
				fill: "url(#gold-crown-gradient)",
				crownFill: "url(#zirconia-crown-gradient)",
				rootFill: "url(#titanium-implant-gradient)",
				stroke: "#64748b",
				opacity: "1",
				isPulsing: true,
				badgeColor: "#64748b",
				badgeBg: "rgba(100, 116, 139, 0.15)",
				badgeText: "#475569",
			};
		case "Missing":
			return {
				fill: "transparent",
				crownFill: "none",
				rootFill: "none",
				stroke: "var(--tooth-root-stroke, #94a3b8)",
				opacity: "0.12",
				isMissing: true,
				badgeColor: "#64748b",
				badgeBg: "rgba(100, 116, 139, 0.15)",
				badgeText: "#475569",
			};
		case "Retained":
			return {
				fill: "url(#dente-enamel-healthy)",
				crownFill: "url(#dente-enamel-healthy)",
				rootFill: "url(#dente-root-dentin)",
				stroke: "#8b5cf6",
				opacity: "0.85",
				badgeColor: "#8b5cf6",
				badgeBg: "rgba(139, 92, 246, 0.15)",
				badgeText: "#7c3aed",
			};
		case "Root":
			return {
				fill: "url(#dente-root-dentin)",
				crownFill: "none",
				rootFill: "url(#dente-root-dentin)",
				stroke: "#dc2626",
				opacity: "1",
				badgeColor: "#dc2626",
				badgeBg: "rgba(220, 38, 38, 0.15)",
				badgeText: "#991b1b",
			};
		default:
			return {
				fill: "url(#dente-enamel-healthy)",
				crownFill: "url(#dente-enamel-healthy)",
				rootFill: "url(#dente-root-dentin)",
				stroke: "var(--tooth-enamel-stroke, var(--tooth-root-stroke, #94a3b8))",
				opacity: "1",
				badgeColor: "#10b981",
				badgeBg: "rgba(16, 185, 129, 0.12)",
				badgeText: "#059669",
			};
	}
};

export function splitArchAtMidline(teeth: number[] | null | undefined): { left: number[]; right: number[] } {
	if (!teeth || !Array.isArray(teeth) || typeof (teeth as any).findIndex !== "function" || teeth.length <= 1) {
		return { left: Array.isArray(teeth) ? [...teeth] : [], right: [] };
	}
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
