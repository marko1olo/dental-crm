/**
 * emergencyProtocolsEngine.ts — Clinical Emergency Resuscitation Engine
 * Standards: Минздрав РФ (Приказы № 804н, 834н, стандарты скорой медицинской помощи),
 * ФАР (Федерация анестезиологов и реаниматологов РФ), СтАР (Стоматологическая Ассоциация России).
 *
 * Supported Protocols:
 * 1. Anaphylactic Shock (Анафилактический шок - T78.2)
 * 2. Vasovagal Syncope & Vascular Collapse (Вазовагальный обморок / Коллапс - R55)
 * 3. Hypertensive Crisis (Гипертонический криз - I10 / I15)
 * 4. Hypoglycemia & Hypoglycemic Coma (Гипогликемия - E16.2)
 * 5. Acute Coronary Syndrome & Angina (ОКС / Стенокардия - I20 / I21)
 * 6. Local Anesthetic Systemic Toxicity (LAST / Токсичность анестетиков - T88.5 / T41.3)
 * 7. Cardiac Arrest & Basic CPR (Остановка сердца / СЛР - I46.9)
 */

import type { VitalsInput, VitalsTriageReport } from './vitalsTriageMath';

export type EmergencyScenarioId =
	| 'anaphylactic_shock'
	| 'syncope_collapse'
	| 'hypertensive_crisis'
	| 'hypoglycemia'
	| 'angina_acs'
	| 'local_anesthetic_toxicity'
	| 'cardiac_arrest';

export type EmergencyStepPriority = 'immediate_sec' | 'priority_min' | 'secondary';

export interface EmergencyMedicationRecommendation {
	nameRu: string;
	tradeNamesRu: string;
	activeSubstance: string;
	doseAdult: string;
	dosePediatric: string;
	routeOfAdminRu: 'в/м (бедро)' | 'в/в струйно' | 'в/в капельно' | 'сублингвально' | 'ингаляционно' | 'per os' | 'п/к';
	notesRu: string;
	calculatedDoseForWeight?: string | undefined;
}

export interface EmergencyActionStep {
	id: string;
	orderNumber: number;
	titleRu: string;
	priority: EmergencyStepPriority;
	actionType: 'position' | 'airway' | 'drug' | 'infusion' | 'call_smp' | 'monitor' | 'procedure';
	instructionRu: string;
	rationaleRu: string;
	medication?: EmergencyMedicationRecommendation | undefined;
	timerSeconds?: number | undefined; // e.g. 300 for 5-min adrenaline re-dose or 600 for BP check
	isMandatory: boolean;
}

export interface EmergencyScenarioDefinition {
	id: EmergencyScenarioId;
	titleRu: string;
	shortBadgeRu: string;
	icd10Code: string;
	icd10NameRu: string;
	statutoryBasisRu: string;
	primaryDangerRu: string;
	clinicalTriggersRu: string[];
	actionSteps: EmergencyActionStep[];
	keyDrugs: string[];
	contraindicatedDrugsRu: string[];
	ambulanceCallingIndicationsRu: string;
	typicalVitalsProfile: {
		bpSystolic: number;
		bpDiastolic: number;
		heartRate: number;
		spO2: number;
		glucose?: number | undefined;
	};
}

export interface ExecutedEmergencyStepRecord {
	stepId: string;
	stepTitle: string;
	executedAtIso: string;
	notes?: string | undefined;
	administeredDrugDose?: string | undefined;
}

export interface EmergencyIncidentData {
	scenarioId: EmergencyScenarioId;
	patientFullName: string;
	patientAgeYears: number;
	patientWeightKg: number;
	patientGender?: 'male' | 'female' | undefined;
	clinicName?: string | undefined;
	clinicAddress?: string | undefined;
	cabinetNumber?: string | undefined;
	doctorFullName?: string | undefined;
	assistantFullName?: string | undefined;
	medCardNumber?: string | undefined;
	initialVitals: VitalsInput;
	latestVitals?: VitalsInput | undefined;
	incidentStartTimeIso: string;
	triageReport?: VitalsTriageReport | undefined;
	executedSteps: ExecutedEmergencyStepRecord[];
	smpCalled: boolean;
	smpCallTimeIso?: string | undefined;
	smpBrigadeNumber?: string | undefined;
	smpArrivalTimeIso?: string | undefined;
	outcome: 'stabilized_in_clinic' | 'transferred_to_smp' | 'active_resuscitation' | 'refused_hospitalization';
	outcomeNotesRu?: string | undefined;
}

/**
 * 1. АНАФИЛАКТИЧЕСКИЙ ШОК (T78.2) — Федеральные клинрекомендации Минздрава РФ и ФАР
 */
