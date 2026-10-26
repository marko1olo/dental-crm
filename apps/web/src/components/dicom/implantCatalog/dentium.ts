/**
 * dentium.ts — Спецификация системы Dentium (Мандат 8b <= 120 строк).
 */

import type { ImplantSystemSpec } from "./types";

export const DENTIUM_SYSTEM: ImplantSystemSpec = {
	id: "dentium-superline",
	brand: "Dentium",
	line: "SuperLine",
	country: "Южная Корея",
	descriptionRu:
		"Двойная резьба с увеличенным шагом, биологическое коническое соединение.",
	sleeveDiameterMm: 5.0,
	sleeveHeightMm: 5.0,
	drillOffsetDefaultMm: 9.0,
	primaryStabilityDesign: "Глубокая двойная резьба и выраженная коническая форма",
	sizes: [
		{
			diameterMm: 3.4,
			lengthsMm: [8.0, 10.0, 12.0, 14.0],
			platform: { code: "Narrow", labelRu: "Узкая (Ø3.4)", hexColor: "#f59e0b", cssToken: "var(--amber, #f59e0b)" },
		},
		{
			diameterMm: 3.8,
			lengthsMm: [7.0, 8.0, 10.0, 12.0, 14.0],
			platform: { code: "Regular", labelRu: "Стандартная (Ø3.8)", hexColor: "#16a34a", cssToken: "var(--teal, #16a34a)" },
		},
		{
			diameterMm: 4.3,
			lengthsMm: [7.0, 8.0, 10.0, 12.0, 14.0],
			platform: { code: "Regular", labelRu: "Стандартная (Ø4.3)", hexColor: "#16a34a", cssToken: "var(--teal, #16a34a)" },
		},
		{
			diameterMm: 4.8,
			lengthsMm: [7.0, 8.0, 10.0, 12.0],
			platform: { code: "Regular", labelRu: "Стандартная (Ø4.8)", hexColor: "#16a34a", cssToken: "var(--teal, #16a34a)" },
		},
		{
			diameterMm: 5.0,
			lengthsMm: [7.0, 8.0, 10.0, 12.0],
			platform: { code: "Wide", labelRu: "Широкая (Ø5.0)", hexColor: "#2563eb", cssToken: "var(--blue, #2563eb)" },
		},
	],
	diameters: [3.4, 3.8, 4.3, 4.8, 5.0],
	lengths: [7.0, 8.0, 10.0, 12.0, 14.0],
};
