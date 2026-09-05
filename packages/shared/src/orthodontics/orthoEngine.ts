/**
 * orthoEngine.ts — Orthodontic Clinical Engine & 1-Click Protocols (@dental/shared)
 * 
 * Supports:
 * 1. Fixed appliances (Брекет-системы: Damon Q2, Clear, Empower, Mini Diamond, Pitts 21).
 * 2. Clear aligners (Элайнеры: каппы, пресеты аттачментов, сдача сетов).
 * 3. Removable & functional plates (Пластинки с расширяющим винтом, Твин-Блок, Марко Роса/Хаас RPE).
 * 4. Archwires: NiTi, CuNiTi 27°/35°, SS, TMA (круглые .012-.020, прямоугольные .014x.025-.021x.025).
 * 5. Intermaxillary elastics & chains: Class II, Class III, vertical/box, cross, asymmetric.
 * 6. 1-Click Form 043/u SOAP Diary Note generation without clerical friction (Mandates 8e, 8k, 8n).
 */

import type {
	AlignerAttachmentPreset,
	ArchwireMaterial,
	ArchwireMaterialOption,
	ArchwireSection,
	BracketSlot,
	BracketSystemOption,
	ClinicalActionOption,
	ElasticSchemeOption,
	ElasticSizeOption,
	OrthodonticQuickPreset,
	OrthodonticSoapParams,
} from "./types.js";

export const UPPER_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
export const LOWER_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
export const ANTERIOR_TEETH = [13, 12, 11, 21, 22, 23, 43, 42, 41, 31, 32, 33];

export const BRACKET_SYSTEMS: BracketSystemOption[] = [
	{ id: "damon_q2", label: "Damon Q2", desc: "Металл · Пассивное самолигирование", category: "brackets" },
	{ id: "damon_clear", label: "Damon Clear", desc: "Сапфир / керамика · Эстетические", category: "brackets" },
	{ id: "empower", label: "Empower", desc: "Интерактивное самолигирование", category: "brackets" },
	{ id: "mini_diamond", label: "Mini Diamond", desc: "Лигатурные классические", category: "brackets" },
	{ id: "pitts21", label: "Pitts 21", desc: "Квадратный паз .021", category: "brackets" },
	{ id: "aligners", label: "Элайнеры", desc: "Прозрачные каппы с аттачментами", category: "aligners" },
	{ id: "removable_plate", label: "Пластинка с винтом", desc: "Съемный пластиночный аппарат с расширяющим винтом", category: "removable_plates" },
	{ id: "twin_block", label: "Твин-Блок", desc: "Функциональный двухчелюстной аппарат", category: "functional" },
	{ id: "haas_marco_rosa", label: "Аппарат Марко Роса / Хааса", desc: "RPE быстрое небное расширение на кольцах/каппах", category: "functional" },
	{ id: "fraenkel", label: "Регулятор функции Френкеля", desc: "Функциональный аппарат", category: "functional" },
];

export const ARCHWIRE_MATERIALS: ArchwireMaterialOption[] = [
	{ id: "NiTi", label: "NiTi SuperElastic", desc: "Никель-титан · Первичное нивелирование", badge: "NiTi" },
	{ id: "CuNiTi", label: "CuNiTi 27°C / 35°C", desc: "Медь-никель-титан · Термоактивная", badge: "CuNiTi" },
	{ id: "SS", label: "SS (Stainless Steel)", desc: "Медицинская сталь · Закрытие промежутков", badge: "SS" },
	{ id: "TMA", label: "TMA (Beta-Titanium)", desc: "Бета-титан · Юстировка и финишные торки", badge: "TMA" },
];

export const ROUND_SECTIONS: ArchwireSection[] = [".012", ".014", ".016", ".018", ".020"];
export const RECT_SECTIONS: ArchwireSection[] = [
	".014x.025",
	".016x.022",
	".016x.025",
	".017x.025",
	".018x.025",
	".019x.025",
	".021x.025",
];

