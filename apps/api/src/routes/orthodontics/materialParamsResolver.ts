import { rublesToKopecks } from "@dental/shared";
import type { deductOrthoMaterialsSchema } from "./types.js";
import { resolveOrthoMaterialCost } from "./orthoPricelistResolver.js";

/**
 * DEF-ORTHO-02 / Red Team: Определение параметров и себестоимости ортодонтического материала
 * с проверкой складских остатков клиники и безопасным фоллбеком.
 */
export async function resolveMaterialParams(
	body: import("zod").infer<typeof deductOrthoMaterialsSchema>,
	organizationId?: string,
) {
	let defaultName = body.materialName || "Расходный ортодонтический материал";
	let pattern = body.materialName || "";
	let category = body.materialCategory;
	let unit = body.unit;
	let fallbackCostRub = 500;

	if (body.action === "wire_change") {
		pattern = pattern || "дуга";
		defaultName = defaultName || "Дуга ортодонтическая NiTi / CuNiTi / TMA / SS";
		category = "ortho_archwire";
		fallbackCostRub = 1200;
	} else if (body.action === "bonding") {
		pattern = pattern || "брекет";
		defaultName = defaultName || "Брекет-система металлическая самолигирующая";
		category = "ortho_bracket";
		unit = "компл.";
		fallbackCostRub = 28000;
	} else if (body.action === "rebracket") {
		pattern = pattern || "брекет";
		defaultName = defaultName || "Брекет ортодонтический / замок (повторная фиксация 1 шт.)";
		category = "ortho_bracket";
		unit = "шт.";
		fallbackCostRub = 1200;
	} else if (body.action === "spring_activation") {
		pattern = pattern || "пружин";
		defaultName = defaultName || "Пружина ортодонтическая Open/Closed Coil";
		category = "ortho_archwire";
		fallbackCostRub = 650;
	} else if (body.action === "separation_rings") {
		pattern = pattern || "сепарацион";
		defaultName = defaultName || "Кольца сепарационные эластические";
		category = "other";
		fallbackCostRub = 25;
	} else if (body.action === "power_chain") {
		pattern = pattern || "Power Chain";
		defaultName = defaultName || "Эластическая цепочка Power Chain";
		category = "ortho_archwire";
		unit = "см";
		fallbackCostRub = 80;
	} else if (body.action === "elastics") {
		pattern = pattern || "эластик";
		defaultName = defaultName || "Межчелюстные эластики (Лиса, Заяц, Медведь, Буйвол, Кенгуру)";
		category = "other";
		unit = "упак.";
		fallbackCostRub = 450;
	}

	let unitCostRub = fallbackCostRub;
	let unitCostKopecks = BigInt(rublesToKopecks(fallbackCostRub));

	if (organizationId) {
		const resolved = await resolveOrthoMaterialCost({
			organizationId,
			itemNamePattern: pattern,
			fallbackCostRub,
		});
		unitCostRub = resolved.unitCostRub;
		unitCostKopecks = resolved.unitCostKopecks;
	}

	return { defaultName, pattern, category, unit, unitCostRub, unitCostKopecks };
}
