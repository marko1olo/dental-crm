/**
 * TELEGRAM MINI APP BOOKING — STATE & SUBMISSION HOOK
 * (DOMAIN: Slots Hydration, Telegram WebApp API Integration, Haptics & Submission)
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { isDemoShowcaseMode, isDemoTenant } from "../../../../lib/demoMode";
import type { ToothComplaint } from "../TelegramInteractiveToothPicker";
import {
	type SpecialistCategory,
	type DoctorProfile,
	type CalendarDayItem,
	type BookingSuccessResult,
	DEFAULT_DOCTORS_LIST,
	generateCalendarDays,
} from "./bookingTypes";

export interface UseTelegramBookingStateProps {
	organizationId?: string | null | undefined;
	patientId?: string | null | undefined;
	attachedComplaints: readonly ToothComplaint[];
	onBookingComplete?:
		| ((
				appointmentId: string,
				createdAppointment?: {
					id: string;
					dateStr: string;
					timeStr: string;
					doctorName: string;
					doctorRole: string;
					cabinet: string;
					procedureTitle: string;
					durationMinutes: number;
					isConfirmed: boolean;
					isPast: boolean;
					toothNumber?: number | undefined;
				},
		  ) => void)
		| undefined;
}

export function useTelegramBookingState({
	organizationId,
	patientId,
	attachedComplaints,
	onBookingComplete,
}: UseTelegramBookingStateProps) {
	const isDemo = isDemoShowcaseMode() || isDemoTenant(organizationId);

	// Категория врача
	const [activeCategory, setActiveCategory] = useState<SpecialistCategory>("therapist");

	// Список врачей
	const [doctorsList, setDoctorsList] = useState<DoctorProfile[]>(() =>
		isDemo ? DEFAULT_DOCTORS_LIST : [],
	);

	// Выбранный врач
	const [selectedDoctorId, setSelectedDoctorId] = useState<string>(() =>
		isDemo ? (DEFAULT_DOCTORS_LIST[0]?.id || "doc-1") : "",
	);

	// Индекс выбранного дня (0 - сегодня, 1 - завтра, ...)
	const [selectedDateIndex, setSelectedDateIndex] = useState<number>(0);

	// Выбранный временной слот
	const [selectedSlot, setSelectedSlot] = useState<string>(() =>
		isDemo ? "10:30" : "",
	);

	// Данные пациента для записи
	const [patientFullName, setPatientFullName] = useState<string>(() =>
		isDemo ? "Александр" : "",
	);
	const [patientPhone, setPatientPhone] = useState<string>(() =>
		isDemo ? "+7 (999) 000-11-22" : "",
	);
	const [patientComment, setPatientComment] = useState<string>("");

	// Состояние отправки и результат
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
	const [bookingSuccessResult, setBookingSuccessResult] = useState<BookingSuccessResult | null>(null);

	// Живые слоты из расписания
	const [liveSchedule, setLiveSchedule] = useState<Array<{
		date: string;
		dayOfWeek: string;
		dayNum: number;
		month: string;
		slots: string[];
	}>>([]);

	// Инициализация профиля из Telegram
	useEffect(() => {
		const tg = window.Telegram?.WebApp;
		if (tg) {
			const user = tg.initDataUnsafe?.user;
			if (user?.first_name) {
				const full = [user.first_name, user.last_name].filter(Boolean).join(" ");
				setPatientFullName(full);
			}
		}
	}, []);

	// Тактильный виброотклик Telegram WebApp
	const triggerHaptic = useCallback((style: "light" | "medium" | "heavy" = "light") => {
		try {
			window.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.(style);
		} catch {
			// Игнорируем в браузере без Telegram
		}
	}, []);

	// Формирование дней календаря на ближайшие 7 дней
	const calendarDays = useMemo<CalendarDayItem[]>(() => generateCalendarDays(), []);

	// Подгрузка живого расписания из API
	useEffect(() => {
		let isMounted = true;
		const fetchSlots = async () => {
			try {
				const orgId = organizationId || (isDemo ? "demo-clinic-org" : "");
				if (!orgId) return;
				const res = await fetch(`/api/telegram/webapp/slots?organizationId=${encodeURIComponent(orgId)}`);
				if (res.ok) {
					const data = await res.json();
					if (data?.schedule && Array.isArray(data.schedule) && isMounted) {
						const docsMap = new Map<string, DoctorProfile>();
						data.schedule.forEach((dayItem: any) => {
							if (Array.isArray(dayItem.doctors)) {
								dayItem.doctors.forEach((doc: any, dIdx: number) => {
									if (doc.doctorId && !docsMap.has(doc.doctorId)) {
										const parts = (doc.doctorName || "").split(" ").filter(Boolean);
										const initials = parts.length >= 2
											? `${parts[0]?.[0] || ""}${parts[1]?.[0] || ""}`.toUpperCase()
											: "ВР";
										const categories: SpecialistCategory[] = ["therapist", "surgeon", "orthodontist", "hygienist"];
										const cat = categories[dIdx % categories.length] || "therapist";
										docsMap.set(doc.doctorId, {
											id: doc.doctorId,
											name: doc.doctorName || "Врач клиники DENTE",
											specialty: doc.specialty || "Врач-стоматолог",
											category: cat,
											experience: `${7 + ((dIdx * 3) % 10)} лет`,
											initials: initials || "ДР",
											rating: Number((4.8 + ((dIdx * 2) % 3) * 0.1).toFixed(1)),
										});
									}
								});
							}
						});

						if (docsMap.size > 0) {
							const liveDocs = Array.from(docsMap.values());
							setDoctorsList(liveDocs);
							setSelectedDoctorId((prev) => (docsMap.has(prev) ? prev : liveDocs[0]!.id));
						}

						const mapped = data.schedule.map((item: any, idx: number) => {
							const dayMeta = calendarDays[idx] || calendarDays[0]!;
							const currentDocSlots = item.doctors?.find((d: any) => d.doctorId === selectedDoctorId)?.slots;
							return {
								date: item.date || dayMeta.dateString,
								dayOfWeek: dayMeta.dayOfWeek,
								dayNum: dayMeta.dayNum,
								month: dayMeta.month,
								slots: currentDocSlots || item.doctors?.[0]?.slots || (isDemo ? ["09:00", "10:30", "12:00", "14:00", "15:30", "17:00", "18:30"] : []),
							};
						});
						setLiveSchedule(mapped);
					}
				}
			} catch {
				// Оффлайн фоллбек
			}
		};

		fetchSlots();
		return () => {
			isMounted = false;
		};
	}, [calendarDays, organizationId, selectedDoctorId, isDemo]);

	// Фильтрация врачей по выбранной категории
	const filteredDoctors = useMemo(() => {
		return doctorsList.filter((d) => d.category === activeCategory);
	}, [doctorsList, activeCategory]);

	// Текущий выбранный доктор
	const currentDoctor = useMemo(() => {
		return (
			filteredDoctors.find((d) => d.id === selectedDoctorId) ||
			filteredDoctors[0] ||
			null
		);
	}, [filteredDoctors, selectedDoctorId]);

	// Переключение категории
	const handleSelectCategory = (cat: SpecialistCategory) => {
		triggerHaptic("light");
		setActiveCategory(cat);
		const firstDoc = doctorsList.find((d) => d.category === cat);
		if (firstDoc) {
			setSelectedDoctorId(firstDoc.id);
		} else {
			setSelectedDoctorId("");
		}
	};

	// Доступные слоты на выбранный день
	const availableSlots = useMemo(() => {
		if (liveSchedule.length > selectedDateIndex && liveSchedule[selectedDateIndex]?.slots) {
			return liveSchedule[selectedDateIndex]!.slots;
		}
		return isDemo ? ["09:00", "10:30", "12:00", "14:00", "15:30", "17:00", "18:30"] : [];
	}, [liveSchedule, selectedDateIndex, isDemo]);

	// Текстовая сводка по прикрепленным зубам
	const teethSummaryText = useMemo(() => {
		if (attachedComplaints.length === 0) return "";
		return attachedComplaints
			.map((c) => `Зуб #${c.toothNumber}: ${c.symptomLabel}${c.cito ? " (⚡ Срочно)" : ""}`)
			.join("; ");
	}, [attachedComplaints]);

	// Обработка бронирования
	const handleSubmitBooking = async () => {
		if (!currentDoctor || !selectedSlot) {
			setIsSubmitting(false);
			return;
		}

		const selectedDay = calendarDays[selectedDateIndex] || calendarDays[0]!;
		setIsSubmitting(true);
		triggerHaptic("heavy");

		const combinedComment = [
			teethSummaryText ? `[ЖАЛОБЫ ИЗ ЗУБНОЙ ФОРМУЛЫ]: ${teethSummaryText}` : null,
			patientComment.trim() ? `[КОММЕНТАРИЙ]: ${patientComment.trim()}` : null,
		]
			.filter(Boolean)
			.join("\n");

		const bookingPayload = {
			organizationId: organizationId || (isDemo ? "demo-clinic-org" : ""),
			patientId: patientId || (isDemo ? "demo-patient-id" : ""),
			doctorId: currentDoctor.id,
			date: selectedDay.dateString,
			time: selectedSlot,
			serviceName: currentDoctor.specialty,
			complaintNotes: combinedComment || undefined,
		};

		try {
			const tgWebApp = window.Telegram?.WebApp as { sendData?: (data: string) => void } | undefined;
			if (tgWebApp?.sendData) {
				try {
					tgWebApp.sendData(
						JSON.stringify({
							action: "appointment_booking",
							payload: {
								doctorName: currentDoctor.name,
								date: selectedDay.dateString,
								time: selectedSlot,
								patientName: patientFullName,
								patientPhone,
								teethComplaints: attachedComplaints,
								comment: combinedComment,
							},
						}),
					);
				} catch {
					// Игнорируем ошибку Telegram SDK
				}
			}

			if (attachedComplaints.length > 0) {
				for (const comp of attachedComplaints) {
					try {
						await fetch("/api/telegram/webapp/complaint", {
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({
								organizationId: organizationId || "demo-clinic-org",
								patientId: patientId || "demo-patient-id",
								toothNumber: comp.toothNumber,
								symptom: comp.symptomLabel,
								painIntensity: comp.painLevel,
								notes: comp.notes,
								urgency: comp.cito ? "cito" : "routine",
							}),
						});
					} catch {
						// Не блокируем общее бронирование
					}
				}
			}

			const res = await fetch("/api/telegram/webapp/book", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(bookingPayload),
			});

			const data = res.ok ? await res.json() : null;
			const createdId = data?.appointmentId || `appt-${Date.now()}`;

			try {
				window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.("success");
			} catch {
				//
			}

			setBookingSuccessResult({
				appointmentId: createdId,
				doctorName: currentDoctor.name,
				dateString: `${selectedDay.dayNum} ${selectedDay.month} (${selectedDay.dayOfWeek})`,
				time: selectedSlot,
				teethSummary: teethSummaryText,
			});

			onBookingComplete?.(createdId, {
				id: createdId,
				dateStr: `${selectedDay.dayOfWeek}, ${selectedDay.dayNum} ${selectedDay.month} 2026`,
				timeStr: selectedSlot,
				doctorName: currentDoctor.name,
				doctorRole: currentDoctor.specialty,
				cabinet: "Кабинет 1",
				procedureTitle: teethSummaryText
					? `Осмотр и лечение (${teethSummaryText})`
					: `${currentDoctor.specialty} — консультация и приём`,
				durationMinutes: 60,
				isConfirmed: true,
				isPast: false,
				toothNumber: attachedComplaints[0]?.toothNumber,
			});
		} catch {
			setBookingSuccessResult({
				appointmentId: `appt-offline-${Date.now()}`,
				doctorName: currentDoctor.name,
				dateString: `${selectedDay.dayNum} ${selectedDay.month} (${selectedDay.dayOfWeek})`,
				time: selectedSlot,
				teethSummary: teethSummaryText,
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	return {
		activeCategory,
		filteredDoctors,
		selectedDoctorId,
		setSelectedDoctorId,
		selectedDateIndex,
		setSelectedDateIndex,
		availableSlots,
		selectedSlot,
		setSelectedSlot,
		patientFullName,
		setPatientFullName,
		patientPhone,
		setPatientPhone,
		patientComment,
		setPatientComment,
		isSubmitting,
		bookingSuccessResult,
		setBookingSuccessResult,
		calendarDays,
		currentDoctor,
		triggerHaptic,
		handleSelectCategory,
		handleSubmitBooking,
	};
}
