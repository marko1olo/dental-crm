/**
 * patientWebappEngine.ts — Движок мобильного веб-кабинета пациента (PWA / Mobile WebApp)
 *
 * Архитектура и функционал:
 * 1. Генерация и верификация защищенных сессий пациента (HMAC/SHA-256 токены, TTL, scopes, magic-ссылки).
 * 2. Агрегация профиля пациента: предстоящие визиты, история приемов, согласованный план лечения с расчетами в копейках.
 * 3. Фотопротокол «До / После»: клинические пары снимков, расчет шторки-слайдера (wiper), шкала VITA (A1–D4 / 3D-Master).
 * 4. Оплата через СБП: генерация динамических QR-кодов стандарта НСПК (ГОСТ Р 56042-2014 / EMVCo) с копейками, назначением и ИНН клиники, диплинки банков.
 * 5. Онлайн-подписание ИДС (Приказ МЗ РФ № 1051н) и Договора (ПП РФ № 736) СМС-кодом ПЭП по 63-ФЗ с фиксацией SHA-256 криптографического аудита.
 */

import { sha256Hex } from "@dental/shared";

// ============================================================================
// 1. ТИПЫ И ИНТЕРФЕЙСЫ (TYPES & CONTRACTS)
// ============================================================================

export type PatientWebappScope = "portal:read" | "portal:write" | "portal:sign" | "portal:pay";

export interface PatientWebappSessionToken {
	readonly sessionId: string;
	readonly patientId: string;
	readonly clinicId: string;
	readonly phone: string;
	readonly issuedAtTimestamp: number;
	readonly expiresAtTimestamp: number;
	readonly scopes: readonly PatientWebappScope[];
	readonly nonce: string;
	readonly signature: string;
}

export interface PatientWebappSessionParams {
	readonly patientId: string;
	readonly clinicId?: string | undefined;
	readonly phone: string;
	readonly ttlHours?: number | undefined;
	readonly scopes?: readonly PatientWebappScope[] | undefined;
	readonly secretKey?: string | undefined;
}

export interface PatientAppointmentItem {
	readonly id: string;
	readonly dateIso: string;
	readonly timeRu: string;
	readonly doctorId: string;
	readonly doctorName: string;
	readonly doctorSpecialtyRu: string;
	readonly doctorAvatarUrl?: string | undefined;
	readonly roomNumber: string;
	readonly clinicName: string;
	readonly clinicAddressRu: string;
	readonly clinicPhone: string;
	readonly titleRu: string;
	readonly status: "scheduled" | "confirmed" | "in_progress" | "completed" | "cancelled" | "reschedule_requested";
	readonly priceKopecks: number;
	readonly priceRub: number;
	readonly reminderSent: boolean;
	readonly preparationInstructionsRu?: readonly string[] | undefined;
	readonly cancellationReason?: string | undefined;
}

export interface TreatmentStageProcedureItem {
	readonly id: string;
	readonly code804n: string;
	readonly nameRu: string;
	readonly toothFdi?: string | undefined;
	readonly quantity: number;
	readonly unitPriceKopecks: number;
	readonly unitPriceRub: number;
	readonly totalKopecks: number;
	readonly totalRub: number;
}

export interface PatientTreatmentPlanStage {
	readonly id: string;
	readonly orderIndex: number;
	readonly titleRu: string;
	readonly categoryRu: "Диагностика" | "Терапия" | "Хирургия" | "Ортопедия" | "Ортодонтия" | "Гигиена";
	readonly teethFdi: readonly string[];
	readonly costKopecks: number;
	readonly costRub: number;
	readonly status: "completed" | "in_progress" | "planned";
	readonly procedures: readonly TreatmentStageProcedureItem[];
	readonly targetDateRu?: string | undefined;
}

export interface PatientTreatmentPlanProfile {
	readonly id: string;
	readonly planNumber: string;
	readonly titleRu: string;
	readonly curatingDoctor: string;
	readonly createdAtIso: string;
	readonly totalCostKopecks: number;
	readonly totalCostRub: number;
	readonly paidCostKopecks: number;
	readonly paidCostRub: number;
	readonly remainingDueKopecks: number;
	readonly remainingDueRub: number;
	readonly progressPercent: number;
	readonly status: "in_progress" | "completed" | "on_hold";
	readonly stages: readonly PatientTreatmentPlanStage[];
}

