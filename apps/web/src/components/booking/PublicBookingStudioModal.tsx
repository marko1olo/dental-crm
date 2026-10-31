/**
 * PublicBookingStudioModal.tsx — Канонический монолитный SSOT виджет онлайн-бронирования DENTE CRM
 * Мандаты: 8b (Sweet Spot 380–480 строк), 8e (Doctor Autonomy — кнопки НИКОГДА НЕ DISABLED),
 * 8am (Ровно ОДНА Primary CTA кнопка #0d9488 на видимый контекст), 8ze / Mobile HIG (Touch target >= 44x44, Bottom Sheet, Thumb Zone).
 */

import React, { useState, useEffect, useId, useMemo } from "react";
import {
	Check,
	Calendar as CalendarIcon,
	User,
	Phone,
	ShieldCheck,
	ChevronRight,
	ArrowLeft,
	X,
	MapPin,
	Stethoscope,
	Sparkles,
	Scissors,
	Smile,
	Activity,
} from "lucide-react";
import type { BookingConfirmationData, BookingDoctorData, ServiceCategory } from "./contracts/bookingContracts";
import {
	ANY_DOCTOR_ID,
	ANY_DOCTOR_SPECIALIST,
	CANONICAL_ONLINE_CATEGORIES,
	CANONICAL_ONLINE_DOCTORS,
	DEFAULT_CLINIC_BRANCH,
	detectTelegramUser,
	formatRuPhoneInput,
	generateDailyTimeSlots,
	getDoctorsForCategory,
	isValidRuPhone,
	submitOnlineBookingPayload,
} from "./onlineBookingCatalogData";

export interface PublicBookingStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly organizationId?: string | null;
	readonly initialCategoryId?: string;
	readonly initialDoctorId?: string;
}

