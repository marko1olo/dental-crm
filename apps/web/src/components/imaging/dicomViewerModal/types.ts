import type { RadiologyFilmstripItem } from "../../radiology/RadiologyFilmstripDock.js";

export interface DicomViewerModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly imageSrc?: string | undefined;
	readonly title?: string | undefined;
	readonly toothFdiCode?: string | undefined;
	readonly patientName?: string | undefined;
	readonly patientId?: string | undefined;
	readonly studyDate?: string | undefined;
	readonly studiesHistory?: readonly RadiologyFilmstripItem[] | undefined;
	readonly initialViewMode?: "2d" | "3d_mpr" | "sectioning" | undefined;
	readonly onInsertToProtocol?: ((text: string) => void) | undefined;
	readonly onConnectRvg?: (() => void) | undefined;
	readonly onUploadDicom?: (() => void) | undefined;
	readonly onReferToRadiology?: (() => void) | undefined;
}