export const ANAPHYLACTIC_SHOCK_PROTOCOL: EmergencyScenarioDefinition = {
	id: 'anaphylactic_shock',
	titleRu: 'Анафилактический шок',
	shortBadgeRu: 'Анафилаксия (T78.2)',
	icd10Code: 'T78.2',
	icd10NameRu: 'Анафилактический шок, неуточненный',
	statutoryBasisRu: 'Клинические рекомендации МЗ РФ «Анафилактический шок» (2020), Стандарты СМП РФ № 804н',
	primaryDangerRu: 'Острая сосудистая недостаточность (коллапс), отек гортани, асфиксия, остановка кровообращения',
	clinicalTriggersRu: [
		'Резкое падение АД (САД <80-90 мм рт.ст.) в первые минуты после инъекции',
		'Отек лица, губ, век, языка, стридорозное дыхание, бронхоспазм',
		'Генерализованная крапивница, кожный зуд, гиперемия',
		'Тахикардия >110-130 уд/мин, холодный липкий пот, потеря сознания',
	],
	keyDrugs: ['Адреналин 0.1% (Эпинефрин)', 'Дексаметазон / Преднизолон', '0.9% раствор NaCl', 'Кислород 100%'],
	contraindicatedDrugsRu: [
		'Антигистаминные 1-го поколения в/в до стабилизации АД (риск усугубления гипотонии)',
		'Кальция хлорид / глюконат (не доказана эффективность, риск некроза/аритмии)',
	],
	ambulanceCallingIndicationsRu: 'Экстренный вызов СМП 103/112 немедленно в первые 60 секунд от начала симптомов!',
	typicalVitalsProfile: {
		bpSystolic: 65,
		bpDiastolic: 35,
		heartRate: 125,
		spO2: 88,
	},
	actionSteps: [
		{
			id: 'stop_allergen',
			orderNumber: 1,
			titleRu: 'Прекратить введение препарата / позвать помощь',
			priority: 'immediate_sec',
			actionType: 'procedure',
			instructionRu: 'НЕМЕДЛЕННО прекратить введение местного анестетика/лекарства! Оставить иглу в вене (если была в/в инъекция). Голосом вызвать ассистента и врача-реаниматолога/старшего врача.',
			rationaleRu: 'Остановка дальнейшего поступления антигена в сосудистое русло.',
			isMandatory: true,
		},
		{
			id: 'call_smp_anaphylaxis',
			orderNumber: 2,
			titleRu: 'Экстренный вызов бригады СМП (103 / 112)',
			priority: 'immediate_sec',
			actionType: 'call_smp',
			instructionRu: 'Вызвать скорую медицинскую помощь 103/112 (или дать команду ассистенту). Четко назвать: «Анафилактический шок в стоматологическом кабинете, падение АД».',
			rationaleRu: 'Требуется экстренная реанимационная бригада СМП и профильная госпитализация.',
			isMandatory: true,
		},
		{
			id: 'epinephrine_im_vastus',
			orderNumber: 3,
			titleRu: 'Ввести Адреналин (Эпинефрин) 0.1% 0.5 мл в/м в БЕДРО',
			priority: 'immediate_sec',
			actionType: 'drug',
			instructionRu: 'Ввести 0.1% раствор адреналина гидрохлорида 0.5 мл (0.5 мг) ВНУТРИМЫШЕЧНО в среднюю треть передне-боковой поверхности БЕДРА (m. vastus lateralis). Детям: 0.01 мг/кг (макс 0.3 мг). При отсутствии эффекта повторить в/м через 5-15 минут.',
			rationaleRu: 'Бедро обладает наилучшей васкуляризацией при шоке (быстрее, чем в плечо или ягодицу). Препарат первой линии жизни.',
			medication: {
				nameRu: 'Адреналин (Эпинефрин) 0.1% (1 мг/мл)',
				tradeNamesRu: 'Эпинефрин, Адреналина гидрохлорид',
				activeSubstance: 'Epinephrine',
				doseAdult: '0.5 мл (0.5 мг) в/м в бедро',
				dosePediatric: '0.01 мл/кг (0.01 мг/кг) в/м (макс 0.3 мл)',
				routeOfAdminRu: 'в/м (бедро)',
				notesRu: 'Повтор через 5-15 мин при сохраняющейся гипотензии. В/в введение только врачом-реаниматологом в разведении 1:10 000.',
			},
			timerSeconds: 300,
			isMandatory: true,
		},
		{
			id: 'trendelenburg_airway',
			orderNumber: 4,
			titleRu: 'Положение Тренделенбурга и проходимость дыхательных путей',
			priority: 'immediate_sec',
			actionType: 'position',
			instructionRu: 'Уложить пациента на спину, приподнять нижние конечности на 30–45° выше уровня головы. Повернуть голову набок (профилактика аспирации рвотными массами), выдвинуть нижнюю челюсть при западении языка.',
			rationaleRu: 'Увеличение венозного возврата к сердцу и головному мозгу при тяжелом вазомоторном коллапсе.',
			isMandatory: true,
		},
		{
			id: 'oxygen_high_flow',
			orderNumber: 5,
			titleRu: 'Оксигенотерапия 10–15 л/мин',
			priority: 'priority_min',
			actionType: 'airway',
			instructionRu: 'Подать 100% увлажненный кислород через лицевую маску с резервуарным мешком со скоростью 10–15 л/мин. При бронхоспазме/стридоре — готовность к коникотомии.',
			rationaleRu: 'Устранение тканевой гипоксии и насыщение гемоглобина кислородом.',
			isMandatory: true,
		},
		{
			id: 'venous_access_infusion',
			orderNumber: 6,
			titleRu: 'Венозный доступ и инфузия 0.9% NaCl 500–1000 мл',
			priority: 'priority_min',
			actionType: 'infusion',
			instructionRu: 'Обеспечить надежный периферический венозный доступ (кубитальный катетер G16–G18). Начать болюсную инфузию 0.9% раствора натрия хлорида 500–1000 мл струйно под давлением. Детям: 20 мл/кг болюсно.',
			rationaleRu: 'Быстрое восполнение относительного дефицита внутрисосудистого объема из-за генерализованной вазодилатации и капиллярной утечки.',
			medication: {
				nameRu: 'Натрия хлорид 0.9% (физраствор)',
				tradeNamesRu: 'Изотонический раствор 0.9%',
				activeSubstance: 'Sodium Chloride 0.9%',
				doseAdult: '500–1000 мл струйно, далее по гемодинамике',
				dosePediatric: '20 мл/кг болюсно за 10–20 мин',
				routeOfAdminRu: 'в/в струйно',
				notesRu: 'При рефрактерной гипотонии — коллоидные растворы или вазопрессоры.',
			},
			isMandatory: true,
		},
		{
			id: 'corticosteroids_iv',
			orderNumber: 7,
			titleRu: 'Глюкокортикостероиды (Дексаметазон 8–16 мг / Преднизолон 60–90 мг)',
			priority: 'priority_min',
			actionType: 'drug',
			instructionRu: 'Ввести внутривенно (или в/м при отсутствии вены) Дексаметазон 8–16 мг (2–4 ампулы по 4 мг) ИЛИ Преднизолон 60–90 мг (2–3 ампулы по 30 мг). Детям: Дексаметазон 0.3–0.5 мг/кг или Преднизолон 2–3 мг/кг.',
			rationaleRu: 'Предотвращение второй (отсроченной) фазы анафилаксии через 4–8 часов, мембраностабилизирующий и противоотечный эффект.',
			medication: {
				nameRu: 'Дексаметазон 4 мг/мл (или Преднизолон 30 мг/мл)',
				tradeNamesRu: 'Дексаметазон, Дексамед, Преднизолон',
				activeSubstance: 'Dexamethasone / Prednisolone',
				doseAdult: 'Дексаметазон 8–16 мг в/в (или Преднизолон 60–90 мг в/в)',
				dosePediatric: 'Дексаметазон 0.3–0.5 мг/кг или Преднизолон 2–3 мг/кг в/в',
				routeOfAdminRu: 'в/в струйно',
				notesRu: 'Эффект наступает через 15–30 минут, не заменяет немедленного введения адреналина!',
			},
			isMandatory: true,
		},
		{
			id: 'antihistamines_secondary',
			orderNumber: 8,
			titleRu: 'Антигистаминные препараты (2-я линия, после стабилизации АД)',
			priority: 'secondary',
			actionType: 'drug',
			instructionRu: 'ТОЛЬКО ПОСЛЕ стабилизации АД (САД >90-100 мм рт.ст.): Супрастин 2% 1.0 мл (20 мг) в/м или Димедрол 1% 1.0 мл в/м.',
			rationaleRu: 'Купирование кожного зуда и крапивницы. Введение на фоне коллапса запрещено из-за риска дополнительной вазодилатации.',
			medication: {
				nameRu: 'Супрастин 2% (Хлоропирамин) 20 мг/мл',
				tradeNamesRu: 'Супрастин',
				activeSubstance: 'Chloropyramine',
				doseAdult: '1 мл (20 мг) в/м',
				dosePediatric: '0.25–0.5 мл в/м (по возрасту)',
				routeOfAdminRu: 'в/м (бедро)',
				notesRu: 'Категорически не вводить в/в струйно при гипотонии!',
			},
			isMandatory: false,
		},
	],
};

/**
 * 2. ВАЗОВАГАЛЬНЫЙ ОБМОРОК / КОЛЛАПС (R55)
 */
