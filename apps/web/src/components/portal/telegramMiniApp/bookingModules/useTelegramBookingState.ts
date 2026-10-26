/**
 * TELEGRAM MINI APP BOOKING — STATE & SUBMISSION HOOK (<= 120 lines)
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
import { fetchLiveScheduleData, type LiveScheduleDay } from "./bookingScheduleService";
import { submitBookingToApi } from "./bookingApiSubmitter";

export interface UseTelegramBookingStateProps {
	organizationId?: string | null | undefined;
	patientId?: string | null | undefined;
	attachedComplaints: readonly ToothComplaint[];
	onBookingComplete?: ((appointmentId: string, createdAppointment?: any) => void) | undefined;
}

export function useTelegramBookingState({
	organizationId,
	patientId,
	attachedComplaints,
	onBookingComplete,
}: UseTelegramBookingStateProps) {
	const isDemo = isDemoShowcaseMode() || isDemoTenant(organizationId);
	const [activeCategory, setActiveCategory] = useState<SpecialistCategory>("therapist");
	const [doctorsList, setDoctorsList] = useState<DoctorProfile[]>(() => isDemo ? DEFAULT_DOCTORS_LIST : []);
	const [selectedDoctorId, setSelectedDoctorId] = useState<string>(() => isDemo ? (DEFAULT_DOCTORS_LIST[0]?.id || "doc-1") : "");
	const [selectedDateIndex, setSelectedDateIndex] = useState<number>(0);
	const [selectedSlot, setSelectedSlot] = useState<string>(() => isDemo ? "10:30" : "");
	const [patientFullName, setPatientFullName] = useState<string>(() => isDemo ? "Александр" : "");
	const [patientPhone, setPatientPhone] = useState<string>(() => isDemo ? "+7 (999) 000-11-22" : "");
	const [patientComment, setPatientComment] = useState<string>("");
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
	const [bookingSuccessResult, setBookingSuccessResult] = useState<BookingSuccessResult | null>(null);
	const [liveSchedule, setLiveSchedule] = useState<LiveScheduleDay[]>([]);

	useEffect(() => {
		const user = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
		if (user?.first_name) setPatientFullName([user.first_name, user.last_name].filter(Boolean).join(" "));
	}, []);

	const triggerHaptic = useCallback((style: "light" | "medium" | "heavy" = "light") => {
		try { (window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred?.(style); } catch {}
	}, []);

	const calendarDays = useMemo<CalendarDayItem[]>(() => generateCalendarDays(), []);

	useEffect(() => {
		let isMounted = true;
		const orgId = organizationId || (isDemo ? "demo-clinic-org" : "");
		if (!orgId) return;
		fetchLiveScheduleData(orgId, calendarDays, selectedDoctorId, isDemo).then((result) => {
			if (!isMounted || !result) return;
			if (result.liveDocs.length > 0) {
				setDoctorsList(result.liveDocs);
				setSelectedDoctorId((prev) => result.liveDocs.some((d) => d.id === prev) ? prev : result.liveDocs[0]!.id);
			}
			setLiveSchedule(result.schedule);
		});
		return () => { isMounted = false; };
	}, [calendarDays, organizationId, selectedDoctorId, isDemo]);

	const filteredDoctors = useMemo(() => doctorsList.filter((d) => d.category === activeCategory), [doctorsList, activeCategory]);
	const currentDoctor = useMemo(() => filteredDoctors.find((d) => d.id === selectedDoctorId) || filteredDoctors[0] || null, [filteredDoctors, selectedDoctorId]);

	const handleSelectCategory = (cat: SpecialistCategory) => {
		triggerHaptic("light");
		setActiveCategory(cat);
		const firstDoc = doctorsList.find((d) => d.category === cat);
		setSelectedDoctorId(firstDoc ? firstDoc.id : "");
	};

	const availableSlots = useMemo(() => {
		if (liveSchedule.length > selectedDateIndex && liveSchedule[selectedDateIndex]?.slots) {
			return liveSchedule[selectedDateIndex]!.slots;
		}
		return isDemo ? ["09:00", "10:30", "12:00", "14:00", "15:30", "17:00", "18:30"] : [];
	}, [liveSchedule, selectedDateIndex, isDemo]);

	const teethSummaryText = useMemo(() => {
		return attachedComplaints.map((c) => `Зуб #${c.toothNumber}: ${c.symptomLabel}${c.cito ? " (⚡ Срочно)" : ""}`).join("; ");
	}, [attachedComplaints]);

	const handleSubmitBooking = async () => {
		if (!currentDoctor || !selectedSlot) return;
		const selectedDay = calendarDays[selectedDateIndex] || calendarDays[0]!;
		setIsSubmitting(true);
		triggerHaptic("heavy");
		try {
			const { createdId, successResult } = await submitBookingToApi({
				organizationId, patientId, patientFullName, patientPhone, patientComment,
				currentDoctor, selectedSlot, selectedDay, teethSummaryText, attachedComplaints, isDemo,
			});
			setBookingSuccessResult(successResult);
			onBookingComplete?.(createdId, {
				id: createdId, dateStr: `${selectedDay.dayOfWeek}, ${selectedDay.dayNum} ${selectedDay.month} 2026`,
				timeStr: selectedSlot, doctorName: currentDoctor.name, doctorRole: currentDoctor.specialty,
				cabinet: "Кабинет 1", procedureTitle: teethSummaryText ? `Осмотр и лечение (${teethSummaryText})` : `${currentDoctor.specialty} — консультация`,
				durationMinutes: 60, isConfirmed: true, isPast: false, toothNumber: attachedComplaints[0]?.toothNumber,
			});
		} finally { setIsSubmitting(false); }
	};

	return {
		activeCategory, filteredDoctors, selectedDoctorId, setSelectedDoctorId,
		selectedDateIndex, setSelectedDateIndex, availableSlots, selectedSlot, setSelectedSlot,
		patientFullName, setPatientFullName, patientPhone, setPatientPhone, patientComment, setPatientComment,
		isSubmitting, bookingSuccessResult, setBookingSuccessResult, calendarDays, currentDoctor,
		triggerHaptic, handleSelectCategory, handleSubmitBooking,
	};
}
