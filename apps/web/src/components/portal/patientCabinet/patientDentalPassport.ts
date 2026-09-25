/**
 * patientDentalPassport.ts
 *
 * Расчет налогового вычета 13% НДФЛ и интерактивный «Зубной паспорт пациента»:
 * - Расчет возврата 13% с учетом лимитов ст. 219 НК РФ (Код 01: до 150 000 ₽, Код 02: без лимита)
 * - Анатомический перевод FDI номеров зубов (11-48) на понятный русский язык («верхний правый центральный резец»)
 * - Интерактивный зубной паспорт с историей лечения, материалами, оттенками VITA и активными гарантиями
 */

import type {
	PatientInvoiceItem,
	PatientPersonalCabinetData,
} from "./patientCabinetEngine.js";
import { formatRussianDateIso } from "./patientCabinetEngine.js";

// ============================================================================
// TAX DEDUCTION 13% (NDFL REFUND) & DENTAL PASSPORT ENGINES
// ============================================================================

export interface TaxDeductionGuideStep {
	readonly stepNumber: number;
	readonly titleRu: string;
	readonly descriptionRu: string;
	readonly icon: string;
}

export interface PatientTaxDeductionCalculation {
	readonly taxYear: number;
	readonly totalSpentRub: number;
	readonly code01SpentRub: number;
	readonly code01EligibleRub: number;
	readonly code01RefundRub: number;
	readonly code02SpentRub: number;
	readonly code02RefundRub: number;
	readonly totalRefundRub: number;
	readonly maxCode01LimitRub: number;
	readonly maxCode01RefundLimitRub: number;
	readonly isCode01Capped: boolean;
	readonly formattedTotalSpentRu: string;
	readonly formattedTotalRefundRu: string;
	readonly headerBannerTextRu: string;
	readonly guideSteps: readonly TaxDeductionGuideStep[];
}

/**
 * Рассчитывает сумму возврата 13% НДФЛ от государства с учетом лимитов ст. 219 НК РФ:
 * - Код 01 (обычное лечение): лимит 150 000 ₽ / год (макс. возврат 19 500 ₽).
 * - Код 02 (дорогостоящее лечение: имплантация, синус-лифтинг, костная пластика): БЕЗ ЛИМИТА (13% от всей суммы).
 */
export function calculatePatientTaxDeduction(
	invoices: readonly PatientInvoiceItem[],
	targetYear?: number | undefined,
): PatientTaxDeductionCalculation {
	const currentYear = new Date().getFullYear();
	const year = targetYear || currentYear;

	const paidInvoices = invoices.filter((inv) => {
		if (inv.status !== "paid") return false;
		if (year) {
			const invYear = parseInt(inv.issueDateIso.slice(0, 4), 10);
			return invYear === year;
		}
		return true;
	});

	let code01Kop = 0;
	let code02Kop = 0;

	for (const inv of paidInvoices) {
		for (const item of inv.items) {
			const code = item.code || "";
			const title = (item.titleRu || "").toLowerCase();
			const isExpensive =
				code.startsWith("A16.07.054") ||
				code.startsWith("A16.07.041") ||
				code.startsWith("A16.07.055") ||
				title.includes("имплант") ||
				title.includes("синус-лифтинг") ||
				title.includes("синуслифтинг") ||
				title.includes("костная пластика") ||
				title.includes("остеопластик") ||
				title.includes("аугментация");

			const itemKop = Math.round(item.totalRub * 100);
			if (isExpensive) {
				code02Kop += itemKop;
			} else {
				code01Kop += itemKop;
			}
		}
	}

	const code01SpentRub = Math.round(code01Kop / 100);
	const code02SpentRub = Math.round(code02Kop / 100);
	const totalSpentRub = code01SpentRub + code02SpentRub;

	const maxCode01LimitRub = 150000;
	const code01EligibleRub = Math.min(code01SpentRub, maxCode01LimitRub);
	const code01RefundRub = Math.round(code01EligibleRub * 0.13);
	const code02RefundRub = Math.round(code02SpentRub * 0.13);
	const totalRefundRub = code01RefundRub + code02RefundRub;
	const isCode01Capped = code01SpentRub > maxCode01LimitRub;

	const formattedTotalSpentRu = totalSpentRub.toLocaleString("ru-RU") + " ₽";
	const formattedTotalRefundRu = totalRefundRub.toLocaleString("ru-RU") + " ₽";
	const headerBannerTextRu = `Потрачено на лечение: ${formattedTotalSpentRu} • Возврат от налоговой: ${formattedTotalRefundRu}`;

	const guideSteps: readonly TaxDeductionGuideStep[] = [
		{
			stepNumber: 1,
			titleRu: "Шаг 1: Скачайте готовую справку у нас",
			descriptionRu: "Официальная справка по форме КНД 1151156 с реквизитами медицинской лицензии и печатью формируется мгновенно в 1 клик.",
			icon: "FileText",
		},
		{
			stepNumber: 2,
			titleRu: "Шаг 2: Прикрепите в ЛК nalog.ru",
			descriptionRu: "Загрузите файл справки в Личном кабинете налогоплательщика (или Госуслугах) по упрощенной схеме без заполнения 3-НДФЛ.",
			icon: "Building2",
		},
		{
			stepNumber: 3,
			titleRu: "Шаг 3: Получите деньги на карту",
			descriptionRu: "ФНС проверит электронную справку за 15–30 дней и перечислит 13% напрямую на ваш банковский счёт.",
			icon: "CreditCard",
		},
	];

	return {
		taxYear: year,
		totalSpentRub,
		code01SpentRub,
		code01EligibleRub,
		code01RefundRub,
		code02SpentRub,
		code02RefundRub,
		totalRefundRub,
		maxCode01LimitRub,
		maxCode01RefundLimitRub: 19500,
		isCode01Capped,
		formattedTotalSpentRu,
		formattedTotalRefundRu,
		headerBannerTextRu,
		guideSteps,
	};
}