export interface PatientInvoiceBillItem {
	readonly id: string;
	readonly invoiceNumber: string;
	readonly issueDateIso: string;
	readonly dueDateIso: string;
	readonly titleRu: string;
	readonly totalAmountKopecks: number;
	readonly totalAmountRub: number;
	readonly paidAmountKopecks: number;
	readonly paidAmountRub: number;
	readonly remainingAmountKopecks: number;
	readonly remainingAmountRub: number;
	readonly status: "paid" | "unpaid" | "partially_paid" | "cancelled";
	readonly paymentMethod?: "sbp" | "card_online" | "pos_terminal" | "cash" | undefined;
	readonly paidAtIso?: string | undefined;
	readonly fiscalReceiptNumber?: string | undefined;
	readonly fiscalReceiptUrl?: string | undefined;
}

export interface PhotoProtocolSlotItem {
	readonly slotId: string;
	readonly labelRu: string;
	readonly angle: "frontal_smile" | "retractor_12oclock" | "profile_right" | "profile_left" | "upper_occlusal" | "lower_occlusal" | "macro_anterior";
	readonly imageUrl: string;
	readonly timestampIso: string;
	readonly vitaShade?: string | undefined;
}

export interface BeforeAfterComparisonPair {
	readonly id: string;
	readonly titleRu: string;
	readonly clinicalIndicationRu: string;
	readonly procedureNameRu: string;
	readonly toothFdi?: string | undefined;
	readonly beforeSlot: PhotoProtocolSlotItem;
	readonly afterSlot: PhotoProtocolSlotItem;
	readonly defaultSplitPercent: number;
	readonly doctorNotesRu?: string | undefined;
}

export type { SbpBankAppMember, SbpDynamicQrModel } from "@dental/shared";

export interface PepSignatureAuditTrail {
	readonly verificationMethod: "sms_otp" | "sms_63fz_pep";
	readonly phone: string;
	readonly smsOtpCode: string;
	readonly integritySha256: string;
	readonly timestampMs: number;
	readonly signedAtIso: string;
	readonly legalBasis: "63-ФЗ ст. 5, ст. 6 (ПЭП)";
	readonly statutoryActBasis: "323-ФЗ ст. 20 (ИДС)" | "ПП РФ № 736 (Договор)" | "Приказ МЗ РФ № 804н (Акт)";
	readonly signerFullName: string;
	readonly signerPassport?: string | undefined;
	readonly ipAddress?: string | undefined;
	readonly userAgent?: string | undefined;
	readonly documentDigest: string;
}

export interface SignableStatutoryDocument {
	readonly id: string;
	readonly documentType: "ids_1051n" | "contract_736" | "act_804n" | "warranty_card" | "personal_data_152fz";
	readonly documentNumber: string;
	readonly titleRu: string;
	readonly dateIso: string;
	readonly doctorFullName: string;
	readonly summaryTextRu: string;
	readonly fullTextHtml: string;
	readonly status: "pending_signature" | "signed" | "rejected";
	readonly signedAtIso?: string | undefined;
	readonly signatureAudit?: PepSignatureAuditTrail | undefined;
	readonly pdfDownloadUrl?: string | undefined;
}

export interface PatientWebappAggregatedProfile {
	readonly patientId: string;
	readonly clinicId: string;
	readonly clinicName: string;
	readonly clinicAddress: string;
	readonly clinicPhone: string;
	readonly clinicInn: string;
	readonly fullName: string;
	readonly phone: string;
	readonly email?: string | undefined;
	readonly birthDate: string;
	readonly cardNumber: string;
	readonly curatingDoctor: string;
	readonly loyaltyBonusBalance: number;
	readonly loyaltyCashbackRub: number;
	readonly upcomingAppointments: readonly PatientAppointmentItem[];
	readonly pastAppointments: readonly PatientAppointmentItem[];
	readonly activeTreatmentPlan: PatientTreatmentPlanProfile | null;
	readonly invoices: readonly PatientInvoiceBillItem[];
	readonly beforeAfterGalleries: readonly BeforeAfterComparisonPair[];
	readonly signableDocuments: readonly SignableStatutoryDocument[];
	readonly totalDebtKopecks: number;
	readonly totalDebtRub: number;
	readonly nextAppointment?: PatientAppointmentItem | undefined;
}

