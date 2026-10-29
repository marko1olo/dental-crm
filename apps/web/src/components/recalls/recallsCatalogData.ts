/**
 * apps/web/src/components/recalls/recallsCatalogData.ts
 * SSOT Хаб диспансерного учета и клинических циклов вызова DENTE CRM (Мандаты 8b, 8e, 8n, 8x, 8y, 8ai).
 * 4 клинических цикла: Профгигиена (6м), Импланты (3-6м/1г), Ортодонтия (1м), Детский осмотр (3-4м).
 * Sweet Spot: 200–300 строк (Мандат 8b).
 */

import { generate1ClickBookingLink } from "./recallMessageFormatters";

export type RecallCycleType = "standard_prophylaxis" | "implant_monitoring" | "orthodontic_adjustment" | "pediatric_checkup" | "hygiene" | "implants" | "orthodontics" | "pediatric" | "periodontal_maintenance" | "orthodontic_braces" | "orthodontic_aligners" | "orthodontic_retention" | "pediatric_fluoridation" | "caries_high_risk" | "prosthetic_check";
export type CanonicalRecallWorkflowStatus = "not_called" | "reached" | "declined" | "scheduled";
export type RecallContactStatus = "pending" | "due_now" | "contacted" | "contacted_no_answer" | "scheduled" | "declined" | "snoozed" | "done" | "cancelled";

export interface PatientRecallRecord {
	readonly id: string;
	readonly patientId: string;
	readonly fullName: string;
	readonly phone: string;
	readonly cycleType: RecallCycleType;
	readonly cycleLabel?: string;
	readonly lastVisitDate: string;
	readonly dueDate: string;
	readonly daysOverdue: number;
	readonly urgencyStatus: "due_now" | "overdue_30" | "planned" | "urgent" | string;
	readonly status: RecallContactStatus | string;
	readonly category?: string;
	readonly categoryLabel?: string;
	readonly urgency?: string;
	readonly attendingDoctorId?: string;
	readonly attendingDoctorName?: string;
	readonly lastProcedureCategory?: string;
	readonly historicalRevenueRub?: number;
	readonly visitsCount?: number;
	readonly age?: number;
	readonly clinicalNotes?: string;
	readonly lastContactedAt?: string;
	readonly lastContactChannel?: string;
	readonly scheduledAppointmentDate?: string;
}
export type PatientRecallItem = PatientRecallRecord;

export const DEFAULT_RECALL_CANDIDATES: readonly PatientRecallRecord[] = Object.freeze([]);

export const DEMO_SHOWCASE_CANDIDATES: readonly PatientRecallRecord[] = Object.freeze([
	{ id: "cand-demo-hygiene", patientId: "pat-101", fullName: "Волкова Мария Сергеевна", phone: "+7 (916) 123-45-67", cycleType: "standard_prophylaxis", cycleLabel: "Профгигиена (6 мес)", lastVisitDate: "2026-03-01", dueDate: "2026-09-01", daysOverdue: 24, urgencyStatus: "due_now", status: "due_now", attendingDoctorId: "doc-1", attendingDoctorName: "Д-р Кузнецова Е.В.", historicalRevenueRub: 18500, visitsCount: 3 },
	{ id: "cand-demo-implant", patientId: "pat-102", fullName: "Соколов Андрей Владимирович", phone: "+7 (925) 987-65-43", cycleType: "implant_monitoring", cycleLabel: "Контроль имплантации (6 мес)", lastVisitDate: "2025-10-15", dueDate: "2026-04-15", daysOverdue: 15, urgencyStatus: "overdue_30", status: "due_now", attendingDoctorId: "doc-2", attendingDoctorName: "Д-р Смирнов А.В.", historicalRevenueRub: 145000, visitsCount: 5 },
	{ id: "cand-demo-ortho", patientId: "pat-103", fullName: "Морозов Дмитрий Павлович", phone: "+7 (903) 444-55-66", cycleType: "orthodontic_adjustment", cycleLabel: "Ортодонтическая коррекция (1 мес)", lastVisitDate: "2026-04-01", dueDate: "2026-04-29", daysOverdue: 0, urgencyStatus: "planned", status: "pending", attendingDoctorId: "doc-3", attendingDoctorName: "Д-р Орлова А.И.", historicalRevenueRub: 92000, visitsCount: 8 },
	{ id: "cand-demo-pediatric", patientId: "pat-104", fullName: "Иванова Алиса Максимовна", phone: "+7 (915) 333-22-11", cycleType: "pediatric_checkup", cycleLabel: "Детский профосмотр (4 мес)", lastVisitDate: "2026-01-10", dueDate: "2026-05-10", daysOverdue: 0, urgencyStatus: "planned", status: "pending", attendingDoctorId: "doc-1", attendingDoctorName: "Д-р Кузнецова Е.В.", historicalRevenueRub: 8400, visitsCount: 2, age: 7 },
]);

