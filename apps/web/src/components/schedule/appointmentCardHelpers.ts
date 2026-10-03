import type { Appointment, AppointmentLabStatusInfo, AppointmentLabBadgeState } from "@dental/shared";
import { evaluateAppointmentLabStatus } from "@dental/shared";
import { isNegativeAllergyStatement } from "../../utils/somaticNorm";

export interface DoctorSpecialtyTheme {
	specialtyKey: string;
	cardBgClass: string;
	borderClass: string;
	textClass: string;
	badgeClass: string;
	label: string;
}

/**
 * Extracts teeth numbers list from appointment (FDI 11-48, 51-85).
 */
export function extractTeethList(appointment?: Appointment | null): string[] {
	if (!appointment) return [];
	const explicitTeeth = (appointment as any)?.teeth;
	if (Array.isArray(explicitTeeth) && explicitTeeth.length > 0) {
		return explicitTeeth.map(String);
	}
	const singleTooth = (appointment as any)?.toothNumber || (appointment as any)?.tooth;
	if (singleTooth) {
		return [String(singleTooth)];
	}
	const text = `${appointment.reason || ""} ${appointment.comment || ""}`;
	if (!text.trim()) return [];
	const matches = text.match(/\b([1-4][1-8]|[5-8][1-5])\b/g);
	if (matches && matches.length > 0) {
		return Array.from(new Set(matches));
	}
	return [];
}

/**
 * Formats full patient FIO into a readable, non-truncated medical card string:
 * "Иванов Иван Сергеевич" -> "Иванов Иван С."
 * "Петрова Анна" -> "Петрова Анна"
 */
export function formatPatientDisplayFio(name: string | null | undefined): string {
	if (!name || !name.trim()) return "Пациент";
	const parts = name.trim().split(/\s+/);
	if (parts.length >= 3) {
		const lastName = parts[0];
		const firstName = parts[1];
		const middleInitial = parts[2]?.charAt(0);
		return `${lastName} ${firstName} ${middleInitial ? `${middleInitial}.` : ""}`.trim();
	}
	return name.trim();
}

/**
 * Formats doctor full name to short display (e.g. "Смирнов А. В.")
 */
export function formatDoctorShortName(fullName?: string | null): string {
	if (!fullName) return "";
	const cleaned = fullName.trim();
	const parts = cleaned.split(/\s+/);
	const firstPart = parts[0];
	const nameParts =
		parts.length > 1 && firstPart && /^(д-р|доктор|врач)\.?$/i.test(firstPart)
			? parts.slice(1)
			: parts;
	if (nameParts.length === 0) return cleaned || "";
	const surname = nameParts[0] || "";
	if (!surname) return cleaned;
	if (nameParts.length === 1) return surname;

	const initials = nameParts
		.slice(1)
		.map((p) => {
			if (!p) return "";
			const matched = p.match(/[a-zA-Zа-яА-ЯёЁ]/g);
			if (!matched || matched.length === 0) return "";
			if (p.includes(".")) {
				return matched.map((l) => `${l.toUpperCase()}.`).join("");
			}
			const firstLetter = matched[0];
			return firstLetter ? `${firstLetter.toUpperCase()}.` : "";
		})
		.join("");

	return initials ? `${surname} ${initials}` : surname;
}

/**
 * Checks if appointment status is currently active in the dental chair.
 */
export function isAppointmentInChair(status: string | undefined | null): boolean {
	if (!status) return false;
	const s = String(status).toLowerCase();
	return s === "in_treatment" || s === "in_progress";
}

/**
 * Normalizes appointment status label with human-friendly Russian medical terms.
 */
export function getNormalizedAppointmentStatusLabel(
	status: string | undefined | null,
	labels?: Record<string, string>,
): string {
	if (!status) return "";
	const s = String(status).toLowerCase();
	if (s === "in_treatment" || s === "in_progress") return "На приёме";
	if (s === "arrived") return "Ожидает приёма";
	if (s === "completed") return "Ожидает оплаты";
	if (s === "planned") return "Запланирован";
	if (labels) {
		if (labels[s]) return labels[s];
		if (labels[status]) return labels[status];
	}
	return status;
}

