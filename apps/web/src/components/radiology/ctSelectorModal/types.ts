import type { DesktopCtDownloadItem } from "../../../native/desktop/types";

export type CtLaunchMode = "crm_window" | "standalone_window" | "external_app";
export type CtDownloadItem = DesktopCtDownloadItem;

export interface CtStudyRecord {
	readonly id: string;
	readonly title?: string | undefined;
	readonly date?: string | undefined;
	readonly modality?: string | undefined;
	readonly [key: string]: unknown;
}

export interface CtSelectorModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientId?: string | null | undefined;
	readonly patientName?: string | null | undefined;
	readonly cardNumber?: string | null | undefined;
	readonly studies?: readonly (CtStudyRecord | unknown)[] | undefined;
	readonly onSelectStudy?: ((study: unknown, launchMode: CtLaunchMode) => void) | undefined;
	readonly onOpenCbctStudio?: ((study?: unknown, imageIds?: string[]) => void) | undefined;
	readonly onImagesLoaded?: ((imageIds: string[], studyMeta?: unknown) => void) | undefined;
}
