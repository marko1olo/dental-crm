/**
 * mischRecommendationsCatalog.ts — Конфигурации систем и протоколов для плотностей D1-D5 (Мандат 8b <= 120 строк).
 */

export const MISCH_D5_DATA = {
	mischClass: "D5" as const,
	densityLabelRu: "D5 (<150 HU) — Незрелая кость / Костный дефект",
	bodyDesignRu: "Установка стандартного имплантата отложена / Бикортикальная фиксация",
	threadTypeRu: "Широкая штопорная резьба с максимальным шагом",
	primaryStabilityExpectationRu: "Низкая (ISQ < 50, торк < 15 N·cm)",
	recommendedSystems: [
		{ brand: "Straumann", line: "BLX (Roxolid / SLActive)", reasonRu: "Максимальная гидрофильность поверхности" },
		{ brand: "Osstem", line: "TS IV SA", reasonRu: "Специальная коническая форма для мягкой кости" },
	],
	surgicalProtocolRu: "Показана НКР (GBR) с костнозамещающим материалом или синус-лифтинг.",
	requiresCorticalTap: false, requiresUnderDrilling: false, underDrillingMm: 0, requiresBoneAugmentation: true,
};

export const MISCH_D4_DATA = {
	mischClass: "D4" as const,
	densityLabelRu: "D4 (150–350 HU) — Мягкая губчатая кость",
	bodyDesignRu: "Выраженный конус с активным самонарезающим телом",
	threadTypeRu: "Агрессивная конденсирующая резьба с глубокими витками",
	primaryStabilityExpectationRu: "Умеренная (ISQ 60–68, целевой торк 30–40 N·cm)",
	recommendedSystems: [
		{ brand: "Nobel Biocare", line: "NobelActive", reasonRu: "Биконическое тело с конденсирующей резьбой" },
		{ brand: "MIS Implants", line: "V3 / SEVEN", reasonRu: "Микрокольца на шейке и переменная резьба" },
		{ brand: "Osstem", line: "TS IV SA", reasonRu: "Штопорная резьба с открытой верхушкой" },
	],
	surgicalProtocolRu: "Применить недопрепарирование ложа (Under-drilling -1.0 мм) либо остеотомную экспансию.",
	requiresCorticalTap: false, requiresUnderDrilling: true, underDrillingMm: 1.0, requiresBoneAugmentation: false,
};

export const MISCH_D3_DATA = {
	mischClass: "D3" as const,
	densityLabelRu: "D3 (350–850 HU) — Тонкий кортикал и губчатая кость",
	bodyDesignRu: "Анатомический конический или корневидный контур",
	threadTypeRu: "Двойная резьба с микрорезьбой в пришеечной зоне",
	primaryStabilityExpectationRu: "Высокая (ISQ 70–75, целевой торк 35–45 N·cm)",
	recommendedSystems: [
		{ brand: "Dentium", line: "SuperLine", reasonRu: "Глубокая двойная резьба с коническим соединением 11°" },
		{ brand: "Osstem", line: "TS III SA", reasonRu: "Сбалансированная штопорная резьба" },
		{ brand: "Straumann", line: "Bone Level Tapered (BLT)", reasonRu: "Конический апекс для точного позиционирования" },
	],
	surgicalProtocolRu: "Стандартный протокол препарирования с финишным профильным сверлом.",
	requiresCorticalTap: false, requiresUnderDrilling: false, underDrillingMm: 0, requiresBoneAugmentation: false,
};

export const MISCH_D2_DATA = {
	mischClass: "D2" as const,
	densityLabelRu: "D2 (850–1250 HU) — Плотная кортикальная и трабекулярная кость",
	bodyDesignRu: "Цилиндрический или умеренно конический корневидный имплантат",
	threadTypeRu: "Стандартная микрорезьба с умеренным шагом",
	primaryStabilityExpectationRu: "Превосходная (ISQ 75–85, целевой торк 35–45 N·cm)",
	recommendedSystems: [
		{ brand: "Osstem", line: "TS III SA / CA", reasonRu: "Золотой стандарт остеоинтеграции" },
		{ brand: "Straumann", line: "Bone Level (BLT / BLX)", reasonRu: "Сплав Roxolid с высокой прочностью" },
		{ brand: "Nobel Biocare", line: "NobelParallel CC", reasonRu: "Равномерное распределение нагрузки" },
		{ brand: "Dentium", line: "SuperLine", reasonRu: "Стабильность маргинальной кости" },
	],
	surgicalProtocolRu: "Золотой стандарт: полное сверление до номинального диаметра, обильное охлаждение.",
	requiresCorticalTap: false, requiresUnderDrilling: false, underDrillingMm: 0, requiresBoneAugmentation: false,
};

export const MISCH_D1_DATA = {
	mischClass: "D1" as const,
	densityLabelRu: "D1 (>1250 HU) — Сверхплотная кортикальная кость (Oak-like)",
	bodyDesignRu: "Цилиндрический имплантат с параллельными стенками",
	threadTypeRu: "Мелкая резьба с малым шагом без расширения",
	primaryStabilityExpectationRu: "Максимальная механическая (ISQ 80+, контролировать перегрев!)",
	recommendedSystems: [
		{ brand: "Straumann", line: "Standard Plus / BLT", reasonRu: "Снижает компрессионное напряжение" },
		{ brand: "Nobel Biocare", line: "NobelParallel CC", reasonRu: "Параллельный профиль предотвращает заклинивание" },
		{ brand: "Osstem", line: "TS III SA (метчик)", reasonRu: "Профильный метчик обеспечивает пассивную посадку" },
	],
	surgicalProtocolRu: "ОБЯЗАТЕЛЕН кортикальный метчик. Обильная ирригация физраствором 4°C. Торк не выше 45 N·cm.",
	requiresCorticalTap: true, requiresUnderDrilling: false, underDrillingMm: 0, requiresBoneAugmentation: false,
};
