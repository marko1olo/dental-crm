/**
 * anestheticConfigs.ts — Конфигурации анестетиков и паттерны распознавания
 */

import type { AnestheticDrugConfig } from "../types";

export const KNOWN_ANESTHETICS_CONFIG: readonly AnestheticDrugConfig[] = [
	{
		drugKey: "ultracain_ds_forte",
		tradeName: "Ultracain DS Forte",
		displayName: "Ультракаин Д-С форте 1:100 000 (1.7 мл)",
		defaultVolumeMl: 1.7,
		concentration: "4% с адреналином 1:100 000",
		patterns: [
			"ультракаин форте",
			"ультракаин д-с форте",
			"ультракаин д с форте",
			"ультракаин дс форте",
			"ultracain ds forte",
		],
	},
	{
		drugKey: "ultracain_ds",
		tradeName: "Ultracain DS",
		displayName: "Ультракаин Д-С 1:200 000 (1.7 мл)",
		defaultVolumeMl: 1.7,
		concentration: "4% с адреналином 1:200 000",
		patterns: [
			"ультракаин д-с",
			"ультракаин д с",
			"ультракаин дс",
			"ультракаин",
			"ultracain ds",
			"ultracain",
		],
	},
	{
		drugKey: "ubistesin_forte",
		tradeName: "Ubistesin Forte",
		displayName: "Убистезин форте 1:100 000 (1.7 мл)",
		defaultVolumeMl: 1.7,
		concentration: "4% с эпинефрином 1:100 000",
		patterns: [
			"убистезин форте",
			"ubistesin forte",
		],
	},
	{
		drugKey: "ubistesin",
		tradeName: "Ubistesin",
		displayName: "Убистезин 1:200 000 (1.7 мл)",
		defaultVolumeMl: 1.7,
		concentration: "4% с эпинефрином 1:200 000",
		patterns: [
			"убистезин",
			"ubistesin",
		],
	},
	{
		drugKey: "scandonest_3",
		tradeName: "Scandonest 3%",
		displayName: "Скандонест 3% (Мепивакаин без адреналина, 1.7 мл)",
		defaultVolumeMl: 1.7,
		concentration: "3% без вазоконстриктора",
		patterns: [
			"скандонест",
			"scandonest",
			"мепивакаин",
			"мепивастезин",
		],
	},
	{
		drugKey: "septanest",
		tradeName: "Septanest",
		displayName: "Септанест 1:100 000 (1.7 мл)",
		defaultVolumeMl: 1.7,
		concentration: "4% с адреналином 1:100 000",
		patterns: [
			"септанест",
			"septanest",
		],
	},
	{
		drugKey: "articaine",
		tradeName: "Articaine",
		displayName: "Артикаин 4% (1.7 мл)",
		defaultVolumeMl: 1.7,
		concentration: "4%",
		patterns: [
			"артикаин",
			"articaine",
		],
	},
	{
		drugKey: "lidocaine",
		tradeName: "Lidocaine 2%",
		displayName: "Лидокаин 2% (2.0 мл)",
		defaultVolumeMl: 2.0,
		concentration: "2%",
		patterns: [
			"лидокаин",
			"lidocaine",
		],
	},
];