export const ELASTIC_SCHEMES: ElasticSchemeOption[] = [
	{ id: "none", label: "Без эластиков", desc: "Межчелюстная тяга не назначена" },
	{ id: "class_ii", label: "II класс (дистализирующая)", desc: "Клык ВЧ — 6 зуб НЧ" },
	{ id: "class_iii", label: "III класс (мезиализирующая)", desc: "6 зуб ВЧ — клык НЧ" },
	{ id: "vertical_box", label: "Вертикальные (коробчатые)", desc: "Устранение открытого прикуса" },
	{ id: "cross", label: "Перекрестные (Cross-bite)", desc: "Устранение перекрестной окклюзии" },
	{ id: "asymmetric", label: "Асимметричные", desc: "Коррекция косметического центра" },
];

export const ELASTIC_SIZES: ElasticSizeOption[] = [
	{ id: "fox_3_16", label: "3/16\" 3.5 oz (Лиса)", strength: "Light" },
	{ id: "rabbit_3_16", label: "3/16\" 4.5 oz (Кролик)", strength: "Medium" },
	{ id: "kangaroo_1_4", label: "1/4\" 4.5 oz (Кенгуру)", strength: "Medium" },
	{ id: "buffalo_1_4", label: "1/4\" 6.0 oz (Буйвол)", strength: "Heavy" },
	{ id: "bear_5_16", label: "5/16\" 6.0 oz (Медведь)", strength: "Heavy" },
	{ id: "monkey_3_8", label: "3/8\" 4.5 oz (Обезьяна)", strength: "Medium" },
];

export const CLINICAL_ACTIONS: ClinicalActionOption[] = [
	{ id: "wire_change", label: "Смена дуги + активация замков", category: "wires" },
	{ id: "ligature_change", label: "Смена эластических лигатур", category: "wires" },
	{ id: "power_chain", label: "Установка цепочки Power Chain", category: "wires" },
	{ id: "rebracket", label: "Повторная фиксация отклеенного брекета (A16.07.048)", category: "braces" },
	{ id: "ipr", label: "Сепарация эмали (IPR / стриппинг)", category: "aligners" },
	{ id: "plate_activation", label: "Активация кламмеров и дуги пластинки", category: "plates" },
	{ id: "expansion_screw_activation", label: "Раскрутка расширяющего винта пластинки (1/4 об. = 0.25 мм)", category: "plates" },
	{ id: "debonding", label: "Снятие аппаратуры + ретейнер", category: "finishing" },
];

export const ALIGNER_ATTACHMENT_PRESETS: AlignerAttachmentPreset[] = [
	{
		id: "standard",
		label: "Стандартные аттачменты: клыки и премоляры (15, 14, 13, 23, 24, 25, 35, 34, 33, 43, 44, 45)",
		shortLabel: "Стандартные (клыки и премоляры)",
		teeth: [15, 14, 13, 23, 24, 25, 35, 34, 33, 43, 44, 45],
		description:
			"Фиксация композитных аттачментов по переносному шаблону на зубы 15, 14, 13, 23, 24, 25, 35, 34, 33, 43, 44, 45. Подготовка эмали: очистка пастой без фтора, протравливание 37% ортофосфорной кислотой 30 сек, смывание, высушивание. Внесение адгезивной системы, фотополимеризация. Заполнение шаблона микрогибридным композитом, позиционирование, полимеризация каждого зуба по 20 сек. Удаление излишков финирами, полировка. Припасован сет элайнеров №1: посадка плотная, ретенция надежная.",
	},
	{
		id: "intact",
		label: "Аттачменты интактны, сколов нет",
		shortLabel: "Аттачменты интактны, сколов нет",
		teeth: [15, 14, 13, 23, 24, 25, 35, 34, 33, 43, 44, 45],
		description:
			"Контрольный осмотр элайнеров. Композитные аттачменты на верхней и нижней челюстях визуально и инструментально интактны: сколов, дефектов фиксации и отклеек не выявлено. Элайнеры прилегают плотно по всему периметру, ретенция оптимальная, зазоров нет. Трекинг перемещения зубов полностью соответствует виртуальному 3D-сетапу.",
	},
	{
		id: "refixation",
		label: "Повторная фиксация аттачмента (замена)",
		shortLabel: "Повторная фиксация аттачмента (замена)",
		teeth: [15, 14, 13, 23, 24, 25, 35, 34, 33, 43, 44, 45],
		description:
			"Обнаружен скол / отклейка композитного аттачмента. Проведено механическое удаление остатков старого композита, очистка поверхности эмали. Протравливание 37% ортофосфорной кислотой, адгезивный протокол, повторная фиксация аттачмента по шаблону из композитного материала, фотополимеризация. Фиксация и ретенция восстановлены.",
	},
	{
		id: "debonding",
		label: "Снятие аттачментов и полировка (финиш)",
		shortLabel: "Снятие аттачментов и полировка (финиш)",
		teeth: [15, 14, 13, 23, 24, 25, 35, 34, 33, 43, 44, 45],
		description:
			"Завершение элайнер-терапии. Атравматичное сошлифовывание композитных аттачментов твердосплавными финирами на пониженных оборотах с водяным охлаждением без повреждения эмали. Финишная полировка пастами и дисками до зеркального блеска, глубокое фторирование эмали. Выданы ретенционные каппы.",
	},
];