export const VASOVAGAL_SYNCOPE_PROTOCOL: EmergencyScenarioDefinition = {
	id: 'syncope_collapse',
	titleRu: 'Вазовагальный обморок / Коллапс',
	shortBadgeRu: 'Обморок (R55)',
	icd10Code: 'R55',
	icd10NameRu: 'Обморок [синкопе] и коллапс',
	statutoryBasisRu: 'Стандарт первичной медико-санитарной помощи при синкопальных состояниях (МЗ РФ)',
	primaryDangerRu: 'Ишемия головного мозга, травма при падении, аспирация рвотными массами, переход в кардиогенный шок',
	clinicalTriggersRu: [
		'Внезапная бледность, головокружение, потемнение в глазах, шум в ушах',
		'Холодный пот на лбу, тошнота, зевота',
		'Кратковременная потеря сознания (до 1-2 минут)',
		'Брадикардия (<50 уд/мин) и умеренная гипотензия (АД <90/60 мм рт.ст.)',
	],
	keyDrugs: ['Раствор аммиака 10% (Нашатырный спирт)', 'Кислород 4–6 л/мин', 'Атропин 0.1% (при стойкой брадикардии)'],
	contraindicatedDrugsRu: ['Адреналин при обычном обмороке (противопоказан, усиливает вазоконстрикцию)'],
	ambulanceCallingIndicationsRu: 'Вызов СМП 103 при отсутствии восстановления сознания >3 минут, судорогах или очаговой симптоматике.',
	typicalVitalsProfile: {
		bpSystolic: 80,
		bpDiastolic: 50,
		heartRate: 46,
		spO2: 96,
	},
	actionSteps: [
		{
			id: 'stop_manipulation_syncope',
			orderNumber: 1,
			titleRu: 'Прекратить любые манипуляции',
			priority: 'immediate_sec',
			actionType: 'procedure',
			instructionRu: 'Немедленно прекратить препарирование, инъекции и любые вмешательства. Удалить из полости рта ватные валики, слюноотсос, инструменты.',
			rationaleRu: 'Устранение триггера психогенного и рефлекторного вагусного раздражения.',
			isMandatory: true,
		},
		{
			id: 'trendelenburg_syncope',
			orderNumber: 2,
			titleRu: 'Положение Тренделенбурга (ноги выше головы)',
			priority: 'immediate_sec',
			actionType: 'position',
			instructionRu: 'Перевести стоматологическое кресло в положение Тренделенбурга (горизонтальное положение, приподнять нижние конечности на 30–45° выше уровня головы). Голову повернуть набок.',
			rationaleRu: 'Гравитационный приток 500–800 мл венозной крови к головному мозгу и коронарным артериям.',
			isMandatory: true,
		},
		{
			id: 'airway_and_clothing',
			orderNumber: 3,
			titleRu: 'Освободить дыхание и стесняющую одежду',
			priority: 'immediate_sec',
			actionType: 'airway',
			instructionRu: 'Расстегнуть воротник рубашки, галстук, ремень на брюках. Обеспечить доступ свежего воздуха (открыть окно) или подать кислород 4–6 л/мин.',
			rationaleRu: 'Устранение сдавления сосудов шеи и грудной клетки, улучшение оксигенации.',
			isMandatory: true,
		},
		{
			id: 'ammonia_reflex',
			orderNumber: 4,
			titleRu: 'Рефлекторная стимуляция (Нашатырный спирт)',
			priority: 'priority_min',
			actionType: 'drug',
			instructionRu: 'Поднести к носу пациента ватный тампон, смоченный 10% раствором аммиака (нашатырного спирта), на расстояние 1.5–2 см на 1–2 секунды. Сбрызнуть лицо холодной водой, растереть мочки ушей.',
			rationaleRu: 'Раздражение рецепторов тройничного нерва и рефлекторная активация сосудодвигательного и дыхательного центров продолговатого мозга.',
			medication: {
				nameRu: 'Аммиака раствор 10% (Нашатырный спирт)',
				tradeNamesRu: 'Нашатырный спирт',
				activeSubstance: 'Ammonia',
				doseAdult: 'Вдыхание паров с ватного тампона 1–2 сек',
				dosePediatric: 'Осторожно на расстоянии 2–3 см',
				routeOfAdminRu: 'ингаляционно',
				notesRu: 'Не прикасаться тампоном к коже и слизистым (опасность химического ожога).',
			},
			isMandatory: true,
		},
		{
			id: 'monitor_vitals_syncope',
			orderNumber: 5,
			titleRu: 'Контроль пульса, АД и сахара крови',
			priority: 'priority_min',
			actionType: 'monitor',
			instructionRu: 'Измерить АД, ЧСС и SpO2. При сохраняющейся брадикардии <45 уд/мин и низком АД — готовность к введению Атропина 0.1% 0.5 мл в/в / п/к. Экспресс-тест глюкозы (исключить гипогликемию).',
			rationaleRu: 'Дифференциальная диагностика обморока с гипогликемией, инфарктом миокарда и скрытым шоком.',
			isMandatory: true,
		},
		{
			id: 'warm_sweet_tea',
			orderNumber: 6,
			titleRu: 'Теплое сладкое питье и плавный подъем',
			priority: 'secondary',
			actionType: 'procedure',
			instructionRu: 'После полного восстановления ясного сознания дать выпить теплый сладкий чай или воду. Не разрешать вставать минимум 15–20 минут. Поднимать кресло медленно и ступенчато.',
			rationaleRu: 'Профилактика повторного ортостатического коллапса.',
			isMandatory: false,
		},
	],
};

/**
 * 3. ГИПЕРТОНИЧЕСКИЙ КРИЗ (I10 / I15)
 */
