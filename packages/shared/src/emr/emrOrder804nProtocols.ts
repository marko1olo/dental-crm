/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EMR FORM 043/U ORDER 804N STATUTORY SERVICES & CLINICAL PROTOCOLS
 * Implementation according to Order of the Ministry of Health № 804n / № 834n
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { SoapVisitDiary, ToothSurface } from "../documents/forms043u.js";
import { getClinicalProtocolTemplate } from "./emrProtocolPresets.js";

export interface Order804nProtocolDefinition {
	readonly code: string;
	readonly nameRu: string;
	readonly primaryIcd10: string;
	readonly protocolStepRu: string;
	readonly defaultSubjective?: string;
	readonly defaultStatusLocalis?: string;
	readonly requiredMaterials?: readonly string[];
}

export const ORDER_804N_PROTOCOL_DEFINITIONS: Record<string, Order804nProtocolDefinition> = {
	"A16.07.002.001": {
		code: "A16.07.002.001",
		nameRu: "Наложение пломбы из фотополимерного материала при лечении кариозных полостей (I, V, VI класс по Блэку)",
		primaryIcd10: "K02.1",
		protocolStepRu: "Изоляция рабочего поля коффердамом. Препарирование кариозной полости (I/V/VI класс по Блэку), некрэктомия, формирование эмалевого фальца. Медикаментозная антисептическая обработка 2% раствором хлоргексидина. Селективное кислотное травление эмали 37% ортофосфорной кислотой (20 сек), промывание, бережное высушивание без пересушивания дентина. Нанесение универсальной адгезивной системы (OptiBond FL / Prime&Bond), экспозиция 20 сек, раздувание воздухом, фотополимеризация 20 сек. Послойное моделирование наногибридным светоотверждаемым композитом (Filtek Ultimate / Estelite Asteria) с анатомическим восстановлением фиссур и бугров. Финишная окклюзионная пришлифовка по артикуляционной бумаге, шлифовка и полировка (диски Enhance, полиры, алмазная паста) до сухого зеркального блеска.",
		defaultSubjective: "Жалобы на кратковременные боли от холодного и сладкого, застревание пищи.",
		defaultStatusLocalis: "Кариозная полость средней глубины в пределах плащевого дентина. Зондирование слабоболезненно по эмалево-дентинной границе.",
		requiredMaterials: ["Коффердам", "37% H3PO4 гель", "Адгезивная система OptiBond FL", "Нанокомпозит Filtek/Estelite", "Полировочная система Enhance"],
	},
	"A16.07.002.002": {
		code: "A16.07.002.002",
		nameRu: "Наложение пломбы из фотополимерного материала при лечении кариозных полостей (II, III класс по Блэку)",
		primaryIcd10: "K02.1",
		protocolStepRu: "Изоляция операционного поля системой коффердам. Препарирование контактной кариозной полости (II/III класс по Блэку), атравматичная некрэктомия. Установка секционной контурной матрицы (Garrison / Tor VM) и анатомического клина, создание плотного контактного пункта с соседним зубом. Медикаментозная обработка 2% хлоргексидином. Тотальное/селективное травление 37% ортофосфорной кислотой, адгезивный протокол (праймер + бонд), полимеризация 20 сек. Адаптационный слой текучего композита (Flowable), послойная реставрация наногибридным композитом. Снятие матрицы, финирование контактного пункта штрипсами, полировка до сухого зеркального блеска.",
		defaultSubjective: "Жалобы на застревание волокнистой пищи между зубами, дефект контактного края, кратковременную чувствительность на сладкое.",
		defaultStatusLocalis: "Кариозная полость на контактной поверхности, переходящая на жевательную. Зондирование по эмалево-дентинной границе чувствительно.",
		requiredMaterials: ["Коффердам", "Секционная матричная система Garrison", "Анатомические клинья", "37% гель", "Адгезив", "Текучий и пакуемый нанокомпозит"],
	},
	"A16.07.002.003": {
		code: "A16.07.002.003",
		nameRu: "Наложение пломбы из фотополимерного материала при лечении кариозных полостей (IV класс по Блэку с восстановлением режущего края)",
		primaryIcd10: "K02.1",
		protocolStepRu: "Изоляция коффердамом. Препарирование дефекта с созданием широкого скоса эмали (бевеля) 1.5-2 мм на вестибулярной поверхности для оптической интеграции. Применение силиконового ключа (Palatal Silicone Index). Медикаментозная обработка 2% хлоргексидином. Адгезивный протокол V/IV поколения. Восстановление нёбной стенки эмалевым оттенком композита по силиконовому ключу, моделирование дентинных мамелонов опаковым композитом, характеризация прозрачным эмалевым слоем (Incisal Translucent). Полимеризация каждого слоя 20 сек. Окклюзионный контроль в статике и динамике (протрузия/латеротрузия), полировка дисками Sof-Lex и щетками с пастой Prisma Gloss.",
		defaultSubjective: "Жалобы на скол режущего края фронтального зуба, эстетический дефект, шероховатость при касании языком.",
		defaultStatusLocalis: "Дефект коронковой части зуба с вовлечением режущего края и контактного угла (IV класс по Блэку). Зондирование безболезненно, ЭОД 4-6 мкА.",
		requiredMaterials: ["Коффердам", "Силиконовый ключ", "Опаковый и эмалевый нанокомпозиты", "Диски Sof-Lex", "Алмазная полировочная паста"],
	},
	"A16.07.031": {
		code: "A16.07.031",
		nameRu: "Препарирование твердых тканей зуба при лечении кариеса",
		primaryIcd10: "K02.1",
		protocolStepRu: "Препарирование твердых тканей зуба турбинным наконечником с водно-воздушным охлаждением. Раскрытие кариозной полости, полная щадящая некрэктомия размягченного дентина твердосплавными борами на микромоторе под контролем кариес-маркера (Caries Detector). Финирование краев эмали мелкозернистыми алмазными борами.",
		defaultSubjective: "Жалобы на наличие кариозной полости и застревание пищи.",
		defaultStatusLocalis: "Кариозная полость средней глубины с пигментированным дентином.",
		requiredMaterials: ["Твердосплавные боры", "Кариес-маркер Caries Detector", "Алмазные финиры"],
	},
	"A16.07.030.001": {
		code: "A16.07.030.001",
		nameRu: "Инструментальная и медикаментозная обработка одного корневого канала",
		primaryIcd10: "K04.0",
		protocolStepRu: "Изоляция зуба системой коффердам. Эндодонтический доступ, раскрытие полости зуба, нахождение устья корневого канала. Первичное скаутирование ручными К-файлами #10. Определение рабочей длины канала электронным апекслокатором (Apex 0.0) и контрольной радиовизиографией. Механическая инструментальная обработка никель-титановыми ротационными инструментами (WaveOne Gold / ProTaper Ultimate) с созданием конусности .06. Обильная медикаментозная ирригация 3% раствором гипохлорита натрия (NaOCl) и 17% раствором ЭДТА с ультразвуковой активацией (EndoActivator). Финишный лаваж дистиллированной водой, высушивание канала стерильными бумажными штифтами.",
		defaultSubjective: "Жалобы на острые самопроизвольные приступообразные ночные боли в зубе, усиливающиеся от температурных раздражителей.",
		defaultStatusLocalis: "Глубокая кариозная полость, сообщающаяся с полостью зуба. Зондирование вскрытой точки рога пульпы резко болезненно.",
		requiredMaterials: ["Коффердам", "Апекслокатор Root ZX", "Ротационные файлы NiTi", "3% NaOCl", "17% ЭДТА", "Бумажные штифты"],
	},
	"A16.07.008.001": {
		code: "A16.07.008.001",
		nameRu: "Пломбирование одного корневого канала гуттаперчевыми штифтами",
		primaryIcd10: "K04.0",
		protocolStepRu: "Припасовка мастер-штифта гуттаперчи с проверкой эффекта заклинивания (tug-back) на рабочей длине. Трехмерная герметичная обтурация корневого канала разогретой термопластифицированной гуттаперчей с эпоксидным силером AH Plus методом вертикальной конденсации (Continuous Wave of Condensation). Устье канала герметично запечатано светоотверждаемым стеклоиономерным цементом. Контрольная прицельная радиовизиография: канал обтурирован гомогенно, плотно до физиологического апекса, без выведения силера за верхушку.",
		defaultSubjective: "Жалоб на момент обтурации не предъявляет.",
		defaultStatusLocalis: "Корневой канал сухой, чистый, без запаха и экссудации. Перкуссия зуба безболезненна.",
		requiredMaterials: ["Гуттаперчевые штифты", "Эпоксидный силер AH Plus", "Стеклоиономерный цемент", "Контрольная радиовизиография"],
	},
	"A16.07.001.001": {
		code: "A16.07.001.001",
		nameRu: "Удаление постоянного зуба (простое)",
		primaryIcd10: "K08.1",
		protocolStepRu: "Местная инфильтрационная / проводниковая анестезия (Артикаин 4% 1.7 мл). Синдесмотомия — отслоение круговой связки зуба на глубину 3-4 мм распатором. Наложение анатомических щипцов, продвижение щечек под десну, фиксация, люксация в щечно-язычном направлении, аккуратная тракция зуба из альвеолы без повреждения кортикальных пластинок. Ревизия и щадящий кюретаж лунки острой ложкой, удаление грануляций. Достижение стабильного гемостаза с формированием плотного кровяного сгустка, введение антисептической гемостатической губки. Сближение краев лунки, давящий стерильный марлевый тампон на 20 минут.",
		defaultSubjective: "Жалобы на сильное разрушение коронковой части зуба, невозможность восстановления.",
		defaultStatusLocalis: "Коронка зуба разрушена ниже уровня десны, корни подвижны/несостоятельны.",
		requiredMaterials: ["Распатор", "Анатомические щипцы", "Кюретажная ложка", "Гемостатическая губка Альвостаз/Spongostan"],
	},
	"A16.07.051": {
		code: "A16.07.051",
		nameRu: "Профессиональная гигиена полости рта и зубов",
		primaryIcd10: "K05.0",
		protocolStepRu: "Индикация зубного налета 2-х компонентным раствором. Аппликационное обезболивание десны лидокаин-спреем 10%. Ультразвуковое удаление минерализованных наддесневых и поддесневых зубных отложений (скейлинг) насадками EMS. Снятие плотного пигментированного налета и биопленки аппаратом Air-Flow мелкодисперсным порошком на основе глицина/эритритола. Полировка поверхностей зубов абразивной пастой Cleanic и щеточками. Обработка межзубных промежутков флоссом и полировочными штрипсами. Глубокое фторирование эмали и дентина препаратом Clinpro White Varnish.",
		defaultSubjective: "Жалобы на темный налет на зубах, кровоточивость десен при чистке зубов, неприятный запах изо рта.",
		defaultStatusLocalis: "Обильный мягкий налет, над- и поддесневой зубной камень, гиперемия и отечность десневых сосочков (PBI > 1).",
		requiredMaterials: ["Индикатор налета", "УЗ-насадки", "Порошок Air-Flow глицин", "Паста Cleanic", "Фторлак Clinpro White Varnish"],
	},
	"A16.07.004": {
		code: "A16.07.004",
		nameRu: "Восстановление зуба коронкой",
		primaryIcd10: "K08.1_ORTHO",
		protocolStepRu: "Местная инфильтрационная / проводниковая анестезия. Препарирование твердых тканей культи зуба под искусственную коронку с созданием кругового уступа типа Chamfer (ширина 0.8–1.0 мм) с водно-воздушным охлаждением. Ретракция краевой десны одинарной/двойной нитью Ultrapak #00/#0 с гемостатиком. Получение прецизионного двухслойного оттиска А-силиконовой массой (Honigum / Express XT) и оттиска зубного ряда антагонистов. Изготовление провизорной пластмассовой коронки прямым методом (Protemp 4), припасовка, полировка и временная фиксация на безэвгенольный цемент Temp-Bond NE.",
		defaultSubjective: "Жалобы на разрушение твердых тканей зуба более 50%, необходимость ортопедического восстановления.",
		defaultStatusLocalis: "Дефект твердых тканей зуба ИРОПЗ > 0.6. Зуб девитализирован, каналы обтурированы до апекса.",
		requiredMaterials: ["Алмазные боры для препарирования", "Ретракционная нить Ultrapak", "А-силиконовый слепочный материал", "Материал для временных коронок Protemp 4", "Цемент Temp-Bond NE"],
	},
	"B01.003.004.005": {
		code: "B01.003.004.005",
		nameRu: "Проводниковая/инфильтрационная анестезия",
		primaryIcd10: "K02.1",
		protocolStepRu: "Антисептическая обработка места инъекции. Местная анестезия: Артикаин 4% с эпинефрином 1:100 000 (1.7 мл). Проведена аспирационная проба (отрицательная). Обезболивание глубокое, наступило через 2–3 минуты, осложнений нет.",
		defaultSubjective: "Аллергологический анамнез не отягощен, ранее местную анестезию переносил(а) хорошо.",
		defaultStatusLocalis: "Слизистая оболочка в месте вкола бледно-розовая, без воспалительных явлений.",
		requiredMaterials: ["Карпульный шприц", "Карпула Артикаин 4% 1.7 мл", "Стерильная карпульная игла 30G"],
	},
};

