import { isDeciduousTooth } from "../treatment-plans/treatmentPlanStagesEngine";
import type { ToothData } from "./ToothChart";

export interface LiveInvoiceItem {
	toothNumber: number;
	code: string;
	title: string;
	category: string;
	price: number;
	quantity: number;
	discountRub?: number | undefined;
}

export interface LiveInvoiceCashierExport {
	patientId?: string | undefined;
	patientName?: string | undefined;
	items: LiveInvoiceItem[];
	grossTotalRub: number;
	discountRub: number;
	netTotalRub: number;
	discountPercent: number;
	createdAtIso: string;
}

/**
 * Номенклатура медицинских услуг по Приказу Минздрава России от 13.10.2017 № 804н
 * с поддержкой взрослой терапии, эндодонтии (A16.07.030.001..004 и A16.07.008.001..004),
 * пародонтологии, детской стоматологии, имплантации и костной пластики.
 */
export const ORDER_804N_PROCEDURES: Record<
	string,
	{ code: string; title: string; price: number; category: string }
> = {
	// Терапия
	Caries: {
		code: "A16.07.002.001",
		title: "Восстановление зуба пломбой (лечение кариеса фотополимером)",
		price: 4500,
		category: "Терапия",
	},
	Crown: {
		code: "A16.07.004.001",
		title: "Восстановление зуба коронкой из диоксида циркония / E.max",
		price: 24000,
		category: "Ортопедия",
	},

	// Эндодонтия 804н — Инструментальная и медикаментозная обработка корневых каналов (A16.07.030.001..004)
	EndoPrep1Canal: {
		code: "A16.07.030.001",
		title: "Инструментальная и медикаментозная обработка корневого канала (1-канальный зуб)",
		price: 3500,
		category: "Эндодонтия",
	},
	EndoPrep2Canals: {
		code: "A16.07.030.002",
		title: "Инструментальная и медикаментозная обработка корневых каналов (2-канальный зуб)",
		price: 5500,
		category: "Эндодонтия",
	},
	EndoPrep3Canals: {
		code: "A16.07.030.003",
		title: "Инструментальная и медикаментозная обработка корневых каналов (3-канальный зуб)",
		price: 7500,
		category: "Эндодонтия",
	},
	EndoPrep4Canals: {
		code: "A16.07.030.004",
		title: "Инструментальная и медикаментозная обработка корневых каналов (4-канальный зуб)",
		price: 9500,
		category: "Эндодонтия",
	},

	// Эндодонтия 804н — Пломбирование / обтурация корневых каналов (A16.07.008.001..004)
	EndoObturation1Canal: {
		code: "A16.07.008.001",
		title: "Пломбирование корневого канала зуба (1-канальный зуб)",
		price: 3000,
		category: "Эндодонтия",
	},
	EndoObturation2Canals: {
		code: "A16.07.008.002",
		title: "Пломбирование корневых каналов зуба (2-канальный зуб)",
		price: 5000,
		category: "Эндодонтия",
	},
	EndoObturation3Canals: {
		code: "A16.07.008.003",
		title: "Пломбирование корневых каналов зуба (3-канальный зуб)",
		price: 7000,
		category: "Эндодонтия",
	},
	EndoObturation4Canals: {
		code: "A16.07.008.004",
		title: "Пломбирование корневых каналов зуба (4-канальный зуб)",
		price: 9000,
		category: "Эндодонтия",
	},

	// Дополнительные процедуры эндодонтии
	EndoMedicationCaOH2: {
		code: "A16.07.091",
		title: "Временное пломбирование лекарственным препаратом корневого канала (Ca(OH)2)",
		price: 2000,
		category: "Эндодонтия",
	},
	EndoUnsealing: {
		code: "A16.07.082",
		title: "Распломбирование корневого канала зуба",
		price: 2500,
		category: "Эндодонтия",
	},

	// Псевдонимы эндодонтии для обратной совместимости
	Pulpitis: {
		code: "A16.07.008.002",
		title: "Эндодонтическое лечение пульпита (обработка и обтурация каналов)",
		price: 10500,
		category: "Эндодонтия",
	},
	Periodontitis: {
		code: "A16.07.009.001",
		title: "Лечение апикального периодонтита (распломбирование, дезинфекция и обтурация)",
		price: 12500,
		category: "Эндодонтия",
	},

	// Хирургия и Имплантация
	Implant: {
		code: "A16.07.054.001",
		title: "Внутрикостная дентальная имплантация + формирователь десны",
		price: 42000,
		category: "Хирургия",
	},
	Planned_Implant: {
		code: "A16.07.054.001",
		title: "Дентальная имплантация (планируемый этап) + формирователь десны",
		price: 42000,
		category: "Хирургия",
	},
	Missing: {
		code: "A16.07.054.001",
		title: "Дентальная имплантация (восстановление отсутствующего зуба)",
		price: 35000,
		category: "Хирургия",
	},
	Root: {
		code: "A16.07.001.002",
		title: "Удаление фрагмента / разрушенного корня зуба",
		price: 4000,
		category: "Хирургия",
	},
	Retained: {
		code: "A16.07.001.003",
		title: "Сложное удаление ретинированного / дистопированного зуба",
		price: 8500,
		category: "Хирургия",
	},
	Impacted: {
		code: "A16.07.001.003",
		title: "Сложное удаление ретинированного / дистопированного зуба",
		price: 8500,
		category: "Хирургия",
	},
	BoneGrafting: {
		code: "A16.07.041",
		title: "Костная пластика челюстно-лицевой области (НКР / синус-лифтинг)",
		price: 28000,
		category: "Хирургия",
	},
	ImplantProsthetics: {
		code: "A16.07.006",
		title: "Протезирование на имплантате (абатмент + циркониевая коронка)",
		price: 34000,
		category: "Ортопедия",
	},

	// Пародонтология и Профилактика
	PeriodontalScaling: {
		code: "A16.07.051",
		title: "Скейлинг и сглаживание корней при заболеваниях пародонта (SRP)",
		price: 2500,
		category: "Пародонтология",
	},
	PeriodontalHygiene: {
		code: "A16.07.050",
		title: "Профессиональная гигиена полости рта (Air-Flow + УЗ-скейлинг)",
		price: 5500,
		category: "Гигиена",
	},
	PeriodontalCurettage: {
		code: "A16.07.039",
		title: "Закрытый кюретаж пародонтального кармана",
		price: 1800,
		category: "Пародонтология",
	},
	PeriodontalSplinting: {
		code: "A16.07.019",
		title: "Временное шинирование подвижных зубов (лента Ribbond)",
		price: 4500,
		category: "Пародонтология",
	},

	// Детская стоматология (временные зубы)
	PediatricCaries: {
		code: "A16.07.002.001",
		title: "Восстановление временного зуба пломбой (лечение кариеса)",
		price: 3200,
		category: "Детская терапия",
	},
	PediatricPulpitis: {
		code: "A16.07.008.001",
		title: "Пульпотомия временного зуба с биоактивной герметизацией",
		price: 5800,
		category: "Детская терапия",
	},
	PediatricExtraction: {
		code: "A16.07.001",
		title: "Удаление временного зуба с анестезией",
		price: 1800,
		category: "Детская хирургия",
	},
	PediatricCrown: {
		code: "A16.07.004.003",
		title: "Восстановление временного зуба защитной коронкой SSC",
		price: 4900,
		category: "Детская ортопедия",
	},
	PediatricFissureSeal: {
		code: "A16.07.057",
		title: "Запечатывание фиссуры зуба герметиком (Clinpro)",
		price: 2200,
		category: "Профилактика",
	},
};