export const HYPERTENSIVE_CRISIS_PROTOCOL: EmergencyScenarioDefinition = {
	id: 'hypertensive_crisis',
	titleRu: 'Гипертонический криз',
	shortBadgeRu: 'Гиперкриз (I10/I15)',
	icd10Code: 'I10',
	icd10NameRu: 'Эссенциальная [первичная] гипертензия / Гипертонический криз',
	statutoryBasisRu: 'Клинические рекомендации МЗ РФ «Артериальная гипертензия у взрослых», Приказ МЗ РФ № 804н',
	primaryDangerRu: 'Острое нарушение мозгового кровообращения (инсульт), отек легких, инфаркт миокарда, расслоение аорты',
	clinicalTriggersRu: [
		'Резкий подъем АД: САД ≥180 мм рт.ст. и/или ДАД ≥110 мм рт.ст.',
		'Интенсивная головная боль распирающего характера (затылок, виски)',
		'Мелькание «мушек» перед глазами, тошнота, рвота, шум в ушах',
		'Чувство страха, гиперемия лица, загрудинный дискомфорт',
	],
	keyDrugs: ['Моксонидин 0.2–0.4 мг под язык', 'Каптоприл 25 мг под язык', 'Корвалол 30–40 кап'],
	contraindicatedDrugsRu: [
		'АДРЕНАЛИН (Эпинефрин) во всех видах — СТРОГО ЗАПРЕЩЕН!',
		'Нифедипин короткого действия под язык без контроля (риск резкого неконтролируемого падения АД и инсульта)',
		'Резкое снижение АД более чем на 25% в первые 2 часа',
	],
	ambulanceCallingIndicationsRu: 'Вызов СМП 103/112 при осложненном кризе: боль за грудиной, одышка, асимметрия лица, парезы, АД >200/120 мм рт.ст.',
	typicalVitalsProfile: {
		bpSystolic: 195,
		bpDiastolic: 115,
		heartRate: 98,
		spO2: 97,
	},
	actionSteps: [
		{
			id: 'stop_anesthetic_epinephrine',
			orderNumber: 1,
			titleRu: 'БЛОКИРОВКА АДРЕНАЛИНА и прекращение манипуляций',
			priority: 'immediate_sec',
			actionType: 'procedure',
			instructionRu: 'НЕМЕДЛЕННО ПРЕКРАТИТЬ (БЛОКИРОВКА АДРЕНАЛИНА!) введение местных анестетиков с вазоконстрикторами (адреналином)! Прекратить препарирование и все болезненные вмешательства.',
			rationaleRu: 'Экзогенный адреналин и стоматологический стресс вызывают резкий спазм артериол и могут спровоцировать геморрагический инсульт или инфаркт.',
			isMandatory: true,
		},
		{
			id: 'semi_sitting_position',
			orderNumber: 2,
			titleRu: 'Полусидячее положение пациента (приподнять головной конец)',
			priority: 'immediate_sec',
			actionType: 'position',
			instructionRu: 'Придать пациенту полусидячее положение в кресле (головной конец приподнят на 45–60°). Ноги опустить вниз.',
			rationaleRu: 'Уменьшение венозного возврата к правому сердцу, снижение внутричерепного давления и профилактика отека легких.',
			isMandatory: true,
		},
		{
			id: 'antihypertensive_sublingual',
			orderNumber: 3,
			titleRu: 'Гипотензивная терапия: Моксонидин 0.2–0.4 мг ИЛИ Каптоприл 25 мг под язык',
			priority: 'priority_min',
			actionType: 'drug',
			instructionRu: 'Дать сублингвально (под язык): Моксонидин (Физиотенз) 0.2 мг (при АД >200 — 0.4 мг) ИЛИ Каптоприл (Капотен) 25 мг (разжевать и держать под языком до полного растворения).',
			rationaleRu: 'Быстрое и плавное снижение сосудистого тонуса и общего периферического сопротивления (начало действия через 15–20 мин).',
			medication: {
				nameRu: 'Моксонидин 0.2 мг (или Каптоприл 25 мг)',
				tradeNamesRu: 'Физиотенз, Моксонидин-СЗ, Капотен',
				activeSubstance: 'Moxonidine / Captopril',
				doseAdult: 'Моксонидин 0.2–0.4 мг под язык ИЛИ Каптоприл 25 мг под язык',
				dosePediatric: 'По назначению педиатра/кардиолога',
				routeOfAdminRu: 'сублингвально',
				notesRu: 'Целевое снижение АД: не более 20–25% от исходного уровня в течение первых 1–2 часов!',
			},
			timerSeconds: 900, // 15 минут до контроля АД
			isMandatory: true,
		},
		{
			id: 'sedation_reassurance',
			orderNumber: 4,
			titleRu: 'Седация и психологический покой',
			priority: 'priority_min',
			actionType: 'drug',
			instructionRu: 'Успокоить пациента, нормализовать ритм дыхания (глубокий вдох носом, медленный выдох через рот). При выраженном психоэмоциональном возбуждении — Корвалол / Валокордин 30–40 капель с водой внутрь.',
			rationaleRu: 'Снижение гиперсимпатикотонии и эндогенного выброса катехоламинов.',
			medication: {
				nameRu: 'Корвалол / Валокордин',
				tradeNamesRu: 'Корвалол, Валосердин',
				activeSubstance: 'Phenobarbital + Ethyl bromoizovalerianate',
				doseAdult: '30–40 капель в 50 мл воды per os',
				dosePediatric: '1 капля на год жизни',
				routeOfAdminRu: 'per os',
				notesRu: 'Успокаивающее и спазмолитическое действие.',
			},
			isMandatory: false,
		},
		{
			id: 'bp_recheck_monitor',
			orderNumber: 5,
			titleRu: 'Контроль АД каждые 10–15 минут',
			priority: 'priority_min',
			actionType: 'monitor',
			instructionRu: 'Повторное измерение АД каждые 10–15 минут. Фиксация динамики. При отсутствии эффекта через 30 минут — повторный прием Каптоприла 25 мг или вызов 103.',
			rationaleRu: 'Оценка эффективности антигипертензивного ответа.',
			isMandatory: true,
		},
		{
			id: 'call_smp_if_complicated',
			orderNumber: 6,
			titleRu: 'Вызов СМП 103/112 при осложнениях или резистентности',
			priority: 'priority_min',
			actionType: 'call_smp',
			instructionRu: 'При сохранении АД >190/110 через 30–40 минут, появлении давящих болей за грудиной, одышки или неврологического дефицита — вызвать 103/112.',
			rationaleRu: 'Риск осложненного течения, требующего в/в инфузии урапидила/нитроглицерина в стационаре.',
			isMandatory: false,
		},
	],
};

/**
 * 4. ГИПОГЛИКЕМИЯ (E16.2)
 */
export const HYPOGLYCEMIA_PROTOCOL: EmergencyScenarioDefinition = {
	id: 'hypoglycemia',
	titleRu: 'Гипогликемия / Гипогликемическое состояние',
	shortBadgeRu: 'Гипогликемия (E16.2)',
	icd10Code: 'E16.2',
	icd10NameRu: 'Гипогликемия неуточненная',
	statutoryBasisRu: 'Клинические рекомендации «Сахарный диабет 1 и 2 типа у взрослых» МЗ РФ',
	primaryDangerRu: 'Гипогликемическая кома, отек и гибель нейронов коры головного мозга',
	clinicalTriggersRu: [
		'Глюкоза крови <3.3 ммоль/л (или <3.9 у диабетиков на инсулине)',
		'Внезапный приступ голода, потливость, внутренняя дрожь (тремор)',
		'Агрессивность, спутанность речи, дезориентация, неадекватное поведение',
		'Судороги, потеря сознания при падении сахара <2.8 ммоль/л',
	],
	keyDrugs: ['40% раствор глюкозы в/в', 'Простые углеводы (сок, сахар)', 'Глюкагон 1 мг в/м'],
	contraindicatedDrugsRu: ['Инсулин', 'Вливание жидкостей в рот пациенту без сознания (риск аспирации)'],
	ambulanceCallingIndicationsRu: 'Вызов 103 при потере сознания и отсутствии эффекта от глюкозы в течение 5-10 минут.',
	typicalVitalsProfile: {
		bpSystolic: 110,
		bpDiastolic: 70,
		heartRate: 105,
		spO2: 98,
		glucose: 2.6,
	},
	actionSteps: [
		{
			id: 'check_glucose_stop',
			orderNumber: 1,
			titleRu: 'Прекратить лечение и измерить сахар крови',
			priority: 'immediate_sec',
			actionType: 'monitor',
			instructionRu: 'Прекратить манипуляции. Провести экспресс-глюкометрию. Оценить уровень сознания.',
			rationaleRu: 'Быстрое подтверждение гипогликемического генеза симптомов.',
			isMandatory: true,
		},
		{
			id: 'fast_carbs_conscious',
			orderNumber: 2,
			titleRu: 'При сохранном сознании: 15–20 г простых углеводов per os',
			priority: 'immediate_sec',
			actionType: 'drug',
			instructionRu: 'Дать выпить 150–200 мл теплого сладкого чая, фруктового сока (1 стакан) или 4–5 кусочков сахара / таблетки декстрозы. Повторить измерение сахара через 15 минут.',
			rationaleRu: 'Правило 15 граммов углеводов: быстрое повышение гликемии без перегрузки.',
			medication: {
				nameRu: 'Легкоусвояемые углеводы (сахар / сок / декстроза)',
				tradeNamesRu: 'Сахар, Декстроза',
				activeSubstance: 'Glucose / Sucrose',
				doseAdult: '15–20 г углеводов per os',
				dosePediatric: '0.3 г/кг углеводов',
				routeOfAdminRu: 'per os',
				notesRu: 'Категорически запрещено давать питье пациенту без сознания!',
			},
			isMandatory: true,
		},
		{
			id: 'glucose_40_iv_unconscious',
			orderNumber: 3,
			titleRu: 'При потере сознания: 40% раствор глюкозы 40–60 мл в/в струйно',
			priority: 'immediate_sec',
			actionType: 'drug',
			instructionRu: 'Пациента уложить на бок. Ввести внутривенно струйно 40% раствор глюкозы 40–60 мл (до 100 мл). При отсутствии венозного доступа — Глюкагон 1 мг в/м (детям <25 кг — 0.5 мг).',
			rationaleRu: 'Прямая доставка глюкозы к нейронам головного мозга для купирования комы.',
			medication: {
				nameRu: 'Глюкоза (Декстроза) 40% раствор',
				tradeNamesRu: 'Глюкоза 40%',
				activeSubstance: 'Dextrose 40%',
				doseAdult: '40–60 мл (до 100 мл) в/в струйно',
				dosePediatric: '2 мл/кг 10% раствора глюкозы в/в',
				routeOfAdminRu: 'в/в струйно',
				notesRu: 'Вводить медленно под контролем вены. Вызов 103/112 обязателен!',
			},
			isMandatory: true,
		},
		{
			id: 'call_smp_hypoglycemia',
			orderNumber: 4,
			titleRu: 'Вызов СМП 103 при тяжелой гипогликемии',
			priority: 'priority_min',
			actionType: 'call_smp',
			instructionRu: 'Вызвать 103/112 при коме, судорогах или если сознание не восстановилось через 10 минут после введения глюкозы.',
			rationaleRu: 'Необходимость длительной инфузии 10% глюкозы и госпитализации.',
			isMandatory: false,
		},
	],
};