/**
 * Преобразует номер зуба по FDI (11–48) в понятное анатомическое описание на русском языке.
 */
export function formatFdiToothPlainRussian(toothFdi: string): {
	readonly toothFdi: string;
	readonly quadrantRu: string;
	readonly toothTypeRu: string;
	readonly anatomyRu: string;
} {
	const clean = toothFdi.replace(/\D/g, "");
	if (clean.length < 2) {
		return {
			toothFdi,
			quadrantRu: "Челюсть",
			toothTypeRu: "Зуб",
			anatomyRu: `Зуб №${toothFdi}`,
		};
	}

	const quad = parseInt(clean[0]!, 10);
	const pos = parseInt(clean[1]!, 10);

	let quadRu = "";
	if (quad === 1) quadRu = "верхний правый";
	else if (quad === 2) quadRu = "верхний левый";
	else if (quad === 3) quadRu = "нижний левый";
	else if (quad === 4) quadRu = "нижний правый";
	else quadRu = "зубной ряд";

	let typeRu = "";
	if (pos === 1) typeRu = "центральный резец";
	else if (pos === 2) typeRu = "боковой резец";
	else if (pos === 3) typeRu = "клык";
	else if (pos === 4 || pos === 5) typeRu = "премоляр";
	else if (pos === 6 || pos === 7) typeRu = "жевательный";
	else if (pos === 8) typeRu = "зуб мудрости";
	else typeRu = "зуб";

	const anatomyRu = `${quadRu} ${typeRu}`;

	return {
		toothFdi: clean,
		quadrantRu: quadRu,
		toothTypeRu: typeRu,
		anatomyRu,
	};
}

export interface PatientDentalPassportEntry {
	readonly toothFdi: string;
	readonly anatomyRu: string;
	readonly procedureTitleRu: string;
	readonly materialName: string;
	readonly doctorName: string;
	readonly treatmentDateRu: string;
	readonly warrantyMonths: number;
	readonly warrantyValidUntilRu: string;
	readonly isWarrantyActive: boolean;
	readonly lotNumber?: string | undefined;
	readonly vitaShade?: string | undefined;
	readonly plainSummaryRu: string;
}

export interface PatientDentalPassport {
	readonly patientName: string;
	readonly cardNumber: string;
	readonly totalTreatedTeethCount: number;
	readonly activeGuaranteesCount: number;
	readonly entries: readonly PatientDentalPassportEntry[];
}

/**
 * Генерирует интерактивный «Зубной паспорт пациента» с понятными карточками на русском языке.
 */