// ============================================================================
// 2. КРИПТОГРАФИЧЕСКИЕ И ВЫЧИСЛИТЕЛЬНЫЕ УТИЛИТЫ (SHA-256 & CRC16)
// ============================================================================

export async function calculateSha256Subtle(inputString: string): Promise<string> {
	if (typeof crypto !== "undefined" && crypto.subtle) {
		const msgUint8 = new TextEncoder().encode(inputString);
		const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
	}
	return sha256Hex(inputString);
}

export function calculateSha256(inputString: string): string {
	return sha256Hex(inputString);
}

export { calculateCrc16Ccitt as calculateCrc16CcittFalse } from "@dental/shared";

export function kopecksToRubles(kopecks: number): number {
	return Math.round(kopecks) / 100;
}

export function rublesToKopecks(rubles: number): number {
	return Math.round((Number(rubles) || 0) * 100);
}

export function formatKopecksToCurrencyRu(kopecks: number): string {
	const rub = kopecksToRubles(kopecks);
	return rub.toLocaleString("ru-RU", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}) + " ₽";
}

// ============================================================================
// 3. СЕССИИ ПАЦИЕНТА И ТОКЕНЫ ДОСТУПА (PATIENT SESSIONS & SECURITY)
// ============================================================================

const DEFAULT_SECRET_SALT = "DENTE_PATIENT_WEBAPP_HMAC_SALT_2026";

export function generatePatientWebappSession(params: PatientWebappSessionParams): {
	session: PatientWebappSessionToken;
	encodedToken: string;
} {
	const now = Date.now();
	const ttlMs = (params.ttlHours ?? 72) * 60 * 60 * 1000;
	const expiresAt = now + ttlMs;
	const scopes = params.scopes && params.scopes.length > 0
		? params.scopes
		: (["portal:read", "portal:write", "portal:sign", "portal:pay"] as const);

	const sessionId = `SES-${params.patientId.slice(-6)}-${now.toString(36).toUpperCase()}`;
	const clinicId = params.clinicId || "CLINIC-MAIN";
	const nonce = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID().replace(/-/g, "").slice(0, 8) : Date.now().toString(36);
	const secret = params.secretKey || DEFAULT_SECRET_SALT;

	const signaturePayload = [
		sessionId,
		params.patientId,
		clinicId,
		params.phone,
		now.toString(),
		expiresAt.toString(),
		scopes.join(","),
		nonce,
		secret,
	].join("|");

	const signature = calculateSha256(signaturePayload);

	const session: PatientWebappSessionToken = {
		sessionId,
		patientId: params.patientId,
		clinicId,
		phone: params.phone,
		issuedAtTimestamp: now,
		expiresAtTimestamp: expiresAt,
		scopes,
		nonce,
		signature,
	};

	const rawJson = JSON.stringify(session);
	// Safe URL-base64 encoding
	const encodedToken = typeof Buffer !== "undefined"
		? Buffer.from(rawJson, "utf8").toString("base64url")
		: btoa(encodeURIComponent(rawJson));

	return { session, encodedToken };
}

export function validatePatientWebappSession(
	encodedToken: string,
	options?: { secretKey?: string; requiredScope?: PatientWebappScope; nowMs?: number },
): { isValid: boolean; session?: PatientWebappSessionToken; error?: string } {
	if (!encodedToken || typeof encodedToken !== "string") {
		return { isValid: false, error: "Токен сессии отсутствует или пуст." };
	}

	try {
		let decodedJson = "";
		if (typeof Buffer !== "undefined") {
			decodedJson = Buffer.from(encodedToken, "base64url").toString("utf8");
		} else {
			decodedJson = decodeURIComponent(atob(encodedToken));
		}

		const session = JSON.parse(decodedJson) as PatientWebappSessionToken;

		if (!session.sessionId || !session.patientId || !session.signature) {
			return { isValid: false, error: "Некорректная структура токена сессии." };
		}

		const now = options?.nowMs ?? Date.now();
		if (now > session.expiresAtTimestamp) {
			return { isValid: false, error: "Срок действия сессии пациента истёк. Авторизуйтесь заново." };
		}

		const secret = options?.secretKey || DEFAULT_SECRET_SALT;
		const expectedPayload = [
			session.sessionId,
			session.patientId,
			session.clinicId,
			session.phone,
			session.issuedAtTimestamp.toString(),
			session.expiresAtTimestamp.toString(),
			session.scopes.join(","),
			session.nonce,
			secret,
		].join("|");

		const expectedSignature = calculateSha256(expectedPayload);
		if (session.signature !== expectedSignature) {
			return { isValid: false, error: "Цифровая подпись сессии не совпадает (нарушение целостности)." };
		}

		if (options?.requiredScope && !session.scopes.includes(options.requiredScope)) {
			return { isValid: false, error: `У сессии нет разрешения на операцию: ${options.requiredScope}` };
		}

		return { isValid: true, session };
	} catch (err: any) {
		return { isValid: false, error: `Ошибка разбора токена сессии: ${err.message || "Неверный формат"}` };
	}
}

