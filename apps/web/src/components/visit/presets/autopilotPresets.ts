import type { DiaryState } from "../../useVisitDiaryLogic";
import type {
	DoctorAutopilotPreset,
	ToothClinicalState,
	ClinicalService804n,
	ClinicalMaterialDeduction,
	Apply1ClickAutopilotOptions,
	Apply1ClickAutopilotResult,
} from "../clinicalSoapTypes";

// =========================================================================
// 1-КЛИКОВЫЕ КЛИНИЧЕСКИЕ АВТОПИЛОТЫ ВРАЧА-СТОМАТОЛОГА У КРЕСЛА (МАНДАТЫ 8e, 8n)
// Приказы Минздрава РФ № 804н, № 1051н (ИДС), Форма 043/у и рекомендации СтАР
// =========================================================================

// ── 1. «1-КЛИК КАРИЕС ДЕНТИНА (К02.1)» ──
export const AUTOPILOT_CARIES_K021: DoctorAutopilotPreset = {
	id: "autopilot_caries_k021",
	title: "1-клик Кариес дентина (K02.1) — O/MOD, Артикаин 1:200 000 1.7 мл, изолирующая прокладка, фотополимер, 804н A16.07.002.010, ИДС",
	shortBadge: "Кариес (1-клик)",
	category: "therapy",
	icd10: "K02.1",
	icd10Label: "Кариес дентина",
	toothState: "Caries",
	defaultTooth: 16,
	surfaces: "O/MOD",
	is1ClickAutopilot: true,
	complaint:
		"Жалобы на кратковременные боли от сладкого и холодного (температурных и химических раздражителей), быстро проходящие после устранения фактора, застревание пищи в кариозной полости зуба.",
	anamnesis:
		"Соматически здоров. Аллергологический анамнез не отягощен. Вредных привычек нет. Полость обнаружена пациентом около 2 месяцев назад, зуб ранее не лечен. Оформлено и подписано информированное добровольное согласие (ИДС) на проведение местного обезболивания и терапевтическое лечение зуба в полном объеме.",
	statusLocalis:
		"Слизистая оболочка полости рта бледно-розовая, влажная, без патологических изменений. Регионарные лимфоузлы не увеличены, пальпация безболезненна. На жевательной и контактных поверхностях (поверхности O/MOD) определяется кариозная полость средней глубины в пределах дентина. Зондирование по эмалево-дентинной границе слабо чувствительно, дно и стенки плотные, пигментированные. Перкуссия безболезненна. Холодовая проба кратковременно положительна, быстропроходящая. ЭОД 6–8 мкА.",
	anesthetic: {
		drugKey: "ultracain_ds",
		drugName: "Артикаин 1:200 000 (Sol. Articaini 4% cum epinephrine 1:200 000 — 1.7 мл)",
		carpulesCount: 1.0,
		volumeMl: 1.7,
	},
	treatmentDescription:
		"1. Информированное добровольное согласие (ИДС) подписано пациентом до начала вмешательства.\n" +
		"2. Инфильтрационная/проводниковая анестезия: Sol. Articaini 4% с эпинефрином 1:200 000 — 1.7 мл. Достигнута полная анестезия.\n" +
		"3. Изоляция операционного поля коффердамом (Dental Dam).\n" +
		"4. Препарирование кариозной полости (поверхности O/MOD) твердосплавными и алмазными борами с водяным охлаждением, полная некрэктомия, формирование эмалевого фальца.\n" +
		"5. Медикаментозная антисептическая обработка полости 2% раствором хлоргексидина биглюконата.\n" +
		"6. Наложение изолирующей прокладки: светоотверждаемый стеклоиономерный цемент (СИЦ Vitrebond / Ionoseal) точечно на дно полости, полимеризация 20 сек.\n" +
		"7. Тотальное/селективное травление 37% ортофосфорной кислотой (эмаль 20 сек, дентин 10 сек), смывание водой, деликатное подсушивание воздухом.\n" +
		"8. Нанесение адгезивной системы (OptiBond FL / Single Bond, праймер + бонд), экспозиция 20 сек, раздувание струей воздуха, фотополимеризация 20 сек.\n" +
		"9. Послойное моделирование и реставрация наногибридным фотополимерным композитом (Filtek Ultimate / Estelite Sigma Quick) с послойной полимеризацией по 20 сек. Восстановление анатомической формы жевательной поверхности, фиссур, окклюзионных бугров и плотного контактного пункта с помощью контурной матричной системы (A16.07.002.001).\n" +
		"10. Финишная обработка и полировка: контроль и пришлифовка окклюзии по артикуляционной бумаге Bausch 40 мкм, шлифовка дисками Sof-Lex, полировка головками Enhance и пастой Prisma Gloss до сухого зеркального блеска.\n\n" +
		"Гарантийные обязательства: гарантийный срок на световую композитную пломбу — 24 мес. (срок службы: 36 мес.) при регулярном профилактическом осмотре 1 раз в 6 месяцев.",
	service804n: {
		code804n: "A16.07.002.010",
		title:
			"Восстановление зуба пломбой с нарушением контактного пункта зуба II, III класса по Блэку с использованием фотополимерных материалов (поверхности O/MOD)",
		basePriceRub: 4800,
		category: "therapy",
	},
	additionalServices804n: [
		{
			code804n: "A16.07.002.001",
			title:
				"Восстановление зуба пломбой с нарушением контактного пункта (A16.07.002.001)",
			basePriceRub: 4800,
			category: "therapy",
		},
	],
	informedConsent:
		"Информированное добровольное согласие (ИДС) на терапевтическое лечение зуба и местную анестезию оформлено и подписано в полном объеме.",
	materialsToDeduct: [
		{
			name: "Композит фотополимерный светоотверждаемый Filtek Ultimate / Estelite Sigma Quick",
			category: "composite",
			unit: "г",
			quantity: 0.35,
			unitCostRub: 1450,
		},
		{
			name: "Изолирующая прокладка СИЦ Vitrebond / Ionoseal",
			category: "composite",
			unit: "г",
			quantity: 0.1,
			unitCostRub: 550,
		},
		{
			name: "Адгезивная система OptiBond FL / Single Bond (праймер + бонд)",
			category: "adhesive",
			unit: "мл",
			quantity: 0.1,
			unitCostRub: 1950,
		},
		{
			name: "Гель травильный 37% ортофосфорная кислота",
			category: "composite",
			unit: "мл",
			quantity: 0.2,
			unitCostRub: 180,
		},
		{
			name: "Анестетик артикаиновый 4% с эпинефрином 1:200000 1.7 мл",
			category: "anesthesia",
			unit: "карп.",
			quantity: 1,
			unitCostRub: 220,
		},
		{
			name: "Платок коффердама латексный Sanctuary Dental Dam",
			category: "auxiliary",
			unit: "шт.",
			quantity: 1,
			unitCostRub: 115,
		},
		{
			name: "Секционная матрица и фиксирующий клин (комплект)",
			category: "auxiliary",
			unit: "компл.",
			quantity: 1,
			unitCostRub: 90,
		},
		{
			name: "Полировочные головки Enhance и паста Prisma Gloss",
			category: "auxiliary",
			unit: "компл.",
			quantity: 1,
			unitCostRub: 75,
		},
	],
	recommendations:
		"Не принимать пищу до окончания действия анестезии (1.5–2 часа во избежание прикусывания щеки/губ). Исключить употребление красящих продуктов и напитков (чай, кофе, ягоды, свекла) в течение первых 24 часов. Контрольный осмотр и профгигиена через 6 месяцев.",
	warrantyMonths: 24,
	serviceLifeMonths: 36,
};

