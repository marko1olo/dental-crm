/**
 * apps/web/src/components/sterilization/sterilizationPresetsModules/chemicalSterilizationColdData.ts
 *
 * Пресеты химической холодной стерилизации (перекись водорода, Бианол/Сайдекс).
 * Мандат 8b: строго <= 120 строк.
 */

import type { ChemicalDisinfectionPreset } from "./types.js";

export const CHEMICAL_COLD_STERILIZATION_PRESETS: readonly ChemicalDisinfectionPreset[] =
	[
		{
			id: "hydrogen_peroxide_cold_sterilization",
			tradeNameRu: "Перекись водорода 6% (химическая стерилизация)",
			activeSubstanceRu: "Водорода пероксид медицинской чистоты 6.0%",
			concentrationPercent: 6.0,
			exposureMinutes: 360,
			targetGroupRu:
				"Термолабильные полимерные изделия, оптика, датчики визиографа без автоклавирования",
			methodRu: "погружение",
			temperatureC: 20,
			shelfLifeSolutionDays: 1,
			sanpinClause:
				"СанПиН 3.3686-21 п. 3638, МУ 287-113 (Химический метод стерилизации растворами)",
			testStripBrandRu: "Химический тест концентрации перекиси водорода 6%",
			instructionsRu:
				"Полное погружение в стеклянную или эмалированную емкость при температуре не менее 20°C на 360 мин (6 часов) либо при 50°C на 180 мин (3 часа). 2-кратное промывание стерильной дистиллированной водой в асептических условиях.",
		},
		{
			id: "glutaraldehyde_bianol_cold_sterilization",
			tradeNameRu: "Бианол / Сайдекс 2.0% (глутаровый альдегид)",
			activeSubstanceRu: "Глутаровый альдегид (2.0%) + глиоксаль + ЧАС",
			concentrationPercent: 2.0,
			exposureMinutes: 600,
			targetGroupRu:
				"Жесткие эндоскопы, оптоволоконные световоды, микрохирургический инструментарий",
			methodRu: "погружение",
			temperatureC: 21,
			shelfLifeSolutionDays: 14,
			sanpinClause:
				"СанПиН 3.3686-21 п. 3639 (Стерилизация растворами альдегидсодержащих средств)",
			testStripBrandRu: "Индикаторные полоски Бианол-2%",
			instructionsRu:
				"Химическая стерилизация в плотно закрытой стерильной емкости. Экспозиция 10 часов (600 мин). Извлечение стерильным пинцетом в стерильную простыню с последующей отмывкой стерильной водой.",
		},
	];
