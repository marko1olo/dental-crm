import { escapeHtml, formatDateRu } from "../documentPrintFormatters";
import { isDemoShowcaseMode } from "../../../utils/demoModeEngine";
import type { ClinicalPackagePrintOptions, ClinicalRequisitesContext } from "./types";

export function buildClinicalRequisitesContext(options: ClinicalPackagePrintOptions): ClinicalRequisitesContext {
	const { patient, clinic, doctorFullName, treatmentDetails } = options;
	const isDemo = isDemoShowcaseMode();
	const todayFormatted = new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }) + " г.";

	const clinicName = escapeHtml(clinic?.legalName || clinic?.fullName || clinic?.clinicName) || (isDemo ? "ООО «Стоматологическая клиника ДЕНТЕ»" : "«________________________________________»");
	const clinicAddress = escapeHtml(clinic?.actualAddress || clinic?.address) || (isDemo ? "г. Москва, ул. Стоматологическая, д. 10" : "«________________________________________»");
	const clinicInn = escapeHtml(clinic?.inn) || (isDemo ? "7701987654" : "«______________»");
	const clinicOgrn = escapeHtml(clinic?.ogrn) || (isDemo ? "1217700123456" : "«________________»");
	const clinicLicense = escapeHtml(clinic?.licenseNumber) || (isDemo ? "ЛО41-01137-77/00584930" : "«________________________________________»");
	const clinicPhone = escapeHtml(clinic?.phone) || (isDemo ? "+7 (495) 123-45-67" : "");

	const ptName = escapeHtml(patient?.fullName) || "________________________________________";
	const ptBirthDate = patient?.birthDate ? formatDateRu(patient.birthDate) : "«___» _________ _____ г.";
	const ptPhone = escapeHtml(patient?.phone) || "+7 (____) ____-____";
	const ptAddress = escapeHtml(patient?.registrationAddress || patient?.address) || "________________________________________";

	let ptPassport = "";
	if (patient?.passportSeries && patient?.passportNumber) {
		ptPassport = `серия ${escapeHtml(patient.passportSeries)} № ${escapeHtml(patient.passportNumber)}`;
		if (patient.passportIssuedBy) ptPassport += `, выдан: ${escapeHtml(patient.passportIssuedBy)}`;
		if (patient.passportIssuedDate) ptPassport += `, ${formatDateRu(patient.passportIssuedDate)}`;
		if (patient.passportDepartmentCode) ptPassport += `, код: ${escapeHtml(patient.passportDepartmentCode)}`;
	} else if (patient?.passport) {
		ptPassport = escapeHtml(patient.passport);
	} else {
		ptPassport = "серия ______ № ________, выдан ____________________________________";
	}

	const docDoctorName = escapeHtml(doctorFullName) || "________________________";
	const toothInfo = treatmentDetails?.toothNumbers ? `зуба / зубов: ${escapeHtml(String(treatmentDetails.toothNumbers))}` : "зубов полости рта";
	const icdDiagnosis = treatmentDetails?.diagnosisIcd10 ? ` (Диагноз по МКБ-10: ${escapeHtml(treatmentDetails.diagnosisIcd10)})` : "";
	const anesName = escapeHtml(treatmentDetails?.anestheticName) || "Артикаин 4% с эпинефрином (1:100 000 / 1:200 000)";
	const opType = escapeHtml(treatmentDetails?.treatmentType) || "терапевтическое стоматологическое лечение";

	return {
		todayFormatted, clinicName, clinicAddress, clinicInn, clinicOgrn, clinicLicense, clinicPhone,
		ptName, ptBirthDate, ptPhone, ptAddress, ptPassport, docDoctorName,
		toothInfo, icdDiagnosis, anesName, opType, opTooth: toothInfo,
	};
}