/**
 * 5. ОСТРЫЙ КОРОНАРНЫЙ СИНДРОМ / СТЕНОКАРДИЯ (I20 / I21)
 */
export const ANGINA_ACS_PROTOCOL: EmergencyScenarioDefinition = {
	id: 'angina_acs',
	titleRu: 'Острый коронарный синдром / Приступ стенокардии',
	shortBadgeRu: 'ОКС / Стенокардия (I20/I21)',
	icd10Code: 'I20.0',
	icd10NameRu: 'Нестабильная стенокардия / Инфаркт миокарда',
	statutoryBasisRu: 'Клинические рекомендации «Острый коронарный синдром без подъема сегмента ST» МЗ РФ',
	primaryDangerRu: 'Острый трансмуральный инфаркт миокарда, фибрилляция желудочков, кардиогенный шок',
	clinicalTriggersRu: [
		'Интенсивная давящая, сжимающая боль за грудиной',
		'Иррадиация боли в левое плечо, руку, лопатку, нижнюю челюсть',
		'Боль длится >5-10 минут и не снимается в покое',
		'Холодный пот, одышка, страх смерти, бледность',
	],
	keyDrugs: ['Нитроглицерин 0.5 мг под язык', 'Ацетилсалициловая кислота (Аспирин) 250–300 мг', 'Кислород 4–8 л/мин'],
	contraindicatedDrugsRu: [
		'Нитроглицерин при САД <100 мм рт.ст. или тяжелой брадикардии <50 уд/мин',
		'Адреналин / норадреналин',
	],
	ambulanceCallingIndicationsRu: 'Экстренный вызов СМП 103 немедленно при сохранении боли >5 минут!',
	typicalVitalsProfile: {
		bpSystolic: 145,
		bpDiastolic: 95,
		heartRate: 92,
		spO2: 93,
	},
	actionSteps: [
		{
			id: 'stop_procedure_angina',
			orderNumber: 1,
			titleRu: 'Прекратить лечение, полусидячее положение',
			priority: 'immediate_sec',
			actionType: 'position',
			instructionRu: 'Прекратить любые стоматологические манипуляции. Придать полусидячее положение, обеспечить физический и эмоциональный покой.',
			rationaleRu: 'Снижение потребности миокарда в кислороде и постнагрузки на левый желудочек.',
			isMandatory: true,
		},
		{
			id: 'call_smp_acs',
			orderNumber: 2,
			titleRu: 'Экстренный вызов СМП (103 / 112)',
			priority: 'immediate_sec',
			actionType: 'call_smp',
			instructionRu: 'Вызвать кардиологическую бригаду 103/112: «Острый коронарный синдром, давящая боль за грудиной».',
			rationaleRu: 'Время — миокард («золотой час» для тромболизиса/ЧКВ).',
			isMandatory: true,
		},
		{
			id: 'nitroglycerin_sublingual',
			orderNumber: 3,
			titleRu: 'Нитроглицерин 0.5 мг (1 доза) под язык',
			priority: 'priority_min',
			actionType: 'drug',
			instructionRu: 'При САД ≥100 мм рт.ст.: 1 таблетка (0.5 мг) или 1 доза спрея (Изокет/Нитроспрей) под язык. При сохранении боли повторить через 5 минут (макс 3 дозы).',
			rationaleRu: 'Дилатация коронарных артерий и коллатералей, купирование ишемии.',
			medication: {
				nameRu: 'Нитроглицерин (или Изосорбида динитрат)',
				tradeNamesRu: 'Нитроглицерин, Нитроспрей, Изокет',
				activeSubstance: 'Nitroglycerin',
				doseAdult: '0.5 мг (1 таб/доза) под язык',
				dosePediatric: 'Не применяется',
				routeOfAdminRu: 'сублингвально',
				notesRu: 'Противопоказан при САД <100 мм рт.ст. и приеме силденафила/ингибиторов ФДЭ-5!',
			},
			isMandatory: true,
		},
		{
			id: 'aspirin_chewable',
			orderNumber: 4,
			titleRu: 'Ацетилсалициловая кислота (Аспирин) 250–300 мг разжевать',
			priority: 'priority_min',
			actionType: 'drug',
			instructionRu: 'Дать разжевать и запить небольшим количеством воды таблетку некишечнорастворимого Аспирина 250–300 мг.',
			rationaleRu: 'Немедленная блокада тромбоксана А2 и ингибирование агрегации тромбоцитов в просвете коронарного сосуда.',
			medication: {
				nameRu: 'Ацетилсалициловая кислота (Аспирин)',
				tradeNamesRu: 'Аспирин Кардио, Ацетилсалициловая к-та',
				activeSubstance: 'Acetylsalicylic acid',
				doseAdult: '250–300 мг разжевать',
				dosePediatric: 'Не применяется при ОКС',
				routeOfAdminRu: 'per os',
				notesRu: 'Обязательно разжевать для быстрого всасывания в ротовой полости!',
			},
			isMandatory: true,
		},
		{
			id: 'oxygen_angina',
			orderNumber: 5,
			titleRu: 'Ингаляция кислорода 4–8 л/мин',
			priority: 'priority_min',
			actionType: 'airway',
			instructionRu: 'Подать кислород через назальные канюли или маску со скоростью 4–8 л/мин (целевая SpO2 ≥95%).',
			rationaleRu: 'Устранение гипоксемии и снижение зоны ишемического повреждения миокарда.',
			isMandatory: true,
		},
	],
};

