export interface DentalInstrumentCategory {
	readonly id: string;
	readonly nameRu: string;
	readonly descriptionRu: string;
	readonly isSurgicalOrCritical: boolean;
	readonly typicalItems: readonly string[];
	readonly criticalInspectionZonesRu: string;
}

export const DENTAL_PSO_INSTRUMENT_CATEGORIES: readonly DentalInstrumentCategory[] = [
	{
		id: "mirrors_probes_tweezers",
		nameRu: "Стоматологические смотровые наборы (зеркала, зонды, пинцеты)",
		descriptionRu: "Родиевые фронтальные зеркала, угловые зонды, анатомические стоматологические пинцеты",
		isSurgicalOrCritical: false,
		typicalItems: [
			"Зеркало стоматологическое с ручкой",
			"Зонд стоматологический угловой остроконечный",
			"Пинцет анатомический стоматологический с насечкой",
		],
		criticalInspectionZonesRu: "Резьбовое соединение зеркала с ручкой, насечки на браншах пинцета, острие зонда",
	},
	{
		id: "burs_rotary_cutters",
		nameRu: "Стоматологические боры и фрезы (алмазные и твердосплавные)",
		descriptionRu: "Турбинные алмазные боры, микромоторные твердосплавные боры, финиры, полиры",
		isSurgicalOrCritical: false,
		typicalItems: [
			"Боры алмазные турбинные (шаровидные, конусные, пламевидные)",
			"Боры твердосплавные угловые для препарирования дентина",
			"Твердосплавные финиры и полировочные головки",
		],
		criticalInspectionZonesRu: "Межзубчатые пространства твердосплавных насечек, алмазная крошка головки бора",
	},
	{
		id: "handpieces_turbine_motor",
		nameRu: "Турбинные и угловые наконечники (KaVo, NSK, W&H, Bien-Air)",
		descriptionRu: "Турбинные наконечники со спреем, угловые микромоторные наконечники, прямые хирургические",
		isSurgicalOrCritical: false,
		typicalItems: [
			"Наконечник турбинный со световодом",
			"Наконечник угловой микромоторный 1:1",
			"Наконечник повышающий 1:5 для препарирования",
		],
		criticalInspectionZonesRu: "Внутренний охлаждающий спрей-канал, зажим цанги, головка роторной группы",
	},
	{
		id: "surgical_forceps_elevators",
		nameRu: "Хирургический инструментарий (щипцы, элеваторы, распаторы)",
		descriptionRu: "Экстракционные щипцы всех типов, элеваторы Бейна, кюреты Лукаса, распаторы, ножницы",
		isSurgicalOrCritical: true,
		typicalItems: [
			"Щипцы экстракционные верхние и нижние",
			"Элеватор прямой стоматологический Бейна",
			"Кюрета хирургическая костная двухсторонняя Лукаса",
			"Костный распатор стоматологический",
			"Иглодержатель сосудистый микрохирургический",
		],
		criticalInspectionZonesRu: "Замковые соединения щипцов и ножниц, кремальера иглодержателя, рифленая поверхность ручек",
	},
	{
		id: "endodontic_files_reamers",
		nameRu: "Эндодонтический инструментарий (NiTi файлы, римеры, плаггеры)",
		descriptionRu: "Машинные и ручные файлы ProTaper/WaveOne, K-файлы, римеры, спредеры, плаггеры",
		isSurgicalOrCritical: false,
		typicalItems: [
			"NiTi файлы машинные ротационные ProTaper Gold",
			"K-файлы ручные эндодонтические ассорти №15–40",
			"Плаггеры вертикальной конденсации гуттаперчи",
			"Эндодонтическая калибровочная линейка",
		],
		criticalInspectionZonesRu: "Спиралевидные витки рабочих лезвий файлов, каучуковые стопперы, основание ручки",
	},
	{
		id: "restorative_carvers_pluggers",
		nameRu: "Терапевтический инструментарий (гладилки, штопферы, экскаваторы)",
		descriptionRu: "Двухсторонние гладилки, шаровидные штопферы, экскаваторы №1–3, шпатели для замешивания",
		isSurgicalOrCritical: false,
		typicalItems: [
			"Гладилка двухсторонняя серповидная",
			"Штопфер шаровидный / цилиндрический полировочный",
			"Экскаватор стоматологический острый №2",
			"Металлический шпатель для цементов",
		],
		criticalInspectionZonesRu: "Рабочая кромка экскаватора, переход рабочей части гладилки в шейку инструмента",
	},
];
