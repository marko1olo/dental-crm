import type { DoctorAutopilotPreset } from "../../clinicalSoapTypes";

// ── ПУЛЬПИТ ОСТРЫЙ (К04.0) ──
export const AUTOPILOT_PULPITIS_K040: DoctorAutopilotPreset = {
	id: "autopilot_pulpitis_k040",
	title: "Пульпит / Эндодонтия (K04.0) — ProTaper/Reciproc, NaOCl 3%, ЭДТА 17%, временная пломба Каласепт",
	shortBadge: "Пульпит",
	category: "therapy",
	icd10: "K04.0",
	icd10Label: "Острый пульпит (необратимый)",
	toothState: "Pulpitis",
	defaultTooth: 46,
	is1ClickAutopilot: true,
	complaint: "Жалобы на острые приступообразные самопроизвольные боли, усиливающиеся в ночное время и от температурных раздражителей с иррадиацией по тройничному нерву. Болевой приступ длится более 20 минут.",
	anamnesis: "Боли возникли 1–2 суток назад, нарастают. Прием НПВП купирует боль кратковременно. Аллергии нет, соматически здоров. Оформлено согласие (ИДС) на эндодонтическое лечение.",
	statusLocalis: "Глубокая кариозная полость, сообщающаяся с пульпарной камерой. Зондирование вскрытой точки коронковой пульпы резко болезненно с кровоточивостью. Перкуссия слабо чувствительна. Термопроба резко положительна. ЭОД 35–45 мкА. Рентген: периапикальная щель интактна.",
	anesthetic: { drugKey: "ultracain_ds_forte", drugName: "Артикаин 1:100 000 (Sol. Articaini 4% cum epinephrine 1:100 000 — 1.7 мл)", carpulesCount: 1.0, volumeMl: 1.7 },
	treatmentDescription:
		"1. Информированное добровольное согласие (ИДС) подписано пациентом.\n" +
		"2. Инфильтрационная/проводниковая анестезия Sol. Articaini 1:100 000 — 1.7 мл.\n" +
		"3. Изоляция коффердамом, некрэктомия, раскрытие пульпарной камеры и прямой эндодонтический доступ.\n" +
		"4. Экстирпация пульпы, электронная апекслокация рабочей длины, визиографический контроль.\n" +
		"5. Механическая обработка машинными Ni-Ti файлами ProTaper/Reciproc под контролем эндомотора.\n" +
		"6. Ирригация раствором NaOCl 3% и гелем ЭДТА 17% (EDTA 17%) с ультразвуковой активацией эндочаком, просушивание бумажными штифтами.\n" +
		"7. Временное пломбирование пастой гидроксида кальция Каласепт (Calasept) до апекса, герметичная временная повязка (Cavit).",
	service804n: {
		code804n: "A16.07.030.001",
		title: "Инструментальная и медикаментозная обработка корневого канала (ProTaper/Reciproc + ирригация NaOCl 3% + ЭДТА 17%)",
		basePriceRub: 4000,
		category: "therapy",
	},
	additionalServices804n: [{ code804n: "A16.07.008.002", title: "Временное пломбирование лекарственным препаратом корневого канала (Каласепт)", basePriceRub: 1500, category: "therapy" }],
	informedConsent: "Информированное добровольное согласие (ИДС) на эндодонтическое лечение корневых каналов оформлено и подписано.",
	materialsToDeduct: [
		{ name: "Паста гидроксид кальция Каласепт (Calasept / Calcept)", category: "endo", unit: "г", quantity: 0.2, unitCostRub: 650 },
		{ name: "Раствор натрия гипохлорита 3% для ирригации (NaOCl 3%)", category: "endo", unit: "мл", quantity: 15, unitCostRub: 12 },
		{ name: "Гель ЭДТА 17% для химического расширения каналов", category: "endo", unit: "мл", quantity: 0.5, unitCostRub: 240 },
		{ name: "Машинный Ni-Ti файл ProTaper / Reciproc", category: "endo", unit: "шт.", quantity: 1, unitCostRub: 850 },
		{ name: "Временная герметичная повязка дентин-паста / Cavit", category: "endo", unit: "г", quantity: 0.3, unitCostRub: 320 },
		{ name: "Штифты бумажные абсорбирующие", category: "endo", unit: "шт.", quantity: 4, unitCostRub: 15 },
		{ name: "Анестетик артикаиновый 4% 1:100000 1.7 мл", category: "anesthesia", unit: "карп.", quantity: 1, unitCostRub: 220 },
		{ name: "Платок коффердама Sanctuary Dental Dam", category: "auxiliary", unit: "шт.", quantity: 1, unitCostRub: 115 },
	],
	recommendations: "Не жевать твердую пищу на стороне зуба. При дискомфорте — Нимесил 1 пакетик. Повторное посещение для постоянной обтурации через 7–10 дней.",
	warrantyMonths: 12,
	serviceLifeMonths: 24,
};

