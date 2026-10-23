import type { ReactNode } from "react";

export interface ClinicBranch {
	id: string;
	name: string;
	address: string;
	metro?: string;
	phone: string;
	workHours: string;
	isMain?: boolean;
}

export interface PopularService {
	id: string;
	title: string;
	durationMinutes: number;
	priceFormatted: string;
	description?: string;
}

export interface ServiceCategory {
	id: string;
	title: string;
	iconName: "Stethoscope" | "Sparkles" | "Scissors" | "Smile" | "Activity";
	description: string;
	popularServices: PopularService[];
}

export interface BookingDoctorData {
	id: string;
	fullName: string;
	specialties: string[];
	experienceYears: number;
	rating: number;
	reviewsCount: number;
	avatarUrl?: string | undefined;
	categoryIds: string[];
	bio?: string | undefined;
	nextAvailableSlot?: string | undefined;
	workDays?: number[] | undefined;
	workHours?: { startHour: number; endHour: number } | undefined;
}

export interface BookingSlotItem {
	time: string;
	startsAt: string;
	endsAt: string;
	period: "morning" | "afternoon" | "evening";
	availableDoctorIds?: string[] | undefined;
}

export interface CalendarDayItem {
	dayNumber: number;
	dateStr: string;
	isCurrentMonth: boolean;
	isPast: boolean;
	isToday: boolean;
	isSelected: boolean;
}

export interface BookingCategoryOption {
	id: string;
	title: string;
	subtitle: string;
	durationMinutes: number;
	priceLabel: string;
	iconName: "Stethoscope" | "Sparkles" | "Activity" | "Smile" | "Scissors";
	badge?: string;
	isPopular?: boolean;
}

export interface BookingConfirmationData {
	referenceNumber: string;
	branch?: ClinicBranch | undefined;
	category?: ServiceCategory | undefined;
	service?: PopularService | undefined;
	doctor: BookingDoctorData;
	date: string;
	time: string;
	startsAt: string;
	endsAt: string;
	patientName: string;
	patientPhone: string;
	cabinetNumber?: string | undefined;
	comment?: string | undefined;
	status?: "confirmed" | "unconfirmed" | string | undefined;
	isPreBooking?: boolean | undefined;
	createdAt: string;
}

export interface PublicOnlineBookingWidgetProps {
	readonly organizationId?: string | null;
	readonly title?: string | undefined;
	readonly subtitle?: string | undefined;
	readonly theme?: "light" | "dark" | "night" | "calm_teal" | "contrast" | "auto" | undefined;
	readonly embedMode?: "standalone" | "iframe" | "modal" | "telegram" | undefined;
	readonly customBranches?: ClinicBranch[] | undefined;
	readonly customCategories?: ServiceCategory[] | undefined;
	readonly customDoctors?: BookingDoctorData[] | undefined;
	readonly initialStep?: number | undefined;
	readonly initialBranchId?: string | undefined;
	readonly initialCategoryId?: string | undefined;
	readonly initialDoctorId?: string | undefined;
	readonly onSuccess?: ((booking: BookingConfirmationData) => void) | undefined;
	readonly onStepChange?: ((step: number) => void) | undefined;
	readonly showToast?: ((message: string, type?: "info" | "warning" | "error" | "success") => void) | undefined;
	readonly apiBaseUrl?: string | undefined;
	readonly requireSmsVerification?: boolean | undefined;
	readonly className?: string | undefined;
	readonly initialPatientName?: string | undefined;
	readonly initialPatientPhone?: string | undefined;
	readonly patientId?: string | undefined;
	readonly rapidFlow?: boolean | undefined;
	readonly flowMode?: "standard" | "rapid_solo" | undefined;
	readonly artBackground?: boolean | undefined;
	readonly compact?: boolean | undefined;
}
