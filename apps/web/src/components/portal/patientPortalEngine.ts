/**
 * Patient Mobile Portal & Online Booking Engine
 * (DOMAIN: PORTAL BUSINESS LOGIC, SMS OTP, SBP QR, CALENDAR ICS, FNS DEDUCTION & TIME SLOTS)
 */

import type {
	BeforeAfterComparisonPair,
	BookingDoctor,
	BookingService,
	BookingTimeSlot,
	FiscalReceipt54Fz,
	PatientPortalProfile,
	PortalDocumentItem,
	PortalInvoiceItem,
	RadiologyScanItem,
	SpecialtyCategory,
	VisitProtocol043,
} from "./patientPortalTypes";
import {
	formatIcsDate,
	formatPhoneNumber as canonicalFormatPhoneNumber,
} from "../../utils/formatters";
import { kopecksToRubles, rublesToKopecks } from "@dental/shared";

export interface PortalFinancialSummary {
	totalInvoicedRub: number;
	totalPaidRub: number;
	totalRemainingRub: number;
	depositBalanceRub: number;
	loyaltyBonusRub: number;
	cashbackPercent: number;
	paidInvoicesCount: number;
	unpaidInvoicesCount: number;
	hasUnpaidInvoices: boolean;
}

export interface FnsTaxCertificateSummary {
	taxYear: number;
	patientFullName: string;
	patientBirthDate: string;
	clinicName: string;
	clinicInn: string;
	clinicKpp: string;
	serviceCode: string; // "1" - обычное лечение, "2" - дорогостоящее (имплантация/ортодонтия)
	totalPaidEligibleRub: number;
	maxDeductionRefundRub: number; // 13% от суммы (до 19 500 руб при лимите 150 000 руб)
	documentNumber: string;
	issuedDateIso: string;
}

/**
 * Calculates complete financial metrics for personal cabinet using kopeck-exact integer arithmetic
 */
export function calculateFinancialSummary(
	profile: PatientPortalProfile,
	invoices: PortalInvoiceItem[],
): PortalFinancialSummary {
	let totalInvoicedKop = 0;
	let totalPaidKop = 0;
	let totalRemainingKop = 0;
	let paidCount = 0;
	let unpaidCount = 0;

	for (const inv of invoices) {
		totalInvoicedKop += rublesToKopecks(inv.totalAmountRub || 0);
		totalPaidKop += rublesToKopecks(inv.paidAmountRub || 0);
		totalRemainingKop += rublesToKopecks(inv.remainingAmountRub || 0);
		if (inv.status === "paid") {
			paidCount++;
		} else {
			unpaidCount++;
		}
	}

	const totalInvoicedRub = kopecksToRubles(totalInvoicedKop);
	const totalPaidRub = kopecksToRubles(totalPaidKop);
	const totalRemainingRub = kopecksToRubles(totalRemainingKop);

	return {
		totalInvoicedRub,
		totalPaidRub,
		totalRemainingRub,
		depositBalanceRub: profile.depositBalanceRub,
		loyaltyBonusRub: profile.loyaltyBonusRub,
		cashbackPercent: profile.cashbackPercent,
		paidInvoicesCount: paidCount,
		unpaidInvoicesCount: unpaidCount,
		hasUnpaidInvoices: totalRemainingRub > 0 || unpaidCount > 0,
	};
}

/**
 * Validates SMS OTP code entered by patient
 */
export function verifySmsOtpCode(enteredCode: string, expectedCode: string): boolean {
	if (!enteredCode || !expectedCode) return false;
	return enteredCode.trim() === expectedCode.trim();
}

/**
 * Formats raw Russian phone input into standardized "+7 (XXX) XXX-XX-XX" mask
 */
export const formatRussianPhone = canonicalFormatPhoneNumber;

/**
 * Converts FDI tooth number to human-readable anatomical Russian designation
 */
