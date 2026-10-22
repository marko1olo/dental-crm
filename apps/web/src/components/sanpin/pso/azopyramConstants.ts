import { SANPIN_PSO_CONSTANTS } from "@dental/shared";

export {
	type DentalInstrumentCategory,
	DENTAL_PSO_INSTRUMENT_CATEGORIES,
} from "./psoInstrumentCategories";

export const SANPIN_AZOPYRAM_NORMS = {
	standardNameRu: "СанПиН 3.3686-21",
	standardSectionRu: "Раздел IV. Профилактика инфекционных болезней при оказании медицинской помощи",
	guidelineDocRu: "Методические указания МУ 287-113 от 30.12.1998 г.",
	form366TitleRu: "Форма № 366/у — Журнал учета качества предстерилизационной обработки",
	form257TitleRu: "Форма № 257/у — Журнал работы стерилизаторов (автоклавов и воздушных)",
	workingSolutionLifespanMinutes: SANPIN_PSO_CONSTANTS.workingSolutionLifespanMinutes,
	reactionObservationSeconds: SANPIN_PSO_CONSTANTS.azopyramReactionMaxSeconds,
	statutorySamplingPercent: SANPIN_PSO_CONSTANTS.statutorySamplingPercent,
	minimumSampleFloorStandard: SANPIN_PSO_CONSTANTS.minimumSampleFloorGeneral,
	minimumSampleFloorSurgical: SANPIN_PSO_CONSTANTS.minimumSampleFloorSurgical,
} as const;

export interface ChemicalReagentLotInfo {
	readonly reagentNameRu: string;
	readonly tradeBrandRu: string;
	readonly lotNumber: string;
	readonly manufacturerRu: string;
	readonly expiryDate: string;
	readonly isControlPassed: boolean;
}

export const STATUTORY_PSO_REAGENTS = {
	azopyram: {
		nameRu: "Азопирам-Комплект",
		activeSubstanceRu: "Амидопирин 10% + Анилин солянокислый 0.15% в изопропиловом / этиловом спирте",
		standardLotNumber: "АЗО-2026/08-114",
		manufacturerRu: "ООО «Винар» / ЗАО «Экрос», Россия",
		standardExpiryDate: "2027-06-30",
	},
	hydrogenPeroxide: {
		nameRu: "Перекись водорода 3% медицинская (стабилизированная)",
		activeSubstanceRu: "Водорода пероксид 3.0% стабилизированный натрия бензоатом",
		standardLotNumber: "H2O2-2026/07-55",
		manufacturerRu: "ОАО «Флора Кавказа» / ОАО «Татхимфармпрепараты»",
		standardExpiryDate: "2027-04-15",
	},
	phenolphthalein: {
		nameRu: "Фенолфталеин 1% спиртовой раствор",
		activeSubstanceRu: "Фенолфталеин 10 г/л в спирте этиловом 95%",
		standardLotNumber: "ФЕН-2026/05-22",
		manufacturerRu: "ООО «Реахим» / ОАО «Медхимпром»",
		standardExpiryDate: "2028-01-20",
	},
	detergents: [
		{ id: "biolot_05", nameRu: "Биолот 0.5% (ферментный препарат)", phValueRu: "нейтральный / слабощелочной (pH 7.5–8.5)" },
		{ id: "alaminol_10", nameRu: "Аламинол 1.0% (алкилдиметилбензиламмоний хлорид + глиоксаль)", phValueRu: "слабокислый / нейтральный (pH 6.5–7.2)" },
		{ id: "septolit_plus", nameRu: "Септолит-Плюс 0.5% (ЧАС + третичный амин)", phValueRu: "умеренно щелочной (pH 8.5–9.5)" },
		{ id: "multisteril_20", nameRu: "Мультистерил 2.0% (энзимный концентрат для УЗ-моек)", phValueRu: "нейтральный (pH 7.0–7.4)" },
	],
} as const;