/**
 * Resolves doctor specialty clinical theme (WCAG AAA pastel differentiation):
 * - Терапия: blue/indigo (indigo-500/10, text-indigo-700 dark:text-indigo-300)
 * - Ортопедия: purple/violet (purple-500/10, text-purple-700 dark:text-purple-300)
 * - Хирургия / Имплантология: burgundy/brick/rose (rose-500/10, text-rose-800 dark:text-rose-300)
 * - Ортодонтия: emerald/green (emerald-500/10, text-emerald-700 dark:text-emerald-300)
 * - Профгигиена / Пародонтология: teal/cyan (teal-500/10, text-teal-800 dark:text-teal-200)
 * - Детская стоматология: amber (amber-500/10, text-amber-800 dark:text-amber-300)
 */
export function getDoctorSpecialtyTheme(rawSpecialty?: string | null): DoctorSpecialtyTheme | null {
	if (!rawSpecialty) return null;
	const s = rawSpecialty.toLowerCase().trim();

	// Терапия (blue/indigo)
	if (s.includes("therap") || s.includes("терап") || s.includes("лечен")) {
		return {
			specialtyKey: "therapist",
			cardBgClass: "bg-indigo-500/10 dark:bg-indigo-950/30",
			borderClass: "border-indigo-500/30 dark:border-indigo-500/40",
			textClass: "text-indigo-900 dark:text-indigo-200",
			badgeClass: "bg-indigo-500/15 text-indigo-800 dark:text-indigo-300 border-indigo-500/30",
			label: "Терапия",
		};
	}

	// Ортопедия (purple/violet)
	if (s.includes("orthoped") || s.includes("ортопед") || s.includes("протез")) {
		return {
			specialtyKey: "orthopedist",
			cardBgClass: "bg-purple-500/10 dark:bg-purple-950/30",
			borderClass: "border-purple-500/30 dark:border-purple-500/40",
			textClass: "text-purple-900 dark:text-purple-200",
			badgeClass: "bg-purple-500/15 text-purple-800 dark:text-purple-300 border-purple-500/30",
			label: "Ортопедия",
		};
	}

	// Хирургия / Имплантология (rose/burgundy)
	if (s.includes("surg") || s.includes("хирург") || s.includes("implant") || s.includes("имплант") || s.includes("удал")) {
		return {
			specialtyKey: "surgeon",
			cardBgClass: "bg-rose-500/10 dark:bg-rose-950/30",
			borderClass: "border-rose-500/30 dark:border-rose-500/40",
			textClass: "text-rose-900 dark:text-rose-200",
			badgeClass: "bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-500/30",
			label: "Хирургия",
		};
	}

	// Ортодонтия (emerald/green)
	if (s.includes("orthodont") || s.includes("ортодонт") || s.includes("брекет") || s.includes("элайнер")) {
		return {
			specialtyKey: "orthodontist",
			cardBgClass: "bg-emerald-500/10 dark:bg-emerald-950/30",
			borderClass: "border-emerald-500/30 dark:border-emerald-500/40",
			textClass: "text-emerald-900 dark:text-emerald-200",
			badgeClass: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30",
			label: "Ортодонтия",
		};
	}

	// Профгигиена / Пародонтология (teal/cyan)
	if (s.includes("hygien") || s.includes("гигиен") || s.includes("periodont") || s.includes("пародонт") || s.includes("чистк")) {
		return {
			specialtyKey: "hygienist",
			cardBgClass: "bg-teal-500/10 dark:bg-teal-950/30",
			borderClass: "border-teal-500/30 dark:border-teal-500/40",
			textClass: "text-teal-900 dark:text-teal-200",
			badgeClass: "bg-teal-500/15 text-teal-800 dark:text-teal-200 border-teal-500/30",
			label: "Гигиена",
		};
	}

	// Детская стоматология (amber)
	if (s.includes("pediatr") || s.includes("детск")) {
		return {
			specialtyKey: "pediatric",
			cardBgClass: "bg-amber-500/10 dark:bg-amber-950/30",
			borderClass: "border-amber-500/30 dark:border-amber-500/40",
			textClass: "text-amber-900 dark:text-amber-200",
			badgeClass: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30",
			label: "Детская",
		};
	}

	return null;
}