/**
 * Определение анатомического количества корневых каналов по стандарту FDI ISO 3950:
 * - Резцы и клыки (11..13, 21..23, 31..33, 41..43): 1 канал
 * - Верхние 1-е премоляры (14, 24): 2 канала (щечный B + небный P)
 * - Верхние 2-е премоляры (15, 25): 1 канал
 * - Нижние премоляры (34, 35, 44, 45): 1 канал
 * - Нижние моляры (36, 37, 46, 47, 38, 48): 3 канала (MB, ML, Distal) или 4 канала
 * - Верхние моляры (16, 17, 26, 27, 18, 28): 4 канала (MB1, MB2, DB, Palatal) или 3 канала
 * - Временные резцы/клыки (51..53, 61..63, 71..73, 81..83): 1 канал
 * - Временные моляры (54, 55, 64, 65): 3 канала; (74, 75, 84, 85): 2 канала
 */
export function getAnatomicalRootCanalCount(
	toothNumber: number,
	clinicalCanalCount?: number,
): number {
	if (
		typeof clinicalCanalCount === "number" &&
		Number.isFinite(clinicalCanalCount) &&
		clinicalCanalCount > 0
	) {
		return Math.min(4, Math.max(1, Math.round(clinicalCanalCount)));
	}

	const isDeciduous = isDeciduousTooth(toothNumber);
	const quadrant = Math.floor(toothNumber / 10);
	const pos = toothNumber % 10;
	const isUpper =
		quadrant === 1 || quadrant === 2 || quadrant === 5 || quadrant === 6;

	// Временный прикус
	if (isDeciduous) {
		if (pos <= 3) return 1;
		if (isUpper) return 3;
		return 2;
	}

	// Постоянный прикус
	// Резцы и клыки: 11..13, 21..23, 31..33, 41..43 -> 1 канал
	if (pos >= 1 && pos <= 3) {
		return 1;
	}

	// Премоляры:
	if (pos === 4) {
		// Верхний 1-й премоляр (14, 24) -> 2 канала (B, P)
		if (isUpper) return 2;
		// Нижний 1-й премоляр (34, 44) -> 1 канал
		return 1;
	}

	if (pos === 5) {
		// Верхний 2-й премоляр (15, 25) и нижний 2-й премоляр (35, 45) -> 1 канал
		return 1;
	}

	// Моляры: 6, 7, 8
	if (pos >= 6 && pos <= 8) {
		if (isUpper) {
			// Верхние моляры (16, 17, 26, 27, 18, 28): 4 канала (MB1, MB2, DB, Palatal)
			return 4;
		}
		// Нижние моляры (36, 37, 46, 47, 38, 48): 3 канала (MB, ML, Distal)
		return 3;
	}

	return 1;
}

