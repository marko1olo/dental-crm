/**
 * nobel.ts — Спецификация системы Nobel Biocare (Мандат 8b <= 120 строк).
 */

import type { ImplantSystemSpec } from "./types";

export const NOBEL_BIOCARE_SYSTEM: ImplantSystemSpec = {
	id: "nobel-active",
	brand: "Nobel Biocare",
	line: "NobelActive",
	country: "Швейцария / Швеция",
	descriptionRu:
		"Конический имплантат с агрессивной резьбой и закругленной апикальной частью. Высокая первичная стабильность.",
	sleeveDiameterMm: 5.0,
	sleeveHeightMm: 5.0,
	drillOffsetDefaultMm: 9.0,
	primaryStabilityDesign: "Биконическое тело с конденсирующей обратной резьбой",
	sizes: [
		{
			diameterMm: 3.0,
			lengthsMm: [10.0, 11.5, 13.0, 15.0],
			platform: { code: "NP", labelRu: "Узкая (NP 3.0)", hexColor: "#e11d48", cssToken: "var(--red, #e11d48)" },
		},
		{
			diameterMm: 3.5,
			lengthsMm: [8.5, 10.0, 11.5, 13.0, 15.0],
			platform: { code: "NP", labelRu: "Узкая (NP 3.5)", hexColor: "#e11d48", cssToken: "var(--red, #e11d48)" },
		},
		{
			diameterMm: 4.3,
			lengthsMm: [8.5, 10.0, 11.5, 13.0, 15.0, 18.0],
			platform: { code: "RP", labelRu: "Стандартная (RP 4.3)", hexColor: "#f59e0b", cssToken: "var(--amber, #f59e0b)" },
		},
		{
			diameterMm: 5.0,
			lengthsMm: [8.5, 10.0, 11.5, 13.0, 15.0],
			platform: { code: "WP", labelRu: "Широкая (WP 5.0)", hexColor: "#2563eb", cssToken: "var(--blue, #2563eb)" },
		},
		{
			diameterMm: 5.5,
			lengthsMm: [8.5, 10.0, 11.5, 13.0],
			platform: { code: "6.0", labelRu: "Макси (WP 5.5)", hexColor: "#10b981", cssToken: "var(--teal, #10b981)" },
		},
	],
	diameters: [3.0, 3.5, 4.3, 5.0, 5.5],
	lengths: [8.5, 10.0, 11.5, 13.0, 15.0, 18.0],
};
