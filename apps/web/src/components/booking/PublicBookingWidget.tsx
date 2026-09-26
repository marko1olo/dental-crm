import type React from "react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import {
	ArrowRight,
	Calendar,
	CheckCircle2,
	ChevronLeft,
	ChevronRight,
	Clock,
	Download,
	MessageSquare,
	Moon,
	Phone,
	PhoneCall,
	ShieldCheck,
	Sparkles,
	User,
} from "lucide-react";
import {
	type BookingContacts,
	type BookingDoctor,
	type BookingReceiptData,
	type BookingSlot,
	type BookingStep,
	DEFAULT_DOCTORS_LIST,
	SERVICE_CATEGORIES,
	type VerificationMethod,
	detectTelegramWebApp,
	dispatchBookingCompletedMessage,
	formatPhoneRu,
	formatRussianDate,
	generateFallbackSlots,
	generateGoogleCalendarUrl,
	generateIcsCalendarContent,
	generateYandexCalendarUrl,
	groupSlotsByDayPeriod,
	isClinicNightTime,
	isValidPatientName,
	isValidRuPhone,
	normalizePhoneDigits,
	toLocalDateString,
} from "./publicBookingEngine";
import "./bookingWidget.css";

export interface PublicBookingWidgetProps {
	readonly organizationId?: string | null;
	readonly apiBaseUrl?: string;
	readonly customDoctors?: BookingDoctor[];
	readonly initialDoctorId?: string;
	readonly onSuccess?: (receipt: BookingReceiptData) => void;
	readonly className?: string;
	readonly compact?: boolean;
}

