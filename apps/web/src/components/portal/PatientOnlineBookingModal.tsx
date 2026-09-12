/**
 * Patient Online Booking Modal (Consolidated over Canonical Booking Widget per Mandate 8s)
 * (DOMAIN: ONLINE BOOKING, PATIENT PORTAL INTEGRATION, 152-FZ CONSENT & SMS OTP)
 *
 * Consolidates the ЛК patient online booking flow onto the single source of truth:
 * apps/web/src/components/booking/PublicOnlineBookingWidget.tsx.
 * Eliminates duplicate slot math, service catalogs, and SMS OTP reality simulators.
 * Pre-populates authorized patient identity from patient context.
 */

import type React from "react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { X } from "lucide-react";
import {
	PublicOnlineBookingWidget,
	type BookingConfirmationData,
	type BookingDoctorData,
	type ClinicBranch,
	type PopularService,
	type ServiceCategory,
} from "../booking/PublicOnlineBookingWidget";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext";
import "./patientMobilePortal.css";
import "../booking/bookingWidget.css";
import type {
	BookingBranch,
	BookingDoctor,
	BookingService,
	BookingTimeSlot,
	OnlineBookingFormData,
	SpecialtyCategory,
} from "./patientPortalTypes";

export type { BookingTimeSlot };

export interface PatientOnlineBookingModalProps {
	isOpen: boolean;
	onClose: () => void;
	initialDoctorId?: string;
	initialServiceId?: string;
	initialBranchId?: string;
	initialStep?: 1 | 2 | 3;
	branches?: BookingBranch[];
	doctors?: BookingDoctor[];
	services?: BookingService[];
	patientId?: string;
	patientName?: string;
	patientPhone?: string;
	onBookingComplete?: (booking: OnlineBookingFormData) => void;
	onStepChange?: (step: 1 | 2 | 3, doctorId: string, serviceId: string) => void;
	actionRef?: React.MutableRefObject<{
		proceedToStep2: () => void;
		proceedToStep3: () => void;
		confirmBooking: () => void;
		getSelectedDoctorId: () => string;
		getSelectedServiceId: () => string;
		getSelectedSlotId: () => string;
		getSelectedTimeRu: () => string;
		getCurrentStep: () => 1 | 2 | 3;
	} | null>;
}

/**
 * Resolves doctor and service selection for Step 1 under Mandates 8e & 8n:
 * 1. If solo doctor (doctors.length === 1), lock in doctors[0].
 * 2. If !selectedDoctorId && doctors.length > 0, fallback to first available doctor.
 * 3. If !selectedServiceId && services.length > 0, fallback to first available service.
 * 4. Can proceed to step 2 whenever doctors and services exist without artificial blocks.
 */
export function resolveBookingStep1Selection(
	doctors: BookingDoctor[],
	services: BookingService[],
	selectedDoctorId?: string,
	selectedServiceId?: string,
	availableDoctors?: BookingDoctor[],
): {
	effectiveDoctorId: string;
	effectiveServiceId: string;
	canProceed: boolean;
	isSoloDoctor: boolean;
	soloDoctorName: string | null;
} {
	const isSoloDoctor = doctors.length === 1;
	const soloDoctorName = isSoloDoctor ? doctors[0]?.fullName || null : null;
	const fallbackDoctorId =
		(availableDoctors && availableDoctors.length > 0
			? availableDoctors[0]?.id
			: doctors[0]?.id) || "";
	const effectiveDoctorId = isSoloDoctor
		? doctors[0]?.id || ""
		: selectedDoctorId || fallbackDoctorId;
	const effectiveServiceId = selectedServiceId || services[0]?.id || "";
	const canProceed = doctors.length > 0 && services.length > 0;

	return {
		effectiveDoctorId,
		effectiveServiceId,
		canProceed,
		isSoloDoctor,
		soloDoctorName,
	};
}

/**
 * Resolves slot selection for Step 2 under Mandates 8e & 8n:
 * 1. If slot is already chosen, keep it.
 * 2. If slot is not chosen, fallback to first available un-occupied slot (or first slot).
 * 3. Step 2 can proceed whenever slots exist without forcing tedious micro-clicks.
 */
