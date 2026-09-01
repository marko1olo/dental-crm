import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
	Activity,
	AlertCircle,
	ArrowLeft,
	ArrowRight,
	Calendar,
	Check,
	CheckCircle2,
	Clock,
	CreditCard,
	Flame,
	HeartPulse,
	HelpCircle,
	Info,
	MapPin,
	Phone,
	QrCode,
	RotateCcw,
	ShieldAlert,
	ShieldCheck,
	Sparkles,
	Star,
	User,
	WifiOff,
	X,
	Zap,
} from "lucide-react";
import {
	triggerHaptic,
	playClinicalAudioFeedback,
} from "../../native/mobileBridge";
import {
	enqueueOfflinePatientBooking,
	syncOfflineBookingsWithServer,
	getQueuedOfflinePatientBookings,
	type OfflinePatientBookingRequest,
} from "../../pwa/patientOfflineStorage";
import { showToast } from "../GlobalToast";
import { logger } from "../../utils/logger";
import "./interactiveSmartBooking.css";

export interface BookingServiceItem {
	readonly id: string;
	readonly title: string;
	readonly category: string;
	readonly priceRub: number;
	readonly durationMinutes: number;
	readonly descriptionRu: string;
	readonly popular?: boolean;
}

export interface BookingDoctorItem {
	readonly id: string;
	readonly name: string;
	readonly specialty: string;
	readonly experienceYears: number;
	readonly rating: number;
	readonly reviewsCount: number;
	readonly avatarUrl?: string;
	readonly availableDays: string[]; // YYYY-MM-DD
}

export interface BookingTimeSlot {
	readonly id: string;
	readonly timeRu: string; // e.g. "10:30"
	readonly period: "morning" | "afternoon" | "evening";
	readonly isBooked: boolean;
}

export interface InteractiveSmartBookingFlowProps {
	readonly patientId?: string;
	readonly defaultPatientName?: string;
	readonly defaultPatientPhone?: string;
	readonly clinicName?: string;
	readonly clinicAddress?: string;
	readonly branchId?: string;
	readonly onBookingSuccess?: (bookingId: string, isOffline: boolean) => void;
	readonly onCancel?: () => void;
}

const PRESET_SERVICES: readonly BookingServiceItem[] = [
	{
		id: "srv-consultation",
		title: "Первичный осмотр и консультация + 3D CBCT снимок",
		category: "Диагностика",
		priceRub: 1500,
		durationMinutes: 30,
		descriptionRu: "Комплексный осмотр главного врача, фотопротокол и детальный расчет плана лечения",
		popular: true,
	},
	{
		id: "srv-hygiene-airflow",
		title: "Комплексная гигиена полости рта (AirFlow + УЗ)",
		category: "Профилактика",
		priceRub: 4500,
		durationMinutes: 60,
		descriptionRu: "Удаление зубного камня ультразвуком, полировка AirFlow и фторирование эмали",
		popular: true,
	},
	{
		id: "srv-therapy-caries",
		title: "Лечение кариеса с эстетической реставрацией",
		category: "Терапия",
		priceRub: 5800,
		durationMinutes: 45,
		descriptionRu: "Анатомическая реставрация нанокомпозитом Estelite / Harmonize под микроскопом",
	},
	{
		id: "srv-surgery-extraction",
		title: "Атравматичное удаление зуба (в т.ч. зуб мудрости)",
		category: "Хирургия",
		priceRub: 6500,
		durationMinutes: 45,
		descriptionRu: "Бережное удаление с сохранением костной лунки и ультракаиновой анестезией",
	},
	{
		id: "srv-implant-consult",
		title: "Консультация хирурга-имплантолога + расчет All-on-4/6",
		category: "Имплантация",
		priceRub: 2000,
		durationMinutes: 45,
		descriptionRu: "Подбор имплантационной системы (Osstem / Straumann) по КТ",
	},
	{
		id: "srv-emergency-pain",
		title: "Неотложная помощь при острой боли",
		category: "Экстренно",
		priceRub: 2500,
		durationMinutes: 30,
		descriptionRu: "Снятие острой боли, купирование пульпита, дренирование в день обращения",
		popular: true,
	},
];

