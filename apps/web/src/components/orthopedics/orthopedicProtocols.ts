/**
 * DENTE CRM — Orthopedic Protocols & Dental Lab Chairside Engine (Mandate 8e, 8i, 8k, 8n)
 *
 * 4 канонических стандарта ортопедического протокола Формы 043/у:
 * 1. Препарирование под коронку ZrO2 / E.max (уступ 0.5–1.0 мм, ретракция 00/0, А-силикон/3Shape TRIOS, Protemp на Temp-Bond NE)
 * 2. Примерка каркаса / коронки (краевое прилегание зондом, контактный пункт флоссом, копирка Bausch 40 мкм, VITA)
 * 3. Постоянная фиксация (пескоструй CoJet/Al2O3, Monobond Plus, RelyX U200 / Panavia V5, рентген-контроль RVG)
 * 4. Съёмное протезирование (слепки, восковые валики ЦСЧ, постановка гарнитура, сдача протеза Acry-Free / нейлон)
 *
 * Invariants:
 * - Внесение в дневник Формы 043/у в 1 клик через CustomEvent "dente-apply-soap-protocol" (immediate: true)
 * - Синхронизация с зубной формулой (Crown) через "dente-odontogram-update"
 * - Добавление услуг в Этап 3 плана лечения ("stage_3_orthopedics") через "dente-estimate-stage-add"
 * - Клинический оверрайд врача (Doctor Clinical Override) при авансе < 50% без согласований начмеда
 * - Ноль эмодзи в медицинских записях и нарядах ЗТЛ
 */

import { showToast } from "../GlobalToast.js";
import { useVisitStore } from "../../store/visitStore.js";

export type OrthopedicProtocolCategory =
	| "prep_crown"
	| "try_in"
	| "permanent_cementation"
	| "removable_prosthetics";

export interface Order804nServiceItem {
	readonly code: string;
	readonly nameRu: string;
	readonly stageKind: "stage_3_orthopedics";
	readonly suggestedPriceRub?: number;
	readonly priceRub?: number;
	readonly toothNumber?: number;
}

export const VITA_BLEACH_SHADES = ["BL1", "BL2", "BL3", "BL4"] as const;
export type VitaBleachShade = (typeof VITA_BLEACH_SHADES)[number];

export const VITA_CLASSICAL_SHADES = [
	"A1", "A2", "A3", "A3.5", "A4",
	"B1", "B2", "B3", "B4",
	"C1", "C2", "C3", "C4",
	"D2", "D3", "D4",
] as const;
export type VitaClassicalShade = (typeof VITA_CLASSICAL_SHADES)[number];

export const VITA_SHADE_GROUPS = [
	{
		group: "Bleach",
		labelRu: "Bleach (Экстра-белые)",
		shades: ["BL1", "BL2", "BL3", "BL4"] as const,
	},
	{
		group: "A",
		labelRu: "Группа A (Красновато-коричневые)",
		shades: ["A1", "A2", "A3", "A3.5", "A4"] as const,
	},
	{
		group: "B",
		labelRu: "Группа B (Красновато-желтые)",
		shades: ["B1", "B2", "B3", "B4"] as const,
	},
	{
		group: "C",
		labelRu: "Группа C (Серые)",
		shades: ["C1", "C2", "C3", "C4"] as const,
	},
	{
		group: "D",
		labelRu: "Группа D (Красновато-серые)",
		shades: ["D2", "D3", "D4"] as const,
	},
] as const;

export const ALL_VITA_AND_BLEACH_SHADES = [
	...VITA_BLEACH_SHADES,
	...VITA_CLASSICAL_SHADES,
] as const;
export type AllVitaAndBleachShade = (typeof ALL_VITA_AND_BLEACH_SHADES)[number];

