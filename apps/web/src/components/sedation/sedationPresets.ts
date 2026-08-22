/**
 * Russian Pediatric Dental Sedation Presets & Frankl Behavior Scale Catalog
 * Standards: Минздрав РФ / EAPD (European Academy of Paediatric Dentistry) / AAPD / СтАР
 * Inhalation sedation with nitrous oxide / oxygen mixture (ЗАКС: Закись Азота-Кислородная Седация).
 */

// ---------------------------------------------------------------------------
// 1. Frankl Behavior Rating Scale (Шкала поведения Франкла)
// ---------------------------------------------------------------------------

export type FranklRating =
	| 'frankl_1_definitely_negative'
	| 'frankl_2_negative'
	| 'frankl_3_positive'
	| 'frankl_4_definitely_positive';

export interface FranklScaleInfo {
	id: FranklRating;
	score: number;
	nameRu: string;
	shortLabelRu: string;
	badgeEmoji: string;
	colorToken: string;
	clinicalDescriptionRu: string;
	behaviorMarkersRu: string[];
	tacticalRecommendationsRu: string[];
	sedationIndicationLevel: 'strongly_recommended' | 'recommended' | 'optional' | 'minimal';
}

export const FRANKL_BEHAVIOR_SCALE: Record<FranklRating, FranklScaleInfo> = {
	frankl_1_definitely_negative: {
		id: 'frankl_1_definitely_negative',
		score: 1,
		nameRu: 'Категорически негативное (--)',
		shortLabelRu: '1: Категорически негативное',
		badgeEmoji: '😡',
		colorToken: 'var(--bad-fg)',
		clinicalDescriptionRu:
			'Отказ от контакта, громкий плач, агрессивное сопротивление, закрывание рта руками, панический страх или истерика при приближении врача.',
		behaviorMarkersRu: [
			'Отказ сесть в кресло или войти в кабинет',
			'Активное физическое сопротивление (отталкивает инструменты, закрывает рот)',
			'Непрекращающийся плач, крик, отсутствие вербального диалога',
			'Отказ от осмотра даже в присутствии родителей'
		],
		tacticalRecommendationsRu: [
			'Прямое показание к ЗАКС (ингаляционной седации N2O/O2) или медикаментозному сну (при объеме более 4 зубов)',
			'Мягкая адаптация: «волшебная маска с ароматом клубники/банана», демонстрация на игрушке (Tell-Show-Do)',
			'Присутствие родителя рядом в поле зрения ребенка',
			'Постепенное повышение концентрации N2O с 30% до 40–50%'
		],
		sedationIndicationLevel: 'strongly_recommended'
	},
	frankl_2_negative: {
		id: 'frankl_2_negative',
		score: 2,
		nameRu: 'Негативное (-)',
		shortLabelRu: '2: Негативное',
		badgeEmoji: '🙁',
		colorToken: 'var(--warn)',
		clinicalDescriptionRu:
			'Неохотное выполнение просьб, скрытое сопротивление, капризы, замкнутость, отсутствие зрительного контакта, скованность.',
		behaviorMarkersRu: [
			'Садится в кресло только после длительных уговоров',
			'Периодически закрывает рот, хнычет при виде шприца или наконечника',
			'Напряженная поза, сжатые кулачки, скованное дыхание',
			'Отвечает односложно или молчит'
		],
		tacticalRecommendationsRu: [
			'Рекомендуется ЗАКС для снятия психологического барьера и седативного расслабления (30–40% N2O)',
			'Техника вербального отвлечения (истории, аудиосказки, мультфильмы на потолочном мониторе)',
			'Положительное подкрепление за каждый маленький шаг',
			'Использование ароматических насадок на маску'
		],
		sedationIndicationLevel: 'recommended'
	},
	frankl_3_positive: {
		id: 'frankl_3_positive',
		score: 3,
		nameRu: 'Положительное (+)',
		shortLabelRu: '3: Положительное',
		badgeEmoji: '🙂',
		colorToken: 'var(--ok-fg)',
		clinicalDescriptionRu:
			'Осторожное согласие, выполнение инструкций врача, контактность при сохранении умеренной внутренней настороженности.',
		behaviorMarkersRu: [
			'Охотно садится в кресло и открывает рот по просьбе',
			'Задает вопросы о процедуре, проявляет умеренное любопытство',
			'Может слегка вздрагивать от звуков бормашины или слюноотсоса, но контролирует себя',
			'Следует указаниям врача при четком объяснении'
		],
		tacticalRecommendationsRu: [
			'ЗАКС факультативно (при длительных манипуляциях, препарировании или анестезии) в легкой дозе (30% N2O)',
			'Поддержание постоянного контакта и вербального поощрения',
			'Пошаговый протокол Tell-Show-Do'
		],
		sedationIndicationLevel: 'optional'
	},
	frankl_4_definitely_positive: {
		id: 'frankl_4_definitely_positive',
		score: 4,
		nameRu: 'Определенно позитивное (++)',
		shortLabelRu: '4: Определенно позитивное',
		badgeEmoji: '🌟',
		colorToken: 'var(--teal)',
		clinicalDescriptionRu:
			'Отличный контакт, интерес к процедуре, радость, полное доверие врачу, улыбка и активное сотрудничество.',
		behaviorMarkersRu: [
			'С радостью идет на контакт, улыбается, воспринимает визит как игру',
			'Широко открывает рот, помогает врачу, спокойно переносит манипуляции',
			'С интересом рассматривает инструменты и стоматологическое зеркало',
			'Отсутствие страха перед лечением'
		],
		tacticalRecommendationsRu: [
			'ЗАКС не требуется (лечение в стандартном режиме), либо только по желанию родителей для комфорта',
			'Обязательное вручение грамоты храбрости и подарка после приема для закрепления позитивного опыта',
			'Формирование статуса «примерного пациента»'
		],
		sedationIndicationLevel: 'minimal'
	}
};

