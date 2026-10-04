import type React from "react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { parseUtmFromUrl } from "@dental/shared";
import { AuthArtBackground } from "../auth/AuthArtBackground";
import { BookingConfirmationView } from "./BookingConfirmationView";
import { BookingContactsSection } from "./BookingContactsSection";
import { BookingDoctorCard, BookingAnyDoctorCard, type BookingDoctorData } from "./BookingDoctorCard";
import { BookingDoctorsSection } from "./BookingDoctorsSection";
import { BookingHeader } from "./BookingHeader";
import { BookingSlotPicker, type BookingSlotItem, type CalendarDayItem } from "./BookingSlotPicker";
import { BookingSlotsSection } from "./BookingSlotsSection";
import {
	BookingCategoriesSection,
	CANONICAL_BOOKING_CATEGORIES,
	type BookingCategoryOption,
} from "./BookingCategoriesSection";
import { DEFAULT_DOCTORS_LIST } from "./publicBookingEngine";
import { useBookingAvailability } from "./useBookingAvailability";
import {
	type BookingConfirmationData,
	type ClinicBranch,
	DEFAULT_BRANCHES,
	DEFAULT_DOCTORS,
	DEFAULT_SERVICE_CATEGORIES,
	type PopularService,
	type PublicOnlineBookingWidgetProps,
	type ServiceCategory,
	buildCalendarDays,
	formatRussianDate,
	formatRussianPhone,
	generateBookingReference,
	generateEmbedSnippet,
	generateGoogleCalendarUrl,
	generateIcsCalendarContent,
	generateYandexCalendarUrl,
	isValidRussianPhone,
	localDateString,
	resolveCategoryIcon,
} from "./bookingUtils";
import "./bookingWidget.css";

// Re-export contracts & sub-components per Mandate 8s & 8za (Canonical SSOT)
export * from "./bookingUtils";
export type { BookingDoctorData, BookingSlotItem, CalendarDayItem };
export { BookingHeader } from "./BookingHeader";
export { BookingDoctorsSection } from "./BookingDoctorsSection";
export { BookingContactsSection } from "./BookingContactsSection";
export { BookingSlotsSection } from "./BookingSlotsSection";
export { BookingDoctorCard, BookingAnyDoctorCard } from "./BookingDoctorCard";
export { BookingSlotPicker } from "./BookingSlotPicker";
export { BookingConfirmationView } from "./BookingConfirmationView";
export { BookingCategoriesSection, CANONICAL_BOOKING_CATEGORIES } from "./BookingCategoriesSection";
export type { BookingCategoryOption } from "./BookingCategoriesSection";

// Backwards-compatible exports from pure engine
export type {
	BookingStep,
	VerificationMethod,
	BookingDoctor,
	BookingSlot,
	BookingContacts,
	BookingReceiptData,
	CalendarExportPayload,
} from "./publicBookingEngine";
export {
	DEFAULT_DOCTORS_LIST,
	SERVICE_CATEGORIES,
	normalizePhoneDigits,
	formatPhoneRu,
	isValidRuPhone,
	isValidPatientName,
	isClinicNightTime,
	groupSlotsByDayPeriod,
	detectTelegramWebApp,
	dispatchBookingCompletedMessage,
	sendOtpVerificationRequest,
	toLocalDateString,
} from "./publicBookingEngine";

export type PublicBookingWidgetProps = PublicOnlineBookingWidgetProps;

// ============================================================================
// Main Canonical Component: Online Booking SSOT (Mandates 8e, 8k, 8p, 8n, 8s, 8za)
// Streamlined 1-Screen 2-Click Booking (< 30s) + Responsive Mobile Touch Targets (>= 44px)
// ============================================================================

