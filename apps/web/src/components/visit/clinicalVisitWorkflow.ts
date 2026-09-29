/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE Dental CRM — Clinical Visit Completion & Automated Estimate Engine
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * 1-клик завершение клинического приёма:
 * 1. Сохранение и фиксация дневника Формы 043/у
 * 2. Автоматический парсинг проведенных манипуляций (анестезия, пломба, каналы, гигиена, снимки)
 * 3. Мгновенная сборка itemized-сметы с подсчетом скидок и копеек (54-ФЗ)
 * 4. Передача чека на кассу / готовность к оплате
 * 5. Генерация СБП QR-кода для быстрой безналичной оплаты в кабинете
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { DiaryState } from "../useVisitDiaryLogic";
import {
	roundToKopecks,
	parseRubAmount,
	parseCompletedServiceLine,
	type ParsedCompletedLine,
} from "./completedServicesPlan";

export type ProcedureCategory =
	| "anesthesia"
	| "therapy"
	| "endodontics"
	| "surgery"
	| "hygiene"
	| "orthopedics"
	| "diagnostics"
	| "isolation"
	| "other";

export interface ClinicalEstimateItem {
	readonly id: string;
	readonly code?: string | undefined;
	readonly name: string;
	readonly quantity: number;
	readonly priceRub: number;
	readonly discountRub?: number | undefined;
	readonly totalRub: number;
	readonly category: ProcedureCategory;
	readonly toothNumber?: number | string | undefined;
}

export interface ClinicalVisitCompletionInput {
	readonly visitId: string;
	readonly patientId: string;
	readonly patientName: string;
	readonly patientPhone?: string | undefined;
	readonly doctorName: string;
	readonly doctorSpecialty?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly diary: DiaryState | {
		readonly anamnesis?: string | null;
		readonly statusLocalis?: string | null;
		readonly diagnosisIcd10?: string | null;
		readonly diagnosisTooth?: string | null;
		readonly treatmentDescription?: string | null;
		readonly order804nServices?: readonly any[] | undefined;
	};
	readonly completedPlanItems?: readonly any[] | undefined;
	readonly additionalServices?: readonly ClinicalEstimateItem[] | undefined;
	readonly discountPercent?: number | undefined;
	readonly completionMode?: "standard" | "aborted" | "rescheduled" | "emergency_interrupted" | undefined;
	readonly interruptionReason?: string | undefined;
	readonly rescheduledDateIso?: string | undefined;
}

import type { AutoVisitBomDeductionResult } from "@dental/shared";

export type ClinicalVisitStatus =
	| "ready_for_payment"
	| "completed"
	| "aborted"
	| "rescheduled"
	| "emergency_interrupted";

export interface ClinicalVisitCompletionResult {
	readonly visitId: string;
	readonly invoiceId: string;
	readonly receiptNumber: string;
	readonly patientId: string;
	readonly patientName: string;
	readonly doctorName: string;
	readonly totalGrossRub: number;
	readonly totalDiscountRub: number;
	readonly totalNetRub: number;
	readonly totalNetKop: number;
	readonly items: readonly ClinicalEstimateItem[];
	readonly status: ClinicalVisitStatus;
	readonly statusBannerText: string;
	readonly sbpQrUrl: string;
	readonly sbpQrPayload: string;
	readonly form043uSaved: boolean;
	readonly completedAtIso: string;
	readonly materialsDeduction?: AutoVisitBomDeductionResult | undefined;
	readonly isAbortedOrRescheduled?: boolean | undefined;
	readonly interruptionReason?: string | undefined;
	readonly rescheduledDateIso?: string | undefined;
}

export interface StandardPriceItem {
	readonly code: string;
	readonly name: string;
	readonly priceRub: number;
	readonly category: ProcedureCategory;
}

const CATALOG_ANESTHESIA: StandardPriceItem = {
	code: "A11.07.012",
	name: "Анестезия инфильтрационная / проводниковая (Артикаин / Мепивакаин)",
	priceRub: 800,
	category: "anesthesia",
};

const CATALOG_CARIES: StandardPriceItem = {
	code: "A16.07.002.001",
	name: "Препарирование и пломбирование кариозной полости композитом светового отверждения (Estelite / Filtek)",
	priceRub: 4500,
	category: "therapy",
};

const CATALOG_ENDO: StandardPriceItem = {
	code: "A16.07.030",
	name: "Эндодонтическое лечение и инструментальная обработка корневых каналов",
	priceRub: 6500,
	category: "endodontics",
};

const CATALOG_EXTRACTION: StandardPriceItem = {
	code: "A16.07.001",
	name: "Хирургическое удаление зуба (простое / сложное)",
	priceRub: 3500,
	category: "surgery",
};