// ---------------------------------------------------------------------------
// 2. Nitrous Oxide / Oxygen ($N_2O / O_2$) Inhalation Sedation Modes
// ---------------------------------------------------------------------------

export type SedationPhaseType = 'induction' | 'titration' | 'maintenance' | 'flush_emergence';

export interface SedationPhaseRule {
	phase: SedationPhaseType;
	nameRu: string;
	defaultDurationMinutes: number;
	o2ConcentrationPercent: number;
	n2oConcentrationPercent: number;
	flowRateLpm: number;
	clinicalGoalRu: string;
	safetyNoteRu: string;
}

export const SEDATION_PHASE_RULES: Record<SedationPhaseType, SedationPhaseRule> = {
	induction: {
		phase: 'induction',
		nameRu: '1. Индукция (100% O₂)',
		defaultDurationMinutes: 3,
		o2ConcentrationPercent: 100,
		n2oConcentrationPercent: 0,
		flowRateLpm: 5.0,
		clinicalGoalRu: 'Адаптация ребенка к дыхательному контуру, подбор комфортного потока (flow rate) и денитрогенация легких.',
		safetyNoteRu: 'Дыхание чистым 100% O2 в течение 2–3 минут для калибровки маски и достижения дыхательного комфорта.'
	},
	titration: {
		phase: 'titration',
		nameRu: '2. Титрование N₂O',
		defaultDurationMinutes: 5,
		o2ConcentrationPercent: 70,
		n2oConcentrationPercent: 30,
		flowRateLpm: 5.0,
		clinicalGoalRu: 'Пошаговое повышение концентрации N2O с шагом 5–10% каждые 1–2 минуты до появления признаков седации.',
		safetyNoteRu: 'Концентрация O2 обязана быть не менее 50% (N2O не более 50%). Контроль сознания и рефлексов.'
	},
	maintenance: {
		phase: 'maintenance',
		nameRu: '3. Поддержание седации',
		defaultDurationMinutes: 20,
		o2ConcentrationPercent: 60,
		n2oConcentrationPercent: 40,
		flowRateLpm: 5.0,
		clinicalGoalRu: 'Проведение стоматологического лечения (препарирование, пломбирование, удаление) в состоянии седации.',
		safetyNoteRu: 'Мониторинг SpO2 >= 95%, ЧСС, частоты дыхания и вербального контакта каждые 5 минут.'
	},
	flush_emergence: {
		phase: 'flush_emergence',
		nameRu: '4. Продувка (100% O₂ Выход)',
		defaultDurationMinutes: 5,
		o2ConcentrationPercent: 100,
		n2oConcentrationPercent: 0,
		flowRateLpm: 6.0,
		clinicalGoalRu: 'Вымывание N2O из альвеол и кровотока чистым 100% кислородом для предотвращения диффузионной гипоксии.',
		safetyNoteRu: 'Строго не менее 5 минут 100% O2! Предотвращает постоперационную тошноту, головную боль и гипоксию.'
	}
};

