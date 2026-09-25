import type { RecallContactStatus } from "./recallCycleCatalog";
import {
	extractFirstName,
	sanitizePhoneNumber,
} from "./recallSmsAndMessaging";

export type RecallCategoryFilter =
	| "all"
	| "hygiene_6m"
	| "implants_1y"
	| "orthodontics"
	| "endodontics";

export type RecallUrgencyLevel =
	| "upcoming"
	| "due_now"
	| "overdue_30"
	| "overdue_90"
	| "completed";

export type RecallChannelType = "whatsapp" | "telegram" | "sms" | "phone";

export interface PatientRecallItem {
	readonly id: string;
	readonly patientId: string;
	readonly fullName: string;
	readonly phone: string | null;
	readonly email?: string | null | undefined;
	readonly category: "hygiene" | "implants" | "orthodontics" | "endodontics";
	readonly categoryLabel: string;
	readonly lastVisitDate: string; // YYYY-MM-DD
	readonly dueDate: string; // YYYY-MM-DD
	readonly daysOverdue: number; // positive = overdue
	readonly urgency: RecallUrgencyLevel;
	readonly attendingDoctorId?: string | undefined;
	readonly attendingDoctorName?: string | undefined;
	readonly lastProcedures?: readonly string[] | undefined;
	readonly clinicalNotes?: string | undefined;
	readonly implantsCount?: number | undefined;
	readonly periodontalPocketMm?: number | undefined;
	readonly status: RecallContactStatus;
	readonly lastContactedAt?: string | undefined;
	readonly lastContactChannel?: RecallChannelType | undefined;
	readonly scheduledAppointmentDate?: string | undefined;
}

export const DEFAULT_RECALL_CANDIDATES: readonly PatientRecallItem[] = [];

export const extractPatientFirstName = extractFirstName;
export const cleanPhoneDigits = sanitizePhoneNumber;

export function buildRecallMessageContent(
	candidate: PatientRecallItem,
	channel: RecallChannelType,
	clinicName = "Стоматология «ДЕНТЕ»",
): string {
	const firstName = extractPatientFirstName(candidate.fullName);
	const doctor = candidate.attendingDoctorName || "Ваш лечащий врач";
	const bookingUrl = `https://dente.clinic/booking?pat=${candidate.patientId}&recall=${candidate.category}`;

	if (channel === "sms") {
		switch (candidate.category) {
			case "implants":
				return `${firstName}, подошел срок годового осмотра имплантов в ${clinicName}. Врач: ${doctor}. Запись: ${bookingUrl}`;
			case "orthodontics":
				return `${firstName}, подошел срок проверки ретейнеров у ортодонта в ${clinicName}. Запись: ${bookingUrl}`;
			case "endodontics":
				return `${firstName}, приглашаем на контрольный снимок и осмотр в ${clinicName}. Запись: ${bookingUrl}`;
			case "hygiene":
			default:
				return `${firstName}, прошло 6 мес с осмотра в ${clinicName}. Пора на профгигиену для сохранения гарантии: ${bookingUrl}`;
		}
	}

	if (channel === "telegram") {
		switch (candidate.category) {
			case "implants":
				return (
					`Здравствуйте, ${firstName}!\n\n` +
					`Стоматологическая клиника «${clinicName}» заботится о Вашей улыбке.\n` +
					`Прошел год с момента установки имплантатов. Доктор ${doctor} приглашает Вас на плановый рентген-контроль и гарантийный осмотр.\n\n` +
					`Записаться в 1 клик:\n${bookingUrl}\n\n` +
					`Или просто напишите нам ответное сообщение!`
				);
			case "orthodontics":
				return (
					`Добрый день, ${firstName}!\n\n` +
					`Клиника «${clinicName}». Ваш ортодонт ${doctor} ждет Вас на плановый контроль ретейнеров и капп.\n` +
					`Это необходимо для сохранения ровного положения зубов.\n\n` +
					`Выбрать удобное время:\n${bookingUrl}`
				);
			case "endodontics":
				return (
					`Здравствуйте, ${firstName}!\n\n` +
					`Стоматология «${clinicName}». Подошел срок контрольного осмотра после эндодонтического лечения у доктора ${doctor}.\n\n` +
					`Онлайн-запись:\n${bookingUrl}`
				);
			case "hygiene":
			default:
				return (
					`Здравствуйте, ${firstName}!\n\n` +
					`Прошло 6 месяцев с Вашего последнего визита в «${clinicName}».\n` +
					`Доктор ${doctor} рекомендует пройти плановый осмотр и гигиену Air-Flow для сохранения гарантий и здоровья зубов.\n\n` +
					`Онлайн-запись без звонков:\n${bookingUrl}\n\n` +
					`Будем рады видеть Вас!`
				);
		}
	}

	switch (candidate.category) {
		case "implants":
			return (
				`Здравствуйте, ${firstName}!\n\n` +
				`Стоматология «${clinicName}» беспокоится о здоровье Ваших зубов.\n` +
				`Прошел 1 год с момента установки коронок на имплантатах. Доктор ${doctor} ждет Вас на контрольный рентген-осмотр и специализированную гигиену для сохранения гарантии.\n\n` +
				`Запись к доктору в 1 клик:\n${bookingUrl}\n\n` +
				`Или ответьте на это сообщение, и администратор подберет слот!`
			);
		case "orthodontics":
			return (
				`Здравствуйте, ${firstName}!\n\n` +
				`Клиника «${clinicName}». Ваш ортодонт ${doctor} приглашает на плановый контроль ретейнеров и капп.\n` +
				`Регулярный чекап гарантирует стабильность ровной дуги зубов.\n\n` +
				`Записаться онлайн:\n${bookingUrl}`
			);
		case "endodontics":
			return (
				`Добрый день, ${firstName}!\n\n` +
				`Стоматология «${clinicName}». Напоминаем о плановом контрольном снимке зуба после лечения у доктора ${doctor}.\n\n` +
				`Выбрать время:\n${bookingUrl}`
			);
		case "hygiene":
		default:
			return (
				`Здравствуйте, ${firstName}!\n\n` +
				`Клиника «${clinicName}». Напоминаем, что прошло 6 месяцев с последней профгигиены Air-Flow у доктора ${doctor}.\n\n` +
				`Регулярная гигиена сохраняет гарантию на лечение и защищает десны.\n\n` +
				`Записаться онлайн в 1 клик:\n${bookingUrl}`
			);
	}
}
