/**
 * Клинические сниппеты и быстрые блоки для конструктора протоколов Формы 043/у.
 * Позволяют врачу за 1 клик вставить нормативные формулировки (анестезия, коффердам,
 * адгезив, реставрация, удаление, имплантация, костная пластика, гигиена) без ручного набора текста.
 * Автоматически подтягивают персональные настройки врача (композит, адгезив, анестетик, изоляция).
 */

import type { ProtocolTemplate } from "@dental/shared";
import {
	ADHESIVE_OPTIONS,
	ANESTHETIC_OPTIONS,
	COMPOSITE_OPTIONS,
	DENTAL_NEEDLE_OPTIONS,
	ETCHANT_OPTIONS,
	ISOLATION_OPTIONS,
	type DoctorPreferences,
} from "../../store/doctorPreferencesStore";

export interface ProtocolSnippet {
	readonly id: string;
	readonly label: string;
	readonly category:
		| "anesthesia"
		| "isolation"
		| "therapy"
		| "surgery"
		| "bone_graft"
		| "hygiene"
		| "complaints";
	readonly targetField:
		| "complaintPrompt"
		| "objectiveTemplate"
		| "treatmentPlanTemplate";
	readonly text: string;
}

export interface Icd10Preset {
	readonly code: string;
	readonly title: string;
	readonly specialty:
		| "therapist"
		| "surgeon"
		| "orthopedist"
		| "hygienist"
		| "universal";
}

export const ICD10_CLINICAL_PRESETS: readonly Icd10Preset[] = [
	{ code: "К02.1", title: "Кариес дентина (средний / глубокий)", specialty: "therapist" },
	{ code: "К02.0", title: "Кариес эмали (стадия пятна)", specialty: "therapist" },
	{ code: "К04.0", title: "Острый пульпит", specialty: "therapist" },
	{ code: "К04.4", title: "Острый апикальный периодонтит", specialty: "therapist" },
	{ code: "К04.5", title: "Хронический апикальный периодонтит", specialty: "therapist" },
	{ code: "К05.0", title: "Острый гингивит", specialty: "hygienist" },
	{ code: "К05.3", title: "Хронический пародонтит", specialty: "therapist" },
	{ code: "К08.1", title: "Потеря зубов вследствие удаления (адентия)", specialty: "surgeon" },
	{ code: "К07.2", title: "Аномалии соотношений зубных дуг", specialty: "orthopedist" },
	{ code: "Z01.2", title: "Стоматологическое обследование (профосмотр)", specialty: "universal" },
];

/** Получение читаемого названия материала по ключу */
export function resolveCompositeName(key?: string): string {
	const found = COMPOSITE_OPTIONS.find((c) => c.id === key || c.key === key);
	return found?.title || found?.name || "композит светового отверждения (Estelite Asteria)";
}

export function resolveAdhesiveName(key?: string): string {
	const found = ADHESIVE_OPTIONS.find((a) => a.id === key || a.key === key);
	return found?.title || found?.name || "OptiBond FL (Kerr)";
}

export function resolveAnestheticName(key?: string): string {
	const found = ANESTHETIC_OPTIONS.find((a) => a.id === key || a.key === key);
	return found?.title || found?.name || "Sol. Articaini 4% cum Epinephrino 1:100 000 — 1.7 мл";
}

export function resolveNeedleName(key?: string): string {
	const found = DENTAL_NEEDLE_OPTIONS.find((n) => n.id === key || n.key === key);
	return found?.title || found?.name || "Septoject 30G короткие";
}

export function resolveIsolationName(key?: string): string {
	const found = ISOLATION_OPTIONS.find((i) => i.id === key || i.key === key);
	return found?.title || found?.name || "коффердам (Sanctuary)";
}

export function resolveEtchantName(key?: string): string {
	const found = ETCHANT_OPTIONS.find((e) => e.id === key || e.key === key);
	return found?.title || found?.name || "Ultra-Etch 35% (Ultradent)";
}