export function generatePatientMagicLink(
	baseUrl: string,
	encodedToken: string,
	targetTab: "home" | "appointments" | "plan" | "photos" | "payments" | "documents" | "postop" = "plan",
): string {
	const cleanBase = baseUrl.replace(/\/+$/, "");
	return `${cleanBase}/#/portal/webapp?token=${encodeURIComponent(encodedToken)}&tab=${targetTab}`;
}

// ============================================================================
// 4. СБОРКА ПРОФИЛЯ ПАЦИЕНТА И ФИНАНСОВЫЕ РАСЧЕТЫ (PROFILE & EXACT MONEY)
// ============================================================================

export function calculatePlanFinancials(
	stages: readonly PatientTreatmentPlanStage[],
): {
	totalCostKopecks: number;
	totalCostRub: number;
	paidCostKopecks: number;
	paidCostRub: number;
	remainingDueKopecks: number;
	remainingDueRub: number;
	progressPercent: number;
	completedStagesCount: number;
	totalStagesCount: number;
} {
	let totalKopecks = 0;
	let paidKopecks = 0;
	let completedStages = 0;

	for (const stage of stages) {
		totalKopecks += Math.max(0, stage.costKopecks);
		if (stage.status === "completed") {
			paidKopecks += Math.max(0, stage.costKopecks);
			completedStages++;
		}
	}

	const remainingKopecks = Math.max(0, totalKopecks - paidKopecks);
	const progressPercent = stages.length > 0
		? Math.round((completedStages / stages.length) * 100)
		: 0;

	return {
		totalCostKopecks: totalKopecks,
		totalCostRub: kopecksToRubles(totalKopecks),
		paidCostKopecks: paidKopecks,
		paidCostRub: kopecksToRubles(paidKopecks),
		remainingDueKopecks: remainingKopecks,
		remainingDueRub: kopecksToRubles(remainingKopecks),
		progressPercent,
		completedStagesCount: completedStages,
		totalStagesCount: stages.length,
	};
}

