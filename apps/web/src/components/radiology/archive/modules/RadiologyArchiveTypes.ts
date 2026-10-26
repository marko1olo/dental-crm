/**
 * RadiologyArchiveTypes.ts — Типы данных архива радиологических исследований (Мандат 8b).
 */

import type { ImagingStudy } from "@dental/shared";

export const ARCHIVE_FDI_TEETH = [
	"18", "17", "16", "15", "14", "13", "12", "11",
	"21", "22", "23", "24", "25", "26", "27", "28",
	"48", "47", "46", "45", "44", "43", "42", "41",
	"31", "32", "33", "34", "35", "36", "37", "38",
];

export interface RadiologyStudiesArchiveProps {
	readonly onOpenStudio?: ((study: ImagingStudy) => void) | undefined;
	readonly onOpenViewer?: ((study: ImagingStudy) => void) | undefined;
	readonly onOpenSensorViewer?: ((study: ImagingStudy) => void) | undefined;
	readonly onUploadNew?: (() => void) | undefined;
	readonly onOpenDirectRvgCapture?: (() => void) | undefined;
	readonly initialStudies?: ImagingStudy[] | undefined;
	readonly initialLoading?: boolean | undefined;
}

export type ArchiveModalityFilter = "all" | "cbct" | "opg" | "periapical" | "ceph" | "photo";
export type ArchiveBindingFilter = "all" | "pending_review" | "bound" | "unassigned";