// ── 2. «1-КЛИК ПУЛЬПИТ / ЭНДОДОНТИЯ (К04.0)» ──
export const AUTOPILOT_PULPITIS_K040: DoctorAutopilotPreset = {
	id: "autopilot_pulpitis_k040",
	title: "1-клик Пульпит / Эндодонтия (K04.0) — ProTaper/Reciproc, NaOCl 3%, ЭДТА 17%, временная пломба Каласепт",
	shortBadge: "Пульпит (1-клик)",
	category: "therapy",
	icd10: "K04.0",
	icd10Label: "Острый пульпит (необратимый)",
	toothState: "Pulpitis",
	defaultTooth: 46,
	is1ClickAutopilot: true,
	complaint:
		"Жалобы на острые приступообразные самопроизвольные боли, усиливающиеся в ночное время и от температурных раздражителей (особенно от горячего/холодного), с иррадиацией по ходу ветвей тройничного нерва. Болевой приступ продолжается более 20–30 минут.",
	anamnesis:
		"Боли возникли 1–2 суток назад, нарастают по интенсивности. Прием НПВП (Нимесил / Кеторол) купирует боль не полностью и кратковременно. Аллергологический анамнез не отягощен. Соматически здоров. Оформлено информированное добровольное согласие (ИДС) на эндодонтическое лечение.",
	statusLocalis:
		"Слизистая оболочка в области причинного зуба без патологических изменений. Глубокая кариозная полость, сообщающаяся с полостью зуба. Зондирование вскрытой точки коронковой пульпы резко болезненно, сопровождается кровоточивостью. Перкуссия слабочувствительна. Термопроба резко положительна с длительным болевым последействием. ЭОД 35–45 мкА. Рентгенография: глубокий кариозный дефект, сообщающийся с пульпарной камерой, периодонтальная щель интактна.",
	anesthetic: {
		drugKey: "ultracain_ds_forte",
		drugName: "Артикаин 1:100 000 (Sol. Articaini 4% cum epinephrine 1:100 000 — 1.7 мл)",
		carpulesCount: 1.0,
		volumeMl: 1.7,
	},
	treatmentDescription:
		"1. Информированное добровольное согласие (ИДС) пациента получено и подписано.\n" +
		"2. Инфильтрационная/проводниковая анестезия (Sol. Articaini 1:100 000 — 1.7 мл). Достигнута глубокая анестезия.\n" +
		"3. Изоляция рабочего поля коффердамом.\n" +
		"4. Препарирование кариозной полости, полное удаление инфицированного дентина, раскрытие пульпарной камеры и создание прямого эндодонтического доступа.\n" +
		"5. Витальная экстирпация коронковой и корневой пульпы пульпоэкстрактором.\n" +
		"6. Электронная апекслокация рабочей длины корневых каналов апекслокатором, визиографический контроль.\n" +
		"7. Механическая инструментальная обработка ProTaper/Reciproc: механическая обработка каналов машинными Ni-Ti инструментами ProTaper/Reciproc под контролем эндомотора до апикального упора.\n" +
		"8. Медикаментозная антисептическая ирригация NaOCl 3% и ЭДТА 17%: обильное последовательное промывание корневых каналов 3% раствором гипохлорита натрия (NaOCl 3%) и 17% гелем ЭДТА (EDTA 17%) с ультразвуковой активацией ирриганта эндочаком.\n" +
		"9. Тщательное просушивание корневых каналов стерильными бумажными штифтами.\n" +
		"10. Временное пломбирование гидроксидом кальция: введение пасты гидроксида кальция Каласепт (Calasept / Calcept) на всю рабочую длину корневых каналов до физиологического апекса.\n" +
		"11. Постановка герметичной временной повязки / пломбы (дентин-паста / Cavit).",
	service804n: {
		code804n: "A16.07.030.001",
		title:
			"Инструментальная и медикаментозная обработка корневого канала (ProTaper/Reciproc + ирригация NaOCl 3% + ЭДТА 17%)",
		basePriceRub: 4000,
		category: "therapy",
	},
	additionalServices804n: [
		{
			code804n: "A16.07.008.002",
			title:
				"Временное пломбирование лекарственным препаратом корневого канала (Каласепт)",
			basePriceRub: 1500,
			category: "therapy",
		},
	],
	informedConsent:
		"Информированное добровольное согласие (ИДС) на эндодонтическое лечение корневых каналов оформлено и подписано.",
	materialsToDeduct: [
		{
			name: "Паста лечебная гидроксид кальция Каласепт (Calasept / Calcept)",
			category: "endo",
			unit: "г",
			quantity: 0.2,
			unitCostRub: 650,
		},
		{
			name: "Раствор натрия гипохлорита 3% для ирригации (NaOCl 3%)",
			category: "endo",
			unit: "мл",
			quantity: 15,
			unitCostRub: 12,
		},
		{
			name: "Гель ЭДТА 17% для химического расширения каналов",
			category: "endo",
			unit: "мл",
			quantity: 0.5,
			unitCostRub: 240,
		},
		{
			name: "Машинный Ni-Ti ротационный/реципрокный файл ProTaper / Reciproc",
			category: "endo",
			unit: "шт.",
			quantity: 1,
			unitCostRub: 850,
		},
		{
			name: "Временная герметичная повязка дентин-паста / Cavit",
			category: "endo",
			unit: "г",
			quantity: 0.3,
			unitCostRub: 320,
		},
		{
			name: "Штифты бумажные абсорбирующие стерильные",
			category: "endo",
			unit: "шт.",
			quantity: 4,
			unitCostRub: 15,
		},
		{
			name: "Анестетик артикаиновый 4% с эпинефрином 1:100000 1.7 мл",
			category: "anesthesia",
			unit: "карп.",
			quantity: 1,
			unitCostRub: 220,
		},
		{
			name: "Платок коффердама Sanctuary Dental Dam",
			category: "auxiliary",
			unit: "шт.",
			quantity: 1,
			unitCostRub: 115,
		},
	],
	recommendations:
		"Не жевать твердую пищу на стороне леченого зуба во избежание скола стенок. При возникновении ноющего дискомфорта — прием НПВП (Нимесил 1 пакетик или Нурофен 400 мг). Повторное посещение для постоянной обтурации корневых каналов через 7–10 дней.",
	warrantyMonths: 12,
	serviceLifeMonths: 24,
};

