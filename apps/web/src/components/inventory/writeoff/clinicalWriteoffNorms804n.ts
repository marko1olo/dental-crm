import type { Order804nServiceNorm } from "./clinicalWriteoffPresets.js";

/**
 * 4. Технологические карты и нормы расхода материалов по Приказу Минздрава РФ № 804н
 */
export const ORDER_804N_SERVICE_NORMS: readonly Order804nServiceNorm[] = [
	// A16.07.002.001 — Пломбирование зуба композитом светового отверждения
	{
		serviceCode: "A16.07.002.001",
		serviceTitle: "Наложение пломбы из фотополимерного композита при лечении кариозных полостей",
		specialty: "therapy",
		descriptionRu: "Препарирование кариозной полости, адгезивный протокол, послойное внесение композита и финишная полировка",
		standardDurationMinutes: 45,
		materials: [
			{
				materialId: "mat_articaine_ultracain",
				standardQuantity: 1,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 0,
				clinicalRationaleRu: "1 карпула (1.7 мл) местного анестетика артикаинового ряда с вазоконстриктором",
			},
			{
				materialId: "mat_dental_needle_30g",
				standardQuantity: 1,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 0,
				clinicalRationaleRu: "1 карпульная игла 30G евростандарт 25 мм",
			},
			{
				materialId: "mat_cofferdam_sheet",
				standardQuantity: 1,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 0,
				clinicalRationaleRu: "Платок коффердама для абсолютной изоляции рабочего поля от слюны",
			},
			{
				materialId: "mat_matrix_sectional_system",
				standardQuantity: 1,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 0,
				clinicalRationaleRu: "Секционная 3D матрица и анатомический клин для формирования контактного пункта",
			},
			{
				materialId: "mat_dental_burs_set",
				standardQuantity: 1,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 0,
				clinicalRationaleRu: "Алмазный турбинный бор для препарирования кариозной полости",
			},
			{
				materialId: "mat_filtek_ultimate",
				standardQuantity: 0.3,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 30,
				clinicalRationaleRu: "0.3 г наногибридного композита на среднюю кариозную полость I-V классов",
			},
			{
				materialId: "mat_single_bond_universal",
				standardQuantity: 0.05,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 20,
				clinicalRationaleRu: "1 капля самопротравливающего адгезива на браш",
			},
			{
				materialId: "mat_phosphoric_acid_37",
				standardQuantity: 0.1,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 20,
				clinicalRationaleRu: "Селективное протравливание эмалевого края",
			},
			{
				materialId: "mat_polishing_enhance",
				standardQuantity: 1,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 0,
				clinicalRationaleRu: "Финишная обработка контура пломбы",
			},
			{
				materialId: "mat_saliva_ejector",
				standardQuantity: 1,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 0,
				clinicalRationaleRu: "Эвакуация слюны на время постановки пломбы",
			},
			{
				materialId: "mat_cotton_rolls",
				standardQuantity: 4,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 50,
				clinicalRationaleRu: "Изоляция рабочего поля со стороны щеки и языка",
			},
			{
				materialId: "mat_nitrile_gloves",
				standardQuantity: 1,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 0,
				clinicalRationaleRu: "1 пара нитриловых перчаток врача",
			},
			{
				materialId: "mat_surgical_mask",
				standardQuantity: 1,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 0,
				clinicalRationaleRu: "1 маска защитная трехслойная",
			},
		],
	},

	// A16.07.008 — Пломбирование корневого канала гуттаперчей
	{
		serviceCode: "A16.07.008",
		serviceTitle: "Пломбирование корневого канала зуба гуттаперчевыми штифтами",
		specialty: "endodontics",
		descriptionRu: "Антисептическая обработка, ирригация, калибровка мастер-штифта и постоянная обтурация силером AH Plus",
		standardDurationMinutes: 60,
		materials: [
			{
				materialId: "mat_gutta_percha_points",
				standardQuantity: 3,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 33,
				clinicalRationaleRu: "3 конусных штифта (.04/.06) на 1 корневой канал при латеральной/вертикальной компакции",
			},
			{
				materialId: "mat_sealer_ah_plus",
				standardQuantity: 0.1,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 30,
				clinicalRationaleRu: "0.1 г эпоксидного силера AH Plus на 1 корневой канал",
			},
			{
				materialId: "mat_hypochlorite_na_3",
				standardQuantity: 10,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 50,
				clinicalRationaleRu: "10 мл гипохлорита натрия 3% для протокола ультразвуковой активации ирригации",
			},
			{
				materialId: "mat_edta_gel_17",
				standardQuantity: 3,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 30,
				clinicalRationaleRu: "3 мл 17% геля ЭДТА для удаления неорганического смазанного слоя",
			},
			{
				materialId: "mat_endo_needle_side_vent",
				standardQuantity: 2,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 0,
				clinicalRationaleRu: "2 эндодонтические иглы с боковым спилом для растворов гипохлорита и ЭДТА",
			},
			{
				materialId: "mat_paper_points",
				standardQuantity: 4,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 50,
				clinicalRationaleRu: "Бумажные пины для идеального осушения перед герметизацией",
			},
		],
	},

	// A16.07.054 — Установка дентального имплантата
	{
		serviceCode: "A16.07.054",
		serviceTitle: "Внутрикостная дентальная имплантация (установка титанового имплантата)",
		specialty: "implantology",
		descriptionRu: "Хирургический протокол формирования костного ложа, установка имплантата, фиксация формирователя десны и наложение швов",
		standardDurationMinutes: 60,
		materials: [
			{
				materialId: "mat_implant_osstem_ts3",
				standardQuantity: 1,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 0,
				clinicalRationaleRu: "Дентальный имплантат Osstem TS III с индивидуальным серийным номером",
			},
			{
				materialId: "mat_healing_abutment",
				standardQuantity: 1,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 0,
				clinicalRationaleRu: "Формирователь десны или винт-заглушка на платформу имплантата",
			},
			{
				materialId: "mat_surg_drape_gown_set",
				standardQuantity: 1,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 0,
				clinicalRationaleRu: "Стерильное операционное накрытие пациента и хирурга",
			},
			{
				materialId: "mat_suture_vicryl_40",
				standardQuantity: 1,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 0,
				clinicalRationaleRu: "Шовный материал Викрил / Монофил 4-0 для надежной кооптации краев раны",
			},
			{
				materialId: "mat_surg_blade_15",
				standardQuantity: 1,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 0,
				clinicalRationaleRu: "Стерильное лезвие скальпеля №15 для краевого разреза слизистой",
			},
			{
				materialId: "mat_saline_500ml",
				standardQuantity: 1,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 0,
				clinicalRationaleRu: "Охлаждающий физиологический раствор для физиодиспенсера",
			},
		],
	},

	// A16.07.004 — Местная анестезия (проводниковая / общая)
	{
		serviceCode: "A16.07.004",
		serviceTitle: "Анестезия местная инфильтрационная / проводниковая",
		specialty: "general",
		descriptionRu: "Обезболивание зоны манипуляции раствором артикаина с адреналином",
		standardDurationMinutes: 10,
		materials: [
			{
				materialId: "mat_articaine_ultracain",
				standardQuantity: 1,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 0,
				clinicalRationaleRu: "1 карпула (1.7 мл) Ультракаина Д-С",
			},
			{
				materialId: "mat_dental_needle_30g",
				standardQuantity: 1,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 0,
				clinicalRationaleRu: "1 карпульная игла 30G евростандарт",
			},
			{
				materialId: "mat_topical_anesthesia_gel",
				standardQuantity: 0.2,
				isMandatory: false,
				defaultDiscrepancyAllowedPercent: 50,
				clinicalRationaleRu: "Аппликационный гель для комфортного вкола иглы",
			},
		],
	},

	// A16.07.030.001 — Анестезия инфильтрационная (Приказ Минздрава РФ № 804н)
	{
		serviceCode: "A16.07.030.001",
		serviceTitle: "Анестезия инфильтрационная в стоматологии",
		specialty: "general",
		descriptionRu: "Инфильтрационное обезболивание периапикальной зоны с предварительной аппликационной анестезией",
		standardDurationMinutes: 10,
		materials: [
			{
				materialId: "mat_articaine_ultracain",
				standardQuantity: 1,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 0,
				clinicalRationaleRu: "1 карпула (1.7 мл) артикаина 4% с эпинефрином 1:200 000 (Ультракаин Д-С)",
			},
			{
				materialId: "mat_dental_needle_30g",
				standardQuantity: 1,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 0,
				clinicalRationaleRu: "1 карпульная игла тонкостенная 30G (0.3 x 25 мм)",
			},
			{
				materialId: "mat_topical_anesthesia_gel",
				standardQuantity: 0.2,
				isMandatory: false,
				defaultDiscrepancyAllowedPercent: 50,
				clinicalRationaleRu: "0.2 г аппликационного геля бензокаина/лидокаина (Dis針-Top / Топикал)",
			},
			{
				materialId: "mat_cotton_rolls",
				standardQuantity: 2,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 50,
				clinicalRationaleRu: "2 ватных валика для изоляции и высушивания слизистой перед вколом",
			},
		],
	},

	// A16.07.051 — Профессиональная гигиена полости рта
	{
		serviceCode: "A16.07.051",
		serviceTitle: "Профессиональная гигиена полости рта и зубов (Air-Flow + УЗ)",
		specialty: "hygiene",
		descriptionRu: "Ультразвуковой скейлинг, порошкоструйная чистка Air-Flow, полировка пастой и глубокое фторирование",
		standardDurationMinutes: 50,
		materials: [
			{
				materialId: "mat_air_flow_powder",
				standardQuantity: 25,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 20,
				clinicalRationaleRu: "25 г глицинового порошка Clinpro на полный зубной ряд",
			},
			{
				materialId: "mat_prophy_paste",
				standardQuantity: 3,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 30,
				clinicalRationaleRu: "3 г полировочной пасты Cleanic",
			},
			{
				materialId: "mat_optragate",
				standardQuantity: 1,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 0,
				clinicalRationaleRu: "Мягкий ретрактор OptraGate",
			},
			{
				materialId: "mat_fluoride_varnish",
				standardQuantity: 0.5,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 0,
				clinicalRationaleRu: "Флакон 0.5 мл Clinpro White Varnish для реминерализации",
			},
		],
	},

	// A16.07.001.001 — Удаление зуба
	{
		serviceCode: "A16.07.001.001",
		serviceTitle: "Удаление постоянного зуба (атравматичное с ревизией лунки)",
		specialty: "surgery",
		descriptionRu: "Атравматичная люксация, кюретаж лунки, гемостаз коллагеновой губкой и наложение швов",
		standardDurationMinutes: 35,
		materials: [
			{
				materialId: "mat_hemostatic_sponge",
				standardQuantity: 1,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 0,
				clinicalRationaleRu: "Коллагеновая гемостатическая губка Альвостаз",
			},
			{
				materialId: "mat_suture_vicryl_40",
				standardQuantity: 1,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 0,
				clinicalRationaleRu: "1 шов Викрил 4-0 для фиксации десневого края лунки",
			},
			{
				materialId: "mat_surg_blade_15",
				standardQuantity: 1,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 0,
				clinicalRationaleRu: "Лезвие скальпеля №15",
			},
		],
	},

	// A16.07.055 — Синус-лифтинг и направленная костная регенерация (Bio-Oss + Bio-Gide)
	{
		serviceCode: "A16.07.055",
		serviceTitle: "Синус-лифтинг и направленная костная регенерация (НКР / Bio-Oss + Bio-Gide)",
		specialty: "implantology",
		descriptionRu: "Костная пластика и субантральная аугментация с внесением костного графта Geistlich Bio-Oss и фиксацией мембраны Geistlich Bio-Gide",
		standardDurationMinutes: 75,
		materials: [
			{
				materialId: "mat_bio_oss_graft",
				standardQuantity: 1,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 0,
				clinicalRationaleRu: "1 упаковка (0.5 г) натурального бычьего графта Geistlich Bio-Oss",
			},
			{
				materialId: "mat_bio_gide_membrane",
				standardQuantity: 1,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 0,
				clinicalRationaleRu: "1 барьерная коллагеновая резорбируемая мембрана Geistlich Bio-Gide 25×25 мм",
			},
			{
				materialId: "mat_prolene_50",
				standardQuantity: 1,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 0,
				clinicalRationaleRu: "1 шов Пролен 5-0 для герметичного ушивания слизисто-надкостничного лоскута",
			},
			{
				materialId: "mat_suture_vicryl_40",
				standardQuantity: 1,
				isMandatory: false,
				defaultDiscrepancyAllowedPercent: 0,
				clinicalRationaleRu: "1 шов Викрил 4-0 для дополнительной фиксации сосочков",
			},
			{
				materialId: "mat_articaine_ultracain",
				standardQuantity: 2,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 0,
				clinicalRationaleRu: "2 карпулы артикаина 4% с эпинефрином 1:100 000 (Ультракаин Д-С Форте)",
			},
			{
				materialId: "mat_surg_blade_15",
				standardQuantity: 1,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 0,
				clinicalRationaleRu: "Микрохирургическое лезвие №15",
			},
			{
				materialId: "mat_surg_drape_gown_set",
				standardQuantity: 1,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 0,
				clinicalRationaleRu: "Стерильный операционный набор СИЗ хирурга и ассистента",
			},
		],
	},
];

/**
 * Вспомогательная функция поиска норм расхода по коду услуги
 */
export function getOrder804nServiceNorm(serviceCode: string): Order804nServiceNorm | undefined {
	return ORDER_804N_SERVICE_NORMS.find((s) => s.serviceCode === serviceCode);
}