export function assemblePatientWebappProfile(params: {
	patientId: string;
	clinicName?: string;
	clinicAddress?: string;
	clinicPhone?: string;
	clinicInn?: string;
	fullName: string;
	phone: string;
	birthDate: string;
	cardNumber: string;
	curatingDoctor?: string;
	appointments?: readonly PatientAppointmentItem[];
	treatmentPlan?: PatientTreatmentPlanProfile | null;
	invoices?: readonly PatientInvoiceBillItem[];
	beforeAfterGalleries?: readonly BeforeAfterComparisonPair[];
	signableDocuments?: readonly SignableStatutoryDocument[];
	loyaltyBonusBalance?: number;
	loyaltyCashbackRub?: number;
	currentDateIso?: string;
}): PatientWebappAggregatedProfile {
	const nowIso = params.currentDateIso || new Date().toISOString().slice(0, 10);
	const rawAppointments = params.appointments || [];

	const upcomingAppointments = rawAppointments
		.filter((a) => (a.status === "scheduled" || a.status === "confirmed") && a.dateIso >= nowIso)
		.sort((a, b) => a.dateIso.localeCompare(b.dateIso) || a.timeRu.localeCompare(b.timeRu));

	const pastAppointments = rawAppointments
		.filter((a) => a.status === "completed" || a.dateIso < nowIso)
		.sort((a, b) => b.dateIso.localeCompare(a.dateIso));

	const nextAppointment = upcomingAppointments[0];

	const rawInvoices = params.invoices || [];
	let totalDebtKopecks = 0;
	for (const inv of rawInvoices) {
		if (inv.status === "unpaid" || inv.status === "partially_paid") {
			totalDebtKopecks += Math.max(0, inv.remainingAmountKopecks);
		}
	}

	return {
		patientId: params.patientId,
		clinicId: "CLINIC-MAIN",
		clinicName: params.clinicName || 'ООО "Стоматологическая клиника ДЕНТЕ"',
		clinicAddress: params.clinicAddress || "г. Москва, ул. Стоматологическая, д. 10",
		clinicPhone: params.clinicPhone || "+7 (495) 789-01-23",
		clinicInn: params.clinicInn || "",
		fullName: params.fullName,
		phone: params.phone,
		birthDate: params.birthDate,
		cardNumber: params.cardNumber,
		curatingDoctor: params.curatingDoctor || "Д-р Смирнова Анна Сергеевна",
		loyaltyBonusBalance: params.loyaltyBonusBalance ?? 5000,
		loyaltyCashbackRub: params.loyaltyCashbackRub ?? 1250,
		upcomingAppointments,
		pastAppointments,
		activeTreatmentPlan: params.treatmentPlan || null,
		invoices: rawInvoices,
		beforeAfterGalleries: params.beforeAfterGalleries || [],
		signableDocuments: params.signableDocuments || [],
		totalDebtKopecks,
		totalDebtRub: kopecksToRubles(totalDebtKopecks),
		nextAppointment,
	};
}

// ============================================================================
// 5. ФОТОПРОТОКОЛ «ДО / ПОСЛЕ» И СЛАЙДЕР ШТОРКИ (BEFORE / AFTER & WIPER MATH)
// ============================================================================

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

// ============================================================================
// 6. ОПЛАТА ЧЕРЕЗ СБП (НСПК / ГОСТ Р 56042-2014 & EMVCo)
// ============================================================================

export { SBP_BANKS_CATALOG, generateSbpPaymentQrModel } from "@dental/shared";

// ============================================================================
// 7. ОНЛАЙН-ПОДПИСАНИЕ ИДС И ДОГОВОРА СМС-КОДОМ ПЭП (63-ФЗ)
// ============================================================================

export function generateSmsOtpForSigning(
	phone: string,
	documentId: string,
	mockCode?: string,
): { code: string; sentTimestamp: number; expiresAt: number } {
	let code = mockCode;
	if (!code) {
		if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
			const arr = new Uint32Array(1);
			crypto.getRandomValues(arr);
			code = String(100000 + (arr[0]! % 900000));
		} else {
			code = String(100000 + (Date.now() % 900000));
		}
	}
	const now = Date.now();
	const expiresAt = now + 5 * 60 * 1000; // 5 минут валидности

	return {
		code,
		sentTimestamp: now,
		expiresAt,
	};
}

export function verifySmsOtpForSigning(
	inputCode: string,
	expectedCode: string,
	sentTimestamp: number,
	maxAgeMs = 5 * 60 * 1000,
): { isSuccess: boolean; error?: string } {
	const cleanInput = inputCode.replace(/\D/g, "");
	const cleanExpected = expectedCode.replace(/\D/g, "");

	if (!cleanInput || cleanInput.length !== 6) {
		return { isSuccess: false, error: "Код подтверждения должен состоять ровно из 6 цифр." };
	}

	const now = Date.now();
	if (now - sentTimestamp > maxAgeMs) {
		return { isSuccess: false, error: "Срок действия СМС-кода истёк (5 минут). Запросите новый код." };
	}

	if (cleanInput !== cleanExpected) {
		return { isSuccess: false, error: "Неверный код подтверждения из СМС. Проверьте правильность ввода." };
	}

	return { isSuccess: true };
}

export function computeDocumentDigest(doc: SignableStatutoryDocument): string {
	const payload = [
		doc.id,
		doc.documentType,
		doc.documentNumber,
		doc.dateIso,
		doc.doctorFullName,
		doc.titleRu,
		doc.summaryTextRu,
		doc.fullTextHtml,
	].join("###");
	return calculateSha256(payload);
}

