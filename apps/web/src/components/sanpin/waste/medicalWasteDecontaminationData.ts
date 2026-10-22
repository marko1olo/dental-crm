import type { DecontaminationMethodDefinition, DecontaminationMethodType } from "./medicalWasteTypes.js";

export const SANPIN_DECONTAMINATION_METHODS: readonly DecontaminationMethodDefinition[] = [
	{
		id: "physical_autoclave_134",
		nameRu: "Аппаратное автоклавирование (водяной пар 134°C, 2.1 бар, 15 мин)",
		category: "physical",
		descriptionRu: "Стерилизация отходов в специализированном автоклаве для медицинских отходов при 134°C.",
		standardParametersRu: "134°C, 2.1 bar, 15 минут экспозиции",
		validationRequired: true,
	},
	{
		id: "physical_microwave_decontam",
		nameRu: "СВЧ-обеззараживание (микроволновое термическое воздействие)",
		category: "physical",
		descriptionRu: "Нагрев увлажненных отходов токами СВЧ с термоинактивацией микроорганизмов.",
		standardParametersRu: "100–105°C, 20–30 минут",
		validationRequired: true,
	},
	{
		id: "chemical_soaking_disinfectant",
		nameRu: "Химическое обеззараживание погружением в раствор дезинфектанта",
		category: "chemical",
		descriptionRu: "Полное погружение отходов в рабочий раствор зарегистрированного дезсредства.",
		standardParametersRu: "Экспозиция 60 мин в закрытой емкости",
		validationRequired: true,
	},
	{
		id: "centralized_licensed_incineration",
		nameRu: "Централизованное обезвреживание (сжигание в инсинераторе спецпредприятием)",
		category: "centralized",
		descriptionRu: "Вывоз специализированной лицензированной компанией для высокотемпературного сжигания.",
		standardParametersRu: "Вывоз спецавтотранспортом по договору",
		validationRequired: false,
	},
	{
		id: "none_class_a",
		nameRu: "Без обеззараживания (Отходы класса А не требуют дезинфекции)",
		category: "exempt",
		descriptionRu: "Эпидемиологически безопасные отходы вывозятся региональным оператором ТКО.",
		standardParametersRu: "Вывоз по графику ТКО",
		validationRequired: false,
	},
];

export function getDecontaminationMethod(id: DecontaminationMethodType): DecontaminationMethodDefinition {
	const found = SANPIN_DECONTAMINATION_METHODS.find((m) => m.id === id);
	return found || SANPIN_DECONTAMINATION_METHODS[0]!;
}