/**
 * Checks whether an appointment is an acute CITO / emergency appointment.
 */
export function isAppointmentCito(appointment?: Appointment | null): boolean {
	if (!appointment) return false;
	return Boolean(
		(appointment as any)?.isCito ||
		(appointment as any)?.cito ||
		(appointment?.reason ?? "").toLowerCase().includes("cito") ||
		(appointment?.reason ?? "").toLowerCase().includes("острая боль") ||
		(appointment?.reason ?? "").toLowerCase().includes("срочн")
	);
}

/**
 * Resolves patient 54-FZ balance as a numeric value.
 */
export function resolvePatientBalance(
	patient?: { balanceRub?: number | string | null; balance?: number | string | null } | null,
): number | null {
	if (!patient) return null;
	const raw = patient.balanceRub ?? patient.balance;
	if (raw === undefined || raw === null || raw === "") return null;
	const num = Number(raw);
	return Number.isFinite(num) ? num : null;
}

/**
 * Extracts patient allergy alert string, respecting negative statements ("нет аллергий").
 */
export function getPatientAllergyAlert(
	patient?: any,
	reason?: string | null,
): string | null {
	if (!patient && !reason) return null;
	const rawAllergies =
		patient?.allergies ||
		patient?.anamnesis?.allergies;
	if (
		rawAllergies &&
		typeof rawAllergies === "string" &&
		rawAllergies.trim() &&
		!isNegativeAllergyStatement(rawAllergies)
	) {
		return `Внимание: ${rawAllergies.trim()}`;
	}
	const notes = patient?.notes || "";
	const match = notes.match(/аллерги[яеи][^.;\n]*/i);
	if (match && !isNegativeAllergyStatement(match[0])) {
		return `Внимание: ${match[0].trim()}`;
	}
	const r = reason || "";
	if (
		(/лидокаин/i.test(r) || /аллерги/i.test(r)) &&
		!isNegativeAllergyStatement(r)
	) {
		return "Внимание: Аллергия на лидокаин";
	}
	return null;
}

/**
 * Extracts patient somatic alert (chronic diseases, cardiovascular, diabetes, etc.).
 */
export function getPatientSomaticAlert(patient?: any): string | null {
	if (!patient) return null;
	const chronic = patient?.anamnesis?.chronicDiseases || patient?.chronicDiseases;
	if (chronic && typeof chronic === "string" && chronic.trim()) {
		return `Соматика: ${chronic.trim()}`;
	}
	const notes = patient?.notes || "";
	const match = notes.match(/(диабет|гипертони[яеи]|астм[аеы]|онколог|кардио|сердечн|гепатит|эпилепси)[^.;\n]*/i);
	if (match) {
		return `Соматика: ${match[0].trim()}`;
	}
	return null;
}

/**
 * Resolves CSS classes for appointment status badge on the card face.
 */
export function getAppointmentStatusBadgeClasses(status: string | undefined | null): string {
	const s = String(status || "").toLowerCase();
	if (s === "in_treatment" || s === "in_progress") {
		return "bg-[var(--teal,var(--brand-primary))] text-white shadow-xs";
	}
	if (s === "arrived") {
		return "bg-amber-500 text-white shadow-xs";
	}
	if (s === "confirmed") {
		return "bg-emerald-600 text-white shadow-xs";
	}
	if (s === "completed") {
		return "bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300";
	}
	if (s === "cancelled" || s === "no_show") {
		return "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/40";
	}
	return "bg-[var(--paper)]/80 text-[var(--ink)]";
}

