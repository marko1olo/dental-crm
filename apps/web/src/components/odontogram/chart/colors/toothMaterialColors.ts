import type { RestorativeMaterialKey } from "../../anatomicalToothGeometries";
import type { ToothVisualProps } from "../ToothColors";

export function getFilledToothColors(material?: RestorativeMaterialKey): ToothVisualProps {
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
		stroke: "#0d9488",
		opacity: "1",
		badgeColor: "#10b981",
		badgeBg: "rgba(16, 185, 129, 0.15)",
		badgeText: "#0f766e",
	};
}

export function getCrownToothColors(material?: RestorativeMaterialKey): ToothVisualProps {
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
	if (material === "zirconia") {
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
	}
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
