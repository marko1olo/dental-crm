/**
 * Клинические сниппеты и быстрые блоки для конструктора протоколов Формы 043/у.
 * Позволяют врачу за 1 клик вставить нормативные формулировки (анестезия, коффердам,
 * адгезив, реставрация, удаление, гигиена) без ручного набора текста.
 */

export interface ProtocolSnippet {
	readonly id: string;
	readonly label: string;
	readonly category: "anesthesia" | "isolation" | "therapy" | "surgery" | "hygiene" | "complaints";
	readonly targetField: "complaintPrompt" | "objectiveTemplate" | "treatmentPlanTemplate";
	readonly text: string;
}

export const PROTOCOL_CLINICAL_SNIPPETS: readonly ProtocolSnippet[] = [
	// Анестезия
	{
		id: "anes_articaine",
		label: "Артикаин 1:100k (Норма 1.7 мл)",
		category: "anesthesia",
		targetField: "treatmentPlanTemplate",
		text: "Инфильтрационная/проводниковая анестезия: Артикаин 4% с эпинефрином 1:100 000, 1.7 мл. Аспирационная проба отрицательная. Обезболивание глубокое, аллергических реакций нет.",
	},
	{
		id: "anes_scandonest",
		label: "Скандонест 3% (Без адреналина)",
		category: "anesthesia",
		targetField: "treatmentPlanTemplate",
		text: "Анестезия инфильтрационная/проводниковая (Мепивакаин 3% без вазоконстриктора, 1.7 мл). Щадящий кардиоваскулярный режим. Обезболивание адекватное.",
	},

	// Изоляция
	{
		id: "iso_cofferdam",
		label: "Коффердам (Sanctuary / Tor VM)",
		category: "isolation",
		targetField: "treatmentPlanTemplate",
		text: "Изоляция операционного поля системой коффердам (латексный платок Sanctuary, кламп Tor VM), антисептическая обработка полости 0.05% раствором хлоргексидина биглюконата.",
	},
	{
		id: "iso_optragate",
		label: "ОптраГейт (Ivoclar)",
		category: "isolation",
		targetField: "treatmentPlanTemplate",
		text: "Установка кругового ретрактора OptraGate, изоляция слюноотсосом и ватными валиками.",
	},

	// Терапия
	{
		id: "prep_caries_composite",
		label: "Препарирование + Estelite",
		category: "therapy",
		targetField: "treatmentPlanTemplate",
		text: "Препарирование кариозной полости алмазными борами с водяным охлаждением, некрэктомия до плотного дентина. Адгезивный протокол (OptiBond FL), послойная реставрация нанокомпозитом Estelite Asteria. Шлифовка, полировка дисками Sof-Lex, окклюзионный контроль Bausch 40 мкм.",
	},
	{
		id: "prep_endo_first_visit",
		label: "Эндодонтия: мехобработка + Каласепт",
		category: "therapy",
		targetField: "treatmentPlanTemplate",
		text: "Раскрытие полости зуба, ампутация и экстирпация пульпы. Инструментальная обработка корневых каналов машинными файлами ProTaper Gold с обильной ирригацией 3% раствором гипохлорита натрия и ультразвуковой активацией. Временное пломбирование гидроксидом кальция (Calasept), временная пломба.",
	},

	// Хирургия
	{
		id: "surg_extraction_simple",
		label: "Удаление простое + кюретаж",
		category: "surgery",
		targetField: "treatmentPlanTemplate",
		text: "Синдесмотомия круговой связки зуба. Удаление щипцами и элеватором. Тщательный ревизионный кюретаж лунки, гемостаз, сформирован полноценный кровяной сгусток.",
	},
	{
		id: "surg_implant_placement",
		label: "Имплантация: ложе + установка",
		category: "surgery",
		targetField: "treatmentPlanTemplate",
		text: "Разрез по гребню альвеолярного отростка, отслаивание слизисто-надкостничного лоскута. Формирование костного ложа пилотным и формирующими сверлами с физиодиспенсером (охлаждение физраствором 4°C). Установка дентального имплантата с торком 35 Н·см. Установка заглушки/формирователя, ушивание швами Prolene 4-0.",
	},

	// Гигиена
	{
		id: "hygiene_airflow",
		label: "Ультразвук + AirFlow + полировка",
		category: "hygiene",
		targetField: "treatmentPlanTemplate",
		text: "Ультразвуковое удаление над- и поддесневых зубных отложений скейлером EMS. Воздушно-абразивная обработка аппаратом AirFlow (порошок на основе глицина). Полировка циркулярными щеточками с пастой Cleanic. Аппликация фторлака.",
	},

	// Жалобы
	{
		id: "comp_caries",
		label: "Жалобы: Кариес (чувствительность)",
		category: "complaints",
		targetField: "complaintPrompt",
		text: "Жалобы на наличие кариозной полости, кратковременные боли от температурных и химических раздражителей, быстро проходящие после устранения причины, застревание пищи.",
	},
	{
		id: "comp_pulpitis",
		label: "Жалобы: Пульпит (ночные приступы)",
		category: "complaints",
		targetField: "complaintPrompt",
		text: "Жалобы на приступообразные самопроизвольные боли в зубе, усиливающиеся в ночное время, иррадиирующие по ходу ветвей тройничного нерва, длительные боли от холодного и горячего.",
	},
	{
		id: "comp_checkup",
		label: "Жалобы: Профосмотр (жалоб нет)",
		category: "complaints",
		targetField: "complaintPrompt",
		text: "Жалобы отсутствуют. Обратился для планового профилактического осмотра и санации полости рта.",
	},
];