// ── 3. «1-КЛИК ПРОФГИГИЕНА / AIR-FLOW» ──
export const AUTOPILOT_HYGIENE_AIRFLOW: DoctorAutopilotPreset = {
	id: "autopilot_hygiene_airflow",
	title: "1-клик Профгигиена / Air-Flow — УЗ-скейлинг EMS/Piezon, Air-Flow порошок на основе глицина, полировочная паста Cleanic, фторлак",
	shortBadge: "Гигиена (1-клик)",
	category: "hygiene",
	icd10: "K03.6",
	icd10Label: "Отложения (наросты) на зубах / Зубной камень",
	toothState: "Healthy",
	is1ClickAutopilot: true,
	complaint:
		"Жалобы на наличие пигментированного зубного налета от красящих продуктов и напитков, образование наддесневого и поддесневого зубного камня, неприятный запах изо рта, кровоточивость десен при чистке зубов. Обратился для проведения плановой комплексной профессиональной гигиены полости рта.",
	anamnesis:
		"Последняя процедура профессиональной гигиены проводилась более 6 месяцев назад. Аллергологический анамнез не отягощен. Соматически здоров. Информированное согласие (ИДС) оформлено.",
	statusLocalis:
		"Обильный над- и поддесневой минерализованный зубной камень в области фронтальных и жевательных зубов обеих челюстей, выраженный пигментированный налет. Десна гиперемирована, отечна в области отложений, краевая кровоточивость при легком зондировании десневой борозды (BOP+). Зубодесневое прикрепление сохранено, патологических пародонтальных карманов нет.",
	treatmentDescription:
		"1. Определение гигиенического индекса, индикация зубных отложений раствором фуксина.\n" +
		"2. Аппликационная анестезия маргинальной десны обезболивающим гелем (Лидокаин 2%).\n" +
		"3. Ультразвуковой скейлинг (УЗ-скейлинг EMS/Piezon, A16.07.051): бережное удаление минерализованных над- и поддесневых зубных отложений скейлером EMS Piezon Master с водяным охлаждением.\n" +
		"4. Водно-воздушно-абразивная обработка аппаратом Air-Flow с оригинальным мелкодисперсным порошком на основе глицина (Air-Flow порошок на основе глицина 25 мкм, безопасен для эмали и поддесневых зон): полное удаление плотного пигментированного налета и биопленки.\n" +
		"5. Полировка всех поверхностей зубов профессиональной полировочной пастой Cleanic с циркулярными щеточками и резиновыми чашечками до гладкого зеркального блеска. Межзубные контактные пункты обработаны флоссом и абразивными штрипсами.\n" +
		"6. Медикаментозная антисептическая обработка десневого края 0.05% раствором хлоргексидина.\n" +
		"7. Реминерализующая терапия и снижение чувствительности эмали: нанесение защитного фторлака (Clinpro White Varnish / Bifluorid 12) на все поверхности зубов.\n" +
		"8. Обучение контролируемой гигиене полости рта, индивидуальный подбор зубной щетки, монопучковой щетки, межзубных ершиков и ирригатора.",
	service804n: {
		code804n: "A16.07.051",
		title:
			"Комплексная профессиональная гигиена полости рта (УЗ-скейлинг EMS/Piezon, Air-Flow порошок глицин, полировочная паста Cleanic, фторлак)",
		basePriceRub: 5000,
		category: "hygiene",
	},
	informedConsent:
		"Информированное добровольное согласие (ИДС) на проведение профессиональной гигиены полости рта подписано.",
	materialsToDeduct: [
		{
			name: "Air-Flow порошок на основе глицина EMS Plus",
			category: "hygiene",
			unit: "г",
			quantity: 25,
			unitCostRub: 18,
		},
		{
			name: "Полировочная паста Cleanic",
			category: "hygiene",
			unit: "г",
			quantity: 3,
			unitCostRub: 40,
		},
		{
			name: "Защитный фторлак Clinpro White Varnish / Bifluorid 12",
			category: "hygiene",
			unit: "мл",
			quantity: 0.5,
			unitCostRub: 640,
		},
		{
			name: "Ретрактор мягкий для губ OptraGate (Ivoclar)",
			category: "hygiene",
			unit: "шт.",
			quantity: 1,
			unitCostRub: 210,
		},
		{
			name: "Раствор хлоргексидина биглюконата 0.05%",
			category: "hygiene",
			unit: "мл",
			quantity: 15,
			unitCostRub: 3,
		},
	],
	recommendations:
		"Соблюдать «белую/прозрачную диету» в течение первых 24 часов (исключить кофе, чай, свеклу, ягоды, шоколад, соевый соус, красное вино и курение). Заменить старую зубную щетку на новую. Ежедневное использование зубной нити и межзубных ершиков. Плановый профилактический осмотр и профгигиена через 6 месяцев.",
};

