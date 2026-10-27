import type { DoctorAutopilotPreset } from "../../clinicalSoapTypes";

// ── УСТАНОВКА ДЕНТАЛЬНОГО ИМПЛАНТАТА (K08.1) ──
export const AUTOPILOT_IMPLANT_STANDARD_K081: DoctorAutopilotPreset = {
	id: "autopilot_implant_standard_k081",
	title: "Установка дентального имплантата (K08.1) — Osstem/Straumann/Nobel, торк 35 Н·см, ФДМ, шов Prolene 4-0",
	shortBadge: "Имплантация",
	category: "surgery",
	icd10: "K08.1",
	icd10Label: "Потеря зубов вследствие удаления, дентальная имплантация",
	toothState: "Implant",
	defaultTooth: 36,
	is1ClickAutopilot: true,
	complaint: "Жалобы на дефект зубного ряда, затрудненное жевание, эстетический дискомфорт.",
	anamnesis: "Зуб удален более 4 месяцев назад. КЛКТ: высота и ширина гребня достаточны (D2 по Мишу). Аллергии нет. Оформлено ИДС на имплантацию.",
	statusLocalis: "Слизистая в зоне дефекта плотная, прикрепленная десна 4 мм. Пальпация безболезненна.",
	anesthetic: { drugKey: "ultracain_ds_forte", drugName: "Артикаин 1:100 000 (Sol. Articaini 4% 1:100 000 — 1.7 мл)", carpulesCount: 1.0, volumeMl: 1.7 },
	treatmentDescription:
		"1. ИДС подписано, инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл.\n" +
		"2. Разрез по центру гребня, скелетирование костного ложа.\n" +
		"3. Формирование ложа ступенчатыми сверлами физиодиспенсера (800 об/мин, охлаждение физраствором).\n" +
		"4. Установка имплантата (4.0×10.0 мм) субкрестально на 0.5 мм с первичной торковой стабильностью 35 Н·см, ISQ 72.\n" +
		"5. Установка формирователя десны (ФДМ) 3.0 мм с усилием 15 Н·см.\n" +
		"6. Мобилизация краев, ушивание узловыми швами Prolene 4-0. Контрольный визиограф: интеграция состоятельна. Гемостаз полный.",
	service804n: { code804n: "A16.07.054", title: "Внутрикостная дентальная имплантация (установка имплантата)", basePriceRub: 38000, category: "surgery" },
	additionalServices804n: [
		{ code804n: "A16.07.054.001", title: "Установка формирователя десны (ФДМ)", basePriceRub: 4500, category: "surgery" },
		{ code804n: "A16.07.097", title: "Наложение шва на слизистую оболочку рта (Пролен 4-0)", basePriceRub: 1500, category: "surgery" },
		{ code804n: "A11.07.015", title: "Инфильтрационная анестезия (Артикаин)", basePriceRub: 900, category: "surgery" },
	],
	informedConsent: "ИДС на операцию внутрикостной дентальной имплантации подписано пациентом.",
	postOpMemo: "Холод 15 мин 3-4 раза первые сутки, не жевать на оперированную сторону. Снятие швов через 10-14 дней.",
	materialsToDeduct: [
		{ name: "Дентальный имплантат титановый в стерильной капсуле", category: "surgery", unit: "шт.", quantity: 1, unitCostRub: 12500 },
		{ name: "Формирователь десны титановый (ФДМ)", category: "surgery", unit: "шт.", quantity: 1, unitCostRub: 2200 },
		{ name: "Шовный материал Пролен 4-0", category: "surgery", unit: "шт.", quantity: 1, unitCostRub: 550 },
		{ name: "Анестетик артикаиновый 4% 1:100 000 1.7 мл", category: "anesthesia", unit: "карп.", quantity: 1, unitCostRub: 220 },
	],
};

// ── СИНУС-ЛИФТИНГ И НКР / КОСТНАЯ ПЛАСТИКА (K08.2) ──
export const AUTOPILOT_SINUS_GBR_K082: DoctorAutopilotPreset = {
	id: "autopilot_sinus_gbr_k082",
	title: "Синус-лифтинг и НКР (K08.2) — Bio-Oss 0.5г, Bio-Gide 25×25, пины, шов ПГА 4-0",
	shortBadge: "Синус / НКР",
	category: "surgery",
	icd10: "K08.2",
	icd10Label: "Атрофия альвеолярного края, субантральная аугментация",
	toothState: "Missing",
	defaultTooth: 16,
	is1ClickAutopilot: true,
	complaint: "Дефицит костной ткани верхней челюсти, планируется костная пластика перед имплантацией.",
	anamnesis: "КЛКТ: высота остаточной кости до дна синуса 3-4 мм, показан открытый синус-лифтинг и НКР. Оформлено ИДС.",
	statusLocalis: "Атрофия альвеолярного гребня в боковом отделе. Слизистая оболочка без воспалительных признаков.",
	anesthetic: { drugKey: "ultracain_ds_forte", drugName: "Артикаин 1:100 000 (Sol. Articaini 4% 1:100 000 — 1.7 мл)", carpulesCount: 1.0, volumeMl: 1.7 },
	treatmentDescription:
		"1. ИДС подписано, инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл.\n" +
		"2. Трапециевидный разрез, латеральное костное окно пьезотомом без перфорации мембраны Шнайдера.\n" +
		"3. Элевация мембраны кюретами синус-лифта, проба Вальсальвы отрицательна (интактна).\n" +
		"4. Внесение биоматериала Bio-Oss 0.5г в субантральный карман.\n" +
		"5. Перекрытие мембраной Bio-Gide 25×25 мм, фиксация титановыми пинами (2 шт).\n" +
		"6. Мобилизация надкостницы, послойное глухое ушивание швом ПГА 4-0 без натяжения. Гемостаз полный.",
	service804n: { code804n: "A16.07.055", title: "Синус-лифтинг (костная пластика, остеопластика)", basePriceRub: 35000, category: "surgery" },
	additionalServices804n: [
		{ code804n: "A16.07.041", title: "Внесение остеопластического материала и мембраны", basePriceRub: 18000, category: "surgery" },
		{ code804n: "A16.07.097", title: "Наложение шва на слизистую оболочку рта (ПГА 4-0)", basePriceRub: 1500, category: "surgery" },
		{ code804n: "A11.07.015", title: "Инфильтрационная анестезия (Артикаин)", basePriceRub: 900, category: "surgery" },
	],
	informedConsent: "ИДС на операцию синус-лифтинга и костной пластики подписано пациентом.",
	postOpMemo: "Не сморкаться, не чихать с закрытым ртом, капли в нос сосудосуживающие 5 дней. Снятие швов через 10-14 дней.",
	materialsToDeduct: [
		{ name: "Костный графт Geistlich Bio-Oss 0.5г", category: "surgery", unit: "фл.", quantity: 1, unitCostRub: 14500 },
		{ name: "Мембрана коллагеновая Geistlich Bio-Gide 25x25 мм", category: "surgery", unit: "шт.", quantity: 1, unitCostRub: 16800 },
		{ name: "Пины титановые для фиксации мембран", category: "surgery", unit: "шт.", quantity: 2, unitCostRub: 1200 },
		{ name: "Шовный материал ПГА 4-0", category: "surgery", unit: "шт.", quantity: 1, unitCostRub: 420 },
	],
};
