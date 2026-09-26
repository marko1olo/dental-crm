import type { RestorativeMaterialKey } from "../anatomicalToothGeometries";
import type { ToothState } from "./toothChartTypes";

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
	collarFill?: string;
	canalFill?: string;
	canalGlow?: string;
}

export const getToothColors = (
	state: ToothState,
	material?: RestorativeMaterialKey,
): ToothVisualProps => {
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
				stroke: "#ea580c",
				opacity: "1",
				badgeColor: "#ea580c",
				badgeBg: "rgba(234, 88, 12, 0.15)",
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
					collarFill: "url(#gold-ridge-burnish)",
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
					collarFill: "url(#ceramic-emax-gradient)",
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
				badgeText: "#059669",
			};
		case "Implant":
			return {
				fill: "url(#titanium-implant-gradient)",
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
				fill: "url(#titanium-implant-gradient)",
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
 * Implements complete material library: Photopolymer composite, Silver amalgam,
 * Ceramic E.max, Zirconia, PFM crown, Cast gold, Titanium SLA implant fixture,
 * Gutta-percha canal fill with apical seal, Fiber post, Cast core post, Periapical halo,
 * and Periodontal bone loss patterns.
 */

