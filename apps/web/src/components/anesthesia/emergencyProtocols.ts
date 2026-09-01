/**
 * emergencyProtocols.ts — Dental Emergency Protocols & Interactive Timeline Engine
 *
 * Statutory and Clinical References:
 * - Приказ Минздрава РФ № 786н «Порядок оказания медицинской помощи взрослому населению при стоматологических заболеваниях» (Приложение № 11 — Состав укладки экстренной помощи)
 * - Приказ Минздрава РФ № 1144н (Стандарт оснащения аптечки для оказания первичной медико-санитарной помощи)
 * - Клинические рекомендации «Анафилактический шок» Минздрава РФ (КР345)
 * - Клинические рекомендации ФАР (Федерация анестезиологов и реаниматологов РФ): «Системная токсичность местных анестетиков (LAST) и липидная реанимация»
 * - Национальное руководство по скорой и неотложной медицинской помощи
 */

export type EmergencyScenarioId =
	| 'anaphylaxis'
	| 'last_toxicity'
	| 'syncope_collapse'
	| 'hypertensive_crisis';

export type EmergencyActionCategory =
	| 'stop_trigger'
	| 'patient_position'
	| 'airway_oxygen'
	| 'first_line_drug'
	| 'second_line_drug'
	| 'vascular_access_infusion'
	| 'monitoring'
	| 'call_smp';

export interface EmergencyDrugDoseDetail {
	readonly drugNameRu: string;
	readonly activeSubstanceRu: string;
	readonly standardAdultDoseRu: string;
	readonly standardPediatricDoseRu: string;
	readonly administrationRouteRu: string;
	readonly ampoulePresentationRu: string;
	readonly clinicalRationaleRu: string;
	readonly calculatedDoseForWeight?: (weightKg: number, ageYears?: number) => {
		doseText: string;
		volumeText: string;
		noteRu?: string;
	};
}

export interface EmergencyTimelineStep {
	readonly stepNumber: number;
	readonly timeframeRu: string; // e.g. "0-1 мин", "1-2 мин", "2-5 мин"
	readonly titleRu: string;
	readonly descriptionRu: string;
	readonly category: EmergencyActionCategory;
	readonly isCriticalFirstAction: boolean;
	readonly drugDetail?: EmergencyDrugDoseDetail;
	readonly criticalWarningRu?: string;
	readonly checklistItemsRu: readonly string[];
}

export interface EmergencyProtocolDefinition {
	readonly id: EmergencyScenarioId;
	readonly titleRu: string;
	readonly shortTitleRu: string;
	readonly subtitleRu: string;
	readonly statutoryOrderRu: string;
	readonly severityBadgeRu: string;
	readonly colorTheme: {
		primary: string;
		bgLight: string;
		border: string;
	};
	readonly cardinalSymptomsRu: readonly string[];
	readonly immediateGoldenRuleRu: string;
	readonly steps: readonly EmergencyTimelineStep[];
	readonly kitItemsRequiredRu: readonly string[];
}

// ---------------------------------------------------------------------------
// 1. EMERGENCY PROTOCOLS CATALOG
// ---------------------------------------------------------------------------

