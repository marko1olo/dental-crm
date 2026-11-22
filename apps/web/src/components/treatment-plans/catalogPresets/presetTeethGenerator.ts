/**
 * presetTeethGenerator.ts — Генератор 3 тарифов лечения на основе зубной формулы одонтограммы.
 * Мандаты 8b, 8e, 8n: Реальные зубы пациента (11–85), 0 моков, 3 альтернативных плана.
 */

import type { ToothData } from "../types";
import type { TreatmentPlanItem, TreatmentPlanStage, TreatmentPlanTier } from "../treatmentPlanTypes";
import { rublesToKopecks } from "@dental/shared";
import { mkItem, mkStage } from "./presetHelpers";
import { INTACT_PREVENTION_TIERS } from "./presetCanonicalTiers";

/**
 * buildPresenterTiersFromTeeth — Динамический генератор 3 тарифов строго по одонтограмме пациента.
 * Формирует этапы и финансовые сметы для ВСЕХ реальных патологий пациента без хардкода 16/25/46.
 */
export function buildPresenterTiersFromTeeth(teeth?: readonly ToothData[] | undefined): readonly TreatmentPlanTier[] {
	if (!teeth || !Array.isArray(teeth) || teeth.length === 0) {
		return INTACT_PREVENTION_TIERS;
	}

	const teethList = teeth;
	const cariesTeeth = [
		...new Set(
			teethList
				.filter((t) => /caries|кариес/i.test(t.state || t.diagnosis || ""))
				.map((t) => t.toothNumber ?? t.number)
				.filter((n): n is number => typeof n === "number" && n >= 11 && n <= 85),
		),
	];
	const missingTeeth = [
		...new Set(
			teethList
				.filter((t) => /missing|отсутств/i.test(t.state || t.diagnosis || ""))
				.map((t) => t.toothNumber ?? t.number)
				.filter((n): n is number => typeof n === "number" && n >= 11 && n <= 85),
		),
	];
	const pulpitisTeeth = [
		...new Set(
			teethList
				.filter((t) => /pulpitis|пульпит|periodontitis|периодонтит/i.test(t.state || t.diagnosis || ""))
				.map((t) => t.toothNumber ?? t.number)
				.filter((n): n is number => typeof n === "number" && n >= 11 && n <= 85),
		),
	];

	if (cariesTeeth.length === 0 && missingTeeth.length === 0 && pulpitisTeeth.length === 0) {
		return INTACT_PREVENTION_TIERS;
	}

	// 1. Эконом
	const econTherapyItems: TreatmentPlanItem[] = [];
	for (const tooth of cariesTeeth) {
		econTherapyItems.push(
			mkItem(`dyn-ec-c-${tooth}`, tooth, "A16.07.002", `Восстановление зуба ${tooth} пломбой световой полимеризации`, 3500, 3500, 1, "stage_1_therapy", "Терапия"),
		);
	}
	for (const tooth of pulpitisTeeth) {
		econTherapyItems.push(
			mkItem(`dyn-ec-p-${tooth}`, tooth, "A16.07.008.002", `Эндодонтическое лечение зуба ${tooth} (обработка и пломбирование каналов)`, 9500, 9500, 1, "stage_1_therapy", "Терапия"),
			mkItem(`dyn-ec-core-${tooth}`, tooth, "A16.07.003.001", `Восстановление культи зуба ${tooth} под коронку (литая вкладка)`, 4500, 4500, 1, "stage_1_therapy", "Терапия"),
		);
	}
	const econSurgeryItems: TreatmentPlanItem[] = [];
	for (const tooth of missingTeeth) {
		econSurgeryItems.push(
			mkItem(`dyn-ec-imp-${tooth}`, tooth, "A16.07.054.001", `Дентальная имплантация в области зуба ${tooth}`, 32000, 32000, 1, "stage_2_surgery", "Хирургия"),
		);
	}
	const econOrthoItems: TreatmentPlanItem[] = [];
	for (const tooth of pulpitisTeeth) {
		econOrthoItems.push(
			mkItem(`dyn-ec-cr-${tooth}`, tooth, "A16.07.004", `Восстановление зуба ${tooth} металлокерамической коронкой Co-Cr`, 14000, 14000, 1, "stage_3_orthopedics", "Ортопедия"),
		);
	}
	for (const tooth of missingTeeth) {
		econOrthoItems.push(
			mkItem(`dyn-ec-imp-cr-${tooth}`, tooth, "A16.07.006", `Протезирование на имплантате ${tooth} металлокерамической коронкой`, 22000, 22000, 1, "stage_3_orthopedics", "Ортопедия"),
		);
	}
	const econStages: TreatmentPlanStage[] = [];
	let stageIdx = 1;
	if (econTherapyItems.length > 0) {
		const total = econTherapyItems.reduce((acc, it) => acc + it.priceRub * it.quantity, 0);
		econStages.push(mkStage("st-econ-1", stageIdx++, "stage_1_therapy", "Этап 1: Неотложная помощь и терапия", "Санация очагов инфекции и кариеса", `Терапевтическое лечение зубов: ${[...cariesTeeth, ...pulpitisTeeth].join(", ")}`, total, rublesToKopecks(total), econTherapyItems));
	}
	if (econSurgeryItems.length > 0) {
		const total = econSurgeryItems.reduce((acc, it) => acc + it.priceRub * it.quantity, 0);
		econStages.push(mkStage("st-econ-2", stageIdx++, "stage_2_surgery", "Этап 2: Хирургия и имплантация", "Восстановление жевательной опоры", `Дентальная имплантация в области: ${missingTeeth.join(", ")}`, total, rublesToKopecks(total), econSurgeryItems));
	}
	if (econOrthoItems.length > 0) {
		const total = econOrthoItems.reduce((acc, it) => acc + it.priceRub * it.quantity, 0);
		econStages.push(mkStage("st-econ-3", stageIdx++, "stage_3_orthopedics", "Этап 3: Ортопедия и протезирование", "Функциональное восстановление жевания", `Протезирование зубов металлокерамикой: ${[...pulpitisTeeth, ...missingTeeth].join(", ")}`, total, rublesToKopecks(total), econOrthoItems));
	}

	// 2. Оптимум
	const stdTherapyItems: TreatmentPlanItem[] = [];
	for (const tooth of cariesTeeth) {
		stdTherapyItems.push(
			mkItem(`dyn-std-c-${tooth}`, tooth, "A16.07.002.001", `Восстановление зуба ${tooth} нанокомпозитом световой полимеризации`, 4800, 4800, 1, "stage_1_therapy", "Терапия"),
		);
	}
	for (const tooth of pulpitisTeeth) {
		stdTherapyItems.push(
			mkItem(`dyn-std-p-${tooth}`, tooth, "A16.07.008.002", `Эндодонтическое лечение зуба ${tooth} под операционным микроскопом`, 13500, 13500, 1, "stage_1_therapy", "Терапия"),
			mkItem(`dyn-std-core-${tooth}`, tooth, "A16.07.003.001", `Восстановление зуба ${tooth} со стекловолоконным штифтом`, 5500, 5500, 1, "stage_1_therapy", "Терапия"),
		);
	}
	const stdSurgeryItems: TreatmentPlanItem[] = [];
	for (const tooth of missingTeeth) {
		stdSurgeryItems.push(
			mkItem(`dyn-std-imp-${tooth}`, tooth, "A16.07.054.001", `Внутрикостная дентальная имплантация SLA-системы в области зуба ${tooth}`, 42000, 42000, 1, "stage_2_surgery", "Хирургия"),
		);
	}
	const stdOrthoItems: TreatmentPlanItem[] = [];
	if (missingTeeth.length > 0 || pulpitisTeeth.length > 0) {
		stdOrthoItems.push(
			mkItem("dyn-std-scan", undefined, "A02.07.010", "Оптическое внутриротовое 3D-сканирование зубного ряда и регистрация окклюзии", 6500, 6500, 1, "stage_3_orthopedics", "Ортопедия"),
		);
	}
	for (const tooth of pulpitisTeeth) {
		stdOrthoItems.push(
			mkItem(`dyn-std-cr-${tooth}`, tooth, "A16.07.004.001", `Восстановление зуба ${tooth} коронкой из многослойного диоксида циркония`, 26000, 26000, 1, "stage_3_orthopedics", "Ортопедия"),
		);
	}
	for (const tooth of missingTeeth) {
		stdOrthoItems.push(
			mkItem(`dyn-std-imp-cr-${tooth}`, tooth, "A16.07.006", `Протезирование на имплантате ${tooth} (диоксид циркония с винтовой фиксацией)`, 34000, 34000, 1, "stage_3_orthopedics", "Ортопедия"),
		);
	}
	const stdStages: TreatmentPlanStage[] = [];
	stageIdx = 1;
	if (stdTherapyItems.length > 0) {
		const total = stdTherapyItems.reduce((acc, it) => acc + it.priceRub * it.quantity, 0);
		stdStages.push(mkStage("st-std-1", stageIdx++, "stage_1_therapy", "Этап 1: Неотложная помощь и терапия", "Санация под увеличением и биосовместимая изоляция", `Терапевтическое лечение зубов: ${[...cariesTeeth, ...pulpitisTeeth].join(", ")}`, total, rublesToKopecks(total), stdTherapyItems));
	}
	if (stdSurgeryItems.length > 0) {
		const total = stdSurgeryItems.reduce((acc, it) => acc + it.priceRub * it.quantity, 0);
		stdStages.push(mkStage("st-std-2", stageIdx++, "stage_2_surgery", "Этап 2: Хирургия и имплантация", "Двухэтапная дентальная имплантация", `Установка SLA-имплантатов в области: ${missingTeeth.join(", ")}`, total, rublesToKopecks(total), stdSurgeryItems));
	}
	if (stdOrthoItems.length > 0) {
		const total = stdOrthoItems.reduce((acc, it) => acc + it.priceRub * it.quantity, 0);
		stdStages.push(mkStage("st-std-3", stageIdx++, "stage_3_orthopedics", "Этап 3: Ортопедия и протезирование", "Анатомические коронки из диоксида циркония", `Циркониевые коронки CAD/CAM: ${[...pulpitisTeeth, ...missingTeeth].join(", ")}`, total, rublesToKopecks(total), stdOrthoItems));
	}

	// 3. Премиум
	const premTherapyItems: TreatmentPlanItem[] = [];
	for (const tooth of cariesTeeth) {
		premTherapyItems.push(
			mkItem(`dyn-pr-c-${tooth}`, tooth, "A16.07.003", `Восстановление зуба ${tooth} прессованной керамической накладкой Inlay`, 8500, 8500, 1, "stage_1_therapy", "Терапия"),
		);
	}
	for (const tooth of pulpitisTeeth) {
		premTherapyItems.push(
			mkItem(`dyn-pr-p-${tooth}`, tooth, "A16.07.008.002", `Прецизионная микроскопная эндодонтия зуба ${tooth} с биокерамикой`, 16500, 16500, 1, "stage_1_therapy", "Терапия"),
			mkItem(`dyn-pr-core-${tooth}`, tooth, "A16.07.003.001", `Билдап зуба ${tooth} композитом с кварцевым штифтом`, 7500, 7500, 1, "stage_1_therapy", "Терапия"),
		);
	}
	const premSurgeryItems: TreatmentPlanItem[] = [];
	for (const tooth of missingTeeth) {
		premSurgeryItems.push(
			mkItem(`dyn-pr-imp-${tooth}`, tooth, "A16.07.054.001", `Дентальная имплантация премиум-системы в области зуба ${tooth}`, 68000, 68000, 1, "stage_2_surgery", "Хирургия"),
			mkItem(`dyn-pr-guide-${tooth}`, tooth, "A16.07.054", `Изготовление навигационного 3D-шаблона для зуба ${tooth}`, 12000, 12000, 1, "stage_2_surgery", "Хирургия"),
		);
	}
	const premOrthoItems: TreatmentPlanItem[] = [];
	if (missingTeeth.length > 0 || pulpitisTeeth.length > 0) {
		premOrthoItems.push(
			mkItem("dyn-pr-scan", undefined, "A02.07.010", "Оптическое внутриротовое 3D-сканирование зубного ряда высокой точности", 6500, 6500, 1, "stage_3_orthopedics", "Ортопедия"),
		);
	}
	for (const tooth of pulpitisTeeth) {
		premOrthoItems.push(
			mkItem(`dyn-pr-cr-${tooth}`, tooth, "A16.07.004.002", `Восстановление зуба ${tooth} керамической коронкой с индивидуальной раскраской`, 38000, 38000, 1, "stage_3_orthopedics", "Ортопедия"),
		);
	}
	for (const tooth of missingTeeth) {
		premOrthoItems.push(
			mkItem(`dyn-pr-imp-cr-${tooth}`, tooth, "A16.07.006", `Протезирование на имплантате ${tooth} (индивидуальный абатмент Ti-Base + коронка)`, 48000, 48000, 1, "stage_3_orthopedics", "Ортопедия"),
		);
	}
	const premStages: TreatmentPlanStage[] = [];
	stageIdx = 1;
	if (premTherapyItems.length > 0) {
		const total = premTherapyItems.reduce((acc, it) => acc + it.priceRub * it.quantity, 0);
		premStages.push(mkStage("st-prem-1", stageIdx++, "stage_1_therapy", "Этап 1: Неотложная помощь и терапия", "Премиальная санация и микроскопная эндодонтия", `Керамические накладки и микроэндодонтия: ${[...cariesTeeth, ...pulpitisTeeth].join(", ")}`, total, rublesToKopecks(total), premTherapyItems));
	}
	if (premSurgeryItems.length > 0) {
		const total = premSurgeryItems.reduce((acc, it) => acc + it.priceRub * it.quantity, 0);
		premStages.push(mkStage("st-prem-2", stageIdx++, "stage_2_surgery", "Этап 2: Хирургия и имплантация", "Навигационная имплантация премиум-класса", `Премиальная имплантация по 3D-шаблону в области: ${missingTeeth.join(", ")}`, total, rublesToKopecks(total), premSurgeryItems));
	}
	if (premOrthoItems.length > 0) {
		const total = premOrthoItems.reduce((acc, it) => acc + it.priceRub * it.quantity, 0);
		premStages.push(mkStage("st-prem-3", stageIdx++, "stage_3_orthopedics", "Этап 3: Ортопедия и протезирование", "Безметалловая керамика и индивидуальные абатменты", `Индивидуальные коронки и абатменты: ${[...pulpitisTeeth, ...missingTeeth].join(", ")}`, total, rublesToKopecks(total), premOrthoItems));
	}

	const econTotalRub = econStages.reduce((sum, s) => sum + s.totalRub, 0);
	const stdTotalRub = stdStages.reduce((sum, s) => sum + s.totalRub, 0);
	const premTotalRub = premStages.reduce((sum, s) => sum + s.totalRub, 0);

	return [
		{
			tierId: "economy",
			title: "Базовый (Эконом)",
			subtitle: "Стандартная санация, металлокерамика Co-Cr, базовая имплантация",
			badge: "Эконом",
			isRecommended: false,
			totalRub: econTotalRub,
			totalKopecks: rublesToKopecks(econTotalRub),
			amountKopecks: BigInt(rublesToKopecks(econTotalRub)),
			warrantyYears: 1,
			keyAdvantages: [
				"Базовая терапевтическая санация полости рта",
				"Проверенный микрогибридный композит",
				"Надежная имплантационная опора",
				"Металлокерамические коронки Co-Cr",
				"Гарантия клиники 1 год",
			],
			stages: econStages,
		},
		{
			tierId: "optimum",
			title: "Оптимальный",
			subtitle: "Клинический золотой стандарт: нанокомпозит, микроскоп, диоксид циркония, SLA-имплантат",
			badge: "Рекомендуемый",
			isRecommended: true,
			totalRub: stdTotalRub,
			totalKopecks: rublesToKopecks(stdTotalRub),
			amountKopecks: BigInt(rublesToKopecks(stdTotalRub)),
			warrantyYears: 3,
			keyAdvantages: [
				"Лечение каналов под операционным дентальным микроскопом",
				"Высокопрочный нанокомпозит световой полимеризации",
				"Дентальная имплантация с гидрофильной SLA-поверхностью",
				"Коронки из многослойного диоксида циркония",
				"Гарантия клиники 3 года",
			],
			stages: stdStages,
		},
		{
			tierId: "premium",
			title: "Премиум",
			subtitle: "Тотальная эстетика: прессованная безметалловая керамика, навигационная имплантация",
			badge: "Эстетика",
			isRecommended: false,
			totalRub: premTotalRub,
			totalKopecks: rublesToKopecks(premTotalRub),
			amountKopecks: BigInt(rublesToKopecks(premTotalRub)),
			warrantyYears: 10,
			keyAdvantages: [
				"Премиальная дентальная имплантация высокой гидрофильности",
				"Навигационный хирургический 3D-шаблон CAD/CAM",
				"Прессованная керамика с индивидуальной раскраской",
				"Индивидуальный фрезерованный абатмент Ti-Base",
				"Пожизненная гарантия на остеоинтеграцию имплантата",
			],
			stages: premStages,
		},
	];
}