/**
 * КАТАЛОГ ВСЕХ СТАНДАРТНЫХ СЦЕНАРИЕВ НЕОТЛОЖКИ
 */
export const EMERGENCY_SCENARIOS_CATALOG: Record<EmergencyScenarioId, EmergencyScenarioDefinition> = {
	anaphylactic_shock: ANAPHYLACTIC_SHOCK_PROTOCOL,
	syncope_collapse: VASOVAGAL_SYNCOPE_PROTOCOL,
	hypertensive_crisis: HYPERTENSIVE_CRISIS_PROTOCOL,
	hypoglycemia: HYPOGLYCEMIA_PROTOCOL,
	angina_acs: ANGINA_ACS_PROTOCOL,
	local_anesthetic_toxicity: {
		id: 'local_anesthetic_toxicity',
		titleRu: 'Системная токсичность местных анестетиков (LAST)',
		shortBadgeRu: 'LAST-токсичность (T88.5)',
		icd10Code: 'T88.5',
		icd10NameRu: 'Осложнения анестезии, токсическое действие',
		statutoryBasisRu: 'Клинические рекомендации Общества анестезиологов-реаниматологов (ФАР)',
		primaryDangerRu: 'Генерализованные судороги, блокада проводящей системы сердца, асистолия',
		clinicalTriggersRu: [
			'Онемение языка, металлический привкус во рту, звон в ушах',
			'Тремор, мышечные подергивания, переход в генерализованные судороги',
			'Брадикардия, желудочковые аритмии, падение сердечного выброса',
		],
		keyDrugs: ['20% жировая эмульсия (Lipid Rescue)', 'Кислород 100%', 'Диазепам/Мидазолам (при судорогах)'],
		contraindicatedDrugsRu: ['Лидокаин/антиаритмики IB класса', 'Блокаторы кальциевых каналов'],
		ambulanceCallingIndicationsRu: 'Вызов 103/112 немедленно!',
		typicalVitalsProfile: { bpSystolic: 85, bpDiastolic: 55, heartRate: 52, spO2: 90 },
		actionSteps: [
			{
				id: 'stop_anesthetic_last',
				orderNumber: 1,
				titleRu: 'Прекратить введение анестетика, вызвать помощь и 103',
				priority: 'immediate_sec',
				actionType: 'procedure',
				instructionRu: 'Немедленно прекратить введение местного анестетика! Вызвать бригаду СМП 103/112.',
				rationaleRu: 'Остановка нарастания концентрации токсина в плазме.',
				isMandatory: true,
			},
			{
				id: 'lipid_rescue_bolus',
				orderNumber: 2,
				titleRu: 'Липидный спаситель: 20% жировая эмульсия 1.5 мл/кг болюсно',
				priority: 'immediate_sec',
				actionType: 'drug',
				instructionRu: 'Ввести 20% жировую эмульсию (Липофундин / Интралипид) 1.5 мл/кг внутривенно за 1 минуту (около 100 мл на 70 кг). Затем продолжить инфузию 0.25 мл/кг/мин.',
				rationaleRu: '«Липидный синк» (Lipid sink): связывание липофильных молекул анестетика из миокарда и мозга.',
				medication: {
					nameRu: 'Жировая эмульсия 20% (Липофундин / Интралипид)',
					tradeNamesRu: 'Липофундин MCT/LCT 20%, Интралипид',
					activeSubstance: 'Lipid emulsion 20%',
					doseAdult: '1.5 мл/кг болюс за 1 мин (~100 мл), затем 0.25 мл/кг/мин',
					dosePediatric: '1.5 мл/кг болюс',
					routeOfAdminRu: 'в/в струйно',
					notesRu: 'Максимальная суммарная доза: до 12 мл/кг за первые 30 минут.',
				},
				isMandatory: true,
			},
			{
				id: 'airway_oxygen_last',
				orderNumber: 3,
				titleRu: '100% Кислород и защита дыхательных путей',
				priority: 'priority_min',
				actionType: 'airway',
				instructionRu: 'Ингаляция 100% O2 10–15 л/мин. При судорогах и апноэ — ИВЛ мешком Амбу.',
				rationaleRu: 'Гипервентиляция и кислород снижают токсичность анестетика и ацидоз.',
				isMandatory: true,
			},
		],
	},
	cardiac_arrest: {
		id: 'cardiac_arrest',
		titleRu: 'Остановка кровообращения и базовая СЛР',
		shortBadgeRu: 'Остановка сердца (I46.9)',
		icd10Code: 'I46.9',
		icd10NameRu: 'Остановка сердца неуточненная',
		statutoryBasisRu: 'Рекомендации Национального совета по реанимации (НСР) и ERC',
		primaryDangerRu: 'Клиническая смерть, необратимая гибель коры головного мозга через 4–6 минут',
		clinicalTriggersRu: [
			'Отсутствие сознания, дыхания и пульса на сонной артерии',
			'Широкие зрачки без реакции на свет',
			'Бледно-серый или синюшный цвет кожных покровов',
		],
		keyDrugs: ['Адреналин 0.1% 1.0 мл в/в каждые 3–5 мин', 'Кислород 100%'],
		contraindicatedDrugsRu: ['Попытки измерения давления или потеря времени на второстепенные тесты'],
		ambulanceCallingIndicationsRu: 'СМП 103/112 вызывается в ПЕРВУЮ СЕКУНДУ обнаружения отсутствия пульса!',
		typicalVitalsProfile: { bpSystolic: 0, bpDiastolic: 0, heartRate: 0, spO2: 0 },
		actionSteps: [
			{
				id: 'call_smp_resuscitation',
				orderNumber: 1,
				titleRu: 'Немедленный вызов 103/112 и голосовая тревога в клинике',
				priority: 'immediate_sec',
				actionType: 'call_smp',
				instructionRu: 'Громко крикнуть в коридор: «Остановка сердца, реанимация! Принесите дефибриллятор и аптечку!». Вызвать СМП 103.',
				rationaleRu: 'Один реаниматор не может непрерывно выполнять качественную СЛР.',
				isMandatory: true,
			},
			{
				id: 'start_cpr_30_2',
				orderNumber: 2,
				titleRu: 'Начать непрямой массаж сердца: 30 компрессий : 2 вдоха',
				priority: 'immediate_sec',
				actionType: 'procedure',
				instructionRu: 'Уложить на твердую поверхность (пол или подложить жесткий щит). Частота нажатий 100–120 в минуту, глубина 5–6 см, полное расправление грудной клетки. 30 нажатий : 2 вдоха мешком Амбу с кислородом.',
				rationaleRu: 'Поддержание минимального мозгового и коронарного перфузионного давления.',
				timerSeconds: 120, // 2 минуты до смены реаниматора и проверки ритма
				isMandatory: true,
			},
			{
				id: 'aed_defibrillation',
				orderNumber: 3,
				titleRu: 'Подключение АНД (автоматического дефибриллятора)',
				priority: 'immediate_sec',
				actionType: 'procedure',
				instructionRu: 'Наклеить электроды АНД на сухую грудь. Следовать голосовым подсказкам прибора. При ритме, требующем дефибрилляции (ФЖ/ЖТ) — нанести разряд, немедленно продолжить СЛР.',
				rationaleRu: 'Ранняя дефибрилляция — единственный способ восстановить синусовый ритм при фибрилляции желудочков.',
				isMandatory: true,
			},
			{
				id: 'adrenaline_cpr_iv',
				orderNumber: 4,
				titleRu: 'Адреналин 1 мг (1 мл 0.1%) в/в каждые 3–5 минут',
				priority: 'priority_min',
				actionType: 'drug',
				instructionRu: 'Ввести 1 мг адреналина внутривенно струйно, промыть 20 мл 0.9% NaCl, приподнять конечность на 10–20 сек. Повторять каждые 3–5 минут СЛР.',
				rationaleRu: 'Вазоконстрикция периферических сосудов для повышения коронарного перфузионного давления.',
				medication: {
					nameRu: 'Адреналин 0.1% 1 мг',
					tradeNamesRu: 'Адреналина гидрохлорид',
					activeSubstance: 'Epinephrine',
					doseAdult: '1 мг (1 мл) в/в каждые 3–5 мин',
					dosePediatric: '0.01 мг/кг (0.1 мл/кг раствора 1:10 000)',
					routeOfAdminRu: 'в/в струйно',
					notesRu: 'Промывать 20 мл физраствора после каждой инъекции.',
				},
				timerSeconds: 180,
				isMandatory: true,
			},
		],
	},
};

