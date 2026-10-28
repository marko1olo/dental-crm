import type {
	DailyDentistDiary037uPayload,
	DailyPatientRecord037u,
} from "@dental/shared";

export interface DailyDentistWorkSheet037uFormProps {
	initialPayload?: Partial<DailyDentistDiary037uPayload> | undefined;
	onChange?: ((payload: DailyDentistDiary037uPayload) => void) | undefined;
	disabled?: boolean | undefined;
}

export interface DailyWorkSheetHeaderProps {
	workDate: string;
	setWorkDate: (val: string) => void;
	doctorName: string;
	setDoctorName: (val: string) => void;
	disabled?: boolean | undefined;
}

export interface DailyWorkSheetSummaryBarProps {
	totals: {
		totalPatientsCount: number;
		totalPrimaryVisitsCount: number;
		totalSanatedCount: number;
		totalUetAccumulated: number;
	};
}

export interface DailyWorkSheetTableProps {
	records: DailyPatientRecord037u[];
	onUpdateRecord: (idx: number, patch: Partial<DailyPatientRecord037u>) => void;
	onAddPatient: () => void;
	disabled?: boolean | undefined;
}
