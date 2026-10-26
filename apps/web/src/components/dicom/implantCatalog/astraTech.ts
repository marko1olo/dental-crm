/**
 * astraTech.ts — Спецификация системы Astra Tech (Мандат 8b <= 120 строк).
 */

import type { ImplantSystemSpec } from "./types";

export const ASTRA_TECH_SYSTEM: ImplantSystemSpec = {
	id: "astra-tech-ev",
	brand: "Astra Tech",
	line: "OsseoSpeed EV",
	country: "Швеция (Dentsply Sirona)",
	descriptionRu:
		"Премиальный конический имплантат с биоактивной поверхностью OsseoSpeed и MicroThread на шейке.",
	sleeveDiameterMm: 5.0,
	sleeveHeightMm: 5.0,
	drillOffsetDefaultMm: 9.0,
	primaryStabilityDesign: "Апикальная резьба с глубоким режущим желобком и коническим соединением EV",
	sizes: [
		{
			diameterMm: 3.0,
			lengthsMm: [8.0, 9.0, 11.0, 13.0, 15.0],
			platform: { code: "Green", labelRu: "Узкая (Ø3.0)", hexColor: "#10b981", cssToken: "var(--emerald, #10b981)" },
		},
		{
			diameterMm: 3.6,
			lengthsMm: [6.0, 8.0, 9.0, 11.0, 13.0, 15.0, 17.0],
			platform: { code: "Purple", labelRu: "Стандартная (Ø3.6)", hexColor: "#8b5cf6", cssToken: "var(--purple, #8b5cf6)" },
		},
		{
			diameterMm: 4.2,
			lengthsMm: [6.0, 8.0, 9.0, 11.0, 13.0, 15.0, 17.0],
			platform: { code: "Yellow", labelRu: "Стандартная (Ø4.2)", hexColor: "#f59e0b", cssToken: "var(--amber, #f59e0b)" },
		},
		{
			diameterMm: 4.8,
			lengthsMm: [6.0, 8.0, 9.0, 11.0, 13.0, 15.0, 17.0],
			platform: { code: "Blue", labelRu: "Широкая (Ø4.8)", hexColor: "#2563eb", cssToken: "var(--blue, #2563eb)" },
		},
		{
			diameterMm: 5.4,
			lengthsMm: [6.0, 8.0, 9.0, 11.0, 13.0, 15.0],
			platform: { code: "Brown", labelRu: "Широкая (Ø5.4)", hexColor: "#92400e", cssToken: "var(--amber-900, #92400e)" },
		},
	],
	diameters: [3.0, 3.6, 4.2, 4.8, 5.4],
	lengths: [6.0, 8.0, 9.0, 11.0, 13.0, 15.0, 17.0],
};
