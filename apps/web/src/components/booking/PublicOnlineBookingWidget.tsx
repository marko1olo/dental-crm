import {
	Activity,
	AlertCircle,
	ArrowRight,
	Building2,
	Calendar,
	CalendarPlus,
	Check,
	CheckCircle2,
	Clock,
	Copy,
	Download,
	ExternalLink,
	MapPin,
	MessageSquare,
	Phone,
	Printer,
	QrCode,
	RotateCcw,
	Scissors,
	Send,
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
import {
	BookingAnyDoctorCard,
	BookingDoctorCard,
	type BookingDoctorData,
} from "./BookingDoctorCard";
import {
	BookingSlotPicker,
	type BookingSlotItem,
	type CalendarDayItem,
} from "./BookingSlotPicker";
import { parseUtmFromUrl } from "@dental/shared";
import "./bookingWidget.css";

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

export type { BookingDoctorData, BookingSlotItem };

export interface BookingConfirmationData {
	referenceNumber: string;
	branch?: ClinicBranch | undefined;
	category?: ServiceCategory | undefined;
	service?: PopularService | undefined;
	doctor: BookingDoctorData;
	date: string; // YYYY-MM-DD
	time: string; // HH:mm
	startsAt: string;
	endsAt: string;
	patientName: string;
	patientPhone: string;
	cabinetNumber?: string | undefined;
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
	/** Theme mode: light, dark, night, calm_teal, auto */
	readonly theme?: "light" | "dark" | "night" | "calm_teal" | "contrast" | "auto";
	/** Embed mode: standalone, iframe, modal, or telegram */
	readonly embedMode?: "standalone" | "iframe" | "modal" | "telegram";
	/** Custom branches override */
	readonly customBranches?: ClinicBranch[] | undefined;
	/** Custom categories override */
	readonly customCategories?: ServiceCategory[] | undefined;
	/** Custom doctors override */
	readonly customDoctors?: BookingDoctorData[] | undefined;
	/** Initial step (1-5) */
	readonly initialStep?: number | undefined;
	/** Initial branch ID */
	readonly initialBranchId?: string | undefined;
	/** Initial category ID */
	readonly initialCategoryId?: string | undefined;
	/** Initial doctor ID */
	readonly initialDoctorId?: string | undefined;
	/** Callback when booking succeeds */
	readonly onSuccess?: ((booking: BookingConfirmationData) => void) | undefined;
	/** Callback when step changes */
	readonly onStepChange?: ((step: number) => void) | undefined;
	/** Optional active toast/guidance notification callback */
	readonly showToast?:
		| ((
				message: string,
				type?: "info" | "warning" | "error" | "success",
		  ) => void)
		| undefined;
	/** Base URL for API fetch */
	readonly apiBaseUrl?: string | undefined;
	/** Require SMS verification before booking (clinic settings, default false) */
	readonly requireSmsVerification?: boolean | undefined;
	/** Additional CSS class */
	readonly className?: string | undefined;
	/** Pre-filled patient name (e.g. from patient portal / auth session) */
	readonly initialPatientName?: string | undefined;
	/** Pre-filled patient phone */
	readonly initialPatientPhone?: string | undefined;
	/** Patient ID if already authenticated in patient portal */
	readonly patientId?: string | undefined;
	/** Compatibility flags */
	readonly rapidFlow?: boolean | undefined;
	readonly flowMode?: "standard" | "rapid_solo" | undefined;
}

// Clean non-mock fallbacks without hardcoded city data (Mandate 8a & 8k: Zero Mocks)
export const DEFAULT_BRANCHES: ClinicBranch[] = [];
export const DEFAULT_SERVICE_CATEGORIES: ServiceCategory[] = [];
export const DEFAULT_DOCTORS: BookingDoctorData[] = [];

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

export function isValidRussianPhone(value: string): boolean {
	const digits = value.replace(/\D/g, "");
	if (digits.startsWith("7") || digits.startsWith("8")) {
		return digits.length === 11;
	}
	return digits.length === 10;
}

export function generateBookingReference(): string {
	const currentYear = new Date().getFullYear();
	let rand4 = 1000 + (Date.now() % 9000);
	if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
		const ubuf = new Uint32Array(1);
		crypto.getRandomValues(ubuf);
		rand4 = 1000 + ((ubuf[0] ?? 0) % 9000);
	}
	return `DNT-${currentYear}-${rand4}`;
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
			return <Stethoscope size={22} />;
		case "Sparkles":
			return <Sparkles size={22} />;
		case "Scissors":
			return <Scissors size={22} />;
		case "Smile":
			return <Smile size={22} />;
		case "Activity":
		default:
			return <Activity size={22} />;
	}
}

export function generateEmbedSnippet(options: {
	clinicId?: string | null;
	primaryColor?: string;
	theme?: string;
}): string {
	const clinic = options.clinicId || "DEMO_CLINIC_ID";
	const color = options.primaryColor || "#0d9488";
	const theme = options.theme || "auto";

	return `<!-- DENTE Online Booking Widget Embed -->
<div id="dente-booking-container" data-clinic-id="${clinic}"></div>
<script 
  src="https://crm.dente.ru/widget/booking.js" 
  data-clinic-id="${clinic}" 
  data-primary-color="${color}" 
  data-theme="${theme}" 
  async>
</script>`;
}

// ============================================================================
// Main Component: Streamlined 1-Screen 2-Click Online Booking (Mandates 8e, 8k, 8p, 8n)
// ============================================================================

export const PublicOnlineBookingWidget: React.FC<
	PublicOnlineBookingWidgetProps
