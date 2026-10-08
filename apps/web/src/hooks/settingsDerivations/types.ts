import type {
	Dashboard,
	DenteTelegramFeature,
	DenteTelegramPostVisitCheckupDelayHoursByTopic,
	DenteTelegramVisualCardKey,
	WeekdayIndex,
} from "@dental/shared";
import type { ChangeEvent, CSSProperties } from "react";
import type { MprProjection } from "../../imagingUiLabels";

export type MprAxisVisualizerStyle = CSSProperties & {
	"--mpr-axis-deg": string;
	"--mpr-slab-width": string;
	"--mpr-slice-position": string;
};

export type TelegramPostVisitCheckupDelayKey =
	keyof DenteTelegramPostVisitCheckupDelayHoursByTopic;

export type TelegramPostVisitCheckupDelayField = {
	key: TelegramPostVisitCheckupDelayKey;
	label: string;
	help: string;
};

export type TelegramVisualCardField = {
	key: DenteTelegramVisualCardKey;
	label: string;
	placeholder: string;
	help: string;
};

export type TelegramFeaturePlan = {
	enabledFeatures: DenteTelegramFeature[];
	patientSafeActions: string[];
	blockedByDefault: string[];
};

export type DashboardClinicSettings = Dashboard["clinicSettings"];
export type WorkspaceProfile = DashboardClinicSettings["workspaceProfiles"][number];
export type RoleAccessPolicy = DashboardClinicSettings["roleAccessPolicies"][number];
export type WeekdayOption = { value: WeekdayIndex; label: string };
export type TelegramInlineButton = { text: string; target: string; kind: string };
export type TelegramInlineButtonRow = TelegramInlineButton[];
export type StringTokenGroup = { title: string; items: string[] };

export type BrowserContinuityCheck = { label: string; value: string; detail: string };

export type PersistenceBackupCheck = {
	fileName: string;
	savedAt: string;
	sizeBytes: number;
	fileHash: string | null;
	checksumVerified: boolean | null;
	readable: boolean;
	warning: string | null;
};

export type PersistenceIntegrityReport = {
	ok: boolean;
	checkedAt: string;
	stateFileHash: string | null;
	checksumVerified: boolean | null;
	stateCounts: Record<string, number>;
	backups: PersistenceBackupCheck[];
	warnings: string[];
	nextAction: string;
};

export type DicomFirstFrameViewerState = {
	rotationDeg: number;
	flipHorizontal: boolean;
	inverted: boolean;
	brightness: number;
	contrast: number;
	zoom: number;
};

export type CbctWorkbenchPlane = { key: MprProjection; title: string; detail: string };
export type MigrationOperatorActionScope = "primary" | "script";
export type InputChangeEvent = ChangeEvent<HTMLInputElement>;
export type TextInputChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;
export type SelectChangeEvent = ChangeEvent<HTMLSelectElement>;
