import { safeLocalStorageGetItem, safeLocalStorageSetItem } from "../../../lib/safeLocalStorage";

export interface PublicBookingWidgetConfig {
	onlyDoctorsWithActiveShifts: boolean;
	showDoctorExperience: boolean;
	showDoctorPhoto: boolean;
	allowedServicesMode: "consultations_only" | "basic_treatments" | "all_services";
	slotDurationMinutes: number;
	requirePhoneOtp: boolean;
	maxActiveBookingsPerPhone: number;
	bookingHorizonDays: number;
	minHoursBeforeAppointment: number;
	honeypotSpamShield: boolean;
}

export const DEFAULT_BOOKING_CONFIG: PublicBookingWidgetConfig = {
	onlyDoctorsWithActiveShifts: true,
	showDoctorExperience: true,
	showDoctorPhoto: true,
	allowedServicesMode: "consultations_only",
	slotDurationMinutes: 30,
	requirePhoneOtp: true,
	maxActiveBookingsPerPhone: 2,
	bookingHorizonDays: 14,
	minHoursBeforeAppointment: 2,
	honeypotSpamShield: true,
};

const STORAGE_KEY = "dente_public_booking_widget_config";

export function loadBookingConfig(): PublicBookingWidgetConfig {
	const raw = safeLocalStorageGetItem(STORAGE_KEY);
	if (!raw) return DEFAULT_BOOKING_CONFIG;
	try {
		return { ...DEFAULT_BOOKING_CONFIG, ...JSON.parse(raw) };
	} catch {
		return DEFAULT_BOOKING_CONFIG;
	}
}

export function saveBookingConfig(config: PublicBookingWidgetConfig): void {
	safeLocalStorageSetItem(STORAGE_KEY, JSON.stringify(config));
}