/**
 * Проверка, является ли зуб анатомически многокорневым (моляры 16..18, 26..28, 36..38, 46..48, верхние первые премоляры 14, 24, молочные моляры)
 */
export function isMultiRootedTooth(toothNumber: number): boolean {
	return getAnatomicalRootCanalCount(toothNumber) >= 2;
}

export interface EndodonticCompositeCalculation {
	toothNumber: number;
	isMultiRooted: boolean;
	canalsCount: number;
	prepProcedure: { code: string; title: string; price: number; category: string };
	obturationProcedure: { code: string; title: string; price: number; category: string };
	medicationProcedure?: { code: string; title: string; price: number; category: string } | undefined;
	totalCompositePrice: number;
}

/**
 * Вычисляет композитную стоимость эндодонтического лечения зуба
 * (инструментальная обработка A16.07.030 + обтурация A16.07.008 + опционально Ca(OH)2 A16.07.091)
 * для многокорневых (16, 17, 26, 27, 36, 37, 46, 47) и однокорневых зубов.
 */
export function calculateEndodonticCompositePrice(
	toothNumber: number,
	state: "Pulpitis" | "Periodontitis" | string,
	clinicalCanalsCount?: number,
): EndodonticCompositeCalculation {
	const canalsCount = getAnatomicalRootCanalCount(toothNumber, clinicalCanalsCount);
	const prepProcedure = getEndoPreparationProcedure(canalsCount);
	const obturationProcedure = getEndoObturationProcedure(canalsCount);
	const isPeriodontitis = state === "Periodontitis";
	const medicationProcedure = isPeriodontitis
		? ORDER_804N_PROCEDURES.EndoMedicationCaOH2
		: undefined;

	const totalCompositePrice =
		prepProcedure.price +
		obturationProcedure.price +
		(medicationProcedure ? medicationProcedure.price : 0);

	return {
		toothNumber,
		isMultiRooted: canalsCount >= 2,
		canalsCount,
		prepProcedure,
		obturationProcedure,
		medicationProcedure,
		totalCompositePrice,
	};
}