// ── 4. «1-КЛИК УДАЛЕНИЕ ЗУБА (К04.5)» ──
export const AUTOPILOT_EXTRACTION_K045: DoctorAutopilotPreset = {
	id: "autopilot_extraction_k045",
	title: "1-клик Удаление зуба (K04.5) — инфильтрационная/проводниковая анестезия, элеватор, щипцы, гемостаз альвостазом/коллаполом, памятка по уходу",
	shortBadge: "Удаление (1-клик)",
	category: "surgery",
	icd10: "K04.5",
	icd10Label: "Хронический апикальный периодонтит (показание к удалению зуба)",
	toothState: "Missing",
	defaultTooth: 48,
	is1ClickAutopilot: true,
	complaint:
		"Жалобы на ноющие боли в области причинного разрушенного зуба, усиливающиеся при накусывании, чувство «выросшего» зуба, периодическую отечность десны, невозможность терапевтического или ортопедического восстановления.",
	anamnesis:
		"Зуб ранее неоднократно лечен эндодонтически, коронковая часть разрушена ниже уровня десны, стенки тонкие, сколы. На прицельной рентгенограмме / КЛКТ: периапикальный очаг деструкции костной ткани у верхушек корней (K04.5), разрушение фуркации корней, зуб не подлежит зубосохраняющему лечению. Аллергологический анамнез не отягощен. Соматически компенсирован. Оформлено информированное добровольное согласие (ИДС) на хирургическую операцию удаления зуба.",
	statusLocalis:
		"Коронковая часть причинного зуба разрушена более чем на 2/3 (ИРОПЗ > 0.8) ниже десневого края, корень темного цвета, размягчен. Слизистая оболочка маргинальной десны вокруг зуба гиперемирована, отечна, пальпация по переходной складке умеренно болезненна. Перкуссия резко болезненна. Подвижность II-III степени.",
	anesthetic: {
		drugKey: "ultracain_ds_forte",
		drugName: "Артикаин 1:100 000 (Sol. Articaini 4% cum epinephrine 1:100 000 — 1.7 мл)",
		carpulesCount: 1.0,
		volumeMl: 1.7,
	},
	treatmentDescription:
		"1. Информированное добровольное согласие (ИДС) на хирургическую операцию удаления зуба подписано пациентом.\n" +
		"2. Антисептическая обработка операционного поля 0.05% раствором хлоргексидина биглюконата.\n" +
		"3. Местная анестезия: инфильтрационная и проводниковая анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл. Достигнуто полное и глубокое обезболивание.\n" +
		"4. Синдесмотомия: бережное отслоение круговой связки зуба прямым распатором на глубину зубодесневой борозды.\n" +
		"5. Люксация причинного зуба прямым/штыковидным элеватором с опорой на межзубную перегородку без избыточного давления на кортикальную пластинку.\n" +
		"6. Наложение анатомических щипцов вдоль оси корня, продвижение щечек щипцов под десну, фиксация, аккуратная люксация/ротация и тракция зуба из альвеолы (A16.07.001.001). Зуб удален полностью, верхушки корней сохранны.\n" +
		"7. Ревизия и тщательный кюретаж лунки острой ложкой: удаление грануляционной ткани, осколков альвеолы и патологической периапикальной капсулы.\n" +
		"8. Антисептическое промывание лунки теплым 0.05% раствором хлоргексидина.\n" +
		"9. Местный гемостаз: формирование полноценного кровяного сгустка, внесение в лунку кровоостанавливающего антисептического биоматериала (гемостатическая коллагеновая губка Альвостаз / Коллапол).\n" +
		"10. Сближение краев лунки, наложение сближающего гемостатического шва (шовный материал Викрил / PTFE 4-0).\n" +
		"11. Прижатие стерильным марлевым тампоном на 20 минут. Контроль гемостаза: кровотечение надежно остановлено.\n" +
		"12. Пациенту на руки выдана подробная памятка по уходу после удаления зуба.",
	service804n: {
		code804n: "A16.07.001.001",
		title:
			"Удаление постоянного зуба (инфильтрационная/проводниковая анестезия, элеватор, щипцы, кюретаж лунки, гемостаз альвостазом/коллаполом, шов)",
		basePriceRub: 3500,
		category: "surgery",
	},
	informedConsent:
		"Информированное добровольное согласие (ИДС) на операцию удаления зуба подписано пациентом.",
	postOpMemo:
		"Памятка по уходу после удаления зуба: 1) Марлевый тампон удалить через 20 минут. 2) Холод местно на щеку (пакет со льдом через полотенце) по 15 минут с перерывами первые 3-4 часа. 3) Не принимать пищу и горячее питье в течение 2 часов. 4) Не полоскать полость рта, не прогревать щеку, не прикасаться к лунке (необходимо сохранить кровяной сгусток). 5) Исключить физические нагрузки, горячую ванну, баню, сауну и алкоголь на 3 дня. 6) При болях — Нимесил 1 пакетик или Нурофен 400 мг после еды. 7) Контрольный осмотр через 3 дня.",
	materialsToDeduct: [
		{
			name: "Гемостатическая антисептическая губка Альвостаз / Коллапол",
			category: "surgery",
			unit: "шт.",
			quantity: 1,
			unitCostRub: 310,
		},
		{
			name: "Анестетик артикаиновый 4% с эпинефрином 1:100000 1.7 мл",
			category: "anesthesia",
			unit: "карп.",
			quantity: 1,
			unitCostRub: 220,
		},
		{
			name: "Игла карпульная 30G евростандарт 25 мм",
			category: "anesthesia",
			unit: "шт.",
			quantity: 1,
			unitCostRub: 28,
		},
		{
			name: "Шовный материал монофиламентный PTFE / Викрил 4-0",
			category: "suture",
			unit: "шт.",
			quantity: 1,
			unitCostRub: 340,
		},
		{
			name: "Стерильные марлевые салфетки и тампоны (комплект)",
			category: "auxiliary",
			unit: "компл.",
			quantity: 1,
			unitCostRub: 45,
		},
	],
	recommendations:
		"Холод местно на щеку по 15 мин первые 3-4 часа. Не полоскать рот, не греть, не пить через соломинку. Исключить баню, алкоголь и тяжелые нагрузки на 3 дня. При боли — Нимесил 1 пакетик после еды. Контрольный осмотр через 3 дня.",
};