/**
 * Resolves container classes for Grid appointment card based on status, theme, collision, and CITO.
 */
export function getGridAppointmentCardContainerClasses(
	status: string | undefined | null,
	options: {
		collision?: boolean;
		isCito?: boolean;
		docTheme?: DoctorSpecialtyTheme | null;
	} = {},
): string {
	const { collision, isCito, docTheme } = options;
	if (collision) {
		return "bg-amber-500/15 border-amber-500/40 text-amber-900 dark:text-amber-100 ring-1 ring-amber-500/50";
	}
	if (isCito) {
		return "bg-rose-500/20 border-rose-500 text-rose-900 dark:text-rose-100 ring-2 ring-rose-500/60 font-bold";
	}
	if (isAppointmentInChair(status)) {
		return "bg-[var(--teal-soft,var(--paper-soft))] border-[var(--teal,var(--brand-primary))]/50 text-[var(--teal-dark,var(--teal))]";
	}
	const s = String(status || "").toLowerCase();
	if (s === "arrived") {
		return "bg-amber-500/15 border-amber-500/50 text-amber-800 dark:text-amber-200";
	}
	if (s === "completed") {
		return "bg-slate-500/10 border-slate-400/30 text-slate-600 dark:text-slate-400";
	}
	if (s === "cancelled" || s === "no_show") {
		return "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300 opacity-70";
	}
	if (s === "confirmed") {
		return docTheme
			? `${docTheme.cardBgClass} ${docTheme.borderClass} ${docTheme.textClass}`
			: "bg-emerald-500/15 border-emerald-500/50 text-emerald-800 dark:text-emerald-200";
	}
	return docTheme
		? `${docTheme.cardBgClass} ${docTheme.borderClass} ${docTheme.textClass}`
		: "bg-[var(--paper)] border-[var(--line-strong)] text-[var(--ink)]";
}

/**
 * Calculates appointment duration in minutes between startsAt and endsAt.
 * Handles missing endsAt, invalid dates, and returns fallback (default 30 min).
 */
export function getAppointmentDurationMinutes(
	startsAt?: string | null,
	endsAt?: string | null,
	fallbackMinutes = 30,
): number {
	const defaultMinutes = Math.max(1, fallbackMinutes || 30);
	if (!startsAt) return defaultMinutes;
	if (!endsAt) return defaultMinutes;
	const startMs = Date.parse(startsAt);
	const endMs = Date.parse(endsAt);
	if (Number.isNaN(startMs) || Number.isNaN(endMs)) return defaultMinutes;
	const diffMinutes = Math.round((endMs - startMs) / 60000);
	return diffMinutes > 0 ? diffMinutes : defaultMinutes;
}

/**
 * Calculates number of slots spanned by an appointment based on duration and grid step.
 * e.g. 90 min with 30 min step = 3 slots; 120 min = 4 slots; 180 min = 6 slots.
 */
export function calculateAppointmentSpan(
	durationMinutes: number,
	slotStepMinutes = 30,
): number {
	const step = Math.max(1, slotStepMinutes || 30);
	const duration = Math.max(1, durationMinutes || step);
	return Math.max(1, Math.round(duration / step));
}

/**
 * Calculates monolithic appointment card height in pixels corresponding to duration:
 * height = durationMinutes * (baseSlotHeightPx / slotStepMinutes).
 * Guarantees a continuous uninterrupted card height across multi-hour blocks (1-3h).
 */
export function calculateAppointmentCardHeight(
	durationMinutes: number,
	slotStepMinutes = 30,
	baseSlotHeightPx = 64,
): number {
	const span = calculateAppointmentSpan(durationMinutes, slotStepMinutes);
	return span * baseSlotHeightPx;
}

/**
 * Fast 5-Second Solo Doctor Quick Booking Validator (Mandates 8e, 8k, Scale Sovereignty).
 * Required fields are strictly minimal: patientName, patientPhone, startsAt.
 * Assistant and INN are strictly optional and MUST NOT block booking.
 */