// ---------------------------------------------------------------------------
// 3. Clinical Presets & Scenarios (Пресеты клинических сценариев)
// ---------------------------------------------------------------------------

export type SedationPresetId =
	| 'standard_pediatric_therapy'
	| 'anxious_child_first_visit'
	| 'high_cooperation_short_procedure'
	| 'surgical_sanitation_extraction'
	| 'extended_quadrant_rehab';

export interface SedationPresetInfo {
	id: SedationPresetId;
	titleRu: string;
	descriptionRu: string;
	targetN2oPercent: number;
	targetO2Percent: number;
	defaultFlowRateLpm: number;
	estimatedDurationMin: number;
	targetAgeRangeRu: string;
	recommendedMaskScent: string;
	clinicalIndicationRu: string;
}

export const SEDATION_PRESETS: Record<SedationPresetId, SedationPresetInfo> = {
	standard_pediatric_therapy: {
		id: 'standard_pediatric_therapy',
		titleRu: 'Стандартная терапия (Кариес / Пульпит)',
		descriptionRu: 'Лечение кариеса и пульпита временных зубов у детей с умеренной тревожностью (Frankl 2-3).',
		targetN2oPercent: 35,
		targetO2Percent: 65,
		defaultFlowRateLpm: 5.0,
		estimatedDurationMin: 30,
		targetAgeRangeRu: '3–12 лет',
		recommendedMaskScent: 'strawberry',
		clinicalIndicationRu: 'Препарирование полостей, витальная ампутация пульпы, пломбирование композитом/стеклоиономером.'
	},
	anxious_child_first_visit: {
		id: 'anxious_child_first_visit',
		titleRu: 'Адаптационный прием / Тревожный ребенок',
		descriptionRu: 'Первичное знакомство со стоматологом, выраженный дентофобический синдром (Frankl 1-2).',
		targetN2oPercent: 30,
		targetO2Percent: 70,
		defaultFlowRateLpm: 4.5,
		estimatedDurationMin: 20,
		targetAgeRangeRu: '2–8 лет',
		recommendedMaskScent: 'bubble_gum',
		clinicalIndicationRu: 'Диагностический осмотр, профессиональная гигиена, герметизация фиссур, преодоление страха.'
	},
	high_cooperation_short_procedure: {
		id: 'high_cooperation_short_procedure',
		titleRu: 'Короткая процедура / Минимальная седация',
		descriptionRu: 'Быстрое вмешательство у контактного ребенка с легким напряжением (Frankl 3).',
		targetN2oPercent: 25,
		targetO2Percent: 75,
		defaultFlowRateLpm: 4.0,
		estimatedDurationMin: 15,
		targetAgeRangeRu: '4–14 лет',
		recommendedMaskScent: 'banana',
		clinicalIndicationRu: 'Снятие швов, пришлифовывание пломбы, аппликация реминерализирующего геля, быстрая реставрация.'
	},
	surgical_sanitation_extraction: {
		id: 'surgical_sanitation_extraction',
		titleRu: 'Хирургическая санация / Удаление зуба',
		descriptionRu: 'Глубокая седация ЗАКС перед проведением местной инфильтрационной/проводниковой анестезии.',
		targetN2oPercent: 45,
		targetO2Percent: 55,
		defaultFlowRateLpm: 6.0,
		estimatedDurationMin: 25,
		targetAgeRangeRu: '3–14 лет',
		recommendedMaskScent: 'vanilla',
		clinicalIndicationRu: 'Удаление разрушенного молочного зуба по физиологической смене или периодонтиту, пластика уздечки.'
	},
	extended_quadrant_rehab: {
		id: 'extended_quadrant_rehab',
		titleRu: 'Многоэтапная санация нескольких квадрантов',
		descriptionRu: 'Лечение 3–4 зубов за один визит с непрерывным мониторингом витальных показателей.',
		targetN2oPercent: 40,
		targetO2Percent: 60,
		defaultFlowRateLpm: 5.5,
		estimatedDurationMin: 45,
		targetAgeRangeRu: '4–14 лет',
		recommendedMaskScent: 'apple',
		clinicalIndicationRu: 'Коронки из нержавеющей стали на моляры, эндодонтия нескольких зубов.'
	}
};