// ── 5. «1-КЛИК ФИЗИОЛОГИЧЕСКАЯ НОРМА (Z01.2)» ──
export const AUTOPILOT_NORM_HEALTHY: DoctorAutopilotPreset = {
	id: "autopilot_norm_healthy",
	title: "1-клик Физиологическая норма (Z01.2) — Соматически здоров / норма осмотра",
	shortBadge: "Норма",
	category: "therapy",
	icd10: "Z01.2",
	icd10Label: "Стоматологическое обследование (патологии не выявлено)",
	toothState: "Healthy",
	is1ClickAutopilot: true,
	complaint:
		"Жалоб нет. Обратился(лась) с целью планового профосмотра и гигиены полости рта.",
	anamnesis:
		"Соматически здоров. Аллергологический анамнез не отягощен. Хронические и инфекционные заболевания отрицает. Ранее стоматологическое лечение переносил(а) без осложнений.",
	statusLocalis:
		"Слизистая оболочка полости рта, десны, щек, языка и твердого неба бледно-розового цвета, умеренно увлажнена, без патологических элементов и изъязвлений. Зубные ряды интактны (или санированы). Патологических зубодесневых карманов нет. Прикус физиологический. Регионарные лимфатические узлы не увеличены, мягкоэластичные, безболезненные при пальпации. Движения в ВНЧС в полном объеме, безболезненные, без щелчков и хруста.",
	treatmentDescription:
		"Проведен полный клинический осмотр зубных рядов, зондирование, перкуссия, пальпация слизистой оболочки и лимфоузлов. Патологии твердых тканей зубов и тканей пародонта не выявлено. Проведена беседа по индивидуальной гигиене полости рта и подбору средств ухода.",
	service804n: {
		code804n: "B01.065.001",
		title:
			"Прием (осмотр, консультация) врача-стоматолога первичный",
		basePriceRub: 1000,
		category: "therapy",
	},
	recommendations:
		"Индивидуальная гигиена полости рта 2 раза в день (зубная щетка, паста, флосс/ирригатор). Плановый профилактический осмотр через 6 месяцев.",
};

// ── 6. «1-КЛИК ПЕРИОДОНТИТ (К04.5)» ──
export const AUTOPILOT_PERIODONTITIS_K045: DoctorAutopilotPreset = {
	id: "autopilot_periodontitis_k045",
	title: "1-клик Периодонтит (K04.5) — мехобработка каналов, NaOCl 3%, ЭДТА 17%, лечебная паста Ca(OH)2 на 10-14 дней, 804н A16.07.082",
	shortBadge: "Периодонтит (1-клик)",
	category: "therapy",
	icd10: "K04.5",
	icd10Label: "Хронический апикальный периодонтит",
	toothState: "Periodontitis",
	defaultTooth: 46,
	is1ClickAutopilot: true,
	complaint:
		"Жалобы на чувство «выросшего зуба», дискомфорт или ноющую боль при накусывании на зуб, изменение цвета коронки.",
	anamnesis:
		"Зуб ранее лечен эндодонтически либо не лечен. Обострение возникло несколько дней назад. Аллергологический анамнез уточнен. Соматически здоров. Оформлено информированное добровольное согласие (ИДС).",
	statusLocalis:
		"Коронка изменена в цвете, глубокая кариозная полость или несостоятельная пломба. Зондирование устьев каналов безболезненно. Перкуссия умеренно болезненна. Термопроба отрицательна. На радиовизиографии: очаг деструкции костной ткани у верхушки корня (периапикальное разряжение). ЭОД > 100 мкА.",
	anesthetic: {
		drugKey: "ultracain_ds_forte",
		drugName: "Артикаин 1:100 000 (Sol. Articaini 4% cum epinephrine 1:100 000 — 1.7 мл)",
		carpulesCount: 1.0,
		volumeMl: 1.7,
	},
	treatmentDescription:
		"1. Информированное добровольное согласие (ИДС) подписано пациентом.\n" +
		"2. Инфильтрационная/проводниковая анестезия Sol. Articaini 4% 1.8 мл (A11.07.012).\n" +
		"3. Изоляция операционного поля коффердамом (A16.07.002.009).\n" +
		"4. Препарирование кариозной полости, эндодонтический доступ, инструментальная ревизия и дезинфекция корневых каналов (A16.07.082).\n" +
		"5. Рабочая длина подтверждена апекслокатором и радиовизиографией (A06.07.003).\n" +
		"6. Механическая обработка машинными Ni-Ti файлами ProTaper/Reciproc под контролем эндомотора.\n" +
		"7. Ирригация 3% раствором NaOCl с эндоактиватором и 17% гелем ЭДТА.\n" +
		"8. Высушивание стерильными бумажными штифтами.\n" +
		"9. Временная лечебная обтурация пастой гидроксида кальция (Calcept / Metapex) на 10–14 дней.\n" +
		"10. Герметичная временная повязка Cavit/Clip.",
	service804n: {
		code804n: "A16.07.082",
		title: "Инструментальная ревизия и дезинфекция корневых каналов при периодонтите",
		basePriceRub: 5500,
		category: "therapy",
	},
	additionalServices804n: [
		{
			code804n: "A16.07.008.002",
			title: "Временное пломбирование корневого канала лечебной пастой гидроксида кальция",
			basePriceRub: 1500,
			category: "therapy",
		},
	],
	informedConsent:
		"Информированное добровольное согласие (ИДС) на эндодонтическое лечение периодонтита оформлено и подписано.",
	materialsToDeduct: [
		{
			name: "Паста лечебная гидроксид кальция Calcept / Metapex",
			category: "endo",
			unit: "г",
			quantity: 0.2,
			unitCostRub: 650,
		},
		{
			name: "Раствор натрия гипохлорита 3% для ирригации (NaOCl 3%)",
			category: "endo",
			unit: "мл",
			quantity: 20,
			unitCostRub: 12,
		},
		{
			name: "Гель ЭДТА 17% для химического расширения каналов",
			category: "endo",
			unit: "мл",
			quantity: 0.5,
			unitCostRub: 240,
		},
		{
			name: "Временная герметичная повязка Cavit / Septo-pack",
			category: "endo",
			unit: "г",
			quantity: 0.3,
			unitCostRub: 320,
		},
		{
			name: "Анестетик артикаиновый 4% с эпинефрином 1:100000 1.7 мл",
			category: "anesthesia",
			unit: "карп.",
			quantity: 1,
			unitCostRub: 220,
		},
		{
			name: "Платок коффердама Sanctuary Dental Dam",
			category: "auxiliary",
			unit: "шт.",
			quantity: 1,
			unitCostRub: 115,
		},
	],
	recommendations:
		"Не накусывать на причинный зуб твердую пищу. При умеренной боли — Нимесулид 100 мг. Явка через 10–14 дней на контрольный снимок и постоянную обтурацию.",
	warrantyMonths: 12,
	serviceLifeMonths: 24,
};

