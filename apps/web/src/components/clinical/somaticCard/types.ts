import type { PatientClinicalSafetyProfile } from "../../patients/safetyMath";

export interface SomaticAnamnesisCardProps {
	readonly initialProfile?: Partial<PatientClinicalSafetyProfile> | string | null | undefined;
	readonly patientId?: string | null | undefined;
	readonly patientName?: string | null | undefined;
	readonly onSave?: ((profile: PatientClinicalSafetyProfile, diarySnippet: string) => void) | undefined;
	readonly onSyncToDiary?: ((diarySnippet: string) => void) | undefined;
	readonly onApplyNorm?: ((profile: PatientClinicalSafetyProfile) => void) | undefined;
	readonly className?: string | undefined;
	readonly isCompact?: boolean | undefined;
}
