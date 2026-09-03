/**
 * Patient Recall Manager HUD & Workplace (DOMAIN: RECALL)
 *
 * Рабочее место администратора по возврату пациентов и диспансерному учету.
 * Включает:
 * 1. Компактный канбан / реестр пациентов, требующих вызова (фильтры: Все, Гигиена 6 мес, Импланты 1 год, Ортодонтия, Эндодонтия).
 * 2. Интерактивный генератор сообщения: предпросмотр текста в WhatsApp / Telegram / SMS.
 * 3. Быстрые кнопки: [Отправить в WhatsApp] / [Отправить в Telegram] / [Позвонить] с фиксацией даты контакта и автоматическим переводом в статус CONTACTED.
 * 4. Автоматический переход в статус BOOKED при записи пациента в расписание.
 * 5. Стилизован в patientRecall.css на токенах DENTE, плотный десктопный UI (высота кнопок тулбара 32–36px).
 */

import type React from "react";
import { useId, useMemo, useState } from "react";
import {
	AlertTriangle,
	Calendar,
	CheckCircle2,
	Clock,
	Copy,
	ExternalLink,
	Flame,
	Kanban,
	Layers,
	List,
	MessageCircle,
	MessageSquare,
	MoreHorizontal,
	Phone,
	PhoneCall,
	RotateCcw,
	Search,
	Send,
	ShieldCheck,
	Sparkles,
	User,
	X,
} from "lucide-react";
import "./patientRecall.css";

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
 * Базовый клинический демонстрационный пул пациентов для возврата и диспансеризации.
 */
export const DEFAULT_RECALL_CANDIDATES: readonly PatientRecallItem[] = [
	{
		id: "rec-101",
		patientId: "pat-101",
		fullName: "Смирнов Алексей Викторович",
		phone: "+7 (916) 450-12-34",
		email: "smirnov.av@example.com",
		category: "hygiene",
		categoryLabel: "Гигиена 6 мес.",
		lastVisitDate: "2026-02-15",
		dueDate: "2026-08-15",
		daysOverdue: 14,
		urgency: "due_now",
		attendingDoctorId: "doc-1",
		attendingDoctorName: "Д-р Кузнецова Е.В.",
		lastProcedures: ["Комплексная профгигиена Air-Flow", "Фторирование эмали"],
		clinicalNotes: "Высокий кариесогенный риск (КПУ 14). Плановый осмотр и реминерализующая терапия.",
		status: "pending",
	},
	{
		id: "rec-102",
		patientId: "pat-102",
		fullName: "Волкова Мария Сергеевна",
		phone: "+7 (925) 780-99-11",
		email: "volkova.m@example.com",
		category: "endodontics",
		categoryLabel: "Эндодонтия / Кариес",
		lastVisitDate: "2026-05-10",
		dueDate: "2026-08-10",
		daysOverdue: 19,
		urgency: "due_now",
		attendingDoctorId: "doc-2",
		attendingDoctorName: "Д-р Смирнов А.П.",
		lastProcedures: ["Обтурация каналов зуба 1.6 гуттаперчей GuttaCore"],
		clinicalNotes: "Контроль периапикальных тканей зуба 1.6 через 3 месяца после сложной эндодонтии.",
		status: "pending",
	},
	{
		id: "rec-103",
		patientId: "pat-103",
		fullName: "Иванов Дмитрий Павлович",
		phone: "+7 (903) 111-22-33",
		email: "ivanov.dp@example.com",
		category: "implants",
		categoryLabel: "Импланты 1 год",
		lastVisitDate: "2025-08-20",
		dueDate: "2026-08-20",
		daysOverdue: 9,
		urgency: "due_now",
		attendingDoctorId: "doc-3",
		attendingDoctorName: "Д-р Васильев П.Н.",
		implantsCount: 2,
		lastProcedures: ["Установка коронок из диоксида циркония на имплантатах 3.6, 4.6"],
		clinicalNotes: "Годичный гарантийный чекап: рентген-контроль остеоинтеграции, очистка абатментов.",
		status: "contacted",
		lastContactedAt: "2026-08-26T11:00:00Z",
		lastContactChannel: "whatsapp",
	},
	{
		id: "rec-104",
		patientId: "pat-104",
		fullName: "Петрова Анна Владимировна",
		phone: "+7 (985) 321-65-40",
		email: "petrova.anna@example.com",
		category: "orthodontics",
		categoryLabel: "Ортодонтия",
		lastVisitDate: "2026-05-25",
		dueDate: "2026-08-25",
		daysOverdue: 4,
		urgency: "due_now",
		attendingDoctorId: "doc-4",
		attendingDoctorName: "Д-р Соколова Н.А.",
		lastProcedures: ["Фиксация проволочного ретейнера 1.3-2.3, 3.3-4.3"],
		clinicalNotes: "Контроль фиксации ретейнера и прилегания ночной каппы.",
		status: "scheduled",
		scheduledAppointmentDate: "2026-08-30T14:30:00Z",
	},
	{
		id: "rec-105",
		patientId: "pat-105",
		fullName: "Федоров Сергей Николаевич",
		phone: "+7 (977) 555-44-33",
		email: "fedorov.sn@example.com",
		category: "hygiene",
		categoryLabel: "Гигиена 6 мес.",
		lastVisitDate: "2025-11-12",
		dueDate: "2026-05-12",
		daysOverdue: 109,
		urgency: "overdue_90",
		attendingDoctorId: "doc-1",
		attendingDoctorName: "Д-р Кузнецова Е.В.",
		lastProcedures: ["Профгигиена"],
		clinicalNotes: "Критическая просрочка вызова (>90 дней). Риск снятия с гарантии на реставрации.",
		status: "pending",
	},
	{
		id: "rec-106",
		patientId: "pat-106",
		fullName: "Григорьева Елена Викторовна",
		phone: "+7 (905) 777-66-55",
		email: "grigorieva.e@example.com",
		category: "hygiene",
		categoryLabel: "Гигиена 6 мес.",
		lastVisitDate: "2026-03-01",
		dueDate: "2026-09-01",
		daysOverdue: -3,
		urgency: "upcoming",
		attendingDoctorId: "doc-2",
		attendingDoctorName: "Д-р Смирнов А.П.",
		lastProcedures: ["Профгигиена"],
		status: "pending",
	},
	{
		id: "rec-107",
		patientId: "pat-107",
		fullName: "Морозов Константин Игоревич",
		phone: "+7 (916) 333-22-11",
		email: "morozov.k@example.com",
		category: "implants",
		categoryLabel: "Импланты 1 год",
		lastVisitDate: "2025-07-15",
		dueDate: "2026-07-15",
		daysOverdue: 45,
		urgency: "overdue_30",
		attendingDoctorId: "doc-3",
		attendingDoctorName: "Д-р Васильев П.Н.",
		implantsCount: 4,
		lastProcedures: ["All-on-4 протезирование"],
		clinicalNotes: "Просрочен годовой осмотр All-on-4. Требуется рентген-контроль и замена винтов.",
		status: "pending",
	},
];

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
		// Компактный формат SMS без лишних эмодзи
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
					`🦷 Записаться в 1 клик:\n${bookingUrl}\n\n` +
					`Или просто напишите нам ответное сообщение!`
				);
			case "orthodontics":
				return (
					`Добрый день, ${firstName}!\n\n` +
					`Клиника «${clinicName}». Ваш ортодонт ${doctor} ждет Вас на плановый контроль ретейнеров и капп.\n` +
					`Это необходимо для сохранения ровного положения зубов.\n\n` +
					`✨ Выбрать удобное время:\n${bookingUrl}`
				);
			case "endodontics":
				return (
					`Здравствуйте, ${firstName}!\n\n` +
					`Стоматология «${clinicName}». Подошел срок контрольного осмотра после эндодонтического лечения у доктора ${doctor}.\n\n` +
					`📅 Онлайн-запись:\n${bookingUrl}`
				);
			case "hygiene":
			default:
				return (
					`Здравствуйте, ${firstName}!\n\n` +
					`Прошло 6 месяцев с Вашего последнего визита в «${clinicName}».\n` +
					`Доктор ${doctor} рекомендует пройти плановый осмотр и гигиену Air-Flow для сохранения гарантий и здоровья зубов.\n\n` +
					`✨ Онлайн-запись без звонков:\n${bookingUrl}\n\n` +
					`Будем рады видеть Вас!`
				);
		}
	}

	// По умолчанию: WhatsApp
	switch (candidate.category) {
		case "implants":
			return (
				`Здравствуйте, ${firstName}! 👋\n\n` +
				`Стоматология «${clinicName}» беспокоится о здоровье Ваших зубов.\n` +
				`Прошел 1 год с момента установки коронок на имплантатах. Доктор ${doctor} ждет Вас на контрольный рентген-осмотр и специализированную гигиену для сохранения гарантии.\n\n` +
				`🦷 Запись к доктору в 1 клик:\n${bookingUrl}\n\n` +
				`Или ответьте на это сообщение, и администратор подберет слот!`
			);
		case "orthodontics":
			return (
				`Здравствуйте, ${firstName}! ✨\n\n` +
				`Клиника «${clinicName}». Ваш ортодонт ${doctor} приглашает на плановый контроль ретейнеров и капп.\n` +
				`Регулярный чекап гарантирует стабильность ровной дуги зубов.\n\n` +
				`📅 Записаться онлайн:\n${bookingUrl}`
			);
		case "endodontics":
			return (
				`Добрый день, ${firstName}! 🌿\n\n` +
				`Стоматология «${clinicName}». Напоминаем о плановом контрольном снимке зуба после лечения у доктора ${doctor}.\n\n` +
				`📅 Выбрать время:\n${bookingUrl}`
			);
		case "hygiene":
		default:
			return (
				`Здравствуйте, ${firstName}! 👋\n\n` +
				`Прошло 6 месяцев с Вашего последнего визита в клинику «${clinicName}».\n` +
				`Доктор ${doctor} рекомендует пройти плановый профилактический осмотр и гигиену Air-Flow для сохранения здоровья зубов и гарантии.\n\n` +
				`✨ Записаться онлайн без звонков:\n${bookingUrl}\n\n` +
				`Будем рады видеть Вас!`
			);
	}
}