// ---------------------------------------------------------------------------
// 4. Child Preparation & Fasting Guidelines (Голодный интервал перед ЗАКС)
// ---------------------------------------------------------------------------

export interface FastingGuideline {
	itemCategoryRu: string;
	minHours: number;
	examplesRu: string;
	rationaleRu: string;
}

export const PEDIATRIC_FASTING_GUIDELINES: FastingGuideline[] = [
	{
		itemCategoryRu: 'Чистые прозрачные жидкости',
		minHours: 2,
		examplesRu: 'Вода без газа, осветленный яблочный сок, несладкий чай без молока',
		rationaleRu: 'Быстрая эвакуация из желудка, предотвращение рвоты и аспирации при седации.'
	},
	{
		itemCategoryRu: 'Грудное молоко',
		minHours: 4,
		examplesRu: 'Грудное молоко матери',
		rationaleRu: 'Средняя скорость переваривания у детей младшего возраста.'
	},
	{
		itemCategoryRu: 'Легкая нежирная пища / Смесь',
		minHours: 6,
		examplesRu: 'Адаптированная детская молочная смесь, овсяная каша на воде, тост',
		rationaleRu: 'Минимизация риска гастроэзофагеального рефлюкса при наложении маски.'
	},
	{
		itemCategoryRu: 'Плотная / Жирная пища',
		minHours: 8,
		examplesRu: 'Мясо, сыр, творог, жареная пища, бутерброды с маслом',
		rationaleRu: 'Длительное время задержки в желудке; строгий запрет перед приемом с ЗАКС.'
	}
];

// ---------------------------------------------------------------------------
// 5. Aroma Mask Scents (Ароматические насадки на маски)
// ---------------------------------------------------------------------------

export type AromaMaskScentId =
	| 'strawberry'
	| 'bubble_gum'
	| 'banana'
	| 'vanilla'
	| 'apple'
	| 'unscented';

export interface AromaMaskInfo {
	id: AromaMaskScentId;
	nameRu: string;
	emoji: string;
	descriptionRu: string;
	color: string;
}

export const AROMA_MASK_SCENTS: Record<AromaMaskScentId, AromaMaskInfo> = {
	strawberry: {
		id: 'strawberry',
		nameRu: 'Клубничная поляна',
		emoji: '🍓',
		descriptionRu: 'Сладкий клубничный аромат, самый популярный выбор у детей 3–7 лет.',
		color: '#ef4444'
	},
	bubble_gum: {
		id: 'bubble_gum',
		nameRu: 'Сладкая жвачка (Bubble Gum)',
		emoji: '🍬',
		descriptionRu: 'Любимый конфетный аромат, моментально переключает внимание ребенка на дыхание носом.',
		color: '#ec4899'
	},
	banana: {
		id: 'banana',
		nameRu: 'Тропический банан',
		emoji: '🍌',
		descriptionRu: 'Мягкий фруктовый запах, идеален для детей младшей группы.',
		color: '#eab308'
	},
	vanilla: {
		id: 'vanilla',
		nameRu: 'Нежная ваниль',
		emoji: '🍦',
		descriptionRu: 'Успокаивающий сладкий аромат мороженого, снижает уровень тревожности.',
		color: '#f59e0b'
	},
	apple: {
		id: 'apple',
		nameRu: 'Зеленое яблоко',
		emoji: '🍏',
		descriptionRu: 'Свежий ненавязчивый фруктовый аромат для детей постарше.',
		color: '#22c55e'
	},
	unscented: {
		id: 'unscented',
		nameRu: 'Нейтральная (Без запаха)',
		emoji: '💨',
		descriptionRu: 'Классическая силиконовая маска без ароматических добавок (для аллергиков).',
		color: '#64748b'
	}
};

