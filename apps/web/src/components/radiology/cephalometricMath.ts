/**
 * DENTE CRM — Orthodontic Cephalometric Mathematics, Landmark Definitions & Clinical Protocols
 * Standards: Steiner, Tweed, Downs, Jacobson (Wits), Ricketts, McNamara
 * Mandate 8b: Monolith extraction (<= 800 lines).
 */

import {
	type CephalometricAnalysisResult,
	type LandmarkKey,
	type LandmarkMap,
	type Point2D,
} from "../orthodontics/cephalometricMath";

// Re-export all underlying mathematical engines, landmarks and presets
export * from "../orthodontics/cephalometricMath";

export const LANDMARK_CLINICAL_ROLES: Record<LandmarkKey, { depends: string; clinicalTip: string }> = {
	S: {
		depends: "Углы SNA (82°±2°), SNB (80°±2°), SN-GoGn (32°±3°), U1-SN (104°±2°), Y-ось Downs",
		clinicalTip: "Центр контура турецкого седла (гипофизарной ямки клиновидной кости).",
	},
	N: {
		depends: "Ключевая точка основания черепа: углы SNA, SNB, ANB (Класс I/II/III), 1-NA, 1-NB, Facial Angle, Convexity",
		clinicalTip: "Лобно-носовой шов на профильном контуре черепа (переход лобной кости в носовую).",
	},
	A: {
		depends: "Угол SNA (ВЧ к черепу), угол ANB (Скелетный класс), Wits-число, 1-NA (22°±2° и 4±1 мм), McNamara A-Nperp",
		clinicalTip: "Точка наибольшей вогнутости переднего контура апикального базиса верхней челюсти под остью ANS.",
	},
	B: {
		depends: "Угол SNB (НЧ к черепу), угол ANB (Скелетный класс), Wits-число, 1-NB (25°±2° и 4±1 мм)",
		clinicalTip: "Точка наибольшей вогнутости переднего контура альвеолярной части нижней челюсти над погонионом Pog.",
	},
	Pog: {
		depends: "Лицевой угол Downs (N-Pog to FH), угол выпуклости Downs (N-A-Pog), McNamara Pog-Nperp",
		clinicalTip: "Наиболее передняя точка подбородочного выступа на профиле симфиза нижней челюсти.",
	},
	Me: {
		depends: "Плоскость основания нижней челюсти MP, угол FMA (25°±3°), угол наклона SN-GoGn, наклон резцов L1-MP",
		clinicalTip: "Самая нижняя точка контура подбородочного симфиза нижней челюсти.",
	},
	Gn: {
		depends: "Гнатион: угол SN-GoGn, ось роста лица Y-Axis (Downs), угол FMA (Tweed)",
		clinicalTip: "Передне-нижняя точка контура подбородочного симфиза (между точками Pog и Me).",
	},
	Go: {
		depends: "Угол нижней челюсти: плоскость MP, угол FMA (Tweed), SN-GoGn (Steiner), межбазисный угол NL-ML",
		clinicalTip: "Вершина угла нижней челюсти (переход тела челюсти в восходящую ветвь).",
	},
	ANS: {
		depends: "Нёбная плоскость NL, межбазисный угол NL-ML (Ricketts, 25°±4°), Wits-ориентир",
		clinicalTip: "Вершина костного выступа передней носовой ости на дистальном крае грушевидного отверстия.",
	},
	PNS: {
		depends: "Нёбная плоскость NL, межбазисный угол NL-ML (Ricketts), окклюзионная плоскость",
		clinicalTip: "Задний дистальный край твердого нёба (вершина задней носовой ости).",
	},
	Or: {
		depends: "Франкфуртская горизонталь FH (FMA Tweed, Facial Angle Downs, Y-Axis, McNamara)",
		clinicalTip: "Самая нижняя точка инфраорбитального края глазницы на рентгенограмме.",
	},
	Po: {
		depends: "Франкфуртская горизонталь FH (FMA Tweed, Facial Angle Downs, Y-Axis, McNamara)",
		clinicalTip: "Верхний край наружного слухового прохода.",
	},
	U1t: {
		depends: "Инклинация 1-NA (22°±2°), расстояние 1-NA (4±1 мм), U1-SN (104°±2°), межрезцовый угол U1-L1",
		clinicalTip: "Режущий край наиболее выступающего центрального резца верхней челюсти (1.1 или 2.1).",
	},
	U1a: {
		depends: "Продольная ось верхнего резца: угол 1-NA (22°±2°), угол U1-SN (104°±2°), межрезцовый U1-L1",
		clinicalTip: "Верхушка корня центрального резца верхней челюсти.",
	},
	L1t: {
		depends: "Инклинация 1-NB (25°±2°), расстояние 1-NB (4±1 мм), L1-MP / IMPA (90°±3°), межрезцовый U1-L1",
		clinicalTip: "Режущий край наиболее выступающего центрального резца нижней челюсти (4.1 или 3.1).",
	},
	L1a: {
		depends: "Продольная ось нижнего резца: угол 1-NB (25°±2°), угол L1-MP / IMPA (90°±3°), межрезцовый U1-L1",
		clinicalTip: "Верхушка корня центрального резца нижней челюсти.",
	},
};