export const PublicBookingStudioModal: React.FC<PublicBookingStudioModalProps> = ({
	isOpen,
	onClose,
	organizationId,
	initialCategoryId,
	initialDoctorId,
}) => {
	const widgetId = useId();
	const [step, setStep] = useState<1 | 2 | 3 | 4>(1); // 1: Услуга, 2: Доктор, 3: Слот и Контакты, 4: Талон
	const [selectedCategory, setSelectedCategory] = useState<ServiceCategory>(() => (
		CANONICAL_ONLINE_CATEGORIES.find((c) => c.id === initialCategoryId) || CANONICAL_ONLINE_CATEGORIES[0]
	));
	const [selectedServiceId, setSelectedServiceId] = useState<string>(() => (
		selectedCategory.popularServices[0]?.id || ""
	));
	const [selectedDoctor, setSelectedDoctor] = useState<BookingDoctorData>(() => (
		CANONICAL_ONLINE_DOCTORS.find((d) => d.id === initialDoctorId) || ANY_DOCTOR_SPECIALIST
	));

	// Генерация 14 календарных дней для бронирования
	const availableDates = useMemo(() => {
		const list: { iso: string; label: string; weekday: string }[] = [];
		const today = new Date();
		const weekdays = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
		const months = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
		for (let i = 0; i < 14; i++) {
			const d = new Date(today);
			d.setDate(today.getDate() + i);
			const iso = d.toISOString().split("T")[0];
			const label = i === 0 ? "Сегодня" : i === 1 ? "Завтра" : `${d.getDate()} ${months[d.getMonth()]}`;
			list.push({ iso, label, weekday: weekdays[d.getDay()] });
		}
		return list;
	}, []);

	const [selectedDate, setSelectedDate] = useState<string>(() => availableDates[0]?.iso || "");
	const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("10:00");
	const [patientName, setPatientName] = useState<string>("");
	const [patientPhone, setPatientPhone] = useState<string>("");
	const [bookingComment, setBookingComment] = useState<string>("");
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
	const [phoneFeedback, setPhoneFeedback] = useState<string | null>(null);
	const [confirmationData, setConfirmationData] = useState<BookingConfirmationData | null>(null);

	const tgUser = useMemo(() => detectTelegramUser(), []);

	useEffect(() => {
		if (tgUser) {
			if (!patientName && tgUser.firstName) setPatientName(`${tgUser.firstName} ${tgUser.lastName || ""}`.trim());
			if (!patientPhone && tgUser.phone) setPatientPhone(formatRuPhoneInput(tgUser.phone));
		}
	}, [tgUser, patientName, patientPhone]);

	const timeSlots = useMemo(() => generateDailyTimeSlots(selectedDate, 30), [selectedDate]);
	const availableDoctors = useMemo(() => getDoctorsForCategory(selectedCategory.id), [selectedCategory.id]);

	if (!isOpen) return null;

	const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setPatientPhone(formatRuPhoneInput(e.target.value));
		if (phoneFeedback) setPhoneFeedback(null);
	};

	// Мандат 8e: Primary CTA кнопка НИКОГДА НЕ DISABLED!
	const handleSubmitBooking = async () => {
		if (!isValidRuPhone(patientPhone)) {
			setPhoneFeedback("Укажите контактный телефон РФ (+7)");
			const el = document.getElementById(`dente-phone-${widgetId}`);
			if (el) el.focus();
			return;
		}

		setIsSubmitting(true);
		setPhoneFeedback(null);
		try {
			const res = await submitOnlineBookingPayload({
				organizationId,
				categoryId: selectedCategory.id,
				serviceId: selectedServiceId,
				doctorId: selectedDoctor.id,
				date: selectedDate,
				time: selectedTimeSlot,
				patientName: patientName || "Пациент",
				patientPhone,
				comment: bookingComment,
				authMethod: tgUser ? "telegram" : "direct",
			});
			setConfirmationData(res);
			setStep(4);
		} catch (_err) {
			setStep(4);
		} finally {
			setIsSubmitting(false);
		}
	};

	const renderIcon = (name: string) => {
		switch (name) {
			case "Stethoscope": return <Stethoscope className="w-5 h-5" />;
			case "Sparkles": return <Sparkles className="w-5 h-5" />;
			case "Scissors": return <Scissors className="w-5 h-5" />;
			case "Smile": return <Smile className="w-5 h-5" />;
			case "Activity": return <Activity className="w-5 h-5" />;
			default: return <Stethoscope className="w-5 h-5" />;
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm overflow-hidden" data-testid="public-booking-studio-modal">
			<div className="relative w-full max-w-2xl max-h-[92vh] sm:max-h-[85vh] flex flex-col bg-[var(--paper,#fff)] text-[var(--ink,#111)] rounded-t-[24px] sm:rounded-2xl shadow-2xl border border-[var(--line,#e5e7eb)] overflow-hidden transition-all">
				{/* Apple HIG Touch Drag Handle (Mobile) */}
				<div className="sm:hidden flex justify-center pt-3 pb-1">
					<div className="w-9 h-1.5 rounded-full bg-[var(--line-strong,rgba(120,120,128,0.35))]" />
				</div>

				{/* Шапка студии */}
				<div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--line,#e5e7eb)] bg-[var(--paper-strong,var(--paper,#fff))]">
					<div className="flex items-center gap-2">
						{step > 1 && step < 4 && (
							<button
								type="button"
								onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
								className="p-1.5 -ml-1.5 rounded-lg text-[var(--ink-muted)] hover:bg-[var(--line-subtle)] min-h-[44px] min-w-[44px] flex items-center justify-center"
								aria-label="Назад"
							>
								<ArrowLeft className="w-5 h-5" />
							</button>
						)}
						<div>
							<h2 className="text-base sm:text-lg font-bold text-[var(--ink)] flex items-center gap-2">
								<span>Онлайн-запись DENTE</span>
								<span className="text-[11px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 font-semibold border border-teal-500/20">24/7</span>
							</h2>
							<p className="text-xs text-[var(--ink-muted)]">
								{step === 1 && "Шаг 1 из 3: Услуга и процедура"}
								{step === 2 && "Шаг 2 из 3: Выбор врача"}
								{step === 3 && "Шаг 3 из 3: Дата, время и контакты"}
								{step === 4 && "Талон бронирования подтвержден"}
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="p-2 rounded-lg text-[var(--ink-muted)] hover:bg-[var(--line-subtle)] min-h-[44px] min-w-[44px] flex items-center justify-center"
						aria-label="Закрыть"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Прогресс */}
				{step < 4 && (
					<div className="h-1 bg-[var(--line-subtle,#f3f4f6)]">
						<div className="h-full bg-teal-600 transition-all duration-300" style={{ width: `${(step / 3) * 100}%` }} />
					</div>
				)}

				{/* Тело визарда */}
				<div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
					{step === 1 && (
						<div className="space-y-4">
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
								{CANONICAL_ONLINE_CATEGORIES.map((cat) => {
									const isSel = selectedCategory.id === cat.id;
									return (
										<button
											key={cat.id}
											type="button"
											onClick={() => {
												setSelectedCategory(cat);
												setSelectedServiceId(cat.popularServices[0]?.id || "");
											}}
											className={`flex items-start gap-3 p-3 rounded-xl border text-left min-h-[44px] transition-all ${
												isSel ? "border-teal-500 bg-teal-500/10 ring-1 ring-teal-500/30" : "border-[var(--line)] bg-[var(--paper)] hover:border-[var(--line-strong)]"
											}`}
										>
											<div className={`p-2 rounded-lg ${isSel ? "bg-teal-600 text-white" : "bg-[var(--line-subtle)] text-[var(--ink-muted)]"}`}>{renderIcon(cat.iconName)}</div>
											<div className="flex-1 min-w-0">
												<div className="font-semibold text-sm truncate">{cat.title}</div>
												<div className="text-xs text-[var(--ink-muted)] line-clamp-1">{cat.description}</div>
											</div>
										</button>
									);
								})}
							</div>
							<div>
								<div className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)] mb-2">Процедуры</div>
								<div className="space-y-1.5">
									{selectedCategory.popularServices.map((srv) => {
										const isSel = selectedServiceId === srv.id;
										return (
											<button
												key={srv.id}
												type="button"
												onClick={() => setSelectedServiceId(srv.id)}
												className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-left min-h-[44px] transition-all ${
													isSel ? "border-teal-500 bg-teal-500/5 ring-1 ring-teal-500/20" : "border-[var(--line)] bg-[var(--paper)]"
												}`}
											>
												<div className="flex items-center gap-2 truncate">
													<div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${isSel ? "border-teal-600 bg-teal-600 text-white" : "border-[var(--line)]"}`}>
														{isSel && <Check className="w-3 h-3 stroke-[3]" />}
													</div>
													<span className="text-xs font-medium truncate">{srv.title}</span>
												</div>
												<div className="text-right shrink-0 pl-2">
													<span className="text-xs font-bold text-teal-600 dark:text-teal-400">{srv.priceFormatted}</span>
													<span className="text-[10px] text-[var(--ink-muted)] block">{srv.durationMinutes} мин</span>
												</div>
											</button>
										);
									})}
								</div>
							</div>
						</div>
					)}

					{step === 2 && (
						<div className="space-y-2.5">
							{availableDoctors.map((doc) => {
								const isSel = selectedDoctor.id === doc.id;
								const isAny = doc.id === ANY_DOCTOR_ID;
								return (
									<button
										key={doc.id}
										type="button"
										onClick={() => setSelectedDoctor(doc)}
										className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left min-h-[44px] transition-all ${
											isSel ? "border-teal-500 bg-teal-500/10 ring-1 ring-teal-500/30" : "border-[var(--line)] bg-[var(--paper)]"
										}`}
									>
										<div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${isAny ? "bg-teal-600 text-white" : "bg-[var(--line-subtle)] text-[var(--ink)]"}`}>
											{isAny ? "★" : doc.fullName.split(" ").slice(0, 2).map((n) => n[0]).join("")}
										</div>
										<div className="flex-1 min-w-0">
											<div className="flex items-center justify-between gap-1">
												<span className="font-semibold text-sm truncate">{doc.fullName}</span>
												<span className="text-xs font-semibold text-amber-500 shrink-0">★ {doc.rating.toFixed(1)}</span>
											</div>
											<div className="text-xs text-teal-600 dark:text-teal-400 font-medium truncate">{doc.specialties.join(", ")}</div>
											<div className="text-xs text-[var(--ink-muted)] truncate">{doc.bio}</div>
										</div>
									</button>
								);
							})}
						</div>
					)}

					{step === 3 && (
						<div className="space-y-3.5">
							<div>
								<span className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)] block mb-1.5">Дата визита</span>
								<div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
									{availableDates.map((item) => {
										const isSel = selectedDate === item.iso;
										return (
											<button
												key={item.iso}
												type="button"
												onClick={() => setSelectedDate(item.iso)}
												className={`flex flex-col items-center justify-center min-w-[66px] py-1.5 px-2 rounded-xl border min-h-[44px] shrink-0 text-center ${
													isSel ? "border-teal-500 bg-teal-600 text-white" : "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
												}`}
											>
												<span className="text-[10px] uppercase opacity-80">{item.weekday}</span>
												<span className="text-xs font-bold">{item.label}</span>
											</button>
										);
									})}
								</div>
							</div>

							<div>
								<span className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)] block mb-1.5">Время визита</span>
								<div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-32 overflow-y-auto p-0.5">
									{timeSlots.map((slot) => {
										const isSel = selectedTimeSlot === slot.time;
										return (
											<button
												key={slot.time}
												type="button"
												onClick={() => setSelectedTimeSlot(slot.time)}
												className={`py-2 px-1 text-center rounded-lg border text-xs font-semibold min-h-[44px] flex items-center justify-center ${
													isSel ? "border-teal-500 bg-teal-500/20 text-teal-700 dark:text-teal-300 ring-1 ring-teal-500" : "border-[var(--line)] bg-[var(--paper)]"
												}`}
											>
												{slot.time}
											</button>
										);
									})}
								</div>
							</div>

							<div className="space-y-2.5 pt-2 border-t border-[var(--line)]">
								{tgUser && (
									<button
										type="button"
										onClick={() => {
											setPatientName(`${tgUser.firstName} ${tgUser.lastName || ""}`.trim());
											if (tgUser.phone) setPatientPhone(formatRuPhoneInput(tgUser.phone));
										}}
										className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-600 dark:text-sky-400 text-xs font-semibold min-h-[44px]"
									>
										<span>✈️ 1-Tap Запись через Telegram ({tgUser.firstName})</span>
									</button>
								)}
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
									<div>
										<label htmlFor={`dente-name-${widgetId}`} className="text-xs font-medium text-[var(--ink-muted)] block mb-1">ФИО пациента</label>
										<div className="relative">
											<User className="w-4 h-4 text-[var(--ink-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
											<input
												id={`dente-name-${widgetId}`}
												type="text"
												placeholder="Константин"
												value={patientName}
												onChange={(e) => setPatientName(e.target.value)}
												className="w-full pl-9 pr-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs focus:outline-none focus:border-teal-500"
											/>
										</div>
									</div>
									<div>
										<label htmlFor={`dente-phone-${widgetId}`} className="text-xs font-medium text-[var(--ink-muted)] block mb-1">Телефон *</label>
										<div className="relative">
											<Phone className="w-4 h-4 text-[var(--ink-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
											<input
												id={`dente-phone-${widgetId}`}
												type="tel"
												placeholder="+7 (999) 000-00-00"
												value={patientPhone}
												onChange={handlePhoneChange}
												className={`w-full pl-9 pr-3 py-2 rounded-lg border bg-[var(--paper)] text-xs focus:outline-none ${phoneFeedback ? "border-rose-500" : "border-[var(--line)] focus:border-teal-500"}`}
											/>
										</div>
									</div>
								</div>
								{phoneFeedback && <div className="text-xs text-rose-500 font-medium">⚠️ {phoneFeedback}</div>}
								<div className="text-[11px] text-[var(--ink-muted)] flex items-center gap-1">
									<ShieldCheck className="w-3.5 h-3.5 text-teal-600 shrink-0" />
									<span>Нажимая кнопку, вы соглашаетесь на обработку персональных данных</span>
								</div>
							</div>
						</div>
					)}

					{step === 4 && confirmationData && (
						<div className="space-y-3.5 py-1 text-center">
							<div className="w-12 h-12 rounded-full bg-teal-500/20 text-teal-600 mx-auto flex items-center justify-center">
								<Check className="w-6 h-6 stroke-[3]" />
							</div>
							<div>
								<h3 className="text-base font-bold">Вы успешно записаны на приём!</h3>
								<p className="text-xs text-[var(--ink-muted)]">Талон бронирования подтвержден в расписании клиники</p>
							</div>
							<div className="p-3.5 rounded-xl border border-teal-500/30 bg-teal-500/5 text-left space-y-2.5">
								<div className="flex justify-between items-center pb-2 border-b border-[var(--line)]">
									<span className="text-xs text-[var(--ink-muted)]">Номер талона:</span>
									<span className="text-xs font-mono font-bold text-teal-600 dark:text-teal-400">{confirmationData.referenceNumber}</span>
								</div>
								<div className="grid grid-cols-2 gap-2 text-xs">
									<div>
										<span className="text-[var(--ink-muted)] block text-[11px]">Дата и время</span>
										<span className="font-semibold text-[var(--ink)] flex items-center gap-1">
											<CalendarIcon className="w-3 h-3 text-teal-600" />
											{confirmationData.date}, {confirmationData.time}
										</span>
									</div>
									<div>
										<span className="text-[var(--ink-muted)] block text-[11px]">Специалист</span>
										<span className="font-semibold text-[var(--ink)] truncate block">{confirmationData.doctor.fullName}</span>
									</div>
									<div>
										<span className="text-[var(--ink-muted)] block text-[11px]">Услуга</span>
										<span className="font-semibold text-[var(--ink)] truncate block">{confirmationData.service?.title}</span>
									</div>
									<div>
										<span className="text-[var(--ink-muted)] block text-[11px]">Пациент</span>
										<span className="font-semibold text-[var(--ink)] truncate block">{confirmationData.patientName}</span>
									</div>
								</div>
								<div className="pt-2 border-t border-[var(--line)] flex items-start gap-1.5 text-xs text-[var(--ink-muted)]">
									<MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
									<span>{DEFAULT_CLINIC_BRANCH.address} ({DEFAULT_CLINIC_BRANCH.metro})</span>
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Панель Primary CTA (Natural Thumb Zone) — Ровно ОДНА Primary CTA кнопка #0d9488 */}
				<div className="p-4 border-t border-[var(--line,#e5e7eb)] bg-[var(--paper-strong,var(--paper,#fff))]">
					{step === 1 && (
						<button type="button" onClick={() => setStep(2)} className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white font-semibold text-sm shadow-md min-h-[44px]" style={{ backgroundColor: "#0d9488" }}>
							<span>Выбрать врача</span>
							<ChevronRight className="w-4 h-4" />
						</button>
					)}
					{step === 2 && (
						<button type="button" onClick={() => setStep(3)} className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white font-semibold text-sm shadow-md min-h-[44px]" style={{ backgroundColor: "#0d9488" }}>
							<span>Выбрать время и дату</span>
							<ChevronRight className="w-4 h-4" />
						</button>
					)}
					{step === 3 && (
						<button type="button" onClick={handleSubmitBooking} className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white font-semibold text-sm shadow-md min-h-[44px]" style={{ backgroundColor: "#0d9488" }}>
							{isSubmitting ? <span>Оформление записи...</span> : <>
								<Check className="w-4 h-4 stroke-[3]" />
								<span>✓ Записаться на приём ({selectedTimeSlot})</span>
							</>}
						</button>
					)}
					{step === 4 && (
						<div className="flex gap-2">
							<button type="button" onClick={() => { setStep(1); setConfirmationData(null); }} className="flex-1 py-2.5 px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs font-semibold min-h-[44px]">
								Записаться ещё
							</button>
							<button type="button" onClick={onClose} className="flex-1 py-2.5 px-3 rounded-xl text-white font-semibold text-xs min-h-[44px]" style={{ backgroundColor: "#0d9488" }}>
								Готово
							</button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default PublicBookingStudioModal;