export function formatFdiToothName(fdiNumber: string): string {
	const clean = fdiNumber.replace(".", "").trim();
	const fdiMap: Record<string, string> = {
		"11": "1.1 (Центральный резец ВЧ справа)",
		"12": "1.2 (Боковой резец ВЧ справа)",
		"13": "1.3 (Клык ВЧ справа)",
		"14": "1.4 (Первый премоляр ВЧ справа)",
		"15": "1.5 (Второй премоляр ВЧ справа)",
		"16": "1.6 (Первый моляр ВЧ справа)",
		"17": "1.7 (Второй моляр ВЧ справа)",
		"18": "1.8 (Третий моляр / зуб мудрости ВЧ справа)",
		"21": "2.1 (Центральный резец ВЧ слева)",
		"22": "2.2 (Боковой резец ВЧ слева)",
		"23": "2.3 (Клык ВЧ слева)",
		"24": "2.4 (Первый премоляр ВЧ слева)",
		"25": "2.5 (Второй премоляр ВЧ слева)",
		"26": "2.6 (Первый моляр ВЧ слева)",
		"27": "2.7 (Второй моляр ВЧ слева)",
		"28": "2.8 (Третий моляр / зуб мудрости ВЧ слева)",
		"31": "3.1 (Центральный резец НЧ слева)",
		"32": "3.2 (Боковой резец НЧ слева)",
		"33": "3.3 (Клык НЧ слева)",
		"34": "3.4 (Первый премоляр НЧ слева)",
		"35": "3.5 (Второй премоляр НЧ слева)",
		"36": "3.6 (Первый моляр НЧ слева)",
		"37": "3.7 (Второй моляр НЧ слева)",
		"38": "3.8 (Третий моляр / зуб мудрости НЧ слева)",
		"41": "4.1 (Центральный резец НЧ справа)",
		"42": "4.2 (Боковой резец НЧ справа)",
		"43": "4.3 (Клык НЧ справа)",
		"44": "4.4 (Первый премоляр НЧ справа)",
		"45": "4.5 (Второй премоляр НЧ справа)",
		"46": "4.6 (Первый моляр НЧ справа)",
		"47": "4.7 (Второй моляр НЧ справа)",
		"48": "4.8 (Третий моляр / зуб мудрости НЧ справа)",
	};
	return fdiMap[clean] || `Зуб ${fdiNumber}`;
}

/**
 * Generates RFC 5545 iCalendar (.ics) string for appointment export
 */
export function generateIcsCalendarEvent(
	titleRu: string,
	descriptionRu: string,
	locationRu: string,
	startDateIso: string,
	durationMinutes = 60,
): string {
	const start = new Date(startDateIso);
	const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

	const nowStr = formatIcsDate(new Date());
	const startStr = formatIcsDate(start);
	const endStr = formatIcsDate(end);
	const hashSuffix = Math.abs(
		(titleRu + locationRu).split("").reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0)
	).toString(36);
	const uid = `dente-booking-${start.getTime()}-${hashSuffix}@dente.clinic`;

	return [
		"BEGIN:VCALENDAR",
		"VERSION:2.0",
		"PRODID:-//Dente Dental CRM//Patient Portal Calendar//RU",
		"CALSCALE:GREGORIAN",
		"METHOD:PUBLISH",
		"BEGIN:VEVENT",
		`UID:${uid}`,
		`DTSTAMP:${nowStr}`,
		`DTSTART:${startStr}`,
		`DTEND:${endStr}`,
		`SUMMARY:${titleRu.replace(/,/g, "\\,")}`,
		`DESCRIPTION:${descriptionRu.replace(/,/g, "\\,").replace(/\n/g, "\\n")}`,
		`LOCATION:${locationRu.replace(/,/g, "\\,")}`,
		"STATUS:CONFIRMED",
		"BEGIN:VALARM",
		"TRIGGER:-PT2H",
		"ACTION:DISPLAY",
		"DESCRIPTION:Напоминание о приеме в стоматологической клинике ДЕНТЕ",
		"END:VALARM",
		"END:VEVENT",
		"END:VCALENDAR",
	].join("\r\n");
}

/**
 * Calculates FNS tax deduction summary (КНД 1151156) for social tax deduction
 */