export function generatePatientDentalPassport(
	data: PatientPersonalCabinetData,
): PatientDentalPassport {
	const entries: PatientDentalPassportEntry[] = [];
	const seenTeeth = new Set<string>();

	// 1. Проверяем гарантийные сертификаты
	if (data.warranties && data.warranties.length > 0) {
		for (const war of data.warranties) {
			const dateStr = formatRussianDateIso(war.issueDateIso);
			const expYear = new Date(war.expirationDateIso).getFullYear();
			const expMonthName = new Date(war.expirationDateIso).toLocaleDateString("ru-RU", { month: "long" });
			const validUntil = `${expMonthName} ${expYear} г.`;
			const isWarrantyActive = war.status === "active" && new Date(war.expirationDateIso) > new Date();

			for (const item of war.items) {
				const teethList = item.toothFdi.split(",").map((t) => t.trim()).filter(Boolean);
				for (const toothStr of teethList) {
					const cleanFdi = toothStr.replace(/\D/g, "");
					const anatomyInfo = formatFdiToothPlainRussian(cleanFdi || toothStr);

					let shortProcedure = "установлена пломба";
					const workLower = item.workTitleRu.toLowerCase();
					if (workLower.includes("имплант")) {
						shortProcedure = "установлен имплантат";
					} else if (workLower.includes("коронк")) {
						shortProcedure = "установлена коронка";
					} else if (workLower.includes("винил") || workLower.includes("винир")) {
						shortProcedure = "установлен керамический винир";
					} else if (workLower.includes("пломб") || workLower.includes("реставрац")) {
						shortProcedure = "установлена пломба";
					}

					const matShort = item.materialName.split("(")[0]?.trim() || item.materialName;
					const plainSummaryRu = `Зуб ${cleanFdi || toothStr}: ${anatomyInfo.anatomyRu} — ${shortProcedure} ${matShort}, гарантия ${war.adjustedWarrantyMonths} мес. до ${expYear} г.`;

					entries.push({
						toothFdi: cleanFdi || toothStr,
						anatomyRu: anatomyInfo.anatomyRu,
						procedureTitleRu: item.workTitleRu,
						materialName: item.materialName,
						doctorName: war.doctorName,
						treatmentDateRu: dateStr,
						warrantyMonths: war.adjustedWarrantyMonths,
						warrantyValidUntilRu: validUntil,
						isWarrantyActive,
						lotNumber: item.lotNumber,
						vitaShade: item.vitaShade,
						plainSummaryRu,
					});

					seenTeeth.add(cleanFdi || toothStr);
				}
			}
		}
	}

	// 2. Дополняем из оплаченных счетов, если зубы не вошли в гарантийные карточки
	if (data.invoices) {
		for (const inv of data.invoices) {
			if (inv.status !== "paid") continue;
			const dateStr = formatRussianDateIso(inv.paidAtIso?.slice(0, 10) || inv.issueDateIso);
			for (const item of inv.items) {
				if (!item.toothFdi) continue;
				const teethList = item.toothFdi.split(",").map((t) => t.trim()).filter(Boolean);
				for (const toothStr of teethList) {
					const cleanFdi = toothStr.replace(/\D/g, "");
					if (seenTeeth.has(cleanFdi || toothStr)) continue;

					const anatomyInfo = formatFdiToothPlainRussian(cleanFdi || toothStr);
					const plainSummaryRu = `Зуб ${cleanFdi || toothStr}: ${anatomyInfo.anatomyRu} — ${item.titleRu}, лечение выполнено ${dateStr}.`;

					entries.push({
						toothFdi: cleanFdi || toothStr,
						anatomyRu: anatomyInfo.anatomyRu,
						procedureTitleRu: item.titleRu,
						materialName: "Сертифицированный стоматологический материал",
						doctorName: data.curatingDoctor,
						treatmentDateRu: dateStr,
						warrantyMonths: 12,
						warrantyValidUntilRu: "12 месяцев",
						isWarrantyActive: true,
						plainSummaryRu,
					});

					seenTeeth.add(cleanFdi || toothStr);
				}
			}
		}
	}

	// Сортируем зубы по порядку FDI
	entries.sort((a, b) => {
		const numA = parseInt(a.toothFdi.replace(/\D/g, ""), 10) || 0;
		const numB = parseInt(b.toothFdi.replace(/\D/g, ""), 10) || 0;
		return numA - numB;
	});

	const activeGuaranteesCount = entries.filter((e) => e.isWarrantyActive).length;

	return {
		patientName: data.fullName,
		cardNumber: data.cardNumber,
		totalTreatedTeethCount: entries.length,
		activeGuaranteesCount,
		entries,
	};
}
