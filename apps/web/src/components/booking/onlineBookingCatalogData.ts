/**
 * onlineBookingCatalogData.ts — Канонический SSOT каталог и движок публичной онлайн-записи DENTE CRM
 * Мандаты: 8b (Sweet Spot 280–350 строк), 8e (Doctor Autonomy), 8n (Solo Practice & No Bureaucracy).
 * Содержит 6 клинических направлений, ростер врачей («Любой доктор»), расчет интервалов 09:00–21:00,
 * телефонную валидацию, 1-Tap Telegram интеграцию и синхронизацию с Fastify /api/public-booking.
 */

import type {
	BookingConfirmationData,
	BookingDoctorData,
	BookingSlotItem,
	ClinicBranch,
	ServiceCategory,
} from "./contracts/bookingContracts";

export const ANY_DOCTOR_ID = "any";

export const DEFAULT_CLINIC_BRANCH: ClinicBranch = {
	id: "branch-central",
	name: "DENTE Central Clinic",
	address: "г. Москва, ул. Стоматологическая, д. 12",
	metro: "м. Белорусская",
	phone: "+7 (495) 230-11-22",
	workHours: "Ежедневно 09:00 – 21:00",
	isMain: true,
};

export const CANONICAL_ONLINE_CATEGORIES: ServiceCategory[] = [
	{
		id: "therapy",
		title: "Терапия и лечение",
		iconName: "Stethoscope",
		description: "Лечение кариеса, пульпита и художественная реставрация зубов",
		popularServices: [
			{ id: "th-1", title: "Лечение кариеса с пломбой светового отверждения", durationMinutes: 60, priceFormatted: "4 500 ₽" },
			{ id: "th-2", title: "Эндодонтическое лечение каналов под микроскопом", durationMinutes: 90, priceFormatted: "8 900 ₽" },
			{ id: "th-3", title: "Эстетическая реставрация переднего зуба", durationMinutes: 60, priceFormatted: "6 200 ₽" },
		],
	},
	{
		id: "hygiene",
		title: "Профгигиена и отбеливание",
		iconName: "Sparkles",
		description: "Комплексная чистка AirFlow, снятие зубного камня, отбеливание",
		popularServices: [
			{ id: "hy-1", title: "Комплексная гигиена AirFlow + ультразвук + полировка", durationMinutes: 60, priceFormatted: "5 500 ₽" },
			{ id: "hy-2", title: "Клиническое отбеливание зубов Zoom 4 / Beyond", durationMinutes: 90, priceFormatted: "19 000 ₽" },
			{ id: "hy-3", title: "Реминерализующая терапия и фторирование эмали", durationMinutes: 30, priceFormatted: "2 200 ₽" },
		],
	},
	{
		id: "surgery",
		title: "Хирургия и имплантация",
		iconName: "Scissors",
		description: "Бережное удаление зубов любой сложности и дентальная имплантация",
		popularServices: [
			{ id: "sg-1", title: "Атравматичное удаление зуба с био-консервацией лунки", durationMinutes: 45, priceFormatted: "3 800 ₽" },
			{ id: "sg-2", title: "Удаление сложного зуба мудрости (ретинированного)", durationMinutes: 60, priceFormatted: "7 500 ₽" },
			{ id: "sg-3", title: "Консультация хирурга-имплантолога + КЛКТ-планирование", durationMinutes: 45, priceFormatted: "1 500 ₽" },
		],
	},
	{
		id: "orthopedics",
		title: "Ортопедия и виниры",
		iconName: "Activity",
		description: "Керамические коронки E-max, цирконий, виниры и протезирование",
		popularServices: [
			{ id: "or-1", title: "Консультация ортопеда со сканированием 3D", durationMinutes: 45, priceFormatted: "2 000 ₽" },
			{ id: "or-2", title: "Керамическая коронка E-max (диоксид циркония)", durationMinutes: 60, priceFormatted: "22 000 ₽" },
			{ id: "or-3", title: "Керамический винир по технологии ультра-точного прилегания", durationMinutes: 60, priceFormatted: "28 000 ₽" },
		],
	},
	{
		id: "orthodontics",
		title: "Ортодонтия и прикус",
		iconName: "Smile",
		description: "Брекет-системы Damon, прозрачные элайнеры, выравнивание зубов",
		popularServices: [
			{ id: "ot-1", title: "Первичная консультация ортодонта с фотометрией", durationMinutes: 45, priceFormatted: "2 500 ₽" },
			{ id: "ot-2", title: "Диагностический 3D сетап для элайнеров", durationMinutes: 60, priceFormatted: "12 000 ₽" },
			{ id: "ot-3", title: "Активация брекет-системы (одна челюсть)", durationMinutes: 30, priceFormatted: "3 500 ₽" },
		],
	},
	{
		id: "pediatric",
		title: "Детский приём",
		iconName: "Smile",
		description: "Адаптационный прием в игровой форме, лечение молочных зубов",
		popularServices: [
			{ id: "pd-1", title: "Адаптационный осмотр ребенка с подарком за храбрость", durationMinutes: 30, priceFormatted: "1 500 ₽" },
			{ id: "pd-2", title: "Лечение кариеса молочного зуба без слез и боли", durationMinutes: 45, priceFormatted: "3 200 ₽" },
			{ id: "pd-3", title: "Герметизация фиссур постоянных моляров", durationMinutes: 30, priceFormatted: "2 100 ₽" },
		],
	},
];