const PRESET_DOCTORS: readonly BookingDoctorItem[] = [
	{
		id: "doc-ivanov",
		name: "Д-р Иванов Александр Сергеевич",
		specialty: "Главный врач, Стоматолог-ортопед",
		experienceYears: 16,
		rating: 4.98,
		reviewsCount: 142,
		availableDays: ["2026-09-02", "2026-09-03", "2026-09-04", "2026-09-05", "2026-09-06"],
	},
	{
		id: "doc-smirnova",
		name: "Д-р Смирнова Елена Викторовна",
		specialty: "Стоматолог-терапевт, Эндодонтист",
		experienceYears: 12,
		rating: 4.95,
		reviewsCount: 98,
		availableDays: ["2026-09-02", "2026-09-03", "2026-09-04", "2026-09-06", "2026-09-07"],
	},
	{
		id: "doc-petrov",
		name: "Д-р Петров Дмитрий Михайлович",
		specialty: "Челюстно-лицевой хирург, Имплантолог",
		experienceYears: 14,
		rating: 4.99,
		reviewsCount: 215,
		availableDays: ["2026-09-03", "2026-09-04", "2026-09-05", "2026-09-07", "2026-09-08"],
	},
];

const PRESET_SLOTS: readonly BookingTimeSlot[] = [
	{ id: "slot-0900", timeRu: "09:00", period: "morning", isBooked: false },
	{ id: "slot-1000", timeRu: "10:00", period: "morning", isBooked: true },
	{ id: "slot-1100", timeRu: "11:00", period: "morning", isBooked: false },
	{ id: "slot-1200", timeRu: "12:00", period: "afternoon", isBooked: false },
	{ id: "slot-1400", timeRu: "14:00", period: "afternoon", isBooked: false },
	{ id: "slot-1530", timeRu: "15:30", period: "afternoon", isBooked: true },
	{ id: "slot-1700", timeRu: "17:00", period: "evening", isBooked: false },
	{ id: "slot-1830", timeRu: "18:30", period: "evening", isBooked: false },
	{ id: "slot-1930", timeRu: "19:30", period: "evening", isBooked: false },
];

