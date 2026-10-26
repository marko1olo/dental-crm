/**
 * straumann.ts — Спецификация системы Straumann (Мандат 8b <= 120 строк).
 */

import type { ImplantSystemSpec } from "./types";

export const STRAUMANN_SYSTEM: ImplantSystemSpec = {
	id: "straumann-blx",
	brand: "Straumann",
	line: "Bone Level (BLX / BLT)",
	country: "Швейцария",
	descriptionRu:
		"Премиальный швейцарский имплантат из сплава Roxolid с поверхностью SLActive.",
	sleeveDiameterMm: 5.0,
	sleeveHeightMm: 5.0,
	drillOffsetDefaultMm: 9.0,
	primaryStabilityDesign: "Анатомический конический контур с самонарезающей резьбой",
	sizes: [
		{
			diameterMm: 3.3,
			lengthsMm: [8.0, 10.0, 12.0, 14.0],
			platform: { code: "SC", labelRu: "Small CrossFit (SC 3.3)", hexColor: "#eab308", cssToken: "var(--amber, #eab308)" },
		},
		{
			diameterMm: 3.5,
			lengthsMm: [8.0, 10.0, 12.0, 14.0, 16.0],
			platform: { code: "NC", labelRu: "Narrow CrossFit (NC 3.5)", hexColor: "#eab308", cssToken: "var(--amber, #eab308)" },
		},
		{
			diameterMm: 4.0,
			lengthsMm: [8.0, 10.0, 12.0, 14.0, 16.0],
			platform: { code: "RC", labelRu: "Regular CrossFit (RC 4.0)", hexColor: "#a855f7", cssToken: "var(--purple, #a855f7)" },
		},
		{
			diameterMm: 4.5,
			lengthsMm: [8.0, 10.0, 12.0, 14.0, 16.0],
			platform: { code: "RC", labelRu: "Regular CrossFit (RC 4.5)", hexColor: "#a855f7", cssToken: "var(--purple, #a855f7)" },
		},
		{
			diameterMm: 5.0,
			lengthsMm: [8.0, 10.0, 12.0, 14.0],
			platform: { code: "WB", labelRu: "Wide Base (WB 5.0)", hexColor: "#0284c7", cssToken: "var(--teal, #0284c7)" },
		},
	],
	diameters: [3.3, 3.5, 4.0, 4.5, 5.0],
	lengths: [8.0, 10.0, 12.0, 14.0, 16.0],
};
