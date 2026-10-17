import type { PatientClinicalSafetyProfile } from "./safetyMath";

export interface PatientAllergySafetyBannerProps {
	readonly patientId?: string | null | undefined;
	readonly patientName?: string | null | undefined;
	readonly profile?: Partial<PatientClinicalSafetyProfile> | string | null | undefined;
	readonly notes?: string | null | undefined;
	readonly onUpdateProfile?: ((profile: PatientClinicalSafetyProfile) => void) | undefined;
	readonly onSyncToEmkDiary?: ((diarySnippet: string) => void) | undefined;
	readonly showModalButton?: boolean | undefined;
	readonly compact?: boolean | undefined;
	readonly hideWhenClean?: boolean | undefined;
	readonly className?: string | undefined;
}