/**
 * Опции для интеллектуального обогащения дневниковой записи на основе кодов 804н
 */
export interface EnrichDiaryFrom804nOptions {
	readonly toothNumber?: number | string | null | undefined;
	readonly surfaces?: readonly ToothSurface[] | null | undefined;
	readonly preserveCustomText?: boolean | undefined;
	readonly doctorFullName?: string | null | undefined;
	readonly doctorSpecialty?: string | null | undefined;
}

/**
 * Синтезирует структурированный клинический протокол и дневник на основе выбранной услуги Номенклатуры 804н
 */
export function synthesizeProtocolFromOrder804nService(
	code804n: string,
	options?: EnrichDiaryFrom804nOptions,
): Order804nProtocolDefinition {
	const cleanCode = code804n.trim();
	const direct = ORDER_804N_PROTOCOL_DEFINITIONS[cleanCode];
	if (direct) {
		return direct;
	}

	// Поиск по префиксу: например A16.07.030.* -> эндодонтия, A16.07.008.* -> обтурация, A16.07.001.* -> удаление, A16.07.002.* -> пломба
	if (cleanCode.startsWith("A16.07.002")) {
		return ORDER_804N_PROTOCOL_DEFINITIONS["A16.07.002.001"]!;
	}
	if (cleanCode.startsWith("A16.07.030")) {
		return ORDER_804N_PROTOCOL_DEFINITIONS["A16.07.030.001"]!;
	}
	if (cleanCode.startsWith("A16.07.008")) {
		return ORDER_804N_PROTOCOL_DEFINITIONS["A16.07.008.001"]!;
	}
	if (cleanCode.startsWith("A16.07.001")) {
		return ORDER_804N_PROTOCOL_DEFINITIONS["A16.07.001.001"]!;
	}
	if (cleanCode.startsWith("A16.07.051") || cleanCode.startsWith("A16.07.020")) {
		return ORDER_804N_PROTOCOL_DEFINITIONS["A16.07.051"]!;
	}
	if (cleanCode.startsWith("A16.07.004")) {
		return ORDER_804N_PROTOCOL_DEFINITIONS["A16.07.004"]!;
	}
	if (cleanCode.startsWith("B01.003.004")) {
		return ORDER_804N_PROTOCOL_DEFINITIONS["B01.003.004.005"]!;
	}

	// Дефолтный ответ
	return {
		code: cleanCode,
		nameRu: `Стоматологическая услуга ${cleanCode}`,
		primaryIcd10: "K02.1",
		protocolStepRu: `Выполнено медицинское вмешательство по коду ${cleanCode} в полном объеме согласно клиническим рекомендациям СтАР.`,
		defaultSubjective: "Жалобы соответствуют клиническому диагнозу.",
		defaultStatusLocalis: "Объективный статус осмотра зафиксирован.",
		requiredMaterials: ["Стандартный стоматологический набор"],
	};
}