// ── 7. «1-КЛИК ПРОФГИГИЕНА (К05.1)» ──
export const AUTOPILOT_HYGIENE_K051: DoctorAutopilotPreset = {
	...AUTOPILOT_HYGIENE_AIRFLOW,
	id: "autopilot_hygiene_k051",
	title: "1-клик Профгигиена полости рта (K05.1) — УЗ-скейлинг EMS/Piezon, Air-Flow глицин, полировка Cleanic, глубокое фторирование",
	shortBadge: "Профгигиена (1-клик)",
	category: "hygiene",
	icd10: "K05.1",
	icd10Label: "Хронический катаральный гингивит / Профгигиена",
	service804n: {
		code804n: "A16.07.051",
		title: "Комплексная профессиональная гигиена полости рта (УЗ-скейлинг EMS/Piezon, Air-Flow глицин, паста Cleanic, фторирование)",
		basePriceRub: 5000,
		category: "hygiene",
	},
};

// ── 8. «1-КЛИК УДАЛЕНИЕ ЗУБА ПРОСТОЕ (К01.1)» ──
export const AUTOPILOT_EXTRACTION_K011: DoctorAutopilotPreset = {
	...AUTOPILOT_EXTRACTION_K045,
	id: "autopilot_extraction_k011",
	title: "1-клик Простое удаление зуба (K01.1) — инфильтрационная/проводниковая анестезия, элеватор, щипцы, кюретаж, гемостаз альвостазом",
	shortBadge: "Удаление (1-клик)",
	category: "surgery",
	icd10: "K01.1",
	icd10Label: "Простое хирургическое удаление зуба",
	service804n: {
		code804n: "A16.07.001.001",
		title: "Удаление постоянного зуба (A16.07.001)",
		basePriceRub: 3500,
		category: "surgery",
	},
};

/**
 * Каталог 1-кликовых автопилот-пресетов врача.
 */
export const DOCTOR_1CLICK_AUTOPILOT_PRESETS: readonly DoctorAutopilotPreset[] =
	[
		AUTOPILOT_CARIES_K021,
		AUTOPILOT_PULPITIS_K040,
		AUTOPILOT_PERIODONTITIS_K045,
		AUTOPILOT_HYGIENE_K051,
		AUTOPILOT_HYGIENE_AIRFLOW,
		AUTOPILOT_EXTRACTION_K011,
		AUTOPILOT_EXTRACTION_K045,
		AUTOPILOT_NORM_HEALTHY,
	];

/**
 * Быстрый словарь автопилот-пресетов по ID.
 */
export const DOCTOR_AUTOPILOT_PRESETS_MAP: Readonly<
	Record<string, DoctorAutopilotPreset>
> = {
	autopilot_caries_k021: AUTOPILOT_CARIES_K021,
	caries_k021: AUTOPILOT_CARIES_K021,
	caries_medium: AUTOPILOT_CARIES_K021,
	caries: AUTOPILOT_CARIES_K021,
	autopilot_pulpitis_k040: AUTOPILOT_PULPITIS_K040,
	pulpitis_k040: AUTOPILOT_PULPITIS_K040,
	pulpitis_acute: AUTOPILOT_PULPITIS_K040,
	pulpitis: AUTOPILOT_PULPITIS_K040,
	autopilot_periodontitis_k045: AUTOPILOT_PERIODONTITIS_K045,
	periodontitis_k045: AUTOPILOT_PERIODONTITIS_K045,
	periodontitis_destructive: AUTOPILOT_PERIODONTITIS_K045,
	periodontitis_chronic: AUTOPILOT_PERIODONTITIS_K045,
	periodontitis: AUTOPILOT_PERIODONTITIS_K045,
	autopilot_hygiene_k051: AUTOPILOT_HYGIENE_K051,
	hygiene_k051: AUTOPILOT_HYGIENE_K051,
	autopilot_hygiene_airflow: AUTOPILOT_HYGIENE_AIRFLOW,
	hygiene_airflow: AUTOPILOT_HYGIENE_AIRFLOW,
	hygiene_complex: AUTOPILOT_HYGIENE_AIRFLOW,
	hygiene: AUTOPILOT_HYGIENE_K051,
	autopilot_extraction_k011: AUTOPILOT_EXTRACTION_K011,
	extraction_k011: AUTOPILOT_EXTRACTION_K011,
	autopilot_extraction_k045: AUTOPILOT_EXTRACTION_K045,
	extraction_k045: AUTOPILOT_EXTRACTION_K045,
	surgery_extraction_simple: AUTOPILOT_EXTRACTION_K011,
	extraction: AUTOPILOT_EXTRACTION_K011,
	autopilot_norm_healthy: AUTOPILOT_NORM_HEALTHY,
	norm_healthy: AUTOPILOT_NORM_HEALTHY,
	norm: AUTOPILOT_NORM_HEALTHY,
};

