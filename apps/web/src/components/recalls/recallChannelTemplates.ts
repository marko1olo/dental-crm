import type { PatientRecallRecord, RecallCycleType, RecallTemplateVariables } from "./recallCycleCatalog";
import { RECALL_CYCLE_CATALOG } from "./recallCycleCatalog";
import { generate1ClickBookingLink, extractFirstName, interpolateRecallTemplate } from "./recallMessageFormatters";

export const WHATSAPP_TEMPLATES: Record<RecallCycleType, string> = {
	standard_prophylaxis: "Здравствуйте, {{PATIENT_FIRST_NAME}}! Стоматология «{{CLINIC_NAME}}». Доктор {{DOCTOR_NAME}} напоминает: прошло 6 месяцев с прошлого визита ({{LAST_VISIT_DATE}}). Подошел срок плановой профгигиены Air-Flow и осмотра.\n\nЗаписаться в 1 клик:\n{{BOOKING_URL}}",
	periodontal_maintenance: "Добрый день, {{PATIENT_FIRST_NAME}}! «{{CLINIC_NAME}}». Доктор {{DOCTOR_NAME}} напоминает о поддерживающей гигиене для десен (прошло {{INTERVAL_DESC}} с визита {{LAST_VISIT_DATE}}).\n\nЗапись на прием:\n{{BOOKING_URL}}",
	implant_monitoring: "Здравствуйте, {{PATIENT_FIRST_NAME}}! «{{CLINIC_NAME}}». Подошел срок контрольного осмотра имплантатов у доктора {{DOCTOR_NAME}} (прошлый визит {{LAST_VISIT_DATE}}).\n\nЗаписаться к доктору:\n{{BOOKING_URL}}",
	orthodontic_braces: "Здравствуйте, {{PATIENT_FIRST_NAME}}! «{{CLINIC_NAME}}». Доктор {{DOCTOR_NAME}} ждет Вас на плановую активацию брекетов и смену дуг (визит {{LAST_VISIT_DATE}}).\n\nВыбрать слот онлайн:\n{{BOOKING_URL}}",
	orthodontic_aligners: "Здравствуйте, {{PATIENT_FIRST_NAME}}! «{{CLINIC_NAME}}». Срок ревизии элайнеров у доктора {{DOCTOR_NAME}} (прошло {{INTERVAL_DESC}}). Выдача нового сета капп.\n\nЗапись онлайн:\n{{BOOKING_URL}}",
	orthodontic_retention: "Здравствуйте, {{PATIENT_FIRST_NAME}}! «{{CLINIC_NAME}}». Доктор {{DOCTOR_NAME}} приглашает на ретенционный контроль после лечения.\n\nЗаписаться:\n{{BOOKING_URL}}",
	pediatric_fluoridation: "Здравствуйте! Детская стоматология «{{CLINIC_NAME}}». Прошло {{INTERVAL_DESC}} с визита {{PATIENT_FIRST_NAME}}. Доктор {{DOCTOR_NAME}} приглашает на минерализацию эмали!\n\nЗапись:\n{{BOOKING_URL}}",
	caries_high_risk: "Здравствуйте, {{PATIENT_FIRST_NAME}}! «{{CLINIC_NAME}}». Рекомендована плановая ремотерапия эмали и ревизия пломб у доктора {{DOCTOR_NAME}}.\n\nЗапись:\n{{BOOKING_URL}}",
	prosthetic_check: "Здравствуйте, {{PATIENT_FIRST_NAME}}! «{{CLINIC_NAME}}». Срок контрольного осмотра коронок у доктора {{DOCTOR_NAME}} для гарантии.\n\nЗапись:\n{{BOOKING_URL}}",
	endodontic_check: "Здравствуйте, {{PATIENT_FIRST_NAME}}! «{{CLINIC_NAME}}». Доктор {{DOCTOR_NAME}} напоминает: прошел 1 месяц после лечения каналов. Ждем на контрольный снимок.\n\nЗапись:\n{{BOOKING_URL}}",
};