export const EMERGENCY_PROTOCOLS: Record<EmergencyScenarioId, EmergencyProtocolDefinition> = {
	// =========================================================================
	// 1. АНАФИЛАКТИЧЕСКИЙ ШОК
	// =========================================================================
	anaphylaxis: {
		id: 'anaphylaxis',
		titleRu: 'Анафилактический шок / Острая генерализованная аллергическая реакция',
		shortTitleRu: 'Анафилактический шок',
		subtitleRu: 'Пошаговый алгоритм реанимации по Приказам МЗ РФ № 786н, 1144н и КР345',
		statutoryOrderRu: 'Приказ МЗ РФ № 786н (Приложение 11), Приказ № 1144н, Клин. реком. МЗ РФ (КР345)',
		severityBadgeRu: 'КРИТИЧЕСКАЯ УГРОЗА ЖИЗНИ (КАТЕГОРИЯ 1)',
		colorTheme: {
			primary: '#ef4444',
			bgLight: 'rgba(239, 68, 68, 0.08)',
			border: 'rgba(239, 68, 68, 0.3)'
		},
		cardinalSymptomsRu: [
			'Внезапное падение АД (систолическое АД < 90 мм рт. ст. или падение более чем на 30%)',
			'Тахикардия (ЧСС > 100-120 уд/мин), нитевидный пульс, холодный липкий пот',
			'Стридор, бронхоспазм, отек гортани, удушье, инспираторная одышка',
			'Крапивница, диффузная эритема, зуд ладоней и стоп, отек Квинке (губы, веки, язык)',
			'Головокружение, чувство страха смерти, потеря сознания, судороги'
		],
		immediateGoldenRuleRu: 'ЗОЛОТОЕ ПРАВИЛО: НЕ САЖАТЬ ПАЦИЕНТА! (Опасность синдрома «пустого сердца» и асистолии). Адреналин 0.5 мг в/м в бедро — препарат выбора №1, вводится немедленно!',
		steps: [
			{
				stepNumber: 1,
				timeframeRu: '0 – 1 мин',
				titleRu: 'Прекращение контакта с аллергеном & Положение Тренделенбурга',
				descriptionRu: 'Немедленно прекратить введение анестетика или лекарственного препарата. Перевести стоматологическое кресло в горизонтальное положение с приподнятыми ногами под углом 30-45° (положение Тренделенбурга). Повернуть голову набок во избежание аспирации рвотных масс, выдвинуть нижнюю челюсть.',
				category: 'stop_trigger',
				isCriticalFirstAction: true,
				criticalWarningRu: 'КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО сажать или поднимать пациента! Резкий переход в вертикальное положение вызывает мгновенное падение венозного возврата к сердцу и остановку кровообращения.',
				checklistItemsRu: [
					'Прекратить инъекцию / удалить тампоны и аппликации',
					'Придать положение Тренделенбурга (ноги выше уровня головы на 30-45°)',
					'Повернуть голову вбок, освободить ротовую полость от слюны и крови',
					'Вызвать ассистента и громко объявить тревогу: «ШОК В КАБИНЕТЕ №...»'
				]
			},
			{
				stepNumber: 2,
				timeframeRu: '1 – 2 мин',
				titleRu: 'ЭПИНЕФРИН (АДРЕНАЛИН 0.1%) — ВНУТРИМЫШЕЧНО В БЕДРО',
				descriptionRu: 'Ввести раствор Эпинефрина (Адреналина гидрохлорида 0.1% / 1 мг/мл) в дозе 0.5 мл (0.5 мг) ВНУТРИМЫШЕЧНО в среднюю треть переднебоковой поверхности бедра (vastus lateralis). У детей: доза 0.01 мг/кг (0.01 мл/кг), максимум 0.3 мг.',
				category: 'first_line_drug',
				isCriticalFirstAction: true,
				drugDetail: {
					drugNameRu: 'Эпинефрин (Адреналин) 0.1% (1 мг/мл)',
					activeSubstanceRu: 'Эпинефрина гидротартрат / гидрохлорид 1 мг/мл',
					standardAdultDoseRu: '0.5 мг (0.5 мл) в/м',
					standardPediatricDoseRu: '0.01 мг/кг (0.01 мл/кг), макс 0.3 мг в/м',
					administrationRouteRu: 'Внутримышечно в среднюю треть переднебоковой поверхности бедра',
					ampoulePresentationRu: 'Ампулы 1 мл 0.1% (1 мг/мл)',
					clinicalRationaleRu: 'Стимулирует альфа-1 (вазоконстрикция, подъем АД), бета-1 (инотропный эффект) и бета-2 адренорецепторы (бронходилатация, блокада дегрануляции тучных клеток).',
					calculatedDoseForWeight: (w, age) => {
						const isChild = (age !== undefined && age < 18) || w < 40;
						if (isChild) {
							const mg = Math.min(0.3, Number((w * 0.01).toFixed(2)));
							return {
								doseText: `${mg} мг`,
								volumeText: `${mg} мл (0.1% р-р)`,
								noteRu: 'Детская доза 0.01 мг/кг в/м в бедро'
							};
						}
						return {
							doseText: '0.5 мг',
							volumeText: '0.5 мл (0.1% р-р)',
							noteRu: 'Стандартная взрослая доза в/м в бедро'
						};
					}
				},
				criticalWarningRu: 'Введение в дельтовидную мышцу плеча или ягодицу НЕ ЭФФЕКТИВНО из-за медленного всасывания при шоке! Только переднебоковая поверхность бедра.',
				checklistItemsRu: [
					'Набрать 0.5 мл 0.1% адреналина в шприц 1-2 мл',
					'Вколоть перпендикулярно в переднебоковую поверхность бедра на глубину 2-3 см',
					'Зафиксировать время первой инъекции адреналина на таймере',
					'При отсутствии подъема АД и стойкой гипотонии — повторить введение 0.5 мг через 5-10 минут!'
				]
			},
			{
				stepNumber: 3,
				timeframeRu: '1 – 3 мин',
				titleRu: 'Вызов скорой медицинской помощи (112 / 103) & Кислородотерапия',
				descriptionRu: 'Ассистент вызывает реанимационную бригаду СМП по тел. 112 (или 103). Начать оксигенотерапию 100% увлажненным кислородом через лицевую маску с резервуарным мешком со скоростью 10-15 л/мин.',
				category: 'call_smp',
				isCriticalFirstAction: false,
				criticalWarningRu: 'При вызове четко назвать: «Анафилактический шок на анестетик у взрослого/ребенка, падение АД, отек дыхательных путей, требуется реанимационная бригада (БИТ/РХБ)!»',
				checklistItemsRu: [
					'Набрать 112 / 103, вызвать специализированную реанимационную бригаду',
					'Включить подачу медицинского кислорода 10-15 л/мин через маску',
					'Проверить проходимость дыхательных путей (при необходимости — воздуховод Гведела)'
				]
			},
			{
				stepNumber: 4,
				timeframeRu: '2 – 5 мин',
				titleRu: 'Венозный доступ (16-18G) & Струйная инфузия кристаллоидов',
				descriptionRu: 'Обеспечить надежный внутривенный доступ периферическим катетером крупного калибра (16G серый или 18G зеленый). Начать массивную инфузионную терапию изотоническим 0.9% раствором натрия хлорида (или раствором Рингера) 500-1000 мл струйно под давлением для взрослых (20 мл/кг детям) для восполнения относительной гиповолемии.',
				category: 'vascular_access_infusion',
				isCriticalFirstAction: false,
				drugDetail: {
					drugNameRu: '0.9% раствор Натрия хлорида (Физраствор) / Рингер',
					activeSubstanceRu: 'Изотонический электролитный раствор',
					standardAdultDoseRu: '500 – 1000 мл струйно (первые 10-15 мин)',
					standardPediatricDoseRu: '20 мл/кг струйно',
					administrationRouteRu: 'Внутривенно капельно / струйно под давлением',
					ampoulePresentationRu: 'Флаконы / пластиковые пакеты по 500 мл',
					clinicalRationaleRu: 'Компенсация патологической вазодилатации и перераспределительного шока, восстановление венозного возврата к сердцу.',
					calculatedDoseForWeight: (w, age) => {
						const isChild = (age !== undefined && age < 18) || w < 40;
						if (isChild) {
							const vol = Math.min(1000, Math.round(w * 20));
							return {
								doseText: `${vol} мл`,
								volumeText: `${vol} мл струйно`,
								noteRu: 'Детский расчет 20 мл/кг'
							};
						}
						return {
							doseText: '1000 мл',
							volumeText: '2 флакона по 500 мл струйно',
							noteRu: 'Взрослый болюс при тяжелой гипотонии'
						};
					}
				},
				checklistItemsRu: [
					'Установить катетер 16G или 18G в кубитальную вену',
					'Подключить систему для инфузий, открыть регулятор на максимальный ток',
					'Ввести первые 500-1000 мл максимально быстро'
				]
			},
			{
				stepNumber: 5,
				timeframeRu: '5 – 7 мин',
				titleRu: 'ГЛЮКОКОРТИКОСТЕРОИДЫ (ПРЕДНИЗОЛОН 90-120 МГ В/В)',
				descriptionRu: 'Ввести Преднизолон в дозе 90-120 мг внутривенно струйно (или Дексаметазон 8-16 мг в/в). У детей: доза 2-3 мг/кг массы тела.',
				category: 'second_line_drug',
				isCriticalFirstAction: false,
				drugDetail: {
					drugNameRu: 'Преднизолон 30 мг/мл (или Дексаметазон 4 мг/мл)',
					activeSubstanceRu: 'Преднизолона гемисукцинат / фосфат',
					standardAdultDoseRu: '90 – 120 мг (3-4 ампулы по 30 мг) в/в',
					standardPediatricDoseRu: '2 – 3 мг/кг в/в',
					administrationRouteRu: 'Внутривенно струйно медленно (за 2-3 мин)',
					ampoulePresentationRu: 'Ампулы 1 мл по 30 мг (30 мг/мл)',
					clinicalRationaleRu: 'Подавляет позднюю фазу аллергической реакции, стабилизирует мембраны тучных клеток, предотвращает рецидив анафилаксии через 4-8 часов.',
					calculatedDoseForWeight: (w, age) => {
						const isChild = (age !== undefined && age < 18) || w < 40;
						if (isChild) {
							const mg = Math.min(120, Math.round(w * 2.5));
							const ml = Number((mg / 30).toFixed(1));
							return {
								doseText: `${mg} мг`,
								volumeText: `${ml} амп. (${ml} мл)`,
								noteRu: 'Детская доза 2.5 мг/кг'
							};
						}
						return {
							doseText: '90 – 120 мг',
							volumeText: '3 – 4 ампулы (3-4 мл)',
							noteRu: 'Взрослая доза в/в струйно'
						};
					}
				},
				criticalWarningRu: 'ПОМНИТЕ: Глюкокортикостероиды НЕ ЯВЛЯЮТСЯ препаратом первой линии и не заменяют адреналин! Их действие развивается только через 4-6 часов.',
				checklistItemsRu: [
					'Набрать 3-4 ампулы Преднизолона (90-120 мг) в шприц 10-20 мл с физраствором',
					'Ввести медленно внутривенно через инфузионный порт'
				]
			},
			{
				stepNumber: 6,
				timeframeRu: '7 – 10 мин',
				titleRu: 'Антигистаминные препараты (после стабилизации АД)',
				descriptionRu: 'После восстановления гемодинамики (АД сист. > 90 мм рт. ст.) ввести Клемастин (Тавегил) 2 мг (2 мл) или Дифенгидрамин (Димедрол) 1% 1-2 мл в/в или в/м.',
				category: 'second_line_drug',
				isCriticalFirstAction: false,
				drugDetail: {
					drugNameRu: 'Клемастин (Тавегил) 0.1% или Дифенгидрамин 1%',
					activeSubstanceRu: 'Клемастина фумарат 1 мг/мл (2 мг в 2 мл)',
					standardAdultDoseRu: '2 мг (2 мл) в/в медленно',
					standardPediatricDoseRu: '0.025 мг/кг в/в',
					administrationRouteRu: 'Внутривенно медленно на физрастворе',
					ampoulePresentationRu: 'Ампулы 2 мл по 1 мг/мл (2 мг в ампуле)',
					clinicalRationaleRu: 'Блокада H1-гистаминовых рецепторов для купирования крапивницы, кожного зуда и отека слизистых.'
				},
				criticalWarningRu: 'НЕ ВВОДИТЬ антигистаминные при низком АД! Они могут усугубить гипотонию.',
				checklistItemsRu: [
					'Проверить систолическое АД (должно быть > 90 мм рт. ст.)',
					'Ввести 2 мг Клемастина медленно в вену'
				]
			},
			{
				stepNumber: 7,
				timeframeRu: '10 – 15 мин',
				titleRu: 'Мониторинг, протоколирование и передача бригаде СМП',
				descriptionRu: 'Непрерывный мониторинг витальных функций (АД, ЧСС, SpO2 каждые 2-3 мин). Оформление акта оказания неотложной помощи и передача пациента врачу реанимационной бригады.',
				category: 'monitoring',
				isCriticalFirstAction: false,
				checklistItemsRu: [
					'Замерить АД, пульс, SpO2, частоту дыхания',
					'Сформировать протокол оказания помощи для медкарты (Форма 043/у)',
					'Передать пациента врачу СМП с указанием точного времени и доз адреналина'
				]
			}
		],
		kitItemsRequiredRu: [
			'Эпинефрин (Адреналин 0.1% / 1 мг/мл) — не менее 5 ампул',
			'Преднизолон 30 мг/мл — не менее 4 ампул',
			'0.9% раствор NaCl 500 мл — не менее 2 флаконов',
			'Система для в/в инфузий + периферические катетеры 16G, 18G, 20G',
			'Клемастин (Тавегил) 2 мг/2 мл — 2 ампулы',
			'Кислородный баллон с редуктором и маской',
			'Воздуховоды Гведела (размеры 3, 4, 5)',
			'Тонометр, пульсоксиметр, фонендоскоп'
		]
	},

	// =========================================================================
	// 2. СИСТЕМНАЯ ТОКСИЧНОСТЬ МЕСТНЫХ АНЕСТЕТИКОВ (LAST & ЛИПИДНАЯ РЕАНИМАЦИЯ)
	// =========================================================================
	last_toxicity: {
		id: 'last_toxicity',
		titleRu: 'Системная токсичность местных анестетиков (LAST / Lipid Rescue Protocol)',
		shortTitleRu: 'Токсичность анестетика (LAST)',
		subtitleRu: 'Протокол липидной реанимации (20% Липидная эмульсия) по стандартам ФАР / ASRA',
		statutoryOrderRu: 'Клинические рекомендации ФАР «Интенсивная терапия системной токсичности местных анестетиков»',
		severityBadgeRu: 'ОСТРАЯ НЕЙРО- И КАРДИОТОКСИЧНОСТЬ',
		colorTheme: {
			primary: '#f97316',
			bgLight: 'rgba(249, 115, 22, 0.08)',
			border: 'rgba(249, 115, 22, 0.3)'
		},
		cardinalSymptomsRu: [
			'Неврологические предвестники: металлический привкус во рту, онемение языка/губ, шум в ушах, головокружение, двоение в глазах',
			'Фаза возбуждения ЦНС: мышечные подергивания, тремор, дизартрия, психомоторное возбуждение, генерализованные тонико-клонические судороги',
			'Фаза угнетения ЦНС: угнетение сознания, сопор, кома, остановка дыхания (апноэ)',
			'Сердечно-сосудистый коллапс: выраженная брадикардия, желудочковая экстрасистолия, расширение QRS, тахикардия «пируэт», фибрилляция желудочков, асистолия'
		],
		immediateGoldenRuleRu: 'ЗОЛОТОЕ ПРАВИЛО LAST: Прекратить введение анестетика! Немедленно начать 20% ЛИПИДНУЮ ЭМУЛЬСИЮ (Липидный синк/Lipid Sink) болюсом 1.5 мл/кг. Адреналин при СЛР вводить ТОЛЬКО в микродозах (< 1 мкг/кг)!',
		steps: [
			{
				stepNumber: 1,
				timeframeRu: '0 – 1 мин',
				titleRu: 'Немедленное прекращение инъекции & Вызов СМП (112)',
				descriptionRu: 'При первых признаках токсичности (металлический привкус, шум в ушах, подергивания) немедленно прекратить введение анестетика. Вызвать реанимационную бригаду СМП (112). Обеспечить 100% кислород через маску с гипервентиляцией (профилактика гипоксии и гиперкапнии, которые усугубляют токсичность анестетиков).',
				category: 'stop_trigger',
				isCriticalFirstAction: true,
				checklistItemsRu: [
					'Немедленно извлечь иглу и прекратить инъекцию',
					'Вызвать реанимационную бригаду СМП (112)',
					'Подать 100% O2 через маску со скоростью 12-15 л/мин',
					'Начать гипервентиляцию для снижения PaCO2 и борьбы с ацидозом'
				]
			},
			{
				stepNumber: 2,
				timeframeRu: '1 – 3 мин',
				titleRu: '20% ЛИПИДНАЯ ЭМУЛЬСИЯ (LIPID RESCUE) — БОЛЮС 1.5 МЛ/КГ',
				descriptionRu: 'Начать введение 20% Липидной эмульсии (Липофундин 20%, Интралипид 20%, СМОФлипид 20%). Ввести начальный болюс 1.5 мл/кг массы тела внутривенно струйно за 1 минуту (для пациента 70 кг ~ 100-105 мл).',
				category: 'first_line_drug',
				isCriticalFirstAction: true,
				drugDetail: {
					drugNameRu: '20% Липидная эмульсия (Липофундин / Интралипид 20%)',
					activeSubstanceRu: 'Очищенные соевые / триглицеридные липиды 200 мг/мл',
					standardAdultDoseRu: 'Болюс 1.5 мл/кг в/в струйно за 1 мин (~100 мл для 70 кг)',
					standardPediatricDoseRu: 'Болюс 1.5 мл/кг в/в',
					administrationRouteRu: 'Внутривенно струйно (болюс) через периферический/центральный катетер',
					ampoulePresentationRu: 'Флаконы 100 мл, 250 мл, 500 мл 20% эмульсии',
					clinicalRationaleRu: '«Липидный синк» (Lipid Sink): связывает свободную липофильную фракцию местного анестетика в плазме, извлекая его из миокарда и головного мозга, активирует митохондриальный метаболизм кардиомиоцитов.',
					calculatedDoseForWeight: (w) => {
						const bolusMl = Math.round(w * 1.5);
						const infusionMlPerMin = Number((w * 0.25).toFixed(1));
						const infusionMlPerHour = Math.round(infusionMlPerMin * 60);
						const maxTotalMl = Math.round(w * 12);
						return {
							doseText: `Болюс ${bolusMl} мл за 1 мин`,
							volumeText: `Инфузия: ${infusionMlPerHour} мл/час (${infusionMlPerMin} мл/мин)`,
							noteRu: `Макс. суммарная доза за 30 мин: ${maxTotalMl} мл`
						};
					}
				},
				criticalWarningRu: '20% Липидная эмульсия — единственный специфический антидот при тяжелой интоксикации анестетиками! Должна присутствовать в укладке реанимации стоматологической клиники.',
				checklistItemsRu: [
					'Взять флакон 20% Липофундина / Интралипида из укладки',
					'Набрать и ввести болюс 1.5 мл/кг струйно за 1 минуту',
					'Сразу после болюса начать постоянную инфузию 0.25 мл/кг/мин'
				]
			},
			{
				stepNumber: 3,
				timeframeRu: '3 – 5 мин',
				titleRu: 'Постоянная инфузия 20% липидов (0.25 мл/кг/мин) & Повтор болюса',
				descriptionRu: 'Продолжить инфузию 20% липидной эмульсии со скоростью 0.25 мл/кг/мин (для 70 кг ~ 18 мл/мин / 1050 мл/час). При сохранении нестабильности гемодинамики или повторе судорог — повторить болюс 1.5 мл/кг через 3-5 мин (до 3 раз) и увеличить скорость инфузии до 0.5 мл/кг/мин. Максимальная суммарная доза липидов: 12 мл/кг за первые 30 минут.',
				category: 'vascular_access_infusion',
				isCriticalFirstAction: false,
				checklistItemsRu: [
					'Установить скорость инфузии 0.25 мл/кг/мин',
					'При сохранении аритмии/гипотонии — повторить болюс 1.5 мл/кг через 3-5 мин',
					'Не превышать суммарную дозу 12 мл/кг'
				]
			},
			{
				stepNumber: 4,
				timeframeRu: '2 – 5 мин',
				titleRu: 'Купирование судорожного синдрома (Бензодиазепины)',
				descriptionRu: 'При развитии судорог ввести Бензодиазепины: Диазепам (Реланиум / Сибазон) 5-10 мг в/в медленно (детям 0.2-0.3 мг/кг) или Мидазолам 2.5-5 мг в/в.',
				category: 'first_line_drug',
				isCriticalFirstAction: false,
				drugDetail: {
					drugNameRu: 'Диазепам (Реланиум / Сибазон) 0.5%',
					activeSubstanceRu: 'Диазепам 5 мг/мл',
					standardAdultDoseRu: '5 – 10 мг (1-2 мл) в/в медленно',
					standardPediatricDoseRu: '0.2 – 0.3 мг/кг в/в',
					administrationRouteRu: 'Внутривенно медленно',
					ampoulePresentationRu: 'Ампулы 2 мл по 5 мг/мл (10 мг в ампуле)',
					clinicalRationaleRu: 'Купирует эпилептиформную активность коры головного мозга и снижает потребление кислорода нейронами.'
				},
				criticalWarningRu: 'ИЗБЕГАЙТЕ Пропофола при нестабильной гемодинамике (усугубляет кардиодепрессию)!',
				checklistItemsRu: [
					'Ввести Диазепам 5-10 мг в/в медленно',
					'Обеспечить защиту языка от прикусывания, удерживать дыхательные пути'
				]
			},
			{
				stepNumber: 5,
				timeframeRu: '5 – 15 мин',
				titleRu: 'Особенности СЛР при LAST (Микродозы адреналина)',
				descriptionRu: 'При остановке кровообращения начать СЛР (компрессии грудной клетки 100-120 в мин, 30:2). Внимание: адреналин вводить в СНИЖЕННЫХ дозах (< 1 мкг/кг, т.е. 10-100 мкг вместо стандартного 1 мг), так как высокие дозы адреналина нарушают связывание анестетика липидной эмульсией! Противопоказаны: Лидокаин, Вазопрессин, Блокаторы кальциевых каналов, Бета-блокаторы.',
				category: 'airway_oxygen',
				isCriticalFirstAction: false,
				criticalWarningRu: 'ПРОТИВОПОКАЗАНЫ: Лидокаин (еще больше усугубляет токсичность!), Блокаторы кальция, Бета-блокаторы, Вазопрессин.',
				checklistItemsRu: [
					'Непрерывный непрямой массаж сердца с частотой 100-120 в минуту',
					'Адреналин развести до 1:10 000 и вводить микродозами по 10-50 мкг',
					'Продолжать липидную реанимацию параллельно с СЛР'
				]
			}
		],
		kitItemsRequiredRu: [
			'20% Липидная эмульсия (Липофундин / Интралипид 20%) — не менее 500 мл (2 флакона по 250 мл или 1 по 500 мл)',
			'Диазепам (Реланиум) 0.5% 2 мл — 2 ампулы',
			'Системы для в/в инфузий (2 шт.) + катетеры 16G, 18G',
			'Эпинефрин 0.1% + шприцы для разведения до микродоз',
			'Кислородный концентратор / баллон с маской'
		]
	},

	// =========================================================================
	// 3. ОБМОРОК / ВАЗОВАГАЛЬНЫЙ КОЛЛАПС
	// =========================================================================
	syncope_collapse: {
		id: 'syncope_collapse',
		titleRu: 'Обморок / Вазовагальный коллапс / Ортостатическая гипотензия',
		shortTitleRu: 'Обморок / Коллапс',
		subtitleRu: 'Купирование острой транзиторной церебральной гипоперфузии в стоматологическом кресле',
		statutoryOrderRu: 'Приказ МЗ РФ № 786н, Национальные стандарты неотложной помощи',
		severityBadgeRu: 'НЕОТЛОЖНОЕ СОСТОЯНИЕ (СРЕДНЯЯ ТЯЖЕСТЬ)',
		colorTheme: {
			primary: '#eab308',
			bgLight: 'rgba(234, 179, 8, 0.08)',
			border: 'rgba(234, 179, 8, 0.3)'
		},
		cardinalSymptomsRu: [
			'Внезапная бледность кожных покровов, холодный липкий пот на лбу',
			'Головокружение, потемнение в глазах, шум в ушах, зевота, тошнота',
			'Кратковременная потеря сознания (обычно 10–60 секунд)',
			'Брадикардия (ЧСС < 50-60 уд/мин) с последующим переходом в умеренную тахикардию',
			'Снижение АД (систолическое АД 70-90 мм рт. ст.), слабый нитевидный пульс'
		],
		immediateGoldenRuleRu: 'ЗОЛОТОЕ ПРАВИЛО: Перевести кресло в положение Тренделенбурга (ноги выше головы), обеспечить доступ кислорода и ингаляцию паров 10% аммиака. Если сознание не восстановилось через 2 минуты — исключить шок, ОКС и ОНМК, вызвать СМП!',
		steps: [
			{
				stepNumber: 1,
				timeframeRu: '0 – 1 мин',
				titleRu: 'Прекращение манипуляций & Положение Тренделенбурга',
				descriptionRu: 'Немедленно прекратить любые стоматологические манипуляции, извлечь инструменты и валики из полости рта. Опустить спинку кресла в горизонтальное положение, приподнять ножной конец кресла на 30-45° для усиления притока крови к головному мозгу. Расстегнуть воротник, ослабить ремень и галстук.',
				category: 'patient_position',
				isCriticalFirstAction: true,
				checklistItemsRu: [
					'Прекратить сверление / удаление, убрать инструменты',
					'Опустить спинку кресла, приподнять ноги на 30-45°',
					'Расстегнуть тугой воротник, ремень, манжеты',
					'Открыть окно / включить приточную вентиляцию'
				]
			},
			{
				stepNumber: 2,
				timeframeRu: '1 – 2 мин',
				titleRu: 'Стимуляция дыхательного центра (Пары 10% аммиака)',
				descriptionRu: 'Смочить ватный тампон 10% раствором аммиака (нашатырным спиртом) и поднести к носовым ходам пациента на расстояние 1.5–2 см на 1-2 секунды. Оросить лицо и шею холодной водой, слегка похлопать по щекам.',
				category: 'first_line_drug',
				isCriticalFirstAction: false,
				drugDetail: {
					drugNameRu: 'Раствор Аммиака 10% (Нашатырный спирт)',
					activeSubstanceRu: 'Аммиака водный раствор 10%',
					standardAdultDoseRu: 'Вдыхание паров на ватном тампоне на 1-2 сек',
					standardPediatricDoseRu: 'Вдыхание паров с расстояния 2-3 см',
					administrationRouteRu: 'Ингаляционно (вдыхание паров)',
					ampoulePresentationRu: 'Флаконы 10% по 10 мл, 40 мл или ампулы с оплеткой',
					clinicalRationaleRu: 'Рефлекторное раздражение рецепторов тройничного нерва в слизистой носа стимулирует сосудодвигательный и дыхательный центры продолговатого мозга.'
				},
				criticalWarningRu: 'Не подносить ватку с аммиаком вплотную к носу во избежание химического ожога слизистой и ларингоспазма!',
				checklistItemsRu: [
					'Поднести ватку с аммиаком на 1.5-2 см к носу',
					'Смочить салфетку холодной водой, протереть виски и лоб'
				]
			},
			{
				stepNumber: 3,
				timeframeRu: '2 – 3 мин',
				titleRu: 'Контроль витальных функций & Оксигенотерапия',
				descriptionRu: 'Измерить АД, ЧСС и сатурацию кислорода (SpO2). Подать увлажненный 100% кислород через маску или носовые канюли (4-6 л/мин). Проверить зрачки и наличие спонтанного дыхания.',
				category: 'monitoring',
				isCriticalFirstAction: false,
				checklistItemsRu: [
					'Замерить АД и пульс на лучевой/сонной артерии',
					'Надеть датчик пульсоксиметра (SpO2)',
					'Подать кислород 4-6 л/мин через канюли'
				]
			},
			{
				stepNumber: 4,
				timeframeRu: '3 – 5 мин',
				titleRu: 'Дифференциальная диагностика при затяжном обмороке (> 2 мин)',
				descriptionRu: 'Если сознание не восстанавливается более 2 минут: заподозрить анафилаксию, гипогликемию, острый коронарный синдром (ОКС) или острое нарушение мозгового кровообращения (ОНМК). Немедленно вызвать 112, измерить уровень глюкозы крови глюкометром. При стойкой брадикардии (ЧСС < 40 уд/мин) — ввести Атропин 0.1% 0.5-1.0 мл п/к или в/в.',
				category: 'second_line_drug',
				isCriticalFirstAction: false,
				drugDetail: {
					drugNameRu: 'Атропина сульфат 0.1% (при стойкой брадикардии ЧСС < 45)',
					activeSubstanceRu: 'Атропина сульфат 1 мг/мл',
					standardAdultDoseRu: '0.5 – 1.0 мг (0.5-1.0 мл) п/к или в/в медленно',
					standardPediatricDoseRu: '0.01 – 0.02 мг/кг',
					administrationRouteRu: 'Подкожно или внутривенно',
					ampoulePresentationRu: 'Ампулы 1 мл 0.1% (1 мг/мл)',
					clinicalRationaleRu: 'М-холиноблокатор, устраняет вагусное угнетение синусового и АВ узлов сердца.'
				},
				checklistItemsRu: [
					'Проверить длительность бессознательного состояния по таймеру',
					'Провести экспресс-глюкометрию (исключить гипогликемию < 3.3 ммоль/л)',
					'При отсутствии восстановления сознания — вызвать реанимационную бригаду 112'
				]
			}
		],
		kitItemsRequiredRu: [
			'Раствор аммиака 10% (нашатырный спирт)',
			'Атропина сульфат 0.1% — 2 ампулы',
			'Глюкометр с тест-полосками',
			'40% раствор глюкозы в ампулах',
			'Тонометр, пульсоксиметр, кислородная подушка / маска'
		]
	},

	// =========================================================================
	// 4. ГИПЕРТОНИЧЕСКИЙ КРИЗ
	// =========================================================================
	hypertensive_crisis: {
		id: 'hypertensive_crisis',
		titleRu: 'Гипертонический криз / Острый подъем артериального давления',
		shortTitleRu: 'Гипертонический криз',
		subtitleRu: 'Алгоритм экстренной фармакологической стабилизации АД в амбулаторной стоматологии',
		statutoryOrderRu: 'Клинические рекомендации «Артериальная гипертензия у взрослых» МЗ РФ',
		severityBadgeRu: 'КАРДИОВАСКУЛЯРНАЯ УГРОЗА (ВЫСОКИЙ РИСК)',
		colorTheme: {
			primary: '#dc2626',
			bgLight: 'rgba(220, 38, 38, 0.08)',
			border: 'rgba(220, 38, 38, 0.3)'
		},
		cardinalSymptomsRu: [
			'Резкий подъем АД (систолическое АД >= 180 мм рт. ст. и/или диастолическое АД >= 110-120 мм рт. ст.)',
			'Интенсивная пульсирующая головная боль в затылочной или височной области',
			'Мелькание «мушек» перед глазами, шум в ушах, нечеткость зрения, тошнота, рвота',
			'Сжимающие или колющие боли в области сердца, одышка, перебои в работе сердца, тахикардия',
			'Выраженная гиперемия лица, психоэмоциональное возбуждение, тремор рук, чувство тревоги'
		],
		immediateGoldenRuleRu: 'ЗОЛОТОЕ ПРАВИЛО: Придать полусидячее положение (Fowler). Снижать АД плавно — не более чем на 20-25% от исходного уровня за первые 1-2 часа (опасность ишемии миокарда и инсульта при резком падении давления)! Препарат выбора — Каптоприл 25 мг сублингвально или Моксонидин 0.2-0.4 мг.',
		steps: [
			{
				stepNumber: 1,
				timeframeRu: '0 – 2 мин',
				titleRu: 'Прекращение приема & Полусидячее положение (Fowler)',
				descriptionRu: 'Немедленно прекратить стоматологическое вмешательство. Придать пациенту полусидячее положение с опущенными ногами (уменьшает венозный приток крови к правому предсердию и снижает преднагрузку на миокард). Обеспечить полный психоэмоциональный и физический покой, приток свежего воздуха.',
				category: 'patient_position',
				isCriticalFirstAction: true,
				checklistItemsRu: [
					'Прекратить препарирование / инъекции / манипуляции',
					'Поднять спинку кресла в полусидячее положение (угол 45-60°)',
					'Опустить ножной конец кресла вниз',
					'Успокоить пациента, измерить АД на обеих руках'
				]
			},
			{
				stepNumber: 2,
				timeframeRu: '2 – 5 мин',
				titleRu: 'КАПТОПРИЛ 25 МГ (или МОКСОНИДИН 0.2-0.4 МГ) — СУБЛИНГВАЛЬНО',
				descriptionRu: 'Дать пациенту под язык (сублингвально) таблетку Каптоприла (Капотен) 25 мг (разжевать и держать под языком до полного рассасывания) ИЛИ Моксонидин (Физиотенз) 0.2-0.4 мг под язык. Начало гипотензивного действия — через 15-20 минут.',
				category: 'first_line_drug',
				isCriticalFirstAction: true,
				drugDetail: {
					drugNameRu: 'Каптоприл (Капотен) 25 мг / Моксонидин 0.2 мг',
					activeSubstanceRu: 'Каптоприл 25 мг (ингибитор АПФ) / Моксонидин (агонист I1-имидазолиновых рецепторов)',
					standardAdultDoseRu: '25 мг Каптоприла под язык ИЛИ 0.2-0.4 мг Моксонидина под язык',
					standardPediatricDoseRu: 'Не применяется в детской амбулаторной стоматологии',
					administrationRouteRu: 'Сублингвально (разжевать и рассосать под языком)',
					ampoulePresentationRu: 'Таблетки по 25 мг (Каптоприл) / 0.2 мг (Моксонидин)',
					clinicalRationaleRu: 'Быстро блокирует ангиотензин-превращающий фермент, снижает выработку ангиотензина II, вызывает периферическую вазодилатацию и снижает общее периферическое сопротивление сосудов (ОПСС).'
				},
				checklistItemsRu: [
					'Положить таблетку Каптоприла 25 мг под язык',
					'Объяснить пациенту, что таблетку нужно держать под языком для быстрого всасывания',
					'Зафиксировать время приема препарата'
				]
			},
			{
				stepNumber: 3,
				timeframeRu: '5 – 10 мин',
				titleRu: 'Селективная терапия при тахикардии или болях в сердце',
				descriptionRu: 'При сопутствующей синусовой тахикардии (ЧСС > 90 уд/мин) и отсутствии астмы: дать Пропранолол (Анаприлин) 20-40 мг под язык. При наличии сжимающих болей за грудиной (подозрение на стенокардию/ОКС): дать Нитроглицерин 0.5 мг (1 табл/доза спрея) сублингвально при систолическом АД > 100 мм рт. ст.',
				category: 'second_line_drug',
				isCriticalFirstAction: false,
				drugDetail: {
					drugNameRu: 'Анаприлин (Пропранолол) 20-40 мг / Нитроглицерин 0.5 мг',
					activeSubstanceRu: 'Пропранолол 20 мг / Нитроглицерин 0.5 мг',
					standardAdultDoseRu: 'Анаприлин 20-40 мг под язык / Нитроглицерин 0.5 мг под язык',
					standardPediatricDoseRu: 'Не применяется',
					administrationRouteRu: 'Сублингвально',
					ampoulePresentationRu: 'Таблетки 20 мг (Анаприлин) / Таблетки 0.5 мг или спрей (Нитроглицерин)',
					clinicalRationaleRu: 'Пропранолол урежает ЧСС и снижает потребность миокарда в кислороде. Нитроглицерин расширяет коронарные сосуды и снижает преднагрузку.'
				},
				criticalWarningRu: 'НИТРОГЛИЦЕРИН ПРОТИВОПОКАЗАН при систолическом АД < 100 мм рт. ст. и приеме ингибиторов ФДЭ-5 (Силденафил / Виагра) в последние 24-48 часов (риск фатального коллапса)!',
				checklistItemsRu: [
					'Оценить ЧСС (при тахикардии > 90 уд/мин — добавить Анаприлин 20-40 мг под язык)',
					'Спросить о наличии болей за грудиной и приеме препаратов от эректильной дисфункции',
					'При болях за грудиной — дать Нитроглицерин 0.5 мг под язык'
				]
			},
			{
				stepNumber: 4,
				timeframeRu: '15 – 30 мин',
				titleRu: 'Повторный мониторинг АД & Решение о вызове СМП (112)',
				descriptionRu: 'Повторное измерение АД через 15-20 минут. Если АД снизилось на 15-20% и состояние стабильно — наблюдать пациента 30-40 минут, отпустить в сопровождении родственников с рекомендацией визита к кардиологу/терапевту. Если АД сохраняется >= 200/120 мм рт. ст., нарастает загрудинная боль, одышка, очаговая неврологическая симптоматика (асимметрия лица, парез, нарушение речи — симптомы инсульта) — НЕОТЛОЖНЫЙ ВЫЗОВ СМП (112)!',
				category: 'monitoring',
				isCriticalFirstAction: false,
				criticalWarningRu: 'При признаках ОКС (боль за грудиной > 15 мин, не купируемая нитроглицерином) или ОНМК (FAST-тест: лицо, рука, речь) — ЭКСТРЕННАЯ ГОСПИТАЛИЗАЦИЯ!',
				checklistItemsRu: [
					'Замерить АД через 15 минут после Каптоприла',
					'Проверить тест на инсульт (улыбнуться, поднять обе руки, назвать имя)',
					'При отсутствии эффекта или осложненном кризе — вызвать 112'
				]
			}
		],
		kitItemsRequiredRu: [
			'Каптоприл (Капотен) 25 мг — 1 упаковка',
			'Моксонидин (Физиотенз) 0.2 мг / 0.4 мг — 1 упаковка',
			'Анаприлин (Пропранолол) 20 мг — 1 упаковка',
			'Нитроглицерин 0.5 мг (таблетки или спрей «Нитроминт»)',
			'Тонометр с манжетами стандартного и увеличенного размера'
		]
	}
};

