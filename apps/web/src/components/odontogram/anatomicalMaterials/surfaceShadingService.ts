/**
 * DENTE Dental CRM — Anatomical Surface Shading Service
 * Compliant with Mandate 8b (<= 120 lines).
 */

import type { ToothState } from "../ToothChart";
import type {
	RestorativeMaterialKey,
	SurfaceShadingProperties,
} from "../anatomicalGeometriesTypes";

export function getSurfaceShading(
	state: ToothState,
	material?: RestorativeMaterialKey | undefined,
): SurfaceShadingProperties {
	switch (state) {
		case "Caries":
			return { fill: "url(#dente-caries-grad)", stroke: "#991b1b", opacity: 0.95, strokeWidth: 1.2 };
		case "Pulpitis":
			return { fill: "url(#dente-pulpitis-grad)", stroke: "#991b1b", opacity: 0.95, strokeWidth: 1.2 };
		case "Periodontitis":
			return { fill: "url(#dente-periodontitis-grad)", stroke: "#c2410c", opacity: 0.95, strokeWidth: 1.2 };
		case "Filled":
			if (material === "amalgam") {
				return { fill: "url(#amalgam-metal-gradient)", stroke: "#334155", pattern: "url(#amalgam-burnish-pattern)", opacity: 0.95, strokeWidth: 1.2 };
			}
			if (material === "ceramic_emax") {
				return { fill: "url(#ceramic-emax-gradient)", stroke: "#0284c7", pattern: "url(#ceramic-glaze-specular)", opacity: 0.95, strokeWidth: 1.2 };
			}
			if (material === "gold") {
				return { fill: "url(#gold-crown-gradient)", stroke: "#b45309", opacity: 0.95, strokeWidth: 1.2 };
			}
			return { fill: "url(#composite-fill-gradient)", stroke: "#0f766e", pattern: "url(#composite-resin-pattern)", opacity: 0.95, strokeWidth: 1.2 };
		case "Crown":
			if (material === "gold") {
				return { fill: "url(#gold-crown-gradient)", stroke: "#b45309", opacity: 1, strokeWidth: 1.4 };
			}
			if (material === "pfm_crown") {
				return { fill: "url(#pfm-crown-gradient)", stroke: "#1e3a8a", opacity: 1, strokeWidth: 1.4 };
			}
			if (material === "ceramic_emax") {
				return { fill: "url(#ceramic-emax-gradient)", stroke: "#0284c7", opacity: 1, strokeWidth: 1.4 };
			}
			return { fill: "url(#zirconia-crown-gradient)", stroke: "#1d4ed8", opacity: 1, strokeWidth: 1.4 };
		case "Retained":
			return { fill: "url(#dente-enamel-healthy)", stroke: "#8b5cf6", opacity: 0.85, strokeWidth: 1.2 };
		case "Root":
			return { fill: "url(#dente-root-dentin)", stroke: "#dc2626", opacity: 1, strokeWidth: 1.4 };
		case "Healthy":
		default:
			return { fill: "url(#dente-enamel-healthy)", stroke: "var(--tooth-enamel-stroke, var(--tooth-root-stroke, #94a3b8))", opacity: 1, strokeWidth: 1.0 };
	}
}
