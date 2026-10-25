import type {
	SickLeaveFormState,
	SickLeavePatientData,
	IncapacityPeriod,
} from "../sickLeaveElnEngine";
import {
	calculateSickLeaveDates,
	generateElnNumber,
	DEFAULT_CLINIC_NAME,
	DEFAULT_CLINIC_OGRN,
	DEFAULT_CLINIC_ADDRESS,
	DEFAULT_CLINIC_LICENCE,
} from "../sickLeaveElnEngine";
import { isDemoShowcaseMode } from "../../../../lib/demoMode";
import type { SickLeaveElnModalProps } from "./types";

export function createInitialSickLeaveState(props: SickLeaveElnModalProps, todayStr: string) {
	const initDates = calculateSickLeaveDates(todayStr, 5);
	const initialPeriod: IncapacityPeriod = {
		id: 'p-1',
		dateFrom: initDates.dateFrom,
		dateTo: initDates.dateTo,
		doctorSpecialty: props.initialDoctorSpecialty || 'Врач-стоматолог-хирург',
		doctorFio: props.initialDoctorFio || '',
		doctorSnils: props.initialDoctorSnils || '',
		doctorRole: 'attending'
	};

	const initialForm: SickLeaveFormState = {
		elnNumber: generateElnNumber(),
		issueDate: todayStr,
		isDuplicate: false,
		reasonCode: '01',
		regimeType: 'ambulatory',
		icd10Code: props.initialIcd10Code || 'K10.2',
		diagnosisText: props.initialDiagnosisText || 'Острый гнойный периостит нижней челюсти',
		periods: [initialPeriod],
		closingCode: '31',
		workResumeDate: initDates.workResumeDate,
		isVkRequired: false,
		organizationName: isDemoShowcaseMode() ? DEFAULT_CLINIC_NAME : "",
		organizationOgrn: isDemoShowcaseMode() ? DEFAULT_CLINIC_OGRN : "",
		organizationAddress: isDemoShowcaseMode() ? DEFAULT_CLINIC_ADDRESS : "",
		medicalLicenceNumber: isDemoShowcaseMode() ? DEFAULT_CLINIC_LICENCE : ""
	};

	const initialPatient: SickLeavePatientData = {
		patientFio: props.initialPatientName || '',
		patientBirthDate: props.initialPatientBirthDate || '',
		patientGender: props.initialPatientGender || 'male',
		patientSnils: props.initialPatientSnils || '',
		patientOmsNumber: '',
		patientPassport: '',
		employerName: props.initialEmployerName || '',
		isPrimaryWorkplace: true,
		patientPhone: ''
	};

	return { initialForm, initialPatient };
}
