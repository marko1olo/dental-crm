import React from "react";
import {
	Activity,
	Bone,
	Check,
	Crown,
	Flame,
	HeartPulse,
	PlusCircle,
	Search,
	ShieldCheck,
	Sparkles,
	Stethoscope,
	Syringe,
	Zap,
} from "lucide-react";
import type { DiaryState } from "../useVisitDiaryLogic";
import { showToast } from "../GlobalToast";

export type ToothClinicalState =
	| "Caries"
	| "Pulpitis"
	| "Periodontitis"
	| "Filled"
	| "Crown"
	| "Implant"
	| "Planned_Implant"
	| "Missing"
	| "Healthy";

export interface ClinicalQuickPreset {
	id: string;
	title: string;
	shortBadge: string;
	category: "therapy" | "surgery" | "orthopedics" | "hygiene";
	icd10: string;
	icd10Label: string;
	anamnesis: string;
	statusLocalis: string;
	treatmentDescription: string;
	complaint?: string;
	toothState?: ToothClinicalState;
	defaultTooth?: number;
	anesthetic?: {
		drugKey: "ultracain_ds_forte" | "ultracain_ds" | "scandonest_3";
		carpulesCount: number;
	};
	service804n?: {
		code804n: string;
		title: string;
		basePriceRub: number;
		category: "therapy" | "surgery" | "orthopedics" | "hygiene";
	};
}

