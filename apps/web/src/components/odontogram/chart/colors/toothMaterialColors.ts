import type { RestorativeMaterialKey } from "../../anatomicalGeometriesTypes";
import type { ToothVisualProps } from "../ToothColors";

function scopeGrad(idPrefix: string | undefined, id: string): string {
	return idPrefix ? `url(#${idPrefix}-${id})` : `url(#${id})`;
}

export function getFilledToothColors(material?: RestorativeMaterialKey, idPrefix?: string): ToothVisualProps {
	const rootDentin = scopeGrad(idPrefix, "dente-root-dentin");
	if (material === "amalgam") {
		const fillUrl = scopeGrad(idPrefix, "amalgam-metal-gradient");
		return {
			fill: fillUrl,
			crownFill: fillUrl,
			rootFill: rootDentin,
			stroke: "#334155",
			opacity: "1",
			badgeColor: "#64748b",
			badgeBg: "rgba(100, 116, 139, 0.15)",
			badgeText: "#475569",
		};
	}
	if (material === "ceramic_emax") {
		const fillUrl = scopeGrad(idPrefix, "ceramic-emax-gradient");
		return {
			fill: fillUrl,
			crownFill: fillUrl,
			rootFill: rootDentin,
			stroke: "#0284c7",
			opacity: "1",
			badgeColor: "#38bdf8",
			badgeBg: "rgba(56, 189, 248, 0.15)",
			badgeText: "#0284c7",
		};
	}
	if (material === "gold") {
		const fillUrl = scopeGrad(idPrefix, "gold-crown-gradient");
		return {
			fill: fillUrl,
			crownFill: fillUrl,
			rootFill: rootDentin,
			stroke: "#b45309",
			opacity: "1",
			badgeColor: "#f59e0b",
			badgeBg: "rgba(245, 158, 11, 0.15)",
			badgeText: "#b45309",
		};
	}
	const fillUrl = scopeGrad(idPrefix, "composite-fill-gradient");
	return {
		fill: fillUrl,
		crownFill: fillUrl,
		rootFill: rootDentin,
		stroke: "#0d9488",
		opacity: "1",
		badgeColor: "#10b981",
		badgeBg: "rgba(16, 185, 129, 0.15)",
		badgeText: "#0f766e",
	};
}

export function getCrownToothColors(material?: RestorativeMaterialKey, idPrefix?: string): ToothVisualProps {
	const rootDentin = scopeGrad(idPrefix, "dente-root-dentin");
	if (material === "gold") {
		const fillUrl = scopeGrad(idPrefix, "gold-crown-gradient");
		return {
			fill: fillUrl,
			crownFill: fillUrl,
			rootFill: rootDentin,
			stroke: "#d97706",
			collarFill: scopeGrad(idPrefix, "gold-ridge-burnish"),
			opacity: "1",
			badgeColor: "#f59e0b",
			badgeBg: "rgba(245, 158, 11, 0.15)",
			badgeText: "#b45309",
		};
	}
	if (material === "pfm_crown") {
		const fillUrl = scopeGrad(idPrefix, "pfm-crown-gradient");
		return {
			fill: fillUrl,
			crownFill: fillUrl,
			rootFill: rootDentin,
			stroke: "#3b82f6",
			collarFill: scopeGrad(idPrefix, "pfm-metal-collar"),
			opacity: "1",
			badgeColor: "#2563eb",
			badgeBg: "rgba(37, 99, 235, 0.15)",
			badgeText: "#1d4ed8",
		};
	}
	if (material === "ceramic_emax") {
		const fillUrl = scopeGrad(idPrefix, "ceramic-emax-gradient");
		return {
			fill: fillUrl,
			crownFill: fillUrl,
			rootFill: rootDentin,
			stroke: "#38bdf8",
			collarFill: fillUrl,
			opacity: "1",
			badgeColor: "#38bdf8",
			badgeBg: "rgba(56, 189, 248, 0.15)",
			badgeText: "#0284c7",
		};
	}
	if (material === "zirconia") {
		const fillUrl = scopeGrad(idPrefix, "zirconia-crown-gradient");
		return {
			fill: fillUrl,
			crownFill: fillUrl,
			rootFill: rootDentin,
			stroke: "#10b981",
			collarFill: scopeGrad(idPrefix, "dente-cervical-collar"),
			opacity: "1",
			badgeColor: "#10b981",
			badgeBg: "rgba(16, 185, 129, 0.15)",
			badgeText: "#059669",
		};
	}
	const fillUrl = scopeGrad(idPrefix, "gold-crown-gradient");
	return {
		fill: fillUrl,
		crownFill: fillUrl,
		rootFill: rootDentin,
		stroke: "#d97706",
		collarFill: scopeGrad(idPrefix, "gold-ridge-burnish"),
		opacity: "1",
		badgeColor: "#f59e0b",
		badgeBg: "rgba(245, 158, 11, 0.15)",
		badgeText: "#b45309",
	};
}