export const SMS_TEMPLATES: Record<RecallCycleType, string> = {
	standard_prophylaxis: "{{PATIENT_FIRST_NAME}}, прошло 6 мес с визита в {{CLINIC_NAME}}. Пора на профгигиену для сохранения гарантии: {{BOOKING_URL}}",
	periodontal_maintenance: "{{PATIENT_FIRST_NAME}}, подошел срок пародонтологического контроля в {{CLINIC_NAME}} у доктора {{DOCTOR_NAME}}: {{BOOKING_URL}}",
	implant_monitoring: "{{PATIENT_FIRST_NAME}}, плановый рентген-контроль имплантов в {{CLINIC_NAME}} (д-р {{DOCTOR_NAME}}). Запись: {{BOOKING_URL}}",
	orthodontic_braces: "{{PATIENT_FIRST_NAME}}, плановая активация брекетов в {{CLINIC_NAME}} (д-р {{DOCTOR_NAME}}). Запись: {{BOOKING_URL}}",
	orthodontic_aligners: "{{PATIENT_FIRST_NAME}}, ревизия элайнеров и выдача капп в {{CLINIC_NAME}}. Запись: {{BOOKING_URL}}",
	orthodontic_retention: "{{PATIENT_FIRST_NAME}}, контроль ретейнеров в {{CLINIC_NAME}} (д-р {{DOCTOR_NAME}}): {{BOOKING_URL}}",
	pediatric_fluoridation: "Осмотр и фторирование зубов для {{PATIENT_FIRST_NAME}} в {{CLINIC_NAME}} (д-р {{DOCTOR_NAME}}): {{BOOKING_URL}}",
	caries_high_risk: "{{PATIENT_FIRST_NAME}}, плановый осмотр и ремотерапия эмали в {{CLINIC_NAME}}: {{BOOKING_URL}}",
	prosthetic_check: "{{PATIENT_FIRST_NAME}}, гарантийный осмотр коронок в {{CLINIC_NAME}}: {{BOOKING_URL}}",
	endodontic_check: "{{PATIENT_FIRST_NAME}}, контрольный рентген-осмотр после эндодонтии в {{CLINIC_NAME}} (д-р {{DOCTOR_NAME}}): {{BOOKING_URL}}",
};

export function generateWhatsAppRecallMessage(candidate: PatientRecallRecord, options: { readonly clinicName?: string | undefined; readonly baseUrl?: string | undefined } = {}): string {
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
	const intervalDescription = cycleDef.intervalUnit === "weeks" ? `${cycleDef.defaultIntervalValue} нед.` : `${cycleDef.defaultIntervalValue} мес.`;
	const vars: RecallTemplateVariables = {
		patientFirstName: firstName, patientFullName: candidate.fullName, doctorName, clinicName,
		serviceName: cycleDef.title, lastVisitDateFormatted: candidate.lastVisitDate, dueDateFormatted: candidate.dueDate,
		intervalDescription, bookingUrl, phone: candidate.phone || "",
	};
	return interpolateRecallTemplate(template, vars);
}

export function generateTelegramRecallMessage(candidate: PatientRecallRecord, options: { readonly clinicName?: string | undefined; readonly baseUrl?: string | undefined } = {}): string {
	return generateWhatsAppRecallMessage(candidate, options);
}

export function generateSmsRecallMessage(candidate: PatientRecallRecord, options: { readonly clinicName?: string | undefined; readonly baseUrl?: string | undefined } = {}): string {
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
	const intervalDescription = cycleDef.intervalUnit === "weeks" ? `${cycleDef.defaultIntervalValue} нед.` : `${cycleDef.defaultIntervalValue} мес.`;
	const vars: RecallTemplateVariables = {
		patientFirstName: firstName, patientFullName: candidate.fullName, doctorName, clinicName,
		serviceName: cycleDef.shortTitle, lastVisitDateFormatted: candidate.lastVisitDate, dueDateFormatted: candidate.dueDate,
		intervalDescription, bookingUrl, phone: candidate.phone || "",
	};
	return interpolateRecallTemplate(template, vars);
}