// ── ФУНКЦИИ-ГЕНЕРАТОРЫ И ПОСТРОИТЕЛИ ──

/**
 * Построитель 1-кликового протокола лечения кариеса (K02.1).
 * Поддерживает кастомные поверхности (O, MOD, MO, DO, B, L) и зуб FDI.
 */
export function build1ClickCariesPreset(
	toothNumber?: number | null,
	surfaces?: string,
): DoctorAutopilotPreset {
	const tooth = toothNumber ?? 16;
	const trimmed = (surfaces ?? "").trim();
	const hasSurfaces =
		trimmed.length > 0 &&
		trimmed.toLowerCase() !== "undefined" &&
		trimmed.toLowerCase() !== "null";
	const toothPrefix = `Зуб ${tooth}: `;

	const statusLocalis = hasSurfaces
		? `${toothPrefix}На поверхностях ${trimmed} кариозная полость средней глубины в пределах дентина. Зондирование по эмалево-дентинной границе слабо чувствительно, дно и стенки плотные, пигментированные. Перкуссия безболезненна. Холодовая проба кратковременно положительна, быстропроходящая. ЭОД 6–8 мкА.`
		: `${toothPrefix}Кариозная полость средней глубины в пределах дентина. Зондирование по эмалево-дентинной границе слабо чувствительно, дно и стенки плотные, пигментированные. Перкуссия безболезненна. Холодовая проба кратковременно положительна, быстропроходящая. ЭОД 6–8 мкА.`;

	const serviceTitle = hasSurfaces
		? `Восстановление зуба пломбой с нарушением контактного пункта зуба II, III класса по Блэку с использованием фотополимерных материалов (поверхности ${trimmed}) (Зуб ${tooth})`
		: `Восстановление зуба пломбой светового отверждения (лечение кариеса дентина) (Зуб ${tooth})`;

	return {
		...AUTOPILOT_CARIES_K021,
		defaultTooth: tooth,
		surfaces: hasSurfaces ? trimmed : undefined,
		statusLocalis,
		service804n: {
			code804n: "A16.07.002.010",
			title: serviceTitle,
			basePriceRub: 4800,
			category: "therapy",
		},
	};
}

/**
 * Построитель 1-кликового протокола эндодонтии / пульпита (K04.0).
 */
export function build1ClickPulpitisPreset(
	toothNumber?: number | null,
): DoctorAutopilotPreset {
	const tooth = toothNumber ?? 46;
	const toothPrefix = `Зуб ${tooth}: `;

	return {
		...AUTOPILOT_PULPITIS_K040,
		defaultTooth: tooth,
		statusLocalis: `${toothPrefix}${AUTOPILOT_PULPITIS_K040.statusLocalis}`,
		service804n: {
			...AUTOPILOT_PULPITIS_K040.service804n!,
			title: `${AUTOPILOT_PULPITIS_K040.service804n!.title} (Зуб ${tooth})`,
		},
	};
}

/**
 * Построитель 1-кликового протокола периодонтита (K04.5).
 */
export function build1ClickPeriodontitisPreset(
	toothNumber?: number | null,
): DoctorAutopilotPreset {
	const tooth = toothNumber ?? 46;
	const toothPrefix = `Зуб ${tooth}: `;

	return {
		...AUTOPILOT_PERIODONTITIS_K045,
		defaultTooth: tooth,
		statusLocalis: `${toothPrefix}${AUTOPILOT_PERIODONTITIS_K045.statusLocalis}`,
		service804n: {
			...AUTOPILOT_PERIODONTITIS_K045.service804n!,
			title: `${AUTOPILOT_PERIODONTITIS_K045.service804n!.title} (Зуб ${tooth})`,
		},
	};
}

/**
 * Построитель 1-кликового протокола комплексной профгигиены Air-Flow (K05.1).
 */
export function build1ClickHygienePreset(
	toothNumber?: number | null,
): DoctorAutopilotPreset {
	const preset = { ...AUTOPILOT_HYGIENE_K051 };
	if (toothNumber) {
		preset.defaultTooth = toothNumber;
		preset.title = `${AUTOPILOT_HYGIENE_K051.title} (Зуб ${toothNumber})`;
	}
	return preset;
}

/**
 * Построитель 1-кликового протокола удаления зуба (K01.1 / K04.5).
 */
export function build1ClickExtractionPreset(
	toothNumber?: number | null,
	icd10: "K01.1" | "K04.5" = "K01.1",
): DoctorAutopilotPreset {
	const tooth = toothNumber ?? 48;
	const toothPrefix = `Зуб ${tooth}: `;
	const base =
		icd10 === "K04.5" ? AUTOPILOT_EXTRACTION_K045 : AUTOPILOT_EXTRACTION_K011;

	return {
		...base,
		defaultTooth: tooth,
		statusLocalis: `${toothPrefix}${base.statusLocalis}`,
		service804n: {
			...base.service804n!,
			title: `${base.service804n!.title} (Зуб ${tooth})`,
		},
	};
}

/**
 * Построитель 1-кликового протокола физиологической нормы (Z01.2).
 */
export function build1ClickNormPreset(): DoctorAutopilotPreset {
	return { ...AUTOPILOT_NORM_HEALTHY };
}