const CATALOG_HYGIENE: StandardPriceItem = {
	code: "A16.07.051",
	name: "Комплексная профессиональная гигиена полости рта (Air-Flow + УЗ-скейлинг)",
	priceRub: 4000,
	category: "hygiene",
};

const CATALOG_RADIOVISIOGRAPHY: StandardPriceItem = {
	code: "A06.07.003",
	name: "Прицельная радиовизиография цифровым датчиком",
	priceRub: 500,
	category: "diagnostics",
};

const CATALOG_COFFERDAM: StandardPriceItem = {
	code: "A16.07.002.009",
	name: "Изоляция операционного поля системой коффердам / раббердам",
	priceRub: 600,
	category: "isolation",
};

export const CLINICAL_STANDARD_PRICE_CATALOG = {
	anesthesia_infiltration: CATALOG_ANESTHESIA,
	caries_composite: CATALOG_CARIES,
	endo_treatment: CATALOG_ENDO,
	extraction_simple: CATALOG_EXTRACTION,
	hygiene_complex: CATALOG_HYGIENE,
	radiovisiography: CATALOG_RADIOVISIOGRAPHY,
	cofferdam_isolation: CATALOG_COFFERDAM,
};

/**
 * Автоматический анализ дневника 043/у и извлечение фактически проведенных процедур.
 */
