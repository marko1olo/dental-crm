import { isDemoShowcaseMode } from "../../../utils/demoModeEngine";
import { escapeHtml, formatDateRu } from "../documentPrintFormatters";
import type { PrimaryIntakePackagePrintOptions, IntakeRequisitesContext } from "./types";

export function buildIntakeRequisitesContext(options: PrimaryIntakePackagePrintOptions): IntakeRequisitesContext {
	const { patient, representative, clinic, doctorFullName } = options;
	const isDemo = isDemoShowcaseMode();
	const todayFormatted = new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }) + " г.";

	const clinicName = escapeHtml(clinic?.legalName || clinic?.fullName || clinic?.clinicName) || (isDemo ? "ООО «Стоматологическая клиника ДЕНТЕ»" : "Стоматологическая клиника");
	const clinicAddress = escapeHtml(clinic?.actualAddress || clinic?.address) || (isDemo ? "г. Москва, ул. Стоматологическая, д. 10" : "«________________________________________»");
	const clinicCity = escapeHtml(clinic?.city) || (clinicAddress && !clinicAddress.includes("«") && clinicAddress.includes(",") ? clinicAddress.split(",")[0]?.trim() || (isDemo ? "г. Москва" : "«___________»") : (isDemo ? "г. Москва" : "«___________»"));
	const clinicWebsite = escapeHtml(clinic?.website) || (isDemo ? "клиника-денте.рф" : "");
	const clinicInn = escapeHtml(clinic?.inn) || (isDemo ? "7701987654" : "«______________»");
	const clinicKpp = escapeHtml(clinic?.kpp) || (isDemo ? "770101001" : "");
	const clinicOgrn = escapeHtml(clinic?.ogrn) || (isDemo ? "1217700123456" : "«________________»");
	const clinicLicense = escapeHtml(clinic?.licenseNumber) || (isDemo ? "ЛО41-01137-77/00584930" : "«________________________________________»");
	const clinicPhone = escapeHtml(clinic?.phone) || (isDemo ? "+7 (495) 123-45-67" : "«____________________»");
	const dirName = escapeHtml(clinic?.directorFullName);
	const clinicDirector = dirName || (isDemo ? "Иванов И.И." : "");
	const clinicDirectorDecoding = clinicDirector ? ` / ${clinicDirector} /` : "";
	const clinicDirectorTitle = escapeHtml(clinic?.directorTitle) || "Главный врач";

	const hasRep = Boolean(representative?.fullName);
	const repFullName = escapeHtml(representative?.fullName) || "";
	const repRelation = escapeHtml(representative?.relationship) || "Законный представитель";
	const repBasis = escapeHtml(representative?.basisDocument) || "свидетельство о рождении / акт опеки ____________________";
	const repPhone = escapeHtml(representative?.phone) || "____________________";
	let repPassport = "";
	if (representative?.passportSeries && representative?.passportNumber) {
		repPassport = `серия ${escapeHtml(representative.passportSeries)} № ${escapeHtml(representative.passportNumber)}`;
		if (representative.passportIssuedBy) repPassport += `, выдан: ${escapeHtml(representative.passportIssuedBy)}`;
		if (representative.passportIssuedDate) repPassport += `, ${formatDateRu(representative.passportIssuedDate)}`;
		if (representative.passportDepartmentCode) repPassport += `, код: ${escapeHtml(representative.passportDepartmentCode)}`;
	} else if (representative?.passport) {
		repPassport = escapeHtml(representative.passport);
	} else {
		repPassport = "серия ______ № ________, выдан ____________________________________, код _________";
	}

	const ptFullName = escapeHtml(patient?.fullName);
	const ptName = ptFullName || "________________________________________";
	const ptSignatureDecoding = ptFullName ? ` / ${ptFullName} /` : "";
	const ptBirthDate = patient?.birthDate ? formatDateRu(patient.birthDate) : "«___» _________ _____ г.";
	const ptPhone = escapeHtml(patient?.phone) || "+7 (____) ____-____";
	const ptAddress = escapeHtml(patient?.registrationAddress || patient?.address) || "________________________________________";
	const ptSnils = escapeHtml(patient?.snils) || "____________________";

	let ptPassport = "";
	if (patient?.passportSeries && patient?.passportNumber) {
		ptPassport = `серия ${escapeHtml(patient.passportSeries)} № ${escapeHtml(patient.passportNumber)}`;
		if (patient.passportIssuedBy) ptPassport += `, выдан: ${escapeHtml(patient.passportIssuedBy)}`;
		if (patient.passportIssuedDate) ptPassport += `, ${formatDateRu(patient.passportIssuedDate)}`;
		if (patient.passportDepartmentCode) ptPassport += `, код: ${escapeHtml(patient.passportDepartmentCode)}`;
	} else if (patient?.passport) {
		ptPassport = escapeHtml(patient.passport);
	} else {
		ptPassport = "серия ______ № ________, выдан ____________________________________, код _________";
	}

	return {
		todayFormatted, clinicName, clinicAddress, clinicCity, clinicWebsite, clinicInn, clinicKpp, clinicOgrn,
		clinicLicense, clinicPhone, clinicDirector, clinicDirectorDecoding, clinicDirectorTitle,
		hasRep, repFullName, repRelation, repBasis, repPhone, repPassport,
		ptName, ptSignatureDecoding, ptBirthDate, ptPhone, ptAddress, ptSnils, ptPassport,
		docDoctorName: escapeHtml(doctorFullName) || "________________________",
		patientCardNumber: patient?.cardNumber || "01",
	};
}