export interface OrthopedicProtocolPreset {
	readonly id: string;
	readonly titleRu: string;
	readonly shortLabel: string;
	readonly category: OrthopedicProtocolCategory;
	readonly defaultIcd10: string;
	readonly defaultIcd10Label: string;
	readonly anamnesis: string;
	readonly objective: string;
	readonly treatment: string;
	readonly recommendations: string;
	readonly order804nServices: readonly Order804nServiceItem[];
}

export const ORTHOPEDIC_CANONICAL_PROTOCOLS: readonly OrthopedicProtocolPreset[] = [
	{
		id: "ortho_prep_zirconia_emax",
		titleRu:
			"Препарирование зуба под коронку ZrO2 / E.max (уступ 0.5–1.0 мм, ретракция нитью 00/0, А-силикон/3Shape TRIOS, Protemp на Temp-Bond NE)",
		shortLabel: "Препарирование ZrO2 / E.max",
		category: "prep_crown",
		defaultIcd10: "K08.1",
		defaultIcd10Label:
			"Потеря зубов вследствие несчастного случая, удаления или локализованного пародонтита",
		anamnesis:
			"Плановое посещение по утвержденному плану ортопедического лечения (Этап 3: Ортопедия). Жалобы на косметический и функциональный дефект твердых тканей коронковой части зуба (ИРОПЗ > 0.6 / после эндодонтического лечения), затруднение пережевывания пищи. Соматически здоров. Аллергологический анамнез не отягощен.",
		objective:
			"Маргинальная десна в области зуба бледно-розовая, без воспалительных явлений. Зондирование десневой борозды до 1.5 мм, без кровоточивости. На прицельной радиовизиографии (РВГ) периапикальные ткани спокойны, корневой канал запломбирован герметично на всем протяжении до физиологического апекса, культевая вкладка / билдап стабильны.",
		treatment:
			"Инфильтрационная/проводниковая анестезия (Артикаин 4% с эпинефрином 1:100 000 — 1.7 мл). Препарирование твердых тканей зуба под цельнокерамическую коронку (ZrO2 / IPS e.max) алмазными борами с закругленным торцом на высоких оборотах с обильным водно-воздушным охлаждением. Формирование кругового уступа типа полужелоб (chamfer) шириной 0.5–1.0 мм с субгингивальным погружением на 0.2–0.3 мм. Механическая ретракция десны техникой двух нитей (нить Ultrapack 00 + 0 с гелем гемостатика ViscoStat Clear 25% AlCl3). Высушивание. Снятие высокоточного двухслойного оттиска прецизионным А-силиконом (Express XT / Honigum) / интраоральное цифровое 3D-сканирование сканером 3Shape TRIOS. Снятие оттиска с зубного ряда-антагониста. Регистрация прикуса окклюзионным силиконом (Futar D / O-Bite). Определение цвета будущей конструкции по шкале VITA Toothguide 3D-Master / Classical. Изготовление временной коронки прямым методом из бис-акрилового композита Protemp 4 по предварительному силиконовому ключу. Финишная полировка временной коронки, фиксация на культю зуба на временный безевгенольный цемент (Temp-Bond NE). Тщательное удаление излишков цемента, флосс-контроль контактных пунктов. Заказ-наряд направлен в зуботехническую лабораторию.",
		recommendations:
			"Щадящий режим жевания на временную коронку, исключить вязкую и твердую пищу (ириски, орехи). Гигиенический уход мягкой щеткой, использование суперфлосса. При сколе или расцементировке временной конструкции немедленно обратиться в клинику. Дата примерки конструкции назначена.",
		order804nServices: [
			{
				code: "A16.07.004",
				nameRu: "Восстановление зуба коронкой (препарирование зуба под искусственную коронку)",
				stageKind: "stage_3_orthopedics",
				suggestedPriceRub: 4000,
				priceRub: 4000,
			},
			{
				code: "A16.07.031.001",
				nameRu: "Снятие двухслойного оттиска / Интраоральное цифровое сканирование (3Shape TRIOS)",
				stageKind: "stage_3_orthopedics",
				suggestedPriceRub: 3500,
				priceRub: 3500,
			},
			{
				code: "A02.07.010",
				nameRu: "Определение и фиксация центрального соотношения челюстей (окклюзионный силикон)",
				stageKind: "stage_3_orthopedics",
				suggestedPriceRub: 2000,
				priceRub: 2000,
			},
			{
				code: "A16.07.004.001",
				nameRu: "Изготовление и фиксация временной провизорной коронки прямым методом (Protemp 4)",
				stageKind: "stage_3_orthopedics",
				suggestedPriceRub: 2500,
				priceRub: 2500,
			},
		],
	},
	{
		id: "ortho_try_in_framework_crown",
		titleRu:
			"Примерка каркаса / коронки из диоксида циркония / E.max (контроль краевого прилегания, контактных пунктов, окклюзии и цвета VITA)",
		shortLabel: "Примерка каркаса / коронки",
		category: "try_in",
		defaultIcd10: "Z51.8",
		defaultIcd10Label: "Ортопедическое лечение",
		anamnesis:
			"Плановое посещение на этап клинической примерки ортопедической конструкции из ЗТЛ. Жалоб на боли и самопроизвольный дискомфорт нет. Временная коронка удерживалась стабильно, фиксация не нарушена.",
		objective:
			"Временная коронка снята без повреждения культи зуба. Десневой край спокойный, бледно-розовый, признаки воспаления и мацерации десны отсутствуют. Культя зуба очищена от остатков временного цемента пастой без масел и фтора (CleanPolish / Klint).",
		treatment:
			"Деликатное снятие временной коронки. Механическая очистка культи зуба ротационной щеточкой с безмасляной пастой, медикаментозная обработка 0.05% раствором хлоргексидина биглюконата. Клиническая примерка цельнокерамической коронки (ZrO2 Katana ML / IPS e.max): проверка точности посадки и краевого прилегания к круговому уступу культи острым зондом — уступ перекрыт идеально, зазоров и ступенек не определяется. Проверка апроксимальных контактных пунктов с соседними зубами при помощи зубной нити (флосса) — контакт плотный, физиологический, нить проходит с легким щелчком. Окклюзионный контроль в положении центральной, передней и боковых окклюзий при помощи артикуляционной бумаги Bausch 40 мкм и артикуляционного шелка 8 мкм — преждевременных окклюзионных контактов и суперконтактов нет, множественные равномерные точечные контакты. Форма, анатомический микрорельеф и цвет конструкции по шкале VITA оценены совместно с пациентом при естественном освещении и одобрены. Конструкция передана в ЗТЛ на глазурование и финишную полировку / подготовлена к постоянной фиксации. Повторная фиксация временной коронки на Temp-Bond NE.",
		recommendations:
			"Продолжать обычную гигиену полости рта. Назначен визит на постоянную фиксацию конструкции.",
		order804nServices: [
			{
				code: "A16.07.025",
				nameRu: "Примерка ортопедической конструкции (коронки, каркаса, мостовидного протеза)",
				stageKind: "stage_3_orthopedics",
				suggestedPriceRub: 1500,
				priceRub: 1500,
			},
		],
	},
	{
		id: "ortho_permanent_cementation",
		titleRu:
			"Постоянная фиксация конструкции (ZrO2 / E.max) на композитный цемент (пескоструйная обработка CoJet/Al2O3, праймер Monobond Plus, цемент RelyX U200 / Panavia V5, рентген-контроль)",
		shortLabel: "Постоянная фиксация",
		category: "permanent_cementation",
		defaultIcd10: "Z51.8",
		defaultIcd10Label: "Ортопедическое лечение",
		anamnesis:
			"Плановое посещение на этап постоянной фиксации готовой ортопедической конструкции из ЗТЛ. Жалоб нет. Конструкция глазурована и готова к постоянной фиксации.",
		objective:
			"Десневой контур сформирован провизорной конструкцией идеально, краевой пародонт интактен, кровоточивости при зондировании нет. Культя зуба чистая, плотная.",
		treatment:
			"Снятие временной коронки. Очистка культи зуба ультразвуком и полировочной пастой без фтора, промывание дистиллированной водой, антисептическая обработка 2% хлоргексидином. Изоляция рабочего поля (коффердам / ретракционная нить 00 / ватные валики и слюноотсос). Подготовка внутренней поверхности конструкции: воздушно-абразивная пескоструйная обработка частицами оксида алюминия 50 мкм (Al2O3 / CoJet Prep) под давлением 2.0 бар, очистка Ivoclean 20 сек, промывание, высушивание. Нанесение универсального праймера (Monobond Plus / Clearfil Ceramic Primer Plus), экспозиция 60 сек, высушивание струей теплого воздуха без примесей масла. Нанесение самоадгезивного композитного цемента двойного отверждения (3M RelyX U200 / Panavia V5) на внутреннюю поверхность коронки. Внесение конструкции на культю зуба, позиционирование с равномерным осевым усилием. Предварительная светополимеризация вспышкой 2 сек («tack-cure») для перевода излишков цемента в гелеобразное состояние. Полное прецизионное удаление излишков цемента кюретой и скалером по всему периметру десневой борозды, прочистка межзубных промежутков зубной нитью с узелком. Окончательная полимеризация светом по 20 сек с каждой поверхности под защитным слоем глицеринового геля Oxyguard / Liquid Strip. Контроль окклюзии в статике и динамике (Bausch 40 мкм). Финишная полировка переходов и полировка шва алмазной пастой. Контрольный внутриротовой прицельный радиовизиографический снимок (РВГ): коронка адаптирована точно по уступу, поддесневых наплывов и излишков фиксирующего цемента нет.",
		recommendations:
			"Не принимать пищу в течение 2 часов. Исключить чрезмерные точечные механические нагрузки (грызть кости, сухари) в первые сутки. Стандартная индивидуальная гигиена: чистка зубов 2 раза в день, ежедневное использование флосса или ирригатора. Контрольный осмотр через 6 месяцев.",
		order804nServices: [
			{
				code: "A16.07.004.002",
				nameRu: "Постоянная фиксация несъемной ортопедической конструкции (коронки, мостовидного протеза, винира)",
				stageKind: "stage_3_orthopedics",
				suggestedPriceRub: 3000,
				priceRub: 3000,
			},
			{
				code: "A06.07.007",
				nameRu: "Внутриротовой прицельный радиовизиографический снимок (контроль краевого прилегания и отсутствия поддесневого цемента)",
				stageKind: "stage_3_orthopedics",
				suggestedPriceRub: 750,
				priceRub: 750,
			},
		],
	},
	{
		id: "ortho_removable_prosthetics",
		titleRu:
			"Съёмное протезирование (частичный/полный протез Acry-Free/нейлон, анатомические/функциональные слепки, прикусные валики, постановка зубов, сдача протеза)",
		shortLabel: "Съемное протезирование",
		category: "removable_prosthetics",
		defaultIcd10: "K08.4",
		defaultIcd10Label: "Частичная потеря зубов",
		anamnesis:
			"Жалобы на частичную или полную утрату зубов, выраженное нарушение жевательной функции, эстетический дефект улыбки, западание губ и щек. Соматически: возрастная норма / сопутствующие заболевания в стадии компенсации. Аллергии нет.",
		objective:
			"Конфигурация лица изменена соответственно степени адентии, снижена высота нижней трети лица. Слизистая оболочка протезного ложа по Суппле (1–2 класс), умеренно податлива, бледно-розовая, без очагов воспаления и язв. Альвеолярные отростки умеренно атрофированы. Опорные зубы (при ЧСПП) устойчивы, без патологической подвижности.",
		treatment:
			"Снятие анатомических оттисков стандартными ложками альгинатной массой (Hydrogum 5 / Kromopan) для изготовления индивидуальных ложек. Снятие прецизионного функционального оттиска индивидуальной ложкой (окантовка краев термопластической массой Kerr, функциональные пробы по Гербсту) полиэфирной массой Impregum / А-силиконом Monopren. Определение и фиксация центрального соотношения челюстей восковыми базисами с окклюзионными валиками: формирование протетической плоскости, определение высоты нижней трети лица в состоянии покоя, фиксация центрального соотношения челюстей в артикуляторе. Клиническая проверка восковой конструкции съемного протеза с искусственными гарнитурными зубами (Ivoclar Vivodent): оценка правильности постановки зубов, цвета, формы, окклюзионных взаимоотношений и фонетических проб с пациентом. Наложение и сдача готового съемного протеза (Acry-Free / термопласт без мономера / акриловый базис): проверка посадки, ретенции и стабильности протеза, отсутствие балансирования. Окклюзионная коррекция копировальной бумагой Bausch 40 мкм. Обучение пациента правилам снятия, наложения и ухода за протезом.",
		recommendations:
			"Ношение протеза в период адаптации (1–2 недели). Первые дни не снимать на ночь для ускорения привыкания. Чтение вслух для нормализации дикции. Мягкая негорячая пища, пережевывание на обе стороны. Ежедневное очищение протеза специальной мягкой щеткой и очищающими таблетками (Корега/Протефикс). При появлении болей или наминов — снять протез, надеть за 2–3 часа до визита и явиться на бесплатную коррекцию.",
		order804nServices: [
			{
				code: "A16.07.035",
				nameRu: "Протезирование частичными съемными пластиночными протезами (Acry-Free / нейлон)",
				stageKind: "stage_3_orthopedics",
				suggestedPriceRub: 45000,
				priceRub: 45000,
			},
			{
				code: "A16.07.023",
				nameRu: "Протезирование зубов полными съемными пластиночными протезами (Acry-Free / нейлон)",
				stageKind: "stage_3_orthopedics",
				suggestedPriceRub: 50000,
				priceRub: 50000,
			},
			{
				code: "A02.07.010",
				nameRu: "Определение центрального соотношения челюстей при помощи восковых базисов с окклюзионными валиками",
				stageKind: "stage_3_orthopedics",
				suggestedPriceRub: 4000,
				priceRub: 4000,
			},
		],
	},
] as const;