export const ORTHODONTIC_QUICK_PRESETS: OrthodonticQuickPreset[] = [
	{
		id: "wire_change_cuniti_round",
		label: "Плановая замена дуги ВЧ / НЧ на круглую Cu-NiTi (.014, .016, .018) + эластические лигатуры",
		shortLabel: "Смена дуги Cu-NiTi (круглая)",
		systemId: "damon_q2",
		targetArch: "both",
		wireMaterial: "CuNiTi",
		wireSection: ".016",
		actions: ["wire_change", "ligature_change"],
		elasticScheme: "class_ii",
		elasticSize: "kangaroo_1_4",
		elasticWear: "22 часа/сутки",
		code804n: "A16.07.048",
		notes: "Плановый визит по графику ортодонтического лечения. Дуги сохранны без деформаций. Выполнена плановая замена дуг ВЧ и НЧ на круглые термоактивные Cu-NiTi .016\". Активация замков брекетов, замена эластических лигатур. Межчелюстная тяга скорректирована (II класс). Жалоб на острую боль и отклейку брекетов нет. Гигиена полости рта удовлетворительная.",
	},
	{
		id: "wire_change_rect_torque",
		label: "Переход на прямоугольную рабочую дугу (.019x.025 TMA / Steel) для торка и ретракции",
		shortLabel: "Прямоугольная дуга .019x.025 (торк)",
		systemId: "damon_q2",
		targetArch: "both",
		wireMaterial: "SS",
		wireSection: ".019x.025",
		actions: ["wire_change", "ligature_change"],
		elasticScheme: "class_ii",
		elasticSize: "buffalo_1_4",
		elasticWear: "22 часа/сутки",
		code804n: "A16.07.048",
		notes: "Этап рабочей механики и юстировки торка. Завершено нивелирование, зубные ряды подготовлены. Произведена установка прямоугольных жестких дуг SS .019x.025\" на верхнюю и нижнюю челюсти для стабилизации, контроля торка резцов и корпусной ретракции. Дистальные концы дуг подогнуты и зашлифованы. Назначена межчелюстная эластическая тяга.",
	},
	{
		id: "power_chain_closure",
		label: "Эластическая цепочка (Power Chain) от моляра до моляра для закрытия трем/диастем",
		shortLabel: "Цепочка Power Chain (закрытие трем/диастем)",
		systemId: "damon_q2",
		targetArch: "upper",
		wireMaterial: "SS",
		wireSection: ".019x.025",
		actions: ["power_chain", "ligature_change"],
		powerChainSpan: "16-26",
		powerChainType: "short",
		code804n: "A16.07.048",
		notes: "Этап закрытия сагиттальных и трансверзальных промежутков (тремы, диастемы). На жесткую стальную дугу .019x.025\" установлена эластическая цепочка Power Chain с коротким шагом от моляра до моляра (16-26). Проведена проверка плотности замков и отсутствия перегрузки фронтальных зубов. Контроль окклюзионных контактов.",
	},
	{
		id: "aligner_tracking_check",
		label: "Контроль элайнеров: проверка прилегания, выдача капп (следующие 4 шага), сепарация/стриппинг",
		shortLabel: "Контроль элайнеров (4 шага + IPR)",
		systemId: "aligners",
		targetArch: "both",
		actions: ["ipr"],
		activeAttachmentPreset: "intact",
		alignerSetIssued: { count: 4, days: 28 },
		code804n: "A16.07.048",
		notes: "Контрольный осмотр на этапе элайнеротерапии. Композитные аттачменты на верхней и нижней челюстях интактны, сколов нет. Посадка элайнеров прецизионная, ретенция надежная, зазоров нет. Выполнена калиброванная сепарация эмали (IPR) алмазными штрипсами в межзубных промежутках 0.2 мм, финишная полировка и флюоризация. Выдан следующий комплект элайнеров: 4 шага на 28 дней (ношение 22 ч/сутки, смена капп каждые 7 дней). Обучение работе с чувисами.",
	},
	{
		id: "rebracket_single_tooth",
		label: "Повторная фиксация отклеенного брекета (A16.07.048) в 1 клик",
		shortLabel: "Переклейка брекета (A16.07.048)",
		systemId: "damon_q2",
		targetArch: "upper",
		actions: ["rebracket", "wire_change"],
		code804n: "A16.07.048",
		teeth: [14],
		notes: "Жалоба пациента на подвижность/отклейку брекета на зубе 14 после приема жесткой пищи. Проведена повторная фиксация брекета по номенклатуре A16.07.048: атравматичное снятие дуги, сошлифовывание старого адгезива финиром, очистка поверхности эмали пастой без фтора. Кислотное травление 37% ортофосфорной кислотой 30 сек, промывание, сушка, нанесение праймера. Прямое позиционирование брекета на зубе 14 по индивидуальной высоте, фотополимеризация 20 сек. Дуга введена в паз, замок закрыт. Фиксация аппаратуры полностью восстановлена.",
	},
	{
		id: "plate_expansion",
		label: "Активация пластинки (винт 1/4 об. + дуга)",
		shortLabel: "Активация пластинки",
		systemId: "removable_plate",
		targetArch: "upper",
		actions: ["plate_activation", "expansion_screw_activation"],
		code804n: "A16.07.048",
		notes: "Контрольный осмотр съемного пластиночного аппарата с расширяющим винтом на верхнюю челюсть. Аппарат стабилен, кламмеры Адамса плотно охватывают коронки моляров. Выполнена активация вестибулярной дуги для ретракции фронтальных зубов. Произведена активация расширяющего винта на 1/4 оборота (0.25 мм). Пациент обучен самостоятельному повороту винта ключом 1 раз в 7 дней. Режим ношения: не менее 20-22 часов в сутки. Гигиена аппарата и полости рта удовлетворительная.",
	},
	{
		id: "bonding",
		label: "Первичная фиксация брекет-системы (ВЧ)",
		shortLabel: "Фиксация брекетов (ВЧ)",
		systemId: "damon_q2",
		targetArch: "upper",
		wireMaterial: "NiTi",
		wireSection: ".014",
		actions: ["wire_change"],
		elasticScheme: "none",
		code804n: "A16.07.047",
		notes: "Первичная прямая фиксация несъемной вестибулярной брекет-системы на верхнюю челюсть (сегменты 17-27, номенклатура A16.07.047). Протравливание эмали 37% ортофосфорной кислотой (30 сек), тщательное смывание, высушивание. Нанесение праймера, позиционирование брекетов по индивидуальной высоте, фотополимеризация. Введена первичная нивелирующая дуга NiTi .014\". Концы дуг отожжены и подогнуты. Проведен подробный инструктаж по уходу за брекетами и гигиене полости рта, выдан защитный воск.",
	},
	{
		id: "debonding",
		label: "Снятие брекетов + ретейнер (13-23, 33-43)",
		shortLabel: "Снятие + ретейнер",
		systemId: "damon_q2",
		targetArch: "both",
		actions: ["debonding"],
		elasticScheme: "none",
		code804n: "A16.07.048",
		notes: "Окончание активного периода ортодонтического лечения. Атравматичное снятие брекет-системы специальными щипцами. Механическое удаление остатков композита твердосплавными финирами без повреждения эмали, полировка вестибулярных поверхностей. Фиксация несъемного проволочного ретейнера (флекс-дуга 0.0175\") на текучий композит в сегментах 13-23 и 33-43. Сняты оттиски/сканы для изготовления ретенционных капп. Окклюзия стабильна.",
	},
];