/**
 * Получить услугу инструментальной и медикаментозной обработки каналов (A16.07.030.001..004)
 */
export function getEndoPreparationProcedure(canalsCount: number): {
	code: string;
	title: string;
	price: number;
	category: string;
} {
	const clamped = Math.min(4, Math.max(1, Math.round(canalsCount)));
	const key = `EndoPrep${clamped}Canal${clamped > 1 ? "s" : ""}`;
	return (
		ORDER_804N_PROCEDURES[key] ?? {
			code: `A16.07.030.00${clamped}`,
			title: `Инструментальная и медикаментозная обработка корневых каналов (${clamped}-канальный зуб)`,
			price: 3500 + (clamped - 1) * 2000,
			category: "Эндодонтия",
		}
	);
}

/**
 * Получить услугу пломбирования / обтурации корневых каналов (A16.07.008.001..004)
 */
export function getEndoObturationProcedure(canalsCount: number): {
	code: string;
	title: string;
	price: number;
	category: string;
} {
	const clamped = Math.min(4, Math.max(1, Math.round(canalsCount)));
	const key = `EndoObturation${clamped}Canal${clamped > 1 ? "s" : ""}`;
	return (
		ORDER_804N_PROCEDURES[key] ?? {
			code: `A16.07.008.00${clamped}`,
			title: `Пломбирование корневых каналов зуба (${clamped}-канальный зуб)`,
			price: 3000 + (clamped - 1) * 2000,
			category: "Эндодонтия",
		}
	);
}

/**
 * Чистый клинико-финансовый расчет позиций живой сметы по одонтограмме.
 */
