/**
 * Patient Mobile Portal & Online Booking Engine
 * (DOMAIN: PORTAL BUSINESS LOGIC, SMS OTP, SBP QR, CALENDAR ICS, FNS DEDUCTION & TIME SLOTS)
 */

import type {
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
 * Calculates complete financial metrics for personal cabinet
 */
export function calculateFinancialSummary(
	profile: PatientPortalProfile,
	invoices: PortalInvoiceItem[],
): PortalFinancialSummary {
	let totalInvoicedRub = 0;
	let totalPaidRub = 0;
	let totalRemainingRub = 0;
	let paidCount = 0;
	let unpaidCount = 0;

	for (const inv of invoices) {
		totalInvoicedRub += inv.totalAmountRub;
		totalPaidRub += inv.paidAmountRub;
		totalRemainingRub += inv.remainingAmountRub;
		if (inv.status === "paid") {
			paidCount++;
		} else {
			unpaidCount++;
		}
	}

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
 * Generates official SBP QR payload for instant payment
 */
export function generateSbpPaymentQrPayload(
	invoiceId: string,
	amountRub: number,
	purposeRu: string,
	clinicId = "dente-spb-01",
): string {
	const amountKopecks = Math.round(amountRub * 100);
	const sanitizedPurpose = encodeURIComponent(purposeRu.slice(0, 120));
	return `https://qr.nspk.ru/AD100049219804218942?type=02&bank=100000000004&sum=${amountKopecks}&cur=RUB&crc=89B2&qrcId=${invoiceId}&cid=${clinicId}&desc=${sanitizedPurpose}`;
}

/**
 * Generates deterministic or pseudo-random 4-digit SMS OTP code
 */
export function generateSmsOtpCode(phone: string, fixedCode = "7788"): { code: string; expiresAtIso: string } {
	const now = new Date();
	const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes validity
	return {
		code: fixedCode || String(Math.floor(1000 + Math.random() * 9000)),
		expiresAtIso: expiresAt.toISOString(),
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
export function formatRussianPhone(rawPhone: string): string {
	if (!rawPhone) return "";
	const digits = rawPhone.replace(/\D/g, "");
	let normalized = digits;
	if (digits.startsWith("8") && digits.length === 11) {
		normalized = `7${digits.slice(1)}`;
	} else if (!digits.startsWith("7") && digits.length === 10) {
		normalized = `7${digits}`;
	}

	if (normalized.length === 0) return "";
	if (normalized.length <= 1) return "+7";
	if (normalized.length <= 4) return `+7 (${normalized.slice(1)}`;
	if (normalized.length <= 7) return `+7 (${normalized.slice(1, 4)}) ${normalized.slice(4)}`;
	if (normalized.length <= 9) return `+7 (${normalized.slice(1, 4)}) ${normalized.slice(4, 7)}-${normalized.slice(7)}`;
	return `+7 (${normalized.slice(1, 4)}) ${normalized.slice(4, 7)}-${normalized.slice(7, 9)}-${normalized.slice(9, 11)}`;
}

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

	const formatIcsDate = (d: Date) => {
		return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
	};

	const nowStr = formatIcsDate(new Date());
	const startStr = formatIcsDate(start);
	const endStr = formatIcsDate(end);
	const uid = `dente-booking-${start.getTime()}-${Math.floor(Math.random() * 10000)}@dente.clinic`;

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
): FnsTaxCertificateSummary {
	const paidThisYear = invoices
		.filter((inv) => inv.status === "paid" && (inv.paidAtIso || inv.issueDateIso).startsWith(String(year)))
		.reduce((sum, inv) => sum + inv.paidAmountRub, 0);

	// Social tax deduction limit in РФ: 150 000 руб (с 2024 г.), возврат 13%
	const eligibleSum = Math.min(paidThisYear, 150000);
	const refund13Pct = Math.round(eligibleSum * 0.13);

	return {
		taxYear: year,
		patientFullName: profile.fullName,
		patientBirthDate: profile.birthDate,
		clinicName: "ООО «Стоматологическая клиника ДЕНТЕ»",
		clinicInn: "7701234567",
		clinicKpp: "770101001",
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