export function generateFnsTaxCertificateData(
	profile: PatientPortalProfile,
	invoices: PortalInvoiceItem[],
	year = 2026,
	clinic?: { name?: string; inn?: string; kpp?: string },
): FnsTaxCertificateSummary {
	const paidThisYearKop = invoices
		.filter((inv) => inv.status === "paid" && (inv.paidAtIso || inv.issueDateIso).startsWith(String(year)))
		.reduce((sum, inv) => sum + rublesToKopecks(inv.paidAmountRub || 0), 0);

	const paidThisYear = kopecksToRubles(paidThisYearKop);
	// Social tax deduction limit in РФ: 150 000 руб (с 2024 г.), возврат 13%
	const eligibleSum = Math.min(paidThisYear, 150000);
	const refund13Pct = Math.round(eligibleSum * 0.13);

	return {
		taxYear: year,
		patientFullName: profile.fullName,
		patientBirthDate: profile.birthDate,
		clinicName: clinic?.name || "ООО «Стоматологическая клиника ДЕНТЕ»",
		clinicInn: clinic?.inn || "",
		clinicKpp: clinic?.kpp || "",
		serviceCode: "1", // 1 - обычное лечение
		totalPaidEligibleRub: paidThisYear,
		maxDeductionRefundRub: refund13Pct,
		documentNumber: `СПР-${year}/0891`,
		issuedDateIso: new Date().toISOString().slice(0, 10),
	};
}

/**
 * Generates realistic appointment time slots for a given date, doctor, and branch
 */
export function generateTimeSlots(
	doctorId: string,
	branchId: string,
	dateIso: string,
): BookingTimeSlot[] {
	const morningTimes = ["09:00", "09:45", "10:30", "11:15"];
	const afternoonTimes = ["12:30", "13:15", "14:00", "15:00", "16:00", "16:45"];
	const eveningTimes = ["17:30", "18:15", "19:00", "19:45", "20:30"];

	const slots: BookingTimeSlot[] = [];

	morningTimes.forEach((time, idx) => {
		slots.push({
			id: `slot-${doctorId}-${dateIso}-${time.replace(":", "")}`,
			doctorId,
			branchId,
			dateIso,
			timeRu: time,
			timePeriod: "morning",
			isOccupied: idx === 1, // sample booked slot
		});
	});

	afternoonTimes.forEach((time, idx) => {
		slots.push({
			id: `slot-${doctorId}-${dateIso}-${time.replace(":", "")}`,
			doctorId,
			branchId,
			dateIso,
			timeRu: time,
			timePeriod: "afternoon",
			isOccupied: idx === 2 || idx === 4,
		});
	});

	eveningTimes.forEach((time, idx) => {
		slots.push({
			id: `slot-${doctorId}-${dateIso}-${time.replace(":", "")}`,
			doctorId,
			branchId,
			dateIso,
			timeRu: time,
			timePeriod: "evening",
			isOccupied: idx === 0,
		});
	});

	return slots;
}

/**
 * Filters doctor list by branch and specialty
 */
export function filterAvailableDoctors(
	doctors: BookingDoctor[],
	branchId: string,
	specialty: SpecialtyCategory,
): BookingDoctor[] {
	return doctors.filter((doc) => {
		const matchesBranch = !branchId || doc.branchIds.includes(branchId);
		const matchesSpecialty = specialty === "all" || doc.specialtyCategory === specialty;
		return matchesBranch && matchesSpecialty;
	});
}

/**
 * Calculates booking deposit required for online booking
 */
export function calculateBookingPrepayment(service: BookingService | undefined, timePeriod: "morning" | "afternoon" | "evening"): {
	requiresPrepayment: boolean;
	prepaymentAmountRub: number;
} {
	if (!service || service.isFreeConsultation || service.priceRub === 0) {
		return { requiresPrepayment: false, prepaymentAmountRub: 0 };
	}
	// For evening peak hours or high-value surgery, request 1000 RUB booking deposit
	if (service.specialtyCategory === "surgery" || timePeriod === "evening") {
		return { requiresPrepayment: true, prepaymentAmountRub: 1000 };
	}
	return { requiresPrepayment: false, prepaymentAmountRub: 0 };
}