/** Генерация персонализированного протокола реставрации кариеса с подтягиванием любимых материалов врача */
export function buildDoctorPersonalizedTherapySnippet(
	prefs?: Partial<DoctorPreferences>,
): string {
	const composite = resolveCompositeName(prefs?.defaultComposite);
	const adhesive = resolveAdhesiveName(prefs?.defaultAdhesive);
	const anesthetic = resolveAnestheticName(prefs?.favoriteAnesthetic);
	const isolation = resolveIsolationName(prefs?.defaultIsolation);
	const etchant = resolveEtchantName(prefs?.defaultEtchant);

	return [
		`Анестезия: ${anesthetic}. Аспирационная проба отрицательная.`,
		`Изоляция операционного поля: ${isolation}, антисептическая обработка полости 0.05% хлоргексидином.`,
		`Препарирование кариозной полости алмазными борами с водяным охлаждением, некрэктомия до плотного дентина.`,
		`Протравливание: ${etchant} (эмаль 15 сек, дентин 10 сек), промывание водой, бережное подсушивание.`,
		`Адгезивный протокол: ${adhesive}, экспозиция, раздувание воздухом, полимеризация 20 сек.`,
		`Послойная анатомическая реставрация нанокомпозитом: ${composite}.`,
		`Шлифовка, полировка дисками и головками, окклюзионный контроль артикуляционной бумагой Bausch 40 мкм.`,
	].join(" ");
}

