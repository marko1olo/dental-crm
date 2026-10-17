/**
 * apps/web/src/components/odontogram/chart/types/toothPathologyTypes.ts
 *
 * DENTE Dental CRM — Clinical Tooth Pathology Definitions, Labels, and Protocols.
 * Clean clinical terminology according to STaR and Order 804n.
 */

import { getToothFolkAndAnatomicalNameRu } from "../../../../lib/clinicalProtocols043";

/**
 * Русские названия состояний — для доступного имени зуба.
 */
export const TOOTH_STATE_LABELS: Record<string, string> = {
	Caries: "кариес",
	caries: "кариес",
	Pulpitis: "пульпит",
	pulpitis: "пульпит",
	Periodontitis: "периодонтит",
	periodontitis: "периодонтит",
	Filled: "пломба",
	filled: "пломба",
	Crown: "коронка",
	crown: "коронка",
	Planned_Crown: "коронка в изготовлении",
	planned_crown: "коронка в изготовлении",
	Implant: "имплантат",
	implant: "имплантат",
	Planned_Implant: "план. имплантат",
	planned_implant: "план. имплантат",
	Missing: "отсутствует",
	missing: "отсутствует",
	Healthy: "здоров",
	healthy: "здоров",
	Retained: "ретинированный",
	retained: "ретинированный",
	Root: "разрушенный корень",
	root: "разрушенный корень",
	Temporary_Crown: "временная коронка",
	Veneer: "винир",
	Inlay: "вкладка",
	Primary: "молочный зуб",
	Resection: "резекция верхушки",
	Gingivitis: "гингивит",
	Periodontitis_Mild: "легкий пародонтит",
	Periodontitis_Moderate: "средний пародонтит",
	Periodontitis_Severe: "тяжелый пародонтит",
	Mobility_1: "подвижность I ст.",
	Mobility_2: "подвижность II ст.",
	Mobility_3: "подвижность III ст.",
	Mobility_I: "подвижность I ст.",
	Mobility_II: "подвижность II ст.",
	Mobility_III: "подвижность III ст.",
	Mobility_IV: "подвижность IV ст.",
	Furcation_1: "фуркация I кл.",
	Furcation_2: "фуркация II кл.",
	Furcation_3: "фуркация III кл.",
	Furcation_I: "фуркация I кл.",
	Furcation_II: "фуркация II кл.",
	Furcation_III: "фуркация III кл.",
	Root_Canal_Treated: "лечены каналы",
	Bridge: "мостовидный протез",
	Bridge_Abutment: "опора моста",
	Extracted: "удален",
	Impacted: "ретинированный",
	Calculus: "зубной камень",
	Bleeding: "кровоточивость",
	Recession: "рецессия десны",
	Pocket: "пародонтальный карман",
	planned: "план лечения",
	treatment: "в лечении",
	done: "санирован",
	watch: "наблюдение",
};

export function getToothStateLabelRu(state?: string | null): string {
	if (!state) return "интактный";
	const direct = TOOTH_STATE_LABELS[state];
	if (direct) return direct;
	const lower = TOOTH_STATE_LABELS[state.toLowerCase()];
	if (lower) return lower;
	return "интактный";
}

export interface FastToothPreset {
	id: string;
	title: string;
	shortTitle: string;
	description: string;
	badge: string;
	icd10?: string;
	code804n?: string;
}