export const CANONICAL_RECALL_STATUS_CONFIG: Record<CanonicalRecallWorkflowStatus, { label: string; badgeColorToken: string }> = {
	not_called: { label: "Не звонили", badgeColorToken: "var(--amber, #f59e0b)" },
	reached: { label: "Дозвонились", badgeColorToken: "var(--teal, #0d9488)" },
	declined: { label: "Отказ", badgeColorToken: "var(--ink-muted, #94a3b8)" },
	scheduled: { label: "Записан", badgeColorToken: "var(--emerald, #10b981)" },
};

export function toCanonicalRecallStatus(rawStatus: string): CanonicalRecallWorkflowStatus {
	if (rawStatus === "due_now" || rawStatus === "pending" || rawStatus === "not_called") return "not_called";
	if (rawStatus === "invited" || rawStatus === "contacted" || rawStatus === "contacted_no_answer" || rawStatus === "reached" || rawStatus === "snoozed") return "reached";
	if (rawStatus === "declined" || rawStatus === "cancelled") return "declined";
	return "scheduled";
}

export function fromCanonicalRecallStatus(canonical: CanonicalRecallWorkflowStatus): RecallContactStatus {
	if (canonical === "not_called") return "due_now";
	if (canonical === "reached") return "contacted";
	if (canonical === "declined") return "declined";
	return "scheduled";
}

export function cleanPhoneDigits(phone: string | null | undefined): string {
	if (!phone) return "";
	let digits = phone.replace(/\D/g, "");
	if (digits.length === 11 && digits.startsWith("8")) digits = "7" + digits.slice(1);
	return digits;
}
export const sanitizePhoneNumber = cleanPhoneDigits;

export function extractPatientFirstName(fullName: string | null | undefined): string {
	if (!fullName || !fullName.trim()) return "Пациент";
	const parts = fullName.trim().split(/\s+/);
	return parts.length >= 2 ? parts[1] : parts[0];
}
export const extractFirstName = extractPatientFirstName;

export function extractPolitePatientName(fullName: string | null | undefined): string {
	if (!fullName || !fullName.trim()) return "Пациент";
	const parts = fullName.trim().split(/\s+/);
	return parts.length >= 3 ? `${parts[1]} ${parts[2]}` : parts.length === 2 ? parts[1] : parts[0];
}

export function addMonthsSafe(dateStr: string, months: number): string {
	const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number);
	const targetMonth = m - 1 + months;
	const targetYear = y + Math.floor(targetMonth / 12);
	const normalizedMonth = ((targetMonth % 12) + 12) % 12;
	const maxDay = new Date(targetYear, normalizedMonth + 1, 0).getDate();
	return `${targetYear}-${String(normalizedMonth + 1).padStart(2, "0")}-${String(Math.min(d, maxDay)).padStart(2, "0")}`;
}