/**
 * Расчет индивидуальных доз препаратов неотложки с учетом массы тела пациента
 */
export function calculateWeightAdjustedEmergencyDoses(patientWeightKg: number) {
	const safeWeight = Math.max(5, Math.min(200, patientWeightKg || 70));
	const isPediatric = safeWeight < 40;

	// 1. Адреналин при анафилаксии: 0.01 мг/кг (макс 0.5 мг)
	let adrenalineAnaphylaxisMg = Math.min(0.5, Math.round(safeWeight * 0.01 * 100) / 100);
	if (adrenalineAnaphylaxisMg < 0.05) adrenalineAnaphylaxisMg = 0.05;
	const adrenalineAnaphylaxisMl = Math.round((adrenalineAnaphylaxisMg / 1.0) * 100) / 100; // 0.1% раствор = 1 мг/мл

	// 2. Дексаметазон при анафилаксии: 0.3 мг/кг (макс 16 мг)
	const dexaMg = isPediatric
		? Math.min(16, Math.max(2, Math.round(safeWeight * 0.3 * 10) / 10))
		: safeWeight > 90 ? 16 : 8;
	const dexaMl = Math.round((dexaMg / 4) * 10) / 10; // 4 мг/мл

	// 3. Преднизолон: 2 мг/кг (взрослым 60-90 мг)
	const predMg = isPediatric
		? Math.min(120, Math.max(15, Math.round(safeWeight * 2)))
		: safeWeight > 80 ? 90 : 60;
	const predMl = Math.round((predMg / 30) * 10) / 10; // 30 мг/мл

	// 4. Инфузия 0.9% NaCl болюс: 20 мл/кг детям, 500-1000 мл взрослым
	const naclMl = isPediatric
		? Math.round(safeWeight * 20)
		: safeWeight > 90 ? 1000 : 500;

	// 5. 20% Липидная эмульсия: болюс 1.5 мл/кг
	const lipidBolusMl = Math.round(safeWeight * 1.5);
	const lipidInfusionMlPerHr = Math.round(safeWeight * 0.25 * 60);

	// 6. Атропин: 0.01-0.02 мг/кг (взрослым 0.5-1.0 мг)
	const atropineMg = isPediatric
		? Math.min(0.5, Math.max(0.1, Math.round(safeWeight * 0.01 * 100) / 100))
		: 0.5;

	return {
		patientWeightKg: safeWeight,
		isPediatric,
		adrenalineAnaphylaxis: {
			mg: adrenalineAnaphylaxisMg,
			ml: adrenalineAnaphylaxisMl,
			textRu: `${adrenalineAnaphylaxisMl} мл (${adrenalineAnaphylaxisMg} мг) 0.1% в/м в бедро`,
		},
		dexamethasone: {
			mg: dexaMg,
			ml: dexaMl,
			textRu: `${dexaMg} мг (${dexaMl} мл по 4 мг/мл) в/в`,
		},
		prednisolone: {
			mg: predMg,
			ml: predMl,
			textRu: `${predMg} мг (${predMl} мл по 30 мг/мл) в/в`,
		},
		nacl09Infusion: {
			ml: naclMl,
			textRu: `${naclMl} мл 0.9% NaCl струйно`,
		},
		lipidRescue20: {
			bolusMl: lipidBolusMl,
			infusionMlPerHr: lipidInfusionMlPerHr,
			textRu: `Болюс ${lipidBolusMl} мл за 1 мин, далее ${lipidInfusionMlPerHr} мл/час`,
		},
		atropine: {
			mg: atropineMg,
			textRu: `${atropineMg} мг (0.1% ${atropineMg} мл) в/в`,
		},
	};
}

/**
 * Форматирование времени ISO в читаемый формат ЧЧ:ММ:СС
 */
export function formatEmergencyTime(isoString?: string): string {
	if (!isoString) return new Date().toLocaleTimeString('ru-RU');
	try {
		const date = new Date(isoString);
		return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
	} catch {
		return isoString;
	}
}

/**
 * ГЕНЕРАЦИЯ ОФИЦИАЛЬНОГО ПРОТОКОЛА НЕОТЛОЖКИ ДЛЯ ДНЕВНИКА ФОРМЫ 043/У (Минздрав РФ)
 */
