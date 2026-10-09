export type CtLaunchMode = "crm_window" | "standalone_window" | "external_app";

export interface CtSelectorModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientId?: string | null | undefined;
	readonly patientName?: string | null | undefined;
	readonly cardNumber?: string | null | undefined;
	readonly studies?: any[] | undefined;
	readonly onSelectStudy?: ((study: any, launchMode: CtLaunchMode) => void) | undefined;
	readonly onOpenCbctStudio?: ((study?: any, imageIds?: string[]) => void) | undefined;
	readonly onImagesLoaded?: ((imageIds: string[], studyMeta?: any) => void) | undefined;
}
