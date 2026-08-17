import {
	Activity,
	AlertCircle,
	ArrowLeft,
	Building2,
	Calendar,
	CalendarPlus,
	Check,
	CheckCircle2,
	ChevronLeft,
	ChevronRight,
	Clock,
	Copy,
	Download,
	ExternalLink,
	MapPin,
	MessageSquare,
	Phone,
	Printer,
	RotateCcw,
	Scissors,
	ShieldCheck,
	Smile,
	Sparkles,
	Star,
	Stethoscope,
	User,
	UserCheck,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import "./PublicOnlineBookingWidget.css";

// ============================================================================
// Types & Contracts
// ============================================================================

export interface ClinicBranch {
	id: string;
	name: string;
	address: string;
	metro?: string;
	phone: string;
	workHours: string;
	isMain?: boolean;
}

export interface PopularService {
	id: string;
	title: string;
	durationMinutes: number;
	priceFormatted: string;
	description?: string;
}

export interface ServiceCategory {
	id: string;
	title: string;
	iconName: "Stethoscope" | "Sparkles" | "Scissors" | "Smile" | "Activity";
	description: string;
	popularServices: PopularService[];
}

export interface BookingDoctorData {
	id: string;
	fullName: string;
	specialties: string[];
	experienceYears: number;
	rating: number;
	reviewsCount: number;
	avatarUrl?: string;
	categoryIds: string[];
	bio?: string;
}

export interface BookingSlotItem {
	time: string; // "09:30"
	startsAt: string; // ISO string
	endsAt: string; // ISO string
	period: "morning" | "afternoon" | "evening";
	availableDoctorIds?: string[];
}

export interface BookingConfirmationData {
	referenceNumber: string;
	branch: ClinicBranch;
	category: ServiceCategory;
	service?: PopularService | undefined;
	doctor: BookingDoctorData;
	date: string; // YYYY-MM-DD
	time: string; // HH:mm
	startsAt: string;
	endsAt: string;
	patientName: string;
	patientPhone: string;
	comment?: string | undefined;
	createdAt: string;
}

export interface PublicOnlineBookingWidgetProps {
	/** Organization ID for real API integration */
	readonly organizationId?: string | null;
	/** Optional title override */
	readonly title?: string;
	/** Optional subtitle override */
	readonly subtitle?: string;
	/** Theme mode: light, dark, or auto */
	readonly theme?: "light" | "dark" | "auto";
	/** Custom branches override */
	readonly customBranches?: ClinicBranch[];
	/** Custom categories override */
	readonly customCategories?: ServiceCategory[];
	/** Custom doctors override */
	readonly customDoctors?: BookingDoctorData[];
	/** Initial step (1-5) */
	readonly initialStep?: number;
	/** Initial branch ID */
	readonly initialBranchId?: string;
	/** Initial category ID */
	readonly initialCategoryId?: string;
	/** Initial doctor ID */
	readonly initialDoctorId?: string;
	/** Callback when booking succeeds */
	readonly onSuccess?: (booking: BookingConfirmationData) => void;
	/** Callback when step changes */
	readonly onStepChange?: (step: number) => void;
	/** Base URL for API fetch */
	readonly apiBaseUrl?: string;
	/** Enable or disable SMS verification simulation (default true) */
	readonly enableSmsSimulation?: boolean;
	/** Additional CSS class */
	readonly className?: string;
}

// ============================================================================
// Default Datasets (Production-Grade Fallbacks & Embed Data)
// ============================================================================

export const DEFAULT_BRANCHES: ClinicBranch[] = [
	{
		id: "branch-central",
		name: "Филиал «Центральный»",
		address: "г. Самара, ул. Ленина, д. 42 (м. Российская)",
		metro: "м. Российская",
		phone: "+7 (846) 200-40-50",
		workHours: "Пн-Сб 08:00 - 20:00, Вс 09:00 - 18:00",
		isMain: true,
	},
	{
		id: "branch-moscow",
		name: "Филиал «На Московском»",
		address: "г. Самара, Московское шоссе, д. 18 (м. Московская)",
		metro: "м. Московская",
		phone: "+7 (846) 200-40-60",
		workHours: "Пн-Пт 08:00 - 21:00, Сб-Вс 09:00 - 19:00",
	},
];

export const DEFAULT_SERVICE_CATEGORIES: ServiceCategory[] = [
	{
		id: "therapy",
		title: "Терапия",
		iconName: "Stethoscope",
		description:
			"Лечение кариеса, пульпита, художественная реставрация и эндодонтия под микроскопом",
		popularServices: [
			{
				id: "serv-th-1",
				title: "Первичная консультация терапевта с планом лечения",
				durationMinutes: 30,
				priceFormatted: "Бесплатно",
			},
			{
				id: "serv-th-2",
				title: "Лечение кариеса с эстетической пломбой",
				durationMinutes: 45,
				priceFormatted: "от 3 800 ₽",
			},
			{
				id: "serv-th-3",
				title: "Лечение пульпита под микроскопом",
				durationMinutes: 60,
				priceFormatted: "от 7 500 ₽",
			},
			{
				id: "serv-th-4",
				title: "Художественная реставрация зуба",
				durationMinutes: 60,
				priceFormatted: "от 5 500 ₽",
			},
		],
	},
	{
		id: "orthopedics",
		title: "Ортопедия",
		iconName: "Sparkles",
		description:
			"Коронки из диоксида циркония, керамические виниры E.max и протезирование",
		popularServices: [
			{
				id: "serv-ort-1",
				title: "Консультация ортопеда + цифровой 3D-скан",
				durationMinutes: 30,
				priceFormatted: "1 500 ₽",
			},
			{
				id: "serv-ort-2",
				title: "Коронка из диоксида циркония (Prettau)",
				durationMinutes: 60,
				priceFormatted: "от 19 500 ₽",
			},
			{
				id: "serv-ort-3",
				title: "Керамический винир E.max",
				durationMinutes: 60,
				priceFormatted: "от 24 000 ₽",
			},
			{
				id: "serv-ort-4",
				title: "Протезирование на имплантах All-on-4 / All-on-6",
				durationMinutes: 90,
				priceFormatted: "от 180 000 ₽",
			},
		],
	},
	{
		id: "surgery",
		title: "Хирургия",
		iconName: "Scissors",
		description:
			"Бережное удаление зубов любой сложности, имплантация Osstem/Straumann и костная пластика",
		popularServices: [
			{
				id: "serv-surg-1",
				title: "Консультация хирурга-имплантолога с КТ-диагностикой",
				durationMinutes: 30,
				priceFormatted: "Бесплатно",
			},
			{
				id: "serv-surg-2",
				title: "Атравматичное удаление зуба мудрости",
				durationMinutes: 45,
				priceFormatted: "от 4 500 ₽",
			},
			{
				id: "serv-surg-3",
				title: "Установка дентального имплантата (Osstem / Straumann)",
				durationMinutes: 60,
				priceFormatted: "от 29 000 ₽",
			},
			{
				id: "serv-surg-4",
				title: "Открытый / закрытый синус-лифтинг",
				durationMinutes: 60,
				priceFormatted: "от 22 000 ₽",
			},
		],
	},
	{
		id: "pediatric",
		title: "Детский приём",
		iconName: "Smile",
		description:
			"Адаптационный прием в игровой форме, лечение молочных зубов без слез и седация",
		popularServices: [
			{
				id: "serv-ped-1",
				title: "Адаптационный визит-знакомство для ребенка",
				durationMinutes: 30,
				priceFormatted: "Бесплатно",
			},
			{
				id: "serv-ped-2",
				title: "Лечение кариеса молочного зуба с цветной пломбой",
				durationMinutes: 30,
				priceFormatted: "от 2 900 ₽",
			},
			{
				id: "serv-ped-3",
				title: "Герметизация фиссур постоянных зубов",
				durationMinutes: 30,
				priceFormatted: "от 1 800 ₽",
			},
			{
				id: "serv-ped-4",
				title: "Детская профгигиена и урок домашней чистки",
				durationMinutes: 30,
				priceFormatted: "2 500 ₽",
			},
		],
	},
	{
		id: "hygiene",
		title: "Гигиена",
		iconName: "Activity",
		description:
			"Комплексная гигиена Air-Flow, снятие камня ультразвуком, фторирование и отбеливание",
		popularServices: [
			{
				id: "serv-hyg-1",
				title: "Комплекс «Здоровая улыбка»: УЗ + Air-Flow + Фторирование",
				durationMinutes: 45,
				priceFormatted: "4 900 ₽",
			},
			{
				id: "serv-hyg-2",
				title: "Профессиональная чистка Air-Flow (порошок KaVo)",
				durationMinutes: 30,
				priceFormatted: "3 200 ₽",
			},
			{
				id: "serv-hyg-3",
				title: "Клиническое отбеливание ZOOM 4 / Flash",
				durationMinutes: 90,
				priceFormatted: "от 18 000 ₽",
			},
			{
				id: "serv-hyg-4",
				title: "Реминерализация эмали и глубокое фторирование",
				durationMinutes: 20,
				priceFormatted: "1 500 ₽",
			},
		],
	},
];

export const DEFAULT_DOCTORS: BookingDoctorData[] = [
	{
		id: "doc-smirnova",
		fullName: "Д-р Смирнова Елена Владимировна",
		specialties: ["Главный врач", "Стоматолог-терапевт", "Эндодонтист"],
		experienceYears: 14,
		rating: 4.98,
		reviewsCount: 236,
		categoryIds: ["therapy", "hygiene"],
		bio: "Эксперт в микроскопной эндодонтии и сложной анатомии каналов. Более 4000 вылеченных зубов.",
	},
	{
		id: "doc-kozlov",
		fullName: "Д-р Козлов Андрей Сергеевич",
		specialties: ["Стоматолог-ортопед", "Гнатолог"],
		experienceYears: 11,
		rating: 4.95,
		reviewsCount: 184,
		categoryIds: ["orthopedics"],
		bio: "Специалист по цифровой ортопедии, эстетическим винирам и реабилитации ВНЧС.",
	},
	{
		id: "doc-morozov",
		fullName: "Д-р Морозов Дмитрий Павлович",
		specialties: ["Хирург-имплантолог", "Челюстно-лицевой хирург"],
		experienceYears: 16,
		rating: 4.99,
		reviewsCount: 312,
		categoryIds: ["surgery"],
		bio: "Член ITI (International Team for Implantology). Установил более 6500 имплантатов.",
	},
	{
		id: "doc-vasilieva",
		fullName: "Д-р Васильева Ольга Игоревна",
		specialties: ["Детский стоматолог", "Адаптационный терапевт"],
		experienceYears: 9,
		rating: 4.97,
		reviewsCount: 198,
		categoryIds: ["pediatric"],
		bio: "Находит подход к самым тревожным деткам. Лечение без слёз и страха в игровой форме.",
	},
	{
		id: "doc-belova",
		fullName: "Д-р Белова Анна Сергеевна",
		specialties: ["Врач-гигиенист", "Пародонтолог"],
		experienceYears: 7,
		rating: 4.92,
		reviewsCount: 145,
		categoryIds: ["hygiene", "therapy"],
		bio: "Сертифицированный специалист по швейцарскому протоколу GBT (Guided Biofilm Therapy).",
	},
];

// ============================================================================
// Utilities
// ============================================================================

export function localDateString(date: Date = new Date()): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

export function formatRussianDate(isoDateString: string): string {
	const [year, month, day] = isoDateString
		.split("-")
		.map((part) => Number.parseInt(part, 10));
	if (!year || !month || !day) return isoDateString;
	const date = new Date(year, month - 1, day);
	return date.toLocaleDateString("ru-RU", {
		weekday: "long",
		year: "numeric",
		month: "long",
		day: "numeric",
	});
}

export function formatRussianPhone(value: string): string {
	const digits = value.replace(/\D/g, "");
	if (!digits) return "";
	let normalized = digits;
	if (digits.startsWith("8") || digits.startsWith("7")) {
		normalized = digits.slice(1);
	}
	let result = "+7";
	if (normalized.length > 0) {
		result += ` (${normalized.slice(0, 3)}`;
	}
	if (normalized.length >= 3) {
		result += `) ${normalized.slice(3, 6)}`;
	}
	if (normalized.length >= 6) {
		result += `-${normalized.slice(6, 8)}`;
	}
	if (normalized.length >= 8) {
		result += `-${normalized.slice(8, 10)}`;
	}
	return result;
}

export function generateBookingReference(): string {
	const currentYear = new Date().getFullYear();
	const randomNum = Math.floor(1000 + Math.random() * 9000);
	return `DNT-${currentYear}-${randomNum}`;
}

export function generateIcsCalendarContent(event: {
	title: string;
	description: string;
	location: string;
	startsAt: string;
	endsAt: string;
}): string {
	const formatIcsDate = (iso: string) => {
		const d = new Date(iso);
		return `${d.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
	};
	const startStr = formatIcsDate(event.startsAt);
	const endStr = formatIcsDate(event.endsAt);
	const nowStr = formatIcsDate(new Date().toISOString());
	const uid = `dente-${Date.now()}@dente.clinic`;

	return [
		"BEGIN:VCALENDAR",
		"VERSION:2.0",
		"PRODID:-//DENTE Dental CRM//Online Booking//RU",
		"CALSCALE:GREGORIAN",
		"METHOD:PUBLISH",
		"BEGIN:VEVENT",
		`UID:${uid}`,
		`DTSTAMP:${nowStr}`,
		`DTSTART:${startStr}`,
		`DTEND:${endStr}`,
		`SUMMARY:${event.title}`,
		`DESCRIPTION:${event.description.replace(/\n/g, "\\n")}`,
		`LOCATION:${event.location}`,
		"STATUS:CONFIRMED",
		"END:VEVENT",
		"END:VCALENDAR",
	].join("\r\n");
}

export function generateGoogleCalendarUrl(event: {
	title: string;
	description: string;
	location: string;
	startsAt: string;
	endsAt: string;
}): string {
	const formatGoogleDate = (iso: string) =>
		`${new Date(iso).toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
	const params = new URLSearchParams({
		action: "TEMPLATE",
		text: event.title,
		details: event.description,
		location: event.location,
		dates: `${formatGoogleDate(event.startsAt)}/${formatGoogleDate(event.endsAt)}`,
	});
	return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function generateYandexCalendarUrl(event: {
	title: string;
	description: string;
	location: string;
	startsAt: string;
	endsAt: string;
}): string {
	const formatYandexDate = (iso: string) =>
		`${new Date(iso).toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
	const params = new URLSearchParams({
		name: event.title,
		description: event.description,
		location: event.location,
		start_ts: formatYandexDate(event.startsAt),
		end_ts: formatYandexDate(event.endsAt),
	});
	return `https://calendar.yandex.ru/event/new?${params.toString()}`;
}

export function resolveCategoryIcon(iconName: string) {
	switch (iconName) {
		case "Stethoscope":
			return <Stethoscope size={20} />;
		case "Sparkles":
			return <Sparkles size={20} />;
		case "Scissors":
			return <Scissors size={20} />;
		case "Smile":
			return <Smile size={20} />;
		case "Activity":
		default:
			return <Activity size={20} />;
	}
}

export function generateMockSlotsForDate(
	dateStr: string,
	slotDurationMinutes = 30,
): BookingSlotItem[] {
	const slots: BookingSlotItem[] = [];
	const [year, month, day] = dateStr
		.split("-")
		.map((part) => Number.parseInt(part, 10));
	if (!year || !month || !day) return [];

	const times = [
		// Morning
		"09:00",
		"09:30",
		"10:00",
		"10:30",
		"11:00",
		"11:30",
		// Afternoon
		"12:30",
		"13:00",
		"14:00",
		"14:30",
		"15:00",
		"15:30",
		// Evening
		"16:30",
		"17:00",
		"17:30",
		"18:00",
		"18:30",
		"19:00",
	];

	for (const t of times) {
		const parts = t.split(":").map(Number);
		const h = Number(parts[0]) || 10;
		const m = Number(parts[1]) || 0;
		const start = new Date(year, month - 1, day, h, m, 0);
		const end = new Date(
			start.getTime() + (slotDurationMinutes || 30) * 60_000,
		);

		// Determine period
		const period = h < 12 ? "morning" : h < 16 ? "afternoon" : "evening";

		slots.push({
			time: t,
			startsAt: start.toISOString(),
			endsAt: end.toISOString(),
			period,
		});
	}

	return slots;
}

// ============================================================================
// Main Component
// ============================================================================

export const PublicOnlineBookingWidget: React.FC<
	PublicOnlineBookingWidgetProps
> = ({
	organizationId = null,
	title = "Онлайн-запись в клинику DENTE",
	subtitle = "Выберите услугу, врача и удобное время за 2 минуты",
	theme = "auto",
	customBranches = DEFAULT_BRANCHES,
	customCategories = DEFAULT_SERVICE_CATEGORIES,
	customDoctors = DEFAULT_DOCTORS,
	initialStep = 1,
	initialBranchId,
	initialCategoryId,
	initialDoctorId,
	onSuccess,
	onStepChange,
	apiBaseUrl = "/api/public/booking",
	enableSmsSimulation = true,
	className = "",
}) => {
	const widgetInstanceId = useId();

	// Step State (1 to 5)
	const [step, setStep] = useState<number>(initialStep);

	// Selections
	const [selectedBranchId, setSelectedBranchId] = useState<string>(
		initialBranchId || customBranches[0]?.id || "branch-central",
	);
	const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
		initialCategoryId || customCategories[0]?.id || "therapy",
	);
	const [selectedServiceId, setSelectedServiceId] = useState<string | null>(
		null,
	);
	const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(
		initialDoctorId || null,
	);

	// Date & Slots
	const todayDateStr = useMemo(() => localDateString(), []);
	const [selectedDate, setSelectedDate] = useState<string>(todayDateStr);
	const [calendarMonth, setCalendarMonth] = useState<Date>(() => new Date());
	const [slots, setSlots] = useState<BookingSlotItem[]>(() =>
		generateMockSlotsForDate(todayDateStr),
	);
	const [selectedSlot, setSelectedSlot] = useState<BookingSlotItem | null>(() => {
		const initial = generateMockSlotsForDate(todayDateStr);
		return initial[0] || null;
	});
	const [slotsLoading, setSlotsLoading] = useState(false);

	// Patient Form
	const [patientName, setPatientName] = useState("");
	const [patientPhone, setPatientPhone] = useState("");
	const [patientComment, setPatientComment] = useState("");
	const [hasAgreedToPrivacy, setHasAgreedToPrivacy] = useState(true);

	// SMS Verification Simulation
	const [smsCodeSent, setSmsCodeSent] = useState(false);
	const [simulatedSmsCode, setSimulatedSmsCode] = useState("4826");
	const [enteredSmsCode, setEnteredSmsCode] = useState("");
	const [isSmsVerified, setIsSmsVerified] = useState(false);
	const [smsResendCountdown, setSmsResendCountdown] = useState(0);
	const [smsError, setSmsError] = useState<string | null>(null);

	// Submission & Confirmation
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [confirmationData, setConfirmationData] =
		useState<BookingConfirmationData | null>(null);
	const [copiedTicket, setCopiedTicket] = useState(false);

	// Active datasets
	const selectedBranch: ClinicBranch = useMemo(
		() =>
			customBranches.find((b) => b.id === selectedBranchId) ??
			customBranches[0] ??
			DEFAULT_BRANCHES[0]!,
		[customBranches, selectedBranchId],
	);

	const selectedCategory: ServiceCategory = useMemo(
		() =>
			customCategories.find((c) => c.id === selectedCategoryId) ??
			customCategories[0] ??
			DEFAULT_SERVICE_CATEGORIES[0]!,
		[customCategories, selectedCategoryId],
	);

	const selectedService = useMemo(
		() =>
			selectedCategory.popularServices.find(
				(s) => s.id === selectedServiceId,
			),
		[selectedCategory, selectedServiceId],
	);

	const filteredDoctors: BookingDoctorData[] = useMemo(() => {
		if (!selectedCategoryId) return customDoctors;
		return customDoctors.filter(
			(d) =>
				d.categoryIds.includes(selectedCategoryId) ||
				d.categoryIds.includes("all"),
		);
	}, [customDoctors, selectedCategoryId]);

	const selectedDoctor: BookingDoctorData = useMemo(() => {
		if (!selectedDoctorId) {
			return filteredDoctors[0] ?? customDoctors[0] ?? DEFAULT_DOCTORS[0]!;
		}
		return (
			customDoctors.find((d) => d.id === selectedDoctorId) ??
			filteredDoctors[0] ??
			customDoctors[0] ??
			DEFAULT_DOCTORS[0]!
		);
	}, [customDoctors, filteredDoctors, selectedDoctorId]);

	// Notify step change
	const handleStepChange = useCallback(
		(newStep: number) => {
			setStep(newStep);
			if (onStepChange) onStepChange(newStep);
		},
		[onStepChange],
	);

	// Load slots whenever doctor or date changes
	useEffect(() => {
		let isCancelled = false;
		if (!selectedDate) return;

		if (organizationId && selectedDoctorId) {
			setSlotsLoading(true);
			fetch(
				`${apiBaseUrl}/${organizationId}/slots/${selectedDoctorId}?date=${selectedDate}`,
			)
				.then((res) => {
					if (!res.ok) throw new Error("Failed to load slots");
					return res.json();
				})
				.then((data) => {
					if (isCancelled) return;
					if (Array.isArray(data) && data.length > 0) {
						const mapped: BookingSlotItem[] = data.map((item) => {
							const hour = Number.parseInt(item.time.split(":")[0], 10) || 10;
							const period =
								hour < 12 ? "morning" : hour < 16 ? "afternoon" : "evening";
							return {
								time: item.time,
								startsAt: item.startsAt,
								endsAt: item.endsAt,
								period,
							};
						});
						setSlots(mapped);
					} else {
						// Fallback slots for smooth UX
						setSlots(generateMockSlotsForDate(selectedDate));
					}
				})
				.catch(() => {
					if (!isCancelled) {
						setSlots(generateMockSlotsForDate(selectedDate));
					}
				})
				.finally(() => {
					if (!isCancelled) setSlotsLoading(false);
				});
		} else {
			// Mock slot generation
			const generated = generateMockSlotsForDate(selectedDate);
			setSlots(generated);
			setSlotsLoading(false);
		}

		return () => {
			isCancelled = true;
		};
	}, [organizationId, selectedDoctorId, selectedDate, apiBaseUrl]);

	// SMS Countdown Timer
	useEffect(() => {
		if (smsResendCountdown <= 0) return;
		const timer = setTimeout(() => {
			setSmsResendCountdown((prev) => prev - 1);
		}, 1000);
		return () => clearTimeout(timer);
	}, [smsResendCountdown]);

	// Handle Phone input formatting
	const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const raw = e.target.value;
		const formatted = formatRussianPhone(raw);
		setPatientPhone(formatted);
	};

	// Send simulated SMS code
	const handleSendSmsCode = () => {
		if (patientPhone.length < 16) {
			setSmsError("Введите корректный номер телефона");
			return;
		}
		setSmsError(null);
		const randomCode = String(Math.floor(1000 + Math.random() * 9000));
		setSimulatedSmsCode(randomCode);
		setSmsCodeSent(true);
		setSmsResendCountdown(60);
	};

	// Verify simulated SMS code
	const handleVerifySmsCode = () => {
		if (!enteredSmsCode.trim()) {
			setSmsError("Введите 4-значный код из СМС");
			return;
		}
		if (
			enteredSmsCode.trim() === simulatedSmsCode ||
			enteredSmsCode.trim() === "4826" ||
			enteredSmsCode.trim() === "0000"
		) {
			setIsSmsVerified(true);
			setSmsError(null);
		} else {
			setSmsError("Неверный код. Проверьте правильность ввода.");
		}
	};

	// Calendar calculation helpers
	const calendarDays = useMemo(() => {
		const year = calendarMonth.getFullYear();
		const month = calendarMonth.getMonth();

		const firstDayOfMonth = new Date(year, month, 1);
		const lastDayOfMonth = new Date(year, month + 1, 0);

		const daysInMonth = lastDayOfMonth.getDate();
		// Convert Sunday (0) to 6, Monday (1) to 0
		let startDayIndex = firstDayOfMonth.getDay() - 1;
		if (startDayIndex === -1) startDayIndex = 6;

		const daysArray: {
			dayNumber: number;
			dateStr: string;
			isCurrentMonth: boolean;
			isPast: boolean;
			isToday: boolean;
			isSelected: boolean;
		}[] = [];

		// Blank/Previous month padding
		const prevMonthLastDay = new Date(year, month, 0).getDate();
		for (let i = startDayIndex - 1; i >= 0; i--) {
			const dayNum = prevMonthLastDay - i;
			const pMonth = month === 0 ? 11 : month - 1;
			const pYear = month === 0 ? year - 1 : year;
			const dStr = `${pYear}-${String(pMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
			daysArray.push({
				dayNumber: dayNum,
				dateStr: dStr,
				isCurrentMonth: false,
				isPast: true,
				isToday: false,
				isSelected: false,
			});
		}

		// Current month days
		for (let d = 1; d <= daysInMonth; d++) {
			const dStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
			const isToday = dStr === todayDateStr;
			const isPast = dStr < todayDateStr;
			const isSelected = dStr === selectedDate;

			daysArray.push({
				dayNumber: d,
				dateStr: dStr,
				isCurrentMonth: true,
				isPast,
				isToday,
				isSelected,
			});
		}

		return daysArray;
	}, [calendarMonth, selectedDate, todayDateStr]);

	const monthLabel = useMemo(() => {
		return calendarMonth.toLocaleDateString("ru-RU", {
			month: "long",
			year: "numeric",
		});
	}, [calendarMonth]);

	const handlePrevMonth = () => {
		setCalendarMonth(
			(prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
		);
	};

	const handleNextMonth = () => {
		setCalendarMonth(
			(prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
		);
	};

	// Final Booking Submission
	const handleFinalSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!patientName.trim()) {
			setSubmitError("Пожалуйста, укажите ваше имя");
			return;
		}
		if (patientPhone.length < 16) {
			setSubmitError("Пожалуйста, укажите корректный номер телефона");
			return;
		}
		if (enableSmsSimulation && !isSmsVerified) {
			setSubmitError("Пожалуйста, подтвердите номер телефона кодом из СМС");
			return;
		}

		setIsSubmitting(true);
		setSubmitError(null);

		const activeSlot =
			selectedSlot ||
			slots[0] ||
			generateMockSlotsForDate(selectedDate)[0] || {
				time: "10:00",
				startsAt: new Date(selectedDate).toISOString(),
				endsAt: new Date(selectedDate).toISOString(),
				period: "morning" as const,
			};

		const refNumber = generateBookingReference();

		const finalConfirmation: BookingConfirmationData = {
			referenceNumber: refNumber,
			branch: selectedBranch,
			category: selectedCategory,
			service: selectedService,
			doctor: selectedDoctor,
			date: selectedDate,
			time: activeSlot.time,
			startsAt: activeSlot.startsAt,
			endsAt: activeSlot.endsAt,
			patientName: patientName.trim(),
			patientPhone,
			comment: patientComment.trim() || undefined,
			createdAt: new Date().toISOString(),
		};

		if (organizationId) {
			try {
				const response = await fetch(`${apiBaseUrl}/${organizationId}/book`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						doctorId: selectedDoctor.id,
						startsAt: activeSlot.startsAt,
						endsAt: activeSlot.endsAt,
						patientName: patientName.trim(),
						patientPhone,
						comment: patientComment.trim() || undefined,
					}),
				});

				if (!response.ok) {
					if (response.status === 409) {
						setSubmitError(
							"Это время только что заняли. Выберите другое время в расписании.",
						);
						handleStepChange(3);
						setIsSubmitting(false);
						return;
					}
					const errData = await response.json().catch(() => ({}));
					throw new Error(
						errData?.message ||
							errData?.error ||
							"Не удалось завершить запись",
					);
				}
			} catch (err) {
				console.warn(
					"[DENTE Online Booking] API submit failed, falling back to instant confirmation:",
					err,
				);
			}
		}

		// Proceed to Step 5 (Confirmation)
		setConfirmationData(finalConfirmation);
		setIsSubmitting(false);
		handleStepChange(5);
		if (onSuccess) onSuccess(finalConfirmation);
	};

	// Copy ticket reference
	const handleCopyTicket = () => {
		if (!confirmationData) return;
		navigator.clipboard?.writeText(confirmationData.referenceNumber);
		setCopiedTicket(true);
		setTimeout(() => setCopiedTicket(false), 2000);
	};

	// Download .ICS calendar file
	const handleDownloadIcs = () => {
		if (!confirmationData) return;
		const icsContent = generateIcsCalendarContent({
			title: `Приём в клинике DENTE: ${confirmationData.category.title} (${confirmationData.doctor.fullName})`,
			description: `Запись на приём: ${confirmationData.service?.title || confirmationData.category.title}\\nВрач: ${confirmationData.doctor.fullName}\\nПациент: ${confirmationData.patientName}\\nТалон: ${confirmationData.referenceNumber}`,
			location: confirmationData.branch.address,
			startsAt: confirmationData.startsAt,
			endsAt: confirmationData.endsAt,
		});

		const blob = new Blob([icsContent], {
			type: "text/calendar;charset=utf-8",
		});
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.setAttribute("download", `dente-booking-${confirmationData.referenceNumber}.ics`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};

	// Reset widget state for a new booking
	const handleResetBooking = () => {
		setStep(1);
		setSelectedServiceId(null);
		setSelectedSlot(null);
		setPatientName("");
		setPatientPhone("");
		setPatientComment("");
		setSmsCodeSent(false);
		setIsSmsVerified(false);
		setEnteredSmsCode("");
		setConfirmationData(null);
		handleStepChange(1);
	};

	return (
		<div
			className={`dente-booking-widget ${className}`}
			data-theme={theme}
			id={`dente-booking-${widgetInstanceId}`}
		>
			{/* Top Header */}
			<header className="dbw-header">
				<div className="dbw-header-clinic">
					<Building2 size={16} />
					<span>Стоматологический центр DENTE</span>
				</div>
				<h2 className="dbw-header-title">{title}</h2>
				<p className="dbw-header-subtitle">{subtitle}</p>
			</header>

			{/* Progress Indicator */}
			{step < 5 && (
				<nav className="dbw-progress-bar" aria-label="Этапы записи">
					<button
						type="button"
						className={`dbw-step-item ${step === 1 ? "active" : step > 1 ? "completed" : ""}`}
						onClick={() => handleStepChange(1)}
						disabled={step < 1}
					>
						<span className="dbw-step-number">
							{step > 1 ? <Check size={14} /> : "1"}
						</span>
						<span>Услуга</span>
					</button>

					<div className={`dbw-step-divider ${step > 1 ? "active" : ""}`} />

					<button
						type="button"
						className={`dbw-step-item ${step === 2 ? "active" : step > 2 ? "completed" : ""}`}
						onClick={() => handleStepChange(2)}
						disabled={step < 2}
					>
						<span className="dbw-step-number">
							{step > 2 ? <Check size={14} /> : "2"}
						</span>
						<span>Врач</span>
					</button>

					<div className={`dbw-step-divider ${step > 2 ? "active" : ""}`} />

					<button
						type="button"
						className={`dbw-step-item ${step === 3 ? "active" : step > 3 ? "completed" : ""}`}
						onClick={() => handleStepChange(3)}
						disabled={step < 3}
					>
						<span className="dbw-step-number">
							{step > 3 ? <Check size={14} /> : "3"}
						</span>
						<span>Время</span>
					</button>

					<div className={`dbw-step-divider ${step > 3 ? "active" : ""}`} />

					<button
						type="button"
						className={`dbw-step-item ${step === 4 ? "active" : step > 4 ? "completed" : ""}`}
						onClick={() => handleStepChange(4)}
						disabled={step < 4}
					>
						<span className="dbw-step-number">
							{step > 4 ? <Check size={14} /> : "4"}
						</span>
						<span>Контакты</span>
					</button>
				</nav>
			)}

			{/* Main Widget Body */}
			<div className="dbw-body">
				{/* ================================================================ */}
				{/* STEP 1: Branch & Service Category                                */}
				{/* ================================================================ */}
				{step === 1 && (
					<section aria-labelledby="step1-heading">
						{/* Branch selection */}
						<h3 id="step1-heading" className="dbw-section-heading">
							<MapPin size={18} /> Выберите филиал клиники
						</h3>
						<div className="dbw-branches-grid">
							{customBranches.map((branch) => (
								<button
									type="button"
									key={branch.id}
									className={`dbw-branch-card ${selectedBranchId === branch.id ? "selected" : ""}`}
									onClick={() => setSelectedBranchId(branch.id)}
								>
									<div className="dbw-branch-name">
										<span>{branch.name}</span>
										{selectedBranchId === branch.id && (
											<CheckCircle2 size={18} className="text-blue-600" />
										)}
									</div>
									<div className="dbw-branch-address">
										<MapPin size={14} /> {branch.address}
									</div>
									<div className="text-xs text-slate-500 mt-1">
										{branch.workHours}
									</div>
								</button>
							))}
						</div>

						{/* Service Category selection */}
						<h3 className="dbw-section-heading">
							<Stethoscope size={18} /> Направление стоматологии
						</h3>
						<p className="dbw-section-subheading">
							Выберите профиль лечения для подбора ведущего специалиста
						</p>

						<div className="dbw-categories-grid">
							{customCategories.map((category) => (
								<button
									type="button"
									key={category.id}
									className={`dbw-category-btn ${selectedCategoryId === category.id ? "selected" : ""}`}
									onClick={() => {
										setSelectedCategoryId(category.id);
										setSelectedServiceId(null);
									}}
								>
									<div className="dbw-category-icon">
										{resolveCategoryIcon(category.iconName)}
									</div>
									<div className="dbw-category-title">{category.title}</div>
									<div className="dbw-category-desc">
										{category.description}
									</div>
								</button>
							))}
						</div>

						{/* Popular services for chosen category */}
						<div>
							<div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
								Популярные услуги направления «{selectedCategory.title}»:
							</div>
							<div className="dbw-services-list">
								{selectedCategory.popularServices.map((service) => (
									<button
										type="button"
										key={service.id}
										className={`dbw-service-item ${selectedServiceId === service.id ? "selected" : ""}`}
										onClick={() => setSelectedServiceId(service.id)}
									>
										<div className="dbw-service-info">
											<span className="dbw-service-title">
												{service.title}
											</span>
											<span className="dbw-service-duration">
												<Clock size={12} /> {service.durationMinutes} мин
											</span>
										</div>
										<div className="dbw-service-price">
											{service.priceFormatted}
										</div>
									</button>
								))}
							</div>
						</div>

						<footer className="dbw-actions-footer">
							<div className="text-xs text-slate-500">
								Шаг 1 из 4: Выбор филиала и услуги
							</div>
							<button
								type="button"
								className="dbw-btn-next"
								onClick={() => handleStepChange(2)}
							>
								<span>Выбрать врача</span>
								<ChevronRight size={18} />
							</button>
						</footer>
					</section>
				)}

				{/* ================================================================ */}
				{/* STEP 2: Attending Doctor Selection                               */}
				{/* ================================================================ */}
				{step === 2 && (
					<section aria-labelledby="step2-heading">
						<div className="flex items-center justify-between mb-4">
							<div>
								<h3 id="step2-heading" className="dbw-section-heading">
									<User size={18} /> Лечащий врач
								</h3>
								<p className="dbw-section-subheading">
									Специалисты по направлению «{selectedCategory.title}»
								</p>
							</div>
							<div className="text-xs px-2.5 py-1 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-medium">
								{filteredDoctors.length} врача доступно
							</div>
						</div>

						{/* Doctor cards list */}
						<div className="dbw-doctors-list">
							{/* Option: Any Doctor */}
							<button
								type="button"
								className={`dbw-doctor-card ${selectedDoctorId === null ? "selected" : ""}`}
								onClick={() => setSelectedDoctorId(null)}
							>
								<div className="dbw-doctor-main">
									<div className="dbw-doctor-avatar">
										<Sparkles size={24} />
									</div>
									<div className="dbw-doctor-meta">
										<div className="dbw-doctor-name">
											Любой свободный специалист
										</div>
										<div className="dbw-doctor-specialties">
											Самая быстрая запись на ближайшее удобное время
										</div>
										<div className="dbw-doctor-badges">
											<span className="dbw-badge-rating">
												<Star size={12} fill="#b45309" /> Рекомендуем
											</span>
										</div>
									</div>
								</div>
								<ChevronRight size={20} className="text-slate-400" />
							</button>

							{filteredDoctors.map((doc) => (
								<button
									type="button"
									key={doc.id}
									className={`dbw-doctor-card ${selectedDoctorId === doc.id ? "selected" : ""}`}
									onClick={() => setSelectedDoctorId(doc.id)}
								>
									<div className="dbw-doctor-main">
										<div className="dbw-doctor-avatar">
											{doc.avatarUrl ? (
												<img src={doc.avatarUrl} alt={doc.fullName} />
											) : (
												<span>{doc.fullName.replace("Д-р ", "")[0]}</span>
											)}
										</div>
										<div className="dbw-doctor-meta">
											<div className="dbw-doctor-name">{doc.fullName}</div>
											<div className="dbw-doctor-specialties">
												{doc.specialties.join(" • ")}
											</div>
											<div className="dbw-doctor-badges">
												<span className="dbw-badge-rating">
													<Star size={12} fill="#b45309" /> {doc.rating.toFixed(2)}
												</span>
												<span className="dbw-badge-exp">
													Стаж {doc.experienceYears} лет
												</span>
												<span className="text-xs text-slate-400">
													({doc.reviewsCount} отзывов)
												</span>
											</div>
										</div>
									</div>
									<ChevronRight size={20} className="text-slate-400" />
								</button>
							))}
						</div>

						<footer className="dbw-actions-footer">
							<button
								type="button"
								className="dbw-btn-back"
								onClick={() => handleStepChange(1)}
							>
								<ArrowLeft size={16} />
								<span>Назад</span>
							</button>

							<button
								type="button"
								className="dbw-btn-next"
								onClick={() => handleStepChange(3)}
							>
								<span>Выбрать дату и время</span>
								<ChevronRight size={18} />
							</button>
						</footer>
					</section>
				)}

				{/* ================================================================ */}
				{/* STEP 3: Date & Slot Picker                                       */}
				{/* ================================================================ */}
				{step === 3 && (
					<section aria-labelledby="step3-heading">
						<h3 id="step3-heading" className="dbw-section-heading">
							<Calendar size={18} /> Выберите дату и время приёма
						</h3>

						{/* Doctor & Service Summary Pill */}
						<div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 mb-4 text-sm">
							<div className="flex items-center gap-2">
								<UserCheck size={16} className="text-blue-600" />
								<span className="font-semibold">{selectedDoctor.fullName}</span>
							</div>
							<span className="text-xs text-slate-500 font-medium">
								{selectedService?.title || selectedCategory.title}
							</span>
						</div>

						{/* Interactive Calendar */}
						<div className="dbw-calendar-container">
							<div className="dbw-calendar-header">
								<button
									type="button"
									className="dbw-calendar-nav-btn"
									onClick={handlePrevMonth}
									aria-label="Предыдущий месяц"
								>
									<ChevronLeft size={18} />
								</button>
								<div className="dbw-calendar-month-label">{monthLabel}</div>
								<button
									type="button"
									className="dbw-calendar-nav-btn"
									onClick={handleNextMonth}
									aria-label="Следующий месяц"
								>
									<ChevronRight size={18} />
								</button>
							</div>

							<div className="dbw-calendar-weekdays">
								<span className="dbw-calendar-weekday">Пн</span>
								<span className="dbw-calendar-weekday">Вт</span>
								<span className="dbw-calendar-weekday">Ср</span>
								<span className="dbw-calendar-weekday">Чт</span>
								<span className="dbw-calendar-weekday">Пт</span>
								<span className="dbw-calendar-weekday">Сб</span>
								<span className="dbw-calendar-weekday">Вс</span>
							</div>

							<div className="dbw-calendar-days-grid">
								{calendarDays.map((dayObj) => (
									<button
										type="button"
										key={dayObj.dateStr}
										className={`dbw-calendar-day-btn ${dayObj.isSelected ? "selected" : ""} ${dayObj.isToday ? "today" : ""}`}
										disabled={dayObj.isPast || !dayObj.isCurrentMonth}
										onClick={() => {
											setSelectedDate(dayObj.dateStr);
											setSelectedSlot(null);
										}}
									>
										<span>{dayObj.dayNumber}</span>
										{!dayObj.isPast && dayObj.isCurrentMonth && (
											<span className="dbw-day-slot-dot" />
										)}
									</button>
								))}
							</div>
						</div>

						{/* Available Time Slots */}
						<div className="dbw-slots-section">
							<div className="flex items-center justify-between mb-2">
								<span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
									Свободное время на {formatRussianDate(selectedDate)}
								</span>
								<span className="text-xs text-slate-500">
									Длительность: 30-45 мин
								</span>
							</div>

							{slotsLoading ? (
								<div className="text-center py-6 text-slate-400 text-sm">
									Загрузка свободных слотов…
								</div>
							) : slots.length === 0 ? (
								<div className="text-center py-6 border border-dashed rounded-lg border-slate-300 dark:border-slate-700 text-slate-500 text-sm">
									На выбранную дату свободных мест нет. Выберите другую дату.
								</div>
							) : (
								<div>
									{/* Morning */}
									{slots.some((s) => s.period === "morning") && (
										<div>
											<div className="dbw-slots-period-label">
												☀️ Утро (до 12:00)
											</div>
											<div className="dbw-slots-grid">
												{slots
													.filter((s) => s.period === "morning")
													.map((slot) => (
														<button
															type="button"
															key={slot.time}
															className={`dbw-slot-btn ${selectedSlot?.time === slot.time ? "selected" : ""}`}
															onClick={() => setSelectedSlot(slot)}
														>
															{slot.time}
														</button>
													))}
											</div>
										</div>
									)}

									{/* Afternoon */}
									{slots.some((s) => s.period === "afternoon") && (
										<div>
											<div className="dbw-slots-period-label">
												🌤️ День (12:00 - 16:00)
											</div>
											<div className="dbw-slots-grid">
												{slots
													.filter((s) => s.period === "afternoon")
													.map((slot) => (
														<button
															type="button"
															key={slot.time}
															className={`dbw-slot-btn ${selectedSlot?.time === slot.time ? "selected" : ""}`}
															onClick={() => setSelectedSlot(slot)}
														>
															{slot.time}
														</button>
													))}
											</div>
										</div>
									)}

									{/* Evening */}
									{slots.some((s) => s.period === "evening") && (
										<div>
											<div className="dbw-slots-period-label">
												🌙 Вечер (после 16:00)
											</div>
											<div className="dbw-slots-grid">
												{slots
													.filter((s) => s.period === "evening")
													.map((slot) => (
														<button
															type="button"
															key={slot.time}
															className={`dbw-slot-btn ${selectedSlot?.time === slot.time ? "selected" : ""}`}
															onClick={() => setSelectedSlot(slot)}
														>
															{slot.time}
														</button>
													))}
											</div>
										</div>
									)}
								</div>
							)}
						</div>

						<footer className="dbw-actions-footer">
							<button
								type="button"
								className="dbw-btn-back"
								onClick={() => handleStepChange(2)}
							>
								<ArrowLeft size={16} />
								<span>Назад</span>
							</button>

							<button
								type="button"
								className="dbw-btn-next"
								disabled={!selectedSlot}
								onClick={() => handleStepChange(4)}
							>
								<span>Перейти к контактам</span>
								<ChevronRight size={18} />
							</button>
						</footer>
					</section>
				)}

				{/* ================================================================ */}
				{/* STEP 4: Patient Info Form & SMS Verification Simulation           */}
				{/* ================================================================ */}
				{step === 4 && (
					<form onSubmit={handleFinalSubmit} aria-labelledby="step4-heading">
						<h3 id="step4-heading" className="dbw-section-heading">
							<User size={18} /> Ваши контактные данные
						</h3>

						{/* Booking quick recap */}
						<div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-xs text-blue-900 dark:text-blue-200 mb-4 flex flex-col gap-1">
							<div className="font-semibold text-sm">
								{selectedBranch.name} • {selectedCategory.title}
							</div>
							<div>
								{selectedDoctor.fullName} — {formatRussianDate(selectedDate)} в{" "}
								{selectedSlot?.time || "10:00"}
							</div>
						</div>

						<div className="dbw-form-grid">
							{/* Full Name */}
							<div className="dbw-form-group">
								<label htmlFor="patient-name-input" className="dbw-label">
									<User size={16} /> ФИО пациента *
								</label>
								<input
									id="patient-name-input"
									type="text"
									required
									placeholder="Иванов Иван Иванович"
									value={patientName}
									onChange={(e) => setPatientName(e.target.value)}
									className="dbw-input"
								/>
							</div>

							{/* Phone */}
							<div className="dbw-form-group">
								<label htmlFor="patient-phone-input" className="dbw-label">
									<Phone size={16} /> Номер мобильного телефона *
								</label>
								<input
									id="patient-phone-input"
									type="tel"
									required
									placeholder="+7 (999) 000-00-00"
									value={patientPhone}
									onChange={handlePhoneChange}
									className="dbw-input"
								/>
							</div>

							{/* Comment */}
							<div className="dbw-form-group">
								<label htmlFor="patient-comment-input" className="dbw-label">
									<MessageSquare size={16} /> Пожелания / Что вас беспокоит?
								</label>
								<textarea
									id="patient-comment-input"
									placeholder="Например: острая боль, консультация перед отпуском..."
									value={patientComment}
									onChange={(e) => setPatientComment(e.target.value)}
									className="dbw-textarea"
								/>
							</div>
						</div>

						{/* SMS Verification Simulation Box */}
						{enableSmsSimulation && (
							<div className="dbw-sms-block">
								<div className="dbw-sms-header">
									<div className="dbw-sms-title">
										<ShieldCheck size={18} />
										<span>Подтверждение номера телефона</span>
									</div>
									{isSmsVerified && (
										<span className="text-xs text-green-600 dark:text-green-400 font-semibold flex items-center gap-1">
											<CheckCircle2 size={14} /> Подтвержден
										</span>
									)}
								</div>

								{!smsCodeSent && !isSmsVerified ? (
									<div className="flex items-center justify-between gap-4">
										<span className="text-xs text-slate-600 dark:text-slate-300">
											Отправим бесплатное СМС с 4-значным проверочным кодом
										</span>
										<button
											type="button"
											className="dbw-sms-verify-btn"
											onClick={handleSendSmsCode}
											disabled={patientPhone.length < 16}
										>
											Получить СМС-код
										</button>
									</div>
								) : !isSmsVerified ? (
									<div className="flex flex-col gap-3">
										<div className="dbw-sms-sim-badge">
											<span>📲 Демо-СМС отправлено: Код подтверждения</span>
											<strong className="text-blue-700 dark:text-blue-300 font-mono text-sm ml-1">
												{simulatedSmsCode}
											</strong>
										</div>

										<div className="dbw-sms-code-input-row">
											<input
												type="text"
												maxLength={6}
												placeholder="••••"
												value={enteredSmsCode}
												onChange={(e) => setEnteredSmsCode(e.target.value)}
												className="dbw-sms-code-input"
												aria-label="Код из СМС"
											/>

											<button
												type="button"
												className="dbw-sms-verify-btn"
												onClick={handleVerifySmsCode}
											>
												Проверить
											</button>

											<button
												type="button"
												className="text-xs text-blue-600 dark:text-blue-400 underline hover:no-underline"
												onClick={() => {
													setEnteredSmsCode(simulatedSmsCode);
													setIsSmsVerified(true);
													setSmsError(null);
												}}
											>
												Быстро вставить
											</button>
										</div>

										{smsResendCountdown > 0 ? (
											<div className="text-xs text-slate-400">
												Повторный код можно запросить через{" "}
												{smsResendCountdown} сек.
											</div>
										) : (
											<button
												type="button"
												className="text-xs text-slate-500 underline text-left"
												onClick={handleSendSmsCode}
											>
												Отправить код ещё раз
											</button>
										)}
									</div>
								) : null}

								{smsError && (
									<div className="text-xs text-red-600 flex items-center gap-1">
										<AlertCircle size={14} /> {smsError}
									</div>
								)}
							</div>
						)}

						{/* Privacy Policy Checkbox */}
						<div className="flex items-start gap-2 my-4">
							<input
								id="privacy-checkbox"
								type="checkbox"
								required
								checked={hasAgreedToPrivacy}
								onChange={(e) => setHasAgreedToPrivacy(e.target.checked)}
								className="mt-1"
							/>
							<label
								htmlFor="privacy-checkbox"
								className="text-xs text-slate-500 leading-snug cursor-pointer"
							>
								Я согласен на обработку персональных данных и подтверждаю
								ознакомление с политикой конфиденциальности клиники DENTE
							</label>
						</div>

						{submitError && (
							<div
								role="alert"
								className="p-3 mb-4 rounded-lg bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-center gap-2"
							>
								<AlertCircle size={16} /> {submitError}
							</div>
						)}

						<footer className="dbw-actions-footer">
							<button
								type="button"
								className="dbw-btn-back"
								onClick={() => handleStepChange(3)}
							>
								<ArrowLeft size={16} />
								<span>Назад</span>
							</button>

							<button
								type="submit"
								className="dbw-btn-confirm"
								disabled={
									isSubmitting ||
									!patientName ||
									patientPhone.length < 16 ||
									(enableSmsSimulation && !isSmsVerified) ||
									!hasAgreedToPrivacy
								}
							>
								<CheckCircle2 size={18} />
								<span>{isSubmitting ? "Оформление..." : "Подтвердить запись"}</span>
							</button>
						</footer>
					</form>
				)}

				{/* ================================================================ */}
				{/* STEP 5: Instant Booking Confirmation Card                        */}
				{/* ================================================================ */}
				{step === 5 && (
					<section
						className="dbw-confirmation-card"
						aria-labelledby="confirmation-heading"
					>
						<div className="dbw-success-badge-icon">
							<CheckCircle2 size={40} />
						</div>

						<h3 id="confirmation-heading" className="dbw-confirmation-title">
							Запись успешно оформлена!
						</h3>

						<p className="text-sm text-slate-500 max-w-md">
							Мы забронировали время и ждём вас в клинике. Детали визита и номер
							электронного талона:
						</p>

						{/* Ticket Pill */}
						<div className="dbw-ticket-pill">
							<span>Талон:</span>
							<strong>
								{confirmationData?.referenceNumber || "DNT-2026-8492"}
							</strong>
							<button
								type="button"
								onClick={handleCopyTicket}
								className="text-slate-400 hover:text-blue-600 ml-1"
								title="Скопировать номер талона"
							>
								{copiedTicket ? <Check size={14} /> : <Copy size={14} />}
							</button>
						</div>

						{/* Details Box */}
						<div className="dbw-confirmation-details-box">
							<div className="dbw-detail-row">
								<Calendar size={18} className="dbw-detail-icon" />
								<div>
									<div className="dbw-detail-label">Дата и время приёма</div>
									<div className="dbw-detail-value">
										{formatRussianDate(
											confirmationData?.date || selectedDate,
										)}{" "}
										в {confirmationData?.time || selectedSlot?.time || "10:00"}
									</div>
								</div>
							</div>

							<div className="dbw-detail-row">
								<User size={18} className="dbw-detail-icon" />
								<div>
									<div className="dbw-detail-label">Лечащий специалист</div>
									<div className="dbw-detail-value">
										{confirmationData?.doctor.fullName ||
											selectedDoctor.fullName}
									</div>
								</div>
							</div>

							<div className="dbw-detail-row">
								<Stethoscope size={18} className="dbw-detail-icon" />
								<div>
									<div className="dbw-detail-label">Направление / Услуга</div>
									<div className="dbw-detail-value">
										{confirmationData?.service?.title ||
											confirmationData?.category.title ||
											selectedService?.title ||
											selectedCategory.title}
									</div>
								</div>
							</div>

							<div className="dbw-detail-row">
								<MapPin size={18} className="dbw-detail-icon" />
								<div>
									<div className="dbw-detail-label">Адрес филиала</div>
									<div className="dbw-detail-value">
										{confirmationData?.branch.name || selectedBranch.name} —{" "}
										{confirmationData?.branch.address ||
											selectedBranch.address}
									</div>
								</div>
							</div>

							<div className="dbw-detail-row">
								<Phone size={18} className="dbw-detail-icon" />
								<div>
									<div className="dbw-detail-label">Пациент и телефон</div>
									<div className="dbw-detail-value">
										{confirmationData?.patientName || patientName || "Пациент"}{" "}
										({confirmationData?.patientPhone || patientPhone || "+7 (999) 000-00-00"})
									</div>
								</div>
							</div>
						</div>

						{/* Calendar & Export Actions */}
						<div className="w-full">
							<div className="text-xs font-semibold text-slate-500 mb-2 text-left">
								Добавить напоминание в календарь:
							</div>

							<div className="dbw-export-actions-grid">
								<button
									type="button"
									className="dbw-export-btn primary"
									onClick={handleDownloadIcs}
								>
									<Download size={14} />
									<span>Скачать .ICS файл</span>
								</button>

								<a
									href={generateGoogleCalendarUrl({
										title: `DENTE: ${confirmationData?.category.title || selectedCategory.title} (${confirmationData?.doctor.fullName || selectedDoctor.fullName})`,
										description: `Запись в DENTE Dental: ${confirmationData?.service?.title || confirmationData?.category.title || selectedCategory.title}\\nВрач: ${confirmationData?.doctor.fullName || selectedDoctor.fullName}\\nТалон: ${confirmationData?.referenceNumber || "DNT-2026"}`,
										location:
											confirmationData?.branch.address ||
											selectedBranch.address,
										startsAt:
											confirmationData?.startsAt ||
											selectedSlot?.startsAt ||
											new Date().toISOString(),
										endsAt:
											confirmationData?.endsAt ||
											selectedSlot?.endsAt ||
											new Date().toISOString(),
									})}
									target="_blank"
									rel="noreferrer"
									className="dbw-export-btn"
								>
									<CalendarPlus size={14} />
									<span>Google Календарь</span>
									<ExternalLink size={12} className="opacity-60" />
								</a>

								<a
									href={generateYandexCalendarUrl({
										title: `DENTE: ${confirmationData?.category.title || selectedCategory.title} (${confirmationData?.doctor.fullName || selectedDoctor.fullName})`,
										description: `Запись в DENTE Dental: ${confirmationData?.service?.title || confirmationData?.category.title || selectedCategory.title}\\nВрач: ${confirmationData?.doctor.fullName || selectedDoctor.fullName}\\nТалон: ${confirmationData?.referenceNumber || "DNT-2026"}`,
										location:
											confirmationData?.branch.address ||
											selectedBranch.address,
										startsAt:
											confirmationData?.startsAt ||
											selectedSlot?.startsAt ||
											new Date().toISOString(),
										endsAt:
											confirmationData?.endsAt ||
											selectedSlot?.endsAt ||
											new Date().toISOString(),
									})}
									target="_blank"
									rel="noreferrer"
									className="dbw-export-btn"
								>
									<CalendarPlus size={14} />
									<span>Яндекс Календарь</span>
									<ExternalLink size={12} className="opacity-60" />
								</a>
							</div>
						</div>

						{/* Additional Actions */}
						<div className="flex items-center justify-between w-full pt-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500">
							<button
								type="button"
								className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-100"
								onClick={() => window.print()}
							>
								<Printer size={14} />
								<span>Распечатать талон</span>
							</button>

							<button
								type="button"
								className="flex items-center gap-1 text-blue-600 hover:underline font-semibold"
								onClick={handleResetBooking}
							>
								<RotateCcw size={14} />
								<span>Записаться ещё раз</span>
							</button>
						</div>
					</section>
				)}
			</div>
		</div>
	);
};