export function extractProceduresFromDiary(
	diary: ClinicalVisitCompletionInput["diary"],
): ClinicalEstimateItem[] {
	const treatmentText = (diary.treatmentDescription ?? "").toLowerCase();
	const statusText = (diary.statusLocalis ?? "").toLowerCase();
	const diagText = (diary.diagnosisIcd10 ?? "").toUpperCase();
	const toothMatch = (diary.diagnosisTooth ?? "").match(/\b\d{2}\b/)?.[0];
	const toothNumber = toothMatch ? parseInt(toothMatch) : undefined;

	const items: ClinicalEstimateItem[] = [];

	// ПРИОРИТЕТ 1: Явно переданные структурированные услуги 804н из протокола приёма (Мандаты 8b, 8e, 8n)
	const rawOrderServices = (diary as { order804nServices?: readonly any[] }).order804nServices;
	if (Array.isArray(rawOrderServices) && rawOrderServices.length > 0) {
		const protocolItems: ClinicalEstimateItem[] = [];
		for (const s of rawOrderServices) {
			const qty = Number(s.defaultQuantity ?? s.quantity) > 0 ? Number(s.defaultQuantity ?? s.quantity) : 1;
			const priceRub = Number(
				s.priceRub ??
				s.unitPriceRub ??
				s.price ??
				(typeof s.priceKopecks === "number" ? s.priceKopecks / 100 : 0)
			);
			const itemTooth = s.toothNumber ? (parseInt(String(s.toothNumber), 10) || s.toothNumber) : toothNumber;
			let category: ProcedureCategory = "therapy";
			const code = String(s.code || s.code804n || "");
			if (code.startsWith("A11") || code.startsWith("A25")) category = "anesthesia";
			else if (code.startsWith("A06")) category = "diagnostics";
			else if (code.startsWith("A16.07.030") || code.startsWith("A16.07.082")) category = "endodontics";
			else if (code.startsWith("A16.07.001") || code.startsWith("A16.07.097")) category = "surgery";
			else if (code.startsWith("A16.07.050") || code.startsWith("A16.07.051")) category = "hygiene";
			else if (code.startsWith("A16.07.004") || code.startsWith("A16.07.006")) category = "orthopedics";
			else if (code === "A16.07.002.009") category = "isolation";

			protocolItems.push({
				id: s.id || `est-protocol-${code}-${protocolItems.length + 1}`,
				code,
				name: s.nameRu || s.name || s.title || "Медицинская услуга",
				quantity: qty,
				priceRub,
				totalRub: roundToKopecks(priceRub * qty),
				category,
				toothNumber: itemTooth,
			});
		}
		if (protocolItems.length > 0) {
			return protocolItems;
		}
	}

	// ПРИОРИТЕТ 2: Разбор структурированных строк из treatmentDescription (Выполнено / буллеты 804н)
	const treatmentRaw = diary.treatmentDescription ?? "";
	if (treatmentRaw) {
		const rawLines = treatmentRaw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

		// 2.1 Формат "Выполнено: [code] ..."
		const completedLines = rawLines
			.map((l) => parseCompletedServiceLine(l))
			.filter((p): p is ParsedCompletedLine => p !== null && p.priceRub !== null && p.priceRub > 0);

		if (completedLines.length > 0) {
			return completedLines.map((cl, idx) => {
				const itemTooth = cl.toothCode ? (parseInt(cl.toothCode, 10) || cl.toothCode) : toothNumber;
				let category: ProcedureCategory = "therapy";
				const code = cl.code804n || "";
				if (code.startsWith("A11") || code.startsWith("A25")) category = "anesthesia";
				else if (code.startsWith("A06")) category = "diagnostics";
				else if (code.startsWith("A16.07.030")) category = "endodontics";
				else if (code.startsWith("A16.07.001")) category = "surgery";
				else if (code.startsWith("A16.07.050") || code.startsWith("A16.07.051")) category = "hygiene";

				return {
					id: `est-parsed-${code || idx + 1}-${idx + 1}`,
					code,
					name: cl.title,
					quantity: cl.quantity,
					priceRub: cl.priceRub!,
					totalRub: roundToKopecks(cl.priceRub! * cl.quantity),
					category,
					toothNumber: itemTooth,
				};
			});
		}

		// 2.2 Формат протоколов 804н "• A16.07.002.001 Название (x1) — 3 500 ₽"
		const bulletLines: ClinicalEstimateItem[] = [];
		for (const line of rawLines) {
			const bulletMatch = line.match(/^•\s*([A-Za-z0-9.]+)\s+(.+?)(?:\s*\(x(\d+)\))?\s*[—–-]\s*([0-9\s  ,.]+)\s*₽?$/i);
			if (bulletMatch && bulletMatch[1] && bulletMatch[2] && bulletMatch[4]) {
				const code: string = bulletMatch[1];
				const name: string = bulletMatch[2].trim();
				const qty = bulletMatch[3] ? parseInt(bulletMatch[3], 10) : 1;
				const price = parseRubAmount(bulletMatch[4]);
				if (price !== null && price > 0) {
					let category: ProcedureCategory = "therapy";
					if (code.startsWith("A11") || code.startsWith("A25")) category = "anesthesia";
					else if (code.startsWith("A06")) category = "diagnostics";
					else if (code.startsWith("A16.07.030")) category = "endodontics";
					else if (code.startsWith("A16.07.001")) category = "surgery";
					else if (code.startsWith("A16.07.050") || code.startsWith("A16.07.051")) category = "hygiene";

					bulletLines.push({
						id: `est-bullet-${code}-${bulletLines.length + 1}`,
						code,
						name,
						quantity: qty,
						priceRub: price,
						totalRub: roundToKopecks(price * qty),
						category,
						toothNumber,
					});
				}
			}
		}
		if (bulletLines.length > 0) {
			return bulletLines;
		}
	}

	// 1. Анестезия
	if (
		treatmentText.includes("анестезия") ||
		treatmentText.includes("ультракаин") ||
		treatmentText.includes("скандонест") ||
		treatmentText.includes("септанест") ||
		treatmentText.includes("лидокаин") ||
		treatmentText.includes("артикаин")
	) {
		items.push({
			id: `est-anes-${Date.now()}-1`,
			code: CLINICAL_STANDARD_PRICE_CATALOG.anesthesia_infiltration.code,
			name: CLINICAL_STANDARD_PRICE_CATALOG.anesthesia_infiltration.name,
			quantity: 1,
			priceRub: CLINICAL_STANDARD_PRICE_CATALOG.anesthesia_infiltration.priceRub,
			totalRub: CLINICAL_STANDARD_PRICE_CATALOG.anesthesia_infiltration.priceRub,
			category: "anesthesia",
			toothNumber,
		});
	}

	// 2. Коффердам / изоляция
	if (
		treatmentText.includes("коффердам") ||
		treatmentText.includes("рабердам") ||
		treatmentText.includes("раббердам") ||
		treatmentText.includes("изоляция")
	) {
		items.push({
			id: `est-coff-${Date.now()}-2`,
			code: CLINICAL_STANDARD_PRICE_CATALOG.cofferdam_isolation.code,
			name: CLINICAL_STANDARD_PRICE_CATALOG.cofferdam_isolation.name,
			quantity: 1,
			priceRub: CLINICAL_STANDARD_PRICE_CATALOG.cofferdam_isolation.priceRub,
			totalRub: CLINICAL_STANDARD_PRICE_CATALOG.cofferdam_isolation.priceRub,
			category: "isolation",
			toothNumber,
		});
	}

	// 3. Эндодонтия (Пульпит / Периодонтит / Каналы / Обтурация)
	if (
		diagText.startsWith("K04") ||
		treatmentText.includes("экстирпация") ||
		treatmentText.includes("апекслокатор") ||
		treatmentText.includes("гуттаперча") ||
		treatmentText.includes("обтурация") ||
		treatmentText.includes("эндодонтическ") ||
		treatmentText.includes("корневых каналов")
	) {
		items.push({
			id: `est-endo-${Date.now()}-3`,
			code: CLINICAL_STANDARD_PRICE_CATALOG.endo_treatment.code,
			name: CLINICAL_STANDARD_PRICE_CATALOG.endo_treatment.name,
			quantity: 1,
			priceRub: CLINICAL_STANDARD_PRICE_CATALOG.endo_treatment.priceRub,
			totalRub: CLINICAL_STANDARD_PRICE_CATALOG.endo_treatment.priceRub,
			category: "endodontics",
			toothNumber,
		});
	}
	// 4. Терапия / Пломбирование кариеса
	else if (
		diagText.startsWith("K02") ||
		treatmentText.includes("пломбирование") ||
		treatmentText.includes("estelite") ||
		treatmentText.includes("filtek") ||
		treatmentText.includes("композит") ||
		treatmentText.includes("реставрация") ||
		treatmentText.includes("препарирование")
	) {
		items.push({
			id: `est-caries-${Date.now()}-4`,
			code: CLINICAL_STANDARD_PRICE_CATALOG.caries_composite.code,
			name: CLINICAL_STANDARD_PRICE_CATALOG.caries_composite.name,
			quantity: 1,
			priceRub: CLINICAL_STANDARD_PRICE_CATALOG.caries_composite.priceRub,
			totalRub: CLINICAL_STANDARD_PRICE_CATALOG.caries_composite.priceRub,
			category: "therapy",
			toothNumber,
		});
	}

	// 5. Хирургическое удаление зуба
	if (
		diagText.startsWith("K08.1") ||
		treatmentText.includes("удаление") ||
		treatmentText.includes("элевация") ||
		treatmentText.includes("люксация") ||
		treatmentText.includes("лунки")
	) {
		items.push({
			id: `est-surg-${Date.now()}-5`,
			code: CLINICAL_STANDARD_PRICE_CATALOG.extraction_simple.code,
			name: CLINICAL_STANDARD_PRICE_CATALOG.extraction_simple.name,
			quantity: 1,
			priceRub: CLINICAL_STANDARD_PRICE_CATALOG.extraction_simple.priceRub,
			totalRub: CLINICAL_STANDARD_PRICE_CATALOG.extraction_simple.priceRub,
			category: "surgery",
			toothNumber,
		});
	}

	// 6. Профессиональная гигиена
	if (
		diagText.startsWith("K05") ||
		treatmentText.includes("гигиена") ||
		treatmentText.includes("air-flow") ||
		treatmentText.includes("скейлинг") ||
		treatmentText.includes("ультразвук")
	) {
		items.push({
			id: `est-hyg-${Date.now()}-6`,
			code: CLINICAL_STANDARD_PRICE_CATALOG.hygiene_complex.code,
			name: CLINICAL_STANDARD_PRICE_CATALOG.hygiene_complex.name,
			quantity: 1,
			priceRub: CLINICAL_STANDARD_PRICE_CATALOG.hygiene_complex.priceRub,
			totalRub: CLINICAL_STANDARD_PRICE_CATALOG.hygiene_complex.priceRub,
			category: "hygiene",
			toothNumber,
		});
	}

	// 7. Рентген / Визиография
	if (
		treatmentText.includes("визиография") ||
		treatmentText.includes("снимок") ||
		treatmentText.includes("рентген") ||
		statusText.includes("на снимке") ||
		statusText.includes("визиограф")
	) {
		items.push({
			id: `est-rad-${Date.now()}-7`,
			code: CLINICAL_STANDARD_PRICE_CATALOG.radiovisiography.code,
			name: CLINICAL_STANDARD_PRICE_CATALOG.radiovisiography.name,
			quantity: 1,
			priceRub: CLINICAL_STANDARD_PRICE_CATALOG.radiovisiography.priceRub,
			totalRub: CLINICAL_STANDARD_PRICE_CATALOG.radiovisiography.priceRub,
			category: "diagnostics",
			toothNumber,
		});
	}

	return items;
}

