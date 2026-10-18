import type { Patient } from "@dental/shared";
import type { RefObject } from "react";

export type PatientCategoryFilter = "all" | "treatment" | "primary" | "debt" | "archive";

export interface PatientsFilterCounts {
	readonly countAll: number;
	readonly countTreatment?: number | undefined;
	readonly countPrimary: number;
	readonly countDebt: number;
	readonly countArchive: number;
}

export interface PatientsFilterToolbarProps {
	readonly query: string;
	readonly onQueryChange: (val: string) => void;
	readonly onClearQuery: () => void;
	readonly searchInputRef?: RefObject<HTMLInputElement | null> | undefined;
	readonly filteredPatients?: Patient[] | undefined;
	readonly onSelectPatient?: ((patientId: string) => void) | undefined;
	readonly onOpenRecallsHub: () => void;
	readonly onOpenTactileSearch: () => void;
	readonly showLostPatientsOnly: boolean;
	readonly onToggleLostPatients: () => void;
	readonly isLoadingLost: boolean;
	readonly onOpenCreatePatient: () => void;
	readonly categoryFilter: PatientCategoryFilter;
	readonly onCategoryFilterChange: (cat: PatientCategoryFilter) => void;
	readonly counts: PatientsFilterCounts;
}
