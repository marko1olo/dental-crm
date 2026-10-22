import type { KraftPackagingType } from "./packagingData";
import type { SterilizationRegimeCode } from "./regimesData";

export interface StandardTrayPreset {
	readonly id: string;
	readonly category: "therapy" | "surgery" | "orthopedics" | "endodontics" | "hygiene" | "handpieces";
	readonly nameRu: string;
	readonly descriptionRu: string;
	readonly itemsIncluded: readonly string[];
	readonly defaultPackaging: KraftPackagingType;
	readonly defaultRegimeId: SterilizationRegimeCode;
	readonly avgBatchItems: number;
	readonly isCriticalOrSurgical: boolean;
}

export const STATUTORY_TRAY_SETS: readonly StandardTrayPreset[] = [
	{
		id: "tray_therapy_basic",
		category: "therapy",
		nameRu: "Терапевтический смотровой набор",
		descriptionRu: "Зеркало стоматологическое, зонд угловой, пинцет анатомический, гладилка-штопфер",
		itemsIncluded: ["Зеркало стоматологическое", "Зонд угловой", "Пинцет анатомический", "Гладилка-штопфер"],
		defaultPackaging: "kraft_heat_sealed",
		defaultRegimeId: "steam_134_5min",
		avgBatchItems: 120,
		isCriticalOrSurgical: false,
	},
	{
		id: "tray_handpieces_rotary",
		category: "handpieces",
		nameRu: "Турбинные и микромоторные наконечники",
		descriptionRu: "Наконечники турбинные NSK Ti-Max, микромоторные угловые, насадки для сервисной смазки",
		itemsIncluded: ["Наконечник турбинный Ti-Max X600L", "Наконечник микромоторный угловой", "Ключ ротора"],
		defaultPackaging: "kraft_heat_sealed",
		defaultRegimeId: "steam_134_5min",
		avgBatchItems: 24,
		isCriticalOrSurgical: false,
	},
	{
		id: "tray_surgery_implant",
		category: "surgery",
		nameRu: "Хирургический имплантологический набор",
		descriptionRu: "Элеваторы Бейна, щипцы экстракционные, костные распаторы Лукаса, хирургический шовный сет",
		itemsIncluded: ["Элеватор прямой", "Элеватор штыковидный", "Распатор костный", "Кюрета Лукаса", "Ножницы хирургические"],
		defaultPackaging: "laminated_heat_sealed",
		defaultRegimeId: "steam_134_20min_prion",
		avgBatchItems: 45,
		isCriticalOrSurgical: true,
	},
	{
		id: "tray_orthopedics_impressions",
		category: "orthopedics",
		nameRu: "Ортопедический набор и слепочные ложки",
		descriptionRu: "Металлические слепочные ложки, ретракторы OptraGate, ключи динамометрические",
		itemsIncluded: ["Ложки металлические слепочные", "Ретракторы OptraGate", "Ключ динамометрический"],
		defaultPackaging: "kraft_self_adhesive",
		defaultRegimeId: "steam_121_20min",
		avgBatchItems: 35,
		isCriticalOrSurgical: false,
	},
	{
		id: "tray_endodontics_files",
		category: "endodontics",
		nameRu: "Эндодонтический кассетный бокс",
		descriptionRu: "NiTi К-файлы №15-40, спредеры, плаггеры вертикальные, эндодонтическая линейка",
		itemsIncluded: ["NiTi К-файлы №15-40", "Спредер пальцевой", "Плаггер вертикальный", "Эндо-линейка"],
		defaultPackaging: "kraft_heat_sealed",
		defaultRegimeId: "steam_134_5min",
		avgBatchItems: 60,
		isCriticalOrSurgical: false,
	},
	{
		id: "tray_hygiene_periodontal",
		category: "hygiene",
		nameRu: "Пародонтологический набор кюрет",
		descriptionRu: "Кюреты Грейси 1/2, 7/8, 11/12, 13/14, ультразвуковые насадки EMS, ключ динамометрический",
		itemsIncluded: ["Кюреты Грейси 1/2, 7/8, 11/12, 13/14", "Насадки УЗ-скалера EMS", "Динамометрический ключ"],
		defaultPackaging: "kraft_heat_sealed",
		defaultRegimeId: "steam_134_5min",
		avgBatchItems: 40,
		isCriticalOrSurgical: false,
	},
];
