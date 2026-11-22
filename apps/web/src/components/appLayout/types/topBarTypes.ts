import type { Dispatch, SetStateAction } from "react";
import type { DentalPricelistAnalysisResponse, ImagingSourceKind, StaffRole } from "@dental/shared";
import type { AdminSecretUnlockDomain } from "../../../constants/uiPreferencesConstants";
import type { ClinicProfileDraft } from "../../onboarding/wizard/types";
import type {
	TopBarCoreProps,
	TopBarEmergencyAndSyncProps,
	TopBarNoticeAndErrorProps,
} from "./topBarBaseTypes";
import type {
	TopBarOnboardingDraftProps,
	TopBarOnboardingProps,
} from "./topBarOnboardingDraftTypes";

export type {
	TopBarCoreProps,
	TopBarEmergencyAndSyncProps,
	TopBarNoticeAndErrorProps,
	TopBarOnboardingDraftProps,
	TopBarOnboardingProps,
};

export type AppTopBarProps = Partial<TopBarCoreProps> &
	Partial<TopBarEmergencyAndSyncProps> &
	Partial<TopBarNoticeAndErrorProps> &
	Partial<TopBarOnboardingProps> & {
		dashboard?: TopBarCoreProps["dashboard"] | undefined;
		clinicName?: string | undefined;
		todayIso?: string | undefined;
		defaultClinicNoticeHidden?: boolean | undefined;
		setDefaultClinicNoticeHidden?: Dispatch<SetStateAction<boolean>> | undefined;
		handleLockSession?: (() => void) | undefined;
		openDoctorShiftCockpit?: (() => void) | undefined;
		setIsCbctDirectModalOpen?: ((open: boolean) => void) | undefined;
		isStripDismissedLocally?: boolean | undefined;
		setIsStripDismissedLocally?: Dispatch<SetStateAction<boolean>> | undefined;
		setUiLanguage?: ((lang: string) => void) | ((lang: "ru" | "en") => void) | undefined;
		setNewStaffName?: Dispatch<SetStateAction<string>> | ((name: string) => void) | undefined;
		setNewChairName?: Dispatch<SetStateAction<string>> | ((name: string) => void) | undefined;
		updateClinicProfileDraft?: ((field: string, value: unknown) => void) | ((patch: string | Partial<ClinicProfileDraft>, value?: unknown) => void) | undefined;
		addStaffMember?: ((role?: StaffRole) => Promise<unknown>) | (() => Promise<void>) | undefined;
		saveStaffSchedule?: ((staffId: string) => Promise<unknown> | void) | undefined;
		saveChairSchedule?: ((chairId: string) => Promise<unknown> | void) | undefined;
		setPricelistAnalysis?: ((analysis: DentalPricelistAnalysisResponse | null) => void) | undefined;
		setImagingImportSourceKind?: ((kind: ImagingSourceKind) => void) | undefined;
		setImagingImportPreview?: ((preview: unknown) => void) | undefined;
		setImagingImportCommit?: ((commit: unknown) => void) | undefined;
		setDicomSeriesPreview?: ((preview: unknown) => void) | undefined;
		setDicomViewerLaunchManifest?: ((manifest: unknown) => void) | undefined;
		setDicomViewerToolStateBundle?: ((bundle: unknown) => void) | undefined;
		setDicomViewerWorkbenchManifest?: ((manifest: unknown) => void) | undefined;
		setDicomWebCheck?: ((check: unknown) => void) | undefined;
		setDicomWebEndpointUrl?: ((url: string) => void) | undefined;
		unlockTelegramAdminSession?: ((domainOverride?: AdminSecretUnlockDomain) => Promise<void> | void) | undefined;
		[key: string]: unknown;
	};
