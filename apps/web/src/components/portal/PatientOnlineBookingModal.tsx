/**
 * Patient Online Booking Modal (3-Step Fast Mobile Flow)
 * (DOMAIN: ONLINE BOOKING, 152-FZ CONSENT, SMS OTP & CALENDAR SYNC)
 */

import type React from "react";
import { useEffect, useId, useMemo, useState } from "react";
import {
	AlertCircle,
	Award,
	Calendar,
	CheckCircle2,
	ChevronLeft,
	ChevronRight,
	Clock,
	Download,
	MapPin,
	Phone,
	ShieldCheck,
	Sparkles,
	Star,
	User,
	X,
} from "lucide-react";
import "./patientMobilePortal.css";
import {
	calculateBookingPrepayment,
	filterAvailableDoctors,
	formatRussianPhone,
	generateIcsCalendarEvent,
	generateSmsOtpCode,
	generateTimeSlots,
	verifySmsOtpCode,
} from "./patientPortalEngine";
import {
	SAMPLE_BOOKING_BRANCHES,
	SAMPLE_BOOKING_DOCTORS,
	SAMPLE_BOOKING_SERVICES,
} from "./patientPortalPresets";
import type {
	BookingBranch,
	BookingDoctor,
	BookingService,
	BookingTimeSlot,
	OnlineBookingFormData,
	SpecialtyCategory,
} from "./patientPortalTypes";

export interface PatientOnlineBookingModalProps {
	isOpen: boolean;
	onClose: () => void;
	initialDoctorId?: string;
	initialServiceId?: string;
	initialBranchId?: string;
	branches?: BookingBranch[];
	doctors?: BookingDoctor[];
	services?: BookingService[];
	onBookingComplete?: (booking: OnlineBookingFormData) => void;
}

const SPECIALTY_OPTIONS: Array<{ id: SpecialtyCategory; label: string }> = [
	{ id: "all", label: "Все врачи" },
	{ id: "therapy", label: "Терапия" },
	{ id: "surgery", label: "Хирургия / Импланты" },
	{ id: "orthopedics", label: "Ортопедия / Коронки" },
	{ id: "orthodontics", label: "Ортодонтия / Брекеты" },
	{ id: "hygiene", label: "Гигиена / Чистка" },
];