// ---------------------------------------------------------------------------
// 2. HELPER FUNCTIONS & REPORT GENERATORS
// ---------------------------------------------------------------------------

export interface EmergencyPatientData {
	fullName: string;
	ageYears: number;
	weightKg: number;
	gender?: 'male' | 'female' | undefined;
	cardioRisk?: boolean | undefined;
	asthmaOrAllergy?: boolean | undefined;
}

export interface ExecutedEmergencyStepLog {
	stepNumber: number;
	titleRu: string;
	timestampSeconds: number;
	timeFormatted: string; // e.g. "01:24"
	actionNotes?: string | undefined;
}

export interface EmergencyActPayload {
	scenarioId: EmergencyScenarioId;
	patient: EmergencyPatientData;
	doctorFullName: string;
	clinicName: string;
	clinicAddress: string;
	cabinetNumber: string;
	startTimeIso: string;
	endTimeIso?: string | undefined;
	initialBp: string;
	finalBp: string;
	initialHr: string;
	finalHr: string;
	initialSpo2: string;
	finalSpo2: string;
	executedSteps: readonly ExecutedEmergencyStepLog[];
	smpBrigadeCalled: boolean;
	smpCallTime?: string | undefined;
	smpBrigadeArrivedTime?: string | undefined;
	smpDoctorFullName?: string | undefined;
	patientOutcome?: 'transferred_to_smp' | 'stabilized_discharged_home' | 'refused_hospitalization' | undefined;
	clinicalNotes?: string | undefined;
	patientName?: string | undefined;
	patientAge?: number | undefined;
	patientWeightKg?: number | undefined;
	doctorName?: string | undefined;
	injectedAnestheticInfo?: string | undefined;
	stopwatchTotalSeconds?: number | undefined;
	administeredDrugs?: ReadonlyArray<{ name: string; dose: string; timeIso?: string }> | undefined;
}

