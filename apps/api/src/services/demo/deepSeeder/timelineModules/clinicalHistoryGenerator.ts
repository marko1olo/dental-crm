/**
 * clinicalHistoryGenerator.ts — Deterministic Generator for Clinical Episodes, Tooth States & Treatment Items (Layer 1/2).
 */

import {
	DEMO_TREATMENT_ITEM_1_ID,
	DEMO_TREATMENT_ITEM_2_ID,
	DEMO_TREATMENT_ITEM_3_ID,
	DEMO_TREATMENT_ITEM_4_ID,
	DEMO_TREATMENT_ITEM_5_ID,
	DEMO_TREATMENT_ITEM_6_ID,
	DEMO_TREATMENT_ITEM_7_ID,
	DEMO_TREATMENT_ITEM_8_ID,
} from "../types.js";
import type {
	ClinicalServiceLookup,
	PatientTreatmentItemsParams,
} from "./timelineSeederTypes.js";

/**
 * Генерирует детерминированные записи зубных формул (одонтограмм) для пациентов терапии, ортопедии и хирургии.
 */
export function buildPatientToothStateValues(
	organizationId: string,
	p0Id: string,
	p1Id: string,
	p3Id: string,
) {
	return [
		// Пациент 1 (Терапия)
		{
			organizationId,
			patientId: p0Id,
			toothNumber: 16,
			state: "caries" as const,
			surfaces: ["M", "O", "D"],
			notes: "Глубокий кариес дентина (K02.1)",
		},
		{
			organizationId,
			patientId: p0Id,
			toothNumber: 24,
			state: "filling" as const,
			surfaces: ["O"],
			notes: "Световая пломба Ceram.x Spectra ST (Z96.5)",
		},
		{
			organizationId,
			patientId: p0Id,
			toothNumber: 36,
			state: "pulpitis" as const,
			surfaces: ["M", "O"],
			notes: "Острый необратимый пульпит (K04.0)",
		},
		{
			organizationId,
			patientId: p0Id,
			toothNumber: 18,
			state: "missing" as const,
			notes: "Адентия третьего моляра",
		},
		{
			organizationId,
			patientId: p0Id,
			toothNumber: 28,
			state: "missing" as const,
			notes: "Адентия третьего моляра",
		},
		{
			organizationId,
			patientId: p0Id,
			toothNumber: 38,
			state: "missing" as const,
			notes: "Адентия третьего моляра",
		},
		{
			organizationId,
			patientId: p0Id,
			toothNumber: 48,
			state: "missing" as const,
			notes: "Адентия третьего моляра",
		},
		// Пациент 2 (Ортопедия)
		{
			organizationId,
			patientId: p1Id,
			toothNumber: 11,
			state: "crown" as const,
			notes: "Коронка из диоксида циркония (ZrO2 Prettau), наряд ЗТЛ",
		},
		{
			organizationId,
			patientId: p1Id,
			toothNumber: 12,
			state: "filling" as const,
			surfaces: ["V"],
			notes: "Керамический винир E.max",
		},
		{
			organizationId,
			patientId: p1Id,
			toothNumber: 21,
			state: "filling" as const,
			surfaces: ["V"],
			notes: "Керамический винир E.max",
		},
		// Пациент 4 (Хирургия)
		{
			organizationId,
			patientId: p3Id,
			toothNumber: 46,
			state: "implant" as const,
			notes: "Имплантат Straumann BLX 4.5x10, формирователь десны",
		},
	];
}

/**
 * Генерирует протокол медицинского дневника Форма 043/у (SOAP-протокол).
 */
export function buildPatientVisitDiaryValues(params: {
	organizationId: string;
	visitId: string;
	patientId: string;
	doctorUserId: string;
}) {
	const { organizationId, visitId, patientId, doctorUserId } = params;
	return {
		organizationId,
		visitId,
		patientId,
		doctorId: doctorUserId,
		authorId: doctorUserId,
		anamnesis:
			"Пациент обратился с жалобами на кратковременные боли от сладкого и холодного в области зуба 1.6. " +
			"Полость заметил около 2 месяцев назад. ВНИМАНИЕ: Аллергия на препараты пенициллинового ряда (Амоксиклав)! Анамнез: артериальная гипертензия 1 ст. (АД 125/80).",
		statusLocalis:
			"На окклюзионной и контактных поверхностях зуба 1.6 глубокая кариозная полость, " +
			"выполненная размягченным дентином. Зондирование дна чувствительно. Термопроба положительна, кратковременна. " +
			"Перкуссия безболезненна. Слизистая в норме.",
		diagnosisIcd10: "K02.1 Кариес дентина",
		diagnosisTooth: "16",
		treatmentDescription:
			"Инфильтрационная анестезия Sol. Articaini 4% 1.7 мл. Изоляция системой коффердам. " +
			"Препарирование полости зуба 1.6, некрэктомия. Медикаментозная обработка 2% р-ром хлоргексидина. " +
			"Лечебная подкладка МТА, изолирующая прокладка СИЦ. Адгезивный протокол OptiBond FL. " +
			"Послойная анатомическая реставрация композитом Ceram.x Spectra ST A2, A3. Полировка Sof-Lex.",
		content:
			"Первичный прием врача-стоматолога терапевта. Успешное терапевтическое лечение глубокого кариеса зуба 1.6.",
		isLocked: true,
		lockedAt: new Date(),
		lockedByUserId: doctorUserId,
	};
}

