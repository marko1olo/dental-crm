/**
 * osstem.ts — Спецификация системы Osstem (Мандат 8b <= 120 строк).
 */

import type { ImplantSystemSpec } from "./types";

export const OSSTEM_SYSTEM: ImplantSystemSpec = {
	id: "osstem-ts3",
	brand: "Osstem",
	line: "TS III SA / CA",
	country: "Южная Корея",
	descriptionRu:
		"Самый популярный имплантат в РФ и Азии. Коническое соединение 11° Morse Taper.",
	sleeveDiameterMm: 5.0,
	sleeveHeightMm: 5.0,
	drillOffsetDefaultMm: 9.0,
	primaryStabilityDesign: "Штопорная резьба с открытой верхушкой и штопорными бороздками",
	sizes: [
		{
			diameterMm: 3.0,
			lengthsMm: [8.5, 10.0, 11.5, 13.0],
			platform: { code: "Mini", labelRu: "Mini (Ø3.0)", hexColor: "#eab308", cssToken: "var(--amber, #eab308)" },
		},
		{
			diameterMm: 3.5,
			lengthsMm: [8.5, 10.0, 11.5, 13.0],
			platform: { code: "Mini", labelRu: "Mini (Ø3.5)", hexColor: "#eab308", cssToken: "var(--amber, #eab308)" },
		},
		{
			diameterMm: 4.0,
			lengthsMm: [7.0, 8.5, 10.0, 11.5, 13.0],
			platform: { code: "Regular", labelRu: "Regular (Ø4.0)", hexColor: "#16a34a", cssToken: "var(--teal, #16a34a)" },
		},
		{
			diameterMm: 4.5,
			lengthsMm: [7.0, 8.5, 10.0, 11.5, 13.0],
			platform: { code: "Regular", labelRu: "Regular (Ø4.5)", hexColor: "#16a34a", cssToken: "var(--teal, #16a34a)" },
		},
		{
			diameterMm: 5.0,
			lengthsMm: [7.0, 8.5, 10.0, 11.5],
			platform: { code: "Wide", labelRu: "Wide (Ø5.0)", hexColor: "#2563eb", cssToken: "var(--blue, #2563eb)" },
		},
	],
	diameters: [3.0, 3.5, 4.0, 4.5, 5.0],
	lengths: [7.0, 8.5, 10.0, 11.5, 13.0],
};