export const CLINICAL_PRESETS: ClinicalQuickPreset[] = [
	// ── БЫСТРЫЕ КЛИНИЧЕСКИЕ SOAP ЧИПЫ (1 КЛИК)
	{
		id: "acute_pain_pulpitis",
		title: "Острая боль / Пульпит (K04.0)",
		shortBadge: "Острая боль",
		category: "therapy",
		icd10: "K04.0",
		icd10Label: "Острый пульпит (необратимый)",
		toothState: "Pulpitis",
		defaultTooth: 46,
		complaint: "Жалобы на острую приступообразную самопроизвольную боль, усиливающуюся в ночное время, с иррадиацией.",
		anamnesis: "Боли возникли 2 дня назад, постепенно нарастают. Обезболивающие препараты кратковременно снижают интенсивность боли.",
		statusLocalis: "Глубокая кариозная полость, зондирование дна резко болезненно в одной точке, полость зуба вскрыта, кровоточивость. Перкуссия слабочувствительна. Термопроба резко положительная, длительная.",
		treatmentDescription: "Инфильтрационная/проводниковая анестезия (Артикаин 4% с эпинефрином 1:100 000 / 1:200 000, 1.7 мл). Раскрытие полости зуба, создание эндодонтического доступа, ампутация и экстирпация пульпы. Инструментальная и медикаментозная обработка корневых каналов (NaOCl 3%, ЭДТА 17%). Временное пломбирование гидроксидом кальция Calcept, герметичная повязка.",
		anesthetic: {
			drugKey: "ultracain_ds_forte",
			carpulesCount: 1.0,
		},
		service804n: {
			code804n: "A16.07.030.001",
			title: "Экстирпация пульпы и инструментальная обработка каналов (1-й этап)",
			basePriceRub: 8500,
			category: "therapy",
		},
	},
	{
		id: "aching_pain_periodontitis",
		title: "Ноющие боли / Периодонтит (K04.5)",
		shortBadge: "Ноющие боли",
		category: "therapy",
		icd10: "K04.5",
		icd10Label: "Хронический апикальный периодонтит",
		toothState: "Periodontitis",
		defaultTooth: 36,
		complaint: "Жалобы на постоянную ноющую боль, усиливающуюся при накусывании на зуб, чувство «выросшего» зуба.",
		anamnesis: "Зуб ранее лечен по поводу кариеса/пульпита более 2 лет назад. Обострение после переохлаждения.",
		statusLocalis: "Зуб девитализирован / глубокая пломба с дефектом. Перкуссия резко болезненна. Слизистая оболочка в области верхушки корня гиперемирована, пальпация чувствительна.",
		treatmentDescription: "Инфильтрационная/проводниковая анестезия (Артикаин 4% с эпинефрином 1:100 000 / 1:200 000, 1.7 мл). Распломбирование/ревизия корневых каналов, эвакуация распада, ультразвуковая ирригация (NaOCl 3%, 2% хлоргексидин). Временная обтурация гидроксидом кальция Calcept, герметичная повязка.",
		anesthetic: {
			drugKey: "ultracain_ds_forte",
			carpulesCount: 1.0,
		},
		service804n: {
			code804n: "A16.07.030.002",
			title: "Распломбирование и дезинфекция каналов при периодонтите",
			basePriceRub: 7500,
			category: "therapy",
		},
	},
	{
		id: "cold_hot_sensitivity",
		title: "Гиперестезия / Реакция на холодное и горячее (K03.8)",
		shortBadge: "Реакция на холод/горячее",
		category: "therapy",
		icd10: "K03.8",
		icd10Label: "Гиперестезия дентина",
		toothState: "Caries",
		defaultTooth: 16,
		complaint: "Жалобы на повышенную чувствительность зубов от холодного, горячего, кислого и при чистке зубов щеткой.",
		anamnesis: "Повышенная чувствительность появилась после отбеливания / рецессии десны в пришеечной области.",
		statusLocalis: "Оголение шеек зубов / клиновидные дефекты эмали без признаков кариозного распада, зондирование пришеечной зоны чувствительно.",
		treatmentDescription: "Профессиональная чистка пастой Cleanic, нанесение десенситайзера Gluma Desensitizer / Bifluorid 12, глубокое фторирование эмали и дентина Clinpro White Varnish.",
		service804n: {
			code804n: "A16.07.051",
			title: "Глубокое фторирование и десенсибилизация твердых тканей зубов",
			basePriceRub: 2500,
			category: "therapy",
		},
	},
	{
		id: "caries_medium",
		title: "Кариес дентина (K02.1)",
		shortBadge: "Кариес",
		category: "therapy",
		icd10: "K02.1",
		icd10Label: "Кариес дентина (средний)",
		toothState: "Caries",
		defaultTooth: 16,
		complaint:
			"Жалобы на кратковременные боли от температурных (холодное, горячее) и химических (сладкое, кислое) раздражителей, быстро проходящие после прекращения действия фактора, застревание пищи в межзубном промежутке.",
		anamnesis:
			"Зуб ранее не лечен / пломбирован более 2 лет назад. Прием анальгетиков отрицает. Аллергоанамнез не отягощен.",
		statusLocalis:
			"Кариозная полость средней глубины в пределах плащевого дентина. Дно и стенки плотные, пигментированные. Зондирование слабоболезненно по эмалево-дентинной границе. Перкуссия безболезненна. Холодовая проба слабоположительная, быстропроходящая. ЭОД 6–8 мкА.",
		treatmentDescription:
			"Инфильтрационная/проводниковая анестезия (Артикаин 4% 1.7 мл). Препарирование кариозной полости, полная некрэктомия, формирование эмалевого фальца. Изоляция коффердамом. Антисептическая медикаментозная обработка 2% раствором хлоргексидина. Кислотное травление эмали и дентина 37% ортофосфорной кислотой (etching: эмаль 20 сек, дентин 10 сек), смывание водой, деликатное подсушивание воздухом. Нанесение адгезивной системы (adhesive: праймер + бонд), экспозиция 20 сек, фотополимеризация 20 сек. Послойное моделирование наногибридным светоотверждаемым композитом (composite layer) с восстановлением окклюзионных бугров, фиссур и контактного пункта. Шлифовка, полировка (polishing: диски, полиры, паста) до сухого зеркального блеска, контроль окклюзии по копирке.\n\nГарантийные обязательства: Гарантийный срок на световую композитную реставрацию — 24 мес. (срок службы: 36 мес.) при условии соблюдения индивидуальной гигиены и профосмотра каждые 6 месяцев.",
		anesthetic: {
			drugKey: "ultracain_ds_forte",
			carpulesCount: 1.0,
		},
		service804n: {
			code804n: "A16.07.002.001",
			title: "Наложение пломбы из светоотверждаемого композита при лечении кариеса",
			basePriceRub: 4500,
			category: "therapy",
		},
	},
	{
		id: "pulpitis_acute",
		title: "Пульпит необратимый (K04.0) — 1-й этап",
		shortBadge: "Пульпит",
		category: "therapy",
		icd10: "K04.0",
		icd10Label: "Пульпит необратимый (1-й этап)",
		toothState: "Pulpitis",
		defaultTooth: 46,
		complaint: "Жалобы на самопроизвольные острые приступообразные боли, нарастающие в ночное время, с иррадиацией по ветвям тройничного нерва. Болевой приступ длится > 30 минут.",
		anamnesis: "Боли появились 2 суток назад, интенсивность нарастает. Пациент принимал НПВП (Нимесил/Нурофен) с кратковременным эффектом.",
		statusLocalis: "Глубокая кариозная полость, сообщающаяся с полостью зуба. Зондирование вскрытой точки рога пульпы резко болезненно, сопровождается кровоточивостью. Перкуссия безболезненна. Термопроба резко положительна. ЭОД — 35-45 мкА.",
		treatmentDescription: "Инфильтрационная/проводниковая анестезия (Артикаин 4% с эпинефрином 1:100 000 / 1:200 000, 1.7 мл). Препарирование, раскрытие полости зуба, создание прямого эндодонтического доступа. Коффердам. Витальная экстирпация пульпы. Определение рабочей длины (апекслокатор + визиография). Инструментальная механическая обработка каналов NiTi ротационными файлами (canal instrumentation) с обильной ирригацией NaOCl 3% и ЭДТА 17% с УЗ-активацией. Высушивание бумажными штифтами. Временная лечебная паста Calcept (гидроксид кальция) / временная обтурация. Герметичная временная пломба (Cavit / СИЦ). Назначен повторный визит через 5-7 дней для пломбирования каналов гуттаперчей.",
		anesthetic: {
			drugKey: "ultracain_ds_forte",
			carpulesCount: 1.0,
		},
		service804n: {
			code804n: "A16.07.030.001",
			title: "Экстирпация пульпы и инструментальная/медикаментозная обработка корневого канала (1-й этап)",
			basePriceRub: 8500,
			category: "therapy",
		},
	},
	{
		id: "periodontitis_chronic",
		title: "Хронический апикальный периодонтит (K04.5)",
		shortBadge: "Периодонтит",
		category: "therapy",
		icd10: "K04.5",
		icd10Label: "Хронический апикальный периодонтит",
		toothState: "Periodontitis",
		defaultTooth: 36,
		complaint: "Жалобы на постоянные ноющие боли, усиливающиеся при накусывании на зуб, чувство «выросшего» зуба, изменение цвета коронки.",
		anamnesis: "Зуб ранее лечен эндодонтически более 3 лет назад. Несколько дней назад возникло обострение после переохлаждения.",
		statusLocalis: "Зуб изменен в цвете, девитализирован / дефект пломбы. Зондирование устьев безболезненно. Перкуссия слабочувствительна/болезненна. ЭОД > 100 мкА. Рентгенография: очаг деструкции костной ткани у верхушки корня (периапикальный очаг).",
		treatmentDescription: "Инфильтрационная/проводниковая анестезия (Артикаин 4% с эпинефрином 1:100 000 / 1:200 000, 1.7 мл). Распломбирование корневых каналов, ревизия, прохождение до физиологического апекса под контролем апекслокатора. Обильная медикаментозная дезинфекция (NaOCl 3%, 2% хлоргексидин, ЭДТА, ультразвук). Временная обтурация каналов гидроксидом кальция Calcept для стимуляции остеогенеза и подавления инфекции. Герметичная временная пломба (Cavit / СИЦ). Контрольный осмотр через 10-14 дней.",
		anesthetic: {
			drugKey: "ultracain_ds_forte",
			carpulesCount: 1.0,
		},
		service804n: {
			code804n: "A16.07.030.002",
			title: "Распломбирование и дезинфекция каналов с временной обтурацией Ca(OH)2",
			basePriceRub: 7500,
			category: "therapy",
		},
	},
	{
		id: "filling_restoration",
		title: "Пломба / Реставрация зуба (K02.1)",
		shortBadge: "Пломба",
		category: "therapy",
		icd10: "K02.1",
		icd10Label: "Кариес дентина / Дефект пломбы",
		toothState: "Filled",
		defaultTooth: 26,
		complaint: "Жалобы на скол старой пломбы, нарушение краевого прилегания, попадание пищи, шероховатость язычной/окклюзионной поверхности.",
		anamnesis: "Пломба установлена более 5 лет назад, скол произошел во время еды.",
		statusLocalis: "Дефект старой реставрации, пигментация по границе пломба-зуб. Зондирование по краю слабочувствительно. Перкуссия безболезненна. ЭОД 6 мкА.",
		treatmentDescription: "Инфильтрационная анестезия (Артикаин 4% 1.7 мл). Удаление дефектной реставрации, некрэктомия, формирование фальца эмали. Коффердам. Антисептическая обработка 2% хлоргексидином. Адгезивный протокол (тотальное травление 37% H3PO4 + бонд). Послойное моделирование наногибридным композитом с восстановлением бугров и контактного пункта. Шлифовка дисками, полировка полирами и пастой до сухого блеска, окклюзионный контроль.\n\nГарантийные обязательства: Гарантийный срок на световую композитную реставрацию — 24 мес. (срок службы: 36 мес.) при соблюдении гигиены и регулярном профосмотре 1 раз в 6 месяцев.",
		anesthetic: {
			drugKey: "ultracain_ds_forte",
			carpulesCount: 1.0,
		},
		service804n: {
			code804n: "A16.07.002.001",
			title: "Восстановление зуба пломбой (замена дефектной реставрации)",
			basePriceRub: 4500,
			category: "therapy",
		},
	},
	{
		id: "ortho_crown_prep",
		title: "Ортопедическое восстановление / Коронка (Z51.8)",
		shortBadge: "Коронка",
		category: "orthopedics",
		icd10: "Z51.8",
		icd10Label: "Ортопедическое лечение (коронка)",
		toothState: "Crown",
		defaultTooth: 16,
		complaint: "Обращение на этап ортопедического восстановления зуба. Разрушение коронковой части зуба более 50% (ИРОПЗ > 0.6).",
		anamnesis: "Зуб депульпирован, корневые каналы запломбированы, направлен терапевтом на протезирование.",
		statusLocalis: "Коронковая часть зуба культевая/пломбированная, зуб девитализирован, корневые каналы запломбированы до верхушки. Десна без воспаления.",
		treatmentDescription: "Анестезия (Артикаин 4% 1.7 мл). Препарирование зуба под искусственную коронку из диоксида циркония с созданием циркулярного уступа типа Chamfer (0.8 мм). Ретракция десны ретракционной нитью 00. Получение прецизионного двухслойного силиконового оттиска (А-силикон) и оттиска антагонистов. Изготовление и фиксация провизорной пластмассовой коронки на временный цемент TempBond.",
		anesthetic: {
			drugKey: "ultracain_ds_forte",
			carpulesCount: 1.0,
		},
		service804n: {
			code804n: "A16.07.004.001",
			title: "Препарирование и снятие прецизионного оттиска под коронку из диоксида циркония",
			basePriceRub: 22000,
			category: "orthopedics",
		},
	},
	{
		id: "surgery_extraction_simple",
		title: "Частичная вторичная адентия / Удаление (K08.1)",
		shortBadge: "Удален",
		category: "surgery",
		icd10: "K08.1",
		icd10Label: "Частичная вторичная адентия",
		toothState: "Missing",
		defaultTooth: 48,
		complaint: "Жалобы на полное разрушение коронковой части зуба, невозможность терапевтического и ортопедического восстановления, подвижность.",
		anamnesis: "Зуб разрушался в течение длительного времени, неоднократные сколы стенок.",
		statusLocalis: "Разрушение коронковой части зуба ниже уровня десны, подвижность III степени. Слизистая оболочка вокруг зуба гиперемирована, отечна.",
		treatmentDescription: "Инфильтрационная и проводниковая анестезия (Артикаин 4% 1.7 мл) (infiltration anesthesia). Синдесмотомия распатором на глубину 3-5 мм. Наложение анатомических щипцов / элеватора, люксация, элевация, аккуратная тракция зуба из альвеолы (elevator/forceps). Тщательный кюретаж лунки острой ложкой, удаление грануляций (socket curettage). Гемостаз: формирование устойчивого сгустка, гемостатическая губка с антисептиком / Альвостаз (hemostasis). Сближение краев лунки, наложение швов (suture: Викрил 4-0). Давящий тампон на 20 минут.",
		anesthetic: {
			drugKey: "ultracain_ds_forte",
			carpulesCount: 1.0,
		},
		service804n: {
			code804n: "A16.07.007.001",
			title: "Удаление постоянного зуба простое с анестезией, кюретажем и швом",
			basePriceRub: 2500,
			category: "surgery",
		},
	},
	{
		id: "hygiene_complex",
		title: "Профгигиена полости рта и осмотр (Z01.2)",
		shortBadge: "Здоров",
		category: "hygiene",
		icd10: "Z01.2",
		icd10Label: "Стоматологическое обследование и гигиена",
		toothState: "Healthy",
		complaint: "Жалоб на момент осмотра активно не предъявляет. Обратился в плановом порядке для профилактического осмотра, снятия зубного налета и камня.",
		anamnesis: "Последняя профессиональная гигиена проводилась более 6 месяцев назад. Соматический статус без особенностей.",
		statusLocalis: "Зубные ряды санированы / интактны. Мягкий пигментированный налет и наддесневой зубной камень в области нижних фронтальных зубов. Десна бледно-розовая, умеренно отечна в области отложений, зубодесневое прикрепление не нарушено.",
		treatmentDescription: "Индикация зубного налета. Аппликационная анестезия десны. Ультразвуковое удаление над- и поддесневого зубного камня скейлером с водяным охлаждением (ultrasonic scaling). Снятие плотного пигментированного налета порошкоструйным аппаратом Air-Flow (порошок глицина/эритритола) (Air-Flow polishing). Полировка поверхностей зубов абразивной пастой Cleanic и резиновыми головками, межзубные контакты обработаны флоссом и штрипсами. Глубокое фторирование эмали препаратом Clinpro White Varnish / фторлаком (Clinpro fluoridation). Обучение индивидуальной гигиене.",
		service804n: {
			code804n: "A16.07.051",
			title: "Комплексная профессиональная гигиена полости рта (УЗ-скейлинг + Air-Flow + Clinpro)",
			basePriceRub: 5000,
			category: "hygiene",
		},
	},
	{
		id: "caries_initial_icon",
		title: "Начальный кариес / Инфильтрация Icon (K02.0)",
		shortBadge: "Icon / Пятно",
		category: "therapy",
		icd10: "K02.0",
		icd10Label: "Кариес эмали (в стадии пятна)",
		toothState: "Caries",
		defaultTooth: 11,
		complaint: "Жалобы на появление белого или пигментированного пятна на эмали зуба, легкую чувствительность от кислого/сладкого, эстетический дефект.",
		anamnesis: "Пятно появилось после снятия брекет-системы / в течение последних месяцев. Гигиена регулярная.",
		statusLocalis: "Матовое белое или светло-коричневое пятно на вестибулярной/окклюзионной поверхности без видимой полости. Поверхность шероховатая. Зонд не застревает. Перкуссия безболезненная. ЭОД 3 мкА.",
		treatmentDescription: "Очищение поверхности пастой без фтора Cleanic. Коффердам. Протравливание 15% гелем соляной кислоты Icon-Etch 2 мин, смывание водой, высушивание этанолом Icon-Dry. Нанесение полимерного инфильтранта Icon-Infiltrant на 3 мин, полимеризация 40 сек, повторное нанесение 1 мин и полимеризация 40 сек. Глубокое фторирование Clinpro White Varnish, финишная полировка головками Enhance до зеркального блеска.",
		service804n: {
			code804n: "A16.07.002.003",
			title: "Неинвазивное лечение начального кариеса методом инфильтрации Icon",
			basePriceRub: 3500,
			category: "therapy",
		},
	},
	{
		id: "caries_cementum_root",
		title: "Кариес цемента корня (K02.2)",
		shortBadge: "Кариес корня",
		category: "therapy",
		icd10: "K02.2",
		icd10Label: "Кариес цемента корня зуба",
		toothState: "Caries",
		defaultTooth: 24,
		complaint: "Жалобы на кратковременные боли от холодного, кислого и при чистке зубов в пришеечной области, застревание волокнистой пищи под десной.",
		anamnesis: "Дискомфорт возник после рецессии десны. Зуб ранее лечен по поводу некариозных поражений.",
		statusLocalis: "Пришеечная кариозная полость дефекта корня (V класс по Блэку) с размягченным дентином. Зондирование слабо болезненно. Перкуссия безболезненная. ЭОД 6 мкА.",
		treatmentDescription: "Инфильтрационная анестезия Септанест 1:100000 1.7 мл. Ретракционная нить Ultrapack #000 с гемостатиком ViscoStat Clear. Щадящая некрэктомия твердосплавным бором. Ирригация 2% хлоргексидином. Сэндвич-техника: поддесневой слой СИЦ Fuji II LC + послойное перекрытие нанокомпозитом Estelite Asteria. Финишная полировка головками Enhance и пастой Prisma Gloss. Покрытие фторлаком Clinpro.",
		anesthetic: {
			drugKey: "ultracain_ds_forte",
			carpulesCount: 1.0,
		},
		service804n: {
			code804n: "A16.07.002.002",
			title: "Лечение пришеечного кариеса цемента корня зуба (V класс)",
			basePriceRub: 4800,
			category: "therapy",
		},
	},
	{
		id: "caries_deep",
		title: "Глубокий кариес дентина (K02.1)",
		shortBadge: "Глуб. кариес",
		category: "therapy",
		icd10: "K02.1",
		icd10Label: "Кариес дентина (глубокий)",
		toothState: "Caries",
		defaultTooth: 16,
		complaint: "Жалобы на боли от температурных и химических раздражителей (холодное, сладкое), длительно не проходящие после устранения причины. Застревание пищи.",
		anamnesis: "Полость существует более полугода, болевые ощущения участились за последнюю неделю.",
		statusLocalis: "Глубокая кариозная полость в пределах околопульпарного дентина. Дно плотное, пигментированное, зондирование дна болезненно. Перкуссия безболезненна. ЭОД — 18-20 мкА.",
		treatmentDescription: "Анестезия (Артикаин 4% 1:200 000 1.7 мл). Препарирование кариозной полости, щадящая некрэктомия. Изоляция коффердамом. Антисептическая обработка 2% хлоргексидином. Лечебная прокладка Ca(OH)2 точечно на дно, изолирующая прокладка СИЦ. Адгезивный протокол (etching + primer/bond), послойная реставрация нанокомпозитом светового отверждения (composite layer) с восстановлением окклюзионной анатомии. Шлифовка, полировка (polishing) до сухого блеска.\n\nГарантийные обязательства: Гарантийный срок на световую композитную реставрацию — 24 мес. (срок службы: 36 мес.) при условии соблюдения гигиены и регулярного профосмотра.",
		anesthetic: {
			drugKey: "ultracain_ds",
			carpulesCount: 1.0,
		},
		service804n: {
			code804n: "A16.07.002.001",
			title: "Лечение глубокого кариеса с наложением лечебной/изолирующей прокладки",
			basePriceRub: 5500,
			category: "therapy",
		},
	},
	{
		id: "crown_adhesive_cementation",
		title: "Постоянная адгезивная фиксация коронки (Z51.8)",
		shortBadge: "Фиксация коронки",
		category: "orthopedics",
		icd10: "Z51.8",
		icd10Label: "Постоянная фиксация ортопедической конструкции",
		toothState: "Crown",
		defaultTooth: 16,
		complaint: "Визит на постоянную фиксацию изготовленной керамической / циркониевой коронки. Временная коронка стабильна, жалоб нет.",
		anamnesis: "Коронка изготовлена в зуботехнической лаборатории, этап примерки завершен успешно.",
		statusLocalis: "Временная коронка снята, культя зуба очищена ультразвуком и глицином. Десна бледно-розовая, плотная.",
		treatmentDescription: "Примерка коронки из диоксида циркония / прессованной керамики E.max. Оценка краевого прилегания, проксимальных контактов и окклюзионных взаимоотношений по артикуляционной бумаге 40 мкм. Подготовка конструкции: пескоструйная обработка CoJet / оксидом алюминия 50 мкм, протравливание керамики 9% плавиковой кислотой (HF) 20 сек, промывание, ультразвуковая очистка в спирте, нанесение силана (Silane) и высушивание горячим воздухом. Подготовка культи: коффердам, очистка пастой без фтора, адгезивный праймер. Фиксация на композитный цемент двойного отверждения (RelyX Ultimate / Panavia V5). Удаление излишков цемента в гелевой фазе, фотополимеризация по 20 сек с каждой поверхности под слоем глицеринового геля (Oxyguard). Финишная полировка краев.",
		service804n: {
			code804n: "A16.07.004.002",
			title: "Постоянная адгезивная фиксация коронки на композитный цемент двойного отверждения",
			basePriceRub: 3500,
			category: "orthopedics",
		},
	},
	{
		id: "implant_healing_abutment",
		title: "Установка формирователя десны ФДМ (K08.1)",
		shortBadge: "ФДМ (2 этап)",
		category: "surgery",
		icd10: "K08.1",
		icd10Label: "Второй хирургический этап дентальной имплантации",
		toothState: "Implant",
		defaultTooth: 36,
		complaint: "Плановый визит на 2-й хирургический этап имплантации после периода остеоинтеграции (3-6 месяцев). Жалоб нет.",
		anamnesis: "Имплантат установлен 4 месяца назад, остеоинтеграция протекала без осложнений.",
		statusLocalis: "Слизистая оболочка в области ранее установленного имплантата бледно-розовая, без признаков воспаления. Пальпация безболезненна. Рентген-контроль: стабильная остеоинтеграция имплантата, краевая резорбция кости отсутствует.",
		treatmentDescription: "Инфильтрационная анестезия (Артикаин 4% 1:200 000 1.7 мл). Миниинвазивный разрез слизистой оболочки (punch / линейный разрез) над шахтой имплантата. Визуализация платформы имплантата, выкручивание винта-заглушки. Антисептическая обработка шахты 0.05% хлоргексидином. Подбор и закручивание формирователя десны (Gingiva Former D 4.5 mm, H 3.0 mm) с усилием 10–15 Нсм. Адаптация краев слизистой, наложение шва (Викрил 5-0). Назначены антисептические ротовые ванночки.",
		anesthetic: {
			drugKey: "ultracain_ds",
			carpulesCount: 1.0,
		},
		service804n: {
			code804n: "A16.07.054.001",
			title: "Установка формирователя десны (ФДМ) на дентальный имплантат",
			basePriceRub: 4000,
			category: "surgery",
		},
	},
	{
		id: "perio_srp_curettage",
		title: "Хронический генерализованный пародонтит / Кюретаж + SRP (K05.3)",
		shortBadge: "Пародонтит K05.3",
		category: "therapy",
		icd10: "K05.3",
		icd10Label: "Хронический генерализованный пародонтит",
		toothState: "Periodontitis",
		defaultTooth: 41,
		complaint: "Жалобы на кровоточивость десен при чистке зубов и приеме пищи, подвижность зубов, неприятный запах изо рта, оголение шеек зубов, застревание пищи в межзубных промежутках.",
		anamnesis: "Кровоточивость беспокоит более года, регулярная чистка не устраняет запах. Семейный анамнез по пародонтиту отягощен.",
		statusLocalis: "Десна отёчна, застойная гиперемия, цианотична. Обильные над- и поддесневые минерализованные зубные отложения. Глубина пародонтальных карманов > 4 мм с серозно-гнойным экссудатом при компрессии. Патологическая подвижность I-II степени. На рентгенограмме: деструкция костной ткани межальвеолярных перегородок до 1/3–1/2 длины корня.",
		treatmentDescription: "Аппликационная и инфильтрационная анестезия (Артикаин 4% с эпинефрином 1:100 000 1.7 мл). Ультразвуковой скейлинг с удалением массивных поддесневых отложений (ultrasonic scaling) и обработка аппаратом Air-Flow Perio (порошок глицин). Закрытый кюретаж пародонтальных карманов кюретами Грейси (Gracey 1/2, 7/8, 11/12, 13/14) с удалением поддесневого камня, грануляций и токсичного цемента корня (Scaling and Root Planing / SRP). Антисептическая медикаментозная обработка 0.05% раствором хлоргексидина биглюконата и 0.1% повидон-йодом. Инстилляция противовоспалительного пародонтального геля (Метрогил Дента / Холисал). Обучение контролируемой индивидуальной гигиене полости рта, подбор межзубных ершиков. Контрольный осмотр и повторная перио-оценка через 10-14 дней.",
		anesthetic: {
			drugKey: "ultracain_ds_forte",
			carpulesCount: 1.0,
		},
		service804n: {
			code804n: "A16.07.011",
			title: "Закрытый кюретаж пародонтальных карманов и SRP скейлинг кюретами Грейси",
			basePriceRub: 6000,
			category: "therapy",
		},
	},
	{
		id: "pediatric_primary_tooth_extraction",
		title: "Удаление временного зуба при смене (K00.6)",
		shortBadge: "Смена мол. зуба",
		category: "surgery",
		icd10: "K00.6",
		icd10Label: "Физиологическая смена временного зуба / Резорбция корней",
		toothState: "Missing",
		defaultTooth: 74,
		complaint: "Жалобы на подвижность временного зуба, дискомфорт при приеме твердой пищи, прорезывание постоянного зуба-преемника.",
		anamnesis: "Зуб стал шататься около 2 месяцев назад, за ним прорезывается постоянный зуб.",
		statusLocalis: "Временный зуб с физиологической резорбцией корней III степени (коронка подвижна II-III степени). Десна бледно-розовая. На рентгенограмме/визиографии: полное рассасывание корней временного зуба, зачаток постоянного зуба в фазе активного прорезывания.",
		treatmentDescription: "Аппликационная анестезия (гель Лидокаин 15% / Дисилан с фруктовым вкусом). Деликатная люксация и удаление подвижной коронки временного зуба детскими анатомическими щипцами. Ревизия лунки. Гемостаз марлевым тампоном (2-3 мин). Пациенту и родителям выдана памятка по уходу и подарок за смелость.",
		service804n: {
			code804n: "A16.07.007.002",
			title: "Удаление временного зуба при физиологической смене",
			basePriceRub: 1500,
			category: "surgery",
		},
	},
	{
		id: "wedge_defect_cervical",
		title: "Клиновидный дефект (K03.1)",
		shortBadge: "Клин. дефект",
		category: "therapy",
		icd10: "K03.1",
		icd10Label: "Клиновидный дефект твердых тканей зуба",
		toothState: "Caries",
		defaultTooth: 14,
		complaint: "Жалобы на наличие ступенеобразного дефекта у десны, кратковременную чувствительность от холодного, кислого и при чистке зубов.",
		anamnesis: "Дефект углублялся в течение нескольких лет, пациент использует жесткую зубную щетку.",
		statusLocalis: "V-образный дефект твердых тканей в пришеечной области вестибулярной поверхности с плотными полированными стенками. Зондирование слабо болезненно. Перкуссия безболезненная. ЭОД 5 мкА.",
		treatmentDescription: "Инфильтрационная анестезия Септанест 1:100000 1.0 мл. Ретракция десны нитью Ultrapack #000 / кламп B4. Щадящая микроабразия дефекта мелкозернистым бором. Самопротравливающий адгезив Clearfil SE Bond. Восстановление эластичным нанокомпозитом Beautifil Flow Plus F00 + Estelite Asteria. Финишная полировка головками Enhance и пастой Prisma Gloss. Фторлак Clinpro.",
		anesthetic: {
			drugKey: "ultracain_ds_forte",
			carpulesCount: 1.0,
		},
		service804n: {
			code804n: "A16.07.003",
			title: "Восстановление зуба при клиновидном дефекте нанокомпозитом",
			basePriceRub: 4200,
			category: "therapy",
		},
	},
	{
		id: "hygiene_and_caries_mixed",
		title: "Комплексный приём: Профгигиена + Лечение кариеса (Z01.2 + K02.1)",
		shortBadge: "Гигиена + Кариес",
		category: "therapy",
		icd10: "K02.1",
		icd10Label: "Кариес дентина + Стоматологическое обследование и гигиена (Z01.2)",
		toothState: "Caries",
		defaultTooth: 16,
		complaint: "Комплексный плановый визит: 1) Жалобы на темный налет и зубные отложения, кровоточивость десен при чистке. 2) Жалобы на кратковременную чувствительность от холодного/сладкого и застревание пищи в области причинного зуба.",
		anamnesis: "Плановый визит после длительного перерыва (более 1 года).",
		statusLocalis: "1) Полость рта: обильные над- и поддесневые зубные отложения, пигментированный налет курильщика / чай / кофе. Десна умеренно отечна в области сосочков. 2) Причинный зуб: кариозная полость средней глубины в пределах плащевого дентина. Зондирование слабоболезненно по эмалево-дентинной границе. Холодовая проба быстропроходящая.",
		treatmentDescription: "1) Профессиональная гигиена полости рта: Ультразвуковой скейлинг с удалением минерализованных зубных отложений (ultrasonic scaling). Снятие пигментированного налета водно-порошкоструйным аппаратом Air-Flow (порошок глицина) (Air-Flow polishing). Полировка абразивной пастой Cleanic и щеточками. Межзубные контакты очищены флоссом. Глубокое фторирование эмали Clinpro White Varnish.\n\n2) Терапевтическое лечение кариеса: Инфильтрационная анестезия (Артикаин 4% 1.7 мл). Препарирование кариозной полости, полная некрэктомия. Изоляция коффердамом. Антисептическая обработка 2% хлоргексидином. Адгезивный протокол: кислотное травление эмали и дентина 37% H3PO4 (etching), нанесение адгезивной системы (adhesive: праймер + бонд). Послойное моделирование светоотверждаемым наногибридным композитом (composite layer) с восстановлением анатомической формы бугров. Шлифовка, полировка (polishing) до сухого зеркального блеска, контроль окклюзии.\n\nГарантийные обязательства: Гарантийный срок на световую композитную реставрацию — 24 мес. (срок службы: 36 мес.) при регулярном профосмотре 1 раз в 6 месяцев.",
		anesthetic: {
			drugKey: "ultracain_ds_forte",
			carpulesCount: 1.0,
		},
		service804n: {
			code804n: "A16.07.002.001",
			title: "Комплекс: Профгигиена + Лечение кариеса дентина световым композитом",
			basePriceRub: 8500,
			category: "therapy",
		},
	},
];