export function validateQuickBookingFields(input: {
	patientName?: string | null;
	patientPhone?: string | null;
	startsAt?: string | null;
	assistantId?: string | null;
	inn?: string | null;
	[key: string]: any;
}): {
	isValid: boolean;
	missingFields: string[];
	errors: string[];
} {
	const missingFields: string[] = [];
	const errors: string[] = [];

	const name = (input.patientName ?? "").trim();
	if (!name) {
		missingFields.push("patientName");
		errors.push("Укажите имя или ФИО пациента");
	}

	const rawPhone = (input.patientPhone ?? "").trim();
	const phoneDigits = rawPhone.replace(/[^\d+]/g, "");
	if (!rawPhone || phoneDigits.length < 5) {
		missingFields.push("patientPhone");
		errors.push("Укажите номер телефона пациента (минимум 5 цифр)");
	}

	const startsAt = (input.startsAt ?? "").trim();
	if (!startsAt) {
		missingFields.push("startsAt");
		errors.push("Укажите дату и время начала приёма");
	}

	return {
		isValid: missingFields.length === 0,
		missingFields,
		errors,
	};
}

export interface ClinicalBadgeItem {
	id:
		| "somatic_allergy"
		| "primary"
		| "contract"
		| "consent"
		| "deposit"
		| "debt"
		| "installment"
		| "lab_order"
		| "plan"
		| "radiology"
		| "chat_confirmed"
		| "dms_insurance"
		| "cito_emergency"
		| "pediatric"
		| "discount"
		| "arrived_waiting"
		| "in_chair";
	schiCode: string; // "schi-1" .. "schi-17"
	icon: string;
	title: string;
	labelRu: string;
	badgeClass: string;
}

/**
 * Вычисляет клинический статус наряда ЗТЛ для расписания и визита:
 * - «Поступил в клинику» (ready_in_clinic: зеленый/emerald)
 * - «Просрочен» (overdue: красный/rose с числом дней задержки)
 * - «В лаборатории» (in_lab: желтый/amber)
 */
export function resolveAppointmentLabStatus(
	appointment?: Appointment | null,
	explicitLabOrder?: any,
	referenceDate: Date | string = new Date(),
): AppointmentLabStatusInfo | null {
	if (!appointment && !explicitLabOrder) return null;

	if (
		explicitLabOrder &&
		typeof explicitLabOrder === "object" &&
		"state" in explicitLabOrder &&
		"badgeClass" in explicitLabOrder
	) {
		return explicitLabOrder as AppointmentLabStatusInfo;
	}

	const candidate =
		explicitLabOrder ||
		(appointment as any)?.labOrder ||
		((appointment as any)?.labOrderId ||
		(appointment as any)?.labWorkTitle ||
		(appointment as any)?.labDueDate ||
		(appointment as any)?.labStatus
			? {
					id: (appointment as any)?.labOrderId,
					orderNumber: (appointment as any)?.labOrderNumber,
					patientId: appointment?.patientId,
					toothFdi: (appointment as any)?.toothNumber || (appointment as any)?.tooth,
					workType: (appointment as any)?.labWorkTitle || (appointment as any)?.labWorkType,
					material: (appointment as any)?.labMaterial,
					colorVita: (appointment as any)?.colorVita || (appointment as any)?.vitaShade,
					dueDate: (appointment as any)?.labDueDate || (appointment as any)?.expectedLabDeliveryDate,
					status: (appointment as any)?.labStatus,
					stage: (appointment as any)?.labStage,
					receivedDate: (appointment as any)?.labReceivedDate,
				}
			: null);

	if (candidate) {
		return evaluateAppointmentLabStatus(candidate, referenceDate);
	}

	const reason = (appointment?.reason || "").toLowerCase();
	if (/лаборат|наряд|слепок|коронк|протез|вкладк|примерк/i.test(reason)) {
		return evaluateAppointmentLabStatus(
			{
				status: /готов|сдач|поступ/i.test(reason) ? "ready_in_clinic" : "in_progress",
				workType: appointment?.reason ?? null,
			},
			referenceDate,
		);
	}

	return null;
}