export const InteractiveSmartBookingFlow: React.FC<InteractiveSmartBookingFlowProps> = ({
	patientId = "pat-043-982",
	defaultPatientName = "Алексей Смирнов",
	defaultPatientPhone = "+7 (999) 123-45-67",
	clinicName = "DENTE Клиника",
	clinicAddress = "г. Москва, ул. Арбат, д. 24",
	branchId = "branch-center",
	onBookingSuccess,
	onCancel,
}) => {
	// Step 1: Service; Step 2: Doctor & Slot; Step 3: Confirmation & SBP Deposit
	const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
	const [selectedServiceId, setSelectedServiceId] = useState<string>("srv-consultation");
	const [selectedDoctorId, setSelectedDoctorId] = useState<string>("doc-ivanov");
	const [selectedDateIso, setSelectedDateIso] = useState<string>("2026-09-03");
	const [selectedSlotId, setSelectedSlotId] = useState<string>("11:00");
	const [patientNameInput, setPatientNameInput] = useState<string>(defaultPatientName);
	const [patientPhoneInput, setPatientPhoneInput] = useState<string>(defaultPatientPhone);
	const [patientComment, setPatientComment] = useState<string>("");
	const [sbpDepositAmount, setSbpDepositAmount] = useState<0 | 500 | 1000>(500);
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
	const [isOnline, setIsOnline] = useState<boolean>(
		typeof navigator !== "undefined" ? navigator.onLine : true,
	);
	const [queuedOfflineCount, setQueuedOfflineCount] = useState<number>(0);

	// Online / Offline monitor & queue sync
	useEffect(() => {
		const handleOnline = async () => {
			setIsOnline(true);
			triggerHaptic("success");
			showToast("Соединение восстановлено. Синхронизация очереди заявок...", "info");
			try {
				const synced = await syncOfflineBookingsWithServer();
				if (synced.successCount > 0) {
					showToast(`Успешно отправлено ${synced.successCount} оффлайн-заявки!`, "success");
					playClinicalAudioFeedback("save_success");
				}
				const queued = await getQueuedOfflinePatientBookings();
				setQueuedOfflineCount(queued.length);
			} catch (err) {
				logger.warn("Sync error on reconnect", err);
			}
		};

		const handleOffline = () => {
			setIsOnline(false);
			triggerHaptic("warning");
			showToast("Режим Метро / Offline: Заявки сохраняются локально", "warning");
		};

		if (typeof window !== "undefined") {
			window.addEventListener("online", handleOnline);
			window.addEventListener("offline", handleOffline);
			getQueuedOfflinePatientBookings().then((q) => setQueuedOfflineCount(q.length));
		}

		return () => {
			if (typeof window !== "undefined") {
				window.removeEventListener("online", handleOnline);
				window.removeEventListener("offline", handleOffline);
			}
		};
	}, []);

	const selectedService = useMemo(
		() => PRESET_SERVICES.find((s) => s.id === selectedServiceId) || PRESET_SERVICES[0]!,
		[selectedServiceId],
	);

	const selectedDoctor = useMemo(
		() => PRESET_DOCTORS.find((d) => d.id === selectedDoctorId) || PRESET_DOCTORS[0]!,
		[selectedDoctorId],
	);

	const handleNext = () => {
		triggerHaptic("light");
		playClinicalAudioFeedback("click");
		if (currentStep < 3) {
			setCurrentStep((prev) => (prev + 1) as 1 | 2 | 3);
		}
	};

	const handleBack = () => {
		triggerHaptic("light");
		if (currentStep > 1) {
			setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3);
		}
	};

	const handleConfirmBooking = async () => {
		setIsSubmitting(true);
		triggerHaptic("medium");

		const bookingPayload: Omit<OfflinePatientBookingRequest, "id" | "createdAtIso" | "status" | "retryCount"> = {
			...(patientId ? { patientId } : {}),
			patientFullName: patientNameInput.trim() || "Пациент",
			patientPhone: patientPhoneInput.trim() || "+7 (000) 000-00-00",
			branchId,
			branchName: clinicName,
			doctorId: selectedDoctor.id,
			doctorName: selectedDoctor.name,
			serviceId: selectedService.id,
			serviceTitle: selectedService.title,
			dateIso: selectedDateIso,
			slotId: selectedSlotId,
			timeRu: selectedSlotId,
			...(patientComment.trim() ? { patientComment: patientComment.trim() } : {}),
			consentPersonalData152Fz: true,
		};

		if (!isOnline) {
			// Subway Offline Mode: enqueue in IndexedDB
			try {
				const offlineReq = await enqueueOfflinePatientBooking(bookingPayload);
				setQueuedOfflineCount((prev) => prev + 1);
				playClinicalAudioFeedback("save_success");
				showToast("Заявка сохранена на устройстве (Режим Метро). Будет передана в клинику при подключении!", "success");
				onBookingSuccess?.(offlineReq.id, true);
			} catch (err) {
				showToast("Ошибка сохранения оффлайн-заявки", "warning");
			} finally {
				setIsSubmitting(false);
			}
			return;
		}

		// Online submission
		try {
			// Simulate real network request to /api/portal/booking
			await new Promise((resolve) => setTimeout(resolve, 600));
			const bookingId = `book-${Date.now()}`;
			playClinicalAudioFeedback("save_success");
			triggerHaptic("success");

			const sbpMsg =
				sbpDepositAmount > 0
					? ` Залог ${sbpDepositAmount} ₽ зафиксирован по СБП (+${sbpDepositAmount === 500 ? 200 : 500} бонусов)!`
					: "";
			showToast(`Запись успешно подтверждена на ${selectedDateIso} в ${selectedSlotId}!${sbpMsg}`, "success");
			onBookingSuccess?.(bookingId, false);
		} catch (err) {
			showToast("Не удалось отправить заявку. Попробуйте снова.", "warning");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="smart-booking-container" data-testid="interactive-smart-booking-flow">
			{/* HEADER & STEPS */}
			<div className="smart-booking-header">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-xl bg-teal-500/15 text-teal-400 flex items-center justify-center border border-teal-500/30">
						<Calendar className="w-5 h-5" />
					</div>
					<div>
						<h3 className="text-base font-bold text-white">Онлайн-запись к врачу</h3>
						<p className="text-xs text-neutral-400">
							{clinicName} • {clinicAddress}
						</p>
					</div>
				</div>

				{onCancel && (
					<button
						type="button"
						onClick={onCancel}
						className="w-10 h-10 min-h-[44px] min-w-[44px] rounded-lg text-neutral-400 hover:text-white flex items-center justify-center cursor-pointer"
						title="Закрыть"
					>
						<X className="w-5 h-5" />
					</button>
				)}
			</div>

			{/* OFFLINE / SUBWAY BANNER IF DISCONNECTED */}
			{!isOnline && (
				<div className="smart-booking-offline-banner">
					<WifiOff className="w-5 h-5 flex-shrink-0 text-amber-400 animate-pulse" />
					<div>
						<strong className="block font-bold">Режим Метро (Offline активен)</strong>
						<span>Вы можете выбрать врача и время. Заявка сохранится на телефоне и отправится автоматически при появлении связи.</span>
					</div>
				</div>
			)}

			{/* 3-STEP PROGRESS BAR */}
			<div className="smart-booking-step-bar">
				{[
					{ num: 1, label: "1. Услуга и повод" },
					{ num: 2, label: "2. Врач и время" },
					{ num: 3, label: "3. Подтверждение" },
				].map((st) => (
					<button
						key={st.num}
						type="button"
						onClick={() => {
							if (st.num < currentStep) {
								setCurrentStep(st.num as 1 | 2 | 3);
								triggerHaptic("light");
							}
						}}
						className={`smart-booking-step-item ${
							currentStep === st.num
								? "active"
								: currentStep > st.num
									? "completed"
									: ""
						}`}
					>
						<div className="smart-booking-step-circle">
							{currentStep > st.num ? <Check className="w-4 h-4 stroke-[3]" /> : st.num}
						</div>
						<span className="hidden sm:inline">{st.label}</span>
					</button>
				))}
			</div>

			{/* STEP 1: SERVICE & REASON SELECTION */}
			{currentStep === 1 && (
				<div className="flex flex-col gap-3">
					<div className="flex items-center justify-between">
						<span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
							Выберите направление или процедуру:
						</span>
						<span className="text-xs text-neutral-400">Цены ориентировочные</span>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
						{PRESET_SERVICES.map((srv) => (
							<div
								key={srv.id}
								onClick={() => {
									setSelectedServiceId(srv.id);
									triggerHaptic("light");
								}}
								className={`smart-booking-service-card ${
									selectedServiceId === srv.id ? "selected" : ""
								}`}
							>
								<div className="flex flex-col gap-1 pr-2">
									<div className="flex items-center gap-2">
										<span className="text-xs font-bold text-white">{srv.title}</span>
										{srv.popular && (
											<span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-extrabold border border-amber-500/30 flex items-center gap-1">
												<Flame className="w-3 h-3" /> Топ
											</span>
										)}
									</div>
									<p className="text-[11px] text-neutral-400 line-clamp-2 leading-relaxed">
										{srv.descriptionRu}
									</p>
									<div className="flex items-center gap-3 pt-1 text-[11px]">
										<span className="text-teal-400 font-bold font-mono">
											от {srv.priceRub.toLocaleString("ru-RU")} ₽
										</span>
										<span className="text-neutral-500 flex items-center gap-1">
											<Clock className="w-3 h-3" /> {srv.durationMinutes} мин
										</span>
									</div>
								</div>
								<div className={`postop-checkbox ${selectedServiceId === srv.id ? "checked" : ""}`}>
									{selectedServiceId === srv.id && <Check className="w-3.5 h-3.5 stroke-[3]" />}
								</div>
							</div>
						))}
					</div>

					<div className="flex justify-end pt-2">
						<button
							type="button"
							onClick={handleNext}
							className="smart-booking-action-btn primary"
						>
							<span>Выбрать врача и время</span>
							<ArrowRight className="w-4 h-4" />
						</button>
					</div>
				</div>
			)}

			{/* STEP 2: DOCTOR & LIVE TIME SLOT PICKER */}
			{currentStep === 2 && (
				<div className="flex flex-col gap-3">
					<div className="flex items-center justify-between">
						<span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
							Специалисты клиники по профилю:
						</span>
					</div>

					{/* DOCTOR CARDS */}
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
						{PRESET_DOCTORS.map((doc) => (
							<div
								key={doc.id}
								onClick={() => {
									setSelectedDoctorId(doc.id);
									triggerHaptic("light");
								}}
								className={`smart-booking-doctor-card ${
									selectedDoctorId === doc.id ? "selected" : ""
								}`}
							>
								<div className="flex items-center gap-2.5">
									<div className="w-10 h-10 rounded-full bg-neutral-700 flex items-center justify-center text-neutral-300 font-bold text-xs border border-neutral-600">
										<User className="w-5 h-5" />
									</div>
									<div>
										<h4 className="text-xs font-bold text-white line-clamp-1">{doc.name}</h4>
										<span className="text-[10px] text-teal-400 font-semibold">{doc.specialty}</span>
									</div>
								</div>
								<div className="flex items-center justify-between text-[11px] text-neutral-400 border-t border-neutral-800 pt-1.5">
									<span>Стаж: {doc.experienceYears} лет</span>
									<span className="flex items-center gap-1 text-amber-400 font-bold">
										<Star className="w-3 h-3 fill-amber-400" /> {doc.rating} ({doc.reviewsCount})
									</span>
								</div>
							</div>
						))}
					</div>

					{/* 14-DAY CALENDAR DATE STRIP */}
					<div className="flex flex-col gap-1.5 pt-1">
						<span className="text-xs font-bold text-neutral-300">Дата приема:</span>
						<div className="flex items-center gap-2 overflow-x-auto pb-1">
							{[
								{ iso: "2026-09-02", dayName: "Ср, 2 сен" },
								{ iso: "2026-09-03", dayName: "Чт, 3 сен" },
								{ iso: "2026-09-04", dayName: "Пт, 4 сен" },
								{ iso: "2026-09-05", dayName: "Сб, 5 сен" },
								{ iso: "2026-09-06", dayName: "Вс, 6 сен" },
								{ iso: "2026-09-07", dayName: "Пн, 7 сен" },
								{ iso: "2026-09-08", dayName: "Вт, 8 сен" },
							].map((d) => (
								<button
									key={d.iso}
									type="button"
									onClick={() => {
										setSelectedDateIso(d.iso);
										triggerHaptic("light");
									}}
									className={`min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
										selectedDateIso === d.iso
											? "bg-teal-500 text-white border-teal-400 shadow-sm"
											: "bg-neutral-800 text-neutral-300 border-neutral-700 hover:border-neutral-600"
									}`}
								>
									{d.dayName}
								</button>
							))}
						</div>
					</div>

					{/* TIME SLOTS GRID */}
					<div className="flex flex-col gap-1.5">
						<span className="text-xs font-bold text-neutral-300">Свободное время:</span>
						<div className="smart-booking-slot-grid">
							{PRESET_SLOTS.map((slot) => (
								<button
									key={slot.id}
									type="button"
									disabled={slot.isBooked}
									onClick={() => {
										setSelectedSlotId(slot.timeRu);
										triggerHaptic("light");
									}}
									className={`smart-booking-slot-btn ${
										selectedSlotId === slot.timeRu ? "selected" : ""
									}`}
								>
									{slot.timeRu}
								</button>
							))}
						</div>
					</div>

					<div className="flex items-center justify-between pt-2 border-t border-neutral-800">
						<button
							type="button"
							onClick={handleBack}
							className="smart-booking-action-btn secondary"
						>
							<ArrowLeft className="w-4 h-4" />
							<span>Назад</span>
						</button>
						<button
							type="button"
							onClick={handleNext}
							className="smart-booking-action-btn primary"
						>
							<span>Перейти к подтверждению</span>
							<ArrowRight className="w-4 h-4" />
						</button>
					</div>
				</div>
			)}

			{/* STEP 3: CONFIRMATION & OPTIONAL SBP DEPOSIT */}
			{currentStep === 3 && (
				<div className="flex flex-col gap-3">
					{/* BOOKING SUMMARY HERO */}
					<div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col gap-2.5">
						<div className="flex items-center justify-between border-b border-neutral-800 pb-2">
							<span className="text-xs font-bold text-teal-400">Детали визита</span>
							<span className="text-xs font-bold text-white">
								{selectedDateIso} в {selectedSlotId}
							</span>
						</div>
						<div className="flex flex-col gap-1 text-xs">
							<div className="flex justify-between">
								<span className="text-neutral-400">Услуга:</span>
								<strong className="text-white text-right line-clamp-1">{selectedService.title}</strong>
							</div>
							<div className="flex justify-between">
								<span className="text-neutral-400">Врач:</span>
								<span className="text-white">{selectedDoctor.name}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-neutral-400">Ориентир. стоимость:</span>
								<span className="font-mono text-teal-400 font-bold">
									от {selectedService.priceRub.toLocaleString("ru-RU")} ₽
								</span>
							</div>
						</div>
					</div>

					{/* CONTACT FORM */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
						<div className="flex flex-col gap-1">
							<label className="text-[11px] font-bold text-neutral-400">Ваше ФИО:</label>
							<input
								type="text"
								value={patientNameInput}
								onChange={(e) => setPatientNameInput(e.target.value)}
								className="min-h-[44px] px-3 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-xs font-medium focus:border-teal-500 focus:outline-none"
								placeholder="Иванов Иван Иванович"
							/>
						</div>
						<div className="flex flex-col gap-1">
							<label className="text-[11px] font-bold text-neutral-400">Телефон для SMS-подтверждения:</label>
							<input
								type="tel"
								value={patientPhoneInput}
								onChange={(e) => setPatientPhoneInput(e.target.value)}
								className="min-h-[44px] px-3 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-xs font-medium focus:border-teal-500 focus:outline-none font-mono"
								placeholder="+7 (999) 000-00-00"
							/>
						</div>
					</div>

					{/* SBP ADVANCE DEPOSIT CHOICES */}
					<div className="flex flex-col gap-1.5 pt-1">
						<div className="flex items-center justify-between">
							<span className="text-xs font-bold text-neutral-300">Гарантия бронирования (СБП):</span>
							<span className="smart-booking-sbp-badge">
								<QrCode className="w-3.5 h-3.5" /> 0% комиссии
							</span>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
							{[
								{
									amount: 0 as const,
									title: "Без предоплаты",
									subtitle: "Оплата на приеме",
									bonus: null,
								},
								{
									amount: 500 as const,
									title: "Депозит 500 ₽",
									subtitle: "Фиксация слота",
									bonus: "+200 бонусов",
								},
								{
									amount: 1000 as const,
									title: "Депозит 1000 ₽",
									subtitle: "VIP бронь",
									bonus: "+500 бонусов",
								},
							].map((opt) => (
								<div
									key={opt.amount}
									onClick={() => {
										setSbpDepositAmount(opt.amount);
										triggerHaptic("light");
									}}
									className={`p-3 rounded-xl border flex flex-col gap-1 cursor-pointer transition-all ${
										sbpDepositAmount === opt.amount
											? "bg-teal-500/15 border-teal-500 text-white shadow-sm"
											: "bg-neutral-800/60 border-neutral-700 text-neutral-300 hover:border-neutral-600"
									}`}
								>
									<div className="flex items-center justify-between">
										<span className="text-xs font-bold">{opt.title}</span>
										<div className={`postop-checkbox ${sbpDepositAmount === opt.amount ? "checked" : ""}`}>
											{sbpDepositAmount === opt.amount && <Check className="w-3.5 h-3.5 stroke-[3]" />}
										</div>
									</div>
									<span className="text-[11px] text-neutral-400">{opt.subtitle}</span>
									{opt.bonus && (
										<span className="text-[10px] text-emerald-400 font-extrabold flex items-center gap-1">
											<Sparkles className="w-3 h-3" /> {opt.bonus}
										</span>
									)}
								</div>
							))}
						</div>
					</div>

					{/* ACTIONS */}
					<div className="flex items-center justify-between pt-2 border-t border-neutral-800">
						<button
							type="button"
							onClick={handleBack}
							className="smart-booking-action-btn secondary"
						>
							<ArrowLeft className="w-4 h-4" />
							<span>Назад</span>
						</button>
						<button
							type="button"
							disabled={isSubmitting}
							onClick={handleConfirmBooking}
							className="smart-booking-action-btn primary"
						>
							{isSubmitting ? (
								<span>Отправка заявки...</span>
							) : (
								<>
									<ShieldCheck className="w-4 h-4" />
									<span>
										{sbpDepositAmount > 0
											? `Внести ${sbpDepositAmount} ₽ и подтвердить`
											: "Подтвердить запись"}
									</span>
								</>
							)}
						</button>
					</div>
				</div>
			)}
		</div>
	);
};