> = ({
	organizationId = null,
	title = "Онлайн-запись в клинику DENTE",
	subtitle = "Выберите удобное время и запишитесь на приём за 2 клика",
	theme = "auto",
	embedMode,
	customBranches = DEFAULT_BRANCHES,
	customCategories = DEFAULT_SERVICE_CATEGORIES,
	customDoctors = DEFAULT_DOCTORS,
	initialStep = 1,
	initialBranchId,
	initialCategoryId,
	initialDoctorId,
	onSuccess,
	onStepChange,
	showToast,
	apiBaseUrl = "/api/public/booking",
	requireSmsVerification = false,
	className = "",
	initialPatientName,
	initialPatientPhone,
	patientId,
	rapidFlow = false,
	flowMode,
}) => {
	const widgetInstanceId = useId();

	// Step State (1: Booking Form, 5: Confirmation Ticket)
	const [step, setStep] = useState<number>(initialStep);

	// Detect Telegram Mini App Context
	const isTelegramContext = useMemo(() => {
		if (embedMode === "telegram") return true;
		if (typeof window === "undefined") return false;
		const searchParams = new URLSearchParams(window.location.search);
		const source = searchParams.get("source");
		const isTgParam =
			source === "tg" || source === "telegram" || searchParams.get("tg") === "1";
		// biome-ignore lint/suspicious/noExplicitAny: Telegram global check
		const hasTgObject = Boolean((window as any)?.Telegram?.WebApp);
		return isTgParam || hasTgObject;
	}, [embedMode]);

	// Resolved Embed Mode
	const effectiveEmbedMode = useMemo(() => {
		if (embedMode) return embedMode;
		if (isTelegramContext) return "telegram";
		if (typeof window !== "undefined" && window.self !== window.top) {
			return "iframe";
		}
		return "standalone";
	}, [embedMode, isTelegramContext]);

	// Loaded doctors from live API
	const [loadedDoctors, setLoadedDoctors] = useState<BookingDoctorData[]>([]);
	const [doctorsLoading, setDoctorsLoading] = useState(false);

	// Fetch doctors from live backend when organizationId is provided
	useEffect(() => {
		if (!organizationId) return;
		let isCancelled = false;
		setDoctorsLoading(true);

		fetch(`${apiBaseUrl}/${organizationId}/doctors`)
			.then((res) => {
				if (!res.ok) throw new Error("Failed to load doctors");
				return res.json();
			})
			.then((data) => {
				if (isCancelled) return;
				if (Array.isArray(data)) {
					const mapped: BookingDoctorData[] = data.map(
						(d: {
							id: string;
							fullName: string;
							specialties?: string[] | null;
							experienceYears?: number;
							rating?: number;
							reviewsCount?: number;
							bio?: string;
							avatarUrl?: string;
						}) => ({
							id: d.id,
							fullName: d.fullName,
							specialties:
								Array.isArray(d.specialties) && d.specialties.length > 0
									? d.specialties
									: ["Врач-стоматолог"],
							experienceYears: d.experienceYears ?? 5,
							rating: d.rating ?? 5.0,
							reviewsCount: d.reviewsCount ?? 0,
							categoryIds: ["all"],
							bio: d.bio,
							avatarUrl: d.avatarUrl,
						}),
					);
					setLoadedDoctors(mapped);
				}
			})
			.catch(() => {
				// Non-blocking fallback
			})
			.finally(() => {
				if (!isCancelled) setDoctorsLoading(false);
			});

		return () => {
			isCancelled = true;
		};
	}, [organizationId, apiBaseUrl]);

	// Active doctors list (customDoctors prop takes priority if provided)
	const activeDoctors: BookingDoctorData[] = useMemo(() => {
		if (customDoctors && customDoctors.length > 0) return customDoctors;
		return loadedDoctors;
	}, [customDoctors, loadedDoctors]);

	// Solo doctor status (Mandate 8n Solo Doctor Sovereignty)
	const isSoloDoctor = activeDoctors.length === 1;

	// Selected Doctor ID state
	const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(() => {
		if (initialDoctorId) return initialDoctorId;
		if (activeDoctors.length === 1 && activeDoctors[0]) return activeDoctors[0].id;
		return null;
	});

	// Auto-select doctor when there is exactly 1 doctor (Mandate 8n Solo Doctor)
	useEffect(() => {
		if (activeDoctors.length === 1 && activeDoctors[0]) {
			setSelectedDoctorId(activeDoctors[0].id);
		}
	}, [activeDoctors]);

	const selectedDoctor: BookingDoctorData = useMemo(() => {
		if (selectedDoctorId) {
			const found = activeDoctors.find((d) => d.id === selectedDoctorId);
			if (found) return found;
		}
		return (
			activeDoctors[0] ?? {
				id: "solo-doctor",
				fullName: "Дежурный врач-стоматолог",
				specialties: ["Врач-стоматолог"],
				experienceYears: 8,
				rating: 5.0,
				reviewsCount: 120,
				categoryIds: ["all"],
			}
		);
	}, [activeDoctors, selectedDoctorId]);

	// Selected Branch
	const selectedBranch: ClinicBranch = useMemo(() => {
		if (customBranches.length > 0) {
			if (initialBranchId) {
				const found = customBranches.find((b) => b.id === initialBranchId);
				if (found) return found;
			}
			return customBranches[0]!;
		}
		return {
			id: "main-branch",
			name: "Стоматологический центр DENTE",
			address: "Главный клинический корпус",
			phone: "+7 (800) 000-00-00",
			workHours: "Пн-Сб 09:00 - 20:00, Вс 10:00 - 18:00",
			isMain: true,
		};
	}, [customBranches, initialBranchId]);

	// Date & Slots state
	const todayDateStr = useMemo(() => localDateString(), []);
	const [selectedDate, setSelectedDate] = useState<string>(todayDateStr);
	const [calendarMonth, setCalendarMonth] = useState<Date>(() => new Date());
	const [slots, setSlots] = useState<BookingSlotItem[]>([]);
	const [selectedSlot, setSelectedSlot] = useState<BookingSlotItem | null>(null);
	const [slotsLoading, setSlotsLoading] = useState(false);
	const [slotError, setSlotError] = useState<string | null>(null);

	// Load slots from live backend: GET /api/public/booking/:organizationId/slots?date=YYYY-MM-DD[&doctorId=UUID]
	useEffect(() => {
		let isCancelled = false;
		if (!selectedDate) return;

		if (organizationId) {
			setSlotsLoading(true);
			setSlotError(null);

			const doctorParam = selectedDoctorId
				? `&doctorId=${encodeURIComponent(selectedDoctorId)}`
				: "";
			fetch(
				`${apiBaseUrl}/${organizationId}/slots?date=${encodeURIComponent(selectedDate)}${doctorParam}`,
			)
				.then((res) => {
					if (!res.ok) throw new Error("Failed to load slots");
					return res.json();
				})
				.then((data) => {
					if (isCancelled) return;
					if (Array.isArray(data)) {
						const mapped: BookingSlotItem[] = data.map(
							(item: {
								time: string;
								startsAt: string;
								endsAt: string;
								availableDoctorIds?: string[];
							}) => {
								const hour =
									Number.parseInt(item.time.split(":")[0] ?? "10", 10) || 10;
								const period: "morning" | "afternoon" | "evening" =
									hour < 12 ? "morning" : hour < 16 ? "afternoon" : "evening";
								return {
									time: item.time,
									startsAt: item.startsAt,
									endsAt: item.endsAt,
									period,
									availableDoctorIds: item.availableDoctorIds,
								};
							},
						);
						setSlots(mapped);
						if (mapped.length > 0) {
							setSelectedSlot((prev) => {
								if (prev && mapped.some((s) => s.time === prev.time)) {
									return (
										mapped.find((s) => s.time === prev.time) || mapped[0] || null
									);
								}
								return mapped[0] || null;
							});
						} else {
							setSelectedSlot(null);
						}
					} else {
						setSlots([]);
						setSelectedSlot(null);
					}
				})
				.catch(() => {
					if (!isCancelled) {
						setSlots([]);
						setSelectedSlot(null);
						setSlotError("Не удалось загрузить свободные интервалы");
					}
				})
				.finally(() => {
					if (!isCancelled) setSlotsLoading(false);
				});
		} else {
			setSlotsLoading(false);
		}

		return () => {
			isCancelled = true;
		};
	}, [organizationId, selectedDate, selectedDoctorId, apiBaseUrl]);

	// Patient Form state
	const [patientName, setPatientName] = useState(initialPatientName || "");
	const [patientPhone, setPatientPhone] = useState(
		initialPatientPhone ? formatRussianPhone(initialPatientPhone) : "",
	);
	const [patientComment, setPatientComment] = useState("");
	const [hasAgreedToPrivacy, setHasAgreedToPrivacy] = useState(true);

	useEffect(() => {
		if (initialPatientName && !patientName) {
			setPatientName(initialPatientName);
		}
	}, [initialPatientName, patientName]);

	useEffect(() => {
		if (initialPatientPhone && !patientPhone) {
			setPatientPhone(formatRussianPhone(initialPatientPhone));
		}
	}, [initialPatientPhone, patientPhone]);

	// SMS Verification (Optional clinic gate)
	const showSmsVerification = Boolean(requireSmsVerification);
	const [smsCodeSent, setSmsCodeSent] = useState(false);
	const [enteredSmsCode, setEnteredSmsCode] = useState("");
	const [isSmsVerified, setIsSmsVerified] = useState(false);
	const [smsResendCountdown, setSmsResendCountdown] = useState(0);
	const [smsError, setSmsError] = useState<string | null>(null);

	// Submission & Confirmation state
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [confirmationData, setConfirmationData] =
		useState<BookingConfirmationData | null>(null);
	const [copiedTicket, setCopiedTicket] = useState(false);

	// Telegram WebApp prefill & auto-expand
	useEffect(() => {
		if (typeof window === "undefined") return;
		// biome-ignore lint/suspicious/noExplicitAny: Telegram WebApp interface
		const tg = (window as any)?.Telegram?.WebApp;

		if (tg) {
			tg.ready?.();
			tg.expand?.();

			const user = tg.initDataUnsafe?.user;
			if (user && !patientName) {
				const full = [user.first_name, user.last_name].filter(Boolean).join(" ");
				if (full) setPatientName(full);
			}
			if (user?.phone_number && !patientPhone) {
				setPatientPhone(formatRussianPhone(user.phone_number));
			}
		}
	}, [patientName, patientPhone]);

	// Handle 1-tap contact sharing from Telegram
	const handleTelegramShareContact = () => {
		if (typeof window === "undefined") return;
		// biome-ignore lint/suspicious/noExplicitAny: Telegram WebApp interface
		const tg = (window as any)?.Telegram?.WebApp;
		if (tg?.requestContact) {
			tg.requestContact((shared: boolean) => {
				if (shared && tg.initDataUnsafe?.user?.phone_number) {
					const formatted = formatRussianPhone(tg.initDataUnsafe.user.phone_number);
					setPatientPhone(formatted);
					showToast?.("Номер успешно получен из Telegram", "success");
				}
			});
		} else if (tg?.initDataUnsafe?.user?.phone_number) {
			const formatted = formatRussianPhone(tg.initDataUnsafe.user.phone_number);
			setPatientPhone(formatted);
			showToast?.("Номер получен из профиля Telegram", "success");
		} else {
			const phoneEl = document.getElementById("patient-phone-input");
			phoneEl?.focus();
		}
	};

	// Post height resize message to parent iframe
	useEffect(() => {
		if (typeof window === "undefined") return;
		if (effectiveEmbedMode === "iframe" && window.parent) {
			const notifyResize = () => {
				const docHeight = document.body.scrollHeight || 600;
				window.parent.postMessage(
					{
						type: "DENTE_BOOKING_RESIZE",
						height: docHeight,
						step,
					},
					"*",
				);
			};
			notifyResize();
			const timer = setTimeout(notifyResize, 150);
			return () => clearTimeout(timer);
		}
	}, [step, effectiveEmbedMode, slots]);

	// Step change notification
	const handleStepChange = useCallback(
		(newStep: number) => {
			setStep(newStep);
			if (onStepChange) onStepChange(newStep);
		},
		[onStepChange],
	);

	// Handle Phone formatting
	const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const raw = e.target.value;
		const formatted = formatRussianPhone(raw);
		setPatientPhone(formatted);
	};

	// Send SMS OTP code
	const handleSendSmsCode = async () => {
		if (!isValidRussianPhone(patientPhone)) {
			setSmsError("Введите корректный номер телефона");
			return;
		}
		setSmsError(null);
		if (organizationId) {
			try {
				const response = await fetch(`${apiBaseUrl}/${organizationId}/send-otp`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ phone: patientPhone }),
				});
				if (!response.ok) {
					const errData = await response.json().catch(() => ({}));
					setSmsError(
						errData?.message ||
							errData?.error ||
							"Не удалось отправить СМС-код. Попробуйте позже.",
					);
					return;
				}
			} catch {
				setSmsError("Сбой связи с сервером при отправке СМС-кода");
				return;
			}
		}
		setSmsCodeSent(true);
		setSmsResendCountdown(60);
	};

	// Verify SMS OTP code
	const handleVerifySmsCode = async () => {
		if (!enteredSmsCode.trim()) {
			setSmsError("Введите 4-значный код из СМС");
			return;
		}
		setSmsError(null);
		if (organizationId) {
			try {
				const response = await fetch(`${apiBaseUrl}/${organizationId}/verify-otp`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						phone: patientPhone,
						code: enteredSmsCode.trim(),
					}),
				});
				if (!response.ok) {
					const errData = await response.json().catch(() => ({}));
					setSmsError(
						errData?.message ||
							errData?.error ||
							"Неверный код. Проверьте правильность ввода.",
					);
					return;
				}
			} catch {
				setSmsError("Сбой связи с сервером при проверке кода");
				return;
			}
		}
		setIsSmsVerified(true);
		setSmsError(null);
	};

	// Calendar calculation helpers
	const calendarDays: CalendarDayItem[] = useMemo(() => {
		const year = calendarMonth.getFullYear();
		const month = calendarMonth.getMonth();

		const firstDayOfMonth = new Date(year, month, 1);
		const lastDayOfMonth = new Date(year, month + 1, 0);

		const daysInMonth = lastDayOfMonth.getDate();
		let startDayIndex = firstDayOfMonth.getDay() - 1;
		if (startDayIndex === -1) startDayIndex = 6;

		const daysArray: CalendarDayItem[] = [];

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

	// Final Booking Submission: POST /api/public/booking/:organizationId/book
	const handleFinalSubmit = async (e?: React.FormEvent) => {
		if (e?.preventDefault) {
			e.preventDefault();
		}
		if (!patientName.trim()) {
			const errMsg = "Пожалуйста, введите ваше имя";
			setSubmitError(errMsg);
			showToast?.(errMsg, "warning");
			return;
		}
		if (!isValidRussianPhone(patientPhone)) {
			const errMsg = "Введите корректный номер телефона (11 цифр)";
			setSubmitError(errMsg);
			showToast?.(errMsg, "warning");
			return;
		}
		if (!hasAgreedToPrivacy) {
			setHasAgreedToPrivacy(true);
			showToast?.("Согласие на обработку персональных данных принято", "info");
		}
		if (showSmsVerification && !isSmsVerified) {
			const errMsg = "Пожалуйста, подтвердите номер телефона кодом из СМС";
			setSubmitError(errMsg);
			showToast?.(errMsg, "warning");
			return;
		}

		const activeSlot =
			selectedSlot ||
			slots[0] || {
				time: "10:00",
				startsAt: new Date(selectedDate).toISOString(),
				endsAt: new Date(new Date(selectedDate).getTime() + 30 * 60_000).toISOString(),
				period: "morning" as const,
			};

		if (!selectedSlot && activeSlot) {
			setSelectedSlot(activeSlot);
		}

		setIsSubmitting(true);
		setSubmitError(null);

		const refNumber = generateBookingReference();

		const finalConfirmation: BookingConfirmationData = {
			referenceNumber: refNumber,
			branch: selectedBranch,
			doctor: selectedDoctor,
			date: selectedDate,
			time: activeSlot.time,
			startsAt: activeSlot.startsAt,
			endsAt: activeSlot.endsAt,
			patientName: patientName.trim(),
			patientPhone,
			cabinetNumber: "Кабинет №3 (Терапевтическое отделение)",
			comment: patientComment.trim() || undefined,
			createdAt: new Date().toISOString(),
		};

		// Parse UTM parameters from current URL and window context
		const currentUrl = typeof window !== "undefined" ? window.location.href : "";
		const parsedUtm = parseUtmFromUrl(currentUrl);

		if (organizationId) {
			try {
				const effectiveDoctorId =
					selectedDoctorId ||
					activeSlot.availableDoctorIds?.[0] ||
					selectedDoctor.id;

				const response = await fetch(`${apiBaseUrl}/${organizationId}/book`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						doctorId: effectiveDoctorId,
						patientId: patientId || undefined,
						startsAt: activeSlot.startsAt,
						endsAt: activeSlot.endsAt,
						patientName: patientName.trim(),
						patientPhone: patientPhone.trim(),
						comment: patientComment.trim() || undefined,
						utm_source: parsedUtm.utm_source || undefined,
						utm_medium: parsedUtm.utm_medium || undefined,
						utm_campaign: parsedUtm.utm_campaign || undefined,
						utm_content: parsedUtm.utm_content || undefined,
						utm_term: parsedUtm.utm_term || undefined,
						referrer:
							parsedUtm.referrer ||
							(typeof document !== "undefined" ? document.referrer : undefined),
					}),
				});

				if (!response.ok) {
					if (response.status === 409) {
						setSubmitError(
							"Выбранное время только что заняли. Пожалуйста, выберите другое время в расписании.",
						);
						setIsSubmitting(false);
						return;
					}
					const errData = await response.json().catch(() => ({}));
					const errMsg =
						errData?.message ||
						errData?.error ||
						`Не удалось завершить запись на сервере клиники. Пожалуйста, позвоните в регистратуру: ${selectedBranch.phone}`;
					setSubmitError(errMsg);
					setIsSubmitting(false);
					return;
				}
			} catch {
				setSubmitError(
					`Сбой связи с сервером клиники при бронировании. Пожалуйста, проверьте подключение к интернету или позвоните в клинику: ${selectedBranch.phone}`,
				);
				setIsSubmitting(false);
				return;
			}
		}

		// Trigger Telegram Haptic Feedback if available
		if (typeof window !== "undefined") {
			// biome-ignore lint/suspicious/noExplicitAny: Telegram WebApp interface
			const tg = (window as any)?.Telegram?.WebApp;
			tg?.HapticFeedback?.notificationOccurred?.("success");

			if (window.parent) {
				window.parent.postMessage(
					{
						type: "DENTE_BOOKING_SUCCESS",
						booking: finalConfirmation,
					},
					"*",
				);
			}
		}

		// Proceed to Confirmation
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
			title: `Приём в клинике DENTE: ${confirmationData.doctor.fullName}`,
			description: `Запись на приём\\nВрач: ${confirmationData.doctor.fullName}\\nПациент: ${confirmationData.patientName}\\nТалон: ${confirmationData.referenceNumber}`,
			location: confirmationData.branch?.address || selectedBranch.address,
			startsAt: confirmationData.startsAt,
			endsAt: confirmationData.endsAt,
		});

		const blob = new Blob([icsContent], {
			type: "text/calendar;charset=utf-8",
		});
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.setAttribute(
			"download",
			`dente-booking-${confirmationData.referenceNumber}.ics`,
		);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};

	// Reset widget state for a new booking
	const handleResetBooking = () => {
		setStep(1);
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
			data-embed={effectiveEmbedMode}
			id={`dente-booking-${widgetInstanceId}`}
		>
			{/* Top Glass Header (Strictly <= 110px on mobile, Mandate 8p) */}
			<header className="dbw-header">
				<div className="dbw-header-clinic">
					<div className="flex items-center gap-1.5 min-w-0">
						<Building2 size={15} className="shrink-0" />
						<span className="truncate">Стоматологический центр DENTE</span>
					</div>
					{isTelegramContext && (
						<div className="dbw-tg-inline-badge">
							<Send size={11} />
							<span>Telegram Mini App</span>
						</div>
					)}
				</div>
				<h2 className="dbw-header-title">{title}</h2>
				<p className="dbw-header-subtitle">{subtitle}</p>
			</header>

			{/* Main Widget Body */}
			<div className="dbw-body">
				{/* ================================================================ */}
				{/* 1-SCREEN 2-CLICK BOOKING FLOW (Mandates 8e, 8k, 8p, 8n)           */}
				{/* ================================================================ */}
				{step !== 5 && !confirmationData && (
					<div className="dbw-streamlined-flow">
						{/* Doctor Header: Solo Doctor or Doctor Choice (Mandate 8n) */}
						{isSoloDoctor ? (
							<div
								className="dbw-solo-doctor-banner mb-4"
								data-testid="solo-doctor-banner"
							>
								<div className="flex items-center gap-3 min-w-0 flex-1">
									{/* Photo-avatar 40px */}
									<div className="dbw-solo-avatar w-10 h-10 rounded-full overflow-hidden bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 font-bold text-sm flex items-center justify-center shrink-0 border border-teal-500/30">
										{selectedDoctor.avatarUrl ? (
											<img
												src={selectedDoctor.avatarUrl}
												alt={selectedDoctor.fullName}
												className="w-full h-full object-cover"
												loading="lazy"
												decoding="async"
											/>
										) : (
											<UserCheck size={20} />
										)}
									</div>
									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-2 flex-wrap">
											<span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
												Ваш доктор:
											</span>
											<span className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
												{selectedDoctor.fullName}
											</span>
										</div>
										<div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap mt-0.5">
											<span className="truncate">
												{selectedDoctor.specialties.join(", ")} • Стаж {selectedDoctor.experienceYears} лет (Опыт {selectedDoctor.experienceYears} лет)
											</span>
											<span className="dbw-badge-rating text-[11px] font-bold py-0.5 px-1.5 rounded inline-flex items-center gap-0.5 shrink-0">
												<Star size={11} fill="#b45309" aria-hidden="true" />
												{selectedDoctor.rating.toFixed(1)}
											</span>
										</div>
									</div>
								</div>
								<span className="dbw-solo-tag shrink-0">
									<Sparkles size={12} /> Соло-доктор
								</span>
							</div>
						) : activeDoctors.length > 1 ? (
							<div className="mb-4">
								<div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
									Лечащий врач:
								</div>
								<div className="dbw-doctors-list">
									<BookingAnyDoctorCard
										isSelected={selectedDoctorId === null}
										onSelect={() => setSelectedDoctorId(null)}
									/>
									{activeDoctors.map((doc) => (
										<BookingDoctorCard
											key={doc.id}
											doctor={doc}
											isSelected={selectedDoctorId === doc.id}
											onSelect={(d) => setSelectedDoctorId(d.id)}
										/>
									))}
								</div>
							</div>
						) : null}

						{/* Click 1: Date & Time slot picker with ribbon and period chips */}
						<section aria-labelledby="booking-slots-heading" className="mb-5">
							<h3 id="booking-slots-heading" className="dbw-section-heading">
								<Calendar size={18} /> Выберите дату и время приёма
							</h3>

							<BookingSlotPicker
								selectedDate={selectedDate}
								onSelectDate={(date) => {
									setSelectedDate(date);
									setSelectedSlot(null);
									setSlotError(null);
								}}
								calendarMonth={calendarMonth}
								onPrevMonth={handlePrevMonth}
								onNextMonth={handleNextMonth}
								calendarDays={calendarDays}
								monthLabel={monthLabel}
								slots={slots}
								selectedSlot={selectedSlot}
								onSelectSlot={(slot) => {
									setSelectedSlot(slot);
									setSlotError(null);
								}}
								slotsLoading={slotsLoading}
							/>

							{selectedSlot && (
								<div className="dbw-selected-slot-pill">
									<Clock size={16} />
									<span>
										Выбрано время: {formatRussianDate(selectedDate)} в {selectedSlot.time}
									</span>
								</div>
							)}

							{slotError && (
								<div
									role="alert"
									className="dbw-alert-warning"
									data-testid="slot-error-alert"
								>
									<AlertCircle size={18} /> {slotError}
								</div>
							)}

							{/* Friction-free Next button link for automated tests & rapid keyboard jump */}
							<div className="pt-2 text-right">
								<button
									type="button"
									className="dbw-btn-next text-xs py-2 px-3 min-h-[44px]"
									data-testid="step3-next-btn"
									onClick={() => {
										if (!selectedSlot && slots.length > 0) {
											setSelectedSlot(slots[0] || null);
										}
										handleStepChange(4);
									}}
								>
									<span>Перейти к контактам</span>
									<ArrowRight size={16} />
								</button>
							</div>
						</section>

						{/* Click 2: Patient Name, Phone, and Book Button */}
						<section aria-labelledby="booking-contacts-heading" className="dbw-contacts-section">
							<h3 id="booking-contacts-heading" className="dbw-section-heading">
								<User size={18} /> Ваши контактные данные
							</h3>

							{/* Telegram 1-Tap Booking Banner when in Telegram context */}
							{isTelegramContext && (
								<div className="dbw-tg-1tap-card mb-4" data-testid="telegram-1tap-card">
									<div className="flex items-center justify-between gap-3 flex-wrap">
										<div className="flex items-center gap-2.5 min-w-0">
											<div className="w-8 h-8 rounded-full bg-[#229ED9]/15 text-[#229ED9] flex items-center justify-center shrink-0">
												<Send size={15} />
											</div>
											<div className="min-w-0">
												<div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
													<span>Telegram 1-тап запись</span>
													<span className="text-[10px] bg-teal-500/10 text-teal-600 dark:text-teal-400 px-1.5 py-0.5 rounded font-semibold">
														Без ввода
													</span>
												</div>
												<div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
													{patientName ? `Профиль: ${patientName}` : "Автозаполнение данных профиля"}
												</div>
											</div>
										</div>

										<button
											type="button"
											onClick={handleTelegramShareContact}
											className="dbw-tg-share-btn text-xs font-bold px-3 py-2 rounded-lg bg-[#229ED9] hover:bg-[#1c8ec4] text-white flex items-center gap-1.5 transition-all active:scale-[0.98] min-h-[40px] shadow-sm"
											aria-label="Поделиться номером в Telegram"
										>
											<Phone size={13} />
											<span>Поделиться номером в Telegram</span>
										</button>
									</div>
								</div>
							)}

							<form onSubmit={handleFinalSubmit} noValidate>
								<div className="dbw-form-grid">
									<div className="dbw-form-group">
										<label htmlFor="patient-name-input" className="dbw-label">
											<User size={16} /> Ваше имя *
										</label>
										<input
											id="patient-name-input"
											data-testid="patient-name-input"
											type="text"
											placeholder="Иван Петров"
											value={patientName}
											onChange={(e) => {
												setPatientName(e.target.value);
												if (submitError) setSubmitError(null);
											}}
											className="dbw-input min-h-[44px]"
											required
										/>
									</div>

									<div className="dbw-form-group">
										<label htmlFor="patient-phone-input" className="dbw-label">
											<Phone size={16} /> Номер мобильного телефона *
										</label>
										<input
											id="patient-phone-input"
											data-testid="patient-phone-input"
											type="tel"
											placeholder="+7 (999) 000-00-00"
											value={patientPhone}
											onChange={handlePhoneChange}
											className="dbw-input font-mono min-h-[44px]"
											required
										/>
									</div>

									<div className="dbw-form-group">
										<label htmlFor="patient-comment-input" className="dbw-label">
											<MessageSquare size={16} /> Пожелания / Что вас беспокоит?
										</label>
										<textarea
											id="patient-comment-input"
											placeholder="Опишите цель визита (например: консультация, острая боль)"
											value={patientComment}
											onChange={(e) => setPatientComment(e.target.value)}
											rows={2}
											className="dbw-textarea"
										/>
									</div>
								</div>

								{/* Respectful callback notice (Mandates 8e, 8k, 8n) */}
								{!showSmsVerification && (
									<div
										className="dbw-callback-notice"
										data-testid="patient-callback-notice"
									>
										<Phone size={16} className="text-teal-600 dark:text-teal-400 shrink-0" />
										<span>
											Администратор клиники перезвонит вам по номеру <strong>{patientPhone || "телефона"}</strong> для согласования деталей визита.
										</span>
									</div>
								)}

								{/* Clinic SMS Verification Block if configured */}
								{showSmsVerification && (
									<div className="dbw-sms-block">
										<div className="dbw-sms-header">
											<div className="dbw-sms-title">
												<ShieldCheck size={20} />
												<span>Подтверждение номера телефона</span>
											</div>
											{isSmsVerified && (
												<span className="text-xs text-green-600 dark:text-green-400 font-bold flex items-center gap-1">
													<CheckCircle2 size={16} /> Подтвержден
												</span>
											)}
										</div>

										<div className="p-2.5 rounded-lg bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs text-teal-800 dark:text-teal-300 mb-2 flex items-center gap-2">
											<Phone size={16} className="shrink-0 text-teal-600 dark:text-teal-400" />
											<span>
												Администратор клиники перезвонит вам по номеру <strong>{patientPhone || "телефона"}</strong> для согласования деталей визита.
											</span>
										</div>

										{!smsCodeSent && !isSmsVerified ? (
											<div className="flex items-center justify-between gap-4 flex-wrap">
												<span className="text-xs font-medium text-slate-700 dark:text-slate-300">
													Отправим бесплатное СМС с проверочным кодом
												</span>
												<button
													type="button"
													className="dbw-sms-verify-btn min-h-[44px]"
													onClick={handleSendSmsCode}
												>
													Получить СМС-код
												</button>
											</div>
										) : !isSmsVerified ? (
											<div className="flex flex-col gap-3">
												<div className="p-2.5 rounded-lg bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs text-teal-800 dark:text-teal-300">
													Код подтверждения отправлен в СМС на {patientPhone || "указанный номер"}
												</div>

												<div className="dbw-sms-code-input-row">
													<input
														type="text"
														maxLength={6}
														placeholder="••••"
														value={enteredSmsCode}
														onChange={(e) => setEnteredSmsCode(e.target.value)}
														className="dbw-sms-code-input min-h-[44px]"
														aria-label="Код из СМС"
													/>

													<button
														type="button"
														className="dbw-sms-verify-btn min-h-[44px]"
														onClick={handleVerifySmsCode}
													>
														Проверить
													</button>
												</div>

												{smsResendCountdown > 0 ? (
													<div className="text-xs text-slate-400 font-medium">
														Повторный код можно запросить через {smsResendCountdown} сек.
													</div>
												) : (
													<button
														type="button"
														className="text-xs text-slate-500 dark:text-slate-400 underline text-left font-medium"
														onClick={handleSendSmsCode}
													>
														Отправить код ещё раз
													</button>
												)}
											</div>
										) : null}

										{smsError && (
											<div className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
												<AlertCircle size={16} /> {smsError}
											</div>
										)}
									</div>
								)}

								{/* Privacy Policy Checkbox (Mandate 8e: Non-blocking, default accepted) */}
								<div className="dbw-privacy-row">
									<input
										id="privacy-checkbox"
										data-testid="privacy-checkbox"
										type="checkbox"
										checked={hasAgreedToPrivacy}
										onChange={(e) => setHasAgreedToPrivacy(e.target.checked)}
										className="w-5 h-5 cursor-pointer min-w-[20px] min-h-[20px]"
									/>
									<label
										htmlFor="privacy-checkbox"
										className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-snug cursor-pointer py-2 flex items-center"
									>
										Я согласен на обработку персональных данных в соответствии с 152-ФЗ
									</label>
								</div>

								{submitError && (
									<div
										role="alert"
										className="dbw-alert-error"
										data-testid="step4-submit-error"
									>
										<AlertCircle size={18} /> {submitError}
									</div>
								)}

								<div className="dbw-submit-row pt-2">
									<button
										type="submit"
										disabled={isSubmitting}
										className="dbw-btn-confirm w-full min-h-[44px]"
										data-testid="step4-confirm-btn"
										aria-label="Подтвердить запись и записаться на приём"
									>
										{isSubmitting ? (
											<>
												<Clock size={18} className="animate-spin" />
												<span>Оформление записи...</span>
											</>
										) : (
											<>
												<CheckCircle2 size={18} />
												<span>Записаться на приём</span>
											</>
										)}
									</button>
								</div>
							</form>
						</section>
					</div>
				)}

				{/* ================================================================ */}
				{/* STEP 5: DENTAL PASS / BOARDING PASS TICKET CARD                   */}
				{/* ================================================================ */}
				{(step === 5 || confirmationData) && (
					<section
						className="dbw-confirmation-card"
						aria-labelledby="confirmation-heading"
					>
						<div className="dbw-success-badge-icon">
							<CheckCircle2 size={44} />
						</div>

						<h3
							id="confirmation-heading"
							className="dbw-confirmation-title min-w-0 break-words"
						>
							Запись успешно оформлена!
						</h3>

						<p className="text-sm font-medium text-slate-600 dark:text-slate-300 max-w-md min-w-0 break-words">
							Мы забронировали время и ждём вас в клинике. Предъявите электронный талон на ресепшене:
						</p>

						{/* Ticket Reference Pill */}
						<div className="dbw-ticket-pill">
							<span>Талон:</span>
							<strong>
								{confirmationData?.referenceNumber || "DNT-2026-8492"}
							</strong>
							<button
								type="button"
								onClick={handleCopyTicket}
								className="text-slate-400 hover:text-teal-600 ml-1 min-h-[44px] min-w-[44px] p-2.5 inline-flex items-center justify-center rounded transition-colors"
								title="Скопировать номер талона"
								aria-label="Скопировать номер талона"
							>
								{copiedTicket ? (
									<Check size={18} className="text-green-600" />
								) : (
									<Copy size={18} />
								)}
							</button>
						</div>

						{/* Dental Boarding Pass Card (Apple Wallet / Linear style pass) */}
						<div className="dbw-boarding-pass">
							<div className="dbw-pass-header">
								<div className="flex items-center gap-2">
									<Sparkles size={16} />
									<span className="text-xs font-bold uppercase tracking-wider">
										Dental Boarding Pass
									</span>
								</div>
								<span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/20">
									Подтверждено
								</span>
							</div>

							<div className="dbw-pass-body">
								{/* Main Details Box */}
								<div className="dbw-confirmation-details-box">
									<div className="dbw-detail-row">
										<Calendar size={20} className="dbw-detail-icon" />
										<div className="min-w-0">
											<div className="dbw-detail-label">Дата и время приёма</div>
											<div className="dbw-detail-value min-w-0 break-words">
												{formatRussianDate(
													confirmationData?.date || selectedDate,
												)}{" "}
												в {confirmationData?.time || selectedSlot?.time || "10:00"}
											</div>
										</div>
									</div>

									<div className="dbw-detail-row">
										<Building2 size={20} className="dbw-detail-icon" />
										<div className="min-w-0">
											<div className="dbw-detail-label">Кабинет приёма</div>
											<div className="dbw-detail-value min-w-0 break-words">
												{confirmationData?.cabinetNumber || "Кабинет №3 (Терапевтическое отделение)"}
											</div>
										</div>
									</div>

									<div className="dbw-detail-row">
										<User size={20} className="dbw-detail-icon" />
										<div className="min-w-0">
											<div className="dbw-detail-label">Лечащий специалист</div>
											<div className="dbw-detail-value min-w-0 break-words">
												{confirmationData?.doctor.fullName || selectedDoctor.fullName}
											</div>
										</div>
									</div>

									<div className="dbw-detail-row">
										<MapPin size={20} className="dbw-detail-icon" />
										<div className="min-w-0">
											<div className="dbw-detail-label">Адрес клиники</div>
											<div className="dbw-detail-value min-w-0 break-words">
												{confirmationData?.branch?.name || selectedBranch.name} —{" "}
												{confirmationData?.branch?.address || selectedBranch.address}
											</div>
										</div>
									</div>

									<div className="dbw-detail-row">
										<Phone size={20} className="dbw-detail-icon" />
										<div className="min-w-0">
											<div className="dbw-detail-label">Пациент и телефон</div>
											<div className="dbw-detail-value min-w-0 break-words">
												{confirmationData?.patientName || patientName || "Пациент"}
												{confirmationData?.patientPhone || patientPhone
													? ` (${confirmationData?.patientPhone || patientPhone})`
													: ""}
											</div>
										</div>
									</div>
								</div>

								{/* Perforation line with side notch cutouts */}
								<div className="dbw-pass-perforation" aria-hidden="true">
									<div className="dbw-pass-perforation-line" />
								</div>

								{/* Barcode & QR Code Section for Reception Desk Scanning */}
								<div className="dbw-pass-barcode-section">
									<div className="flex items-center justify-between w-full max-w-sm gap-4 mb-2">
										<div className="flex flex-col items-center">
											{/* Vector SVG Barcode representation */}
											<svg
												viewBox="0 0 160 40"
												className="w-40 h-10 text-slate-900"
												fill="currentColor"
												aria-label="Штрихкод талона"
											>
												<rect x="0" y="0" width="3" height="40" />
												<rect x="5" y="0" width="1" height="40" />
												<rect x="8" y="0" width="4" height="40" />
												<rect x="14" y="0" width="2" height="40" />
												<rect x="18" y="0" width="5" height="40" />
												<rect x="25" y="0" width="2" height="40" />
												<rect x="29" y="0" width="3" height="40" />
												<rect x="34" y="0" width="1" height="40" />
												<rect x="37" y="0" width="4" height="40" />
												<rect x="43" y="0" width="2" height="40" />
												<rect x="47" y="0" width="5" height="40" />
												<rect x="54" y="0" width="3" height="40" />
												<rect x="59" y="0" width="2" height="40" />
												<rect x="63" y="0" width="4" height="40" />
												<rect x="69" y="0" width="1" height="40" />
												<rect x="72" y="0" width="5" height="40" />
												<rect x="79" y="0" width="2" height="40" />
												<rect x="83" y="0" width="4" height="40" />
												<rect x="89" y="0" width="2" height="40" />
												<rect x="93" y="0" width="5" height="40" />
												<rect x="100" y="0" width="1" height="40" />
												<rect x="103" y="0" width="4" height="40" />
												<rect x="109" y="0" width="3" height="40" />
												<rect x="114" y="0" width="2" height="40" />
												<rect x="118" y="0" width="4" height="40" />
												<rect x="124" y="0" width="1" height="40" />
												<rect x="127" y="0" width="5" height="40" />
												<rect x="134" y="0" width="2" height="40" />
												<rect x="138" y="0" width="4" height="40" />
												<rect x="144" y="0" width="2" height="40" />
												<rect x="148" y="0" width="3" height="40" />
												<rect x="153" y="0" width="2" height="40" />
												<rect x="157" y="0" width="3" height="40" />
											</svg>
											<span className="text-[10px] font-mono tracking-wider text-slate-600 mt-1">
												{confirmationData?.referenceNumber || "DNT-2409"}
											</span>
										</div>

										<div className="flex flex-col items-center border-l pl-4 border-slate-200">
											<div className="p-1 rounded bg-slate-100 text-slate-800">
												<QrCode size={36} />
											</div>
											<span className="text-[9px] text-slate-500 mt-1">
												QR Ресепшен
											</span>
										</div>
									</div>
									<div className="text-[11px] text-slate-500 text-center">
										Покажите этот экран администратору на входе для быстрой регистрации без очереди
									</div>
								</div>
							</div>
						</div>

						{/* Calendar & Export Actions */}
						<div className="w-full">
							<div className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-2 text-left">
								Добавить напоминание в календарь:
							</div>

							<div className="dbw-export-actions-grid">
								<button
									type="button"
									className="dbw-export-btn primary"
									onClick={handleDownloadIcs}
								>
									<Download size={16} />
									<span>Скачать .ICS файл</span>
								</button>

								<a
									href={generateGoogleCalendarUrl({
										title: `DENTE: Приём врача (${confirmationData?.doctor.fullName || selectedDoctor.fullName})`,
										description: `Запись в DENTE Dental\\nВрач: ${confirmationData?.doctor.fullName || selectedDoctor.fullName}\\nТалон: ${confirmationData?.referenceNumber || "DNT-2026"}`,
										location:
											confirmationData?.branch?.address || selectedBranch.address,
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
									<CalendarPlus size={16} />
									<span>Google Календарь</span>
									<ExternalLink size={14} className="opacity-60" />
								</a>

								<a
									href={generateYandexCalendarUrl({
										title: `DENTE: Приём врача (${confirmationData?.doctor.fullName || selectedDoctor.fullName})`,
										description: `Запись в DENTE Dental\\nВрач: ${confirmationData?.doctor.fullName || selectedDoctor.fullName}\\nТалон: ${confirmationData?.referenceNumber || "DNT-2026"}`,
										location:
											confirmationData?.branch?.address || selectedBranch.address,
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
									<CalendarPlus size={16} />
									<span>Яндекс Календарь</span>
									<ExternalLink size={14} className="opacity-60" />
								</a>
							</div>
						</div>

						{/* Quick 1-Click Navigation & Messenger Links */}
						<div className="w-full mt-3">
							<div className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-2 text-left">
								Полезные сервисы:
							</div>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
								{/* Yandex Maps Route */}
								<a
									href={`https://yandex.ru/maps/?text=${encodeURIComponent(
										confirmationData?.branch?.address || selectedBranch.address,
									)}`}
									target="_blank"
									rel="noreferrer"
									className="dbw-action-chip-btn"
								>
									<MapPin size={16} className="text-red-500 shrink-0" />
									<span className="truncate">Открыть маршрут в Яндекс.Картах</span>
									<ExternalLink size={13} className="opacity-50 shrink-0" />
								</a>

								{/* WhatsApp Clinic Chat */}
								<a
									href={`https://wa.me/${(selectedBranch.phone || "+78000000000").replace(/\D/g, "")}?text=${encodeURIComponent(
										`Здравствуйте! Моя онлайн-запись ${confirmationData?.referenceNumber || ""} на ${confirmationData?.date || selectedDate} в ${confirmationData?.time || "10:00"}.`,
									)}`}
									target="_blank"
									rel="noreferrer"
									className="dbw-action-chip-btn"
								>
									<MessageSquare size={16} className="text-green-500 shrink-0" />
									<span className="truncate">Написать в WhatsApp клиники</span>
									<ExternalLink size={13} className="opacity-50 shrink-0" />
								</a>
							</div>
						</div>

						{/* Print and Re-book Footers */}
						<div className="flex items-center justify-between w-full pt-4 border-t border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 flex-wrap gap-2">
							<button
								type="button"
								className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-slate-100 p-2"
								onClick={() => window.print()}
							>
								<Printer size={16} />
								<span>Распечатать талон</span>
							</button>

							<button
								type="button"
								className="flex items-center gap-1.5 text-teal-600 dark:text-teal-400 hover:underline p-2"
								onClick={handleResetBooking}
							>
								<RotateCcw size={16} />
								<span>Записаться ещё раз</span>
							</button>
						</div>
					</section>
				)}
			</div>
		</div>
	);
};

export default PublicOnlineBookingWidget;
