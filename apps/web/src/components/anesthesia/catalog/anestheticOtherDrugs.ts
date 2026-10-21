import type {
	AnestheticDrugId,
	AnestheticDrugInfo,
} from "./anesthesiaCatalogTypes.js";

export const OTHER_ANESTHETIC_DRUGS: Record<
	Extract<AnestheticDrugId, "mepivacaine_plain" | "bupivacaine_05">,
	AnestheticDrugInfo
> = {
	mepivacaine_plain: {
		id: "mepivacaine_plain",
		tradeNamesRu: ["Скандонест 3%", "Мепивастезин 3%", "Мепивакаин-Бинергия"],
		activeSubstanceRu: "Мепивакаина гидрохлорид 3% (без вазоконстриктора)",
		activeConcentrationPercent: 3.0,
		mgPerMlActive: 30.0,
		vasoconstrictorNameRu: "Без вазоконстриктора (Адреналин-free)",
		vasoconstrictorRatio: "none",
		epinephrineMgPerMl: 0.0,
		carpuleVolumeMl: 1.7,
		mgActivePerCarpule: 51.0,
		mgEpiPerCarpule: 0.0,
		maxDoseMgPerKgAdult: 4.4,
		absoluteMaxDoseMgAdult: 300.0,
		maxCarpules70kgAdult: 5,
		containsSulfites: false,
		isAdrenalineFree: true,
		onsetMinutes: 1.5,
		pulpalDurationMinutes: 25,
		softTissueDurationMinutes: 120,
		clinicalIndicationsRu:
			"Препарат первого выбора для пациентов группы кардиоваскулярного риска, пациентов на бета-блокаторах, астматиков и аллергиков на сульфиты.",
		contraindicationsRu: [
			"Аллергия на мепивакаин / амиды",
			"Тяжелая печеночная недостаточность",
		],
	},

	bupivacaine_05: {
		id: "bupivacaine_05",
		tradeNamesRu: ["Маркаин 0.5% с адреналином", "Бупивакаин Дентал"],
		activeSubstanceRu: "Бупивакаина гидрохлорид 0.5% + Эпинефрин 1:200 000",
		activeConcentrationPercent: 0.5,
		mgPerMlActive: 5.0,
		vasoconstrictorNameRu: "Эпинефрин 1:200 000",
		vasoconstrictorRatio: "1:200000",
		epinephrineMgPerMl: 0.005,
		carpuleVolumeMl: 1.8,
		mgActivePerCarpule: 9.0,
		mgEpiPerCarpule: 0.009,
		maxDoseMgPerKgAdult: 2.0,
		absoluteMaxDoseMgAdult: 90.0,
		maxCarpules70kgAdult: 10,
		containsSulfites: true,
		isAdrenalineFree: false,
		onsetMinutes: 6,
		pulpalDurationMinutes: 180,
		softTissueDurationMinutes: 480,
		clinicalIndicationsRu:
			"Длительные челюстно-лицевые операции, множественная имплантация, послеоперационное обезболивание на 6-8 часов.",
		contraindicationsRu: [
			"Детский возраст до 12 лет",
			"Тяжелые нарушения ритма сердца (высокая кардиотоксичность бупивакаина)",
		],
	},
};
