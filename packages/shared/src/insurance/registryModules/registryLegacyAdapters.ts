import type { ClinicLegalInfo } from "../../sanpin/index.js";
import type {
	DmsRegistryServiceRecord,
	StatutoryInsuranceContract,
} from "../dmsPresetsAndCatalogs.js";
import { kopecksToRub } from "../../fiscal/index.js";

/**
 * Legacy XML Claim Registry builder for backwards-compatible interchange formats.
 */
export function generateDmsLegacyRegistryXml(
	records: readonly DmsRegistryServiceRecord[],
	clinic: ClinicLegalInfo,
	contract: StatutoryInsuranceContract,
	period: string,
	regNum: string,
): string {
	const recXml = records
		.map(
			(r) => `<Record>
				<VisitDate>${r.visitDate}</VisitDate>
				<Patient>${r.patientFullName}</Patient>
				<PolicyNumber>${r.policyNumber}</PolicyNumber>
				<ServiceCode804n>${r.serviceCode804n || r.serviceCode || ""}</ServiceCode804n>
				<DmsCoveredKopecks>${r.dmsCoveredKopecks || (r.dmsCoveredRub ? r.dmsCoveredRub * 100 : 0)}</DmsCoveredKopecks>
			</Record>`,
		)
		.join("\n");

	return `<?xml version="1.0" encoding="UTF-8"?>
<DmsReconciliationRegistry>
	<RegistryNumber>${regNum}</RegistryNumber>
	<Period>${period}</Period>
	<Clinic>
		<LegalName>${clinic.name}</LegalName>
		<INN>${clinic.inn}</INN>
	</Clinic>
	<Insurer>
		<Name>${contract.insurerShortName}</Name>
	</Insurer>
	<Records>${recXml}</Records>
</DmsReconciliationRegistry>`;
}

/**
 * Legacy CSV Claim Registry builder with UTF-8 BOM for Microsoft Excel & ARM Strakhovshchik.
 */
export function generateDmsLegacyRegistryCsv(
	records: readonly DmsRegistryServiceRecord[],
	_clinic: ClinicLegalInfo,
	_insurerName: string,
	_period: string,
): string {
	const header = "№ п/п;Дата визита;Ф.И.О. Застрахованного;Полис;Код услуги;Наименование;Покрыто ДМС;Доплата пациента";
	const rows = records.map(
		(r, i) => `${i + 1};${r.visitDate};${r.patientFullName};${r.policyNumber};${r.serviceCode804n || r.serviceCode || ""};${r.serviceName};${r.dmsCoveredRub || (r.dmsCoveredKopecks ? kopecksToRub(r.dmsCoveredKopecks) : 0)};${r.patientPaidRub || (r.patientPaidKopecks ? kopecksToRub(r.patientPaidKopecks) : 0)}`,
	);
	const totalRow = "ИТОГО;;;;;Всего;;";
	return `\uFEFF${[header, ...rows, totalRow].join("\r\n")}`;
}