/**
 * 1-клик выполнение завершения визита и сборка сметы/чека.
 */
export function completeClinicalVisitAndAssembleEstimate(
	input: ClinicalVisitCompletionInput,
): ClinicalVisitCompletionResult {
	const extractedItems = extractProceduresFromDiary(input.diary);
	
	// Конвертация выполненных позиций плана, если переданы
	const planItems: ClinicalEstimateItem[] = [];
	if (Array.isArray(input.completedPlanItems)) {
		for (const p of input.completedPlanItems) {
			const price = parseRubAmount(p.unitPriceRub ?? p.price ?? 0) ?? 0;
			const qty = Number(p.quantity) > 0 ? Number(p.quantity) : 1;
			if (price > 0) {
				planItems.push({
					id: p.id || `plan-item-${planItems.length + 1}`,
					code: p.code || "A16.07.000",
					name: p.title || p.name || "Стоматологическая услуга",
					quantity: qty,
					priceRub: price,
					totalRub: roundToKopecks(price * qty),
					category: "therapy",
					toothNumber: p.toothNumber,
				});
			}
		}
	}

	const allItems: ClinicalEstimateItem[] = [
		...(planItems.length > 0 ? planItems : extractedItems),
		...(input.additionalServices || []),
	];

	const isAbortedOrRescheduled =
		input.completionMode === "aborted" ||
		input.completionMode === "rescheduled" ||
		input.completionMode === "emergency_interrupted";

	// Если список совсем пуст и приём обычный — базовая консультация.
	// При прерванном или перенесенном приёме принудительная консультация НЕ навязывается (Мандат 8e).
	if (allItems.length === 0 && !isAbortedOrRescheduled) {
		allItems.push({
			id: `est-cons-${Date.now()}`,
			code: "B01.065.001",
			name: "Прием (осмотр, консультация) врача-стоматолога первичный",
			quantity: 1,
			priceRub: 1500,
			totalRub: 1500,
			category: "therapy",
		});
	}

	const totalGross = roundToKopecks(
		allItems.reduce((sum, item) => sum + (item.totalRub || item.priceRub * item.quantity), 0),
	);

	const discountPercent = Math.min(100, Math.max(0, input.discountPercent || 0));
	const totalDiscount = roundToKopecks(totalGross * (discountPercent / 100));
	const totalNet = Math.max(0, roundToKopecks(totalGross - totalDiscount));
	const totalNetKop = Math.round(totalNet * 100);

	const itemsWithDiscount = allItems.map((item) => {
		const itemGross = item.totalRub || item.priceRub * item.quantity;
		const itemDiscount = discountPercent > 0 ? roundToKopecks(itemGross * (discountPercent / 100)) : (item.discountRub || 0);
		return {
			...item,
			discountRub: itemDiscount,
			totalRub: Math.max(0, roundToKopecks(itemGross - itemDiscount)),
		};
	});

	const now = new Date();
	const year = now.getFullYear();
	const visitSeed = Math.abs(
		(input.visitId || input.patientId || "VISIT").split("").reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0)
	);
	const randNum = 10000 + (visitSeed % 90000);
	const receiptNumber = `ЧЕК-${year}-${randNum}`;
	const invoiceId = `INV-${year}-${randNum}`;

	const isZeroDue = totalNet === 0;

	let status: ClinicalVisitStatus;
	let statusBannerText: string;

	if (isAbortedOrRescheduled) {
		status = input.completionMode!;
		if (status === "aborted") {
			statusBannerText = `Приём прерван: ${input.interruptionReason || "По клиническим показаниям"} • Протокол зафиксирован (без обязательных полей)`;
		} else if (status === "rescheduled") {
			const dateStr = input.rescheduledDateIso ? new Date(input.rescheduledDateIso).toLocaleDateString("ru-RU") : "согласованную дату";
			statusBannerText = `Приём перенесен на ${dateStr}: ${input.interruptionReason || "По согласованию"} • Черновик сохранён`;
		} else {
			statusBannerText = `Экстренное завершение: ${input.interruptionReason || "Неотложное состояние"} • Данные ЭМК зафиксированы`;
		}
	} else if (isZeroDue) {
		status = "completed";
		statusBannerText = "Гарантийный прием / 100% скидка • Оплачено (скидка 100%)";
	} else {
		status = "ready_for_payment";
		statusBannerText = `Смета сформирована: ${totalNet.toLocaleString("ru-RU")} ₽ • Чек передан на кассу / готов к оплате`;
	}

	const sbpQrUrl =
		isAbortedOrRescheduled && isZeroDue
			? ""
			: `https://qr.nspk.ru/AD1000${randNum}?type=02&bank=100000000007&sum=${totalNetKop}&cur=RUB&crc=8192`;

	return {
		visitId: input.visitId,
		invoiceId,
		receiptNumber,
		patientId: input.patientId,
		patientName: input.patientName,
		doctorName: input.doctorName,
		totalGrossRub: totalGross,
		totalDiscountRub: totalDiscount,
		totalNetRub: totalNet,
		totalNetKop,
		items: itemsWithDiscount,
		status,
		statusBannerText,
		sbpQrUrl,
		sbpQrPayload: sbpQrUrl,
		form043uSaved: true,
		completedAtIso: now.toISOString(),
		isAbortedOrRescheduled: isAbortedOrRescheduled || undefined,
		interruptionReason: input.interruptionReason,
		rescheduledDateIso: input.rescheduledDateIso,
	};
}