import type { ProtocolTemplate } from "@dental/shared";

export const STANDARD_PROTOCOLS_SEED: readonly Partial<ProtocolTemplate>[] = [
	{
		specialty: "therapist",
		title: "Первичный осмотр и консультация",
		visitReason: "Консультация и составление плана лечения",
		defaultDurationMinutes: 30,
		complaintPrompt: "Жалобы отсутствуют / профилактический осмотр",
		objectiveTemplate:
			"Слизистая оболочка полости рта бледно-розовая, умеренно увлажнена. Прикус физиологический. Зубные ряды интактны либо с дефектами.",
		treatmentPlanTemplate:
			"1. КЛКТ / ОПТГ\n2. Профгигиена\n3. Санация кариозных полостей",
		requiredDocuments: ["informed_consent"],
		suggestedImaging: ["opg"],
		safetyWarnings: [],
	},
	{
		specialty: "therapist",
		title: "Лечение кариеса (световая пломба)",
		visitReason: "Лечение кариеса",
		defaultDurationMinutes: 60,
		complaintPrompt:
			"Кратковременные боли от температурных и химических раздражителей",
		objectiveTemplate:
			"На жевательной/контактной поверхности кариозная полость в пределах дентина. Зондирование безболезненно. Перкуссия отрицательна.",
		treatmentPlanTemplate:
			"Анестезия, препарирование, медикаментозная обработка, адгезивный протокол, послойная реставрация композитом, шлифовка, полировка.",
		requiredDocuments: ["informed_consent"],
		suggestedImaging: ["periapical"],
		safetyWarnings: ["Аллергоанамнез на анестетики"],
	},
	{
		specialty: "surgeon",
		title: "Удаление зуба простое",
		visitReason:
			"Удаление зуба по ортодонтическим или терапевтическим показаниям",
		defaultDurationMinutes: 45,
		complaintPrompt: "Разрушение коронковой части зуба, подвижность",
		objectiveTemplate:
			"Коронка зуба разрушена более чем на 2/3. Перкуссия слабо чувствительна. Слизистая десны без выраженного воспаления.",
		treatmentPlanTemplate:
			"Инфильтрационная/проводниковая анестезия, синдесмотомия, удаление щипцами/элеватором, кюретаж лунки, гемостаз.",
		requiredDocuments: [
			"informed_consent",
			"procedure_specific_consent_packet",
		],
		suggestedImaging: ["periapical", "cbct"],
		safetyWarnings: ["Контроль АД", "Аллергоанамнез"],
	},
	{
		specialty: "hygienist",
		title: "Комплексная профессиональная гигиена",
		visitReason: "Профгигиена полости рта",
		defaultDurationMinutes: 45,
		complaintPrompt: "Наличие пигментированного налета и зубного камня",
		objectiveTemplate:
			"Обильный над- и поддесневой зубной камень во фронтальном отделе нижней челюсти, пигментированный мягкий налет. Десневые сосочки гиперемированы.",
		treatmentPlanTemplate:
			"Ультразвуковой скейлинг, обработка аппаратом AirFlow, полировка пастами, аппликация реминерализующего геля.",
		requiredDocuments: ["informed_consent"],
		suggestedImaging: [],
		safetyWarnings: [],
	},
];