/**
 * Calculates polygon clip-path for clinical before/after comparison wiper
 */
export function calculateSplitClipPath(
	percent: number,
	direction: "vertical" | "horizontal" = "vertical",
): string {
	const p = Math.max(0, Math.min(100, percent));
	if (direction === "vertical") {
		return `polygon(${p}% 0%, 100% 0%, 100% 100%, ${p}% 100%)`;
	}
	return `polygon(0% ${p}%, 100% ${p}%, 100% 100%, 0% 100%)`;
}

/**
 * Calculates slider percent from pointer coordinate inside bounding container
 */
export function calculateWiperPointerPercent(
	pointerClientCoord: { clientX: number; clientY: number },
	containerRect: { left: number; top: number; width: number; height: number },
	direction: "vertical" | "horizontal" = "vertical",
): number {
	if (direction === "vertical") {
		if (containerRect.width <= 0) return 50;
		const rel = pointerClientCoord.clientX - containerRect.left;
		const pct = (rel / containerRect.width) * 100;
		return Math.round(Math.max(0, Math.min(100, pct)));
	}
	if (containerRect.height <= 0) return 50;
	const rel = pointerClientCoord.clientY - containerRect.top;
	const pct = (rel / containerRect.height) * 100;
	return Math.round(Math.max(0, Math.min(100, pct)));
}

/**
 * Provides canonical clinical photo protocol before/after presets with VITA shades
 */
export function getPresetBeforeAfterGalleries(patientId: string): readonly BeforeAfterComparisonPair[] {
	return [
		{
			id: `ba-veneer-${patientId}`,
			titleRu: "Эстетическая реставрация фронтальной группы (VITA A3.5 -> BL2)",
			clinicalIndicationRu: "К03.8 Другие уточненные болезни твердых тканей зубов (дисколорит, клиновидные дефекты 1.1, 2.1)",
			procedureNameRu: "Керамические виниры E.max CAD под микроскопом (зубы 1.2, 1.1, 2.1, 2.2)",
			toothFdi: "11, 21",
			defaultSplitPercent: 50,
			doctorNotesRu: "Выполнена предварительная гигиена, микропрепарирование 0.3 мм, фиксация на адгезив Variolink Esthetic.",
			beforeSlot: {
				slotId: "slot-front-before",
				labelRu: "До лечения (Исходный цвет A3.5)",
				angle: "frontal_smile",
				imageUrl: "",
				timestampIso: "2026-06-15T11:30:00Z",
				vitaShade: "A3.5",
			},
			afterSlot: {
				slotId: "slot-front-after",
				labelRu: "После фиксации виниров (Цвет BL2)",
				angle: "frontal_smile",
				imageUrl: "",
				timestampIso: "2026-08-20T16:00:00Z",
				vitaShade: "BL2",
			},
		},
		{
			id: `ba-hygiene-${patientId}`,
			titleRu: "Комплексная профессиональная гигиена и AirFlow",
			clinicalIndicationRu: "К05.1 Хронический простой гингивит, обильный поддесневой и наддесневой зубной камень",
			procedureNameRu: "Ультразвуковой скейлинг Cavitron + AirFlow порошком глицина + ремотерапия",
			defaultSplitPercent: 50,
			doctorNotesRu: "Купировано воспаление маргинальной десны, индекс гигиены Грина-Вермиллиона снижен с 2.4 до 0.2.",
			beforeSlot: {
				slotId: "slot-hygiene-before",
				labelRu: "До гигиены (Зубные отложения)",
				angle: "retractor_12oclock",
				imageUrl: "",
				timestampIso: "2026-07-02T10:00:00Z",
				vitaShade: "A3",
			},
			afterSlot: {
				slotId: "slot-hygiene-after",
				labelRu: "После полировки и AirFlow",
				angle: "retractor_12oclock",
				imageUrl: "",
				timestampIso: "2026-07-02T11:15:00Z",
				vitaShade: "A1",
			},
		},
	];
}