export function signDocumentWithPep(params: {
	document: SignableStatutoryDocument;
	patientPhone: string;
	smsOtpCode: string;
	signerFullName: string;
	signerPassport?: string;
	ipAddress?: string;
	userAgent?: string;
	timestampMs?: number;
}): SignableStatutoryDocument {
	const now = params.timestampMs ?? Date.now();
	const signedAtIso = new Date(now).toISOString();
	const documentDigest = computeDocumentDigest(params.document);

	let statutoryAct: "323-ФЗ ст. 20 (ИДС)" | "ПП РФ № 736 (Договор)" | "Приказ МЗ РФ № 804н (Акт)" = "323-ФЗ ст. 20 (ИДС)";
	if (params.document.documentType === "contract_736") {
		statutoryAct = "ПП РФ № 736 (Договор)";
	} else if (params.document.documentType === "act_804n") {
		statutoryAct = "Приказ МЗ РФ № 804н (Акт)";
	}

	const rawAuditTrailPayload = [
		params.document.id,
		params.document.documentNumber,
		params.patientPhone,
		params.smsOtpCode,
		params.signerFullName,
		params.signerPassport || "Паспорт РФ",
		now.toString(),
		statutoryAct,
		"63-ФЗ ст. 5, ст. 6 (ПЭП)",
		documentDigest,
	].join("|");

	const integritySha256 = calculateSha256(rawAuditTrailPayload);

	const signatureAudit: PepSignatureAuditTrail = {
		verificationMethod: "sms_63fz_pep",
		phone: params.patientPhone,
		smsOtpCode: params.smsOtpCode,
		integritySha256,
		timestampMs: now,
		signedAtIso,
		legalBasis: "63-ФЗ ст. 5, ст. 6 (ПЭП)",
		statutoryActBasis: statutoryAct,
		signerFullName: params.signerFullName,
		signerPassport: params.signerPassport,
		ipAddress: params.ipAddress || "127.0.0.1 (Web Portal PWA)",
		userAgent: params.userAgent || "DENTE Mobile WebApp / Capacitor PWA",
		documentDigest,
	};

	return {
		...params.document,
		status: "signed",
		signedAtIso,
		signatureAudit,
		pdfDownloadUrl: `/portal/documents/signed/${params.document.id}.pdf`,
	};
}

export function getPresetSignableDocuments(patientName: string, phone: string): readonly SignableStatutoryDocument[] {
	const today = new Date().toISOString().slice(0, 10);

	return [
		{
			id: "doc-ids-1051n-001",
			documentType: "ids_1051n",
			documentNumber: "ИДС-2026/08-142",
			titleRu: "Информированное добровольное согласие на терапевтическое лечение (Приказ МЗ РФ № 1051н)",
			dateIso: today,
			doctorFullName: "Смирнова Анна Сергеевна",
			summaryTextRu: "Согласие на проведение местного обезболивания, инструментальной обработки корневых каналов и постановку пломбы.",
			fullTextHtml: `<div class="doc-body">
				<h3>ИНФОРМИРОВАННОЕ ДОБРОВОЛЬНОЕ СОГЛАСИЕ</h3>
				<p>В соответствии со статьей 20 Федерального закона № 323-ФЗ и Приказом Минздрава России № 1051н, пациент <strong>${patientName}</strong> подтверждает согласие на медицинское вмешательство...</p>
			</div>`,
			status: "pending_signature",
		},
		{
			id: "doc-contract-736-001",
			documentType: "contract_736",
			documentNumber: "ДОГ-2026/08-736",
			titleRu: "Договор на оказание платных медицинских услуг (Постановление Правительства РФ № 736)",
			dateIso: today,
			doctorFullName: "Смирнова Анна Сергеевна",
			summaryTextRu: "Договор на комплексное стоматологическое обслуживание согласно утвержденному плану лечения и смете.",
			fullTextHtml: `<div class="doc-body">
				<h3>ДОГОВОР НА ОКАЗАНИЕ ПЛАТНЫХ МЕДИЦИНСКИХ УСЛУГ</h3>
				<p>ООО "Стоматологическая клиника ДЕНТЕ" (Лицензия № ЛО41-01137-77/00368421) в соответствии с Постановлением Правительства РФ № 736 и Заказчик <strong>${patientName}</strong> заключили настоящий Договор...</p>
			</div>`,
			status: "pending_signature",
		},
	];
}
