import { useVisitDiaryPatientTeeth, type ToothStateItem } from "./useVisitDiaryPatientTeeth";
import { useVisitDiaryRadiology } from "./useVisitDiaryRadiology";
import {
	resolvePrintPatient,
	extractPatientPrintMeta,
	extractDoctorMeta,
} from "./patientDiaryMetaExtractor";

export interface UseVisitDiaryPatientInfoParams {
	readonly patientId: string;
	readonly visitId?: string;
	readonly initialTeethData?: readonly ToothStateItem[];
	readonly activePatient?: any;
	readonly activeDoctor?: any;
	readonly clinicSettings?: any;
	readonly diaryDoctorFullName?: string | null;
	readonly diaryDoctorSpecialty?: string | null;
	readonly ctxDashboard?: any;
}

export function useVisitDiaryPatientInfo({
	patientId,
	visitId,
	initialTeethData = [],
	activePatient,
	activeDoctor,
	clinicSettings,
	diaryDoctorFullName,
	diaryDoctorSpecialty,
	ctxDashboard,
}: UseVisitDiaryPatientInfoParams) {
	const effectiveScopeId = visitId || patientId;
	const { activeTeeth, setActiveTeeth } = useVisitDiaryPatientTeeth(patientId, initialTeethData);
	const { radiologySnapshots } = useVisitDiaryRadiology(patientId, visitId);

	const printPatient = resolvePrintPatient(patientId, activePatient, ctxDashboard);
	const patientMeta = extractPatientPrintMeta(printPatient);
	const doctorMeta = extractDoctorMeta(activeDoctor, diaryDoctorFullName, diaryDoctorSpecialty);

	const clinicName =
		typeof clinicSettings?.name === "string"
			? clinicSettings.name
			: typeof clinicSettings?.clinicName === "string"
				? clinicSettings.clinicName
				: "";
	const clinicAddress = typeof clinicSettings?.address === "string" ? clinicSettings.address : "";
	const clinicInn = typeof clinicSettings?.inn === "string" ? clinicSettings.inn : "";

	return {
		activeTeeth,
		setActiveTeeth,
		radiologySnapshots,
		printPatient,
		...patientMeta,
		clinicName,
		clinicAddress,
		clinicInn,
		...doctorMeta,
	};
}