export function calculateLiveInvoiceItems(
	teethData: readonly ToothData[],
	options?: {
		excludedKeys?: ReadonlySet<string> | undefined;
		quantities?: Record<string, number> | undefined;
		discountPercent?: number | undefined;
	},
): LiveInvoiceItem[] {
	const excludedKeys = options?.excludedKeys ?? new Set<string>();
	const quantities = options?.quantities ?? {};
	const discountPercent = options?.discountPercent ?? 0;

	const items: LiveInvoiceItem[] = [];

	for (const t of teethData) {
		const num = t.toothNumber;
		const state = t.state;
		const isDeciduous = isDeciduousTooth(num);

		// 1. Пародонтологический скрининг
		const hasBoneLoss = Boolean(t.boneLossLevel && t.boneLossLevel > 0);
		const hasMobility = Boolean(t.mobility && t.mobility > 0);
		const hasFurcation = Boolean(t.furcationGrade && t.furcationGrade > 0);

		if (hasBoneLoss || hasMobility || hasFurcation) {
			const prSrp = ORDER_804N_PROCEDURES.PeriodontalScaling!;
			const srpKey = `${num}-${prSrp.code}`;
			if (!excludedKeys.has(srpKey)) {
				const qty = quantities[srpKey] ?? 1;
				const disc =
					discountPercent > 0
						? Math.round((prSrp.price * qty * discountPercent) / 100)
						: 0;
				items.push({
					toothNumber: num,
					code: prSrp.code,
					title: `Зуб ${num}: ${prSrp.title}`,
					category: prSrp.category,
					price: prSrp.price,
					quantity: qty,
					discountRub: disc,
				});
			}

			if (t.boneLossLevel && t.boneLossLevel >= 2) {
				const prCur = ORDER_804N_PROCEDURES.PeriodontalCurettage!;
				const curKey = `${num}-${prCur.code}`;
				if (!excludedKeys.has(curKey)) {
					const qty = quantities[curKey] ?? 1;
					const disc =
						discountPercent > 0
							? Math.round((prCur.price * qty * discountPercent) / 100)
							: 0;
					items.push({
						toothNumber: num,
						code: prCur.code,
						title: `Зуб ${num}: ${prCur.title}`,
						category: prCur.category,
						price: prCur.price,
						quantity: qty,
						discountRub: disc,
					});
				}
			}

			if (t.mobility && t.mobility >= 2) {
				const prSplint = ORDER_804N_PROCEDURES.PeriodontalSplinting!;
				const splintKey = `${num}-${prSplint.code}`;
				if (!excludedKeys.has(splintKey)) {
					const qty = quantities[splintKey] ?? 1;
					const disc =
						discountPercent > 0
							? Math.round((prSplint.price * qty * discountPercent) / 100)
							: 0;
					items.push({
						toothNumber: num,
						code: prSplint.code,
						title: `Зуб ${num}: ${prSplint.title}`,
						category: prSplint.category,
						price: prSplint.price,
						quantity: qty,
						discountRub: disc,
					});
				}
			}
		}

		if (!state || state === "Healthy" || state === "Filled") continue;

		// 2. Детская стоматология (Временные зубы 51..85)
		if (isDeciduous) {
			if (state === "Missing") {
				continue;
			}
			let pedPr = ORDER_804N_PROCEDURES.PediatricCaries!;
			if (state === "Pulpitis") {
				pedPr = ORDER_804N_PROCEDURES.PediatricPulpitis!;
			} else if (state === "Periodontitis") {
				pedPr = ORDER_804N_PROCEDURES.PediatricExtraction!;
			} else if (state === "Crown") {
				pedPr = ORDER_804N_PROCEDURES.PediatricCrown!;
			}

			const pedKey = `${num}-${pedPr.code}`;
			if (!excludedKeys.has(pedKey)) {
				const qty = quantities[pedKey] ?? 1;
				const disc =
					discountPercent > 0
						? Math.round((pedPr.price * qty * discountPercent) / 100)
						: 0;
				items.push({
					toothNumber: num,
					code: pedPr.code,
					title: `Временный зуб ${num}: ${pedPr.title}`,
					category: pedPr.category,
					price: pedPr.price,
					quantity: qty,
					discountRub: disc,
				});
			}
			continue;
		}

		// 3. Взрослая эндодонтия (Пульпит и Периодонтит постоянных зубов 11..48)
		if (state === "Pulpitis" || state === "Periodontitis") {
			const clinicalCanals =
				t.clinicalData &&
				typeof t.clinicalData === "object" &&
				"canals" in t.clinicalData &&
				Array.isArray((t.clinicalData as { canals?: unknown[] }).canals)
					? (t.clinicalData as { canals?: unknown[] }).canals?.length
					: undefined;

			const canalsCount = getAnatomicalRootCanalCount(num, clinicalCanals);
			const prepProc = getEndoPreparationProcedure(canalsCount);
			const obtProc = getEndoObturationProcedure(canalsCount);

			// 3a. Инструментальная и медикаментозная обработка корневых каналов (A16.07.030.001..004)
			const prepKey = `${num}-${prepProc.code}`;
			if (!excludedKeys.has(prepKey)) {
				const qty = quantities[prepKey] ?? 1;
				const disc =
					discountPercent > 0
						? Math.round((prepProc.price * qty * discountPercent) / 100)
						: 0;
				items.push({
					toothNumber: num,
					code: prepProc.code,
					title: `Зуб ${num}: ${prepProc.title}`,
					category: prepProc.category,
					price: prepProc.price,
					quantity: qty,
					discountRub: disc,
				});
			}

			// 3b. При периодонтите: временное пломбирование лекарственным препаратом Ca(OH)2 (A16.07.091)
			if (state === "Periodontitis") {
				const medProc = ORDER_804N_PROCEDURES.EndoMedicationCaOH2!;
				const medKey = `${num}-${medProc.code}`;
				if (!excludedKeys.has(medKey)) {
					const qty = quantities[medKey] ?? 1;
					const disc =
						discountPercent > 0
							? Math.round((medProc.price * qty * discountPercent) / 100)
							: 0;
					items.push({
						toothNumber: num,
						code: medProc.code,
						title: `Зуб ${num}: ${medProc.title}`,
						category: medProc.category,
						price: medProc.price,
						quantity: qty,
						discountRub: disc,
					});
				}
			}

			// 3c. Пломбирование / обтурация корневых каналов (A16.07.008.001..004)
			const obtKey = `${num}-${obtProc.code}`;
			if (!excludedKeys.has(obtKey)) {
				const qty = quantities[obtKey] ?? 1;
				const disc =
					discountPercent > 0
						? Math.round((obtProc.price * qty * discountPercent) / 100)
						: 0;
				items.push({
					toothNumber: num,
					code: obtProc.code,
					title: `Зуб ${num}: ${obtProc.title}`,
					category: obtProc.category,
					price: obtProc.price,
					quantity: qty,
					discountRub: disc,
				});
			}

			continue;
		}

		// 4. Взрослая терапия, ортопедия, хирургия (Caries, Crown, Implant, Missing...)
		if (ORDER_804N_PROCEDURES[state]) {
			const pr = ORDER_804N_PROCEDURES[state]!;
			const itemKey = `${num}-${pr.code}`;
			const qty = quantities[itemKey] ?? 1;

			if (!excludedKeys.has(itemKey)) {
				const itemPrice = pr.price;
				const itemDiscount =
					discountPercent > 0
						? Math.round((itemPrice * qty * discountPercent) / 100)
						: 0;

				items.push({
					toothNumber: num,
					code: pr.code,
					title: `Зуб ${num}: ${pr.title}`,
					category: pr.category,
					price: itemPrice,
					quantity: qty,
					discountRub: itemDiscount,
				});
			}
		}

		// Для отсутствующих зубов при планировании имплантации добавляем костную пластику (при атрофии) и протезирование
		if (state === "Missing" || state === "Planned_Implant") {
			if (t.boneLossLevel && t.boneLossLevel > 0) {
				const prGraft = ORDER_804N_PROCEDURES.BoneGrafting!;
				const graftKey = `${num}-${prGraft.code}`;
				if (!excludedKeys.has(graftKey)) {
					const qty = quantities[graftKey] ?? 1;
					const disc =
						discountPercent > 0
							? Math.round((prGraft.price * qty * discountPercent) / 100)
							: 0;
					items.push({
						toothNumber: num,
						code: prGraft.code,
						title: `Зуб ${num}: ${prGraft.title}`,
						category: prGraft.category,
						price: prGraft.price,
						quantity: qty,
						discountRub: disc,
					});
				}
			}

			const prProsth = ORDER_804N_PROCEDURES.ImplantProsthetics!;
			const prosthKey = `${num}-${prProsth.code}`;
			if (!excludedKeys.has(prosthKey)) {
				const qty = quantities[prosthKey] ?? 1;
				const disc =
					discountPercent > 0
						? Math.round((prProsth.price * qty * discountPercent) / 100)
						: 0;
				items.push({
					toothNumber: num,
					code: prProsth.code,
					title: `Зуб ${num}: ${prProsth.title}`,
					category: prProsth.category,
					price: prProsth.price,
					quantity: qty,
					discountRub: disc,
				});
			}
		}
	}

	return items;
}