export const ANY_DOCTOR_SPECIALIST: BookingDoctorData = {
	id: ANY_DOCTOR_ID,
	fullName: "Любой свободный доктор",
	specialties: ["Терапия", "Хирургия", "Ортопедия", "Профгигиена", "Ортодонтия", "Детство"],
	experienceYears: 10,
	rating: 5.0,
	reviewsCount: 340,
	categoryIds: ["therapy", "hygiene", "surgery", "orthopedics", "orthodontics", "pediatric"],
	bio: "Подберем врача с ближайшим свободным окном. Идеально для срочного приема или первого знакомства.",
	nextAvailableSlot: "Сегодня в ближайшее окно",
};

export const CANONICAL_ONLINE_DOCTORS: BookingDoctorData[] = [
	ANY_DOCTOR_SPECIALIST,
	{
		id: "doc-smirnova",
		fullName: "Смирнова Елена Викторовна",
		specialties: ["Стоматолог-терапевт", "Эндодонтист"],
		experienceYears: 12,
		rating: 4.96,
		reviewsCount: 142,
		categoryIds: ["therapy", "hygiene"],
		bio: "Специалист по лечению сложных каналов под дентальным микроскопом Carl Zeiss. Деликатный подход.",
		nextAvailableSlot: "Завтра, 11:00",
	},
	{
		id: "doc-ivanov",
		fullName: "Иванов Артем Дмитриевич",
		specialties: ["Хирург-имплантолог", "Челюстно-лицевой хирург"],
		experienceYears: 15,
		rating: 4.98,
		reviewsCount: 189,
		categoryIds: ["surgery"],
		bio: "Установил свыше 4 000 имплантатов. Эксперт атравматичного удаления и немедленной нагрузки.",
		nextAvailableSlot: "Сегодня, 16:30",
	},
	{
		id: "doc-kuznetsov",
		fullName: "Кузнецов Михаил Павлович",
		specialties: ["Стоматолог-ортопед", "Гнатолог"],
		experienceYears: 11,
		rating: 4.93,
		reviewsCount: 115,
		categoryIds: ["orthopedics"],
		bio: "Цифровой протокол тотальной реабилитации улыбки. Микропротезирование и керамические виниры.",
		nextAvailableSlot: "Четверг, 14:00",
	},
	{
		id: "doc-vasilieva",
		fullName: "Васильева Анна Сергеевна",
		specialties: ["Врач-ортодонт"],
		experienceYears: 8,
		rating: 4.95,
		reviewsCount: 97,
		categoryIds: ["orthodontics"],
		bio: "Сертифицированный специалист по элайнерам Spark и брекет-системам Damon. Эстетика улыбки.",
		nextAvailableSlot: "Завтра, 13:00",
	},
	{
		id: "doc-morozova",
		fullName: "Морозова Дарья Игоревна",
		specialties: ["Детский стоматолог"],
		experienceYears: 9,
		rating: 5.0,
		reviewsCount: 164,
		categoryIds: ["pediatric", "therapy"],
		bio: "Находит общий язык с каждым маленьким пациентом. Лечение без стресса и слез.",
		nextAvailableSlot: "Сегодня, 17:00",
	},
];

export function getDoctorsForCategory(categoryId?: string): BookingDoctorData[] {
	if (!categoryId) return CANONICAL_ONLINE_DOCTORS;
	return CANONICAL_ONLINE_DOCTORS.filter(
		(doc) => doc.id === ANY_DOCTOR_ID || doc.categoryIds.includes(categoryId),
	);
}

export function generateDailyTimeSlots(
	_dateIso: string,
	slotDurationMinutes: number = 30,
	occupiedTimes: string[] = [],
): BookingSlotItem[] {
	const slots: BookingSlotItem[] = [];
	const startMinute = 9 * 60; // 09:00
	const endMinute = 21 * 60; // 21:00
	const step = slotDurationMinutes > 0 ? slotDurationMinutes : 30;

	for (let current = startMinute; current + step <= endMinute; current += step) {
		const startHour = Math.floor(current / 60);
		const startMin = current % 60;
		const endH = Math.floor((current + step) / 60);
		const endM = (current + step) % 60;

		const timeStr = `${String(startHour).padStart(2, "0")}:${String(startMin).padStart(2, "0")}`;
		const endsAtStr = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;

		if (occupiedTimes.includes(timeStr)) continue;

		let period: "morning" | "afternoon" | "evening" = "afternoon";
		if (startHour < 12) period = "morning";
		else if (startHour >= 17) period = "evening";

		slots.push({
			time: timeStr,
			startsAt: timeStr,
			endsAt: endsAtStr,
			period,
		});
	}
	return slots;
}

