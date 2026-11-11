import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { CANONICAL_BOOKING_CATEGORIES } from "../presets/bookingCategoryPresets";
import { DEFAULT_DOCTORS_LIST } from "../publicBookingEngine";
import { useBookingAvailability } from "../useBookingAvailability";
import { DEFAULT_BRANCHES, DEFAULT_DOCTORS, DEFAULT_SERVICE_CATEGORIES, generateBookingReference, isValidRussianPhone } from "../bookingUtils";
import { useBookingCalendarNavigation } from "../hooks/useBookingCalendarNavigation";
import { useBookingTelegramContext } from "../hooks/useBookingTelegramContext";
import { useBookingFormState } from "../hooks/useBookingFormState";
import { useBookingSmsState } from "../hooks/useBookingSmsState";
import { submitBookingRequest } from "../engine/bookingSubmissionEngine";
import type { BookingCategoryOption, BookingConfirmationData, BookingDoctorData, ClinicBranch } from "../contracts/bookingContracts";
import type { PublicBookingWidgetProps } from "./types";

export function usePublicBookingState(props: PublicBookingWidgetProps) {
	const { organizationId = null, embedMode, customBranches = DEFAULT_BRANCHES, customDoctors = DEFAULT_DOCTORS, initialStep = 1, initialBranchId, initialCategoryId, initialDoctorId, onSuccess, onStepChange, showToast, apiBaseUrl = "/api/public/booking", requireSmsVerification = false, initialPatientName, initialPatientPhone, patientId } = props;
	const widgetInstanceId = useId();
	const [step, setStep] = useState<number>(initialStep);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [confirmationData, setConfirmationData] = useState<BookingConfirmationData | null>(null);

	const cal = useBookingCalendarNavigation();
	const form = useBookingFormState(initialPatientName, initialPatientPhone);
	const tg = useBookingTelegramContext(embedMode, form.patientName, form.setPatientName, form.patientPhone, form.setPatientPhone, showToast);
	const sms = useBookingSmsState(organizationId, apiBaseUrl, form.patientPhone, requireSmsVerification, showToast);

	const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(() => initialDoctorId || (customDoctors?.length === 1 ? customDoctors[0]!.id : null));
	const avail = useBookingAvailability({ organizationId, apiBaseUrl, selectedDate: cal.selectedDate, selectedDoctorId });
	const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(() => initialCategoryId || "therapy");

	const selectedCategory: BookingCategoryOption = useMemo(() => CANONICAL_BOOKING_CATEGORIES.find((c) => c.id === selectedCategoryId) || CANONICAL_BOOKING_CATEGORIES[0]!, [selectedCategoryId]);

	const activeDoctors: BookingDoctorData[] = useMemo(() => {
		if (customDoctors && customDoctors.length > 0) return customDoctors.map((doc: any) => ({ ...doc, categoryIds: doc.categoryIds ?? ["all"], experienceYears: doc.experienceYears ?? 0, rating: doc.rating ?? 0, reviewsCount: doc.reviewsCount ?? 0 }));
		if (avail.loadedDoctors && avail.loadedDoctors.length > 0) return avail.loadedDoctors;
		return DEFAULT_DOCTORS_LIST.map((doc: any) => ({ ...doc, categoryIds: doc.categoryIds ?? ["all"], experienceYears: doc.experienceYears ?? 0, rating: doc.rating ?? 0, reviewsCount: doc.reviewsCount ?? 0 }));
	}, [customDoctors, avail.loadedDoctors]);

	const isSoloDoctor = activeDoctors.length === 1;
	useEffect(() => { if (activeDoctors.length === 1 && activeDoctors[0]) setSelectedDoctorId(activeDoctors[0].id); }, [activeDoctors]);

	const selectedDoctor: BookingDoctorData = useMemo(() => {
		if (selectedDoctorId) {
			const found = activeDoctors.find((d) => d.id === selectedDoctorId);
			if (found) return found;
		}
		// При selectedDoctorId === null («Любой врач») подставляем свободного доктора для выбранного слота
		if (avail.selectedSlot?.availableDoctorIds && avail.selectedSlot.availableDoctorIds.length > 0) {
			const freeDoctor = activeDoctors.find((d) => avail.selectedSlot!.availableDoctorIds!.includes(d.id));
			if (freeDoctor) return freeDoctor;
		}
		if (activeDoctors.length > 0 && activeDoctors[0]) {
			return activeDoctors[0];
		}
		return {
			id: "00000000-0000-0000-0000-000000000000",
			fullName: "Дежурный врач-стоматолог",
			specialties: ["Врач-стоматолог"],
			experienceYears: 0,
			rating: 0,
			reviewsCount: 0,
			categoryIds: ["all"],
		};
	}, [activeDoctors, selectedDoctorId, avail.selectedSlot]);
	const selectedBranch: ClinicBranch = useMemo(() => (customBranches.length > 0 && ((initialBranchId && customBranches.find((b) => b.id === initialBranchId)) || customBranches[0])) || { id: "main-branch", name: "Стоматологический центр DENTE", address: "Главный клинический корпус", phone: "+7 (800) 000-00-00", workHours: "Пн-Сб 09:00 - 20:00, Вс 10:00 - 18:00", isMain: true }, [customBranches, initialBranchId]);

	const handleStepChange = useCallback((newStep: number) => { setStep(newStep); onStepChange?.(newStep); }, [onStepChange]);

	const handleFinalSubmit = async (e?: React.FormEvent) => {
		e?.preventDefault?.();
		if (isSubmitting) return;
		if (!form.patientName.trim()) { setSubmitError("Пожалуйста, введите ваше имя"); showToast?.("Пожалуйста, введите ваше имя", "warning"); return; }
		if (!isValidRussianPhone(form.patientPhone)) { setSubmitError("Введите корректный номер телефона (11 цифр)"); showToast?.("Введите корректный номер телефона (11 цифр)", "warning"); return; }
		if (!form.hasAgreedToPrivacy) { form.setHasAgreedToPrivacy(true); showToast?.("Согласие на обработку персональных данных принято", "info"); }
		if (sms.showSmsVerification && !sms.isSmsVerified && !sms.isSmsFallbackActive) { sms.setIsSmsFallbackActive(true); showToast?.("Заявка оформлена как предварительная бронь. Администратор свяжется с вами для подтверждения.", "info"); }

		const isPreBookingMode = Boolean(sms.isSmsFallbackActive || (sms.showSmsVerification && !sms.isSmsVerified));
		const activeSlot = avail.selectedSlot || avail.slots[0] || null;
		if (!activeSlot) { setSubmitError("На выбранную дату нет свободных окон для записи. Пожалуйста, выберите другой день или оставьте заявку в лист ожидания."); showToast?.("На выбранную дату нет свободных окон для записи. Пожалуйста, выберите другой день или оставьте заявку в лист ожидания.", "warning"); return; }
		if (!avail.selectedSlot && activeSlot) avail.setSelectedSlot(activeSlot);
		if (!selectedDoctor || !selectedDoctor.id) {
			setSubmitError("Не удалось определить врача для записи. Пожалуйста, обратитесь в клинику по телефону.");
			showToast?.("Не удалось определить врача для записи", "warning");
			return;
		}

		setIsSubmitting(true);
		setSubmitError(null);
		try {
			const refNumber = generateBookingReference();
			const finalData = await submitBookingRequest({ organizationId, apiBaseUrl, patientName: form.patientName, patientPhone: form.patientPhone, patientComment: [form.patientComment.trim(), isPreBookingMode ? "[Предварительная бронь без СМС / Звонок администратора]" : ""].filter(Boolean).join(" "), patientId, selectedDate: cal.selectedDate, selectedSlot: activeSlot, selectedDoctor, selectedBranch, bookingStatus: isPreBookingMode ? "unconfirmed" : "confirmed", isPreBookingMode, referenceNumber: refNumber, verificationCode: sms.enteredSmsCode.trim() || undefined });
			setConfirmationData(finalData);
			setIsSubmitting(false);
			if (typeof window !== "undefined") {
				window.dispatchEvent(new CustomEvent("dente:booking_completed", { detail: finalData }));
				window.dispatchEvent(new CustomEvent("dente:schedule_refresh"));
				if (window.parent) window.parent.postMessage({ type: "DENTE_BOOKING_SUCCESS", booking: finalData }, "*");
			}
			handleStepChange(5);
			onSuccess?.(finalData);
		} catch (err: any) {
			setSubmitError(err.message || "Сбой связи с сервером клиники");
			setIsSubmitting(false);
		}
	};

	const handleResetBooking = () => { setStep(1); avail.setSelectedSlot(null); form.setPatientName(""); form.setPatientPhone(""); form.setPatientComment(""); sms.setSmsCodeSent(false); sms.setIsSmsVerified(false); sms.setIsSmsFallbackActive(false); sms.setEnteredSmsCode(""); setConfirmationData(null); handleStepChange(1); };

	return { widgetInstanceId, step, setStep, isTelegramContext: tg.isTelegramContext, effectiveEmbedMode: tg.effectiveEmbedMode, handleTelegramShareContact: tg.handleTelegramShareContact, selectedDate: cal.selectedDate, setSelectedDate: cal.setSelectedDate, calendarMonth: cal.calendarMonth, calendarDays: cal.calendarDays, monthLabel: cal.monthLabel, handlePrevMonth: cal.handlePrevMonth, handleNextMonth: cal.handleNextMonth, selectedCategoryId, setSelectedCategoryId, selectedCategory, activeDoctors, isSoloDoctor, selectedDoctorId, setSelectedDoctorId, selectedDoctor, selectedBranch, patientName: form.patientName, setPatientName: form.setPatientName, patientPhone: form.patientPhone, setPatientPhone: form.setPatientPhone, handlePhoneChange: form.handlePhoneChange, patientComment: form.patientComment, setPatientComment: form.setPatientComment, hasAgreedToPrivacy: form.hasAgreedToPrivacy, setHasAgreedToPrivacy: form.setHasAgreedToPrivacy, ...sms, ...avail, isSubmitting, submitError, setSubmitError, confirmationData, handleStepChange, handleFinalSubmit, handleResetBooking };
}