export interface CalculatedEmergencyDrugMatrix {
	epinephrine: {
		doseText: string;
		volumeText: string;
		noteRu: string;
	};
	lipidEmulsion20: {
		bolusVolumeText: string;
		infusionRateText: string;
		maxTotal30MinText: string;
	};
	prednisolone: {
		doseText: string;
		volumeText: string;
		noteRu: string;
	};
	dexamethasone: {
		doseText: string;
		volumeText: string;
		noteRu: string;
	};
	nacl09Infusion: {
		doseText: string;
		volumeText: string;
		noteRu: string;
	};
}

/**
 * Calculates weight-specific exact dosages for emergency medications (Matrix).
 */
export function calculateEmergencyMedicationMatrix(
	weightKg: number,
	ageYears?: number
): CalculatedEmergencyDrugMatrix {
	const safeWeight = Math.max(5, Math.min(250, weightKg || 70));
	const isChild = (ageYears !== undefined && ageYears < 18) || safeWeight < 40;

	// 1. Epinephrine 0.1% (1 mg/ml)
	let epDoseMg = 0.5;
	let epVolumeText = '0.5 мл (0.1% р-р)';
	let epNote = 'Стандартная взрослая доза в/м в бедро';
	if (isChild) {
		epDoseMg = Math.min(0.3, Number((safeWeight * 0.01).toFixed(2)));
		epVolumeText = `${epDoseMg} мл (0.1% р-р)`;
		epNote = 'Детская доза 0.01 мг/кг (макс 0.3 мг) в/м в бедро';
	}

	// 2. 20% Lipid Emulsion (Lipofundin / Intralipid 20%)
	const bolusMl = Math.round(safeWeight * 1.5);
	const infusionMlPerMin = Number((safeWeight * 0.25).toFixed(1));
	const maxTotalMl = Math.round(safeWeight * 12);

	// 3. Prednisolone
	let predMgText = '90 – 120 мг';
	let predVolText = '3 – 4 ампулы (3-4 мл)';
	if (isChild) {
		const predMg = Math.round(safeWeight * 2.5);
		predMgText = `${predMg} мг`;
		predVolText = `${(predMg / 30).toFixed(1)} амп. (${(predMg / 30).toFixed(1)} мл)`;
	}

	// 4. Dexamethasone
	let dexaMgText = '8 – 16 мг';
	let dexaVolText = '2 – 4 ампулы (2-4 мл)';
	if (isChild) {
		const dexaMg = Number((safeWeight * 0.3).toFixed(1));
		dexaMgText = `${dexaMg} мг`;
		dexaVolText = `${(dexaMg / 4).toFixed(1)} амп.`;
	}

	// 5. 0.9% NaCl Infusion
	let naclMl = 1000;
	if (isChild) {
		naclMl = Math.round(safeWeight * 20);
	}

	return {
		epinephrine: {
			doseText: `${epDoseMg} мг`,
			volumeText: epVolumeText,
			noteRu: epNote
		},
		lipidEmulsion20: {
			bolusVolumeText: `${bolusMl} мл`,
			infusionRateText: `${infusionMlPerMin} мл/мин`,
			maxTotal30MinText: `${maxTotalMl} мл`
		},
		prednisolone: {
			doseText: predMgText,
			volumeText: predVolText,
			noteRu: 'в/в медленно струйно'
		},
		dexamethasone: {
			doseText: dexaMgText,
			volumeText: dexaVolText,
			noteRu: 'в/в медленно струйно'
		},
		nacl09Infusion: {
			doseText: `${naclMl} мл`,
			volumeText: `${naclMl} мл 0.9% NaCl`,
			noteRu: isChild ? '20 мл/кг в/в струйно' : '500-1000 мл в/в струйно под давлением'
		}
	};
}

