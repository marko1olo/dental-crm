export interface CreateSoloDoctorLabWorkOrderParams {
	patientId: string;
	patientName: string;
	patientChartNumber?: string | undefined;
	doctorId: string;
	doctorName: string;
	clinicName?: string | undefined;
	externalLabName?: string | undefined;
	prostheticPreset:
		| "zirconia_crown"
		| "veneer"
		| "removable_prosthesis"
		| "emax_press"
		| "pmma_temporary"
		| "implant_crown";
	selectedTeeth?: number[] | undefined;
	shadeCode?: string | undefined;
	customWorkingDays?: number | undefined;
	clinicalNotes?: string | undefined;
	orderDate?: Date | string | undefined;
	isDraft?: boolean | undefined;
}