export function getRequiredLandmarksForMeasurement(id: string): LandmarkKey[] {
	switch (id) {
		case "SNA": return ["S", "N", "A"];
		case "SNB": return ["S", "N", "B"];
		case "ANB": return ["S", "N", "A", "B"];
		case "Wits": return ["A", "B", "U1t", "L1t"];
		case "Downs-FA": return ["N", "Pog", "Po", "Or"];
		case "Downs-Conv": return ["N", "A", "Pog"];
		case "Downs-AB": return ["N", "Pog", "A", "B"];
		case "SN-GoGn": return ["S", "N", "Go", "Gn"];
		case "FMA": return ["Po", "Or", "Go", "Me"];
		case "Downs-YAxis": return ["S", "Gn", "Po", "Or"];
		case "Downs-CantOP": return ["Po", "Or", "U1t", "L1t"];
		case "U1-SN": return ["S", "N", "U1t", "U1a"];
		case "1-NA-Angle": return ["N", "A", "U1t", "U1a"];
		case "1-NA-Dist": return ["N", "A", "U1t"];
		case "L1-MP": return ["Go", "Me", "L1t", "L1a"];
		case "1-NB-Angle": return ["N", "B", "L1t", "L1a"];
		case "1-NB-Dist": return ["N", "B", "L1t"];
		case "U1-L1": return ["U1t", "U1a", "L1t", "L1a"];
		case "NL-ML": return ["ANS", "PNS", "Go", "Me"];
		case "McNamara-A-Nperp": return ["N", "A", "Po", "Or"];
		case "McNamara-Pog-Nperp": return ["N", "Pog", "Po", "Or"];
		default: return [];
	}
}

/**
 * Form 043-1/u Consultation Synthesis without full Ceph requirement (Autonomy preservation)
 */
export function generateConsultationNoteWithoutCeph(
	patientName?: string,
	isImageLoaded = false,
	placedCount = 0,
	totalCount = 16,
): string {
	const dateStr = new Date().toLocaleDateString("ru-RU");
	const imageStatus = isImageLoaded
		? "Боковая ТРГ загружена в систему, прикреплена к электронной медицинской карте."
		: "Направлен на выполнение боковой ТРГ черепа (телерентгенографии).";

	const landmarkStatus =
		placedCount > 0
			? `Установлено анатомических ориентиров: ${placedCount} из ${totalCount}. `
			: "Ориентиры не расставлены (предварительный клинический осмотр). ";

	return `ПЕРВИЧНАЯ ОРТОДОНТИЧЕСКАЯ КОНСУЛЬТАЦИЯ
Дата приёма: ${dateStr}
Пациент: ${patientName || "Пациент"}

1. КЛИНИЧЕСКИЙ ОСМОТР И АНАМНЕЗ:
• Жалобы: нарушение эстетики улыбки, скученность зубных рядов, затрудненное пережёвывание пищи.
• Внешний осмотр: симметрия лица сохранена, носогубные складки умеренно выражены. Смыкание губ без выраженного напряжения.
• Визуальная оценка профиля: гармоничный / умеренно выпуклый профиль.
• Осмотр полости рта: слизистая оболочка бледно-розовая, умеренно увлажнена. Прикрепление уздечек губ и языка в пределах нормы.

2. ДИАГНОСТИЧЕСКИЙ СТАТУС (ТРГ / ТЕЛЕРЕНТГЕНОГРАФИЯ):
• ${imageStatus}
• ${landmarkStatus}Полный угловой цефалометрический расчет Штайнера/Твида/Риккетса отложен на этап детального цифрового моделирования (Setup) и не блокирует текущую консультацию.

3. ПРЕДВАРИТЕЛЬНЫЙ ДИАГНОЗ ПО МКБ-10:
• K07.2 Аномалии соотношений зубных дуг.
• K07.3 Аномалии положения зубов (скученное положение резцов).

4. ПЛАН ВЕДЕНИЯ И НАЗНАЧЕНИЯ:
• Фотометрический протокол лица и зубных рядов (8 стандартных проекций).
• Снятие диагностических оттисков / интраоральное 3D-сканирование для виртуального сетапа.
• Профессиональная гигиена полости рта и санация очагов кариеса перед фиксацией ортодонтической аппаратуры.
• Повторный приём: обсуждение 3D-плана перемещения зубов и выбор аппаратуры (брекеты / элайнеры).`;
}