/**
 * Calculates weight-specific exact dosages for emergency medications.
 * Supports both (weightKg, ageYears) and (scenarioId, weightKg, ageYears).
 */
export function calculateAllEmergencyDosagesForWeight(
	arg1: EmergencyScenarioId | number,
	arg2?: number,
	arg3?: number
): CalculatedEmergencyDrugMatrix & Record<string, any> {
	let weightKg = 70;
	let ageYears: number | undefined;
	let scenarioId: EmergencyScenarioId = 'last_toxicity';

	if (typeof arg1 === 'string') {
		scenarioId = arg1;
		weightKg = arg2 || 70;
		ageYears = arg3;
	} else {
		weightKg = arg1 || 70;
		ageYears = arg2;
	}

	const matrix = calculateEmergencyMedicationMatrix(weightKg, ageYears);
	const protocol = EMERGENCY_PROTOCOLS[scenarioId];
	const results: any = { ...matrix };

	if (protocol) {
		for (const step of protocol.steps) {
			if (step.drugDetail && step.drugDetail.calculatedDoseForWeight) {
				results[step.drugDetail.drugNameRu] = step.drugDetail.calculatedDoseForWeight(weightKg, ageYears);
			}
		}
	}

	return results;
}

/**
 * Formats seconds into MM:SS (or HH:MM:SS) display string.
 */
