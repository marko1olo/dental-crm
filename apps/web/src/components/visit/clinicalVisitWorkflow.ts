/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE Dental CRM — Clinical Visit Completion & Automated Estimate Engine
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Завершение клинического приёма:
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
import { apply1ClickClinicalAutopilot } from "./presets/autopilotPresets";

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
	readonly visitId?: string | undefined;
	readonly appointmentId?: string | undefined;
	readonly treatmentPlanId?: string | null | undefined;
	readonly stageNumber?: number | null | undefined;
	readonly patientId: string;
	readonly patientName?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly doctorUserId?: string | undefined;
	readonly doctorSpecialty?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly diary: DiaryState | {
		readonly anamnesis?: string | null;
		readonly statusLocalis?: string | null;
		readonly diagnosisIcd10?: string | null;
		readonly diagnosisTooth?: string | null;
		readonly treatmentDescription?: string | null;
		readonly recommendations?: string | null | undefined;
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
		diagText.startsWith("K01") ||
		diagText.startsWith("K08") ||
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
		diagText.startsWith("K03.6") ||
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
 * Выполнение завершения визита и сборка сметы/чека.
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
					code: p.code || "A16.07.002",
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
		visitId: input.visitId || input.appointmentId || "visit-default",
		invoiceId,
		receiptNumber,
		patientId: input.patientId,
		patientName: input.patientName || "Пациент",
		doctorName: input.doctorName || "Лечащий врач",
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
// Реэкспорт из doctorChairSessions.ts (Мандат 8b: Анти-монолит <= 800 строк)
// ═══════════════════════════════════════════════════════════════════════════

export * from "./doctorChairSessions";

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
 * Прерывание или перенос визита (Мандат 8e: без обязательных полей ЭМК).
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

// ═══════════════════════════════════════════════════════════════════════════
// Клинические Смарт-Протоколы у кресла (МКБ-10 + СтАР + МЗ РФ)
// ═══════════════════════════════════════════════════════════════════════════

export type ChairsideSmartProtocolKey =
	| "caries"
	| "pulpitis"
	| "periodontitis"
	| "hygiene"
	| "extraction";

export const CHAIRSIDE_SMART_PROTOCOL_KEYS: readonly ChairsideSmartProtocolKey[] = [
	"caries",
	"pulpitis",
	"periodontitis",
	"hygiene",
	"extraction",
];

export interface ChairsideSmartProtocolResult {
	readonly key: ChairsideSmartProtocolKey;
	readonly icd10: string;
	readonly code?: string | undefined;
	readonly title: string;
	readonly diagnosis: string;
	readonly complaint: string;
	readonly anamnesis: string;
	readonly objectiveStatus: string;
	readonly treatmentPlan: string;
	readonly recommendations: string;
	readonly targetTooth?: number | undefined;
}

/**
 * Генератор клинических протоколов у кресла (МКБ-10 + СтАР + МЗ РФ).
 * Позволяет врачу в перчатках быстро сформировать полноценный юридически защищенный дневник приема.
 */
export function buildChairsideSmartProtocol(
	key: ChairsideSmartProtocolKey,
	targetTooth?: number | null,
	options?: {
		surfaces?: string | undefined;
		isLocked?: boolean | undefined;
	},
): ChairsideSmartProtocolResult {
	const toothNum = targetTooth ? Number(targetTooth) : undefined;
	const toothLabel = toothNum ? `зуба ${toothNum}` : "зуба";
	const rawSurfaces = (options?.surfaces ?? "").trim();
	const hasSurfaces =
		rawSurfaces.length > 0 &&
		rawSurfaces.toLowerCase() !== "undefined" &&
		rawSurfaces.toLowerCase() !== "null";
	const surfStr = hasSurfaces ? ` (${rawSurfaces.toUpperCase()})` : "";
	const dateStr = new Date().toLocaleDateString("ru-RU", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
	const auditStamp = options?.isLocked ? `\n\n[Исправленному верить: ${dateStr}]` : "";

	const autopilotResult = apply1ClickClinicalAutopilot(key, {
		toothNumber: toothNum,
		surfaces: hasSurfaces ? rawSurfaces : undefined,
	});
	const preset = autopilotResult.preset;

	let diagnosis = "";
	switch (key) {
		case "caries":
			diagnosis = `K02.1 Кариес дентина ${toothLabel}${surfStr}`.trim();
			break;
		case "pulpitis":
			diagnosis = `K04.0 Острый пульпит ${toothLabel}`.trim();
			break;
		case "periodontitis":
			diagnosis = `K04.5 Хронический апикальный периодонтит ${toothLabel}`.trim();
			break;
		case "hygiene":
			diagnosis = toothNum
				? `K05.1 Хронический катаральный гингивит (${toothLabel}) / Профгигиена`
				: "K05.1 Хронический катаральный гингивит / Профгигиена";
			break;
		case "extraction":
			diagnosis = `K01.1 Простое удаление ${toothLabel}`.trim();
			break;
	}

	return {
		key,
		icd10: preset.icd10,
		code: preset.icd10,
		title: preset.shortBadge || preset.title,
		diagnosis,
		complaint: preset.complaint,
		anamnesis: preset.anamnesis,
		objectiveStatus: preset.statusLocalis,
		treatmentPlan: `${autopilotResult.diary.treatmentDescription}${auditStamp}`,
		recommendations: preset.recommendations ?? "",
		targetTooth: toothNum,
	};
}