/**
 * Скрипты обзвона администратора с разбором возражений.
 */
const CALLING_SCRIPTS_CATALOG = {
	greeting: "«Добрый день, {{NAME}}! Меня зовут [Имя], клиника «{{CLINIC}}». Звоню по поручению Вашего доктора {{DOCTOR}}.»",
	rationale: "«У Вас подошел плановый срок осмотра и профгигиены (прошло 6 месяцев). Это занимает 40 минут и продлевает гарантию на все работы.»",
	callToAction: "«Вам удобнее подойти в первой половине дня или после работы? Могу предложить четверг 11:00 или субботу 14:30.»",
	objections: [
		{
			id: "no_pain",
			title: "«Ничего не болит»",
			patientSays: "«Спасибо, но меня сейчас ничего не беспокоит, зубы не болят.»",
			answer: "«Это замечательно, что ничего не болит! Цель профилактики — как раз не допустить боли. Скрытый кариес и зубной камень под десной начинаются незаметно, и когда появляется боль, лечение обходится в 4-5 раз дороже.»",
			tip: "Похвалить пациента за отсутствие жалоб, перевести фокус на экономию бюджета и спокойствие.",
		},
		{
			id: "expensive",
			title: "«Дорого / нет денег»",
			patientSays: "«Сейчас не до этого по финансам, дороговато.»",
			answer: "«Прекрасно понимаю Вас. Именно поэтому доктор рекомендует гигиену: регулярная чистка предотвращает разрушение зубов и защищает от трат на пульпиты и коронки. Кроме того, для наших постоянных пациентов действует фиксация цены.»",
			tip: "Показать математическую выгоду профилактики по сравнению со срочным лечением.",
		},
		{
			id: "no_time",
			title: "«Нет времени / занят»",
			patientSays: "«У меня сейчас аврал на работе, совсем нет времени.»",
			answer: "«Понимаю плотный график! Процедура длится всего 40 минут. Мы можем подобрать раннее утро перед работой (в 8:30) или субботу. В какой день недели Вам комфортнее?»",
			tip: "Предложить выбор из двух конкретных вариантов (выбор без выбора).",
		},
		{
			id: "other_clinic",
			title: "«В другой клинике»",
			patientSays: "«Я сейчас хожу в другую клинику / переехал.»",
			answer: "«Поняла Вас, спасибо за обратную связь! Если Вам понадобятся Ваши снимки КТ или выписка из карты, мы с радостью отправим их на Вашу электронную почту. Крепкого Вам здоровья!»",
			tip: "Оставить теплое профессиональное впечатление без навязчивости.",
		},
	],
};

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
	const searchId = useId();

	const [candidates, setCandidates] = useState<readonly PatientRecallItem[]>(
		initialCandidates && initialCandidates.length > 0
			? initialCandidates
			: DEFAULT_RECALL_CANDIDATES,
	);

	const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
	const [selectedCategory, setSelectedCategory] = useState<RecallCategoryFilter>("all");
	const [searchQuery, setSearchQuery] = useState<string>("");

	// Side drawer states: 'generator' | 'script' | null
	const [activeDrawer, setActiveDrawer] = useState<"generator" | "script" | null>(null);
	const [activeCandidate, setActiveCandidate] = useState<PatientRecallItem | null>(null);
	const [activeChannel, setActiveChannel] = useState<RecallChannelType>("whatsapp");
	const [editableMessage, setEditableMessage] = useState<string>("");
	const [activeObjectionId, setActiveObjectionId] = useState<string>("no_pain");
	const [copiedNotice, setCopiedNotice] = useState(false);
	const [toastNotice, setToastNotice] = useState<string | null>(null);
	const [openMenuCardId, setOpenMenuCardId] = useState<string | null>(null);

	// Метрики пула
	const metrics = useMemo(() => {
		const total = candidates.length;
		const dueNow = candidates.filter((c) => c.urgency === "due_now").length;
		const overdue90 = candidates.filter((c) => c.urgency === "overdue_90").length;
		const scheduled = candidates.filter((c) => c.status === "scheduled").length;
		const completed = candidates.filter((c) => c.status === "completed").length;
		const conversion = total > 0 ? Math.round(((scheduled + completed) / total) * 100) : 0;
		const lostRevenueRub = overdue90 * 6500;

		return {
			total,
			dueNow,
			overdue90,
			scheduled,
			completed,
			conversion,
			lostRevenueRub,
		};
	}, [candidates]);

	// Фильтрация кандидатов
	const filteredCandidates = useMemo(() => {
		const rawQuery = searchQuery.trim().toLowerCase();
		const digitsQuery = rawQuery.replace(/\D/g, "");

		return candidates.filter((item) => {
			// Категория
			if (selectedCategory !== "all") {
				if (selectedCategory === "hygiene_6m" && item.category !== "hygiene") return false;
				if (selectedCategory === "implants_1y" && item.category !== "implants") return false;
				if (selectedCategory === "orthodontics" && item.category !== "orthodontics") return false;
				if (selectedCategory === "endodontics" && item.category !== "endodontics") return false;
			}

			// Поиск
			if (rawQuery) {
				const nameMatch = item.fullName.toLowerCase().includes(rawQuery);
				const doctorMatch = item.attendingDoctorName?.toLowerCase().includes(rawQuery);
				const phoneDigits = item.phone ? item.phone.replace(/\D/g, "") : "";
				const phoneMatch = digitsQuery.length > 0 && phoneDigits.includes(digitsQuery);

				if (!nameMatch && !doctorMatch && !phoneMatch) {
					return false;
				}
			}

			return true;
		});
	}, [candidates, selectedCategory, searchQuery]);

	// Обновление статуса кандидата
	const handleStatusUpdate = (
		candidateId: string,
		newStatus: RecallContactStatus,
		channel?: RecallChannelType,
	) => {
		setCandidates((prev) =>
			prev.map((item) => {
				if (item.id !== candidateId) return item;
				return {
					...item,
					status: newStatus,
					lastContactedAt:
						newStatus === "contacted"
							? new Date().toISOString()
							: item.lastContactedAt,
					lastContactChannel: channel !== undefined ? channel : item.lastContactChannel,
				};
			}),
		);

		if (onStatusChange) {
			void onStatusChange(candidateId, newStatus);
		}
	};

	// 1. Действие: Отправить в WhatsApp
	const handleSendWhatsApp = async (candidate: PatientRecallItem) => {
		const message =
			activeCandidate?.id === candidate.id && editableMessage
				? editableMessage
				: buildRecallMessageContent(candidate, "whatsapp", clinicName);

		if (onSendWhatsApp) {
			await onSendWhatsApp(candidate, message);
		} else {
			const cleanPhone = cleanPhoneDigits(candidate.phone);
			const url = cleanPhone
				? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
				: `https://wa.me/?text=${encodeURIComponent(message)}`;
			window.open(url, "_blank", "noopener,noreferrer");
		}

		handleStatusUpdate(candidate.id, "contacted", "whatsapp");
		setToastNotice(`Сообщение в WhatsApp отправлено для ${candidate.fullName}. Статус: СВЯЗАЛИСЬ (CONTACTED).`);
		setTimeout(() => setToastNotice(null), 3500);
	};

	// 2. Действие: Отправить в Telegram
	const handleSendTelegram = async (candidate: PatientRecallItem) => {
		const message =
			activeCandidate?.id === candidate.id && editableMessage
				? editableMessage
				: buildRecallMessageContent(candidate, "telegram", clinicName);

		if (onSendTelegram) {
			await onSendTelegram(candidate, message);
		} else {
			const cleanPhone = cleanPhoneDigits(candidate.phone);
			const url = cleanPhone
				? `https://t.me/+${cleanPhone}?text=${encodeURIComponent(message)}`
				: `https://t.me/share/url?url=&text=${encodeURIComponent(message)}`;
			window.open(url, "_blank", "noopener,noreferrer");
		}

		handleStatusUpdate(candidate.id, "contacted", "telegram");
		setToastNotice(`Сообщение в Telegram отправлено для ${candidate.fullName}. Статус: СВЯЗАЛИСЬ (CONTACTED).`);
		setTimeout(() => setToastNotice(null), 3500);
	};

	// 3. Действие: Позвонить (с фиксацией даты контакта и переходом в CONTACTED)
	const handleCallPhone = async (candidate: PatientRecallItem) => {
		if (onCallPhone) {
			await onCallPhone(candidate);
		} else if (candidate.phone) {
			window.open(`tel:${candidate.phone.replace(/\s+/g, "")}`);
		}

		handleStatusUpdate(candidate.id, "contacted", "phone");
		setActiveCandidate(candidate);
		setActiveDrawer("script");
		setToastNotice(`Звонок для ${candidate.fullName} инициирован. Открыт речевой скрипт. Статус: СВЯЗАЛИСЬ.`);
		setTimeout(() => setToastNotice(null), 3500);
	};

	// 4. Действие: Записать в расписание (автоматический переход в BOOKED)
	const handleBookAppointment = (candidate: PatientRecallItem) => {
		handleStatusUpdate(candidate.id, "scheduled");
		if (onBookAppointment) {
			onBookAppointment(candidate);
		}
		setToastNotice(`Пациент ${candidate.fullName} успешно записан в расписание! Статус: ЗАПИСАН (BOOKED).`);
		setTimeout(() => setToastNotice(null), 3500);
	};

	// Открытие интерактивного генератора сообщения
	const handleOpenGenerator = (candidate: PatientRecallItem, channel: RecallChannelType = "whatsapp") => {
		setActiveCandidate(candidate);
		setActiveChannel(channel);
		setEditableMessage(buildRecallMessageContent(candidate, channel, clinicName));
		setActiveDrawer("generator");
	};

	// Переключение канала в генераторе
	const handleChannelSwitch = (channel: RecallChannelType) => {
		setActiveChannel(channel);
		if (activeCandidate) {
			setEditableMessage(buildRecallMessageContent(activeCandidate, channel, clinicName));
		}
	};

	// Копирование текста в буфер
	const handleCopyText = () => {
		if (editableMessage) {
			navigator.clipboard.writeText(editableMessage).catch(() => {});
			setCopiedNotice(true);
			setTimeout(() => setCopiedNotice(false), 2000);
		}
	};

	if (!isOpen) return null;

	const activeObjection =
		CALLING_SCRIPTS_CATALOG.objections.find((o) => o.id === activeObjectionId) ||
		CALLING_SCRIPTS_CATALOG.objections[0]!;

	return (
		<div
			className="patient-recall-modal-backdrop"
			role="dialog"
			aria-modal="true"
			aria-labelledby="patient-recall-modal-title"
		>
			<div className="patient-recall-container" data-testid="patient-recall-manager-modal">
				{/* Top Header */}
				<header className="pr-header">
					<div className="pr-header-main">
						<div className="pr-header-left">
							<div className="pr-header-icon" aria-hidden="true">
								<ShieldCheck size={20} />
							</div>
							<div className="pr-header-text">
								<h2 id="patient-recall-modal-title" className="pr-header-title">
									<span>Реколл-менеджер & Возврат пациентов</span>
									<span className="pr-header-badge">DENTE RECALL HUD</span>
								</h2>
								<p className="pr-header-subtitle">
									Диспансерный учет, омниканальные сообщения в 1 клик, скрипты звонка и контроль конверсии
								</p>
							</div>
						</div>

						<div className="pr-header-actions">
							{/* View Mode Toggle */}
							<div className="pr-view-toggle" role="radiogroup" aria-label="Вид отображения">
								<button
									type="button"
									className={`pr-view-btn ${viewMode === "table" ? "active" : ""}`}
									onClick={() => setViewMode("table")}
									data-testid="pr-view-table-btn"
								>
									<List size={14} />
									<span>Реестр</span>
								</button>
								<button
									type="button"
									className={`pr-view-btn ${viewMode === "kanban" ? "active" : ""}`}
									onClick={() => setViewMode("kanban")}
									data-testid="pr-view-kanban-btn"
								>
									<Kanban size={14} />
									<span>Канбан</span>
								</button>
							</div>

							{onClose && (
								<button
									type="button"
									className="pr-close-btn"
									onClick={onClose}
									aria-label="Закрыть окно"
									data-testid="pr-close-modal-btn"
								>
									<X size={18} />
								</button>
							)}
						</div>
					</div>
				</header>

				{/* Metrics Summary Strip */}
				<section className="pr-metrics-bar" aria-label="Метрики диспансеризации">
					<div className="pr-metric-card pr-metric-card--primary">
						<span className="pr-metric-label">Всего в пуле</span>
						<div className="pr-metric-value-row">
							<span className="pr-metric-val">{metrics.total}</span>
							<span className="pr-metric-hint">пациентов</span>
						</div>
					</div>

					<div className="pr-metric-card pr-metric-card--warning">
						<span className="pr-metric-label">Срочные (0–30 дн)</span>
						<div className="pr-metric-value-row">
							<span className="pr-metric-val">{metrics.dueNow}</span>
							<span className="pr-metric-hint">пора звать</span>
						</div>
					</div>

					<div className="pr-metric-card pr-metric-card--danger">
						<span className="pr-metric-label">Риск оттока (&gt;90 дн)</span>
						<div className="pr-metric-value-row">
							<span className="pr-metric-val">{metrics.overdue90}</span>
							<span className="pr-metric-hint">критично</span>
						</div>
					</div>

					<div className="pr-metric-card pr-metric-card--success">
						<span className="pr-metric-label">Конверсия в запись</span>
						<div className="pr-metric-value-row">
							<span className="pr-metric-val">{metrics.conversion}%</span>
							<span className="pr-metric-hint">{metrics.scheduled + metrics.completed} визитов</span>
						</div>
					</div>

					<div className="pr-metric-card">
						<span className="pr-metric-label">Упущенная выручка</span>
						<div className="pr-metric-value-row">
							<span className="pr-metric-val">{metrics.lostRevenueRub.toLocaleString("ru-RU")} ₽</span>
							<span className="pr-metric-hint">риск потерь</span>
						</div>
					</div>
				</section>

				{/* Desktop Toolbar: Filters & Fast Search (32-36px height) */}
				<div className="pr-toolbar">
					<div className="pr-filters-group" role="tablist" aria-label="Клинические фильтры">
						<button
							type="button"
							className={`pr-filter-pill ${selectedCategory === "all" ? "active" : ""}`}
							onClick={() => setSelectedCategory("all")}
							data-testid="filter-all-btn"
						>
							<span>Все категории</span>
							<span className="pr-filter-pill-count">{candidates.length}</span>
						</button>

						<button
							type="button"
							className={`pr-filter-pill ${selectedCategory === "hygiene_6m" ? "active" : ""}`}
							onClick={() => setSelectedCategory("hygiene_6m")}
							data-testid="filter-hygiene-btn"
						>
							<Sparkles size={13} />
							<span>Гигиена 6 мес</span>
							<span className="pr-filter-pill-count">
								{candidates.filter((c) => c.category === "hygiene").length}
							</span>
						</button>

						<button
							type="button"
							className={`pr-filter-pill ${selectedCategory === "implants_1y" ? "active" : ""}`}
							onClick={() => setSelectedCategory("implants_1y")}
							data-testid="filter-implants-btn"
						>
							<Layers size={13} />
							<span>Импланты 1 год</span>
							<span className="pr-filter-pill-count">
								{candidates.filter((c) => c.category === "implants").length}
							</span>
						</button>

						<button
							type="button"
							className={`pr-filter-pill ${selectedCategory === "orthodontics" ? "active" : ""}`}
							onClick={() => setSelectedCategory("orthodontics")}
							data-testid="filter-ortho-btn"
						>
							<RotateCcw size={13} />
							<span>Ортодонтия</span>
							<span className="pr-filter-pill-count">
								{candidates.filter((c) => c.category === "orthodontics").length}
							</span>
						</button>

						<button
							type="button"
							className={`pr-filter-pill ${selectedCategory === "endodontics" ? "active" : ""}`}
							onClick={() => setSelectedCategory("endodontics")}
							data-testid="filter-endo-btn"
						>
							<Flame size={13} />
							<span>Эндодонтия</span>
							<span className="pr-filter-pill-count">
								{candidates.filter((c) => c.category === "endodontics").length}
							</span>
						</button>
					</div>

					<div className="pr-search-box">
						<Search size={14} className="pr-search-icon" aria-hidden="true" />
						<label htmlFor={searchId} className="sr-only">
							Поиск по ФИО, телефону или врачу
						</label>
						<input
							id={searchId}
							type="search"
							className="pr-search-input"
							placeholder="Поиск по пациенту, врачу, тел..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							data-testid="pr-search-input"
						/>
					</div>
				</div>

				{/* Notice Banner */}
				{toastNotice && (
					<div className="pr-notice-strip" data-testid="pr-toast-notice">
						<CheckCircle2 size={14} />
						<span>{toastNotice}</span>
					</div>
				)}

				{/* Main Body */}
				<div className="pr-body">
					{/* Main Pane: Table or Kanban */}
					<div className="pr-main-pane">
						{filteredCandidates.length === 0 ? (
							<div className="pr-empty-state">
								<div style={{ fontSize: "2rem" }}>🎉</div>
								<h3>Нет пациентов по выбранному фильтру</h3>
								<p>Все пациенты обработаны или срок профилактического осмотра еще не наступил.</p>
							</div>
						) : viewMode === "table" ? (
							/* Table View */
							<>
								<div className="pr-table-container pr-desktop-table-only">
									<table className="pr-table">
										<thead>
											<tr>
												<th scope="col">Пациент / Телефон</th>
												<th scope="col">Категория</th>
												<th scope="col">Визит / Срок</th>
												<th scope="col">Срочность</th>
												<th scope="col">Врач</th>
												<th scope="col">Статус</th>
												<th scope="col">1-Click Действия</th>
											</tr>
										</thead>
										<tbody>
											{filteredCandidates.map((candidate) => {
												return (
													<tr key={candidate.id} data-testid={`pr-row-${candidate.id}`}>
														<td>
															<div>
																<div className="pr-patient-title">{candidate.fullName}</div>
																<div className="pr-patient-meta">
																	<span>{candidate.phone || "тел. не указан"}</span>
																</div>
															</div>
														</td>

														<td>
															<span className="pr-cycle-tag" title={candidate.clinicalNotes}>
																{candidate.categoryLabel}
															</span>
														</td>

														<td>
															<div style={{ fontSize: "0.75rem" }}>
																<div>Был: {candidate.lastVisitDate}</div>
																<div style={{ color: "var(--pr-muted)" }}>План: {candidate.dueDate}</div>
															</div>
														</td>

														<td>
															<span className={`pr-urgency-badge pr-urgency-badge--${candidate.urgency}`}>
																{candidate.urgency === "due_now" && "Пора звать"}
																{candidate.urgency === "overdue_30" && `+${candidate.daysOverdue} дн.`}
																{candidate.urgency === "overdue_90" && `+${candidate.daysOverdue} дн. (риск)`}
																{candidate.urgency === "upcoming" && `через ${Math.abs(candidate.daysOverdue)} дн.`}
																{candidate.urgency === "completed" && "Завершено"}
															</span>
														</td>

														<td>
															<span style={{ fontSize: "0.75rem", color: "var(--pr-ink)" }}>
																{candidate.attendingDoctorName || "—"}
															</span>
														</td>

														<td>
															<select
																className="pr-status-select"
																value={candidate.status}
																onChange={(e) =>
																	handleStatusUpdate(
																		candidate.id,
																		e.target.value as RecallContactStatus,
																	)
																}
																data-testid={`pr-status-select-${candidate.id}`}
															>
																<option value="pending">Ожидает вызова (PENDING)</option>
																<option value="contacted">Связались (CONTACTED)</option>
																<option value="scheduled">Записан (BOOKED)</option>
																<option value="completed">Визит завершен</option>
																<option value="declined">Отказ / Перенос</option>
															</select>
														</td>

														<td>
															<div className="pr-actions-cell">
																{/* WhatsApp */}
																<button
																	type="button"
																	className="pr-btn pr-btn--whatsapp"
																	title="Отправить в WhatsApp и перевести в CONTACTED"
																	disabled={!candidate.phone}
																	onClick={() => void handleSendWhatsApp(candidate)}
																	data-testid={`pr-whatsapp-btn-${candidate.id}`}
																>
																	<MessageCircle size={14} />
																	<span>WhatsApp</span>
																</button>

																{/* Telegram */}
																<button
																	type="button"
																	className="pr-btn pr-btn--telegram"
																	title="Отправить в Telegram и перевести в CONTACTED"
																	disabled={!candidate.phone}
																	onClick={() => void handleSendTelegram(candidate)}
																	data-testid={`pr-telegram-btn-${candidate.id}`}
																>
																	<Send size={14} />
																	<span>Telegram</span>
																</button>

																{/* Позвонить */}
																<button
																	type="button"
																	className="pr-btn pr-btn--call"
																	title="Позвонить, открыть скрипт и перевести в CONTACTED"
																	disabled={!candidate.phone}
																	onClick={() => void handleCallPhone(candidate)}
																	data-testid={`pr-call-btn-${candidate.id}`}
																>
																	<PhoneCall size={14} />
																	<span>Позвонить</span>
																</button>

																{/* Записать (BOOKED) */}
																<button
																	type="button"
																	className="pr-btn pr-btn--book"
																	title="Записать в расписание (перевести в статус BOOKED)"
																	onClick={() => handleBookAppointment(candidate)}
																	data-testid={`pr-book-btn-${candidate.id}`}
																>
																	<Calendar size={14} />
																	<span>Записать</span>
																</button>

																{/* Предпросмотр текста */}
																<button
																	type="button"
																	className="pr-btn pr-btn--preview"
																	title="Открыть предпросмотр сообщения"
																	onClick={() => handleOpenGenerator(candidate, "whatsapp")}
																	data-testid={`pr-preview-btn-${candidate.id}`}
																>
																	<MessageSquare size={14} />
																</button>
															</div>
														</td>
													</tr>
												);
											})}
										</tbody>
									</table>
								</div>

								{/* Mobile Cards View (< 768px touch-friendly) */}
								<div className="pr-mobile-cards-list" data-testid="pr-mobile-cards-list">
									{filteredCandidates.map((candidate) => (
										<div className="pr-mobile-card" key={candidate.id} data-testid={`pr-mobile-card-${candidate.id}`}>
											<div className="pr-mobile-card-top">
												<div>
													<div className="pr-patient-title">{candidate.fullName}</div>
													<div className="pr-patient-meta">
														<a
															href={candidate.phone ? `tel:${candidate.phone.replace(/\s+/g, "")}` : undefined}
															className="pr-phone-link"
														>
															<Phone size={12} />
															<span>{candidate.phone || "тел. не указан"}</span>
														</a>
													</div>
												</div>
												<span className={`pr-urgency-badge pr-urgency-badge--${candidate.urgency}`}>
													{candidate.urgency === "due_now" && "Пора звать"}
													{candidate.urgency === "overdue_30" && `+${candidate.daysOverdue} дн.`}
													{candidate.urgency === "overdue_90" && `+${candidate.daysOverdue} дн. (риск)`}
													{candidate.urgency === "upcoming" && `через ${Math.abs(candidate.daysOverdue)} дн.`}
													{candidate.urgency === "completed" && "Завершено"}
												</span>
											</div>

											<div className="pr-mobile-card-details">
												<div className="pr-mobile-chip-row">
													<span className="pr-cycle-tag">{candidate.categoryLabel}</span>
													<span className="text-[11px] text-[var(--pr-muted)]">
														Врач: <strong className="text-[var(--pr-ink)]">{candidate.attendingDoctorName || "—"}</strong>
													</span>
												</div>
												<div className="pr-mobile-dates-row">
													<span>Был: {candidate.lastVisitDate}</span>
													<span>План: <strong>{candidate.dueDate}</strong></span>
												</div>
											</div>

											<div className="pr-mobile-status-row">
												<label className="text-[11px] text-[var(--pr-muted)] font-bold">Статус:</label>
												<select
													className="pr-status-select flex-1"
													value={candidate.status}
													onChange={(e) =>
														handleStatusUpdate(
															candidate.id,
															e.target.value as RecallContactStatus,
														)
													}
												>
													<option value="pending">Ожидает вызова (PENDING)</option>
													<option value="contacted">Связались (CONTACTED)</option>
													<option value="scheduled">Записан (BOOKED)</option>
													<option value="completed">Визит завершен</option>
													<option value="declined">Отказ / Перенос</option>
												</select>
											</div>

											<div className="pr-mobile-actions-grid">
												<button
													type="button"
													className="pr-btn pr-btn--whatsapp"
													disabled={!candidate.phone}
													onClick={() => void handleSendWhatsApp(candidate)}
												>
													<MessageCircle size={14} />
													<span>WhatsApp</span>
												</button>
												<button
													type="button"
													className="pr-btn pr-btn--telegram"
													disabled={!candidate.phone}
													onClick={() => void handleSendTelegram(candidate)}
												>
													<Send size={14} />
													<span>Telegram</span>
												</button>
												<button
													type="button"
													className="pr-btn pr-btn--call"
													disabled={!candidate.phone}
													onClick={() => void handleCallPhone(candidate)}
												>
													<PhoneCall size={14} />
													<span>Звонок</span>
												</button>
												<button
													type="button"
													className="pr-btn pr-btn--book"
													onClick={() => handleBookAppointment(candidate)}
												>
													<Calendar size={14} />
													<span>Записать</span>
												</button>
											</div>
										</div>
									))}
								</div>
							</>
						) : (
							/* Kanban Board View */
							<div className="pr-kanban-board" data-testid="pr-kanban-board">
								{(
									[
										{ status: "pending", title: "Ожидают вызова", badge: "PENDING" },
										{ status: "contacted", title: "Связались", badge: "CONTACTED" },
										{ status: "scheduled", title: "Записаны", badge: "BOOKED" },
										{ status: "completed", title: "Завершено", badge: "COMPLETED" },
										{ status: "declined", title: "Отказ / Перенос", badge: "DECLINED" },
									] as const
								).map((col) => {
									const colItems = filteredCandidates.filter((c) => c.status === col.status);
									return (
										<div key={col.status} className="pr-kanban-col">
											<div className="pr-kanban-col-header">
												<span className="pr-kanban-col-title">{col.title}</span>
												<span className="pr-kanban-col-badge">{colItems.length}</span>
											</div>

											<div className="pr-kanban-col-body">
												{colItems.map((item) => (
													<div key={item.id} className="pr-kanban-card" data-testid={`kanban-card-${item.id}`}>
														<div className="pr-kanban-card-top">
															<span className="pr-kanban-card-name">{item.fullName}</span>
															<span className={`pr-urgency-badge pr-urgency-badge--${item.urgency}`}>
																{item.urgency === "due_now" && "Срочно"}
																{item.urgency === "overdue_30" && `+${item.daysOverdue}д`}
																{item.urgency === "overdue_90" && `+${item.daysOverdue}д!`}
																{item.urgency === "upcoming" && "Скоро"}
																{item.urgency === "completed" && "✓"}
															</span>
														</div>

														<div className="pr-kanban-card-meta">
															<div>📞 {item.phone || "нет тел."}</div>
															<div>🏷️ {item.categoryLabel}</div>
															<div>👨‍⚕️ {item.attendingDoctorName || "Врач не указан"}</div>
															{item.lastContactedAt && (
																<div style={{ color: "var(--pr-teal)", fontWeight: 600 }}>
																	✉️ Контакт: {new Date(item.lastContactedAt).toLocaleDateString("ru-RU")}
																</div>
															)}
														</div>

														<div className="pr-kanban-card-actions">
															<button
																type="button"
																className="pr-btn pr-btn--book"
																title="Записать в расписание"
																style={{ minHeight: "36px", padding: "0 12px", flex: 1 }}
																onClick={() => handleBookAppointment(item)}
															>
																<Calendar size={14} />
																<span>Запись</span>
															</button>

															<div style={{ position: "relative" }}>
																<button
																	type="button"
																	className="pr-btn pr-btn--secondary"
																	title="Связаться с пациентом"
																	aria-label="Каналы связи и действия"
																	aria-haspopup="menu"
																	aria-expanded={openMenuCardId === item.id}
																	style={{ minHeight: "36px", minWidth: "36px", padding: "0 8px" }}
																	onClick={() =>
																		setOpenMenuCardId((prev) => (prev === item.id ? null : item.id))
																	}
																>
																	<MoreHorizontal size={15} />
																</button>

																{openMenuCardId === item.id && (
																	<div className="pr-card-dropdown-menu" role="menu">
																		<button
																			type="button"
																			role="menuitem"
																			className="pr-dropdown-item"
																			onClick={() => {
																				setOpenMenuCardId(null);
																				void handleSendWhatsApp(item);
																			}}
																		>
																			<MessageCircle size={14} style={{ color: "#25D366" }} />
																			<span>WhatsApp</span>
																		</button>

																		<button
																			type="button"
																			role="menuitem"
																			className="pr-dropdown-item"
																			onClick={() => {
																				setOpenMenuCardId(null);
																				void handleSendTelegram(item);
																			}}
																		>
																			<Send size={14} style={{ color: "#0088cc" }} />
																			<span>Telegram</span>
																		</button>

																		<button
																			type="button"
																			role="menuitem"
																			className="pr-dropdown-item"
																			onClick={() => {
																				setOpenMenuCardId(null);
																				void handleCallPhone(item);
																			}}
																		>
																			<PhoneCall size={14} style={{ color: "var(--pr-teal)" }} />
																			<span>Позвонить</span>
																		</button>
																	</div>
																)}
															</div>
														</div>
													</div>
												))}
											</div>
										</div>
									);
								})}
							</div>
						)}
					</div>

					{/* Side Drawer: Interactive Message Generator OR Calling Script */}
					{activeDrawer && activeCandidate && (
						<aside className="pr-side-drawer" data-testid="pr-side-drawer">
							{/* Drawer Header */}
							<div className="pr-drawer-header">
								<span className="pr-drawer-title">
									{activeDrawer === "generator" ? (
										<>
											<MessageSquare size={16} />
											<span>Генератор сообщения: {activeCandidate.fullName}</span>
										</>
									) : (
										<>
											<Phone size={16} />
											<span>Скрипт звонка: {activeCandidate.fullName}</span>
										</>
									)}
								</span>
								<button
									type="button"
									className="pr-close-btn"
									onClick={() => setActiveDrawer(null)}
									aria-label="Закрыть панель"
									data-testid="pr-close-drawer-btn"
								>
									<X size={16} />
								</button>
							</div>

							{/* Drawer Body */}
							<div className="pr-drawer-body">
								{activeDrawer === "generator" ? (
									<>
										{/* Channel Tabs: WhatsApp / Telegram / SMS */}
										<div className="pr-channel-tabs" role="tablist">
											<button
												type="button"
												className={`pr-channel-btn ${activeChannel === "whatsapp" ? "active" : ""}`}
												onClick={() => handleChannelSwitch("whatsapp")}
												data-testid="pr-channel-wa-btn"
											>
												<MessageCircle size={14} />
												<span>WhatsApp</span>
											</button>
											<button
												type="button"
												className={`pr-channel-btn ${activeChannel === "telegram" ? "active" : ""}`}
												onClick={() => handleChannelSwitch("telegram")}
												data-testid="pr-channel-tg-btn"
											>
												<Send size={14} />
												<span>Telegram</span>
											</button>
											<button
												type="button"
												className={`pr-channel-btn ${activeChannel === "sms" ? "active" : ""}`}
												onClick={() => handleChannelSwitch("sms")}
												data-testid="pr-channel-sms-btn"
											>
												<MessageSquare size={14} />
												<span>SMS</span>
											</button>
										</div>

										{/* Interactive Textarea */}
										<div className="pr-textarea-box">
											<div className="pr-textarea-label-row">
												<span>Текст сообщения (редактируемый):</span>
												<span>{editableMessage.length} симв.</span>
											</div>
											<textarea
												className="pr-textarea"
												value={editableMessage}
												onChange={(e) => setEditableMessage(e.target.value)}
												data-testid="pr-message-textarea"
											/>
										</div>

										{/* Smartphone Mockup Preview */}
										<div className="pr-phone-mockup">
											<div className="pr-phone-header">
												<span>📱 Предпросмотр у пациента ({activeChannel.toUpperCase()}):</span>
												<span>{activeCandidate.phone || "тел."}</span>
											</div>
											<div className={`pr-message-bubble pr-message-bubble--${activeChannel}`}>
												{editableMessage}
											</div>
										</div>

										{/* Drawer Action Buttons */}
										<div className="pr-drawer-actions">
											<div style={{ display: "flex", gap: "8px" }}>
												{activeChannel === "whatsapp" && (
													<button
														type="button"
														className="pr-btn pr-btn--whatsapp"
														style={{ flex: 1, height: "36px" }}
														onClick={() => void handleSendWhatsApp(activeCandidate)}
														data-testid="pr-drawer-send-wa-btn"
													>
														<MessageCircle size={15} />
														<span>Отправить в WhatsApp</span>
													</button>
												)}

												{activeChannel === "telegram" && (
													<button
														type="button"
														className="pr-btn pr-btn--telegram"
														style={{ flex: 1, height: "36px" }}
														onClick={() => void handleSendTelegram(activeCandidate)}
														data-testid="pr-drawer-send-tg-btn"
													>
														<Send size={15} />
														<span>Отправить в Telegram</span>
													</button>
												)}

												{activeChannel === "sms" && (
													<button
														type="button"
														className="pr-btn"
														style={{ flex: 1, height: "36px" }}
														onClick={handleCopyText}
														data-testid="pr-drawer-copy-sms-btn"
													>
														<Copy size={15} />
														<span>{copiedNotice ? "Скопировано в буфер ✓" : "Скопировать SMS"}</span>
													</button>
												)}

												<button
													type="button"
													className="pr-btn"
													style={{ height: "36px" }}
													onClick={handleCopyText}
													title="Скопировать в буфер"
												>
													<Copy size={15} />
												</button>
											</div>

											<button
												type="button"
												className="pr-btn pr-btn--book"
												style={{ height: "36px" }}
												onClick={() => handleBookAppointment(activeCandidate)}
												data-testid="pr-drawer-book-btn"
											>
												<Calendar size={15} />
												<span>Записать пациента в расписание (BOOKED)</span>
											</button>
										</div>
									</>
								) : (
									/* Calling Script & Objections Drawer */
									<div className="pr-script-steps">
										<div className="pr-script-card">
											<span className="pr-script-card-label">1. Приветствие</span>
											<span className="pr-script-card-text">
												{CALLING_SCRIPTS_CATALOG.greeting
													.replace(/\{\{NAME\}\}/g, extractPatientFirstName(activeCandidate.fullName))
													.replace(/\{\{CLINIC\}\}/g, clinicName)
													.replace(/\{\{DOCTOR\}\}/g, activeCandidate.attendingDoctorName || "лечащий врач")}
											</span>
										</div>

										<div className="pr-script-card">
											<span className="pr-script-card-label">2. Клиническая цель</span>
											<span className="pr-script-card-text">
												{CALLING_SCRIPTS_CATALOG.rationale}
											</span>
										</div>

										<div className="pr-script-card">
											<span className="pr-script-card-label">3. Призыв к действию (Выбор слота)</span>
											<span className="pr-script-card-text" style={{ fontWeight: 700, color: "var(--pr-teal)" }}>
												{CALLING_SCRIPTS_CATALOG.callToAction}
											</span>
										</div>

										<div>
											<span style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--pr-ink)" }}>
												Отработка возражений пациента:
											</span>
											<div className="pr-objections-tabs">
												{CALLING_SCRIPTS_CATALOG.objections.map((obj) => (
													<button
														key={obj.id}
														type="button"
														className={`pr-obj-btn ${activeObjectionId === obj.id ? "active" : ""}`}
														onClick={() => setActiveObjectionId(obj.id)}
														data-testid={`obj-tab-${obj.id}`}
													>
														{obj.title}
													</button>
												))}
											</div>

											{activeObjection && (
												<div className="pr-objection-box">
													<div style={{ color: "var(--pr-muted)", fontSize: "0.75rem", marginBottom: "4px" }}>
														<em>Пациент говорит:</em> {activeObjection.patientSays}
													</div>
													<div style={{ fontWeight: 600, color: "var(--pr-ink)", marginBottom: "6px" }}>
														{activeObjection.answer}
													</div>
													<div style={{ fontSize: "0.6875rem", color: "var(--pr-muted)", fontStyle: "italic" }}>
														💡 Совет: {activeObjection.tip}
													</div>
												</div>
											)}
										</div>

										<div className="pr-drawer-actions" style={{ marginTop: "12px" }}>
											<button
												type="button"
												className="pr-btn pr-btn--book"
												style={{ height: "36px" }}
												onClick={() => handleBookAppointment(activeCandidate)}
												data-testid="pr-script-book-btn"
											>
												<Calendar size={15} />
												<span>Записать пациента (BOOKED)</span>
											</button>
										</div>
									</div>
								)}
							</div>
						</aside>
					)}
				</div>
			</div>
		</div>
	);
};

export default PatientRecallManagerModal;