// ---------------------------------------------------------------------------
// 6. Bravery Diploma Badges (Награды детской грамоты за храбрость)
// ---------------------------------------------------------------------------

export type BraveryBadgeId =
	| 'magic_mask_master'
	| 'brave_astronaut'
	| 'sparkling_smile'
	| 'fearless_hero'
	| 'golden_patience';

export interface BraveryBadgeInfo {
	id: BraveryBadgeId;
	titleRu: string;
	subtitleRu: string;
	badgeEmoji: string;
	medalColor: string;
	congratulationRu: string;
}

export const BRAVERY_BADGES: Record<BraveryBadgeId, BraveryBadgeInfo> = {
	magic_mask_master: {
		id: 'magic_mask_master',
		titleRu: 'Повелитель Волшебной Маски',
		subtitleRu: 'Орден ЗАКС 1-й степени',
		badgeEmoji: '🤿',
		medalColor: '#38bdf8',
		congratulationRu: 'За смелое дыхание через волшебную ароматную маску и отличное настроение!'
	},
	brave_astronaut: {
		id: 'brave_astronaut',
		titleRu: 'Космический Герой Стоматологии',
		subtitleRu: 'За полет на планету Здоровых Зубок',
		badgeEmoji: '🚀',
		medalColor: '#a855f7',
		congratulationRu: 'За мужественное преодоление всех испытаний на приеме у зубного доктора!'
	},
	sparkling_smile: {
		id: 'sparkling_smile',
		titleRu: 'Хранитель Сияющей Улыбки',
		subtitleRu: 'Орден Белоснежных Зубок',
		badgeEmoji: '✨',
		medalColor: '#eab308',
		congratulationRu: 'За блестящие, крепкие и вылеченные зубки без единой слезинки!'
	},
	fearless_hero: {
		id: 'fearless_hero',
		titleRu: 'Бесстрашный Супергерой',
		subtitleRu: 'Высшая награда за мужество',
		badgeEmoji: '🦸‍♂️',
		medalColor: '#ef4444',
		congratulationRu: 'За невероятную смелость и помощь врачу во время лечения!'
	},
	golden_patience: {
		id: 'golden_patience',
		titleRu: 'Орден Золотого Терпения',
		subtitleRu: 'Звезда примерного пациента',
		badgeEmoji: '🏅',
		medalColor: '#f59e0b',
		congratulationRu: 'За безупречное следование инструкциям доктора и идеальное сотрудничество!'
	}
};

// ---------------------------------------------------------------------------
// 7. Sedation Safety Constants & Gas Pricing
// ---------------------------------------------------------------------------

export const SEDATION_SAFETY_LIMITS = {
	minO2PercentCritical: 30,           // Аппаратный минимум O2 (защита от гипоксии)
	minO2PercentPediatricStandard: 50,  // Стандарт детской стоматологии (O2 >= 50%)
	maxN2oPercentRoutine: 50,           // Максимум N2O в амбулаторной практике
	maxN2oPercentAbsolute: 70,          // Абсолютный аппаратный предел
	minFlushDurationMinutes: 5,         // Минимум 5 минут 100% O2 в конце
	defaultGasPricesRubPerLiter: {
		n2oRub: 2.50,
		o2Rub: 0.85
	}
} as const;