export const PROTOCOL_CLINICAL_SNIPPETS: readonly ProtocolSnippet[] = [
	// Анестезия
	{
		id: "anes_articaine",
		label: "Артикаин 1:100k (Форте 1.7 мл)",
		category: "anesthesia",
		targetField: "treatmentPlanTemplate",
		text: "Инфильтрационная/проводниковая анестезия: Sol. Articaini 4% cum Epinephrino 1:100 000 — 1.7 мл (1 карпула). Аспирационная проба отрицательная. Обезболивание глубокое, аллергических реакций нет.",
	},
	{
		id: "anes_articaine_200",
		label: "Артикаин 1:200k (Щадящий 1.7 мл)",
		category: "anesthesia",
		targetField: "treatmentPlanTemplate",
		text: "Инфильтрационная анестезия: Sol. Articaini 4% cum Epinephrino 1:200 000 — 1.7 мл (1 карпула). Аспирационная проба отрицательная. Щадящий кардиоваскулярный режим.",
	},
	{
		id: "anes_scandonest",
		label: "Скандонест 3% (Без адреналина)",
		category: "anesthesia",
		targetField: "treatmentPlanTemplate",
		text: "Анестезия инфильтрационная/проводниковая (Мепивакаин / Scandonest 3% без вазоконстриктора, 1.7 мл). Щадящий кардиоваскулярный режим. Обезболивание адекватное.",
	},
	{
		id: "anes_septanest",
		label: "Септанест 1:100k (1.7 мл)",
		category: "anesthesia",
		targetField: "treatmentPlanTemplate",
		text: "Анестезия инфильтрационная/проводниковая: Септанест 1:100 000 — 1.7 мл (Septodont). Аспирационная проба отрицательная. Глубокая анестезия, аллергических реакций нет.",
	},
	{
		id: "anes_mepivastesin",
		label: "Мепивастезин 3% (3M без адреналина)",
		category: "anesthesia",
		targetField: "treatmentPlanTemplate",
		text: "Анестезия: Мепивастезин 3% (3M) 1.7 мл без вазоконстриктора. Щадящий кардиологический протокол.",
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
	{
		id: "iso_liquiddam",
		label: "Жидкий коффердам (гингивальный барьер)",
		category: "isolation",
		targetField: "treatmentPlanTemplate",
		text: "Изоляция краевой десны светоотверждаемым жидким коффердамом (Liquid Dam) с полимеризацией 20 сек.",
	},
	{
		id: "iso_nic_tone",
		label: "Коффердам Nic Tone (эластичный)",
		category: "isolation",
		targetField: "treatmentPlanTemplate",
		text: "Изоляция системой раббердам с высококонтрастным платком повышенной эластичности Nic Tone.",
	},

	// Терапия
	{
		id: "prep_caries_composite",
		label: "Кариес: препарирование + Estelite",
		category: "therapy",
		targetField: "treatmentPlanTemplate",
		text: "Препарирование кариозной полости алмазными борами с водяным охлаждением, некрэктомия до плотного дентина. Адгезивный протокол (OptiBond FL), послойная реставрация нанокомпозитом Estelite Asteria. Шлифовка, полировка дисками Sof-Lex, окклюзионный контроль Bausch 40 мкм.",
	},
	{
		id: "prep_caries_filtek",
		label: "Кариес: препарирование + Filtek Ultimate",
		category: "therapy",
		targetField: "treatmentPlanTemplate",
		text: "Препарирование кариозной полости с водяным охлаждением, медикаментозная обработка. Адгезивный протокол Single Bond Universal, послойная реставрация Filtek Ultimate (3M ESPE), финишная полировка.",
	},
	{
		id: "prep_pulpitis_complete",
		label: "Пульпит: экстирпация + гуттаперча",
		category: "therapy",
		targetField: "treatmentPlanTemplate",
		text: "Раскрытие полости зуба, ампутация и экстирпация пульпы под анестезией. Инструментальная обработка корневых каналов машинными файлами ProTaper Gold до рабочей длины (апекслокатор). Ирригация 3% NaOCl с УЗ-активацией, высушивание бумажными пинами. Обтурация каналов гуттаперчей и силером AH-Plus методом латеральной конденсации. Рентген-контроль.",
	},
	{
		id: "prep_endo_first_visit",
		label: "Эндодонтия: мехобработка + Каласепт",
		category: "therapy",
		targetField: "treatmentPlanTemplate",
		text: "Раскрытие полости зуба, ампутация и экстирпация пульпы. Инструментальная обработка корневых каналов машинными файлами с обильной ирригацией 3% NaOCl. Временное пломбирование гидроксидом кальция (Calasept), герметичная временная пломба.",
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
		id: "surg_extraction_complex",
		label: "Удаление сложное атипичное + швы",
		category: "surgery",
		targetField: "treatmentPlanTemplate",
		text: "Атипичное удаление ретенированного/дистопированного зуба: выкраивание слизисто-надкостничного лоскута, фрагментация зуба бормашиной с охлаждением физраствором. Удаление фрагментов элеватором. Кюретаж лунки, антисептическая обработка, гемостатическая губка Альвожель, ушивание швами Prolene 4-0.",
	},
	{
		id: "surg_implant_placement",
		label: "Имплантация: ложе + установка",
		category: "surgery",
		targetField: "treatmentPlanTemplate",
		text: "Разрез по гребню альвеолярного отростка, отслаивание слизисто-надкостничного лоскута. Формирование костного ложа пилотным и формирующими сверлами с физиодиспенсером (охлаждение физраствором 4°C). Установка дентального имплантата с торком 35 Н·см. Установка заглушки/формирователя, ушивание швами Prolene 4-0.",
	},

	// Костная пластика
	{
		id: "surg_bone_graft_sinus",
		label: "Костная пластика: Синус-лифтинг + Bio-Oss",
		category: "bone_graft",
		targetField: "treatmentPlanTemplate",
		text: "Синус-лифтинг: формирование костного латерального окна/трансальвеолярный доступ. Аккуратная элевация мембраны Шнайдера без перфораций. Субантральное внесение костнопластического материала Bio-Oss (Geistlich), перекрытие резорбируемой коллагеновой мембраной Bio-Gide, фиксация титановыми пинами. Ушивание раны наглухо без натяжения лоскута швами PTFE 4-0.",
	},
	{
		id: "surg_bone_graft_gbr",
		label: "Костная пластика: НКР гребня + мембрана",
		category: "bone_graft",
		targetField: "treatmentPlanTemplate",
		text: "Направленная костная регенерация (НКР): мобилизация слизисто-надкостничного лоскута, кортикальная перфорация принимающего костного ложа. Аугментация костным матриксом в соотношении 1:1 (аутогенная костная стружка + ксеногранулят Bio-Oss), адаптация резорбируемой барьерной мембраны с фиксацией пинами. Периостальные послабляющие разрезы, послойное глухое ушивание.",
	},

	// Пародонтология и гигиена
	{
		id: "hygiene_airflow",
		label: "Ультразвук + AirFlow + полировка",
		category: "hygiene",
		targetField: "treatmentPlanTemplate",
		text: "Ультразвуковое удаление над- и поддесневых зубных отложений скейлером EMS. Воздушно-абразивная обработка аппаратом AirFlow (порошок на основе глицина). Полировка циркулярными щеточками с пастой Cleanic. Аппликация фторлака.",
	},
	{
		id: "perio_closed_curettage",
		label: "Пародонтология: закрытый кюретаж",
		category: "hygiene",
		targetField: "treatmentPlanTemplate",
		text: "Закрытый кюретаж пародонтальных карманов зоноспецифическими кюретами Gracey с удалением поддесневого камня и грануляционной ткани. Ирригация карманов 0.05% раствором хлоргексидина биглюконата, аппликация геля Метрогил Дента.",
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
		id: "comp_bone_defect",
		label: "Жалобы: Атрофия кости / подготовка к имплантации",
		category: "complaints",
		targetField: "complaintPrompt",
		text: "Жалобы на отсутствие зуба, затруднённое пережевывание пищи, убыль объема альвеолярного отростка. Обратился для восстановления целостности зубного ряда и консультации по имплантации.",
	},
	{
		id: "comp_checkup",
		label: "Жалобы: Профосмотр (жалоб нет)",
		category: "complaints",
		targetField: "complaintPrompt",
		text: "Жалобы отсутствуют. Обратился для планового профилактического осмотра и санации полости рта.",
	},
];

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
		diagnosisHints: ["Z01.2"],
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
			"Анестезия: Sol. Articaini 4% 1:200 000 — 1.7 мл. Изоляция коффердам. Препарирование, медикаментозная обработка, адгезивный протокол, послойная реставрация нанокомпозитом, шлифовка, полировка.",
		diagnosisHints: ["К02.1"],
		requiredDocuments: ["informed_consent"],
		suggestedImaging: ["periapical"],
		safetyWarnings: ["Аллергоанамнез на анестетики"],
	},
	{
		specialty: "therapist",
		title: "Эндодонтическое лечение пульпита",
		visitReason: "Лечение острого пульпита",
		defaultDurationMinutes: 60,
		complaintPrompt:
			"Острые самопроизвольные приступообразные боли в зубе, усиливающиеся в ночное время, длительные боли от температурных раздражителей.",
		objectiveTemplate:
			"Глубокая кариозная полость, сообщающаяся с полостью зуба. Зондирование резко болезненно в точке вскрытия. Перкуссия безболезненна.",
		treatmentPlanTemplate:
			"Анестезия: Sol. Articaini 4% 1:100 000 — 1.7 мл. Коффердам. Раскрытие полости, экстирпация пульпы, мехобработка NiTi ротационными файлами с ирригацией 3% NaOCl. Пломбирование каналов гуттаперчей с силером AH-Plus.",
		diagnosisHints: ["К04.0"],
		requiredDocuments: ["informed_consent"],
		suggestedImaging: ["periapical"],
		safetyWarnings: ["Контроль рабочей длины по апекслокатору"],
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
			"Инфильтрационная/проводниковая анестезия (Артикаин 1:100k, 1.7 мл), синдесмотомия, удаление щипцами/элеватором, кюретаж лунки, гемостаз.",
		diagnosisHints: ["К08.1"],
		requiredDocuments: [
			"informed_consent",
			"procedure_specific_consent_packet",
		],
		suggestedImaging: ["periapical", "cbct"],
		safetyWarnings: ["Контроль АД", "Аллергоанамнез"],
	},
	{
		specialty: "surgeon",
		title: "Дентальная имплантация и костная пластика",
		visitReason: "Дентальная имплантация и аугментация кости",
		defaultDurationMinutes: 90,
		complaintPrompt: "Отсутствие зуба, убыль костной ткани альвеолярного гребня",
		objectiveTemplate:
			"Дефект зубного ряда, атрофия альвеолярного отростка по ширине/высоте. Слизистая оболочка интактна.",
		treatmentPlanTemplate:
			"Анестезия: Артикаин 1:100 000 — 1.7 мл. Разрез, отслаивание лоскута. Формирование ложа, установка имплантата с торком 35 Н·см. Костная пластика (Bio-Oss + мембрана Bio-Gide, фиксация пинами). Глухое ушивание швами PTFE 4-0.",
		diagnosisHints: ["К08.1"],
		requiredDocuments: [
			"informed_consent",
			"procedure_specific_consent_packet",
		],
		suggestedImaging: ["cbct"],
		safetyWarnings: ["Оценка плотности кости по КЛКТ", "Аллергоанамнез"],
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
		diagnosisHints: ["К05.0"],
		requiredDocuments: ["informed_consent"],
		suggestedImaging: [],
		safetyWarnings: [],
	},
];