export interface FormatOrthopedicProtocolOptions {
	toothFdi?: string | number | undefined;
	teethFdi?: readonly (string | number)[] | undefined;
	jawScope?: "upper" | "lower" | "both" | undefined;
	material?: string | undefined;
	colorVita?: string | undefined;
}

/**
 * Форматирует клиническую запись для дневника с учетом номеров зубов и челюсти
 */
export function formatOrthopedicProtocolStatement(
	protocol: OrthopedicProtocolPreset,
	options?: FormatOrthopedicProtocolOptions,
): {
	anamnesis: string;
	objective: string;
	treatment: string;
	recommendations: string;
	summaryLine: string;
} {
	const teethList =
		options?.teethFdi && options.teethFdi.length > 0
			? options.teethFdi.map(String).join(", ")
			: options?.toothFdi
				? String(options.toothFdi).trim()
				: "";

	const jawLabel =
		options?.jawScope === "upper"
			? "Верхняя челюсть"
			: options?.jawScope === "lower"
				? "Нижняя челюсть"
				: options?.jawScope === "both"
					? "Обе челюсти"
					: "";

	const scopeItems: string[] = [];
	if (teethList) scopeItems.push(`Зуб(ы): ${teethList}`);
	if (jawLabel) scopeItems.push(`Область: ${jawLabel}`);
	if (options?.material) scopeItems.push(`Материал: ${options.material}`);
	if (options?.colorVita) scopeItems.push(`Цвет: ${options.colorVita}`);

	const scopeHeader = scopeItems.length > 0 ? `[${scopeItems.join(" · ")}]\n` : "";

	const objective = `${scopeHeader}${protocol.objective}`;
	const treatment = `${scopeHeader}${protocol.treatment}`;
	const summaryLine = `[Ортопедия: ${protocol.shortLabel}] ${teethList ? `Зуб ${teethList}` : jawLabel || "Полость рта"}`;

	return {
		anamnesis: protocol.anamnesis,
		objective,
		treatment,
		recommendations: protocol.recommendations,
		summaryLine,
	};
}