/**
 * Поиск номенклатурной услуги в каталоге организации по коду 804н с безопасным фолбеком.
 */
export function findCatalogService(
	catalogRows: Array<{
		id: string;
		code: string | null;
		title: string;
		basePriceRub: number | string | null;
	}>,
	byCode: Map<string, { id: string; title: string; basePriceRub: number | string | null }>,
	code: string,
	fallbackTitle: string,
	fallbackPrice: number,
): ClinicalServiceLookup {
	const found = byCode.get(code.toUpperCase());
	if (found && found.id) {
		return {
			id: found.id,
			title: found.title,
			price: found.basePriceRub ? Number(found.basePriceRub) : fallbackPrice,
		};
	}
	const anyItem = catalogRows[0];
	return {
		id: anyItem?.id ?? undefined,
		title: fallbackTitle,
		price: fallbackPrice,
	};
}

/**
 * Формирует детерминированный массив позиций плана лечения (treatment_items).
 */
export function buildDeterministicTreatmentItems(
	params: PatientTreatmentItemsParams & {
		isCanonicalDemo: boolean;
		catalogRows: Array<{
			id: string;
			code: string | null;
			title: string;
			basePriceRub: number | string | null;
		}>;
	},
) {
	const {
		isCanonicalDemo,
		organizationId,
		p0Id,
		p1Id,
		p3Id,
		doctorUserId,
		orthopedistUserId,
		surgeonUserId,
		chair1Id,
		chair2Id,
		visitId,
		catalogRows,
	} = params;

	const byCode = new Map<
		string,
		{ id: string; title: string; basePriceRub: number | string | null }
	>();
	for (const row of catalogRows) {
		if (row.code) {
			byCode.set(row.code.trim().toUpperCase(), row);
		}
	}

	const sTherapyConsult = findCatalogService(
		catalogRows,
		byCode,
		"B01.065.001",
		"Прием (осмотр, консультация) врача-стоматолога терапевта первичный",
		1500,
	);
	const sAnesthesia = findCatalogService(
		catalogRows,
		byCode,
		"A11.07.012",
		"Инъекционное введение лекарственных препаратов в челюстно-лицевую область (инфильтрационная анестезия)",
		950,
	);
	const sCofferdam = findCatalogService(
		catalogRows,
		byCode,
		"A16.07.002.009",
		"Изоляция операционного поля (наложение коффердама / раббердама)",
		650,
	);
	const sFillingCaries = findCatalogService(
		catalogRows,
		byCode,
		"A16.07.002.010",
		"Восстановление зуба пломбой (светоотверждаемый композит Ceram.x Spectra ST)",
		3500,
	);
	const sEndoPrep = findCatalogService(
		catalogRows,
		byCode,
		"A16.07.030",
		"Инструментальная и медикаментозная обработка корневого канала",
		5500,
	);
	const sEndoObturation = findCatalogService(
		catalogRows,
		byCode,
		"A16.07.008",
		"Пломбирование корневого канала гуттаперчей методом латеральной компакции",
		6400,
	);
	const sCrownZirconia = findCatalogService(
		catalogRows,
		byCode,
		"A16.07.004",
		"Восстановление зуба коронкой из диоксида циркония ZrO2 Prettau",
		14500,
	);
	const sImplant = findCatalogService(
		catalogRows,
		byCode,
		"A16.07.054",
		"Внутрикостная дентальная имплантация системы Straumann BLX",
		45000,
	);

	return [
		// Пациент 1 (Смирнова Анна Сергеевна — Терапия)
		// 1.1. Завершенный визит: консультация, анестезия, коффердам, пломбирование 1.6
		{
			...(isCanonicalDemo ? { id: DEMO_TREATMENT_ITEM_1_ID } : {}),
			organizationId,
			patientId: p0Id,
			visitId: visitId ?? null,
			serviceId: sTherapyConsult.id,
			title: sTherapyConsult.title,
			toothCode: "16",
			quantity: "1.00",
			priceRub: 1500,
			unitPriceRub: 1500,
			discountRub: 0,
			status: "completed" as const,
			plannedDoctorUserId: doctorUserId,
			plannedChairId: chair1Id,
			notes: "Первичный осмотр полости рта, составление плана санации",
		},
		{
			...(isCanonicalDemo ? { id: DEMO_TREATMENT_ITEM_2_ID } : {}),
			organizationId,
			patientId: p0Id,
			visitId: visitId ?? null,
			serviceId: sAnesthesia.id,
			title: sAnesthesia.title,
			toothCode: "16",
			quantity: "1.00",
			priceRub: 950,
			unitPriceRub: 950,
			discountRub: 0,
			status: "completed" as const,
			plannedDoctorUserId: doctorUserId,
			plannedChairId: chair1Id,
			notes: "Sol. Articaini 4% 1.7 ml с эпинефрином 1:100 000",
		},
		{
			...(isCanonicalDemo ? { id: DEMO_TREATMENT_ITEM_3_ID } : {}),
			organizationId,
			patientId: p0Id,
			visitId: visitId ?? null,
			serviceId: sCofferdam.id,
			title: sCofferdam.title,
			toothCode: "16",
			quantity: "1.00",
			priceRub: 650,
			unitPriceRub: 650,
			discountRub: 0,
			status: "completed" as const,
			plannedDoctorUserId: doctorUserId,
			plannedChairId: chair1Id,
			notes: "Изоляция клампом Sanctuary №14, плотное прилегание",
		},
		{
			...(isCanonicalDemo ? { id: DEMO_TREATMENT_ITEM_4_ID } : {}),
			organizationId,
			patientId: p0Id,
			visitId: visitId ?? null,
			serviceId: sFillingCaries.id,
			title: sFillingCaries.title,
			toothCode: "16",
			quantity: "1.00",
			priceRub: 3500,
			unitPriceRub: 3500,
			discountRub: 0,
			status: "completed" as const,
			plannedDoctorUserId: doctorUserId,
			plannedChairId: chair1Id,
			notes: "Послойная анатомическая реставрация окклюзии и контактных пунктов",
		},
		// 1.2. Предстоящие согласованные позиции по пульпиту 3.6 (сумма плана = 18 500 ₽)
		{
			...(isCanonicalDemo ? { id: DEMO_TREATMENT_ITEM_5_ID } : {}),
			organizationId,
			patientId: p0Id,
			visitId: null,
			serviceId: sEndoPrep.id,
			title: sEndoPrep.title,
			toothCode: "36",
			quantity: "1.00",
			priceRub: 5500,
			unitPriceRub: 5500,
			discountRub: 0,
			status: "approved" as const,
			plannedDoctorUserId: doctorUserId,
			plannedChairId: chair1Id,
			notes: "Эндодонтический доступ, мех. обработка ProTaper Gold до размера F2",
		},
		{
			...(isCanonicalDemo ? { id: DEMO_TREATMENT_ITEM_6_ID } : {}),
			organizationId,
			patientId: p0Id,
			visitId: null,
			serviceId: sEndoObturation.id,
			title: sEndoObturation.title,
			toothCode: "36",
			quantity: "1.00",
			priceRub: 6400,
			unitPriceRub: 6400,
			discountRub: 0,
			status: "proposed" as const,
			plannedDoctorUserId: doctorUserId,
			plannedChairId: chair1Id,
			notes: "Обтурация 3 каналов гуттаперчей с силером AH Plus",
		},

		// Пациент 2 (Воронов Дмитрий Игоревич — Ортопедия)
		{
			...(isCanonicalDemo ? { id: DEMO_TREATMENT_ITEM_7_ID } : {}),
			organizationId,
			patientId: p1Id,
			visitId: null,
			serviceId: sCrownZirconia.id,
			title: sCrownZirconia.title,
			toothCode: "11",
			quantity: "1.00",
			priceRub: 14500,
			unitPriceRub: 14500,
			discountRub: 0,
			status: "in_progress" as const,
			plannedDoctorUserId: orthopedistUserId,
			plannedChairId: chair2Id,
			notes: "Одиночная коронка ZrO2 Prettau A2, наряд в ЗТЛ №1",
		},

		// Пациент 4 (Кузнецов Михаил Викторович — Хирургия)
		{
			...(isCanonicalDemo ? { id: DEMO_TREATMENT_ITEM_8_ID } : {}),
			organizationId,
			patientId: p3Id,
			visitId: null,
			serviceId: sImplant.id,
			title: sImplant.title,
			toothCode: "46",
			quantity: "1.00",
			priceRub: 45000,
			unitPriceRub: 45000,
			discountRub: 0,
			status: "proposed" as const,
			plannedDoctorUserId: surgeonUserId,
			plannedChairId: chair2Id,
			notes: "Установка имплантата Straumann BLX 4.5x10 Roxolid SLActiv",
		},
	];
}
