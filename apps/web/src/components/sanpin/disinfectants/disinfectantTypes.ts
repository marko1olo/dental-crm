/**
 * apps/web/src/components/sanpin/disinfectants/disinfectantTypes.ts
 *
 * Модели данных и пресеты дезинфицирующих растворов (СанПиН 3.3686-21).
 * Мандат 8b: строго <= 120 строк.
 */

export interface DisinfectantSolutionRecord {
	id: string;
	tradeNameRu: string;
	purposeRu: string;
	concentrationPercent: number;
	preparationDate: string;
	expiryDate: string;
	testStripResultRu: string;
	responsibleNurseRu: string;
	volumeLiters: number;
}

export function getRecentIsoDate(daysOffset = 0): string {
	const d = new Date(Date.now() + daysOffset * 86400000);
	return d.toISOString().slice(0, 10);
}

export function getRecentDateTimeRu(daysOffset = 0, timeStr = "08:00"): string {
	return `${getRecentIsoDate(daysOffset)} ${timeStr}`;
}

export const DEFAULT_DISINFECTANT_RECORDS: DisinfectantSolutionRecord[] = [
	{
		id: "ds-01",
		tradeNameRu: "Аламинол (раствор 1.5%)",
		purposeRu: "Предстерилизационная очистка и дезинфекция инструментов (ЦСО)",
		concentrationPercent: 1.5,
		preparationDate: getRecentDateTimeRu(0, "08:00"),
		expiryDate: getRecentDateTimeRu(14, "08:00"),
		testStripResultRu: "Дезиконт-Аламинол: 1.5% норма (тест пройден)",
		responsibleNurseRu: "Медсестра ЦСО",
		volumeLiters: 10,
	},
	{
		id: "ds-02",
		tradeNameRu: "Бациллол АФ (экспресс-спрей)",
		purposeRu: "Экстренная дезинфекция поверхностей установки и наконечников",
		concentrationPercent: 100,
		preparationDate: `${getRecentIsoDate(0)} (заводской)`,
		expiryDate: getRecentIsoDate(365),
		testStripResultRu: "Готовый заводской раствор (активен)",
		responsibleNurseRu: "Медсестра ЦСО",
		volumeLiters: 1.0,
	},
	{
		id: "ds-03",
		tradeNameRu: "Оптимакс Про (раствор 1.0%)",
		purposeRu: "Дезинфекция слепков, зуботехнических оттисков и ложек",
		concentrationPercent: 1.0,
		preparationDate: getRecentDateTimeRu(-1, "09:00"),
		expiryDate: getRecentDateTimeRu(13, "09:00"),
		testStripResultRu: "Тест-полоска Оптимакс: 1.0% норма",
		responsibleNurseRu: "Старшая медсестра",
		volumeLiters: 5,
	},
	{
		id: "ds-04",
		tradeNameRu: "Дезискраб (раствор 2.0%)",
		purposeRu: "Хирургическая обработка поверхностей и генеральная уборка операционной",
		concentrationPercent: 2.0,
		preparationDate: getRecentDateTimeRu(0, "07:30"),
		expiryDate: getRecentDateTimeRu(14, "07:30"),
		testStripResultRu: "Дезиконт-Дезискраб: 2.0% норма",
		responsibleNurseRu: "Медсестра ЦСО",
		volumeLiters: 8,
	},
	{
		id: "ds-05",
		tradeNameRu: "Бриллиант Классик (раствор 2.0%)",
		purposeRu: "Обезвреживание медицинских отходов классов Б и В",
		concentrationPercent: 2.0,
		preparationDate: getRecentDateTimeRu(0, "08:15"),
		expiryDate: getRecentDateTimeRu(7, "08:15"),
		testStripResultRu: "Тест-полоска Бриллиант: 2.0% норма",
		responsibleNurseRu: "Медсестра ЦСО",
		volumeLiters: 15,
	},
];
