export interface PatientDuplicateMergeModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientId: string;
	readonly patientName?: string | undefined;
	readonly duplicatePatient?: any;
	readonly onMergeSuccess?: ((result: any) => void) | undefined;
}
