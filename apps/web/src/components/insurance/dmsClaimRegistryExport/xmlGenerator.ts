/**
 * xmlGenerator.ts — Генерация электронного XML-реестра счетов ДМС (ЕГИСЗ / ДМС-2026)
 */

import { escapeXml } from "./formatters.js";
import type { ClinicLegalProfile, DmsInsuranceContractRecord, DmsRegistryItemRecord } from "./types.js";

export function generateDmsRegistryXml(
	records: readonly DmsRegistryItemRecord[],
	clinic: ClinicLegalProfile,
	selectedInsurer: DmsInsuranceContractRecord | undefined,
	periodStr: string,
	registryNumber: string,
): string {
	const nowIso = new Date().toISOString();
	const totalBillKop = records.reduce((acc, r) => acc + r.totalPriceKopecks, 0);
	const totalDmsKop = records.reduce((acc, r) => acc + r.dmsCoveredKopecks, 0);
	const totalPatientKop = records.reduce((acc, r) => acc + r.patientPaidKopecks, 0);
	const uniquePatients = new Set(records.map((r) => r.patientFullName)).size;

	const itemsXml = records
		.map((r, idx) => {
			const toothTag = r.toothNumber ? `\n      <ToothFdi>${r.toothNumber}</ToothFdi>` : "";
			const letterTag = r.guaranteeLetterNumber
				? `\n      <GuaranteeLetterNumber>${escapeXml(r.guaranteeLetterNumber)}</GuaranteeLetterNumber>`
				: "";

			return `    <Item index="${idx + 1}">
      <VisitId>${escapeXml(r.visitId)}</VisitId>
      <VisitDate>${r.visitDate}</VisitDate>
      <Patient>
        <FullName>${escapeXml(r.patientFullName)}</FullName>
        <PolicyNumber>${escapeXml(r.policyNumber)}</PolicyNumber>${letterTag}
      </Patient>
      <Insurer>
        <Key>${escapeXml(r.insurerKey)}</Key>
        <Name>${escapeXml(r.insurerName)}</Name>
      </Insurer>
      <ClinicalData>
        <ServiceCode804n>${escapeXml(r.serviceCode804n)}</ServiceCode804n>
        <ServiceName>${escapeXml(r.serviceName)}</ServiceName>${toothTag}
        <DiagnosisMkb10>${escapeXml(r.diagnosisMkb10)}</DiagnosisMkb10>
        <AttendingDoctor>${escapeXml(r.doctorFullName)}</AttendingDoctor>
      </ClinicalData>
      <FinancialData>
        <Quantity>${r.quantity}</Quantity>
        <UnitPriceKopecks>${r.unitPriceKopecks}</UnitPriceKopecks>
        <TotalPriceKopecks>${r.totalPriceKopecks}</TotalPriceKopecks>
        <DmsCoveredKopecks>${r.dmsCoveredKopecks}</DmsCoveredKopecks>
        <PatientPaidKopecks>${r.patientPaidKopecks}</PatientPaidKopecks>
        <DmsCoveredRubles>${(r.dmsCoveredKopecks / 100).toFixed(2)}</DmsCoveredRubles>
        <PatientPaidRubles>${(r.patientPaidKopecks / 100).toFixed(2)}</PatientPaidRubles>
        <VatExemption>пп. 2 п. 2 ст. 149 НК РФ</VatExemption>
      </FinancialData>
      <Status>${r.status}</Status>
    </Item>`;
		})
		.join("\n");

	return `<?xml version="1.0" encoding="UTF-8"?>
<DmsReconciliationRegistry version="2.0" timestamp="${nowIso}" xmlns="urn:dental-crm:dms:registry:2026">
  <Header>
    <RegistryNumber>${escapeXml(registryNumber)}</RegistryNumber>
    <CreationDate>${nowIso.slice(0, 10)}</CreationDate>
    <Period>${escapeXml(periodStr)}</Period>
    <Clinic>
      <LegalName>${escapeXml(clinic.legalName)}</LegalName>
      <BrandName>${escapeXml(clinic.brandName)}</BrandName>
      <INN>${escapeXml(clinic.inn)}</INN>
      <OGRN>${escapeXml(clinic.ogrn)}</OGRN>
      <KPP>${escapeXml(clinic.kpp)}</KPP>
      <Address>${escapeXml(clinic.address)}</Address>
      <Phone>${escapeXml(clinic.phone)}</Phone>
      <License>${escapeXml(clinic.licenseNumber)} от ${escapeXml(clinic.licenseDate)}</License>
      <ChiefDoctor>${escapeXml(clinic.chiefDoctorFullName)}</ChiefDoctor>
    </Clinic>
    <TargetInsurer>
      <Key>${escapeXml(selectedInsurer?.insurerKey || "all")}</Key>
      <Name>${escapeXml(selectedInsurer?.insurerShortName || "Сводный реестр (все компании)")}</Name>
      <INN>${escapeXml(selectedInsurer?.inn || "")}</INN>
      <ContractNumber>${escapeXml(selectedInsurer?.contractNumber || "По соглашению")}</ContractNumber>
      <ContractDate>${escapeXml(selectedInsurer?.contractDate || "")}</ContractDate>
    </TargetInsurer>
  </Header>
  <Summary>
    <TotalServicesCount>${records.length}</TotalServicesCount>
    <UniquePatientsCount>${uniquePatients}</UniquePatientsCount>
    <GrandTotalBillKopecks>${totalBillKop}</GrandTotalBillKopecks>
    <GrandTotalBillRubles>${(totalBillKop / 100).toFixed(2)}</GrandTotalBillRubles>
    <GrandTotalDmsCoveredKopecks>${totalDmsKop}</GrandTotalDmsCoveredKopecks>
    <GrandTotalDmsCoveredRubles>${(totalDmsKop / 100).toFixed(2)}</GrandTotalDmsCoveredRubles>
    <GrandTotalPatientPaidKopecks>${totalPatientKop}</GrandTotalPatientPaidKopecks>
    <GrandTotalPatientPaidRubles>${(totalPatientKop / 100).toFixed(2)}</GrandTotalPatientPaidRubles>
    <IntegrityInvariantVerified>${totalBillKop === totalDmsKop + totalPatientKop}</IntegrityInvariantVerified>
    <VatExemptionLaw>Без НДС (пп. 2 п. 2 ст. 149 Налогового кодекса РФ)</VatExemptionLaw>
  </Summary>
  <Items count="${records.length}">
${itemsXml}
  </Items>
</DmsReconciliationRegistry>`;
}