export function addCalendarMonthsSafe(fromDate: Date | string, months: number): Date {
	const p = typeof fromDate === "string" ? new Date(fromDate) : new Date(fromDate.getTime());
	if (Number.isNaN(p.getTime())) return new Date();
	const day = p.getDate();
	p.setDate(1);
	p.setMonth(p.getMonth() + months);
	const maxDays = new Date(p.getFullYear(), p.getMonth() + 1, 0).getDate();
	p.setDate(Math.min(day, maxDays));
	return p;
}

export function addWeeksSafe(fromDate: Date | string, weeks: number): Date {
	const p = typeof fromDate === "string" ? new Date(fromDate) : new Date(fromDate.getTime());
	if (Number.isNaN(p.getTime())) return new Date();
	p.setDate(p.getDate() + weeks * 7);
	return p;
}

export function addDaysSafe(fromDate: Date | string, days: number): Date {
	const p = typeof fromDate === "string" ? new Date(fromDate) : new Date(fromDate.getTime());
	if (Number.isNaN(p.getTime())) return new Date();
	p.setDate(p.getDate() + days);
	return p;
}

export function formatIsoDateOnly(date: Date): string {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function calculateDaysOverdue(dueDate: Date | string, referenceDate: Date | string = new Date()): number {
	const due = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
	const ref = typeof referenceDate === "string" ? new Date(referenceDate) : referenceDate;
	return Math.floor((Date.UTC(ref.getFullYear(), ref.getMonth(), ref.getDate()) - Date.UTC(due.getFullYear(), due.getMonth(), due.getDate())) / 86400000);
}

export function resolveUrgencyStatus(dueDate: Date | string, referenceDate: Date | string = new Date(), isCompleted = false): string {
	if (isCompleted) return "completed";
	const days = calculateDaysOverdue(dueDate, referenceDate);
	return days < 0 ? "upcoming" : days <= 29 ? "due_now" : days <= 89 ? "overdue_30" : "overdue_90";
}

export function calculateHygieneRecallTrigger(lastCleaningDate: Date | string, customMonths = 6) {
	const months = customMonths > 0 ? customMonths : 6;
	const nextDueDate = addCalendarMonthsSafe(lastCleaningDate, months);
	return {
		triggerType: "hygiene_6m",
		intervalMonths: months,
		nextDueDate,
		formattedDueDate: formatIsoDateOnly(nextDueDate),
		mappedCycleType: "standard_prophylaxis" as RecallCycleType,
		title: "Плановый осмотр и профессиональная гигиена полости рта",
		clinicalRationale: "Профилактический осмотр и гигиена 1 раз в 6 месяцев для сохранения здоровья десен и гарантийных обязательств.",
	};
}

export function calculateImplantProstheticRecallTrigger(surgeryOrProstheticDate: Date | string, customMonths = 12) {
	const months = customMonths > 0 ? customMonths : 12;
	const nextDueDate = addCalendarMonthsSafe(surgeryOrProstheticDate, months);
	return {
		triggerType: "implant_prosthetic_12m",
		intervalMonths: months,
		nextDueDate,
		formattedDueDate: formatIsoDateOnly(nextDueDate),
		mappedCycleType: "implant_monitoring" as RecallCycleType,
		title: "Контрольный осмотр имплантации и ортопедических конструкций",
		clinicalRationale: "Ежегодный рентген-контроль и оценка стабильности остеоинтеграции по протоколам СтАР/ITI.",
	};
}

export function calculateOrthoActivationRecallTrigger(lastAdjustmentDate: Date | string, customWeeks = 4) {
	const weeks = customWeeks > 0 ? customWeeks : 4;
	const nextDueDate = addWeeksSafe(lastAdjustmentDate, weeks);
	return {
		triggerType: "ortho_activation_1m",
		intervalWeeks: weeks,
		intervalMonths: 1,
		nextDueDate,
		formattedDueDate: formatIsoDateOnly(nextDueDate),
		mappedCycleType: "orthodontic_braces" as RecallCycleType,
		title: "Плановая активация аппаратуры",
		clinicalRationale: "Коррекция дуг брекет-системы или выдача очередной пары элайнеров каждые 4 недели.",
	};
}

export function calculatePediatricRecallTrigger(lastVisitDate: Date | string, intervalMonths: 3 | 4 = 3) {
	const months = intervalMonths === 4 ? 4 : 3;
	const nextDueDate = addCalendarMonthsSafe(lastVisitDate, months);
	return {
		triggerType: "pediatric_3_4m",
		intervalMonths: months,
		nextDueDate,
		formattedDueDate: formatIsoDateOnly(nextDueDate),
		mappedCycleType: "pediatric_fluoridation" as RecallCycleType,
		title: `Детский профилактический осмотр (${months} мес.)`,
		clinicalRationale: "Мониторинг незрелой эмали и своевременная реминерализующая терапия у детей.",
	};
}

export function evaluateClinicalRecallTrigger(params: { lastVisitDate?: Date | string; isChildUnder14?: boolean; hasBraces?: boolean; hasImplants?: boolean }) {
	const lastDate = params.lastVisitDate ?? new Date();
	if (params.isChildUnder14) return calculatePediatricRecallTrigger(lastDate, 3);
	if (params.hasBraces) return calculateOrthoActivationRecallTrigger(lastDate);
	if (params.hasImplants) return calculateImplantProstheticRecallTrigger(lastDate);
	return calculateHygieneRecallTrigger(lastDate);
}

export function resolveCandidateTriggerType(cand: PatientRecallRecord): string {
	if (cand.age !== undefined && cand.age < 14) return "pediatric_3_4m";
	const ct = String(cand.cycleType || "");
	if (ct.includes("pediatric")) return "pediatric_3_4m";
	if (ct.includes("ortho")) return "ortho_activation_1m";
	if (ct.includes("implant") || ct.includes("prosthetic")) return "implant_prosthetic_12m";
	return "hygiene_6m";
}

export function buildWhatsAppUrl(phone: string, text: string): string {
	return `https://wa.me/${cleanPhoneDigits(phone)}?text=${encodeURIComponent(text)}`;
}

export function buildTelegramUrl(phone: string, text: string): string {
	return `https://t.me/+${cleanPhoneDigits(phone)}?text=${encodeURIComponent(text)}`;
}

export function generatePdnProtectedRecallMessage(cand: PatientRecallRecord, options?: { clinicName?: string }): string {
	return `Здравствуйте, ${extractPolitePatientName(cand.fullName)}! В клинике ${options?.clinicName || "Стоматология ДЕНТЕ"} подошел срок контрольного осмотра. Доктор рекомендует выбрать удобное время для визита. Записаться: +7 (495) 000-00-00.`;
}

export function generateWhatsAppRecallMessage(cand: PatientRecallRecord, options?: { clinicName?: string; baseUrl?: string }): string {
	const clinic = options?.clinicName || "Стоматология ДЕНТЕ";
	const firstName = extractFirstName(cand.fullName);
	const ct = String(cand.cycleType || cand.category || "");
	const purpose = (cand.category === "implants" || ct.includes("implant"))
		? "на контрольный осмотр имплантатов"
		: (cand.category === "orthodontics" || ct.includes("ortho"))
		? "на ортодонтический контроль и ревизию ретейнеров"
		: ct.includes("pediatric")
		? "на детский профилактический осмотр"
		: "на плановый профилактический осмотр";
	const docPart = cand.attendingDoctorName ? ` Ваш лечащий врач ${cand.attendingDoctorName} рекомендует сохранить здоровье улыбки.` : " Доктор рекомендует сохранить здоровье улыбки.";
	const visitPart = cand.lastVisitDate ? ` Дата прошлого визита: ${cand.lastVisitDate}.` : "";
	const bookingLink = generate1ClickBookingLink({
		baseUrl: options?.baseUrl,
		patientId: cand.patientId,
		doctorId: cand.attendingDoctorId,
		cycleType: cand.cycleType,
		source: "whatsapp",
	});
	return `Здравствуйте, ${firstName}! Напоминаем, что подошел срок записаться в ${clinic} ${purpose}.${docPart}${visitPart} Запись: ${bookingLink}`;
}

export function generateTelegramRecallMessage(cand: PatientRecallRecord, options?: { clinicName?: string; baseUrl?: string }): string {
	const clinic = options?.clinicName || "Стоматология ДЕНТЕ";
	const firstName = extractFirstName(cand.fullName);
	const ct = String(cand.cycleType || cand.category || "");
	const purpose = (cand.category === "implants" || ct.includes("implant"))
		? "на контрольный осмотр имплантатов"
		: (cand.category === "orthodontics" || ct.includes("ortho"))
		? "на ортодонтический контроль и ревизию ретейнеров"
		: ct.includes("pediatric")
		? "на детский профилактический осмотр"
		: "на плановый профилактический осмотр";
	const docPart = cand.attendingDoctorName ? ` Врач: ${cand.attendingDoctorName}.` : "";
	const bookingLink = generate1ClickBookingLink({
		baseUrl: options?.baseUrl,
		patientId: cand.patientId,
		doctorId: cand.attendingDoctorId,
		cycleType: cand.cycleType,
		source: "telegram",
	});
	return `Здравствуйте, ${firstName}! В клинике ${clinic} подошел срок записаться ${purpose}.${docPart} Запись: ${bookingLink}`;
}

export function generateSmsRecallMessage(cand: PatientRecallRecord, options?: { clinicName?: string; baseUrl?: string }): string {
	const clinic = options?.clinicName || "ДЕНТЕ";
	const firstName = extractFirstName(cand.fullName);
	const bookingLink = generate1ClickBookingLink({
		baseUrl: options?.baseUrl,
		patientId: cand.patientId,
		doctorId: cand.attendingDoctorId,
		cycleType: cand.cycleType,
		source: "sms",
	});
	return `${firstName}, прошло 6 мес с визита в ${clinic}. Запись: ${bookingLink}`;
}

export function buildRecallMessageContent(cand: PatientRecallRecord, channel: "whatsapp" | "telegram" | "sms", clinicName = "ДЕНТЕ"): string {
	if (channel === "sms") return generateSmsRecallMessage(cand, { clinicName });
	if (channel === "telegram") return generateTelegramRecallMessage(cand, { clinicName });
	return generateWhatsAppRecallMessage(cand, { clinicName });
}

export interface SmsSegmentCalculation {
	characterCount: number;
	segmentCount: number;
	encoding: "GSM-7" | "UCS-2";
	charsPerSegment: number;
	remainingInCurrentSegment: number;
	maxCharsInCurrentSegment: number;
	isMultipart: boolean;
}

export function calculateSmsSegments(text: string): SmsSegmentCalculation {
	const len = text.length;
	const isCyrillic = /[а-яёА-ЯЁ]/i.test(text);
	const encoding = isCyrillic ? "UCS-2" : "GSM-7";
	if (len === 0) {
		return { characterCount: 0, segmentCount: 0, encoding, charsPerSegment: isCyrillic ? 70 : 160, remainingInCurrentSegment: isCyrillic ? 70 : 160, maxCharsInCurrentSegment: isCyrillic ? 70 : 160, isMultipart: false };
	}
	if (!isCyrillic) {
		if (len <= 160) {
			return { characterCount: len, segmentCount: 1, encoding: "GSM-7", charsPerSegment: 160, remainingInCurrentSegment: 160 - len, maxCharsInCurrentSegment: 160, isMultipart: false };
		}
		const segmentCount = Math.ceil(len / 153);
		const maxChars = segmentCount * 153;
		return { characterCount: len, segmentCount, encoding: "GSM-7", charsPerSegment: 153, remainingInCurrentSegment: maxChars - len, maxCharsInCurrentSegment: maxChars, isMultipart: true };
	}
	if (len <= 70) {
		return { characterCount: len, segmentCount: 1, encoding: "UCS-2", charsPerSegment: 70, remainingInCurrentSegment: 70 - len, maxCharsInCurrentSegment: 70, isMultipart: false };
	}
	const segmentCount = Math.ceil(len / 67);
	const maxChars = segmentCount * 67;
	return { characterCount: len, segmentCount, encoding: "UCS-2", charsPerSegment: 67, remainingInCurrentSegment: maxChars - len, maxCharsInCurrentSegment: maxChars, isMultipart: true };
}

export function formatSmsSummary(calc: SmsSegmentCalculation): string {
	if (calc.characterCount === 0) return "0 символов • 0 SMS";
	return `${calc.characterCount} симв., ${calc.segmentCount} SMS (${calc.encoding})`;
}

export function mapRecallCandidateToRecord(raw: any): PatientRecallRecord {
	const patientId = raw.patientId || raw.id || "pat_unknown";
	const lastVisitDate = raw.lastCompletedAt ? String(raw.lastCompletedAt).slice(0, 10) : (raw.lastVisitDate || "2026-03-01");
	const dueDate = raw.dueDate || addMonthsSafe(lastVisitDate, 6);
	const today = formatIsoDateOnly(new Date());
	const daysOverdue = raw.daysOverdue ?? Math.max(0, calculateDaysOverdue(dueDate, today));
	const urgencyStatus = raw.band === "due" ? "due_now" : daysOverdue > 30 ? "overdue_30" : daysOverdue > 0 || dueDate <= today ? "due_now" : "planned";
	const status = raw.band === "due" ? "due_now" : raw.status || (urgencyStatus === "due_now" ? "due_now" : "pending");

	return {
		id: raw.id || patientId,
		patientId,
		fullName: raw.fullName || "Пациент",
		phone: raw.phone || "",
		cycleType: (raw.cohortType || raw.cycleType || "standard_prophylaxis") as RecallCycleType,
		cycleLabel: "Профгигиена (6 мес)",
		lastVisitDate,
		dueDate,
		daysOverdue,
		urgencyStatus,
		status,
		attendingDoctorId: raw.attendingDoctorId,
		attendingDoctorName: raw.attendingDoctorName || "Д-р Смирнов А.В.",
		historicalRevenueRub: raw.historicalRevenueRub || 15000,
		visitsCount: raw.visitsCount || 1,
	};
}

export async function sendRecallCandidateInvite(params: { patientId: string; channel: string; body: string }, headers?: Record<string, string>): Promise<{ ok: boolean; outboxId?: string; duplicate?: boolean; message: string }> {
	const res = await fetch("/api/recalls/invite", { method: "POST", headers: { "Content-Type": "application/json", ...(headers || {}) }, body: JSON.stringify(params) });
	return res.ok ? res.json() : { ok: false, message: `Ошибка: HTTP ${res.status}` };
}

export async function updateRecallCandidateStatus(patientId: string, status: string, headers?: Record<string, string>): Promise<{ ok: boolean }> {
	const res = await fetch(`/api/patients/recall-candidates/${patientId}/status`, { method: "PATCH", headers: { "Content-Type": "application/json", ...(headers || {}) }, body: JSON.stringify({ status }) });
	return { ok: res.ok };
}

export function determineTaskCallTypeForCandidate(cand: PatientRecallRecord): string {
	const notes = (cand.clinicalNotes || "").toLowerCase();
	if (notes.includes("удалени") || notes.includes("самочувстви") || notes.includes("контроль")) return "learn_health";
	if (notes.includes("не начат") || notes.includes("план лечения")) return "medplan_not_started";
	if (notes.includes("не завершен") || notes.includes("не закончен")) return "medplan_not_finished";
	if (cand.status === "scheduled") return "appointment_confirmation";
	if (cand.status === "declined" || cand.status === "cancelled") return "appointment_refuse";
	return "preventive_inspection";
}