// ── ХРОНИЧЕСКИЙ ПЕРИОДОНТИТ (К04.5) ──
export const AUTOPILOT_PERIODONTITIS_K045: DoctorAutopilotPreset = {
	id: "autopilot_periodontitis_k045",
	title: "Периодонтит (K04.5) — мехобработка каналов, NaOCl 3%, ЭДТА 17%, лечебная паста Ca(OH)2 на 10-14 дней, A16.07.082",
	shortBadge: "Периодонтит",
	category: "therapy",
	icd10: "K04.5",
	icd10Label: "Хронический апикальный периодонтит",
	toothState: "Periodontitis",
	defaultTooth: 46,
	is1ClickAutopilot: true,
	complaint: "Жалобы на чувство «выросшего зуба», дискомфорт или ноющую боль при накусывании на зуб, потемнение коронки.",
	anamnesis: "Обострение возникло несколько дней назад. Аллергологический анамнез уточнен, соматически здоров. Оформлено информированное добровольное согласие (ИДС).",
	statusLocalis: "Коронка зуба изменена в цвете, глубокая кариозная полость. Зондирование устьев безболезненно, перкуссия умеренно болезненна. Термопроба отрицательна. Рентген: очаг периапикальной деструкции у апекса. ЭОД > 100 мкА.",
	anesthetic: { drugKey: "ultracain_ds_forte", drugName: "Артикаин 1:100 000 (Sol. Articaini 4% cum epinephrine 1:100 000 — 1.7 мл)", carpulesCount: 1.0, volumeMl: 1.7 },
	treatmentDescription:
		"1. Информированное добровольное согласие (ИДС) подписано пациентом.\n" +
		"2. Инфильтрационная/проводниковая анестезия Sol. Articaini 4% 1.7 мл.\n" +
		"3. Изоляция коффердамом, препарирование кариозной полости, создание эндодонтического доступа.\n" +
		"4. Апекслокация, рентген-контроль. Инструментальная обработка Ni-Ti файлами ProTaper/Reciproc.\n" +
		"5. УЗ-ирригация 3% раствором NaOCl и 17% гелем ЭДТА, высушивание бумажными штифтами.\n" +
		"6. Временная лечебная обтурация пастой гидроксида кальция (Calcept / Metapex) на 10–14 дней, герметичная повязка Cavit.",
	service804n: { code804n: "A16.07.082", title: "Инструментальная ревизия и дезинфекция корневых каналов при периодонтите", basePriceRub: 5500, category: "therapy" },
	additionalServices804n: [{ code804n: "A16.07.008.002", title: "Временное пломбирование корневого канала лечебной пастой гидроксида кальция", basePriceRub: 1500, category: "therapy" }],
	informedConsent: "Информированное добровольное согласие (ИДС) на эндодонтическое лечение периодонтита оформлено и подписано.",
	materialsToDeduct: [
		{ name: "Паста гидроксид кальция Calcept / Metapex", category: "endo", unit: "г", quantity: 0.2, unitCostRub: 650 },
		{ name: "Раствор натрия гипохлорита 3% NaOCl", category: "endo", unit: "мл", quantity: 20, unitCostRub: 12 },
		{ name: "Гель ЭДТА 17%", category: "endo", unit: "мл", quantity: 0.5, unitCostRub: 240 },
		{ name: "Временная повязка Cavit / Septo-pack", category: "endo", unit: "г", quantity: 0.3, unitCostRub: 320 },
		{ name: "Анестетик артикаиновый 4% 1:100000 1.7 мл", category: "anesthesia", unit: "карп.", quantity: 1, unitCostRub: 220 },
		{ name: "Платок коффердама Sanctuary Dental Dam", category: "auxiliary", unit: "шт.", quantity: 1, unitCostRub: 115 },
	],
	recommendations: "Не накусывать на причинный зуб твердую пищу. При боли — Нимесулид 100 мг. Явка через 10–14 дней на контрольный снимок и постоянную обтурацию.",
	warrantyMonths: 12,
	serviceLifeMonths: 24,
};