export const PatientOnlineBookingModal: React.FC<PatientOnlineBookingModalProps> = ({
	isOpen,
	onClose,
	initialDoctorId,
	initialServiceId,
	initialBranchId,
	branches = SAMPLE_BOOKING_BRANCHES,
	doctors = SAMPLE_BOOKING_DOCTORS,
	services = SAMPLE_BOOKING_SERVICES,
	onBookingComplete,
}) => {
	const modalTitleId = useId();

	// Step flow state: 1 = Doctor/Service, 2 = Date/Time slot, 3 = SMS & Confirmation
	const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

	// Step 1: Selection
	const [selectedBranchId, setSelectedBranchId] = useState<string>(initialBranchId || branches[0]?.id || "");
	const [selectedSpecialty, setSelectedSpecialty] = useState<SpecialtyCategory>("all");
	const [selectedDoctorId, setSelectedDoctorId] = useState<string>(initialDoctorId || doctors[0]?.id || "");
	const [selectedServiceId, setSelectedServiceId] = useState<string>(initialServiceId || services[0]?.id || "");

	// Step 2: Date & Slot
	const todayIso = new Date().toISOString().slice(0, 10);
	const [selectedDateIso, setSelectedDateIso] = useState<string>(todayIso);
	const [selectedSlotId, setSelectedSlotId] = useState<string>("");
	const [selectedTimeRu, setSelectedTimeRu] = useState<string>("");

	// Step 3: Patient Information & SMS Verification
	const [patientFullName, setPatientFullName] = useState<string>("Смирнова Екатерина Васильевна");
	const [patientPhone, setPatientPhone] = useState<string>("+7 (926) 555-12-34");
	const [patientBirthDate, setPatientBirthDate] = useState<string>("1988-06-14");
	const [patientComment, setPatientComment] = useState<string>("");
	const [consent152Fz, setConsent152Fz] = useState<boolean>(true);

	// SMS OTP Engine state
	const [smsCode, setSmsCode] = useState<string>("");
	const [expectedSmsCode, setExpectedSmsCode] = useState<string>("7788");
	const [smsSent, setSmsSent] = useState<boolean>(false);
	const [smsTimerSeconds, setSmsTimerSeconds] = useState<number>(60);
	const [smsVerified, setSmsVerified] = useState<boolean>(false);
	const [smsError, setSmsError] = useState<string | null>(null);

	// Completed confirmation ticket
	const [bookingConfirmed, setBookingConfirmed] = useState<boolean>(false);
	const [confirmedBookingData, setConfirmedBookingData] = useState<OnlineBookingFormData | null>(null);

	// Filtered doctors
	const availableDoctors = useMemo(
		() => filterAvailableDoctors(doctors, selectedBranchId, selectedSpecialty),
		[doctors, selectedBranchId, selectedSpecialty],
	);

	// Active doctor & active service details
	const activeDoctor = useMemo(
		() => doctors.find((d) => d.id === selectedDoctorId) || availableDoctors[0],
		[doctors, selectedDoctorId, availableDoctors],
	);

	const activeService = useMemo(
		() => services.find((s) => s.id === selectedServiceId) || services[0],
		[services, selectedServiceId],
	);

	const activeBranch = useMemo(
		() => branches.find((b) => b.id === selectedBranchId) || branches[0],
		[branches, selectedBranchId],
	);

	// Available time slots for the selected date & doctor
	const timeSlots = useMemo(
		() => (activeDoctor ? generateTimeSlots(activeDoctor.id, selectedBranchId, selectedDateIso) : []),
		[activeDoctor, selectedBranchId, selectedDateIso],
	);

	// Prepayment calculation
	const prepaymentInfo = useMemo(() => {
		const selectedSlot = timeSlots.find((s) => s.id === selectedSlotId);
		return calculateBookingPrepayment(activeService, selectedSlot?.timePeriod || "morning");
	}, [activeService, timeSlots, selectedSlotId]);

	// Generate 7-day mini calendar strip
	const availableDates = useMemo(() => {
		const result: Array<{ dateIso: string; dayRu: string; dateRu: string; isToday: boolean }> = [];
		const daysRu = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
		const now = new Date();

		for (let i = 0; i < 7; i++) {
			const d = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
			const iso = d.toISOString().slice(0, 10);
			const dayName = i === 0 ? "Сегодня" : i === 1 ? "Завтра" : daysRu[d.getDay()] || "";
			const dateFormatted = `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, "0")}`;
			result.push({
				dateIso: iso,
				dayRu: dayName,
				dateRu: dateFormatted,
				isToday: i === 0,
			});
		}
		return result;
	}, []);

	// Countdown timer for SMS resend
	useEffect(() => {
		let interval: NodeJS.Timeout | null = null;
		if (smsSent && smsTimerSeconds > 0 && !smsVerified) {
			interval = setInterval(() => {
				setSmsTimerSeconds((prev) => prev - 1);
			}, 1000);
		}
		return () => {
			if (interval) clearInterval(interval);
		};
	}, [smsSent, smsTimerSeconds, smsVerified]);

	if (!isOpen) return null;

	const handleSendSms = () => {
		const { code } = generateSmsOtpCode(patientPhone, "7788");
		setExpectedSmsCode(code);
		setSmsSent(true);
		setSmsTimerSeconds(60);
		setSmsError(null);
	};

	const handleVerifySmsAndConfirm = () => {
		if (!verifySmsOtpCode(smsCode, expectedSmsCode) && smsCode !== "7788") {
			setSmsError("Неверный СМС-код. Введите 7788 для тестового подтверждения.");
			return;
		}

		setSmsVerified(true);
		setSmsError(null);

		const confirmationNumber = `ДЕНТЕ-BOOK-${Math.floor(10000 + Math.random() * 90000)}`;
		const completedData: OnlineBookingFormData = {
			branchId: selectedBranchId,
			specialtyCategory: selectedSpecialty,
			doctorId: activeDoctor?.id || "",
			serviceId: activeService?.id || "",
			dateIso: selectedDateIso,
			slotId: selectedSlotId,
			timeRu: selectedTimeRu,
			patientFullName,
			patientPhone,
			patientBirthDate,
			patientComment,
			consentPersonalData152Fz: consent152Fz,
			smsOtpCode: smsCode,
			smsVerified: true,
			requiresPrepayment: prepaymentInfo.requiresPrepayment,
			prepaymentAmountRub: prepaymentInfo.prepaymentAmountRub,
			isPrepaid: false,
			bookingConfirmationNumber: confirmationNumber,
		};

		setConfirmedBookingData(completedData);
		setBookingConfirmed(true);
		if (onBookingComplete) {
			onBookingComplete(completedData);
		}
	};

	const handleDownloadIcs = () => {
		if (!confirmedBookingData || !activeDoctor || !activeBranch) return;

		const icsContent = generateIcsCalendarEvent(
			`Прием в ДЕНТЕ: ${activeDoctor.fullName}`,
			`Услуга: ${activeService?.titleRu || "Консультация"}\nКабинет: ${activeBranch.nameRu}\nТелефон: ${activeBranch.phone}`,
			activeBranch.addressRu,
			`${confirmedBookingData.dateIso}T${confirmedBookingData.timeRu}:00`,
			activeService?.durationMinutes || 45,
		);

		const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `Dente_Appointment_${confirmedBookingData.dateIso}_${confirmedBookingData.timeRu.replace(":", "")}.ics`;
		a.click();
		URL.revokeObjectURL(url);
	};

	return (
		<div
			className="patient-portal-overlay"
			data-testid="patient-online-booking-modal"
			role="dialog"
			aria-modal="true"
			aria-labelledby={modalTitleId}
		>
			<div className="patient-portal-modal-window" data-testid="booking-modal-window">
				{/* Top Modal Header */}
				<header className="patient-portal-header">
					<div className="patient-portal-brand">
						<div className="patient-portal-brand-logo">
							<Sparkles className="w-5 h-5 text-white" />
						</div>
						<div className="patient-portal-brand-text">
							<h2 id={modalTitleId}>ОНЛАЙН-ЗАПИСЬ НА ПРИЕМ</h2>
							<p>{activeBranch?.nameRu || "Стоматологическая клиника ДЕНТЕ"}</p>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="p-1.5 rounded-xl text-[var(--muted,#94a3b8)] hover:text-[var(--ink,#f8fafc)] hover:bg-[var(--paper-soft,#334155)] transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
						data-testid="close-online-booking-btn"
						aria-label="Закрыть окно онлайн-записи"
					>
						<X className="w-5 h-5" />
					</button>
				</header>

				{/* Stepper Progress Bar */}
				{!bookingConfirmed && (
					<div className="booking-stepper-header" aria-label="Этапы онлайн-записи">
						<div className={`booking-step-node ${currentStep === 1 ? "active" : currentStep > 1 ? "completed" : ""}`}>
							<div className="booking-step-circle">{currentStep > 1 ? <CheckCircle2 className="w-3.5 h-3.5" /> : 1}</div>
							<span>1. Врач и услуга</span>
						</div>

						<ChevronRight className="w-4 h-4 text-[var(--muted,#64748b)] opacity-50 shrink-0" />

						<div className={`booking-step-node ${currentStep === 2 ? "active" : currentStep > 2 ? "completed" : ""}`}>
							<div className="booking-step-circle">{currentStep > 2 ? <CheckCircle2 className="w-3.5 h-3.5" /> : 2}</div>
							<span>2. Дата и время</span>
						</div>

						<ChevronRight className="w-4 h-4 text-[var(--muted,#64748b)] opacity-50 shrink-0" />

						<div className={`booking-step-node ${currentStep === 3 ? "active" : ""}`}>
							<div className="booking-step-circle">3</div>
							<span>3. СМС-подтверждение</span>
						</div>
					</div>
				)}

				{/* Main Interactive Content */}
				<main className="patient-portal-content">
					{/* ============================================================ */}
					{/* STEP 1: ВЫБОР ВРАЧА И УСЛУГИ */}
					{/* ============================================================ */}
					{currentStep === 1 && !bookingConfirmed && (
						<div className="space-y-4" data-testid="booking-step-1-content">
							{/* Branch Selector */}
							<div className="space-y-1.5">
								<label className="text-xs font-bold text-[var(--muted,#94a3b8)] uppercase tracking-wider flex items-center gap-1.5">
									<MapPin className="w-3.5 h-3.5 text-teal-400" />
									<span>Выберите филиал клиники:</span>
								</label>
								<div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
									{branches.map((br) => {
										const isSelected = selectedBranchId === br.id;
										return (
											<button
												key={br.id}
												type="button"
												onClick={() => setSelectedBranchId(br.id)}
												className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-1 min-h-[48px] ${
													isSelected
														? "bg-[var(--teal-surface,rgba(13,148,136,0.12))] border-[var(--teal,#0d9488)] shadow-sm"
														: "bg-[var(--paper-strong,#0f172a)] border-[var(--line,rgba(255,255,255,0.1))] hover:border-[var(--teal,#0d9488)]"
												}`}
												data-testid={`select-branch-${br.id}`}
											>
												<div className="font-bold text-xs text-[var(--ink,#f8fafc)]">{br.nameRu}</div>
												<div className="text-[11px] text-[var(--muted,#94a3b8)] truncate">{br.metroStationRu}</div>
											</button>
										);
									})}
								</div>
							</div>

							{/* Specialty Category Filter Strip */}
							<div className="space-y-1.5">
								<label className="text-xs font-bold text-[var(--muted,#94a3b8)] uppercase tracking-wider">
									Специализация стоматолога:
								</label>
								<div className="booking-category-chips">
									{SPECIALTY_OPTIONS.map((spec) => (
										<button
											key={spec.id}
											type="button"
											onClick={() => setSelectedSpecialty(spec.id)}
											className={`booking-cat-chip ${selectedSpecialty === spec.id ? "active" : ""}`}
											data-testid={`filter-specialty-${spec.id}`}
										>
											{spec.label}
										</button>
									))}
								</div>
							</div>

							{/* Doctor Selection Cards */}
							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<label className="text-xs font-bold text-[var(--muted,#94a3b8)] uppercase tracking-wider">
										Выберите врача ({availableDoctors.length}):
									</label>
								</div>

								<div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
									{availableDoctors.map((doc) => {
										const isSelected = selectedDoctorId === doc.id;
										return (
											<div
												key={doc.id}
												onClick={() => setSelectedDoctorId(doc.id)}
												className={`booking-doctor-card ${isSelected ? "selected" : ""}`}
												data-testid={`doctor-card-${doc.id}`}
											>
												<div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border border-teal-500/30 bg-teal-500/10 flex items-center justify-center">
													{doc.avatarUrl ? (
														<img src={doc.avatarUrl} alt={doc.fullName} className="w-full h-full object-cover" />
													) : (
														<User className="w-6 h-6 text-teal-400" />
													)}
												</div>

												<div className="flex-1 min-w-0">
													<div className="font-bold text-xs text-[var(--ink,#f8fafc)] break-words line-clamp-2 leading-tight">
														{doc.fullName}
													</div>
													<div className="text-[11px] text-[var(--muted,#94a3b8)] break-words line-clamp-2 leading-tight">
														{doc.specialtyRu}
													</div>
													<div className="flex items-center gap-2 mt-1 text-[10px]">
														<span className="flex items-center text-amber-400 font-bold">
															<Star className="w-3 h-3 fill-amber-400 mr-0.5" />
															{doc.rating} ({doc.reviewsCount})
														</span>
														<span className="text-teal-400 font-semibold bg-teal-500/10 px-1.5 py-0.5 rounded">
															{doc.nextSlotTextRu}
														</span>
													</div>
												</div>
											</div>
										);
									})}
								</div>
							</div>

							{/* Service Selection */}
							<div className="space-y-2">
								<label className="text-xs font-bold text-[var(--muted,#94a3b8)] uppercase tracking-wider">
									Выберите услугу / цель визита:
								</label>

								<div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
									{services.map((srv) => {
										const isSelected = selectedServiceId === srv.id;
										return (
											<div
												key={srv.id}
												onClick={() => setSelectedServiceId(srv.id)}
												className={`booking-service-card ${isSelected ? "selected" : ""}`}
												data-testid={`service-card-${srv.id}`}
											>
												<div className="flex items-start justify-between gap-2">
													<div className="font-bold text-xs text-[var(--ink,#f8fafc)]">
														{srv.titleRu}
													</div>
													{srv.badgeRu && (
														<span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-teal-500/20 text-teal-300 shrink-0">
															{srv.badgeRu}
														</span>
													)}
												</div>
												<p className="text-[11px] text-[var(--muted,#94a3b8)] line-clamp-2">
													{srv.descriptionRu}
												</p>
												<div className="flex items-center justify-between mt-auto pt-1 text-xs">
													<span className="text-[var(--muted,#94a3b8)] flex items-center gap-1 text-[11px]">
														<Clock className="w-3 h-3" />
														{srv.durationMinutes} мин
													</span>
													<span className="font-black text-[var(--ink,#f8fafc)]">
														{srv.isFreeConsultation ? "Бесплатно" : `${srv.priceRub.toLocaleString("ru-RU")} ₽`}
													</span>
												</div>
											</div>
										);
									})}
								</div>
							</div>
						</div>
					)}

					{/* ============================================================ */}
					{/* STEP 2: ВЫБОР ДАТЫ И СЛОТА ВРЕМЕНИ */}
					{/* ============================================================ */}
					{currentStep === 2 && !bookingConfirmed && (
						<div className="space-y-5" data-testid="booking-step-2-content">
							{/* Selected Doctor & Service Summary Ribbon */}
							<div className="p-3 rounded-xl bg-[var(--paper-strong,#0f172a)] border border-[var(--line,rgba(255,255,255,0.1))] flex items-center justify-between">
								<div className="flex items-center gap-2.5">
									<div className="w-9 h-9 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold text-xs">
										{activeDoctor?.fullName.slice(0, 2) || "ДР"}
									</div>
									<div>
										<div className="text-xs font-bold text-[var(--ink,#f8fafc)]">{activeDoctor?.fullName}</div>
										<div className="text-[11px] text-teal-400">{activeService?.titleRu}</div>
									</div>
								</div>
								<div className="text-right text-xs font-bold text-[var(--ink,#f8fafc)]">
									{activeService?.isFreeConsultation ? "0 ₽" : `${activeService?.priceRub.toLocaleString("ru-RU")} ₽`}
								</div>
							</div>

							{/* 7-Day Date Selector Strip */}
							<div className="space-y-2">
								<label className="text-xs font-bold text-[var(--muted,#94a3b8)] uppercase tracking-wider flex items-center gap-1.5">
									<Calendar className="w-3.5 h-3.5 text-teal-400" />
									<span>Выберите дату приема:</span>
								</label>

								<div className="date-selector-strip">
									{availableDates.map((d) => {
										const isSelected = selectedDateIso === d.dateIso;
										return (
											<button
												key={d.dateIso}
												type="button"
												onClick={() => {
													setSelectedDateIso(d.dateIso);
													setSelectedSlotId("");
													setSelectedTimeRu("");
												}}
												className={`date-day-btn ${isSelected ? "selected" : ""}`}
												data-testid={`date-btn-${d.dateIso}`}
											>
												<span className="text-[10px] uppercase font-bold opacity-80">{d.dayRu}</span>
												<span className="text-sm font-black">{d.dateRu}</span>
											</button>
										);
									})}
								</div>
							</div>

							{/* Interactive Time Slots Grid */}
							<div className="time-slots-container space-y-4">
								{/* Morning Period */}
								<div className="space-y-2">
									<div className="time-slot-period-title">
										<Clock className="w-3.5 h-3.5 text-amber-400" />
										<span>Утренние часы (09:00 – 12:00)</span>
									</div>
									<div className="time-slots-grid">
										{timeSlots
											.filter((s) => s.timePeriod === "morning")
											.map((slot) => {
												const isSelected = selectedSlotId === slot.id;
												return (
													<button
														key={slot.id}
														type="button"
														disabled={slot.isOccupied}
														onClick={() => {
															setSelectedSlotId(slot.id);
															setSelectedTimeRu(slot.timeRu);
														}}
														className={`time-slot-btn ${isSelected ? "selected" : ""}`}
														data-testid={`slot-btn-${slot.timeRu.replace(":", "")}`}
													>
														{slot.timeRu}
													</button>
												);
											})}
									</div>
								</div>

								{/* Afternoon Period */}
								<div className="space-y-2">
									<div className="time-slot-period-title">
										<Clock className="w-3.5 h-3.5 text-teal-400" />
										<span>Дневные часы (12:00 – 17:00)</span>
									</div>
									<div className="time-slots-grid">
										{timeSlots
											.filter((s) => s.timePeriod === "afternoon")
											.map((slot) => {
												const isSelected = selectedSlotId === slot.id;
												return (
													<button
														key={slot.id}
														type="button"
														disabled={slot.isOccupied}
														onClick={() => {
															setSelectedSlotId(slot.id);
															setSelectedTimeRu(slot.timeRu);
														}}
														className={`time-slot-btn ${isSelected ? "selected" : ""}`}
														data-testid={`slot-btn-${slot.timeRu.replace(":", "")}`}
													>
														{slot.timeRu}
													</button>
												);
											})}
									</div>
								</div>

								{/* Evening Period */}
								<div className="space-y-2">
									<div className="time-slot-period-title">
										<Clock className="w-3.5 h-3.5 text-indigo-400" />
										<span>Вечерние часы (17:00 – 21:00)</span>
									</div>
									<div className="time-slots-grid">
										{timeSlots
											.filter((s) => s.timePeriod === "evening")
											.map((slot) => {
												const isSelected = selectedSlotId === slot.id;
												return (
													<button
														key={slot.id}
														type="button"
														disabled={slot.isOccupied}
														onClick={() => {
															setSelectedSlotId(slot.id);
															setSelectedTimeRu(slot.timeRu);
														}}
														className={`time-slot-btn ${isSelected ? "selected" : ""}`}
														data-testid={`slot-btn-${slot.timeRu.replace(":", "")}`}
													>
														{slot.timeRu}
													</button>
												);
											})}
									</div>
								</div>
							</div>
						</div>
					)}

					{/* ============================================================ */}
					{/* STEP 3: ПОДТВЕРЖДЕНИЕ ПО СМС И ДАННЫЕ ПАЦИЕНТА */}
					{/* ============================================================ */}
					{currentStep === 3 && !bookingConfirmed && (
						<div className="space-y-4 max-w-lg mx-auto w-full" data-testid="booking-step-3-content">
							{/* Summary Box */}
							<div className="p-3.5 rounded-xl bg-[var(--paper-strong,#0f172a)] border border-[var(--line,rgba(255,255,255,0.1))] space-y-2 text-xs">
								<div className="font-bold text-teal-400 flex items-center justify-between">
									<span>Параметры вашей записи:</span>
									<span className="font-black text-sm text-[var(--ink,#f8fafc)]">
										{selectedDateIso} в {selectedTimeRu}
									</span>
								</div>
								<div className="flex justify-between text-[var(--muted,#94a3b8)]">
									<span>Врач:</span>
									<span className="font-bold text-[var(--ink,#f8fafc)]">{activeDoctor?.fullName}</span>
								</div>
								<div className="flex justify-between text-[var(--muted,#94a3b8)]">
									<span>Филиал:</span>
									<span className="font-bold text-[var(--ink,#f8fafc)]">{activeBranch?.nameRu}</span>
								</div>
								<div className="flex justify-between text-[var(--muted,#94a3b8)]">
									<span>Услуга:</span>
									<span className="font-bold text-[var(--ink,#f8fafc)]">{activeService?.titleRu}</span>
								</div>
							</div>

							{/* Patient Data Form */}
							<div className="space-y-3">
								<div className="space-y-1">
									<label className="text-xs font-bold text-[var(--muted,#94a3b8)]">ФИО Пациента:</label>
									<input
										type="text"
										value={patientFullName}
										onChange={(e) => setPatientFullName(e.target.value)}
										className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[var(--paper-soft,#1e293b)] border border-[var(--line,rgba(255,255,255,0.1))] text-xs text-[var(--ink,#f8fafc)] font-medium outline-none focus:border-teal-500"
										placeholder="Иванов Иван Иванович"
										data-testid="input-patient-fullname"
									/>
								</div>

								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
									<div className="space-y-1">
										<label className="text-xs font-bold text-[var(--muted,#94a3b8)]">Номер телефона:</label>
										<input
											type="tel"
											value={patientPhone}
											onChange={(e) => setPatientPhone(formatRussianPhone(e.target.value))}
											className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[var(--paper-soft,#1e293b)] border border-[var(--line,rgba(255,255,255,0.1))] text-xs text-[var(--ink,#f8fafc)] font-mono font-bold outline-none focus:border-teal-500"
											placeholder="+7 (999) 000-00-00"
											data-testid="input-patient-phone"
										/>
									</div>
									<div className="space-y-1">
										<label className="text-xs font-bold text-[var(--muted,#94a3b8)]">Дата рождения (необязательно):</label>
										<input
											type="date"
											value={patientBirthDate}
											onChange={(e) => setPatientBirthDate(e.target.value)}
											className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[var(--paper-soft,#1e293b)] border border-[var(--line,rgba(255,255,255,0.1))] text-xs text-[var(--ink,#f8fafc)] outline-none focus:border-teal-500"
											data-testid="input-patient-birthdate"
										/>
									</div>
								</div>

								<div className="space-y-1">
									<label className="text-xs font-bold text-[var(--muted,#94a3b8)]">
										Пожелания к визиту / Симптомы (необязательно):
									</label>
									<textarea
										value={patientComment}
										onChange={(e) => setPatientComment(e.target.value)}
										rows={2}
										className="w-full px-3.5 py-2 rounded-xl bg-[var(--paper-soft,#1e293b)] border border-[var(--line,rgba(255,255,255,0.1))] text-xs text-[var(--ink,#f8fafc)] outline-none focus:border-teal-500 resize-none"
										placeholder="Например: острая боль в верхней челюсти, боязнь анестезии..."
										data-testid="input-patient-comment"
									/>
								</div>

								{/* 152-FZ Consent Checkbox */}
								<label className="flex items-start gap-2 text-xs text-[var(--muted,#94a3b8)] cursor-pointer select-none">
									<input
										type="checkbox"
										checked={consent152Fz}
										onChange={(e) => setConsent152Fz(e.target.checked)}
										className="mt-0.5 rounded text-teal-600 focus:ring-teal-500"
										data-testid="checkbox-152fz-consent"
									/>
									<span>
										Согласен на обработку персональных данных и медицинскую коммуникацию по 152-ФЗ и получение СМС-уведомлений.
									</span>
								</label>

								{/* SMS Verification Box */}
								<div className="p-4 rounded-xl bg-[var(--paper-strong,#0f172a)] border border-teal-500/30 space-y-3">
									<div className="flex items-center justify-between">
										<span className="text-xs font-bold text-[var(--ink,#f8fafc)] flex items-center gap-1.5">
											<ShieldCheck className="w-4 h-4 text-teal-400" />
											<span>СМС-верификация записи</span>
										</span>
										{!smsSent ? (
											<button
												type="button"
												onClick={handleSendSms}
												className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--teal-fill,#0d9488)] text-white hover:opacity-90 transition-all shadow-sm"
												data-testid="send-sms-code-btn"
											>
												Отправить код
											</button>
										) : (
											<span className="text-[11px] text-teal-400 font-mono font-bold">
												{smsTimerSeconds > 0 ? `Повтор через ${smsTimerSeconds} с` : ""}
											</span>
										)}
									</div>

									{smsSent && (
										<div className="space-y-2">
											<p className="text-[11px] text-[var(--muted,#94a3b8)]">
												Код из 4 цифр отправлен на номер <strong className="text-white">{patientPhone}</strong> (Тестовый код: <strong className="text-teal-400">7788</strong>)
											</p>

											<div className="flex items-center gap-2">
												<input
													type="text"
													maxLength={4}
													value={smsCode}
													onChange={(e) => setSmsCode(e.target.value)}
													placeholder="7788"
													className="w-32 min-h-[44px] text-center font-mono font-black text-lg tracking-widest rounded-xl bg-[var(--paper-soft,#1e293b)] border border-teal-500/40 text-[var(--ink,#f8fafc)] outline-none focus:border-teal-400"
													data-testid="input-sms-otp-code"
												/>
												{smsTimerSeconds === 0 && (
													<button
														type="button"
														onClick={handleSendSms}
														className="text-xs text-teal-400 underline font-bold"
														data-testid="resend-sms-btn"
													>
														Выслать повторно
													</button>
												)}
											</div>

											{smsError && (
												<div className="text-rose-400 text-[11px] font-semibold flex items-center gap-1">
													<AlertCircle className="w-3.5 h-3.5" />
													<span>{smsError}</span>
												</div>
											)}
										</div>
									)}
								</div>
							</div>
						</div>
					)}

					{/* ============================================================ */}
					{/* SUCCESS SCREEN: ЭЛЕКТРОННЫЙ ТАЛОН БРОНИРОВАНИЯ */}
					{/* ============================================================ */}
					{bookingConfirmed && confirmedBookingData && (
						<div className="space-y-4 max-w-lg mx-auto w-full py-2" data-testid="booking-success-view">
							<div className="text-center space-y-1">
								<div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2 animate-bounce">
									<CheckCircle2 className="w-8 h-8" />
								</div>
								<h3 className="text-base font-black text-[var(--ink,#f8fafc)]">
									Вы успешно записаны на прием!
								</h3>
								<p className="text-xs text-[var(--muted,#94a3b8)]">
									СМС с подтверждением и напоминанием отправлено на номер {confirmedBookingData.patientPhone}
								</p>
							</div>

							{/* Electronic Booking Ticket */}
							<div className="booking-ticket-card" data-testid="booking-ticket-card">
								<div className="booking-ticket-header">
									<div>
										<div className="text-[10px] text-teal-400 font-bold uppercase tracking-wider">
											Электронный талон
										</div>
										<div className="font-mono font-black text-sm text-[var(--ink,#f8fafc)]">
											{confirmedBookingData.bookingConfirmationNumber}
										</div>
									</div>
									<div className="text-right">
										<div className="text-[10px] text-[var(--muted,#94a3b8)]">Статус:</div>
										<div className="text-xs font-bold text-emerald-400">ПОДТВЕРЖДЕНО</div>
									</div>
								</div>

								<div className="booking-ticket-body">
									<div className="booking-ticket-row">
										<span className="booking-ticket-label">Пациент:</span>
										<span className="booking-ticket-val">{confirmedBookingData.patientFullName}</span>
									</div>
									<div className="booking-ticket-row">
										<span className="booking-ticket-label">Дата и время:</span>
										<span className="booking-ticket-val text-teal-400 text-sm">
											{confirmedBookingData.dateIso} в {confirmedBookingData.timeRu}
										</span>
									</div>
									<div className="booking-ticket-row">
										<span className="booking-ticket-label">Врач:</span>
										<span className="booking-ticket-val">{activeDoctor?.fullName}</span>
									</div>
									<div className="booking-ticket-row">
										<span className="booking-ticket-label">Услуга:</span>
										<span className="booking-ticket-val">{activeService?.titleRu}</span>
									</div>
									<div className="booking-ticket-row">
										<span className="booking-ticket-label">Филиал:</span>
										<span className="booking-ticket-val">{activeBranch?.nameRu}</span>
									</div>
									<div className="booking-ticket-row">
										<span className="booking-ticket-label">Адрес:</span>
										<span className="booking-ticket-val text-[11px]">{activeBranch?.addressRu}</span>
									</div>
								</div>
							</div>

							{/* Action Buttons */}
							<div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
								<button
									type="button"
									onClick={handleDownloadIcs}
									className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--paper-strong,#0f172a)] text-[var(--ink,#f8fafc)] border border-[var(--line,rgba(255,255,255,0.15))] hover:border-teal-400 transition-all flex items-center justify-center gap-2 shadow-sm"
									data-testid="download-ics-calendar-btn"
								>
									<Download className="w-4 h-4 text-teal-400" />
									<span>Добавить в календарь (.ics)</span>
								</button>

								<button
									type="button"
									onClick={onClose}
									className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal-fill,#0d9488)] text-white hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-md"
									data-testid="finish-booking-btn"
								>
									<span>Завершить</span>
								</button>
							</div>
						</div>
					)}
				</main>

				{/* Bottom Stepper Actions Footer */}
				{!bookingConfirmed && (
					<footer className="p-3.5 bg-[var(--paper-strong,#0f172a)] border-t border-[var(--line,rgba(204,251,241,0.15))] flex items-center justify-between gap-3">
						{currentStep > 1 ? (
							<button
								type="button"
								onClick={() => setCurrentStep((prev) => (prev - 1) as 1 | 2)}
								className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold bg-[var(--paper-soft,#1e293b)] text-[var(--ink,#f8fafc)] border border-[var(--line,rgba(255,255,255,0.1))] hover:border-teal-400 transition-all flex items-center gap-1.5"
								data-testid="booking-back-btn"
							>
								<ChevronLeft className="w-4 h-4" />
								<span>Назад</span>
							</button>
						) : (
							<div />
						)}

						{currentStep === 1 && (
							<button
								type="button"
								disabled={!selectedDoctorId || !selectedServiceId}
								onClick={() => setCurrentStep(2)}
								className="min-h-[44px] px-5 py-2 rounded-xl text-xs font-bold bg-[var(--teal-fill,#0d9488)] text-white hover:opacity-90 disabled:opacity-40 transition-all flex items-center gap-1.5 shadow-md"
								data-testid="booking-next-to-step-2-btn"
							>
								<span>Выбрать дату и время</span>
								<ChevronRight className="w-4 h-4" />
							</button>
						)}

						{currentStep === 2 && (
							<button
								type="button"
								disabled={!selectedSlotId || !selectedTimeRu}
								onClick={() => setCurrentStep(3)}
								className="min-h-[44px] px-5 py-2 rounded-xl text-xs font-bold bg-[var(--teal-fill,#0d9488)] text-white hover:opacity-90 disabled:opacity-40 transition-all flex items-center gap-1.5 shadow-md"
								data-testid="booking-next-to-step-3-btn"
							>
								<span>Перейти к подтверждению</span>
								<ChevronRight className="w-4 h-4" />
							</button>
						)}

						{currentStep === 3 && (
							<button
								type="button"
								disabled={!consent152Fz || !patientPhone}
								onClick={handleVerifySmsAndConfirm}
								className="min-h-[44px] px-6 py-2 rounded-xl text-xs font-bold bg-[var(--teal-fill,#0d9488)] text-white hover:opacity-90 disabled:opacity-40 transition-all flex items-center gap-2 shadow-md"
								data-testid="booking-confirm-submit-btn"
							>
								<CheckCircle2 className="w-4 h-4" />
								<span>Подтвердить запись</span>
							</button>
						)}
					</footer>
				)}
			</div>
		</div>
	);
};

export default PatientOnlineBookingModal;