export function generateEmergencyProtocol043(data: EmergencyIncidentData): string {
	const scenario = EMERGENCY_SCENARIOS_CATALOG[data.scenarioId] || ANAPHYLACTIC_SHOCK_PROTOCOL;
	const startTime = formatEmergencyTime(data.incidentStartTimeIso);
	const currentDate = new Date(data.incidentStartTimeIso || Date.now()).toLocaleDateString('ru-RU');
	const weightDoses = calculateWeightAdjustedEmergencyDoses(data.patientWeightKg);

	const initialBp = `${data.initialVitals.bpSystolic}/${data.initialVitals.bpDiastolic} мм рт.ст.`;
	const initialHr = `${data.initialVitals.heartRate} уд/мин`;
	const initialSpO2 = `${data.initialVitals.spO2}%`;
	const initialGlucose = data.initialVitals.bloodGlucose ? `${data.initialVitals.bloodGlucose} ммоль/л` : 'не определялась';

	const executedList = data.executedSteps.length > 0
		? data.executedSteps
			.map((s, idx) => {
				const time = formatEmergencyTime(s.executedAtIso);
				const dosePart = s.administeredDrugDose ? ` (доза: ${s.administeredDrugDose})` : '';
				const notesPart = s.notes ? ` [${s.notes}]` : '';
				return `  ${idx + 1}. [${time}] ${s.stepTitle}${dosePart}${notesPart}`;
			})
			.join('\n')
		: '  - Проведены стандартные протокольные мероприятия по поддержанию витальных функций.';

	let outcomeText = '';
	if (data.outcome === 'stabilized_in_clinic') {
		outcomeText = 'Состояние пациента стабилизировано в условиях клиники. Сознание ясное, гемодинамика и дыхание компенсированы. Рекомендовано амбулаторное наблюдение и консультация профильного специалиста.';
	} else if (data.outcome === 'transferred_to_smp') {
		const arrTime = data.smpArrivalTimeIso ? `в ${formatEmergencyTime(data.smpArrivalTimeIso)}` : '';
		const brig = data.smpBrigadeNumber ? `№ ${data.smpBrigadeNumber}` : '';
		outcomeText = `Пациент в сопровождении врача передан выездной бригаде скорой медицинской помощи ${brig} ${arrTime} для экстренной госпитализации в профильный стационар.`;
	} else if (data.outcome === 'active_resuscitation') {
		outcomeText = 'Продолжаются непрерывные реанимационные мероприятия до прибытия реанимационной бригады СМП.';
	} else {
		outcomeText = 'Пациент категорически отказался от госпитализации в присутствии свидетелей после стабилизации состояния.';
	}

	const latestVitalsBlock = data.latestVitals
		? `\nПОКАЗАТЕЛИ ПОСЛЕ ОКАЗАНИЯ ПОМОЩИ:\n- АД: ${data.latestVitals.bpSystolic}/${data.latestVitals.bpDiastolic} мм рт.ст.\n- ЧСС: ${data.latestVitals.heartRate} уд/мин\n- SpO2: ${data.latestVitals.spO2}%`
		: '';

	return `ПРОТОКОЛ ОКАЗАНИЯ НЕОТЛОЖНОЙ МЕДИЦИНСКОЙ ПОМОЩИ (Форма 043/у)
Дата: ${currentDate} | Время возникновения: ${startTime}
Пациент: ${data.patientFullName} (${data.patientAgeYears} лет, вес ${data.patientWeightKg} кг)
Медицинская карта: ${data.medCardNumber || '043/у-Б/Н'}
Лечащий врач: ${data.doctorFullName || 'Врач-стоматолог'} | Ассистент: ${data.assistantFullName || 'Медицинская сестра'}
Кабинет: ${data.cabinetNumber || '1'}

ДИАГНОЗ / НЕОТЛОЖНОЕ СОСТОЯНИЕ:
МКБ-10: ${scenario.icd10Code} — ${scenario.icd10NameRu} (${scenario.titleRu})
Нормативная база: ${scenario.statutoryBasisRu}

ИСХОДНЫЙ СТАТУС И ВИТАЛЬНЫЕ ФУНКЦИИ (${startTime}):
- Артериальное давление: ${initialBp}
- Частота сердечных сокращений (ЧСС): ${initialHr}
- Сатурация кислорода (SpO2): ${initialSpO2}
- Глюкоза крови: ${initialGlucose}
- Клиническая картина: ${scenario.primaryDangerRu}. Симптомы: ${scenario.clinicalTriggersRu.slice(0, 2).join('; ')}.

ВЫПОЛНЕННЫЙ ПОШАГОВЫЙ АЛГОРИТМ РЕАНИМАЦИИ / ПОМОЩИ:
${executedList}

РАСЧЕТНЫЕ ДОЗИРОВКИ ПРЕПАРАТОВ НА МАССУ ТЕЛА (${data.patientWeightKg} кг):
- Адреналин 0.1%: ${weightDoses.adrenalineAnaphylaxis.textRu}
- Дексаметазон: ${weightDoses.dexamethasone.textRu}
- Инфузия 0.9% NaCl: ${weightDoses.nacl09Infusion.textRu}

ВЫЗОВ СКОРОЙ МЕДИЦИНСКОЙ ПОМОЩИ (103 / 112):
${data.smpCalled ? `Вызвана СМП 103 в ${formatEmergencyTime(data.smpCallTimeIso)} (Бригада ${data.smpBrigadeNumber || 'направлена'}).` : 'Купировано силами клиники без вызова СМП.'}

ИСХОД И ТЕКУЩИЙ СТАТУС:
${outcomeText}${latestVitalsBlock}
${data.outcomeNotesRu ? `Особые отметки: ${data.outcomeNotesRu}\n` : ''}
Врач: ____________________ / ${data.doctorFullName || 'Подпись'} /
Ассистент: _______________ / ${data.assistantFullName || 'Подпись'} /`;
}

/**
 * ГЕНЕРАЦИЯ ШПАРГАЛКИ / ТЕЛЕГРАММЫ ДЛЯ ДИСПЕТЧЕРА 112 / 103 ПРИ ВЫЗОВЕ СМП
 */
export function generateAmbulanceCheatSheet(data: EmergencyIncidentData): string {
	const scenario = EMERGENCY_SCENARIOS_CATALOG[data.scenarioId] || ANAPHYLACTIC_SHOCK_PROTOCOL;
	const currBp = data.latestVitals
		? `${data.latestVitals.bpSystolic}/${data.latestVitals.bpDiastolic}`
		: `${data.initialVitals.bpSystolic}/${data.initialVitals.bpDiastolic}`;
	const currHr = data.latestVitals ? data.latestVitals.heartRate : data.initialVitals.heartRate;
	const currSpO2 = data.latestVitals ? data.latestVitals.spO2 : data.initialVitals.spO2;

	return `🚨 ШПАРГАЛКА ДЛЯ ЗВОНКА В СКОРУЮ ПОМОЩЬ (103 / 112):

1. АДРЕС И МЕСТО:
   ${data.clinicName || 'Стоматологическая клиника DENTE'}
   Адрес: ${data.clinicAddress || 'г. Москва, ул. Клиническая, д. 10, стр. 2'}
   Кабинет: № ${data.cabinetNumber || '1'} (Встретит администратор у входа).

2. ЧТО СЛУЧИЛОСЬ:
   «${scenario.titleRu.toUpperCase()} (код ${scenario.icd10Code}) в стоматологическом кресле!»

3. ПАЦИЕНТ:
   ${data.patientFullName}, пол: ${data.patientGender === 'female' ? 'Женский' : 'Мужской'}, возраст: ${data.patientAgeYears} лет, вес: ${data.patientWeightKg} кг.

4. ТЕКУЩИЕ ПОКАЗАТЕЛИ:
   - АД: ${currBp} мм рт.ст.
   - Пульс: ${currHr} уд/мин
   - SpO2: ${currSpO2}%
   - Сознание: ${scenario.id === 'cardiac_arrest' ? 'ОТСУТСТВУЕТ (СЛР)' : 'Снижено / оглушение'}

5. ЧТО УЖЕ ВВЕДЕНО:
   ${data.executedSteps.length > 0 ? data.executedSteps.map(s => s.stepTitle).join(', ') : 'Оказана первая помощь по протоколу МЗ РФ.'}

6. ТЕЛЕФОН ВРАЧА ДЛЯ СВЯЗИ:
   ${data.doctorFullName || 'Дежурный врач'}`;
}
