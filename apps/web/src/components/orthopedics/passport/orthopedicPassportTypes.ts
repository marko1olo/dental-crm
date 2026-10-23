export interface OrthopedicPassportData {
	readonly orderNumber?: string | undefined;
	readonly passportNumber?: string | undefined;
	readonly issueDate?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly clinicAddress?: string | undefined;
	readonly clinicPhone?: string | undefined;
	readonly patientName?: string | undefined;
	readonly patientChartNumber?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly technicianName?: string | undefined;
	readonly labName?: string | undefined;
	readonly toothFdi: string;
	readonly constructionName: string;
	readonly material: string;
	readonly colorVita: string;
	readonly stumpShade?: string | undefined;
	readonly preparationMarginLabel?: string | undefined;
	readonly fixationTypeLabel?: string | undefined;
	readonly warrantyMonths?: number | undefined;
	readonly warrantyLabelRu?: string | undefined;
	readonly batchLotNumber?: string | undefined;
	readonly standardsCompliance?: string | undefined;
	readonly careNotes?: readonly string[] | undefined;
}

export interface OrthopedicPassportA4ModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly passport: OrthopedicPassportData;
}