/**
 * Чистая функция применения 1-кликового клинического автопилота.
 * Вычисляет результирующий дневник SOAP (Форма 043/у), списание со склада и услуги 804н.
 */
export function apply1ClickClinicalAutopilot(
	presetId: string,
	options: Apply1ClickAutopilotOptions = {},
): Apply1ClickAutopilotResult {
	const mode = options.mode ?? "clean_replace";
	const tooth = options.toothNumber ?? null;

	let targetPreset: DoctorAutopilotPreset;
	switch (presetId) {
		case "autopilot_caries_k021":
		case "caries_k021":
		case "caries_medium":
		case "caries":
			targetPreset = build1ClickCariesPreset(tooth, options.surfaces);
			break;
		case "autopilot_pulpitis_k040":
		case "pulpitis_k040":
		case "pulpitis_acute":
		case "pulpitis":
			targetPreset = build1ClickPulpitisPreset(tooth);
			break;
		case "autopilot_periodontitis_k045":
		case "periodontitis_k045":
		case "periodontitis_destructive":
		case "periodontitis_chronic":
		case "periodontitis":
			targetPreset = build1ClickPeriodontitisPreset(tooth);
			break;
		case "autopilot_hygiene_k051":
		case "hygiene_k051":
		case "hygiene":
			targetPreset = build1ClickHygienePreset(tooth);
			break;
		case "autopilot_hygiene_airflow":
		case "hygiene_airflow":
		case "hygiene_complex":
			targetPreset = build1ClickHygienePreset(tooth);
			break;
		case "autopilot_extraction_k011":
		case "extraction_k011":
		case "extraction":
			targetPreset = build1ClickExtractionPreset(tooth, "K01.1");
			break;
		case "autopilot_extraction_k045":
		case "extraction_k045":
		case "surgery_extraction_simple":
			targetPreset = build1ClickExtractionPreset(tooth, "K04.5");
			break;
		case "autopilot_norm_healthy":
		case "norm_healthy":
		case "norm":
			targetPreset = build1ClickNormPreset();
			break;
		default: {
			const found = DOCTOR_AUTOPILOT_PRESETS_MAP[presetId];
			targetPreset = found || build1ClickCariesPreset(tooth, options.surfaces);
			break;
		}
	}

	const toothSuffix =
		targetPreset.category !== "hygiene" && tooth ? ` (Зуб ${tooth})` : "";

	const anesText = targetPreset.anesthetic
		? `Инфильтрационная/проводниковая анестезия: ${targetPreset.anesthetic.drugName} — ${targetPreset.anesthetic.volumeMl} мл.`
		: "";

	const billLines: string[] = [];
	if (targetPreset.service804n) {
		billLines.push(
			`Выполнено: [${targetPreset.service804n.code804n}] ${targetPreset.service804n.title} — ${targetPreset.service804n.basePriceRub.toLocaleString("ru-RU")} ₽`,
		);
	}
	if (targetPreset.additionalServices804n) {
		for (const s of targetPreset.additionalServices804n) {
			billLines.push(
				`Дополнительно: [${s.code804n}] ${s.title} — ${s.basePriceRub.toLocaleString("ru-RU")} ₽`,
			);
		}
	}

	const materialsSummary = (targetPreset.materialsToDeduct ?? [])
		.map((m) => `${m.name} (${m.quantity} ${m.unit})`)
		.join("; ");
	const materialsLine = materialsSummary
		? `Списание со склада (Норма расхода): ${materialsSummary}`
		: "";

	const planBlocks = [
		targetPreset.informedConsent ? `[ИДС]: ${targetPreset.informedConsent}` : "",
		anesText,
		targetPreset.treatmentDescription,
		billLines.join("\n"),
		materialsLine,
		targetPreset.recommendations
			? `[Рекомендации]: ${targetPreset.recommendations}`
			: "",
	].filter(Boolean);

	const fullPlanText = planBlocks.join("\n\n");

	const prev = options.currentDiary ?? {};
	let diary: DiaryState;

	if (mode === "clean_replace") {
		diary = {
			anamnesis: [targetPreset.complaint, targetPreset.anamnesis]
				.filter(Boolean)
				.join("\n"),
			statusLocalis: targetPreset.statusLocalis,
			diagnosisIcd10: targetPreset.icd10,
			diagnosisTooth: tooth ? String(tooth) : "",
			treatmentDescription: fullPlanText,
			complications: prev.complications || "",
			comorbidities: prev.comorbidities || "",
		};
	} else {
		// smart append
		const appendText = (current?: string, add?: string, sep = "\n\n") => {
			if (!current || !current.trim()) return add || "";
			if (!add || !add.trim()) return current;
			return `${current}${sep}${add}`;
		};
		diary = {
			anamnesis: appendText(
				prev.anamnesis,
				[targetPreset.complaint, targetPreset.anamnesis]
					.filter(Boolean)
					.join("\n"),
				"\n",
			),
			statusLocalis: appendText(
				prev.statusLocalis,
				targetPreset.statusLocalis,
				"\n",
			),
			diagnosisIcd10: prev.diagnosisIcd10 || targetPreset.icd10,
			diagnosisTooth: prev.diagnosisTooth || (tooth ? String(tooth) : ""),
			treatmentDescription: appendText(
				prev.treatmentDescription,
				fullPlanText,
				"\n\n",
			),
			complications: prev.complications || "",
			comorbidities: prev.comorbidities || "",
		};
	}

	return {
		diary,
		preset: targetPreset,
		service804n: targetPreset.service804n,
		additionalServices804n: targetPreset.additionalServices804n,
		materials: targetPreset.materialsToDeduct ?? [],
		recommendations: targetPreset.recommendations ?? "",
		informedConsent: targetPreset.informedConsent,
		postOpMemo: targetPreset.postOpMemo,
		toothNumber: tooth ?? targetPreset.defaultTooth,
		odontogramState: targetPreset.toothState,
	};
}

/**
 * Алиас для 1-кликового автопилота врача (обратная совместимость и краткость).
 */
export const apply1ClickDoctorAutopilot = apply1ClickClinicalAutopilot;

