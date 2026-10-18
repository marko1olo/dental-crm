import type React from "react";
import type {
	FdiToothRecord,
	ToothClinicalStatusCode,
	ToothSurface,
} from "@dental/shared";

export const PERMANENT_TEETH_UPPER = [
	18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
];
export const PERMANENT_TEETH_LOWER = [
	48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38,
];

export const SURFACES: Array<{ key: ToothSurface; label: string }> = [
	{ key: "occlusal", label: "Оккл. (O)" },
	{ key: "vestibular", label: "Вестиб. (V)" },
	{ key: "oral", label: "Оральн. (L)" },
	{ key: "mesial", label: "Медиал. (M)" },
	{ key: "distal", label: "Дистал. (D)" },
];

export const SELECTABLE_STATUSES: ToothClinicalStatusCode[] = [
	"healthy",
	"caries_media",
	"caries_profunda",
	"filled_satisfactory",
	"pulpitis_acute",
	"periodontitis_chronic",
	"crown_zirconia",
	"implant",
	"extracted_absent",
	"root_remnant",
];

export interface DentalMedicalCardOdontogramTabProps {
	readonly dmftResult: {
		decayed: number;
		filled: number;
		missing: number;
		dmftTotal: number;
		intensityLevelLabel: string;
	};
	readonly effectiveDisabled: boolean;
	readonly odontogram: Record<number, FdiToothRecord>;
	readonly setOdontogram: React.Dispatch<
		React.SetStateAction<Record<number, FdiToothRecord>>
	>;
	readonly selectedTooth: number;
	readonly setSelectedTooth: (t: number) => void;
	readonly activeStatus: ToothClinicalStatusCode;
	readonly setActiveStatus: (s: ToothClinicalStatusCode) => void;
	readonly handleToothStatusSet: (
		toothNumber: number,
		code: ToothClinicalStatusCode,
	) => void;
	readonly handleSurfaceToggle: (
		toothNumber: number,
		surface: ToothSurface,
	) => void;
}