/**
 * 100% неразрушающее обогащение дневника 043/у при выборе услуг 804н.
 * Защищает от потери любой введенный врачом текст (жалобы, анамнез, сопутствующие патологии).
 */
export function enrichDiaryFrom804nServices(
	existingDiary: Partial<SoapVisitDiary> | any,
	services804n: readonly (string | { code: string })[],
	options?: EnrichDiaryFrom804nOptions,
): SoapVisitDiary {
	const codes = services804n.map((s) => (typeof s === "string" ? s : s.code).trim());
	const definitions = codes.map((c) => synthesizeProtocolFromOrder804nService(c, options));
	const primaryDef = definitions[0];

	// 1. Жалобы (S): если введены врачом — сохраняем 100%
	let complaints = (existingDiary?.subjectiveComplaints || "").trim();
	if (!complaints && primaryDef?.defaultSubjective) {
		complaints = primaryDef.defaultSubjective;
	}

	// 2. Статус (O): если введен врачом — сохраняем 100%
	let statusLocalis = (existingDiary?.objectiveStatusLocalis || "").trim();
	if (!statusLocalis && primaryDef?.defaultStatusLocalis) {
		statusLocalis = primaryDef.defaultStatusLocalis;
	}

	// 3. Протокол лечения (P): обогащаем шагами процедур, избегая дублирования
	let currentProtocol = (existingDiary?.procedureProtocol || "").trim();
	const newSteps: string[] = [];

	for (const def of definitions) {
		if (def.protocolStepRu && !currentProtocol.includes(def.protocolStepRu)) {
			newSteps.push(def.protocolStepRu);
		}
	}

	let updatedProtocol = currentProtocol;
	if (newSteps.length > 0) {
		if (updatedProtocol) {
			updatedProtocol = `${updatedProtocol}\n\n${newSteps.join("\n\n")}`;
		} else {
			updatedProtocol = newSteps.join("\n\n");
		}
	}

	// 4. МКБ-10: выставляем основной код, если не был указан
	const icd10 = existingDiary?.assessmentIcd10Code || primaryDef?.primaryIcd10 || "K02.1";
	const diagText = existingDiary?.assessmentDiagnosisText || getClinicalProtocolTemplate(icd10).clinicalDiagnosis;

	// 5. Материалы: объединяем с дедупликацией
	const existingMaterials = (existingDiary?.appliedMaterials || "")
		.split(";")
		.map((s: string) => s.trim())
		.filter(Boolean);
	const newMaterials = definitions.flatMap((d) => d.requiredMaterials || []);
	const mergedMaterials = Array.from(new Set([...existingMaterials, ...newMaterials]));

	const toothNum = options?.toothNumber ? String(options.toothNumber) : (existingDiary?.toothNumber ?? null);

	return {
		entryDate: existingDiary?.entryDate || new Date().toISOString().split("T")[0] || "2026-08-25",
		toothNumber: toothNum,
		subjectiveComplaints: complaints,
		objectiveStatusLocalis: statusLocalis,
		percussionVertical: existingDiary?.percussionVertical || "negative",
		percussionHorizontal: existingDiary?.percussionHorizontal || "negative",
		probingTenderness: existingDiary?.probingTenderness || "none",
		thermalTestResponse: existingDiary?.thermalTestResponse || "indifferent",
		eodMicroamperes: existingDiary?.eodMicroamperes ?? null,
		assessmentDiagnosisText: diagText,
		assessmentIcd10Code: icd10,
		procedureProtocol: updatedProtocol,
		anesthesiaDetails: existingDiary?.anesthesiaDetails ?? null,
		appliedMaterials: mergedMaterials.length > 0 ? mergedMaterials.join("; ") : null,
		homeCareRecommendations: existingDiary?.homeCareRecommendations || getClinicalProtocolTemplate(icd10).defaultRecommendations,
		nextVisitDate: existingDiary?.nextVisitDate ?? null,
		doctorFullName: existingDiary?.doctorFullName || options?.doctorFullName || "Врач-стоматолог",
	};
}

