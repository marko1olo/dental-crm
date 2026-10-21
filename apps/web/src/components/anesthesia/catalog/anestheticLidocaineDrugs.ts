import type {
	AnestheticDrugId,
	AnestheticDrugInfo,
} from "./anesthesiaCatalogTypes.js";

export const LIDOCAINE_DRUGS: Record<
	Extract<AnestheticDrugId, "lidocaine_1_100k" | "lidocaine_plain">,
	AnestheticDrugInfo
> = {
	lidocaine_1_100k: {
		id: "lidocaine_1_100k",
		tradeNamesRu: [
			"Ксилонор",
			"Лидокаин с адреналином 1:100 000",
			"Octocaine 1:100k",
		],
		activeSubstanceRu: "Лидокаина гидрохлорид 2% + Эпинефрин 1:100 000",
		activeConcentrationPercent: 2.0,
		mgPerMlActive: 20.0,
		vasoconstrictorNameRu: "Эпинефрин 1:100 000",
		vasoconstrictorRatio: "1:100000",
		epinephrineMgPerMl: 0.01,
		carpuleVolumeMl: 1.7,
		mgActivePerCarpule: 34.0,
		mgEpiPerCarpule: 0.017,
		maxDoseMgPerKgAdult: 4.4,
		absoluteMaxDoseMgAdult: 300.0,
		maxCarpules70kgAdult: 8,
		containsSulfites: true,
		isAdrenalineFree: false,
		onsetMinutes: 3,
		pulpalDurationMinutes: 60,
		softTissueDurationMinutes: 180,
		clinicalIndicationsRu:
			"Классическая инфильтрационная и проводниковая анестезия при непереносимости артикаина.",
		contraindicationsRu: [
			"Аллергия на лидокаин",
			"Атриовентрикулярная блокада II-III степени",
		],
	},

	lidocaine_plain: {
		id: "lidocaine_plain",
		tradeNamesRu: ["Лидокаин 2% без консервантов", "Ксилокаин"],
		activeSubstanceRu: "Лидокаина гидрохлорид 2% (чистый)",
		activeConcentrationPercent: 2.0,
		mgPerMlActive: 20.0,
		vasoconstrictorNameRu: "Без вазоконстриктора",
		vasoconstrictorRatio: "none",
		epinephrineMgPerMl: 0.0,
		carpuleVolumeMl: 2.0,
		mgActivePerCarpule: 40.0,
		mgEpiPerCarpule: 0.0,
		maxDoseMgPerKgAdult: 4.4,
		absoluteMaxDoseMgAdult: 300.0,
		maxCarpules70kgAdult: 7,
		containsSulfites: false,
		isAdrenalineFree: true,
		onsetMinutes: 3,
		pulpalDurationMinutes: 10,
		softTissueDurationMinutes: 60,
		clinicalIndicationsRu:
			"Кратковременные манипуляции, снятие швов, ретракция десны.",
		contraindicationsRu: ["Аллергия на лидокаин"],
	},
};