export const FAST_TOOTH_PRESETS: readonly FastToothPreset[] = [
	{
		id: "intact_dentition",
		title: "Интактный зубной ряд (Все зубы здоровы / норма)",
		shortTitle: "Интактный (Норма)",
		description: "Все 32 зуба отмечаются здоровыми (медосмотр, военкомат, бассейн, санация)",
		badge: "Норма",
		icd10: "Z01.2",
	},
	{
		id: "pro_hygiene_done",
		title: "Профгигиена выполнена (Ультразвук + Air-Flow + полировка)",
		shortTitle: "Профгигиена (УЗ + Air-Flow)",
		description: "Снятие зубных отложений УЗ + Air-Flow + полировка Detartrine + фторирование Bifluorid",
		badge: "В дневник",
		icd10: "Z01.2",
		code804n: "A16.07.051",
	},
	{
		id: "fast_caries_k021",
		title: "Быстрая пломба / кариес дентина (K02.1)",
		shortTitle: "Пломба/Кариес (K02.1)",
		description: "Препарирование кариозной полости, медобработка, адгезивный протокол, пломба светового отверждения",
		badge: "K02.1",
		icd10: "K02.1",
		code804n: "A16.07.002.001",
	},
	{
		id: "wisdom_missing",
		title: "Адентия 8-ок (18, 28, 38, 48)",
		shortTitle: "Без 8-ок",
		description: "Зубы мудрости 18, 28, 38, 48 помечаются отсутствующими / удаленными",
		badge: "K08.1",
		icd10: "K08.1",
	},
	{
		id: "fast_pulpitis_turnkey",
		title: "Пульпит под ключ (K04.0: анестезия + каналы + обтурация + пломба)",
		shortTitle: "Пульпит под ключ (K04.0)",
		description: "Эндодонтическое лечение: анестезия, коффердам, обработка и пломбирование каналов, световая пломба",
		badge: "K04.0",
		icd10: "K04.0",
		code804n: "A16.07.030",
	},
	{
		id: "fast_extraction_turnkey",
		title: "Удаление зуба под ключ (K08.1: анестезия + удаление + гемостаз + шов)",
		shortTitle: "Удаление зуба (K08.1)",
		description: "Хирургический протокол: анестезия, периотомия, атравматичное удаление, ревизия, кюретаж, шов",
		badge: "K08.1",
		icd10: "K08.1",
		code804n: "A16.07.001",
	},
] as const;

/**
 * Протокол быстрой пломбы / кариеса дентина K02.1
 */
export function applyFastCariesK021Protocol(toothNumber: number): {
	statusLocalis: string;
	diagnosis: string;
	treatment: string;
	serviceCode: string;
	serviceName: string;
	price: number;
} {
	const toothName = getToothFolkAndAnatomicalNameRu(toothNumber);
	const statusLocalis = `Зуб ${toothNumber} (${toothName}): на окклюзионной поверхности глубокая кариозная полость в пределах околопульпарного дентина. Дентин пигментирован, размягчен на дне. Зондирование дна безболезненно, по эмалево-дентинной границе чувствительно. Перкуссия безболезненна. Реакция на холод кратковременная, проходит сразу после устранения раздражителя.`;
	const diagnosis = `K02.1 Кариес дентина (средний/глубокий) зуба ${toothNumber}`;
	const treatment = `Анестезия инфильтрационная Артикаин 1:200000 1.7 мл. Препарирование кариозной полости зуба ${toothNumber}, некрэктомия. Медикаментозная обработка 2% р-ром хлоргексидина. Изоляция операционного поля коффердамом. Адгезивный протокол: протравливание эмали 37% ортофосфорной кислотой 15 сек., нанесение адгезива V поколения, полимеризация 20 сек. Восстановление анатомической формы светоотверждаемым наногибридным композитом послойно. Шлифовка, полировка пастой, финишный блеск.`;

	return {
		statusLocalis,
		diagnosis,
		treatment,
		serviceCode: "A16.07.002.001",
		serviceName: `Восстановление зуба ${toothNumber} пломбой из фотополимерного композита при среднем/глубоком кариесе (K02.1)`,
		price: 4500,
	};
}

/**
 * Протокол комплексной профессиональной гигиены
 */
export function applyFastProHygieneProtocol(): {
	statusLocalis: string;
	diagnosis: string;
	treatment: string;
	serviceCode: string;
	serviceName: string;
	price: number;
} {
	const statusLocalis =
		"Полость рта: над- и поддесневой зубной камень преимущественно в области нижних фронтальных зубов (33-43) с оральной поверхности и верхних моляров (16, 26) с вестибулярной поверхности. Мягкий пигментированный налет курильщика/чая. Десневые сосочки умеренно гиперемированы, отечны, кровоточивость при зондировании I-II ст. Индекс гигиены OHI-S = 1.8.";
	const diagnosis = "Z01.2 Стоматологическое обследование / K05.0 Острый гингивит (зубные отложения)";
	const treatment =
		"Проведена профессиональная гигиена полости рта в полном объеме: ультразвуковой скейлинг над- и поддесневых минерализованных зубных отложений аппаратом с ирригацией 0.05% хлоргексидином. Воздушно-абразивная обработка Air-Flow мелкодисперсным порошком на основе глицина (удаление пигментированного биопленочного налета). Полировка всех поверхностей зубов абразивной пастой и щеточками. Глубокое фторирование эмали и дентина лаком Bifluorid 12. Обучение индивидуальной гигиене, подбор зубной щетки и монопучка.";

	return {
		statusLocalis,
		diagnosis,
		treatment,
		serviceCode: "A16.07.051",
		serviceName:
			"Профессиональная гигиена полости рта: УЗ-скейлинг + Air-Flow глицин + полировка пастой + фторирование Bifluorid 12",
		price: 5500,
	};
}