export interface ClinicalQuickPresetsBarProps {
	readonly onSelectPreset: (preset: ClinicalQuickPreset, targetTooth?: number | null) => void;
	readonly isLocked?: boolean;
	readonly className?: string;
	readonly onOpenPriceSearch?: () => void;
	readonly activeTooth?: number | null;
	readonly onSelectActiveTooth?: (tooth: number) => void;
}

const COMMON_FDI_TEETH = [16, 26, 36, 46, 11, 21, 31, 41, 14, 24, 34, 44, 18, 48];

export const ClinicalQuickPresetsBar: React.FC<ClinicalQuickPresetsBarProps> = ({
	onSelectPreset,
	isLocked = false,
	className = "",
	onOpenPriceSearch,
	activeTooth = null,
	onSelectActiveTooth,
}) => {
	const [activeCategory, setActiveCategory] = React.useState<string>("all");
	const [localSelectedTooth, setLocalSelectedTooth] = React.useState<number | null>(activeTooth ?? 16);

	React.useEffect(() => {
		if (activeTooth) {
			setLocalSelectedTooth(activeTooth);
		}
	}, [activeTooth]);

	const currentTooth = activeTooth ?? localSelectedTooth;

	const handleToothSelect = (tooth: number) => {
		setLocalSelectedTooth(tooth);
		if (onSelectActiveTooth) {
			onSelectActiveTooth(tooth);
		}
	};

	const handlePresetClick = (preset: ClinicalQuickPreset) => {
		if (isLocked) {
			showToast("Дневник подписан — вставка шаблона заблокирована", "info");
			return;
		}
		const effectiveTooth = preset.category !== "hygiene" ? (currentTooth || preset.defaultTooth || 16) : null;
		onSelectPreset(preset, effectiveTooth);
		const toothSuffix = effectiveTooth ? ` (Зуб ${effectiveTooth})` : "";
		showToast(`Применен 1-Click Smart-Bundle: «${preset.title}»${toothSuffix}`, "success", 3000);
	};

	const filteredPresets = React.useMemo(() => {
		if (activeCategory === "all") return CLINICAL_PRESETS;
		return CLINICAL_PRESETS.filter((p) => p.category === activeCategory);
	}, [activeCategory]);

	// 5 топ-экспресс сценариев для мгновенного заполнения в 1 клик
	const TOP_EXPRESS_PRESET_IDS = [
		"hygiene_complex",
		"caries_medium",
		"pulpitis_acute",
		"periodontitis_chronic",
		"surgery_extraction_simple",
	];

	const topExpressPresets = React.useMemo(() => {
		return TOP_EXPRESS_PRESET_IDS.map((id) =>
			CLINICAL_PRESETS.find((p) => p.id === id),
		).filter((p): p is ClinicalQuickPreset => Boolean(p));
	}, []);

	return (
		<div
			className={`clinical-quick-presets-bar p-4 rounded-2xl border border-[var(--border)] bg-[var(--paper-soft)] text-[var(--ink)] space-y-3.5 ${className}`.trim()}
			data-testid="clinical-quick-presets-bar"
		>
			{/* Шапка бара пресетов с подсказкой и кнопкой каталога */}
			<div className="flex items-center justify-between flex-wrap gap-2">
				<div className="flex items-center gap-2.5">
					<div className="flex items-center justify-center w-8 h-8 rounded-xl bg-[var(--teal-surface)] text-[var(--teal,var(--brand-primary))] border border-[var(--teal-soft)] shadow-2xs">
						<Zap size={18} />
					</div>
					<div>
						<h4 className="text-sm font-extrabold text-[var(--ink)] flex items-center gap-2">
							<span>1-Click Clinical Smart-Bundles (Протоколы СтАР)</span>
							<span className="text-xs px-2 py-0.5 rounded-md font-mono font-black bg-[var(--teal-surface)] text-[var(--teal,var(--brand-primary))] border border-[var(--teal-soft)]">
								МКБ-10 + Одонтограмма + 804н
							</span>
						</h4>
						<p className="text-xs text-[var(--muted)]">
							1 клик: Окрашивание зуба на схеме • Чистый SOAP 043/у • Анестетик (с соматическим алертом) • Услуга 804н
						</p>
					</div>
				</div>

				{onOpenPriceSearch && (
					<button
						type="button"
						onClick={onOpenPriceSearch}
						className="min-h-[48px] px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition-all flex items-center gap-2 cursor-pointer touch-manipulation active:scale-[0.98]"
						title="Быстрый поиск и добавление процедур из прайса клиники в протокол и счет"
						data-testid="btn-quick-add-from-pricelist"
					>
						<PlusCircle size={16} />
						<span>+ Каталог 804н</span>
					</button>
				)}
			</div>

			{/* ── АКТИВНЫЙ ЗУБ FDI (ДИНАМИЧЕСКИЙ ВЫБОР ДЛЯ SMART-BUNDLE) ── */}
			<div className="p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex items-center justify-between gap-2 flex-wrap shadow-2xs">
				<div className="flex items-center gap-2">
					<span className="text-xs font-black uppercase tracking-wider text-[var(--teal,var(--brand-primary))] flex items-center gap-1.5">
						<span>🦷</span>
						<span>Активный зуб:</span>
					</span>
					<span className="text-sm font-black font-mono px-2.5 py-1 rounded-lg bg-[var(--teal-surface)] text-[var(--teal-dark)] border border-[var(--teal-soft)] shadow-2xs">
						{currentTooth ? `Зуб FDI #${currentTooth}` : "Не выбран (общий осмотр)"}
					</span>
				</div>

				<div className="flex items-center gap-1.5 flex-wrap">
					<span className="text-[11px] font-bold text-[var(--muted)] mr-1 hidden sm:inline">
						Быстрый выбор:
					</span>
					{COMMON_FDI_TEETH.slice(0, 8).map((t) => (
						<button
							key={t}
							type="button"
							onClick={() => handleToothSelect(t)}
							className={`min-h-[48px] px-2.5 py-1 rounded-lg text-xs font-mono font-black border transition-all cursor-pointer touch-manipulation active:scale-95 ${
								currentTooth === t
									? "bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,white)] border-[var(--teal)] shadow-2xs"
									: "bg-[var(--paper-soft)] border-[var(--line)] text-[var(--ink)] hover:border-[var(--teal)]"
							}`}
							title={`Выбрать активным зуб FDI ${t}`}
							data-testid={`btn-select-active-tooth-${t}`}
						>
							{t}
						</button>
					))}
					<select
						value={currentTooth ?? 16}
						onChange={(e) => handleToothSelect(Number(e.target.value))}
						className="min-h-[48px] px-2 py-1 text-xs font-mono font-bold rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)]"
						title="Выбрать любой другой зуб из формулы"
					>
						{[18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28, 48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38].map((t) => (
							<option key={t} value={t}>
								Зуб {t}
							</option>
						))}
					</select>
				</div>
			</div>

			{/* ── ТОП-5 ЭКСПРЕСС-СЦЕНАРИЕВ (КРУПНЫЕ КНОПКИ >= 50px) ── */}
			<div className="space-y-1.5">
				<div className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
					<Sparkles size={14} className="text-amber-500" />
					<span>Главные экспресс-сценарии приема:</span>
				</div>
				<div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
					{topExpressPresets.map((preset) => {
						const isHygiene = preset.id === "hygiene_complex";
						const isCaries = preset.id === "caries_medium";
						const isPulpitis = preset.id === "pulpitis_acute";
						const isPerio = preset.id === "periodontitis_chronic";
						const isSurgery = preset.id === "surgery_extraction_simple";

						const bgGradient = isHygiene
							? "bg-[var(--ok-bg)] text-[var(--ok-fg)] border border-[var(--ok-fg)]/30 hover:opacity-90"
							: isCaries
								? "bg-blue-500/15 text-blue-800 dark:text-blue-200 border-blue-500/30 hover:bg-blue-500/25"
								: isPulpitis
									? "bg-rose-500/15 text-rose-800 dark:text-rose-200 border-rose-500/30 hover:bg-rose-500/25"
									: isPerio
										? "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/30 hover:bg-amber-500/25"
										: "bg-purple-500/15 text-purple-800 dark:text-purple-200 border-purple-500/30 hover:bg-purple-500/25";

						const dynamicBadge = isHygiene
							? "Профгигиена"
							: isSurgery
								? currentTooth ? `Удаление ${currentTooth}` : "Удаление"
								: currentTooth
									? `${preset.shortBadge.replace(/\s*\d{2}/, "")} ${currentTooth}`
									: preset.shortBadge;

						return (
							<button
								key={`top-${preset.id}`}
								type="button"
								onClick={() => handlePresetClick(preset)}
								disabled={isLocked}
								className={`min-h-[50px] px-3.5 py-2.5 rounded-xl text-sm sm:text-base font-extrabold border transition-all flex flex-col items-start justify-center gap-1 cursor-pointer shadow-xs active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation text-left ${bgGradient}`}
								title={`${preset.title} · МКБ-10: ${preset.icd10}`}
								data-testid={`express-preset-${preset.id}`}
							>
								<div className="flex items-center justify-between w-full gap-1.5">
									<div className="flex items-center gap-1.5 min-w-0">
										{isHygiene && <Sparkles size={17} className="text-[var(--ok-fg)] shrink-0" />}
										{isCaries && <Stethoscope size={17} className="text-blue-600 dark:text-blue-400 shrink-0" />}
										{isPulpitis && <Flame size={17} className="text-rose-600 dark:text-rose-400 shrink-0" />}
										{isPerio && <HeartPulse size={17} className="text-amber-600 dark:text-amber-400 shrink-0" />}
										{isSurgery && <Bone size={17} className="text-purple-600 dark:text-purple-400 shrink-0" />}
										<span className="truncate font-black">{dynamicBadge}</span>
									</div>
									<span className="text-xs font-mono px-1.5 py-0.5 rounded bg-[var(--paper)] text-[var(--ink)] border border-[var(--border)] font-bold shrink-0">
										{preset.icd10}
									</span>
								</div>
								<span className="text-xs font-medium text-[var(--muted)] truncate w-full">
									{isHygiene ? "Осмотр, Air-Flow, фторирование" : isCaries ? "Кариес → Пломба + 804н" : isPulpitis ? "Анестезия + Экстирпация + Ca(OH)2" : isPerio ? "Распломбировка + Calcept" : "Удаление + Гемостаз + Шов"}
								</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* ── КАТЕГОРИИ И ПОЛНЫЙ КАТАЛОГ ШАБЛОНОВ ── */}
			<div className="space-y-2 pt-1 border-t border-[var(--border)]">
				<div className="flex items-center justify-between gap-2 flex-wrap">
					<div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--paper)] border border-[var(--border)] overflow-x-auto flex-nowrap">
						{[
							{ id: "all", label: "Все шаблоны" },
							{ id: "therapy", label: "Терапия" },
							{ id: "surgery", label: "Хирургия" },
							{ id: "orthopedics", label: "Ортопедия" },
							{ id: "hygiene", label: "Гигиена" },
						].map((cat) => (
							<button
								key={cat.id}
								type="button"
								onClick={() => setActiveCategory(cat.id)}
								className={`min-h-[48px] px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap touch-manipulation ${
									activeCategory === cat.id
										? "bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,white)] shadow-xs"
										: "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)]"
								}`}
							>
								{cat.label}
							</button>
						))}
					</div>
					<span className="text-xs font-semibold text-[var(--muted)]">
						Показано: {filteredPresets.length} из {CLINICAL_PRESETS.length}
					</span>
				</div>

				<div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 min-w-0">
					{filteredPresets.map((preset) => {
						const categoryBadgeColor =
							preset.category === "therapy"
								? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20 hover:bg-blue-500/20"
								: preset.category === "surgery"
									? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20 hover:bg-rose-500/20"
									: preset.category === "orthopedics"
										? "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20 hover:bg-purple-500/20"
										: "bg-[var(--ok-bg)] text-[var(--ok-fg)] border border-[var(--ok-fg)]/20 hover:opacity-90";

						const badgeTitle = preset.category !== "hygiene" && currentTooth
							? `${preset.shortBadge} ${currentTooth}`
							: preset.shortBadge;

						return (
							<button
								key={preset.id}
								type="button"
								onClick={() => handlePresetClick(preset)}
								disabled={isLocked}
								className={`min-h-[48px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all flex items-center justify-between gap-2 cursor-pointer shadow-xs active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed min-w-0 break-words touch-manipulation ${categoryBadgeColor}`}
								title={`${preset.title} · МКБ-10: ${preset.icd10}${preset.service804n ? ` · Услуга: ${preset.service804n.title}` : ""}`}
								data-testid={`quick-preset-${preset.id}`}
							>
								<div className="flex items-center gap-1.5 min-w-0 truncate">
									{preset.category === "therapy" && <Stethoscope size={15} className="shrink-0" />}
									{preset.category === "surgery" && <Bone size={15} className="shrink-0" />}
									{preset.category === "orthopedics" && <Crown size={15} className="shrink-0" />}
									{preset.category === "hygiene" && <Sparkles size={15} className="shrink-0" />}
									<span className="font-extrabold truncate">{badgeTitle}</span>
								</div>
								<span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-[var(--paper)] text-[var(--muted)] border border-[var(--border)] shrink-0 font-bold">
									{preset.icd10}
								</span>
							</button>
						);
					})}
				</div>
			</div>
		</div>
	);
};
