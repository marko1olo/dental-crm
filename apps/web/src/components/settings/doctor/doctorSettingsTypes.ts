import type { DoctorSpecialtyKey } from "../../../store/doctorPreferencesStore";
import type { DoctorSubTab } from "../doctorSettingsTabs";
import type { StaffProfile } from "../settingsProfileLoad";

export interface DoctorSettingsPropsBag {
	activeStaffUser?: StaffProfile | null | undefined;
	soundNotificationsMuted?: boolean | undefined;
	setSoundNotificationsMuted?: ((muted: boolean) => void) | undefined;
	testOnlineBookingSound?: (() => void) | undefined;
	testSlotEndSound?: (() => void) | undefined;
	appLogic?: {
		soundNotificationsMuted?: boolean | undefined;
		setSoundNotificationsMuted?: ((muted: boolean) => void) | undefined;
		testOnlineBookingSound?: (() => void) | undefined;
		testSlotEndSound?: (() => void) | undefined;
		[key: string]: unknown;
	} | undefined;
	auth?: {
		currentUser?: {
			organizationId?: string | undefined;
		} | null | undefined;
		[key: string]: unknown;
	} | undefined;
	[key: string]: unknown;
}

export interface DoctorSettingsSectionProps {
	readonly props: DoctorSettingsPropsBag;
	readonly initialTab?: DoctorSubTab | undefined;
	readonly onSelectTab?: ((tab: string) => void) | undefined;
}

export const SPECIALTY_PRESET_BUTTONS: readonly {
	key: DoctorSpecialtyKey;
	label: string;
	title: string;
}[] = [
	{ key: "therapist", label: "Терапевт", title: "Терапевтическая стоматология" },
	{ key: "surgeon", label: "Хирург", title: "Хирургическая стоматология и имплантология" },
	{ key: "orthopedist", label: "Ортопед", title: "Ортопедическая стоматология и протезирование" },
	{ key: "orthodontist", label: "Ортодонт", title: "Ортодонтия и исправление прикуса" },
	{ key: "periodontist", label: "Пародонтолог", title: "Пародонтология и здоровье десен" },
	{ key: "pediatric", label: "Детский", title: "Детская стоматология" },
];