export interface DoctorClinicalOverrideResult {
	readonly doctorClinicalOverride: true;
	readonly doctorOverrideReason: string;
	readonly doctorName?: string | undefined;
	readonly timestampIso: string;
	readonly mandate8e: true;
	readonly notice: string;
}

/**
 * Создает клинический оверрайд врача (Мандат 8e п. 7, 8n) для беспрепятственного наряда ЗТЛ
 * при авансе < 50% или срочных клинических показаниях.
 */
export function createDoctorClinicalOverride(options?: {
	reason?: string;
	doctorName?: string;
}): DoctorClinicalOverrideResult {
	const reason =
		options?.reason?.trim() ||
		"Клинические показания: обеспечение непрерывности лечебного процесса, срочное изготовление";
	return {
		doctorClinicalOverride: true,
		doctorOverrideReason: reason,
		doctorName: options?.doctorName,
		timestampIso: new Date().toISOString(),
		mandate8e: true,
		notice:
			"Клинический оверрайд врача применён: наряд ЗТЛ отправлен в лабораторию без задержек и согласований начмеда (Мандат 8e).",
	};
}

export interface ApplyOrthopedicProtocolParams {
	protocol: OrthopedicProtocolPreset;
	options?: FormatOrthopedicProtocolOptions;
	onSuccess?: ((summary: string) => void) | undefined;
	onAddToInvoice?: ((services: readonly Order804nServiceItem[]) => void) | undefined;
	copyToClipboard?: boolean;
	showNotification?: boolean;
}