export const PublicBookingWidget: React.FC<PublicBookingWidgetProps> = ({
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
	artBackground = false,
	compact = false,
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

	// Date & Calendar state
	const todayDateStr = useMemo(() => localDateString(), []);
	const [selectedDate, setSelectedDate] = useState<string>(todayDateStr);
	const [calendarMonth, setCalendarMonth] = useState<Date>(() => new Date());

	// Selected Doctor ID state
	const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(() => {
		if (initialDoctorId) return initialDoctorId;
		if (customDoctors && customDoctors.length === 1 && customDoctors[0]) {
			return customDoctors[0].id;
		}
		return null;
	});

	// Live Availability & Doctor data fetching hook
	const {
		loadedDoctors,
		doctorsLoading,
		slots,
		setSlots,
		selectedSlot,
		setSelectedSlot,
		slotsLoading,
		slotError,
		setSlotError,
	} = useBookingAvailability({
		organizationId,
		apiBaseUrl,
		selectedDate,
		selectedDoctorId,
	});

	// Service Category state (Step 1)
	const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
		() => initialCategoryId || "therapy",
	);

	const selectedCategory: BookingCategoryOption = useMemo(() => {
		if (selectedCategoryId) {
			const found = CANONICAL_BOOKING_CATEGORIES.find(
				(c) => c.id === selectedCategoryId,
			);
			if (found) return found;
		}
		return CANONICAL_BOOKING_CATEGORIES[0]!;
	}, [selectedCategoryId]);

	// Active doctors list (customDoctors prop takes priority, then backend loaded, then default canonical doctors)
	const activeDoctors: BookingDoctorData[] = useMemo(() => {
		if (customDoctors && customDoctors.length > 0) {
			return (customDoctors as any[]).map((doc) => ({
				id: doc.id,
				fullName: doc.fullName,
				specialties: doc.specialties,
				experienceYears: doc.experienceYears ?? 5,
				rating: doc.rating ?? 5.0,
				reviewsCount: doc.reviewsCount ?? 0,
				categoryIds: doc.categoryIds ?? ["all"],
				avatarUrl: doc.avatarUrl,
				bio: doc.bio,
			}));
		}
		if (loadedDoctors && loadedDoctors.length > 0) return loadedDoctors;
		return DEFAULT_DOCTORS_LIST.map((doc) => ({
			id: doc.id,
			fullName: doc.fullName,
			specialties: doc.specialties,
			experienceYears: doc.experienceYears ?? 5,
			rating: doc.rating ?? 5.0,
			reviewsCount: doc.reviewsCount ?? 0,
			categoryIds: doc.categoryIds ?? ["all"],
			avatarUrl: doc.avatarUrl,
			bio: (doc as any).bio,
		}));
	}, [customDoctors, loadedDoctors]);

	// Solo doctor status (Mandate 8n Solo Doctor Sovereignty)
	const isSoloDoctor = activeDoctors.length === 1;

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
							"Не удалось отправить проверочный код. Попробуйте позже.",
					);
					return;
				}
			} catch {
				setSmsError("Сбой связи с сервером при отправке кода");
				return;
			}
		}
		setSmsCodeSent(true);
		setSmsResendCountdown(60);
	};

	// Verify SMS OTP code
	const handleVerifySmsCode = async () => {
		if (!enteredSmsCode.trim()) {
			setSmsError("Введите проверочный код из сообщения");
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
	const calendarDays = useMemo(() => {
		return buildCalendarDays(calendarMonth, selectedDate, todayDateStr);
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
			const errMsg = "Пожалуйста, подтвердите номер телефона кодом из сообщения";
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
			className={`dente-booking-widget ${compact ? "compact-mode" : ""} ${artBackground ? "dbw-with-art-bg" : ""} ${className}`}
			data-theme={theme}
			data-embed={effectiveEmbedMode}
			data-art-bg={artBackground ? "true" : undefined}
			id={`dente-booking-${widgetInstanceId}`}
		>
			{artBackground && <AuthArtBackground />}
			{/* Top Glass Header (Strictly <= 110px on mobile, Mandate 8p) */}
			<BookingHeader
				title={title}
				subtitle={subtitle}
				isTelegramContext={isTelegramContext}
			/>

			{/* Main Widget Body */}
			<div className="dbw-body">
				{/* ================================================================ */}
				{/* 1-SCREEN 2-CLICK BOOKING FLOW (Mandates 8e, 8k, 8p, 8n)           */}
				{/* ================================================================ */}
				{step !== 5 && !confirmationData && (
					<div className="dbw-streamlined-flow">
						{/* Apple Store HIG Segmented Step Indicator */}
						<nav
							className="dbw-stepper-bar"
							aria-label="Этапы онлайн-записи"
						>
							<div className="dbw-stepper-track">
								<button
									type="button"
									onClick={() => {
										document.getElementById("dbw-step-categories")?.scrollIntoView({ behavior: "smooth" });
									}}
									className="dbw-stepper-step active"
								>
									<span className="dbw-stepper-num">1</span>
									<span className="dbw-stepper-title">Услуга</span>
								</button>
								<div className="dbw-stepper-line" />
								<button
									type="button"
									onClick={() => {
										document.getElementById("dbw-step-doctor")?.scrollIntoView({ behavior: "smooth" });
									}}
									className="dbw-stepper-step active"
								>
									<span className="dbw-stepper-num">2</span>
									<span className="dbw-stepper-title">Врач</span>
								</button>
								<div className="dbw-stepper-line" />
								<button
									type="button"
									onClick={() => {
										document.getElementById("dbw-step-slots")?.scrollIntoView({ behavior: "smooth" });
									}}
									className="dbw-stepper-step active"
								>
									<span className="dbw-stepper-num">3</span>
									<span className="dbw-stepper-title">Дата и время</span>
								</button>
								<div className="dbw-stepper-line" />
								<button
									type="button"
									onClick={() => {
										document.getElementById("dbw-step-contacts")?.scrollIntoView({ behavior: "smooth" });
									}}
									className="dbw-stepper-step active"
								>
									<span className="dbw-stepper-num">4</span>
									<span className="dbw-stepper-title">Контакты</span>
								</button>
							</div>
						</nav>

						{/* Step 1: Service Category Selection */}
						<div id="dbw-step-categories" className="dbw-step-card">
							<BookingCategoriesSection
								selectedCategoryId={selectedCategoryId}
								onSelectCategory={(cat) => {
									setSelectedCategoryId(cat.id);
								}}
							/>
						</div>

						{/* Step 2: Doctor Header: Solo Doctor or Doctor Choice (Mandate 8n) */}
						<div id="dbw-step-doctor" className="dbw-step-card">
							<BookingDoctorsSection
								isSoloDoctor={isSoloDoctor}
								selectedDoctor={selectedDoctor}
								activeDoctors={activeDoctors}
								selectedDoctorId={selectedDoctorId}
								onSelectDoctorId={(id) => setSelectedDoctorId(id)}
							/>
						</div>

						{/* Step 3: Date & Time slot picker with ribbon and period chips */}
						<div id="dbw-step-slots" className="dbw-step-card">
							<BookingSlotsSection
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
								slotError={slotError}
								onNextStep={() => {
									if (!selectedSlot && slots.length > 0) {
										setSelectedSlot(slots[0] || null);
									}
									handleStepChange(4);
									document.getElementById("dbw-step-contacts")?.scrollIntoView({ behavior: "smooth" });
								}}
							/>
						</div>

						{/* Step 4: Patient Name, Phone, and Book Button */}
						<div id="dbw-step-contacts" className="dbw-step-card">
							<BookingContactsSection
								isTelegramContext={isTelegramContext}
								patientName={patientName}
								setPatientName={setPatientName}
								patientPhone={patientPhone}
								handlePhoneChange={handlePhoneChange}
								patientComment={patientComment}
								setPatientComment={setPatientComment}
								hasAgreedToPrivacy={hasAgreedToPrivacy}
								setHasAgreedToPrivacy={setHasAgreedToPrivacy}
								showSmsVerification={showSmsVerification}
								smsCodeSent={smsCodeSent}
								enteredSmsCode={enteredSmsCode}
								setEnteredSmsCode={setEnteredSmsCode}
								isSmsVerified={isSmsVerified}
								smsResendCountdown={smsResendCountdown}
								smsError={smsError}
								handleSendSmsCode={handleSendSmsCode}
								handleVerifySmsCode={handleVerifySmsCode}
								handleTelegramShareContact={handleTelegramShareContact}
								submitError={submitError}
								setSubmitError={setSubmitError}
								isSubmitting={isSubmitting}
								onSubmit={handleFinalSubmit}
							/>
						</div>

						{/* Sticky Floating Bottom Bar in Natural Thumb Zone */}
						<aside
							className="dbw-floating-bottom-bar"
							aria-label="Быстрое действие записи"
							data-testid="floating-bottom-bar"
						>
							<div className="dbw-floating-bar-inner">
								<div className="dbw-floating-bar-summary min-w-0 flex-1">
									<div className="dbw-floating-summary-service truncate text-xs font-bold text-slate-900 dark:text-slate-100">
										{selectedCategory.title}
									</div>
									<div className="dbw-floating-summary-meta text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1.5">
										<span className="font-semibold text-teal-600 dark:text-teal-400">
											{selectedCategory.priceLabel}
										</span>
										<span>•</span>
										<span>
											{selectedSlot
												? `${formatRussianDate(selectedDate)} в ${selectedSlot.time}`
												: "Выберите время"}
										</span>
									</div>
								</div>

								<button
									type="button"
									onClick={(e) => {
										if (!patientName.trim()) {
											const nameInput = document.getElementById("patient-name-input");
											nameInput?.focus();
											nameInput?.scrollIntoView({ behavior: "smooth", block: "center" });
											return;
										}
										if (!patientPhone.trim()) {
											const phoneInput = document.getElementById("patient-phone-input");
											phoneInput?.focus();
											phoneInput?.scrollIntoView({ behavior: "smooth", block: "center" });
											return;
										}
										handleFinalSubmit(e);
									}}
									disabled={isSubmitting}
									className="dbw-floating-cta-btn shrink-0"
									data-testid="floating-primary-cta"
									aria-label="Записаться на приём"
								>
									{isSubmitting ? (
										<span>Оформление...</span>
									) : (
										<>
											<span>Записаться на приём</span>
											<ArrowRight size={16} />
										</>
									)}
								</button>
							</div>
						</aside>
					</div>
				)}

				{/* ================================================================ */}
				{/* STEP 5: DENTAL PASS / BOARDING PASS TICKET CARD                   */}
				{/* ================================================================ */}
				{(step === 5 || confirmationData) && (
					<BookingConfirmationView
						confirmationData={confirmationData}
						selectedDate={selectedDate}
						selectedSlot={selectedSlot}
						selectedDoctor={selectedDoctor}
						selectedBranch={selectedBranch}
						patientName={patientName}
						patientPhone={patientPhone}
						onReset={handleResetBooking}
						artPack="nature"
						showArtBackdrop={artBackground}
						theme={theme}
						isFloating={true}
					/>
				)}
			</div>
		</div>
	);
};

export const PublicOnlineBookingWidget = PublicBookingWidget;

export default PublicBookingWidget;
