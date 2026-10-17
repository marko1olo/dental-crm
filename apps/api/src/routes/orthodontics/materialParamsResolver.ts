import type { deductOrthoMaterialsSchema } from "./types.js";

export function resolveMaterialParams(body: import("zod").infer<typeof deductOrthoMaterialsSchema>) {
	let defaultName = body.materialName || "Расходный ортодонтический материал";
	let pattern = body.materialName || "";
	let category = body.materialCategory;
	let unit = body.unit;
	let unitCostRub = 500;

	if (body.action === "wire_change") {
		pattern = pattern || "дуга";
		defaultName = defaultName || "Дуга ортодонтическая NiTi / CuNiTi / TMA / SS";
		category = "ortho_archwire";
		unitCostRub = 1200;
	} else if (body.action === "bonding") {
		pattern = pattern || "Damon";
		defaultName = defaultName || "Брекет-система металлическая Damon Q2";
		category = "ortho_bracket";
		unit = "компл.";
		unitCostRub = 28000;
	} else if (body.action === "rebracket") {
		pattern = pattern || "брекет";
		defaultName = defaultName || "Брекет ортодонтический / замок (повторная фиксация 1 шт.)";
		category = "ortho_bracket";
		unit = "шт.";
		unitCostRub = 1200;
	} else if (body.action === "spring_activation") {
		pattern = pattern || "пружин";
		defaultName = defaultName || "Пружина ортодонтическая Open/Closed Coil";
		category = "ortho_archwire";
		unitCostRub = 650;
	} else if (body.action === "separation_rings") {
		pattern = pattern || "сепарацион";
		defaultName = defaultName || "Кольца сепарационные эластические";
		category = "other";
		unitCostRub = 25;
	} else if (body.action === "power_chain") {
		pattern = pattern || "Power Chain";
		defaultName = defaultName || "Эластическая цепочка Power Chain";
		category = "ortho_archwire";
		unit = "см";
		unitCostRub = 80;
	} else if (body.action === "elastics") {
		pattern = pattern || "эластик";
		defaultName = defaultName || "Межчелюстные эластики (Лиса, Заяц, Медведь, Буйвол, Кенгуру)";
		category = "other";
		unit = "упак.";
		unitCostRub = 450;
	}

	return { defaultName, pattern, category, unit, unitCostRub };
}
