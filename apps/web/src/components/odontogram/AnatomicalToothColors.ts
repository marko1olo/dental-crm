/**
 * DENTE Dental CRM — Anatomical Tooth Colors & Visual Presets
 */

import {
	BOTTOM_SURFACE_KEYS,
	BOTTOM_TEETH,
	CANONICAL_STAMP_MATRIX,
	MIXED_BOTTOM_TEETH,
	MIXED_TOP_TEETH,
	PEDIATRIC_BOTTOM_TEETH,
	PEDIATRIC_TOP_TEETH,
	TOP_SURFACE_KEYS,
	TOP_TEETH,
	splitArchAtMidline,
} from "@dental/shared";
import type { ToothState, ToothVisualProps } from "./ToothChart";
import type { RestorativeMaterialKey } from "./anatomicalToothGeometries";

export {
	TOP_TEETH,
	BOTTOM_TEETH,
	PEDIATRIC_TOP_TEETH,
	PEDIATRIC_BOTTOM_TEETH,
	MIXED_TOP_TEETH,
	MIXED_BOTTOM_TEETH,
	TOP_SURFACE_KEYS,
	BOTTOM_SURFACE_KEYS,
	CANONICAL_STAMP_MATRIX,
	splitArchAtMidline,
};

export const MIN_ARCH_SCALE = 0.28;

export function scaleCssPx(value: string, factor: number): string {
	const parsed = Number.parseFloat(value);
	if (!Number.isFinite(parsed)) return value;
	return `${parsed * factor}px`;
}

export function isLowSpecFilterDisabled(): boolean {
	if (typeof document === "undefined") return false;
	const root = document.documentElement;
	const body = document.body;
	const hasReducedMotion =
		typeof window !== "undefined" &&
		typeof window.matchMedia === "function" &&
		window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	return Boolean(
		hasReducedMotion ||
		root.getAttribute("data-hardware-tier") === "low" ||
		root.getAttribute("data-low-spec") === "true" ||
		root.getAttribute("data-perf") === "low" ||
		root.classList.contains("low-spec-mode") ||
		root.classList.contains("low-spec-perf") ||
		root.classList.contains("low-end-hardware-mode") ||
		body?.classList.contains("low-end-hardware-mode")
	);
}

export const getAnatomicalToothColors = (
	stateOrOpts: ToothState | { state: ToothState; material?: RestorativeMaterialKey },
	maybeMaterial?: RestorativeMaterialKey,
): ToothVisualProps => {
	const state = typeof stateOrOpts === "object" && stateOrOpts !== null ? stateOrOpts.state : stateOrOpts;
	const material = typeof stateOrOpts === "object" && stateOrOpts !== null ? stateOrOpts.material : maybeMaterial;
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
				crownFill: "url(#dente-enamel-healthy)",
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
				crownFill: "url(#dente-enamel-healthy)",
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
				crownFill: "url(#dente-enamel-healthy)",
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
		case "Planned_Crown":
			return {
				fill: "url(#zirconia-crown-gradient)",
				crownFill: "url(#zirconia-crown-gradient)",
				rootFill: "url(#dente-root-dentin)",
				stroke: "#3b82f6",
				collarFill: "url(#dente-cervical-collar)",
				opacity: "0.85",
				isPulsing: true,
				badgeColor: "#3b82f6",
				badgeBg: "rgba(59, 130, 246, 0.15)",
				badgeText: "#1d4ed8",
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