/**
 * Resolves the 17 canonical clinical badges from DentalPRO expo26 (schi-1 .. schi-17):
 * 1.  schi-1:  ❄️ Somatic/Allergy alert
 * 2.  schi-2:  ⭐ Primary patient / first consultation
 * 3.  schi-3:  📄 Contract signed
 * 4.  schi-4:  📝 Informed Consent (IDS 1051n) signed
 * 5.  schi-5:  💼 Paid / Deposit advance
 * 6.  schi-6:  🔴 Debt / unpaid balance
 * 7.  schi-7:  ✂️ Installment / payment split
 * 8.  schi-8:  🦷 Dental lab work order attached
 * 9.  schi-9:  📋 Active treatment plan attached
 * 10. schi-10: 📷 CBCT / X-ray radiology study present
 * 11. schi-11: 💬 Messenger reminder confirmed (WhatsApp/Telegram)
 * 12. schi-12: 🛡️ DMS voluntary medical insurance policy
 * 13. schi-13: ⚡ CITO Acute pain / emergency slot
 * 14. schi-14: 👶 Pediatric patient (<18 y.o.)
 * 15. schi-15: 🎁 Loyalty discount active
 * 16. schi-16: ⏳ Patient arrived / waiting in hall
 * 17. schi-17: 🪑 In chair / active procedure
 */