export function formatEmergencyStopwatchTime(totalSeconds: number): string {
	const hrs = Math.floor(totalSeconds / 3600);
	const mins = Math.floor((totalSeconds % 3600) / 60);
	const secs = totalSeconds % 60;
	if (hrs > 0) {
		return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
	}
	return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Generates an official Medical Incident & Resuscitation Protocol Act for Form 043/u.
 */
export function generateEmergencyForm043Act(payload: Partial<EmergencyActPayload> & {
	scenarioId?: EmergencyScenarioId | undefined;
	patientName?: string | undefined;
	patientAge?: number | undefined;
	patientWeightKg?: number | undefined;
	doctorName?: string | undefined;
	injectedAnestheticInfo?: string | undefined;
	stopwatchTotalSeconds?: number | undefined;
	executedSteps?: ReadonlyArray<any> | undefined;
	administeredDrugs?: ReadonlyArray<{ name: string; dose: string; timeIso?: string }> | undefined;
}): string {
	const scenarioId = payload.scenarioId || 'last_toxicity';
	const protocol = EMERGENCY_PROTOCOLS[scenarioId] || EMERGENCY_PROTOCOLS.last_toxicity;
	const now = new Date(payload.startTimeIso || Date.now());
	const dateFormatted = now.toLocaleDateString('ru-RU', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric'
	});
	const timeFormatted = now.toLocaleTimeString('ru-RU', {
		hour: '2-digit',
		minute: '2-digit'
	});

	const patFullName = payload.patient?.fullName || payload.patientName || 'Пациент';
	const patAge = payload.patient?.ageYears ?? payload.patientAge ?? 35;
	const patWeight = payload.patient?.weightKg ?? payload.patientWeightKg ?? 70;
	const docName = payload.doctorFullName || payload.doctorName || 'Лечащий врач-стоматолог';
	const clinic = payload.clinicName || 'Стоматологическая клиника';
	const address = payload.clinicAddress || 'ул. Клиническая, д. 1';
	const cabinet = payload.cabinetNumber || '1';

	const executed = payload.executedSteps || [];
	const stepsLogText = executed.length > 0
		? executed
				.map(
					(s: any) =>
						`• [${s.timeFormatted || s.timestampFormatted || '00:00'}] Шаг ${s.stepNumber}: ${s.titleRu || s.stepTitleRu || ''}${s.actionNotes || s.notesRu ? ` (${s.actionNotes || s.notesRu})` : ''}`
				)
				.join('\n')
		: '• Реанимационные мероприятия проведены в полном объеме согласно стандарту.';

	const drugs = payload.administeredDrugs || [];
	const drugsText = drugs.length > 0
		? '\nВВЕДЕННЫЕ ЛЕКАРСТВЕННЫЕ ПРЕПАРАТЫ:\n' + drugs.map((d) => `• ${d.name} — ${d.dose}`).join('\n')
		: '';

	let outcomeText = 'Пациент стабилен, отпущен домой в сопровождении родственников.';
	if (payload.patientOutcome === 'transferred_to_smp') {
		outcomeText = `Пациент в стабильно-тяжелом состоянии передан реанимационной бригаде СМП${payload.smpDoctorFullName ? ` (врач СМП: ${payload.smpDoctorFullName})` : ''} для экстренной госпитализации.`;
	} else if (payload.patientOutcome === 'refused_hospitalization') {
		outcomeText = 'Состояние купировано, пациент категорически отказался от госпитализации в стационар (письменный отказ оформлен).';
	}

	return `АКТ ОКАЗАНИЯ ЭКСТРЕННОЙ МЕДИЦИНСКОЙ ПОМОЩИ (Форма № 043/у)
Нормативный регламент: ${protocol.statutoryOrderRu} (Приказ МЗ РФ № 786н, КР345)
Дата и время инцидента: ${dateFormatted} в ${timeFormatted}
Место: ${clinic} (кабинет № ${cabinet}, ${address})
Лечащий врач: ${docName}
Пациент: ${patFullName}, ${patAge} лет, масса тела ${patWeight} кг
Введенный анестетик: ${payload.injectedAnestheticInfo || 'Местный анестетик'}

ДИАГНОЗ / КЛИНИЧЕСКАЯ СИТУАЦИЯ:
${protocol.titleRu} (${protocol.severityBadgeRu})

ИСХОДНЫЙ СОМАТИЧЕСКИЙ СТАТУС ПРИ НАЧАЛЕ ИНЦИДЕНТА:
• Артериальное давление: ${payload.initialBp || '—'} мм рт. ст.
• Пульс / ЧСС: ${payload.initialHr || '—'} уд/мин
• Сатурация SpO2: ${payload.initialSpo2 || '—'}%

ХРОНОЛОГИЯ РЕАНИМАЦИОННЫХ МЕРОПРИЯТИЙ:
${stepsLogText}${drugsText}

${payload.smpBrigadeCalled ? `ВЫЗОВ СКОРОЙ МЕДИЦИНСКОЙ ПОМОЩИ (112):
• Время вызова: ${payload.smpCallTime || timeFormatted}
• Время прибытия бригады: ${payload.smpBrigadeArrivedTime || 'через 12 минут'}
` : ''}
ДИНАМИКА ВИТАЛЬНЫХ ФУНКЦИЙ:
• Конечное АД: ${payload.finalBp || '120/80'} мм рт. ст.
• Конечный пульс (ЧСС): ${payload.finalHr || '76'} уд/мин
• Конечная сатурация SpO2: ${payload.finalSpo2 || '98'}%

ИСХОД И МАРШРУТИЗАЦИЯ:
${outcomeText}
${payload.clinicalNotes ? `\nОсобые отметки врача: ${payload.clinicalNotes}` : ''}

Врач-стоматолог: ____________________ / ${docName} /
Медицинская сестра / ассистент: ____________________`;
}

