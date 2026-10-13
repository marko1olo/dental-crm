import type React from "react";
import type {
	FilterPresetKey,
	HotFolderItem,
	HotFolderIntakeModalProps,
	HotFolderSource,
} from "../hotFolderTypes";
import type { RadiologyStudy } from "../types";

export * from "../hotFolderTypes";

export interface HotFolderDirectoryConfigProps {
	filteredItemsCount: number;
	totalItemsCount: number;
	activeSourceFilter: HotFolderSource;
	isScanning: boolean;
	onSourceFilterChange: (source: HotFolderSource) => void;
	onRescanFolder: () => void;
	freshCount: number;
}

export interface HotFolderIncomingQueueListProps {
	items: HotFolderItem[];
	activeItemId?: string | undefined;
	onSelectItem: (id: string) => void;
	onDropFile: (file: File) => void;
	isDragOver: boolean;
	setIsDragOver: (val: boolean) => void;
}

export interface HotFolderPatientMatcherProps {
	selectedTeeth: string[];
	clinicalPurpose: string;
	protocolNote: string;
	activeItem: HotFolderItem | null;
	patientName: string;
	patientCardNumber: string;
	onToggleTooth: (tooth: string) => void;
	onSelectAllTeeth: () => void;
	onSelectUpperArch: () => void;
	onSelectLowerArch: () => void;
	onSelectFrontal: () => void;
	onSelectRightMolar: () => void;
	onSelectLeftMolar: () => void;
	onSelectTeethBatch: (teeth: string[]) => void;
	onClinicalPurposeChange: (purpose: string) => void;
	onProtocolNoteChange: (note: string) => void;
}

export interface HotFolderIntakeFooterActionsProps {
	activeItem: HotFolderItem | null;
	protocolNote: string;
	onAttachToEmr: () => void;
	onExportDicom?: ((item: HotFolderItem) => void) | undefined;
	onSendToLab?: ((item: HotFolderItem, note: string) => void) | undefined;
}

export interface HotFolderIntakeHeaderProps {
	modalId: string;
	patientName: string;
	patientCardNumber: string;
	doctorName: string;
	onClose: () => void;
}

export interface UseHotFolderIntakeLogicProps {
	patientId?: string | undefined;
	patientName?: string | undefined;
	patientCardNumber?: string | undefined;
	doctorName?: string | undefined;
	activeToothFdi?: string | undefined;
	flipV: boolean;
	setFlipV: (val: boolean) => void;
	onAttachToEmr?: ((result: {
		study: RadiologyStudy;
		teethFdi: string[];
		protocolNote: string;
		clinicalPurpose: string;
		doseMicrosv: number;
	}) => void) | undefined;
}
