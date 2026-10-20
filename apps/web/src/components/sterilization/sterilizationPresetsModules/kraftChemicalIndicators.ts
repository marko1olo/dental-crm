/**
 * apps/web/src/components/sterilization/sterilizationPresetsModules/kraftChemicalIndicators.ts
 *
 * Нормативные химические индикаторы 4-5 классов.
 * Мандат 8b: строго <= 120 строк.
 */

import type { ChemicalIndicatorOption } from "./types.js";

export const STATUTORY_CHEMICAL_INDICATOR_OPTIONS: readonly ChemicalIndicatorOption[] =
	[
		{
			id: "vinar_intetest_134_5",
			manufacturer: "Винар",
			tradeName: "ИнтеТЕСТ-В-134/5",
			indicatorClass: 5,
			indicatorClassRu: "5 класс (Химический интегратор пара)",
			methodType: "steam",
			targetRegimeRu: "134°C / 2.1 бар / 5 мин (в упаковке)",
			standardResultVerdict: "Цвет эталона достигнут / Стерильно",
			notesRu:
				"Контроль критических параметров пара во всех точках камеры автоклавов B-класса",
		},
		{
			id: "vinar_steritest_134_4",
			manufacturer: "Винар",
			tradeName: "СтериТЕСТ-В-134",
			indicatorClass: 4,
			indicatorClassRu: "4 класс (Многопараметрический индикатор)",
			methodType: "steam",
			targetRegimeRu: "134°C / 2.1 бар / 5 мин",
			standardResultVerdict: "Цвет эталона достигнут / Стерильно",
			notesRu: "Многопеременный индикатор температуры и времени выдержки",
		},
		{
			id: "vinar_steritest_121_4",
			manufacturer: "Винар",
			tradeName: "СтериТЕСТ-В-121",
			indicatorClass: 4,
			indicatorClassRu: "4 класс (Многопараметрический индикатор)",
			methodType: "steam",
			targetRegimeRu: "121°C / 1.1 бар / 20 мин (для наконечников и пластика)",
			standardResultVerdict: "Цвет эталона достигнут / Стерильно",
			notesRu: "Индикатор 4 класса для щадящего деликатного режима 121°C",
		},
		{
			id: "dgm_steriguard_5_integrator",
			manufacturer: "DGM Steriguard",
			tradeName: "DGM Steriguard 5 Integrator",
			indicatorClass: 5,
			indicatorClassRu: "5 класс (Химический интегратор пара)",
			methodType: "steam",
			targetRegimeRu: "134°C / 2.1 бар / 5 мин или 20 мин (Prion)",
			standardResultVerdict: "Цвет эталона достигнут / Стерильно",
			notesRu:
				"Интегратор 5 класса DGM Steriguard с четким переходом в зону ACCEPT",
		},
		{
			id: "dgm_steriguard_4_multivariable",
			manufacturer: "DGM Steriguard",
			tradeName: "DGM Steriguard 4 Multivariable",
			indicatorClass: 4,
			indicatorClassRu: "4 класс (Многопеременный индикатор)",
			methodType: "steam",
			targetRegimeRu: "134°C / 2.1 бар / 5 мин (в упаковке)",
			standardResultVerdict: "Цвет эталона достигнут / Стерильно",
			notesRu:
				"Многопараметрический химический индикатор 4 класса DGM Steriguard",
		},
		{
			id: "medtest_medis_180",
			manufacturer: "Медтест",
			tradeName: "МедИС-180 (Медтест)",
			indicatorClass: 4,
			indicatorClassRu: "4 класс (Воздушная стерилизация)",
			methodType: "dry_heat",
			targetRegimeRu: "180°C / 60 минут",
			standardResultVerdict: "Цвет эталона достигнут / Стерильно",
			notesRu:
				"Контроль воздушной стерилизации в сухожаровых шкафах ГП-10, ГП-20, ГП-40",
		},
		{
			id: "medtest_medis_160",
			manufacturer: "Медтест",
			tradeName: "МедИС-160 (Медтест)",
			indicatorClass: 4,
			indicatorClassRu: "4 класс (Воздушная стерилизация)",
			methodType: "dry_heat",
			targetRegimeRu: "160°C / 150 минут",
			standardResultVerdict: "Цвет эталона достигнут / Стерильно",
			notesRu: "Контроль щадящего воздушного режима 160°C / 150 мин",
		},
		{
			id: "medtest_integrator_134",
			manufacturer: "Медтест",
			tradeName: "Медтест-Интегратор-134",
			indicatorClass: 5,
			indicatorClassRu: "5 класс (Паровой интегратор)",
			methodType: "steam",
			targetRegimeRu: "134°C / 2.1 бар / 5 мин",
			standardResultVerdict: "Цвет эталона достигнут / Стерильно",
			notesRu:
				"Интегратор 5 класса Медтест для паровых стерилизаторов B-класса",
		},
	];