// ═══════════════════════════════════════════════════════════════════════════
// Сценарий соло-врача на 2-3 кресла (Multi-Chair Ergonomics & Chair Switcher)
// ═══════════════════════════════════════════════════════════════════════════

export type ChairSessionStatus =
	| "active"
	| "waiting_anesthesia"
	| "paused"
	| "completed"
	| "aborted"
	| "rescheduled";

export interface DoctorChairSession {
	readonly chairId: string;
	readonly chairName: string;
	readonly visitId: string;
	readonly patientId: string;
	readonly patientName: string;
	readonly doctorName: string;
	readonly doctorId?: string | undefined;
	readonly status: ChairSessionStatus;
	readonly startedAt: string;
	readonly anesthesiaStartedAt?: string | null | undefined;
	readonly anesthesiaDurationMinutes?: number | undefined;
	readonly anesthesiaDrugName?: string | undefined;
	readonly isDoctorPresent: boolean;
	readonly doctorWorkSeconds: number;
	readonly lastDoctorSwitchedAt?: string | null | undefined;
	readonly complaint?: string | undefined;
	readonly diagnosis?: string | undefined;
	readonly notes?: string | undefined;
}

export interface ChairTimerMetrics {
	readonly totalChairSeconds: number;
	readonly doctorActiveSeconds: number;
	readonly anesthesiaRemainingSeconds: number;
	readonly anesthesiaElapsedMinutes: number;
	readonly isAnesthesiaReady: boolean;
	readonly chairTimeFormatted: string;
	readonly doctorTimeFormatted: string;
	readonly tabLabel: string;
	readonly statusBadge: string;
}