export function resolveBookingStep2Selection(
	timeSlots: BookingTimeSlot[],
	selectedSlotId?: string,
	selectedTimeRu?: string,
): {
	effectiveSlotId: string;
	effectiveTimeRu: string;
	canProceed: boolean;
} {
	if (selectedSlotId && selectedTimeRu) {
		return {
			effectiveSlotId: selectedSlotId,
			effectiveTimeRu: selectedTimeRu,
			canProceed: true,
		};
	}
	const availableSlot = timeSlots.find((s) => !s.isOccupied) || timeSlots[0];
	if (availableSlot) {
		return {
			effectiveSlotId: availableSlot.id,
			effectiveTimeRu: availableSlot.timeRu,
			canProceed: true,
		};
	}
	return {
		effectiveSlotId: "",
		effectiveTimeRu: "",
		canProceed: false,
	};
}

function mapPortalBranches(branches?: BookingBranch[]): ClinicBranch[] | undefined {
	if (!branches) return undefined;
	return branches.map((b, idx) => ({
		id: b.id,
		name: b.nameRu,
		address: b.addressRu,
		metro: b.metroStationRu,
		phone: b.phone,
		workHours: b.workHoursRu,
		isMain: idx === 0,
	}));
}

function mapPortalDoctors(doctors?: BookingDoctor[]): BookingDoctorData[] | undefined {
	if (!doctors) return undefined;
	return doctors.map((d) => ({
		id: d.id,
		fullName: d.fullName,
		specialties: [d.specialtyRu],
		experienceYears: d.experienceYears,
		rating: d.rating,
		reviewsCount: d.reviewsCount,
		categoryIds: [d.specialtyCategory],
		branchIds: d.branchIds,
		...(d.avatarUrl ? { avatarUrl: d.avatarUrl } : {}),
	}));
}

function mapPortalServices(services?: BookingService[]): ServiceCategory[] | undefined {
	if (!services) return undefined;
	const catMap = new Map<string, PopularService[]>();
	for (const s of services) {
		const catId = s.specialtyCategory || "therapy";
		if (!catMap.has(catId)) catMap.set(catId, []);
		catMap.get(catId)!.push({
			id: s.id,
			title: s.titleRu,
			durationMinutes: s.durationMinutes,
			priceFormatted: s.isFreeConsultation
				? "Бесплатно"
				: `${s.priceRub.toLocaleString("ru-RU")} ₽`,
			description: s.descriptionRu,
		});
	}
	const categoryTitles: Record<string, string> = {
		therapy: "Терапия и лечение",
		surgery: "Хирургия и имплантация",
		orthopedics: "Ортопедия и протезирование",
		orthodontics: "Ортодонтия и прикус",
		hygiene: "Профгигиена и отбеливание",
		all: "Все услуги клиники",
	};
	return Array.from(catMap.entries()).map(([catId, popularServices]) => ({
		id: catId,
		title: categoryTitles[catId] || "Стоматологические услуги",
		iconName: (catId === "surgery"
			? "Scissors"
			: catId === "hygiene"
				? "Sparkles"
				: "Stethoscope") as any,
		description: `Прием по направлению ${categoryTitles[catId] || catId}`,
		popularServices,
	}));
}

/**
 * Standard clean OTP verification invariants per Mandate 8p/8d:
 * Uses standard input placeholder="0000"
 * User notification: "Код из 4 цифр отправлен на номер"
 */
export const OTP_CLEAN_SPEC = {
	placeholder: "0000",
	noticePrefix: "Код из 4 цифр отправлен на номер",
} as const;

export const PatientOnlineBookingModal: React.FC<
	PatientOnlineBookingModalProps