/**
 * Протокол лечения пульпита K04.0 под ключ
 */
export function applyFastPulpitisProtocol(toothNumber: number): {
	statusLocalis: string;
	diagnosis: string;
	treatment: string;
	serviceCode: string;
	serviceName: string;
	price: number;
} {
	const toothName = getToothFolkAndAnatomicalNameRu(toothNumber);
	const statusLocalis = `Зуб ${toothNumber} (${toothName}): глубокая кариозная полость, сообщающаяся с полостью зуба. Зондирование устья корневых каналов резко болезненно, пульпа кровоточит. Термическая проба (холод) вызывает интенсивную приступообразную боль с длительным последействием. Перкуссия слабочувствительна. Слизистая оболочка в области верхушки корня без видимых воспалительных изменений.`;
	const diagnosis = `K04.0 Пульпит (острый очаговый/диффузный) зуба ${toothNumber}`;
	const treatment = `Инфильтрационная/проводниковая анестезия Артикаин 1:100000 1.7 мл. Изоляция коффердамом. Препарирование кариозной полости зуба ${toothNumber}, раскрытие полости зуба, экстирпация пульпы. Инструментальная обработка каналов Ni-Ti вращающимися файлами до апикального уступа. Ирригация 3% раствором NaOCl с ультразвуковой активацией, промывание 17% ЭДТА, дистиллированной водой. Высушивание стерильными бумажными штифтами. Обтурация корневых каналов методом латеральной конденсации гуттаперчевыми штифтами с эпоксидным силером AH-Plus. Рентген-контроль обтурации: каналы запломбированы до физиологического апекса. Герметичная изолирующая прокладка, восстановление анатомической формы зуба нанокомпозитом светового отверждения. Шлифовка, полировка.`;

	return {
		statusLocalis,
		diagnosis,
		treatment,
		serviceCode: "A16.07.030",
		serviceName: `Эндодонтическое лечение пульпита зуба ${toothNumber} под ключ (анестезия + обработка каналов + обтурация + пломба)`,
		price: 12500,
	};
}

/**
 * Протокол атравматичного удаления зуба K08.1 под ключ
 */
export function applyFastExtractionProtocol(toothNumber: number): {
	statusLocalis: string;
	diagnosis: string;
	treatment: string;
	serviceCode: string;
	serviceName: string;
	price: number;
} {
	const toothName = getToothFolkAndAnatomicalNameRu(toothNumber);
	const statusLocalis = `Зуб ${toothNumber} (${toothName}): коронковая часть зуба разрушена твердыми тканями ниже уровня десны более чем на 2/3. Корень устойчив, зондирование разрушенных тканей безболезненно. Перкуссия безболезненна. Переходная складка интактна, без отека и гиперемии. Зуб не подлежит терапевтическому, эндодонтическому или ортопедическому восстановлению.`;
	const diagnosis = `K08.1 Потеря зубов вследствие удаления / разрушение корня зуба ${toothNumber}`;
	const treatment = `Проводниковая/инфильтрационная анестезия Артикаин 1:100000 1.7 мл. Круговая связка зуба ${toothNumber} отсепарирована периотомом. Наложение хирургических щипцов/элеватора. Люксация и тракция зуба атравматично с сохранением кортикальных пластинок альвеолы. Ревизия лунки, кюретаж грануляций. Гемостаз гемостатической губкой Alveostim. Сближение краев лунки, наложение направляющего гемостатического шва шовным материалом Vicryl 4-0. Контроль гемостаза: кровотечение остановлено, стабильный сгусток. Рекомендации после удаления выданы на руки.`;

	return {
		statusLocalis,
		diagnosis,
		treatment,
		serviceCode: "A16.07.001",
		serviceName: `Атравматичное удаление зуба ${toothNumber} под ключ (анестезия + периотомия + удаление + кюретаж + гемостаз + шов)`,
		price: 4500,
	};
}
