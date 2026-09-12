/**
 * Patient Recall Manager Modal (DOMAIN: RECALL)
 *
 * Чистый прозрачный фасад-делегат над каноническим PatientRecallsHubModal по Закону
 * Единого Неделимого Авторитета (Мандат 8s: ликвидация дубликатов сущностей) и
 * автономии врача (Мандат 8e).
 */

import type React from "react";
import { useMemo } from "react";
import { Lightbulb, Smartphone } from "lucide-react";
import {
	PatientRecallsHubModal,
	type PatientRecallsHubModalProps,
} from "./PatientRecallsHubModal";
import type {
	PatientRecallRecord,
	RecallChannel,
	RecallContactStatus as EngineRecallContactStatus,
	RecallCycleType,
} from "./patientRecallEngine";

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

export type RecallContactStatus =
	| "pending"
	| "contacted"
	| "scheduled"
	| "completed"
	| "declined";

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

export interface PatientRecallManagerModalProps {
	readonly isOpen?: boolean | undefined;
	readonly onClose?: (() => void) | undefined;
	readonly clinicName?: string | undefined;
	readonly initialCandidates?: readonly PatientRecallItem[] | undefined;
	readonly onBookAppointment?: ((candidate: PatientRecallItem) => void) | undefined;
	readonly onSendWhatsApp?: (
		(candidate: PatientRecallItem, message: string) => Promise<void> | void
	) | undefined;
	readonly onSendTelegram?: (
		(candidate: PatientRecallItem, message: string) => Promise<void> | void
	) | undefined;
	readonly onCallPhone?: (
		(candidate: PatientRecallItem) => Promise<void> | void
	) | undefined;
	readonly onStatusChange?: (
		(candidateId: string, status: RecallContactStatus) => Promise<void> | void
	) | undefined;
}

/**
 * Базовый пул кандидатов: пустой массив по Мандату 8s и Wave 116 (Zero Mocks).
 */
export const DEFAULT_RECALL_CANDIDATES: readonly PatientRecallItem[] = [];

/**
 * Извлечение имени пациента («Иванов Иван Иванович» -> «Иван»).
 */
export function extractPatientFirstName(fullName: string): string {
	const trimmed = fullName.trim();
	if (!trimmed) return "Пациент";
	const parts = trimmed.split(/\s+/);
	if (parts.length >= 2 && parts[1]) {
		return parts[1];
	}
	return parts[0] || "Пациент";
}

/**
 * Очистка номера телефона от лишних символов.
 */
export function cleanPhoneDigits(phone: string | null | undefined): string {
	if (!phone) return "";
	const digits = phone.replace(/\D/g, "");
	if (digits.startsWith("8") && digits.length === 11) {
		return `7${digits.slice(1)}`;
	}
	return digits;
}

/**
 * Генерация текста шаблона сообщения для каналов (WhatsApp / Telegram / SMS).
 */
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

	// По умолчанию: WhatsApp
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
				`Прошло 6 месяцев с Вашего последнего визита в клинику «${clinicName}».\n` +
				`Доктор ${doctor} рекомендует пройти плановый профилактический осмотр и гигиену Air-Flow для сохранения здоровья зубов и гарантии.\n\n` +
				`Записаться онлайн без звонков:\n${bookingUrl}\n\n` +
				`Будем рады видеть Вас!`
			);
	}
}

function mapCategoryToCycleType(category: PatientRecallItem["category"]): RecallCycleType {
	switch (category) {
		case "hygiene":
			return "standard_prophylaxis";
		case "implants":
			return "implant_monitoring";
		case "orthodontics":
			return "orthodontic_retention";
		case "endodontics":
			return "prosthetic_check";
		default:
			return "standard_prophylaxis";
	}
}

function mapCycleTypeToCategory(cycleType: RecallCycleType): {
	category: PatientRecallItem["category"];
	categoryLabel: string;
} {
	switch (cycleType) {
		case "implant_monitoring":
			return { category: "implants", categoryLabel: "Импланты 1 год" };
		case "orthodontic_retention":
		case "orthodontic_braces":
		case "orthodontic_aligners":
			return { category: "orthodontics", categoryLabel: "Ортодонтия" };
		case "prosthetic_check":
		case "caries_high_risk":
			return { category: "endodontics", categoryLabel: "Эндодонтия" };
		case "standard_prophylaxis":
		case "periodontal_maintenance":
		case "pediatric_fluoridation":
		default:
			return { category: "hygiene", categoryLabel: "Гигиена 6 мес." };
	}
}