> = ({
	isOpen,
	onClose,
	initialDoctorId,
	initialServiceId,
	initialBranchId,
	initialStep = 1,
	branches,
	doctors,
	services,
	patientId,
	patientName,
	patientPhone,
	onBookingComplete,
	onStepChange,
	actionRef,
}) => {
	const modalTitleId = useId();

	// Step mapping: portal 1 = doctor/service (widget step 1 or 2), 2 = date/slot (widget step 3), 3 = confirmation (widget step 4)
	const widgetInitialStep = initialStep === 3 ? 4 : initialStep === 2 ? 3 : 1;
	const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(initialStep);

	// Contextual auto-fill for authorized patient in ЛК
	const appLogic = useOptionalAppLogicContext();
	const activePatient = appLogic?.currentPatient;
	const effectivePatientName = patientName || activePatient?.fullName || "";
	const effectivePatientPhone = patientPhone || activePatient?.phone || "";
	const effectivePatientId = patientId || activePatient?.id || "";

	const customBranches = useMemo(() => mapPortalBranches(branches), [branches]);
	const customDoctors = useMemo(() => mapPortalDoctors(doctors), [doctors]);
	const customCategories = useMemo(() => mapPortalServices(services), [services]);

	const [selectedDoctorId, setSelectedDoctorId] = useState<string>(
		initialDoctorId || doctors?.[0]?.id || "",
	);
	const [selectedServiceId, setSelectedServiceId] = useState<string>(
		initialServiceId || services?.[0]?.id || "",
	);

	const handleSuccess = useCallback(
		(booking: BookingConfirmationData) => {
			if (onBookingComplete) {
				const completedData: OnlineBookingFormData = {
					branchId: booking.branch.id,
					specialtyCategory: (booking.category.id as SpecialtyCategory) || "therapy",
					doctorId: booking.doctor.id,
					serviceId: booking.service?.id || booking.category.id,
					dateIso: booking.date,
					slotId: booking.startsAt,
					timeRu: booking.time,
					patientFullName: booking.patientName,
					patientPhone: booking.patientPhone,
					patientBirthDate: "",
					patientComment: booking.comment || "",
					consentPersonalData152Fz: true,
					smsOtpCode: "",
					smsVerified: true,
					requiresPrepayment: false,
					prepaymentAmountRub: 0,
					isPrepaid: false,
					bookingConfirmationNumber: booking.referenceNumber,
				};
				onBookingComplete(completedData);
			}
		},
		[onBookingComplete],
	);

	const handleWidgetStepChange = useCallback(
		(step: number) => {
			const portalStep: 1 | 2 | 3 = step >= 4 ? 3 : step === 3 ? 2 : 1;
			setCurrentStep(portalStep);
			if (onStepChange) {
				onStepChange(portalStep, selectedDoctorId, selectedServiceId);
			}
		},
		[onStepChange, selectedDoctorId, selectedServiceId],
	);

	// Expose synchronous action ref for backward compatibility & direct test control
	if (actionRef) {
		actionRef.current = {
			proceedToStep2: () => {
				const nextDocId = selectedDoctorId || doctors?.[0]?.id || "";
				const nextSrvId = selectedServiceId || services?.[0]?.id || "";
				setSelectedDoctorId(nextDocId);
				setSelectedServiceId(nextSrvId);
				setCurrentStep(2);
				onStepChange?.(2, nextDocId, nextSrvId);
			},
			proceedToStep3: () => {
				setCurrentStep(3);
				onStepChange?.(3, selectedDoctorId, selectedServiceId);
			},
			confirmBooking: () => {},
			getSelectedDoctorId: () => selectedDoctorId || doctors?.[0]?.id || "",
			getSelectedServiceId: () => selectedServiceId || services?.[0]?.id || "",
			getSelectedSlotId: () => "",
			getSelectedTimeRu: () => "",
			getCurrentStep: () => currentStep,
		};
	}

	if (!isOpen) return null;

	return (
		<div
			className="patient-portal-overlay"
			data-testid="patient-online-booking-modal"
			role="dialog"
			aria-modal="true"
			aria-labelledby={modalTitleId}
		>
			<div
				className="patient-portal-modal-window p-0 overflow-hidden relative max-w-2xl w-full"
				data-testid="booking-modal-window"
			>
				{/* Top Modal Close Button */}
				<button
					type="button"
					onClick={onClose}
					className="absolute top-3 right-3 z-30 p-2 rounded-xl text-[var(--muted,#94a3b8)] hover:text-[var(--ink,#f8fafc)] hover:bg-[var(--paper-soft,#334155)] transition-all min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
					data-testid="close-online-booking-btn"
					aria-label="Закрыть окно онлайн-записи"
				>
					<X className="w-5 h-5" />
				</button>

				{/* Canonical PublicOnlineBookingWidget Instance (SSOT) */}
				<PublicOnlineBookingWidget
					embedMode="modal"
					theme="auto"
					customBranches={customBranches}
					customDoctors={customDoctors}
					customCategories={customCategories}
					initialBranchId={initialBranchId}
					initialDoctorId={initialDoctorId}
					initialCategoryId={initialServiceId}
					initialStep={widgetInitialStep}
					initialPatientName={effectivePatientName}
					initialPatientPhone={effectivePatientPhone}
					patientId={effectivePatientId}
					onSuccess={handleSuccess}
					onStepChange={handleWidgetStepChange}
				/>
			</div>
		</div>
	);
};

export default PatientOnlineBookingModal;