/**
 * Generates an ultra-clear phone script for calling 112 / 103 dispatchers (SBAR standard).
 */
export function generateEmergency112DispatchScript(params: {
	scenarioId?: EmergencyScenarioId | undefined;
	clinicName?: string | undefined;
	clinicAddress?: string | undefined;
	cabinetNumber?: string | undefined;
	patientName?: string | undefined;
	patientAge?: number | undefined;
	patientAgeYears?: number | undefined;
	patientWeightKg?: number | undefined;
	patientGender?: 'male' | 'female' | undefined;
	doctorName?: string | undefined;
	injectedAnestheticInfo?: string | undefined;
	currentBp?: string | undefined;
	currentHr?: string | undefined;
	currentSpo2?: string | undefined;
	adrenalineGivenMg?: number | undefined;
	stopwatchSeconds?: number | undefined;
	administeredDrugs?: ReadonlyArray<string> | undefined;
}): string {
	const scenarioId = params.scenarioId || 'last_toxicity';
	const protocol = EMERGENCY_PROTOCOLS[scenarioId] || EMERGENCY_PROTOCOLS.last_toxicity;
	const genderRu = params.patientGender === 'female' ? 'Женщина' : 'Мужчина / Пациент';
	const age = params.patientAgeYears ?? params.patientAge ?? 35;
	const weight = params.patientWeightKg ?? 70;
	const clinic = params.clinicName || 'Стоматологическая клиника';
	const address = params.clinicAddress || 'ул. Клиническая, д. 1';
	const cabinet = params.cabinetNumber || '1';
	const patName = params.patientName || 'Пациент';

	const vitalsPart = params.currentBp
		? `АД ${params.currentBp} мм рт. ст., ЧСС ${params.currentHr || '110'}, SpO2 ${params.currentSpo2 || '92'}%.`
		: 'Нестабильная гемодинамика, падение АД / судорожный синдром.';

	const drugsPart = params.administeredDrugs && params.administeredDrugs.length > 0
		? `\nВведенные препараты: ${params.administeredDrugs.join(', ')}.`
		: params.adrenalineGivenMg && params.adrenalineGivenMg > 0
		? `\nВведен адреналин 0.1% ${params.adrenalineGivenMg} мг в/м в бедро.`
		: '';

	return `СТАНДАРТ SBAR ПЕРЕДАЧИ ДИСПЕТЧЕРУ 112 / 103 (ЧИТАТЬ В ТРУБКУ):

1. СИТУАЦИЯ (Situation):
«Здравствуйте! Вызов экстренной бригады в стоматологическую клинику «${clinic}».
Адрес: ${address}, кабинет № ${cabinet}.
Срочно требуется СПЕЦИАЛИЗИРОВАННАЯ РЕАНИМАЦИОННАЯ БРИГАДА (БИТ / РХБ)!
Повод: ${protocol.shortTitleRu} (${protocol.titleRu}).»

2. АНАМНЕЗ (Background):
«Пациент: ${patName}, ${genderRu}, возраст ${age} лет, масса тела ${weight} кг.
Проводилась стоматологическая процедура под местной анестезией: ${params.injectedAnestheticInfo || 'Местный анестетик'}.»

3. ОЦЕНКА (Assessment):
«Состояние пациента: ${vitalsPart}${drugsPart}
Проводится подача 100% кислорода, инфузия и протокол ${protocol.shortTitleRu}.»

4. РЕКОМЕНДАЦИЯ (Recommendation):
«Требуется экстренное прибытие реанимационной бригады СМП и подготовка стационара к приёму пациента.
Кто вызвал: врач-стоматолог ${params.doctorName || ''}. Бригаду встречает администратор у входа.»`;
}

