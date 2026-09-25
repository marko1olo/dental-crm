import type {
	PatientRecallRecord,
	RecallCycleType,
	RecallTemplateVariables,
} from "./recallCycleCatalog";
import { RECALL_CYCLE_CATALOG } from "./recallCycleCatalog";

export interface SmsSegmentCalculation {
	readonly characterCount: number;
	readonly encoding: "GSM-7" | "UCS-2";
	readonly segmentCount: number;
	readonly charsPerSegment: number;
	readonly maxCharsInCurrentSegment: number;
	readonly remainingInCurrentSegment: number;
	readonly isMultipart: boolean;
}

/**
 * Расчет сегментов SMS в соответствии со стандартами 3GPP TS 23.038 / GSM 03.38.
 * Поддерживает GSM 7-bit (160 / 153 символа) и UCS-2 Unicode (70 / 67 символов).
 */
export function calculateSmsSegments(text: string): SmsSegmentCalculation {
	const characterCount = text.length;
	if (characterCount === 0) {
		return {
			characterCount: 0,
			encoding: "GSM-7",
			segmentCount: 0,
			charsPerSegment: 160,
			maxCharsInCurrentSegment: 160,
			remainingInCurrentSegment: 160,
			isMultipart: false,
		};
	}

	// Базовый GSM 7-bit набор символов
	const gsm7Regex = /^[@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ\x1BÆæßÉ !"#¤%&'()*+,\-./0-9:;<=>?¡A-ZÄÖÑÜ§¿a-zäöñüà^{}\\[~\]|€]*$/;
	const isGsm7 = gsm7Regex.test(text);
	const encoding: "GSM-7" | "UCS-2" = isGsm7 ? "GSM-7" : "UCS-2";

	const singleLimit = isGsm7 ? 160 : 70;
	const multiLimit = isGsm7 ? 153 : 67;

	if (characterCount <= singleLimit) {
		return {
			characterCount,
			encoding,
			segmentCount: 1,
			charsPerSegment: singleLimit,
			maxCharsInCurrentSegment: singleLimit,
			remainingInCurrentSegment: singleLimit - characterCount,
			isMultipart: false,
		};
	}

	const segmentCount = Math.ceil(characterCount / multiLimit);
	const totalCapacity = segmentCount * multiLimit;
	const remainingInCurrentSegment = totalCapacity - characterCount;

	return {
		characterCount,
		encoding,
		segmentCount,
		charsPerSegment: multiLimit,
		maxCharsInCurrentSegment: totalCapacity,
		remainingInCurrentSegment,
		isMultipart: true,
	};
}

/**
 * Краткая сводка длины и тарификации SMS для интерфейса врача и администратора.
 */
export function formatSmsSummary(calc: SmsSegmentCalculation): string {
	if (calc.characterCount === 0) {
		return "0 символов • 0 SMS";
	}
	const segWord = calc.segmentCount === 1 ? "сегмент" : calc.segmentCount < 5 ? "сегмента" : "сегментов";
	return `${calc.characterCount} симв. • ${calc.segmentCount} SMS (${segWord}, ${calc.encoding}) • остаток: ${calc.remainingInCurrentSegment}`;
}

export function extractFirstName(fullName: string): string {
	const trimmed = fullName.trim();
	if (!trimmed) return "Пациент";
	const parts = trimmed.split(/\s+/);
	if (parts.length >= 2 && parts[1]) {
		return parts[1];
	}
	return parts[0] || "Пациент";
}

/**
 * Извлечение уважительного обращения по имени и отчеству («Иванов Иван Иванович» -> «Иван Иванович»).
 * Если отчества нет — берется имя («Иван»). Если имя не распознано — нейтральное «Пациент».
 * Соответствует 152-ФЗ и правилам медицинской этики.
 */
export function extractPolitePatientName(fullName: string): string {
	const trimmed = fullName.trim();
	if (!trimmed) return "Пациент";
	const parts = trimmed.split(/\s+/);
	if (parts.length >= 3 && parts[1] && parts[2]) {
		return `${parts[1]} ${parts[2]}`;
	}
	if (parts.length === 2 && parts[1]) {
		return parts[1];
	}
	return parts[0] || "Пациент";
}

export function sanitizePhoneNumber(phone: string | null | undefined): string {
	if (!phone) return "";
	const digits = phone.replace(/\D/g, "");
	if (digits.startsWith("8") && digits.length === 11) {
		return `7${digits.slice(1)}`;
	}
	return digits;
}

export function generate1ClickBookingLink(options: {
	readonly baseUrl?: string | undefined;
	readonly patientId: string;
	readonly doctorId?: string | undefined;
	readonly cycleType?: RecallCycleType | undefined;
	readonly source?: string | undefined;
	readonly campaign?: string | undefined;
}): string {
	const base = options.baseUrl ? options.baseUrl.replace(/\/+$/, "") : "";
	const path = `${base}/booking`;
	const params = new URLSearchParams();

	params.set("patient_id", options.patientId);
	if (options.doctorId) {
		params.set("doctor_id", options.doctorId);
	}
	if (options.cycleType) {
		params.set("recall_cycle", options.cycleType);
	}
	params.set("source", options.source ?? "recall_engine");
	params.set("utm_campaign", options.campaign ?? `recall_${options.cycleType ?? "general"}`);

	return `${path}?${params.toString()}`;
}

export function generatePdnProtectedRecallMessage(
	candidate: PatientRecallRecord,
	options: { readonly clinicName?: string | undefined; readonly baseUrl?: string | undefined } = {},
): string {
	const clinicName = options.clinicName || "Стоматология ДЕНТЕ";
	const politeName = extractPolitePatientName(candidate.fullName);
	const bookingUrl = generate1ClickBookingLink({
		baseUrl: options.baseUrl,
		patientId: candidate.patientId,
		doctorId: candidate.attendingDoctorId,
		cycleType: candidate.cycleType,
		source: "recall_pdn_152fz",
	});

	return `${politeName}, подошел срок контрольного осмотра в клинике «${clinicName}». Записаться: ${bookingUrl}`;
}

export function buildWhatsAppUrl(phone: string | null | undefined, text: string): string {
	const cleanPhone = sanitizePhoneNumber(phone);
	const encodedText = encodeURIComponent(text);
	return cleanPhone
		? `https://wa.me/${cleanPhone}?text=${encodedText}`
		: `https://wa.me/?text=${encodedText}`;
}

export function buildTelegramUrl(phoneOrUsername: string | null | undefined, text: string): string {
	const encodedText = encodeURIComponent(text);
	if (!phoneOrUsername) {
		return `https://t.me/share/url?url=&text=${encodedText}`;
	}
	const clean = phoneOrUsername.trim().replace(/^@/, "");
	if (/^\+?\d+$/.test(clean)) {
		return `https://t.me/+${sanitizePhoneNumber(clean)}?text=${encodedText}`;
	}
	return `https://t.me/${clean}?text=${encodedText}`;
}

export function interpolateRecallTemplate(
	template: string,
	variables: RecallTemplateVariables,
): string {
	return template
		.replace(/\{\{PATIENT_FIRST_NAME\}\}/g, variables.patientFirstName)
		.replace(/\{\{PATIENT_FULL_NAME\}\}/g, variables.patientFullName)
		.replace(/\{\{DOCTOR_NAME\}\}/g, variables.doctorName)
		.replace(/\{\{CLINIC_NAME\}\}/g, variables.clinicName)
		.replace(/\{\{SERVICE_NAME\}\}/g, variables.serviceName)
		.replace(/\{\{LAST_VISIT_DATE\}\}/g, variables.lastVisitDateFormatted)
		.replace(/\{\{DUE_DATE\}\}/g, variables.dueDateFormatted)
		.replace(/\{\{INTERVAL_DESC\}\}/g, variables.intervalDescription)
		.replace(/\{\{BOOKING_URL\}\}/g, variables.bookingUrl)
		.replace(/\{\{PHONE\}\}/g, variables.phone);
}

export const WHATSAPP_TEMPLATES: Record<RecallCycleType, string> = {
	standard_prophylaxis:
		"Здравствуйте, {{PATIENT_FIRST_NAME}}! " +
		"Стоматология «{{CLINIC_NAME}}». Ваш лечащий доктор {{DOCTOR_NAME}} напоминает: " +
		"прошло 6 месяцев с Вашего прошлого визита ({{LAST_VISIT_DATE}}). " +
		"Подошел срок плановой профгигиены Air-Flow и осмотра для сохранения здоровья зубов и гарантии.\n\n" +
		"Записаться онлайн в 1 клик:\n{{BOOKING_URL}}\n\n" +
		"Или просто ответьте на это сообщение, и мы подберем удобный слот!",

	periodontal_maintenance:
		"Добрый день, {{PATIENT_FIRST_NAME}}! " +
		"Клиника «{{CLINIC_NAME}}». Доктор {{DOCTOR_NAME}} напоминает: " +
		"прошло {{INTERVAL_DESC}} с курса пародонтального лечения (визит {{LAST_VISIT_DATE}}). " +
		"Чтобы закрепить ремиссию и не допустить воспаления десен, важно провести поддерживающую гигиену.\n\n" +
		"Запись на прием:\n{{BOOKING_URL}}",

	implant_monitoring:
		"Здравствуйте, {{PATIENT_FIRST_NAME}}! " +
		"«{{CLINIC_NAME}}» заботится о Вашей улыбке. " +
		"Подошел срок контрольного рентген-осмотра имплантатов у доктора {{DOCTOR_NAME}} (прошлый визит {{LAST_VISIT_DATE}}). " +
		"Это необходимо для контроля остеоинтеграции и сохранения гарантийного сертификата.\n\n" +
		"Записаться к доктору:\n{{BOOKING_URL}}",

	orthodontic_braces:
		"Здравствуйте, {{PATIENT_FIRST_NAME}}! " +
		"Клиника «{{CLINIC_NAME}}». Ваш ортодонт {{DOCTOR_NAME}} ждет Вас на плановую активацию брекет-системы и смену дуг. " +
		"Прошло 4 недели с прошлой коррекции ({{LAST_VISIT_DATE}}).\n\n" +
		"Выбрать слот онлайн:\n{{BOOKING_URL}}",

	orthodontic_aligners:
		"Здравствуйте, {{PATIENT_FIRST_NAME}}! " +
		"Клиника «{{CLINIC_NAME}}». Подошел срок ревизии элайнеров у доктора {{DOCTOR_NAME}} (прошло {{INTERVAL_DESC}}). " +
		"Доктор оценит трекинг зубов и выдаст следующий комплект капп.\n\n" +
		"Онлайн-запись:\n{{BOOKING_URL}}",

	orthodontic_retention:
		"Здравствуйте, {{PATIENT_FIRST_NAME}}! " +
		"Клиника «{{CLINIC_NAME}}». Доктор {{DOCTOR_NAME}} приглашает на ретенционный контроль (проверка ретейнеров и капп после визита {{LAST_VISIT_DATE}}).\n\n" +
		"Записаться онлайн:\n{{BOOKING_URL}}",

	pediatric_fluoridation:
		"Здравствуйте! Детская стоматология «{{CLINIC_NAME}}». " +
		"Прошло {{INTERVAL_DESC}} с последнего осмотра {{PATIENT_FIRST_NAME}} ({{LAST_VISIT_DATE}}). " +
		"Детский доктор {{DOCTOR_NAME}} приглашает на минерализацию эмали и урок гигиены!\n\n" +
		"Запись к детскому доктору:\n{{BOOKING_URL}}",

	caries_high_risk:
		"Здравствуйте, {{PATIENT_FIRST_NAME}}! " +
		"Стоматология «{{CLINIC_NAME}}». Прошло 3 месяца с лечения кариеса у доктора {{DOCTOR_NAME}} ({{LAST_VISIT_DATE}}). " +
		"Для защиты эмали и контроля краевого прилегания пломб рекомендована плановая ремотерапия.\n\n" +
		"Онлайн-запись:\n{{BOOKING_URL}}",

	prosthetic_check:
		"Здравствуйте, {{PATIENT_FIRST_NAME}}! " +
		"«{{CLINIC_NAME}}». Подошел срок контрольного осмотра ортопедических конструкций у доктора {{DOCTOR_NAME}} для пролонгации гарантии.\n\n" +
		"Записаться:\n{{BOOKING_URL}}",
};

export const SMS_TEMPLATES: Record<RecallCycleType, string> = {
	standard_prophylaxis:
		"{{PATIENT_FIRST_NAME}}, прошло 6 мес с визита в {{CLINIC_NAME}}. Пора на профгигиену для сохранения гарантии: {{BOOKING_URL}}",
	periodontal_maintenance:
		"{{PATIENT_FIRST_NAME}}, подошел срок пародонтологического контроля в {{CLINIC_NAME}} у доктора {{DOCTOR_NAME}}: {{BOOKING_URL}}",
	implant_monitoring:
		"{{PATIENT_FIRST_NAME}}, плановый рентген-контроль имплантов в {{CLINIC_NAME}} (д-р {{DOCTOR_NAME}}). Запись: {{BOOKING_URL}}",
	orthodontic_braces:
		"{{PATIENT_FIRST_NAME}}, плановая активация брекетов в {{CLINIC_NAME}} (д-р {{DOCTOR_NAME}}). Запись: {{BOOKING_URL}}",
	orthodontic_aligners:
		"{{PATIENT_FIRST_NAME}}, ревизия элайнеров и выдача капп в {{CLINIC_NAME}}. Запись: {{BOOKING_URL}}",
	orthodontic_retention:
		"{{PATIENT_FIRST_NAME}}, контроль ретейнеров в {{CLINIC_NAME}} (д-р {{DOCTOR_NAME}}): {{BOOKING_URL}}",
	pediatric_fluoridation:
		"Осмотр и фторирование зубов для {{PATIENT_FIRST_NAME}} в {{CLINIC_NAME}} (д-р {{DOCTOR_NAME}}): {{BOOKING_URL}}",
	caries_high_risk:
		"{{PATIENT_FIRST_NAME}}, плановый осмотр и ремотерапия эмали в {{CLINIC_NAME}}: {{BOOKING_URL}}",
	prosthetic_check:
		"{{PATIENT_FIRST_NAME}}, гарантийный осмотр коронок в {{CLINIC_NAME}}: {{BOOKING_URL}}",
};

export function generateWhatsAppRecallMessage(
	candidate: PatientRecallRecord,
	options: { readonly clinicName?: string | undefined; readonly baseUrl?: string | undefined } = {},
): string {
	const clinicName = options.clinicName || "Стоматология ДЕНТЕ";
	const doctorName = candidate.attendingDoctorName || "Ваш лечащий врач";
	const firstName = extractFirstName(candidate.fullName);
	const cycleDef = RECALL_CYCLE_CATALOG[candidate.cycleType] || RECALL_CYCLE_CATALOG.standard_prophylaxis;

	const bookingUrl = generate1ClickBookingLink({
		baseUrl: options.baseUrl,
		patientId: candidate.patientId,
		doctorId: candidate.attendingDoctorId,
		cycleType: candidate.cycleType,
		source: "whatsapp",
		campaign: `recall_${candidate.cycleType}`,
	});

	const template = WHATSAPP_TEMPLATES[candidate.cycleType] || WHATSAPP_TEMPLATES.standard_prophylaxis;

	const intervalDescription =
		cycleDef.intervalUnit === "weeks"
			? `${cycleDef.defaultIntervalValue} нед.`
			: `${cycleDef.defaultIntervalValue} мес.`;

	const vars: RecallTemplateVariables = {
		patientFirstName: firstName,
		patientFullName: candidate.fullName,
		doctorName,
		clinicName,
		serviceName: cycleDef.title,
		lastVisitDateFormatted: candidate.lastVisitDate,
		dueDateFormatted: candidate.dueDate,
		intervalDescription,
		bookingUrl,
		phone: candidate.phone || "",
	};

	return interpolateRecallTemplate(template, vars);
}

export function generateTelegramRecallMessage(
	candidate: PatientRecallRecord,
	options: { readonly clinicName?: string | undefined; readonly baseUrl?: string | undefined } = {},
): string {
	return generateWhatsAppRecallMessage(candidate, options);
}

export function generateSmsRecallMessage(
	candidate: PatientRecallRecord,
	options: { readonly clinicName?: string | undefined; readonly baseUrl?: string | undefined } = {},
): string {
	const clinicName = options.clinicName || "DENTE";
	const doctorName = candidate.attendingDoctorName || "Врач";
	const firstName = extractFirstName(candidate.fullName);
	const cycleDef = RECALL_CYCLE_CATALOG[candidate.cycleType] || RECALL_CYCLE_CATALOG.standard_prophylaxis;

	const bookingUrl = generate1ClickBookingLink({
		baseUrl: options.baseUrl,
		patientId: candidate.patientId,
		doctorId: candidate.attendingDoctorId,
		cycleType: candidate.cycleType,
		source: "sms",
		campaign: `recall_sms_${candidate.cycleType}`,
	});

	const template = SMS_TEMPLATES[candidate.cycleType] || SMS_TEMPLATES.standard_prophylaxis;

	const intervalDescription =
		cycleDef.intervalUnit === "weeks"
			? `${cycleDef.defaultIntervalValue} нед.`
			: `${cycleDef.defaultIntervalValue} мес.`;

	const vars: RecallTemplateVariables = {
		patientFirstName: firstName,
		patientFullName: candidate.fullName,
		doctorName,
		clinicName,
		serviceName: cycleDef.shortTitle,
		lastVisitDateFormatted: candidate.lastVisitDate,
		dueDateFormatted: candidate.dueDate,
		intervalDescription,
		bookingUrl,
		phone: candidate.phone || "",
	};

	return interpolateRecallTemplate(template, vars);
}