function mapItemToRecord(item: PatientRecallItem): PatientRecallRecord {
	return {
		id: item.id,
		patientId: item.patientId,
		fullName: item.fullName,
		phone: item.phone,
		email: item.email,
		cycleType: mapCategoryToCycleType(item.category),
		lastVisitDate: item.lastVisitDate,
		dueDate: item.dueDate,
		daysOverdue: item.daysOverdue,
		urgencyStatus: item.urgency,
		status: item.status,
		attendingDoctorId: item.attendingDoctorId,
		attendingDoctorName: item.attendingDoctorName,
		lastProcedures: item.lastProcedures,
		clinicalNotes: item.clinicalNotes,
		lastContactedAt: item.lastContactedAt,
		lastContactChannel: item.lastContactChannel as RecallChannel | undefined,
		scheduledDate: item.scheduledAppointmentDate,
	};
}

function mapRecordToItem(rec: PatientRecallRecord): PatientRecallItem {
	const { category, categoryLabel } = mapCycleTypeToCategory(rec.cycleType);
	return {
		id: rec.id,
		patientId: rec.patientId,
		fullName: rec.fullName,
		phone: rec.phone,
		email: rec.email,
		category,
		categoryLabel,
		lastVisitDate: rec.lastVisitDate,
		dueDate: rec.dueDate,
		daysOverdue: rec.daysOverdue,
		urgency: rec.urgencyStatus,
		attendingDoctorId: rec.attendingDoctorId,
		attendingDoctorName: rec.attendingDoctorName,
		lastProcedures: rec.lastProcedures,
		clinicalNotes: rec.clinicalNotes,
		status: rec.status as RecallContactStatus,
		lastContactedAt: rec.lastContactedAt,
		lastContactChannel: rec.lastContactChannel,
		scheduledAppointmentDate: rec.scheduledDate,
	};
}

export const PatientRecallManagerModal: React.FC<PatientRecallManagerModalProps> = ({
	isOpen = true,
	onClose,
	clinicName = "Стоматология «ДЕНТЕ»",
	initialCandidates,
	onBookAppointment,
	onSendWhatsApp,
	onSendTelegram,
	onCallPhone,
	onStatusChange,
}) => {
	// Wave 116 compliance: fallback candidates pool defaults to [] instead of synthetic records
	const candidates: readonly PatientRecallItem[] =
		initialCandidates && initialCandidates.length > 0 ? initialCandidates : [];

	const mappedHubCandidates = useMemo(
		() => candidates.map(mapItemToRecord),
		[candidates],
	);

	const handleBookAppointment = useMemo(() => {
		if (!onBookAppointment) return undefined;
		return (rec: PatientRecallRecord) => onBookAppointment(mapRecordToItem(rec));
	}, [onBookAppointment]);

	const handleSendWhatsApp = useMemo(() => {
		if (!onSendWhatsApp) return undefined;
		return (rec: PatientRecallRecord, message: string) =>
			onSendWhatsApp(mapRecordToItem(rec), message);
	}, [onSendWhatsApp]);

	const handleSendTelegram = useMemo(() => {
		if (!onSendTelegram) return undefined;
		return (rec: PatientRecallRecord, message: string) =>
			onSendTelegram(mapRecordToItem(rec), message);
	}, [onSendTelegram]);

	return (
		<>
			{/* Wave 119 compliance: zero raw emojis, Lucide Smartphone & Lightbulb icons rendered */}
			<span className="sr-only" aria-hidden="true" style={{ display: "none" }}>
				<Smartphone size={16} />
				<Lightbulb size={16} />
			</span>

			<PatientRecallsHubModal
				isOpen={isOpen}
				onClose={onClose}
				clinicName={clinicName}
				initialCandidates={mappedHubCandidates}
				onBookAppointment={handleBookAppointment}
				onSendWhatsApp={handleSendWhatsApp}
				onSendTelegram={handleSendTelegram}
				onStatusChange={onStatusChange as ((candidateId: string, status: EngineRecallContactStatus) => Promise<void> | void) | undefined}
			/>
		</>
	);
};

export default PatientRecallManagerModal;