export const PublicBookingWidget: React.FC<PublicBookingWidgetProps> = ({
	organizationId = null,
	apiBaseUrl = "/api/public/booking",
	customDoctors = DEFAULT_DOCTORS_LIST,
	initialDoctorId,
	onSuccess,
	className = "",
	compact = false,
}) => {
	const widgetId = useId();
	const [step, setStep] = useState<BookingStep>("doctor");

	const doctors = useMemo(
		() => (customDoctors.length > 0 ? customDoctors : DEFAULT_DOCTORS_LIST),
		[customDoctors],
	);
	const isSoloDoctor = doctors.length === 1;

	const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
	const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(() => {
		if (initialDoctorId) return initialDoctorId;
		if (isSoloDoctor && doctors[0]) return doctors[0].id;
		return null;
	});

	const [selectedDate, setSelectedDate] = useState<string>(() => toLocalDateString());
	const [selectedSlot, setSelectedSlot] = useState<BookingSlot | null>(null);
	const [slots, setSlots] = useState<BookingSlot[]>(() => generateFallbackSlots(toLocalDateString()));
	const [loadingSlots, setLoadingSlots] = useState<boolean>(false);

	const [contacts, setContacts] = useState<BookingContacts>({
		patientName: "",
		patientPhone: "",
		verificationCode: "",
		verificationMethod: "sms",
		comment: "",
	});
	const [otpSent, setOtpSent] = useState<boolean>(false);
	const [otpCountdown, setOtpCountdown] = useState<number>(0);
	const [submitting, setSubmitting] = useState<boolean>(false);
	const [bookingError, setBookingError] = useState<string | null>(null);
	const [receipt, setReceipt] = useState<BookingReceiptData | null>(null);

	const isNightMode = useMemo(() => isClinicNightTime(), []);
	const telegramInfo = useMemo(() => detectTelegramWebApp(), []);

	useEffect(() => {
		if (telegramInfo.isTelegram && telegramInfo.user?.firstName) {
			setContacts((prev) => ({
				...prev,
				patientName: prev.patientName || telegramInfo.user?.firstName || "",
			}));
		}
	}, [telegramInfo]);

	useEffect(() => {
		if (isSoloDoctor && doctors[0]) {
			setSelectedDoctorId(doctors[0].id);
		}
	}, [isSoloDoctor, doctors]);

	const fetchSlots = useCallback(
		async (date: string, doctorId: string | null) => {
			if (!organizationId) {
				setSlots(generateFallbackSlots(date));
				return;
			}
			setLoadingSlots(true);
			try {
				const url = doctorId
					? `${apiBaseUrl}/${organizationId}/slots?date=${date}&doctorId=${doctorId}`
					: `${apiBaseUrl}/${organizationId}/slots?date=${date}`;
				const res = await fetch(url);
				if (res.ok) {
					const data = (await res.json()) as BookingSlot[];
					setSlots(Array.isArray(data) && data.length > 0 ? data : generateFallbackSlots(date));
				} else {
					setSlots(generateFallbackSlots(date));
				}
			} catch {
				setSlots(generateFallbackSlots(date));
			} finally {
				setLoadingSlots(false);
			}
		},
		[apiBaseUrl, organizationId],
	);

	useEffect(() => {
		void fetchSlots(selectedDate, selectedDoctorId);
	}, [fetchSlots, selectedDate, selectedDoctorId]);

	useEffect(() => {
		if (otpCountdown <= 0) return;
		const timer = setTimeout(() => setOtpCountdown((c) => c - 1), 1000);
		return () => clearTimeout(timer);
	}, [otpCountdown]);

	const filteredDoctors = useMemo(() => {
		if (selectedCategoryId === "all") return doctors;
		return doctors.filter(
			(d) => d.categoryIds.includes(selectedCategoryId) || d.categoryIds.includes("all"),
		);
	}, [doctors, selectedCategoryId]);

	const activeDoctor = useMemo(
		() => doctors.find((d) => d.id === selectedDoctorId) ?? doctors[0],
		[doctors, selectedDoctorId],
	);

	const groupedSlots = useMemo(() => groupSlotsByDayPeriod(slots), [slots]);

	const handleSendOtp = () => {
		if (!isValidRuPhone(contacts.patientPhone)) {
			setBookingError("Введите корректный номер мобильного телефона РФ");
			return;
		}
		setBookingError(null);
		setOtpSent(true);
		setOtpCountdown(60);
	};

	const handleConfirmBooking = async () => {
		if (!isValidPatientName(contacts.patientName)) {
			setBookingError("Укажите ваше имя (минимум 2 буквы)");
			return;
		}
		if (!isValidRuPhone(contacts.patientPhone)) {
			setBookingError("Введите корректный номер мобильного телефона");
			return;
		}
		if (!selectedSlot) {
			setBookingError("Выберите время приёма");
			return;
		}

		setSubmitting(true);
		setBookingError(null);

		const doctor = activeDoctor;
		const doctorName = doctor?.fullName ?? "Дежурный врач";

		try {
			if (organizationId) {
				const res = await fetch(`${apiBaseUrl}/${organizationId}/book`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						doctorId: selectedDoctorId || doctor?.id,
						startsAt: selectedSlot.startsAt,
						endsAt: selectedSlot.endsAt,
						patientName: contacts.patientName.trim(),
						patientPhone: normalizePhoneDigits(contacts.patientPhone),
						comment: contacts.comment.trim() || undefined,
					}),
				});

				if (!res.ok) {
					const errJson = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
					throw new Error(errJson?.message || errJson?.error || "Не удалось создать запись на приём");
				}
			}

			const referenceNumber = `BKG-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
			const receiptData: BookingReceiptData = {
				bookingId: `bkg-${Date.now()}`,
				referenceNumber,
				status: isNightMode ? "PENDING_RESERVATION" : "CONFIRMED",
				isNightMode,
				message: isNightMode
					? `Заявка принята! За вами зафиксировано время ${selectedSlot.time}. Администратор подтвердит запись в 08:30.`
					: "Запись успешно подтверждена!",
				doctorName,
				specialty: doctor?.specialties.join(", "),
				date: formatRussianDate(selectedDate),
				time: selectedSlot.time,
				morningConfirmTime: isNightMode ? "08:30" : undefined,
				clinicAddress: "Клиника DENTE, главный корпус",
				patientName: contacts.patientName.trim(),
				patientPhone: contacts.patientPhone,
				createdAt: new Date().toISOString(),
			};

			setReceipt(receiptData);
			setStep("confirmation");
			dispatchBookingCompletedMessage(receiptData);
			onSuccess?.(receiptData);
		} catch (err) {
			setBookingError((err as Error).message || "Произошла ошибка при бронировании");
		} finally {
			setSubmitting(false);
		}
	};

	const calendarPayload = useMemo(() => {
		if (!receipt || !selectedSlot) return null;
		return {
			title: `Приём у стоматолога (${receipt.doctorName})`,
			description: `Онлайн-запись DENTE. Номер брони: ${receipt.referenceNumber}. Пациент: ${receipt.patientName}.`,
			location: receipt.clinicAddress,
			startsAt: selectedSlot.startsAt,
			endsAt: selectedSlot.endsAt,
		};
	}, [receipt, selectedSlot]);

	const dateChips = useMemo(() => {
		const items: Array<{ dateStr: string; dayName: string; dayNum: number }> = [];
		const now = new Date();
		for (let i = 0; i < 7; i++) {
			const d = new Date(now.getTime() + i * 24 * 60 * 60_000);
			const dateStr = toLocalDateString(d);
			const dayName = i === 0 ? "Сегодня" : i === 1 ? "Завтра" : d.toLocaleDateString("ru-RU", { weekday: "short" });
			items.push({ dateStr, dayName, dayNum: d.getDate() });
		}
		return items;
	}, []);

	return (
		<div
			id={`dente-widget-${widgetId}`}
			className={`dente-booking-widget ${compact ? "compact-mode" : ""} ${className}`}
			style={{
				maxWidth: compact ? "440px" : "640px",
				background: "var(--paper, #ffffff)",
				color: "var(--ink, #0f172a)",
				borderRadius: "14px",
				border: "1px solid var(--glass-border, rgba(0,0,0,0.1))",
				boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.08)",
				padding: "20px",
				margin: "0 auto",
				boxSizing: "border-box",
			}}
		>
			{/* Widget Header & Step Indicator */}
			<header style={{ borderBottom: "1px solid var(--glass-border, rgba(0,0,0,0.08))", paddingBottom: "12px", marginBottom: "16px" }}>
				<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
					<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
						<span style={{ width: "10px", height: "10px", borderRadius: "50%", background: isNightMode ? "#f59e0b" : "#10b981", display: "inline-block" }} />
						<span style={{ fontSize: "12px", fontWeight: 600, color: "var(--muted, #64748b)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
							{isNightMode ? "Ночной приём 24/7" : "Онлайн-запись"}
						</span>
					</div>
					{step !== "confirmation" && (
						<span style={{ fontSize: "12px", color: "var(--muted, #64748b)" }}>
							Шаг {step === "doctor" ? "1 из 3" : step === "slot" ? "2 из 3" : "3 из 3"}
						</span>
					)}
				</div>
				<h2 style={{ margin: "6px 0 2px", fontSize: "18px", fontWeight: 700, color: "var(--ink, #0f172a)" }}>
					{step === "doctor" && "Выбор специалиста"}
					{step === "slot" && "Выбор даты и времени"}
					{step === "contacts" && "Подтверждение записи"}
					{step === "confirmation" && "Квитанция записи"}
				</h2>
			</header>

			{/* STEP 1: DOCTOR & SPECIALTY SELECTION */}
			{step === "doctor" && (
				<section>
					{!isSoloDoctor && (
						<div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "8px", marginBottom: "12px", scrollbarWidth: "none" }}>
							{SERVICE_CATEGORIES.map((cat) => (
								<button
									key={cat.id}
									type="button"
									onClick={() => setSelectedCategoryId(cat.id)}
									style={{
										padding: "6px 12px",
										borderRadius: "20px",
										fontSize: "12px",
										fontWeight: 600,
										whiteSpace: "nowrap",
										border: selectedCategoryId === cat.id ? "1px solid var(--primary, #0d9488)" : "1px solid var(--glass-border, rgba(0,0,0,0.1))",
										background: selectedCategoryId === cat.id ? "var(--primary, #0d9488)" : "var(--paper-strong, #f8fafc)",
										color: selectedCategoryId === cat.id ? "#ffffff" : "var(--ink, #0f172a)",
										cursor: "pointer",
									}}
								>
									{cat.label}
								</button>
							))}
						</div>
					)}

					<div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
						{filteredDoctors.map((doc) => {
							const isSelected = selectedDoctorId === doc.id;
							return (
								<div
									key={doc.id}
									role="button"
									tabIndex={0}
									onClick={() => { setSelectedDoctorId(doc.id); setStep("slot"); }}
									onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { setSelectedDoctorId(doc.id); setStep("slot"); } }}
									style={{
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
										padding: "12px 14px",
										borderRadius: "10px",
										border: isSelected ? "2px solid var(--primary, #0d9488)" : "1px solid var(--glass-border, rgba(0,0,0,0.08))",
										background: isSelected ? "var(--primary-light, rgba(13, 148, 136, 0.08))" : "var(--paper-strong, #f8fafc)",
										cursor: "pointer",
									}}
								>
									<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
										<div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "var(--primary, #0d9488)", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "14px" }}>
											{doc.fullName.split(" ").map((p) => p[0]).slice(0, 2).join("")}
										</div>
										<div>
											<div style={{ fontWeight: 600, fontSize: "14px", color: "var(--ink, #0f172a)" }}>{doc.fullName}</div>
											<div style={{ fontSize: "12px", color: "var(--muted, #64748b)" }}>{doc.specialties.join(" • ")}</div>
											{doc.experienceYears && <div style={{ fontSize: "11px", color: "var(--muted, #64748b)", marginTop: "2px" }}>Стаж {doc.experienceYears} лет</div>}
										</div>
									</div>
									<ChevronRight size={18} color="var(--muted, #64748b)" />
								</div>
							);
						})}
					</div>

					{selectedDoctorId && !isSoloDoctor && (
						<button
							type="button"
							onClick={() => setStep("slot")}
							style={{
								marginTop: "16px",
								width: "100%",
								padding: "10px",
								borderRadius: "8px",
								background: "var(--primary, #0d9488)",
								color: "#ffffff",
								fontWeight: 600,
								fontSize: "14px",
								border: "none",
								cursor: "pointer",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								gap: "6px",
							}}
						>
							Выбрать время приёма <ArrowRight size={16} />
						</button>
					)}
				</section>
			)}

			{/* STEP 2: DATE & TIME SLOT PICKER */}
			{step === "slot" && (
				<section>
					<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: "8px", background: "var(--paper-strong, #f8fafc)", marginBottom: "12px", fontSize: "13px" }}>
						<div><span style={{ color: "var(--muted, #64748b)" }}>Врач: </span><strong>{activeDoctor?.fullName}</strong></div>
						{!isSoloDoctor && (
							<button type="button" onClick={() => setStep("doctor")} style={{ border: "none", background: "transparent", color: "var(--primary, #0d9488)", cursor: "pointer", fontWeight: 600, fontSize: "12px" }}>
								Сменить
							</button>
						)}
					</div>

					{isNightMode && (
						<div style={{ display: "flex", alignItems: "flex-start", gap: "8px", padding: "10px 12px", borderRadius: "8px", background: "rgba(245, 158, 11, 0.12)", border: "1px solid rgba(245, 158, 11, 0.3)", marginBottom: "14px", fontSize: "12px", color: "var(--ink, #0f172a)" }}>
							<Moon size={16} color="#d97706" style={{ marginTop: "2px", flexShrink: 0 }} />
							<div><strong>Ночной приём заявок:</strong> Клиника сейчас закрыта. Мы зафиксируем за вами мягкий слот, и администратор подтвердит запись в 08:30 утра.</div>
						</div>
					)}

					<div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "8px", marginBottom: "14px", scrollbarWidth: "none" }}>
						{dateChips.map((chip) => {
							const isSelected = selectedDate === chip.dateStr;
							return (
								<button
									key={chip.dateStr}
									type="button"
									onClick={() => { setSelectedDate(chip.dateStr); setSelectedSlot(null); }}
									style={{
										display: "flex",
										flexDirection: "column",
										alignItems: "center",
										justifyContent: "center",
										minWidth: "64px",
										padding: "8px 6px",
										borderRadius: "8px",
										border: isSelected ? "2px solid var(--primary, #0d9488)" : "1px solid var(--glass-border, rgba(0,0,0,0.1))",
										background: isSelected ? "var(--primary, #0d9488)" : "var(--paper-strong, #f8fafc)",
										color: isSelected ? "#ffffff" : "var(--ink, #0f172a)",
										cursor: "pointer",
									}}
								>
									<span style={{ fontSize: "11px", opacity: 0.85 }}>{chip.dayName}</span>
									<span style={{ fontSize: "16px", fontWeight: 700 }}>{chip.dayNum}</span>
								</button>
							);
						})}
					</div>

					{loadingSlots ? (
						<div style={{ padding: "24px", textAlign: "center", color: "var(--muted, #64748b)", fontSize: "13px" }}>Загрузка свободных слотов...</div>
					) : (
						<div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "250px", overflowY: "auto", paddingRight: "4px" }}>
							{groupedSlots.morning.length > 0 && (
								<div>
									<div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted, #64748b)", marginBottom: "6px" }}>УТРО (до 12:00)</div>
									<div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }}>
										{groupedSlots.morning.map((s) => (
											<button
												key={s.startsAt}
												type="button"
												onClick={() => setSelectedSlot(s)}
												style={{
													padding: "8px 4px",
													borderRadius: "6px",
													fontSize: "13px",
													fontWeight: 600,
													border: selectedSlot?.startsAt === s.startsAt ? "2px solid var(--primary, #0d9488)" : "1px solid var(--glass-border, rgba(0,0,0,0.1))",
													background: selectedSlot?.startsAt === s.startsAt ? "var(--primary, #0d9488)" : "var(--paper-strong, #f8fafc)",
													color: selectedSlot?.startsAt === s.startsAt ? "#ffffff" : "var(--ink, #0f172a)",
													cursor: "pointer",
												}}
											>
												{s.time}
											</button>
										))}
									</div>
								</div>
							)}
							{groupedSlots.afternoon.length > 0 && (
								<div>
									<div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted, #64748b)", marginBottom: "6px" }}>ДЕНЬ (12:00 — 17:00)</div>
									<div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }}>
										{groupedSlots.afternoon.map((s) => (
											<button
												key={s.startsAt}
												type="button"
												onClick={() => setSelectedSlot(s)}
												style={{
													padding: "8px 4px",
													borderRadius: "6px",
													fontSize: "13px",
													fontWeight: 600,
													border: selectedSlot?.startsAt === s.startsAt ? "2px solid var(--primary, #0d9488)" : "1px solid var(--glass-border, rgba(0,0,0,0.1))",
													background: selectedSlot?.startsAt === s.startsAt ? "var(--primary, #0d9488)" : "var(--paper-strong, #f8fafc)",
													color: selectedSlot?.startsAt === s.startsAt ? "#ffffff" : "var(--ink, #0f172a)",
													cursor: "pointer",
												}}
											>
												{s.time}
											</button>
										))}
									</div>
								</div>
							)}
							{groupedSlots.evening.length > 0 && (
								<div>
									<div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted, #64748b)", marginBottom: "6px" }}>ВЕЧЕР (после 17:00)</div>
									<div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }}>
										{groupedSlots.evening.map((s) => (
											<button
												key={s.startsAt}
												type="button"
												onClick={() => setSelectedSlot(s)}
												style={{
													padding: "8px 4px",
													borderRadius: "6px",
													fontSize: "13px",
													fontWeight: 600,
													border: selectedSlot?.startsAt === s.startsAt ? "2px solid var(--primary, #0d9488)" : "1px solid var(--glass-border, rgba(0,0,0,0.1))",
													background: selectedSlot?.startsAt === s.startsAt ? "var(--primary, #0d9488)" : "var(--paper-strong, #f8fafc)",
													color: selectedSlot?.startsAt === s.startsAt ? "#ffffff" : "var(--ink, #0f172a)",
													cursor: "pointer",
												}}
											>
												{s.time}
											</button>
										))}
									</div>
								</div>
							)}
						</div>
					)}

					<div style={{ display: "flex", justifyContent: "space-between", gap: "10px", marginTop: "16px" }}>
						{!isSoloDoctor && (
							<button type="button" onClick={() => setStep("doctor")} style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--glass-border, rgba(0,0,0,0.1))", background: "var(--paper-strong, #f8fafc)", color: "var(--ink, #0f172a)", fontSize: "13px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
								<ChevronLeft size={16} /> Назад
							</button>
						)}
						<button
							type="button"
							disabled={!selectedSlot}
							onClick={() => setStep("contacts")}
							style={{
								flex: 1,
								padding: "10px 14px",
								borderRadius: "8px",
								border: "none",
								background: selectedSlot ? "var(--primary, #0d9488)" : "var(--muted, #cbd5e1)",
								color: "#ffffff",
								fontSize: "13px",
								fontWeight: 600,
								cursor: selectedSlot ? "pointer" : "not-allowed",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								gap: "6px",
							}}
						>
							Продолжить <ArrowRight size={16} />
						</button>
					</div>
				</section>
			)}

			{/* STEP 3: PATIENT CONTACTS & VERIFICATION */}
			{step === "contacts" && (
				<section>
					<div style={{ padding: "10px 12px", borderRadius: "8px", background: "var(--paper-strong, #f8fafc)", border: "1px solid var(--glass-border, rgba(0,0,0,0.08))", marginBottom: "14px", fontSize: "13px", display: "flex", flexDirection: "column", gap: "4px" }}>
						<div><span style={{ color: "var(--muted, #64748b)" }}>Врач: </span><strong>{activeDoctor?.fullName}</strong></div>
						<div><span style={{ color: "var(--muted, #64748b)" }}>Дата и время: </span><strong>{formatRussianDate(selectedDate)} в {selectedSlot?.time}</strong></div>
					</div>

					<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
						<div>
							<label htmlFor="patientNameInput" style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px", color: "var(--ink, #0f172a)" }}>
								Ваше имя и фамилия *
							</label>
							<input
								id="patientNameInput"
								type="text"
								placeholder="Иван Иванов"
								value={contacts.patientName}
								onChange={(e) => setContacts((prev) => ({ ...prev, patientName: e.target.value }))}
								style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid var(--glass-border, rgba(0,0,0,0.15))", background: "var(--paper, #ffffff)", color: "var(--ink, #0f172a)", fontSize: "14px", boxSizing: "border-box" }}
							/>
						</div>

						<div>
							<label htmlFor="patientPhoneInput" style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px", color: "var(--ink, #0f172a)" }}>
								Номер телефона *
							</label>
							<input
								id="patientPhoneInput"
								type="tel"
								placeholder="+7 (___) ___-__-__"
								value={contacts.patientPhone}
								onChange={(e) => setContacts((prev) => ({ ...prev, patientPhone: formatPhoneRu(e.target.value) }))}
								style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid var(--glass-border, rgba(0,0,0,0.15))", background: "var(--paper, #ffffff)", color: "var(--ink, #0f172a)", fontSize: "14px", boxSizing: "border-box" }}
							/>
						</div>

						<div>
							<span style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "6px", color: "var(--ink, #0f172a)" }}>
								Способ подтверждения
							</span>
							<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
								<button
									type="button"
									onClick={() => setContacts((prev) => ({ ...prev, verificationMethod: "sms" }))}
									style={{
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										gap: "6px",
										padding: "8px",
										borderRadius: "8px",
										border: contacts.verificationMethod === "sms" ? "2px solid var(--primary, #0d9488)" : "1px solid var(--glass-border, rgba(0,0,0,0.1))",
										background: contacts.verificationMethod === "sms" ? "var(--primary-light, rgba(13, 148, 136, 0.08))" : "var(--paper-strong, #f8fafc)",
										color: "var(--ink, #0f172a)",
										fontSize: "12px",
										fontWeight: 600,
										cursor: "pointer",
									}}
								>
									<MessageSquare size={15} color="var(--primary, #0d9488)" /> SMS-код
								</button>
								<button
									type="button"
									onClick={() => setContacts((prev) => ({ ...prev, verificationMethod: "flash_call" }))}
									style={{
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										gap: "6px",
										padding: "8px",
										borderRadius: "8px",
										border: contacts.verificationMethod === "flash_call" ? "2px solid var(--primary, #0d9488)" : "1px solid var(--glass-border, rgba(0,0,0,0.1))",
										background: contacts.verificationMethod === "flash_call" ? "var(--primary-light, rgba(13, 148, 136, 0.08))" : "var(--paper-strong, #f8fafc)",
										color: "var(--ink, #0f172a)",
										fontSize: "12px",
										fontWeight: 600,
										cursor: "pointer",
									}}
								>
									<PhoneCall size={15} color="var(--primary, #0d9488)" /> Звонок-сброс
								</button>
							</div>
						</div>

						{!otpSent ? (
							<button
								type="button"
								onClick={handleSendOtp}
								style={{
									padding: "8px 12px",
									borderRadius: "8px",
									border: "1px solid var(--primary, #0d9488)",
									background: "transparent",
									color: "var(--primary, #0d9488)",
									fontWeight: 600,
									fontSize: "12px",
									cursor: "pointer",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									gap: "6px",
								}}
							>
								{contacts.verificationMethod === "sms" ? "Отправить проверочный SMS-код" : "Заказать звонок-сброс (последние 4 цифры)"}
							</button>
						) : (
							<div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
								<input
									type="text"
									maxLength={6}
									placeholder={contacts.verificationMethod === "sms" ? "Код из SMS" : "4 цифры входящего номера"}
									value={contacts.verificationCode}
									onChange={(e) => setContacts((prev) => ({ ...prev, verificationCode: e.target.value.replace(/\D/g, "") }))}
									style={{ flex: 1, padding: "9px 12px", borderRadius: "8px", border: "1px solid var(--glass-border, rgba(0,0,0,0.15))", fontSize: "14px", boxSizing: "border-box" }}
								/>
								{otpCountdown > 0 ? (
									<span style={{ fontSize: "11px", color: "var(--muted, #64748b)", whiteSpace: "nowrap" }}>Повтор {otpCountdown}с</span>
								) : (
									<button type="button" onClick={handleSendOtp} style={{ border: "none", background: "transparent", color: "var(--primary, #0d9488)", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}>
										Запросить снова
									</button>
								)}
							</div>
						)}

						<div>
							<label htmlFor="patientCommentInput" style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px", color: "var(--ink, #0f172a)" }}>
								Что вас беспокоит? (необязательно)
							</label>
							<textarea
								id="patientCommentInput"
								rows={2}
								placeholder="Боль в зубе, профилактический осмотр, консультация..."
								value={contacts.comment}
								onChange={(e) => setContacts((prev) => ({ ...prev, comment: e.target.value }))}
								style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--glass-border, rgba(0,0,0,0.15))", background: "var(--paper, #ffffff)", color: "var(--ink, #0f172a)", fontSize: "13px", boxSizing: "border-box", resize: "none" }}
							/>
						</div>
					</div>

					{bookingError && (
						<div style={{ marginTop: "12px", padding: "8px 12px", borderRadius: "6px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#b91c1c", fontSize: "12px" }}>
							{bookingError}
						</div>
					)}

					<div style={{ display: "flex", justifyContent: "space-between", gap: "10px", marginTop: "16px" }}>
						<button type="button" onClick={() => setStep("slot")} style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--glass-border, rgba(0,0,0,0.1))", background: "var(--paper-strong, #f8fafc)", color: "var(--ink, #0f172a)", fontSize: "13px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
							<ChevronLeft size={16} /> Назад
						</button>
						<button
							type="button"
							disabled={submitting}
							onClick={handleConfirmBooking}
							style={{
								flex: 1,
								padding: "11px 16px",
								borderRadius: "8px",
								border: "none",
								background: "var(--primary, #0d9488)",
								color: "#ffffff",
								fontSize: "14px",
								fontWeight: 700,
								cursor: submitting ? "wait" : "pointer",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								gap: "6px",
							}}
						>
							{submitting ? "Оформление записи..." : "Записаться на приём"}
						</button>
					</div>
				</section>
			)}

			{/* STEP 4: CONFIRMATION RECEIPT */}
			{step === "confirmation" && receipt && (
				<section style={{ textAlign: "center", padding: "10px 0" }}>
					<div style={{ display: "inline-flex", padding: "12px", borderRadius: "50%", background: receipt.status === "CONFIRMED" ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)", marginBottom: "12px" }}>
						{receipt.status === "CONFIRMED" ? <CheckCircle2 size={36} color="#10b981" /> : <Moon size={36} color="#f59e0b" />}
					</div>

					<h3 style={{ margin: "0 0 6px", fontSize: "18px", fontWeight: 700, color: "var(--ink, #0f172a)" }}>
						{receipt.status === "CONFIRMED" ? "Запись подтверждена!" : "Заявка принята!"}
					</h3>
					<p style={{ margin: "0 0 16px", fontSize: "13px", color: "var(--muted, #64748b)", lineHeight: "1.4" }}>
						{receipt.message}
					</p>

					<div style={{ textAlign: "left", padding: "14px", borderRadius: "10px", background: "var(--paper-strong, #f8fafc)", border: "1px dashed var(--glass-border, rgba(0,0,0,0.15))", marginBottom: "18px", fontSize: "13px", display: "flex", flexDirection: "column", gap: "8px" }}>
						<div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--muted, #64748b)" }}>Бронь:</span><strong>{receipt.referenceNumber}</strong></div>
						<div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--muted, #64748b)" }}>Врач:</span><strong>{receipt.doctorName}</strong></div>
						<div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--muted, #64748b)" }}>Дата и время:</span><strong>{receipt.date}, {receipt.time}</strong></div>
						<div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--muted, #64748b)" }}>Пациент:</span><span>{receipt.patientName}</span></div>
					</div>

					{calendarPayload && (
						<div style={{ marginBottom: "16px" }}>
							<div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted, #64748b)", marginBottom: "8px", textTransform: "uppercase" }}>
								Добавить напоминание в календарь
							</div>
							<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px" }}>
								<a href={generateGoogleCalendarUrl(calendarPayload)} target="_blank" rel="noreferrer" style={{ padding: "8px 6px", borderRadius: "6px", border: "1px solid var(--glass-border, rgba(0,0,0,0.1))", background: "var(--paper, #ffffff)", color: "var(--ink, #0f172a)", fontSize: "11px", fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
									<Calendar size={13} /> Google
								</a>
								<a href={generateYandexCalendarUrl(calendarPayload)} target="_blank" rel="noreferrer" style={{ padding: "8px 6px", borderRadius: "6px", border: "1px solid var(--glass-border, rgba(0,0,0,0.1))", background: "var(--paper, #ffffff)", color: "var(--ink, #0f172a)", fontSize: "11px", fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
									<Calendar size={13} /> Яндекс
								</a>
								<button
									type="button"
									onClick={() => {
										const blob = new Blob([generateIcsCalendarContent(calendarPayload)], { type: "text/calendar;charset=utf-8" });
										const url = URL.createObjectURL(blob);
										const a = document.createElement("a");
										a.href = url;
										a.download = `dente-booking-${receipt.referenceNumber}.ics`;
										a.click();
										URL.revokeObjectURL(url);
									}}
									style={{ padding: "8px 6px", borderRadius: "6px", border: "1px solid var(--glass-border, rgba(0,0,0,0.1))", background: "var(--paper, #ffffff)", color: "var(--ink, #0f172a)", fontSize: "11px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}
								>
									<Download size={13} /> iCal (.ics)
								</button>
							</div>
						</div>
					)}

					<button
						type="button"
						onClick={() => { setStep("doctor"); setSelectedSlot(null); setReceipt(null); setOtpSent(false); }}
						style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--glass-border, rgba(0,0,0,0.15))", background: "var(--paper-strong, #f8fafc)", color: "var(--ink, #0f172a)", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
					>
						Записаться на другое время
					</button>
				</section>
			)}
		</div>
	);
};
