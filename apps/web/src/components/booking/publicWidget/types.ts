import type React from "react";
import type { BookingDoctorData } from "../BookingDoctorCard";
import type { BookingSlotItem, CalendarDayItem } from "../BookingSlotPicker";
import type { BookingCategoryOption } from "../BookingCategoriesSection";
import type {
	BookingConfirmationData,
	ClinicBranch,
	PublicOnlineBookingWidgetProps,
} from "../bookingUtils";

export type {
	BookingDoctorData,
	BookingSlotItem,
	CalendarDayItem,
	BookingCategoryOption,
	BookingConfirmationData,
	ClinicBranch,
	PublicOnlineBookingWidgetProps,
};

export type PublicBookingWidgetProps = PublicOnlineBookingWidgetProps;

export interface BookingHeaderStepProps {
	title?: string | undefined;
	subtitle?: string | undefined;
	isTelegramContext: boolean;
}

export interface BookingSpecialistStepProps {
	selectedCategoryId: string | null;
	onSelectCategory: (category: BookingCategoryOption) => void;
	isSoloDoctor: boolean;
	selectedDoctor: BookingDoctorData;
	activeDoctors: BookingDoctorData[];
	selectedDoctorId: string | null;
	onSelectDoctorId: (id: string | null) => void;
}

export interface BookingDateTimeStepProps {
	selectedDate: string;
	onSelectDate: (date: string) => void;
	calendarMonth: Date;
	onPrevMonth: () => void;
	onNextMonth: () => void;
	calendarDays: CalendarDayItem[];
	monthLabel: string;
	slots: BookingSlotItem[];
	selectedSlot: BookingSlotItem | null;
	onSelectSlot: (slot: BookingSlotItem) => void;
	slotsLoading: boolean;
	slotError: string | null;
	onNextStep: () => void;
}

export interface BookingPatientFormStepProps {
	isTelegramContext: boolean;
	patientName: string;
	setPatientName: (name: string) => void;
	patientPhone: string;
	handlePhoneChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	patientComment: string;
	setPatientComment: (comment: string) => void;
	hasAgreedToPrivacy: boolean;
	setHasAgreedToPrivacy: (agreed: boolean) => void;
	showSmsVerification: boolean;
	smsCodeSent: boolean;
	enteredSmsCode: string;
	setEnteredSmsCode: (code: string) => void;
	isSmsVerified: boolean;
	smsResendCountdown: number;
	smsError: string | null;
	handleSendSmsCode: () => void;
	handleVerifySmsCode: () => void;
	handleTelegramShareContact: () => void;
	submitError: string | null;
	setSubmitError: (error: string | null) => void;
	isSubmitting: boolean;
	onSubmit: (e?: React.FormEvent) => void;
}

export interface BookingFloatingBottomBarProps {
	selectedCategory: BookingCategoryOption;
	selectedDate: string;
	selectedSlot: BookingSlotItem | null;
	patientName: string;
	patientPhone: string;
	isSubmitting: boolean;
	onSubmit: (e?: React.FormEvent) => void;
}

export interface BookingSuccessConfirmationProps {
	confirmationData: BookingConfirmationData | null;
	selectedDate: string;
	selectedSlot: BookingSlotItem | null;
	selectedDoctor: BookingDoctorData;
	selectedBranch: ClinicBranch;
	patientName: string;
	patientPhone: string;
	onReset: () => void;
	artBackground?: boolean | undefined;
	theme?: "light" | "dark" | "night" | "calm_teal" | "contrast" | "auto" | undefined;
}
