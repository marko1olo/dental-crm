/**
 * misGeneric.ts — Спецификации систем MIS и Generic (Мандат 8b <= 120 строк).
 */

import type { ImplantSystemSpec } from "./types";

export const MIS_SYSTEM: ImplantSystemSpec = {
	id: "mis-implants",
	brand: "MIS Implants",
	line: "SEVEN / V3 / C1",
	country: "Израиль",
	descriptionRu:
		"Конический имплантат с микрокольцами у шейки, двойной самонарезающей резьбой и закругленным апексом.",
	sleeveDiameterMm: 5.0,
	sleeveHeightMm: 5.0,
	drillOffsetDefaultMm: 9.0,
	primaryStabilityDesign: "Коническое тело с микрокольцами и переменной двойной резьбой",
	sizes: [
		{
			diameterMm: 3.3,
			lengthsMm: [10.0, 11.5, 13.0, 16.0],
			platform: { code: "NP", labelRu: "Узкая (NP 3.3)", hexColor: "#9333ea", cssToken: "var(--purple, #9333ea)" },
		},
		{
			diameterMm: 3.75,
			lengthsMm: [8.0, 10.0, 11.5, 13.0, 16.0],
			platform: { code: "SP", labelRu: "Стандартная (SP 3.75)", hexColor: "#f59e0b", cssToken: "var(--amber, #f59e0b)" },
		},
		{
			diameterMm: 4.2,
			lengthsMm: [8.0, 10.0, 11.5, 13.0, 16.0],
			platform: { code: "SP", labelRu: "Стандартная (SP 4.2)", hexColor: "#f59e0b", cssToken: "var(--amber, #f59e0b)" },
		},
		{
			diameterMm: 5.0,
			lengthsMm: [8.0, 10.0, 11.5, 13.0],
			platform: { code: "WP", labelRu: "Широкая (WP 5.0)", hexColor: "#2563eb", cssToken: "var(--blue, #2563eb)" },
		},
	],
	diameters: [3.3, 3.75, 4.2, 5.0],
	lengths: [8.0, 10.0, 11.5, 13.0, 16.0],
};

export const GENERIC_STANDARD_SYSTEM: ImplantSystemSpec = {
	id: "generic",
	brand: "Generic",
	line: "Standard Cone",
	country: "Международный стандарт",
	descriptionRu:
		"Универсальный эталонный корневидный имплантат с коническим апексом и стандартной размерной сеткой.",
	sleeveDiameterMm: 5.0,
	sleeveHeightMm: 5.0,
	drillOffsetDefaultMm: 9.0,
	primaryStabilityDesign: "Корневидный конус со стандартным шагом резьбы",
	sizes: [
		{
			diameterMm: 3.0,
			lengthsMm: [8.5, 10.0, 11.5, 13.0],
			platform: { code: "NP", labelRu: "Узкая (Ø3.0)", hexColor: "#e11d48", cssToken: "var(--red, #e11d48)" },
		},
		{
			diameterMm: 3.5,
			lengthsMm: [8.0, 10.0, 11.5, 13.0],
			platform: { code: "NP", labelRu: "Узкая (Ø3.5)", hexColor: "#eab308", cssToken: "var(--amber, #eab308)" },
		},
		{
			diameterMm: 4.0,
			lengthsMm: [7.0, 8.5, 10.0, 11.5, 13.0],
			platform: { code: "RP", labelRu: "Стандартная (Ø4.0)", hexColor: "#16a34a", cssToken: "var(--teal, #16a34a)" },
		},
		{
			diameterMm: 4.5,
			lengthsMm: [7.0, 8.5, 10.0, 11.5, 13.0],
			platform: { code: "RP", labelRu: "Стандартная (Ø4.5)", hexColor: "#16a34a", cssToken: "var(--teal, #16a34a)" },
		},
		{
			diameterMm: 5.0,
			lengthsMm: [7.0, 8.5, 10.0, 11.5],
			platform: { code: "WP", labelRu: "Широкая (Ø5.0)", hexColor: "#2563eb", cssToken: "var(--blue, #2563eb)" },
		},
	],
	diameters: [3.0, 3.5, 4.0, 4.5, 5.0],
	lengths: [7.0, 8.0, 8.5, 10.0, 11.5, 13.0],
};