/**
 * 1-клик внесение ортопедического протокола в Форму 043/у, активный счёт/смету визита и Этап 3 плана лечения
 */
export function applyOrthopedicProtocolToVisit(
	params: ApplyOrthopedicProtocolParams,
): {
	summary: string;
	teethNumbers: number[];
	services: readonly Order804nServiceItem[];
} {
	const { protocol, options } = params;
	const formatted = formatOrthopedicProtocolStatement(protocol, options);

	// 1. Выделяем числовые номера зубов
	const rawTeeth: (string | number)[] =
		options?.teethFdi && options.teethFdi.length > 0
			? [...options.teethFdi]
			: options?.toothFdi
				? [options.toothFdi]
				: [];

	const teethNumbers: number[] = rawTeeth
		.map((t) => Number(String(t).replace(/\D/g, "")))
		.filter((n) => Number.isInteger(n) && n >= 11 && n <= 85);

	// 2. Диспетчеризация SOAP-протокола для useVisitDiaryLogic (immediate: true, smart_append)
	if (typeof window !== "undefined") {
		try {
			window.dispatchEvent(
				new CustomEvent("dente-apply-soap-protocol", {
					detail: {
						soap: {
							anamnesis: formatted.anamnesis,
							objective: formatted.objective,
							statusLocalis: formatted.objective,
							treatment: formatted.treatment,
							treatmentDescription: formatted.treatment,
							recommendations: formatted.recommendations,
							icd10: protocol.defaultIcd10,
						},
						mode: "smart_append",
						immediate: true,
					},
				}),
			);
		} catch {
			// ignore in testing environments without window/CustomEvent
		}

		// 3. Синхронизация с зубной формулой при наличии зубов
		if (teethNumbers.length > 0) {
			try {
				window.dispatchEvent(
					new CustomEvent("dente-odontogram-update", {
						detail: {
							states: teethNumbers.map((t) => ({
								toothNumber: t,
								state: "Crown",
							})),
						},
					}),
				);
			} catch {
				// ignore
			}
		}

		// 4. Добавление услуг в Этап 3 плана лечения ("stage_3_orthopedics")
		try {
			window.dispatchEvent(
				new CustomEvent("dente-estimate-stage-add", {
					detail: {
						stageKind: "stage_3_orthopedics",
						toothFdi: teethNumbers.length > 0 ? teethNumbers[0] : undefined,
						teethFdi: teethNumbers,
						protocolId: protocol.id,
						services: protocol.order804nServices,
					},
				}),
			);
		} catch {
			// ignore
		}

		// 5. Начисление услуг в активный счёт/смету визита для немедленной оплаты у кресла (dente-add-services-to-invoice)
		try {
			const primaryTooth = teethNumbers.length > 0 ? teethNumbers[0] : undefined;
			const invoiceServices = protocol.order804nServices.map((s) => ({
				code: s.code,
				nameRu: s.nameRu,
				name: s.nameRu,
				priceRub: s.priceRub ?? s.suggestedPriceRub ?? 0,
				suggestedPriceRub: s.suggestedPriceRub ?? s.priceRub ?? 0,
				toothNumber: primaryTooth,
				stageKind: s.stageKind,
			}));

			window.dispatchEvent(
				new CustomEvent("dente-add-services-to-invoice", {
					detail: {
						toothNumber: primaryTooth,
						teethNumbers,
						services: invoiceServices,
					},
				}),
			);
		} catch {
			// ignore
		}
	}

	// 6. Прямой коллбек добавления в смету, если передан родителем
	if (params.onAddToInvoice) {
		try {
			params.onAddToInvoice(protocol.order804nServices);
		} catch {
			// ignore
		}
	}

	// 7. Обновление формы визита в visitStore
	try {
		useVisitStore.getState().setVisitNoteForm((prev) => {
			const currentObjective = prev.objectiveStatus || "";
			const currentTreatment = prev.treatmentPlan || "";

			const updatedObjective = currentObjective.trim()
				? `${currentObjective.trim()}\n\n${formatted.objective}`
				: formatted.objective;

			const updatedTreatment = currentTreatment.trim()
				? `${currentTreatment.trim()}\n\n${formatted.treatment}`
				: formatted.treatment;

			return {
				...prev,
				objectiveStatus: updatedObjective,
				treatmentPlan: updatedTreatment,
				diagnosis: prev.diagnosis || protocol.defaultIcd10Label,
			};
		});
	} catch {
		// outside React context / mock store
	}

	// 8. Копирование в буфер обмена
	if (
		params.copyToClipboard !== false &&
		typeof navigator !== "undefined" &&
		navigator.clipboard?.writeText
	) {
		const fullText = `ЖАЛОБЫ И АНАМНЕЗ:\n${formatted.anamnesis}\n\nОБЪЕКТИВНЫЙ СТАТУС:\n${formatted.objective}\n\nПРОВЕДЕННОЕ ЛЕЧЕНИЕ:\n${formatted.treatment}\n\nРЕКОМЕНДАЦИИ:\n${formatted.recommendations}`;
		navigator.clipboard.writeText(fullText).catch(() => {});
	}

	// 9. Оповещение врача
	if (params.showNotification !== false) {
		showToast(
			`Протокол «${protocol.shortLabel}» внесен в дневник 043/у, смету и Этап 3 (Ортопедия)`,
			"success",
			3500,
		);
	}

	if (params.onSuccess) {
		try {
			params.onSuccess(formatted.summaryLine);
		} catch {
			// ignore
		}
	}

	return {
		summary: formatted.summaryLine,
		teethNumbers,
		services: protocol.order804nServices,
	};
}