export function generateOrthodonticSoapNote(params: OrthodonticSoapParams): string {
	const effectiveDate = params.dateStr || new Date().toLocaleDateString("ru-RU");
	const patientName = params.patientName || "Пациент";
	const systemObj = BRACKET_SYSTEMS.find((b) => b.id === params.bracketSystem);
	const materialObj = ARCHWIRE_MATERIALS.find((m) => m.id === params.archwireMaterial);
	const elasticObj = ELASTIC_SCHEMES.find((e) => e.id === params.elasticScheme);
	const elasticSizeObj = ELASTIC_SIZES.find((s) => s.id === params.elasticSize);

	const effectiveCode804n = params.code804n || (
		params.bracketSystem === "aligners" ? "A16.07.048" :
		params.selectedActions?.includes("rebracket") ? "A16.07.048" :
		params.selectedActions?.includes("bonding") ? "A16.07.047" :
		"A16.07.048"
	);

	const archLabel =
		params.targetArch === "upper"
			? "Верхняя челюсть (ВЧ)"
			: params.targetArch === "lower"
				? "Нижняя челюсть (НЧ)"
				: "Верхняя и нижняя челюсти (ВЧ + НЧ)";

	const teethListStr =
		params.selectedTeeth && params.selectedTeeth.length > 0
			? params.selectedTeeth.join(", ")
			: "аппаратура не активирована";

	const actionsList = (params.selectedActions || [])
		.map((aId) => CLINICAL_ACTIONS.find((a) => a.id === aId)?.label)
		.filter(Boolean)
		.join("; ");

	let elasticsText = "Межчелюстная тяга не назначена.";
	if (params.elasticScheme && params.elasticScheme !== "none") {
		elasticsText = `Межчелюстные эластики: ${elasticObj?.label || ""} (${elasticSizeObj?.label || ""}, ${elasticSizeObj?.strength || ""}). Режим ношения: ${params.elasticWear || "22 часа/сутки"}.`;
	}

	let powerChainText = "";
	if (params.selectedActions?.includes("power_chain")) {
		powerChainText = `\nУстановлена эластическая цепочка Power Chain (${params.powerChainType === "short" ? "короткий шаг" : params.powerChainType === "long" ? "длинный шаг" : "сплошная"}) в сегменте ${params.powerChainSpan || "16-26"}.`;
	}

	let attachmentText = "";
	const currentAttachmentObj = ALIGNER_ATTACHMENT_PRESETS.find((p) => p.id === params.activeAttachmentPreset);
	if (currentAttachmentObj) {
		attachmentText = `• Аттачменты элайнеров: ${currentAttachmentObj.description}`;
	}

	let alignerSetText = "";
	if (params.alignerSetIssued) {
		alignerSetText = `• Выдача элайнеров: выдан следующий сет капп (+${params.alignerSetIssued.days} дн., ${params.alignerSetIssued.count} каппы). Режим ношения: 22 ч/сутки.`;
	}

	let plateText = "";
	if (params.bracketSystem === "removable_plate") {
		plateText = `• Состояние аппарата: съемная пластинка с расширяющим винтом на ${archLabel}. Фиксация стабильна, кламмеры и вестибулярная дуга адаптированы. Раскрутка винта: ${params.plateActivationTurns || 1}/4 оборота (0.25 мм).`;
	}

	let archwireText = `• Текущая дуга: ${archLabel} — ${materialObj?.badge || ""} сечением ${params.archwireSection || ".016"}\".`;
	if (params.bracketSystem === "aligners" || params.activeAttachmentPreset) {
		archwireText = "• Состояние аппаратуры: прозрачные каппы (элайнеры), фиксация на аттачментах плотная, окклюзионных помех нет.";
	} else if (params.bracketSystem === "removable_plate") {
		archwireText = plateText;
	} else if (params.selectedActions?.includes("debonding")) {
		archwireText = "• Состояние аппаратуры: брекет-система снята. Зафиксирован несъемный проволочный ретейнер в сегментах 13-23 и 33-43.";
	}

	return `ДНЕВНИК ОРТОДОНТИЧЕСКОГО ПРИЁМА (ФОРМА 043/у)
Дата приёма: ${effectiveDate}
Пациент: ${patientName}
Номенклатура 804н: ${effectiveCode804n} (Ортодонтическая коррекция с применением аппаратурных методов)

1. ЖАЛОБЫ:
${params.notes || "Плановый визит по графику ортодонтического лечения. Жалоб на острую боль и отклейку аппаратуры нет."}

2. ОБЪЕКТИВНЫЙ СТАТУС:
• Аппаратура: ${
	params.bracketSystem === "aligners"
		? "Ортодонтические элайнеры (каппы с аттачментами)"
		: params.bracketSystem === "removable_plate"
			? "Съемный пластиночный аппарат с расширяющим винтом"
			: `${systemObj?.label || "Брекет-система"} (паз ${params.bracketSlot || "0.022"}")`
}.
• Зона фиксации/активации (зубы): ${teethListStr}.
${attachmentText ? `${attachmentText}\n` : ""}${alignerSetText ? `${alignerSetText}\n` : ""}${archwireText}
• Фиксация аппаратуры стабильна, окклюзионных контактов с замками/каппами не выявлено.

3. ПРОВЕДЁННОЕ ЛЕЧЕНИЕ:
• Выполненные манипуляции: ${actionsList || (params.activeAttachmentPreset ? currentAttachmentObj?.shortLabel : "Активация аппаратуры")}.${powerChainText}
${currentAttachmentObj ? `• ${currentAttachmentObj.description}\n` : ""}${params.alignerSetIssued ? `• Сдан сет элайнеров на ${params.alignerSetIssued.days} дн. (смена капп каждые ${Math.round(params.alignerSetIssued.days / params.alignerSetIssued.count)} дней).\n` : ""}• ${elasticsText}
• Антисептическая обработка полости рта (0.05% раствор хлоргексидина).
• Коррекция элементов аппаратуры / проверка комфорта мягких тканей.

4. РЕКОМЕНДАЦИИ И НАЗНАЧЕНИЯ:
${
	params.bracketSystem === "aligners" || params.activeAttachmentPreset
		? `• Ношение элайнеров строго не менее 20–22 часов в сутки (снимать только во время приёма пищи и чистки зубов).
• Использование чувисов для плотной посадки капп на зубах.
• Хранение элайнеров в специальном вентилируемом боксе, промывание прохладной водой.
• Следующий плановый приём: через ${params.alignerSetIssued ? `${Math.round(params.alignerSetIssued.days / 7)} недель` : "4–6 недель"}.`
		: params.bracketSystem === "removable_plate"
			? `• Ношение пластинки строго 20–22 часа в сутки (снимать во время еды и контактного спорта).
• Активация расширяющего винта ключом строго по схеме (1 раз в 7 дней на 1/4 оборота по стрелке).
• Хранение в сухом вентилируемом контейнере, ежедневная механическая чистка зубной щеткой и мылом.
• Следующий контрольный приём: через 4 недели.`
			: `• Строгое соблюдение гигиены (ортодонтическая щетка, монопучок, ершики, ирригатор).
• Использование ортодонтического защитного воска при натирании.
• Исключить из рациона твердую, волокнистую и липкую пищу.
• Следующий плановый приём: через 4–6 недель.`
}`;
}