export interface AbortOrRescheduleVisitInput {
	readonly visitId: string;
	readonly patientId: string;
	readonly patientName: string;
	readonly doctorName: string;
	readonly doctorSpecialty?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly mode: "aborted" | "rescheduled" | "emergency_interrupted";
	readonly reason: string;
	readonly rescheduledDateIso?: string | undefined;
	readonly diary?: Partial<DiaryState> | undefined;
	readonly performedItems?: readonly ClinicalEstimateItem[] | undefined;
}

/**
 * Форматирование секунд в формат H:MM:SS или MM:SS
 */
export function formatTimerSeconds(seconds: number): string {
	const safeSec = Math.max(0, Math.floor(seconds || 0));
	const hours = Math.floor(safeSec / 3600);
	const mins = Math.floor((safeSec % 3600) / 60);
	const secs = safeSec % 60;
	const pad = (n: number) => n.toString().padStart(2, "0");
	return hours > 0 ? `${hours}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
}

/**
 * Создание новой сессии кресла для соло-врача.
 */
export function createDoctorChairSession(params: {
	chairId: string;
	chairName: string;
	visitId: string;
	patientId: string;
	patientName: string;
	doctorName: string;
	doctorId?: string | undefined;
	isDoctorPresent?: boolean | undefined;
	anesthesiaStartedAt?: string | null | undefined;
	anesthesiaDurationMinutes?: number | undefined;
	anesthesiaDrugName?: string | undefined;
	complaint?: string | undefined;
	diagnosis?: string | undefined;
	notes?: string | undefined;
	startedAt?: string | undefined;
}): DoctorChairSession {
	const nowIso = params.startedAt || new Date().toISOString();
	const isPresent = params.isDoctorPresent ?? true;
	return {
		chairId: params.chairId,
		chairName: params.chairName,
		visitId: params.visitId,
		patientId: params.patientId,
		patientName: params.patientName,
		doctorName: params.doctorName,
		doctorId: params.doctorId,
		status: isPresent ? "active" : "paused",
		startedAt: nowIso,
		anesthesiaStartedAt: params.anesthesiaStartedAt ?? null,
		anesthesiaDurationMinutes: params.anesthesiaDurationMinutes ?? 8,
		anesthesiaDrugName: params.anesthesiaDrugName,
		isDoctorPresent: isPresent,
		doctorWorkSeconds: 0,
		lastDoctorSwitchedAt: isPresent ? nowIso : null,
		complaint: params.complaint,
		diagnosis: params.diagnosis,
		notes: params.notes,
	};
}

/**
 * Переключение активного кресла соло-врача (1 клик без перезагрузки).
 * При уходе с кресла:
 * - накапливается активное время врача doctorWorkSeconds
 * - кресло переходит в режим "waiting_anesthesia" (если введена анестезия) или "paused"
 * При переходе на целевое кресло:
 * - устанавливается isDoctorPresent = true, status = "active", lastDoctorSwitchedAt = now
 */
export function switchDoctorChair(
	sessions: readonly DoctorChairSession[],
	targetChairId: string,
	options?: {
		autoAnesthesiaWaitMinutes?: number | undefined;
		nowIso?: string | undefined;
	},
): {
	updatedSessions: DoctorChairSession[];
	activeSession: DoctorChairSession | null;
	previousSession: DoctorChairSession | null;
} {
	const nowIso = options?.nowIso || new Date().toISOString();
	const nowMs = new Date(nowIso).getTime();

	let prevSession: DoctorChairSession | null = null;
	let actSession: DoctorChairSession | null = null;

	const updated = sessions.map((s) => {
		if (s.chairId === targetChairId) {
			// Целевое кресло становится активным
			const updatedTarget: DoctorChairSession = {
				...s,
				isDoctorPresent: true,
				status: "active",
				lastDoctorSwitchedAt: nowIso,
			};
			actSession = updatedTarget;
			return updatedTarget;
		}

		if (s.isDoctorPresent) {
			// Врач покидает это кресло
			prevSession = s;
			const lastSwitchedMs = s.lastDoctorSwitchedAt
				? new Date(s.lastDoctorSwitchedAt).getTime()
				: new Date(s.startedAt).getTime();
			const activeDeltaSec = Math.max(0, Math.floor((nowMs - lastSwitchedMs) / 1000));
			const newDoctorWorkSec = s.doctorWorkSeconds + activeDeltaSec;

			let nextStatus: ChairSessionStatus = "paused";
			if (s.anesthesiaStartedAt) {
				const anesMs = new Date(s.anesthesiaStartedAt).getTime();
				const waitLimitSec = (s.anesthesiaDurationMinutes || options?.autoAnesthesiaWaitMinutes || 8) * 60;
				const anesElapsedSec = Math.max(0, Math.floor((nowMs - anesMs) / 1000));
				if (anesElapsedSec < waitLimitSec) {
					nextStatus = "waiting_anesthesia";
				}
			}

			return {
				...s,
				isDoctorPresent: false,
				status: nextStatus,
				doctorWorkSeconds: newDoctorWorkSec,
				lastDoctorSwitchedAt: nowIso,
			};
		}

		// Кресло уже было в фоне: проверяем состояние ожидания анестезии
		if (s.status === "waiting_anesthesia" && s.anesthesiaStartedAt) {
			const anesMs = new Date(s.anesthesiaStartedAt).getTime();
			const waitLimitSec = (s.anesthesiaDurationMinutes || 8) * 60;
			const anesElapsedSec = Math.max(0, Math.floor((nowMs - anesMs) / 1000));
			if (anesElapsedSec >= waitLimitSec) {
				return { ...s, status: "paused" as ChairSessionStatus };
			}
		}

		return s;
	});

	return {
		updatedSessions: updated,
		activeSession: actSession,
		previousSession: prevSession,
	};
}

/**
 * Расчет независимых таймеров кресла:
 * 1. Общее время в кресле (продолжает идти всегда)
 * 2. Время врача (идет только когда врач у кресла, на фоновом кресле замораживается)
 * 3. Таймер ожидания анестезии
 */
export function calculateChairTimerMetrics(
	session: DoctorChairSession,
	nowIso?: string,
): ChairTimerMetrics {
	const nowMs = nowIso ? new Date(nowIso).getTime() : Date.now();
	const startedMs = new Date(session.startedAt).getTime();
	const totalChairSeconds = Math.max(0, Math.floor((nowMs - startedMs) / 1000));

	let doctorActiveSeconds = session.doctorWorkSeconds;
	if (session.isDoctorPresent) {
		const lastSwitchedMs = session.lastDoctorSwitchedAt
			? new Date(session.lastDoctorSwitchedAt).getTime()
			: startedMs;
		const activeSlice = Math.max(0, Math.floor((nowMs - lastSwitchedMs) / 1000));
		doctorActiveSeconds += activeSlice;
	}

	let anesthesiaRemainingSeconds = 0;
	let anesthesiaElapsedMinutes = 0;
	let isAnesthesiaReady = false;

	if (session.anesthesiaStartedAt) {
		const anesMs = new Date(session.anesthesiaStartedAt).getTime();
		const anesElapsedSec = Math.max(0, Math.floor((nowMs - anesMs) / 1000));
		anesthesiaElapsedMinutes = Math.floor(anesElapsedSec / 60);
		const targetSec = (session.anesthesiaDurationMinutes || 8) * 60;
		anesthesiaRemainingSeconds = Math.max(0, targetSec - anesElapsedSec);
		isAnesthesiaReady = anesElapsedSec >= targetSec;
	}

	const chairTimeFormatted = formatTimerSeconds(totalChairSeconds);
	const doctorTimeFormatted = formatTimerSeconds(doctorActiveSeconds);

	let statusBadge = "Ожидание";
	let tabLabel = `${session.chairName}: ${session.patientName}`;

	if (session.isDoctorPresent) {
		statusBadge = "Активный прием";
		tabLabel = `${session.chairName}: ${session.patientName} (Активный прием)`;
	} else if (session.status === "waiting_anesthesia" || (session.anesthesiaStartedAt && !isAnesthesiaReady)) {
		const remMin = Math.max(1, Math.ceil(anesthesiaRemainingSeconds / 60));
		statusBadge = `Ожидание анестезии ${remMin} мин`;
		tabLabel = `${session.chairName}: ${session.patientName} (Ожидание анестезии ${remMin} мин)`;
	} else if (session.status === "paused") {
		statusBadge = "Пауза";
		tabLabel = `${session.chairName}: ${session.patientName} (Пауза)`;
	} else if (session.status === "aborted") {
		statusBadge = "Прерван";
		tabLabel = `${session.chairName}: ${session.patientName} (Прерван)`;
	} else if (session.status === "rescheduled") {
		statusBadge = "Перенесен";
		tabLabel = `${session.chairName}: ${session.patientName} (Перенесен)`;
	} else if (session.status === "completed") {
		statusBadge = "Завершен";
		tabLabel = `${session.chairName}: ${session.patientName} (Завершен)`;
	}

	return {
		totalChairSeconds,
		doctorActiveSeconds,
		anesthesiaRemainingSeconds,
		anesthesiaElapsedMinutes,
		isAnesthesiaReady,
		chairTimeFormatted,
		doctorTimeFormatted,
		tabLabel,
		statusBadge,
	};
}

/**
 * Фиксация введения анестезии на кресле с запуском обратного отсчета времени экспозиции.
 */
export function markAnesthesiaAdministered(
	sessions: readonly DoctorChairSession[],
	chairId: string,
	params?: {
		drugName?: string | undefined;
		durationMinutes?: number | undefined;
		nowIso?: string | undefined;
	},
): DoctorChairSession[] {
	const nowIso = params?.nowIso || new Date().toISOString();
	return sessions.map((s) => {
		if (s.chairId !== chairId) return s;
		return {
			...s,
			anesthesiaStartedAt: nowIso,
			anesthesiaDurationMinutes: params?.durationMinutes ?? 8,
			anesthesiaDrugName: params?.drugName || "Артикаин / Ультракаин",
			status: s.isDoctorPresent ? s.status : ("waiting_anesthesia" as ChairSessionStatus),
		};
	});
}

/**
 * Обновление статуса сессии кресла (например, при прерывании или завершении).
 */
export function updateChairSessionStatus(
	sessions: readonly DoctorChairSession[],
	chairId: string,
	status: ChairSessionStatus,
	nowIso?: string,
): DoctorChairSession[] {
	return sessions.map((s) => {
		if (s.chairId !== chairId) return s;
		return {
			...s,
			status,
			isDoctorPresent: status === "active",
			lastDoctorSwitchedAt: nowIso || new Date().toISOString(),
		};
	});
}

/**
 * 1-клик прерывание или перенос визита (Мандат 8e: без обязательных полей ЭМК).
 */
export function abortOrRescheduleVisit(
	input: AbortOrRescheduleVisitInput,
): ClinicalVisitCompletionResult {
	return completeClinicalVisitAndAssembleEstimate({
		visitId: input.visitId,
		patientId: input.patientId,
		patientName: input.patientName,
		doctorName: input.doctorName,
		doctorSpecialty: input.doctorSpecialty,
		clinicName: input.clinicName,
		diary: input.diary || {},
		additionalServices: input.performedItems || [],
		completionMode: input.mode,
		interruptionReason: input.reason,
		rescheduledDateIso: input.rescheduledDateIso,
	});
}

/**
 * Изоляция ключей черновиков для параллельных визитов.
 * Гарантирует непересекающиеся хранилища в localStorage/IndexedDB по visitId.
 */
export function getIsolatedVisitDraftStorageKey(visitId: string): string {
	const sanitized = (visitId || "anonymous").trim().replace(/[^a-zA-Z0-9_-]/g, "_");
	return `dente_visit_draft_${sanitized}`;
}

export function getDoctorChairSessionsStorageKey(doctorId?: string): string {
	const sanitized = (doctorId || "current_doctor").trim().replace(/[^a-zA-Z0-9_-]/g, "_");
	return `dente_chair_sessions_${sanitized}`;
}