export function resolveAppointmentClinicalBadges(
	appointment?: Appointment | null,
	patient?: any,
	balance?: number | null,
	allergyAlert?: string | null,
	explicitLabOrder?: any,
): ClinicalBadgeItem[] {
	if (!appointment) return [];
	const badges: ClinicalBadgeItem[] = [];
	const reason = (appointment?.reason || "").toLowerCase();

	// 1. schi-1: ❄️ Somatic / Allergy Alert
	if (allergyAlert || patient?.allergies || patient?.anamnesis?.allergies) {
		badges.push({
			id: "somatic_allergy",
			schiCode: "schi-1",
			icon: "❄️",
			labelRu: "Аллергия / Соматика",
			title: allergyAlert || "Соматический статус или аллергологический анамнез пациента",
			badgeClass: "bg-sky-500/15 text-sky-800 dark:text-sky-200 border-sky-500/30",
		});
	}

	// 2. schi-2: ⭐ Primary consultation
	const isPrimary =
		Boolean((appointment as any)?.isPrimary) ||
		Boolean((appointment as any)?.isFirstVisit) ||
		reason.includes("первичн") ||
		reason.includes("консультац");
	if (isPrimary) {
		badges.push({
			id: "primary",
			schiCode: "schi-2",
			icon: "⭐",
			labelRu: "Первичный",
			title: "Первичный пациент / консультационный приём",
			badgeClass: "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/30",
		});
	}

	// 3. schi-3: 📄 Contract Signed
	const hasContract =
		Boolean(patient?.contractSigned) ||
		Boolean((appointment as any)?.contractSigned);
	if (hasContract) {
		badges.push({
			id: "contract",
			schiCode: "schi-3",
			icon: "📄",
			labelRu: "Договор",
			title: "Медицинский договор с клиникой подписан",
			badgeClass: "bg-blue-500/15 text-blue-800 dark:text-blue-200 border-blue-500/30",
		});
	}

	// 4. schi-4: 📝 Informed Consent (IDS 1051n)
	const hasConsent =
		Boolean(patient?.hasInformedConsent) ||
		Boolean((patient?.consents && patient.consents.length > 0)) ||
		Boolean((appointment as any)?.hasConsent);
	if (hasConsent) {
		badges.push({
			id: "consent",
			schiCode: "schi-4",
			icon: "📝",
			labelRu: "ИДС",
			title: "Информированное добровольное согласие (ИДС) подписано",
			badgeClass: "bg-cyan-500/15 text-cyan-800 dark:text-cyan-200 border-cyan-500/30",
		});
	}

	// 5. schi-5: 💼 Deposit / Advance
	if (balance !== null && balance !== undefined && balance > 0) {
		badges.push({
			id: "deposit",
			schiCode: "schi-5",
			icon: "💼",
			labelRu: `+${balance.toLocaleString("ru-RU")} ₽`,
			title: `Депозит / аванс на балансе: +${balance.toLocaleString("ru-RU")} ₽`,
			badgeClass: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/30",
		});
	}

	// 6. schi-6: 🔴 Debt / Unpaid
	if (balance !== null && balance !== undefined && balance < 0) {
		badges.push({
			id: "debt",
			schiCode: "schi-6",
			icon: "🔴",
			labelRu: `Долг ${Math.abs(balance).toLocaleString("ru-RU")} ₽`,
			title: `Задолженность по счетам: ${Math.abs(balance).toLocaleString("ru-RU")} ₽`,
			badgeClass: "bg-rose-500/15 text-rose-800 dark:text-rose-200 border-rose-500/30",
		});
	}

	// 7. schi-7: ✂️ Installment / Split
	const hasInstallment =
		Boolean(patient?.hasInstallment) ||
		Boolean((appointment as any)?.hasInstallment) ||
		Boolean((appointment as any)?.isSplitPayment);
	if (hasInstallment) {
		badges.push({
			id: "installment",
			schiCode: "schi-7",
			icon: "✂️",
			labelRu: "Рассрочка",
			title: "Оплата в рассрочку / согласованный график платежей",
			badgeClass: "bg-purple-500/15 text-purple-800 dark:text-purple-200 border-purple-500/30",
		});
	}

	// 8. schi-8: 🦷 Lab work order & clinical status (В лаборатории / Поступил в клинику / Просрочен)
	const labStatus = resolveAppointmentLabStatus(appointment, explicitLabOrder);
	if (labStatus) {
		badges.push({
			id: "lab_order",
			schiCode: "schi-8",
			icon: labStatus.isOverdue ? "⚠️" : labStatus.state === "ready_in_clinic" ? "🦷" : "⏳",
			labelRu: labStatus.isOverdue ? `ЗТЛ: +${labStatus.daysOverdue}д!` : labStatus.shortLabelRu,
			title: `ЗТЛ: ${labStatus.labelRu} (${labStatus.orderNumber || "Наряд"}). ${
				labStatus.workTypeRu ? `Изделие: ${labStatus.workTypeRu}. ` : ""
			}${labStatus.colorVita ? `Цвет VITA: ${labStatus.colorVita}. ` : ""}${
				labStatus.dueDateIso ? `Срок: ${labStatus.dueDateIso.slice(0, 10)}` : ""
			}`.trim(),
			badgeClass: labStatus.badgeClass,
		});
	}

	// 9. schi-9: 📋 Treatment plan
	const hasPlan =
		Boolean((appointment as any)?.treatmentPlanId) ||
		Boolean((appointment as any)?.planNumber);
	if (hasPlan) {
		badges.push({
			id: "plan",
			schiCode: "schi-9",
			icon: "📋",
			labelRu: "План",
			title: `Прикреплен активный план лечения: ${(appointment as any)?.planNumber || "План"}`,
			badgeClass: "bg-indigo-500/15 text-indigo-800 dark:text-indigo-200 border-indigo-500/30",
		});
	}

	// 10. schi-10: 📷 Radiology / X-Ray / CBCT
	const hasRadiology =
		Boolean(patient?.hasXrays) ||
		Boolean((patient as any)?.radiologyStudiesCount > 0) ||
		Boolean((appointment as any)?.hasXray) ||
		/снимок|рентген|кт|cbct|оптг/i.test(reason);
	if (hasRadiology) {
		badges.push({
			id: "radiology",
			schiCode: "schi-10",
			icon: "📷",
			labelRu: "Снимки КТ",
			title: "В карте пациента имеются рентген-снимки / 3D КТ",
			badgeClass: "bg-violet-500/15 text-violet-800 dark:text-violet-200 border-violet-500/30",
		});
	}

	// 11. schi-11: 💬 Messenger confirmation
	const isMessengerConfirmed =
		Boolean((appointment as any)?.confirmedViaMessenger) ||
		Boolean((appointment as any)?.whatsappConfirmed);
	if (isMessengerConfirmed) {
		badges.push({
			id: "chat_confirmed",
			schiCode: "schi-11",
			icon: "💬",
			labelRu: "WhatsApp ✓",
			title: "Визит подтвержден пациентом в мессенджере WhatsApp/Telegram",
			badgeClass: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/30",
		});
	}

	// 12. schi-12: 🛡️ DMS insurance policy
	const isDms =
		Boolean(patient?.insurancePolicy) ||
		Boolean((appointment as any)?.isDms) ||
		/дмс|страхов/i.test(reason);
	if (isDms) {
		badges.push({
			id: "dms_insurance",
			schiCode: "schi-12",
			icon: "🛡️",
			labelRu: "ДМС",
			title: "Приём по полису добровольного медицинского страхования (ДМС)",
			badgeClass: "bg-blue-500/15 text-blue-800 dark:text-blue-200 border-blue-500/30",
		});
	}

	// 13. schi-13: ⚡ CITO Emergency
	if (isAppointmentCito(appointment)) {
		badges.push({
			id: "cito_emergency",
			schiCode: "schi-13",
			icon: "⚡",
			labelRu: "CITO",
			title: "CITO! Приём по острой боли (экстренный приоритет)",
			badgeClass: "bg-rose-600/20 text-rose-900 dark:text-rose-100 border-rose-500/50 font-black",
		});
	}

	// 14. schi-14: 👶 Pediatric
	if (patient?.birthDate) {
		const bDate = new Date(patient.birthDate);
		if (!Number.isNaN(bDate.getTime())) {
			const ageYears = Math.floor(
				(Date.now() - bDate.getTime()) / (365.25 * 24 * 3600 * 1000),
			);
			if (ageYears >= 0 && ageYears < 18) {
				badges.push({
					id: "pediatric",
					schiCode: "schi-14",
					icon: "👶",
					labelRu: `${ageYears} лет`,
					title: `Детский приём: ${ageYears} лет (в сопровождении законных представителей)`,
					badgeClass: "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/30",
				});
			}
		}
	}

	// 15. schi-15: 🎁 Loyalty discount
	const discount = Number(patient?.discountPercent || (appointment as any)?.discountPercent || 0);
	if (discount > 0) {
		badges.push({
			id: "discount",
			schiCode: "schi-15",
			icon: "🎁",
			labelRu: `-${discount}%`,
			title: `Персональная скидка / программа лояльности: ${discount}%`,
			badgeClass: "bg-orange-500/15 text-orange-800 dark:text-orange-200 border-orange-500/30",
		});
	}

	// 16. schi-16: ⏳ Arrived / Waiting
	if (appointment?.status === "arrived") {
		badges.push({
			id: "arrived_waiting",
			schiCode: "schi-16",
			icon: "⏳",
			labelRu: "В клинике",
			title: "Пациент прибыл и ожидает приглашения в кабинет",
			badgeClass: "bg-amber-500/20 text-amber-800 dark:text-amber-200 border-amber-500/40",
		});
	}

	// 17. schi-17: 🪑 In Chair
	if (isAppointmentInChair(appointment?.status)) {
		badges.push({
			id: "in_chair",
			schiCode: "schi-17",
			icon: "🪑",
			labelRu: "В кресле",
			title: "Пациент находится в кресле (идёт медицинский приём)",
			badgeClass: "bg-teal-500/20 text-teal-800 dark:text-teal-200 border-teal-500/50",
		});
	}

	return badges;
}