export function formatRuPhoneInput(input: string): string {
	const digits = input.replace(/\D/g, "");
	if (!digits) return "";
	let normalized = digits;
	if (normalized.startsWith("8")) normalized = "7" + normalized.slice(1);
	if (!normalized.startsWith("7")) normalized = "7" + normalized;
	normalized = normalized.slice(0, 11);

	let formatted = "+7";
	if (normalized.length > 1) formatted += " (" + normalized.slice(1, 4);
	if (normalized.length >= 4) formatted += ") " + normalized.slice(4, 7);
	if (normalized.length >= 7) formatted += "-" + normalized.slice(7, 9);
	if (normalized.length >= 9) formatted += "-" + normalized.slice(9, 11);
	return formatted;
}

export function isValidRuPhone(phone: string): boolean {
	const digits = phone.replace(/\D/g, "");
	return digits.length === 11 && (digits.startsWith("7") || digits.startsWith("8"));
}

export interface TelegramWebUser {
	id: number;
	firstName: string;
	lastName?: string;
	username?: string;
	phone?: string;
}

export function detectTelegramUser(): TelegramWebUser | null {
	if (typeof window === "undefined") return null;
	const tg = (window as unknown as { Telegram?: { WebApp?: { initDataUnsafe?: { user?: { id: number; first_name: string; last_name?: string; username?: string } } } } }).Telegram?.WebApp;
	const user = tg?.initDataUnsafe?.user;
	if (!user) return null;
	return {
		id: user.id,
		firstName: user.first_name,
		lastName: user.last_name,
		username: user.username,
	};
}

export function generateBookingReferenceNumber(): string {
	const randomNum = Math.floor(1000 + Math.random() * 9000);
	const year = new Date().getFullYear();
	return `DNT-${year}-${randomNum}`;
}

export interface OnlineBookingPayload {
	organizationId?: string | null;
	categoryId: string;
	serviceId?: string;
	doctorId: string;
	date: string;
	time: string;
	patientName: string;
	patientPhone: string;
	comment?: string;
	authMethod?: "telegram" | "sms" | "direct";
}

export async function submitOnlineBookingPayload(
	payload: OnlineBookingPayload,
): Promise<BookingConfirmationData> {
	const reference = generateBookingReferenceNumber();
	const category = CANONICAL_ONLINE_CATEGORIES.find((c) => c.id === payload.categoryId) || CANONICAL_ONLINE_CATEGORIES[0];
	const doctor = CANONICAL_ONLINE_DOCTORS.find((d) => d.id === payload.doctorId) || ANY_DOCTOR_SPECIALIST;
	const service = category.popularServices.find((s) => s.id === payload.serviceId) || category.popularServices[0];

	const confirmation: BookingConfirmationData = {
		referenceNumber: reference,
		branch: DEFAULT_CLINIC_BRANCH,
		category,
		service,
		doctor,
		date: payload.date,
		time: payload.time,
		startsAt: payload.time,
		endsAt: payload.time,
		patientName: payload.patientName.trim() || "Пациент",
		patientPhone: payload.patientPhone.trim(),
		cabinetNumber: doctor.id === ANY_DOCTOR_ID ? "Кабинет 1" : "Кабинет 3",
		comment: payload.comment,
		status: "confirmed",
		createdAt: new Date().toISOString(),
	};

	try {
		const res = await fetch("/api/public-booking/cloud-intake", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				organizationId: payload.organizationId || "00000000-0000-0000-0000-000000000000",
				clientName: confirmation.patientName,
				clientPhone: confirmation.patientPhone,
				doctorRequested: confirmation.doctor.fullName,
				serviceRequested: confirmation.service?.title || confirmation.category?.title || "Консультация",
				bookingDate: confirmation.date,
				bookingTime: confirmation.time,
				source: payload.authMethod === "telegram" ? "telegram_webapp" : "online_widget",
				referenceCode: reference,
			}),
		});
		if (!res.ok) {
			// Fallback: также пробуем запасной префикс /api/public/booking
			await fetch("/api/public/booking/cloud-intake", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					organizationId: payload.organizationId || "00000000-0000-0000-0000-000000000000",
					clientName: confirmation.patientName,
					clientPhone: confirmation.patientPhone,
					doctorRequested: confirmation.doctor.fullName,
					serviceRequested: confirmation.service?.title || "Консультация",
					bookingDate: confirmation.date,
					bookingTime: confirmation.time,
				}),
			}).catch(() => {});
		}
	} catch (_err) {
		// При сбое сети или локальном офлайн-режиме сохраняем в локальную очередь (Мандат 8e / 8n)
		if (typeof window !== "undefined") {
			try {
				const offlineQueue = JSON.parse(localStorage.getItem("dente_offline_bookings") || "[]");
				offlineQueue.push(confirmation);
				localStorage.setItem("dente_offline_bookings", JSON.stringify(offlineQueue));
			} catch {}
		}
	}

	return confirmation;
}
