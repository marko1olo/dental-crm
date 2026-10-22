/**
 * apps/web/src/components/sterilization/sterilizationPresetsModules/disinfectionPresets.ts
 * Нормативные пресеты химической дезинфекции и холодной стерилизации.
 */

import type { ChemicalDisinfectionPreset } from "./types.js";

export const CHEMICAL_DISINFECTION_PRESETS: readonly ChemicalDisinfectionPreset[] = [
	{
		id: "alaminol_instruments_immersion",
		tradeNameRu: "Аламинол (водный раствор 1.5%)",
		activeSubstanceRu: "Алкилдиметилбензиламмоний хлорид (ЧАС 5%) + глиоксаль (8%)",
		concentrationPercent: 1.5, exposureMinutes: 60,
		targetGroupRu: "Смотровые лотки терапевта, зеркала, зонды, пинцеты, шпатели",
		methodRu: "погружение", temperatureC: 20, shelfLifeSolutionDays: 14,
		sanpinClause: "СанПиН 3.3686-21 п. 3582, МУ 287-113 (Таблица 2.4)",
		testStripBrandRu: "Дезиконт-Аламинол 1.5%",
		instructionsRu: "Полное погружение инструментария в перфорированном поддоне с заполнением каналов и полостей. Толщина слоя раствора над изделиями не менее 10 мм. После экспозиции — промывание проточной водой не менее 3 мин.",
	},
	{
		id: "alaminol_ultrasonic_cleaning",
		tradeNameRu: "Аламинол 1.5% в ультразвуковой мойке",
		activeSubstanceRu: "Алкилдиметилбензиламмоний хлорид + глиоксаль + ПАВ",
		concentrationPercent: 1.5, exposureMinutes: 15,
		targetGroupRu: "Терапевтический, ортопедический и хирургический инструментарий со сложным рельефом",
		methodRu: "ультразвуковая_ванна", temperatureC: 45, ultrasonicFrequencyKhz: 37, shelfLifeSolutionDays: 14,
		sanpinClause: "СанПиН 3.3686-21 п. 3583 (Совмещенная дезинфекция и ПСО в УЗ-ванне)",
		testStripBrandRu: "Дезиконт-Аламинол 1.5%",
		instructionsRu: "Обработка в ультразвуковом очистителе (частота 35-40 кГц, подогрев 40-45°C). Кавитация обеспечивает удаление биологических пленок из замков и насечек за 15 минут с последующим ополаскиванием дистиллированной водой.",
	},
	{
		id: "optimax_pro_rotary_ultrasonic",
		tradeNameRu: "Оптимакс Про (раствор 1.5% для вращающихся инструментов)",
		activeSubstanceRu: "Третичный амин (N,N-бис(3-аминопропил)додециламин 5%) + ингибиторы коррозии",
		concentrationPercent: 1.5, exposureMinutes: 15,
		targetGroupRu: "Алмазные и твердосплавные боры, диски, эндодонтические файлы Ni-Ti, развертки",
		methodRu: "ультразвуковая_ванна", temperatureC: 25, ultrasonicFrequencyKhz: 37, shelfLifeSolutionDays: 14,
		sanpinClause: "СанПиН 3.3686-21 п. 3588 (Обработка стоматологического ротационного инструментария)",
		testStripBrandRu: "Дезиконт-Оптимакс 1.5%",
		instructionsRu: "Размещение боров в специальной подставке-блокноте в УЗ-ванне. Ингибиторы коррозии исключают притупление режущих граней твердосплавных и алмазных головок. Экспозиция 15 мин.",
	},
	{
		id: "bacillol_af_handpieces_rapid",
		tradeNameRu: "Бациллол АФ / Миродез (спиртовой экспресс-раствор)",
		activeSubstanceRu: "1-пропанол (45%), 2-пропанол (25%), этанол (4.7%)",
		concentrationPercent: 100, exposureMinutes: 5,
		targetGroupRu: "Наружные поверхности турбинных, угловых и прямых наконечников, световоды полимеризационных ламп",
		methodRu: "2-кратное_протирание", temperatureC: 20, shelfLifeSolutionDays: 365,
		sanpinClause: "СанПиН 3.3686-21 п. 3591 (Очистка и дезинфекция стоматологических наконечников)",
		testStripBrandRu: "Заводской готовый состав (активность подтверждена паспортом)",
		instructionsRu: "Двукратное протирание чистой салфеткой, обильно смоченной средством, с интервалом 15 минут. Удаление масляной пленки и дезинфекция ротора наконечника без повреждения оптических световодов.",
	},
	{
		id: "hydrogen_peroxide_cold_sterilization",
		tradeNameRu: "Перекись водорода 6% (химическая стерилизация)",
		activeSubstanceRu: "Водорода пероксид медицинской чистоты 6.0%",
		concentrationPercent: 6.0, exposureMinutes: 360,
		targetGroupRu: "Термолабильные полимерные изделия, оптика, датчики визиографа без автоклавирования",
		methodRu: "погружение", temperatureC: 20, shelfLifeSolutionDays: 1,
		sanpinClause: "СанПиН 3.3686-21 п. 3638, МУ 287-113 (Химический метод стерилизации растворами)",
		testStripBrandRu: "Химический тест концентрации перекиси водорода 6%",
		instructionsRu: "Полное погружение в стеклянную или эмалированную емкость при температуре не менее 20°C на 360 мин (6 часов) либо при 50°C на 180 мин (3 часа). 2-кратное промывание стерильной дистиллированной водой в асептических условиях.",
	},
	{
		id: "glutaraldehyde_bianol_cold_sterilization",
		tradeNameRu: "Бианол / Сайдекс 2.0% (глутаровый альдегид)",
		activeSubstanceRu: "Глутаровый альдегид (2.0%) + глиоксаль + ЧАС",
		concentrationPercent: 2.0, exposureMinutes: 600,
		targetGroupRu: "Жесткие эндоскопы, оптоволоконные световоды, микрохирургический инструментарий",
		methodRu: "погружение", temperatureC: 21, shelfLifeSolutionDays: 14,
		sanpinClause: "СанПиН 3.3686-21 п. 3639 (Стерилизация растворами альдегидсодержащих средств)",
		testStripBrandRu: "Индикаторные полоски Бианол-2%",
		instructionsRu: "Химическая стерилизация в плотно закрытой стерильной емкости. Экспозиция 10 часов (600 мин). Извлечение стерильным пинцетом в стерильную простыню с последующей отмывкой стерильной водой.",
	},
];

export function getChemicalDisinfectionPresetById(
	id: string,
): ChemicalDisinfectionPreset | undefined {
	return CHEMICAL_DISINFECTION_PRESETS.find((p) => p.id === id);
}
