import { escapeXml } from "../../cda/c14n.js";
import { kopecksToNumericString } from "../../utils/money.js";
import type { DmsRegistryData } from "./registryTypes.js";
import { calculateDmsRegistryTotals } from "./registryKopeckCalculator.js";

/**
 * Generates official XML DMS Claim Registry document for electronic data interchange.
 */
export function generateDmsRegistryXml(data: DmsRegistryData): string {
	const totals = calculateDmsRegistryTotals(data.records);

	const xmlLines: string[] = [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<РеестрСчетовДМС xmlns="urn:dente:dms:registry:v1.0" ВерсияФормата="1.00">',
		'  <Шапка>',
		`    <НомерРеестра>${escapeXml(data.registryNumber)}</НомерРеестра>`,
		`    <ДатаРеестра>${escapeXml(data.registryDate)}</ДатаРеестра>`,
		`    <ПериодС>${escapeXml(data.periodStart)}</ПериодС>`,
		`    <ПериодПо>${escapeXml(data.periodEnd)}</ПериодПо>`,
		'  </Шапка>',
		'  <Клиника>',
		`    <Наименование>${escapeXml(data.clinic.nameRu)}</Наименование>`,
		`    <ИНН>${escapeXml(data.clinic.inn)}</ИНН>`,
		`    <КПП>${escapeXml(data.clinic.kpp || "")}</КПП>`,
		`    <ОГРН>${escapeXml(data.clinic.ogrn)}</ОГРН>`,
		`    <Адрес>${escapeXml(data.clinic.addressRu)}</Адрес>`,
		`    <Телефон>${escapeXml(data.clinic.phone)}</Телефон>`,
		`    <Лицензия>${escapeXml(data.clinic.medicalLicenseNumber)}</Лицензия>`,
		`    <ГлавныйВрач>${escapeXml(data.clinic.chiefDoctorNameRu)}</ГлавныйВрач>`,
		`    <ГлавныйБухгалтер>${escapeXml(data.clinic.chiefAccountantNameRu)}</ГлавныйБухгалтер>`,
		'  </Клиника>',
		'  <СтраховаяКомпания>',
		`    <Идентификатор>${escapeXml(data.insuranceCompany.companyId)}</Идентификатор>`,
		`    <Наименование>${escapeXml(data.insuranceCompany.nameRu)}</Наименование>`,
		`    <ИНН>${escapeXml(data.insuranceCompany.inn)}</ИНН>`,
		`    <НомерДоговора>${escapeXml(data.insuranceCompany.contractNumber)}</НомерДоговора>`,
		`    <ДатаДоговора>${escapeXml(data.insuranceCompany.contractDate)}</ДатаДоговора>`,
		'  </СтраховаяКомпания>',
		'  <СводныеИтоги>',
		`    <КоличествоЗаписей>${totals.totalRecordsCount}</КоличествоЗаписей>`,
		`    <КоличествоПациентов>${totals.uniquePatientsCount}</КоличествоПациентов>`,
		`    <СуммаВсегоКопеек>${totals.totalGrossKopecks}</СуммаВсегоКопеек>`,
		`    <СуммаВсегоРублей>${totals.totalGrossRub}</СуммаВсегоРублей>`,
		`    <ОплаченоПациентамиКопеек>${totals.totalPatientPaidKopecks}</ОплаченоПациентамиКопеек>`,
		`    <ОплаченоПациентамиРублей>${totals.totalPatientPaidRub}</ОплаченоПациентамиРублей>`,
		`    <КСтраховойОплатеКопеек>${totals.totalInsurerClaimKopecks}</КСтраховойОплатеКопеек>`,
		`    <КСтраховойОплатеРублей>${totals.totalInsurerClaimRub}</КСтраховойОплатеРублей>`,
		`    <СуммаПрописью>${escapeXml(totals.totalInsurerClaimInWordsRu)}</СуммаПрописью>`,
		'  </СводныеИтоги>',
		'  <ЗаписиРеестра>',
	];

	for (let i = 0; i < data.records.length; i++) {
		const rec = data.records[i]!;
		xmlLines.push(
			'    <Запись>',
			`      <ПорядковыйНомер>${i + 1}</ПорядковыйНомер>`,
			`      <Идентификатор>${escapeXml(rec.recordId)}</Идентификатор>`,
			`      <ДатаОказания>${escapeXml(rec.serviceDate)}</ДатаОказания>`,
			'      <Застрахованный>',
			`        <ФИО>${escapeXml(rec.patientFullName)}</ФИО>`,
			`        <ДатаРождения>${escapeXml(rec.patientBirthDate)}</ДатаРождения>`,
			`        <Пол>${escapeXml(rec.patientGender)}</Пол>`,
			rec.patientSnils ? `        <СНИЛС>${escapeXml(rec.patientSnils)}</СНИЛС>` : "",
			`        <НомерПолиса>${escapeXml(rec.policyNumber)}</НомерПолиса>`,
			`        <НомерГарантийногоПисьма>${escapeXml(rec.guaranteeLetterNumber)}</НомерГарантийногоПисьма>`,
			rec.guaranteeLetterDate ? `        <ДатаГарантийногоПисьма>${escapeXml(rec.guaranteeLetterDate)}</ДатаГарантийногоПисьма>` : "",
			'      </Застрахованный>',
			'      <Диагноз>',
			`        <КодМКБ10>${escapeXml(rec.icd10Code)}</КодМКБ10>`,
			`        <Описание>${escapeXml(rec.icd10DescriptionRu)}</Описание>`,
			rec.toothNumberFdi ? `        <ЗубFDI>${rec.toothNumberFdi}</ЗубFDI>` : "",
			'      </Диагноз>',
			'      <Услуга>',
			`        <Код804н>${escapeXml(rec.serviceCode804n)}</Код804н>`,
			`        <Наименование>${escapeXml(rec.serviceNameRu)}</Наименование>`,
			`        <Количество>${rec.quantity}</Количество>`,
			`        <ЦенаКопеек>${rec.unitPriceKopecks}</ЦенаКопеек>`,
			`        <ЦенаРублей>${kopecksToNumericString(rec.unitPriceKopecks)}</ЦенаРублей>`,
			`        <СтоимостьКопеек>${rec.totalGrossKopecks}</СтоимостьКопеек>`,
			`        <СтоимостьРублей>${kopecksToNumericString(rec.totalGrossKopecks)}</СтоимостьРублей>`,
			'      </Услуга>',
			'      <Врач>',
			`        <ФИО>${escapeXml(rec.doctorFullName)}</ФИО>`,
			rec.doctorSpecialtyRu ? `        <Специальность>${escapeXml(rec.doctorSpecialtyRu)}</Специальность>` : "",
			rec.doctorSnils ? `        <СНИЛС>${escapeXml(rec.doctorSnils)}</СНИЛС>` : "",
			'      </Врач>',
			'      <Финансы>',
			`        <ФраншизаПроцент>${rec.franchisePercent}</ФраншизаПроцент>`,
			`        <ОплаченоПациентомКопеек>${rec.patientPaidKopecks}</ОплаченоПациентомКопеек>`,
			`        <ОплаченоПациентомРублей>${kopecksToNumericString(rec.patientPaidKopecks)}</ОплаченоПациентомРублей>`,
			`        <КСтраховойОплатеКопеек>${rec.insurerClaimKopecks}</КСтраховойОплатеКопеек>`,
			`        <КСтраховойОплатеРублей>${kopecksToNumericString(rec.insurerClaimKopecks)}</КСтраховойОплатеРублей>`,
			'      </Финансы>',
			'    </Запись>',
		);
	}

	xmlLines.push('  </ЗаписиРеестра>', '</РеестрСчетовДМС>');
	return xmlLines.filter(Boolean).join("\n");
}
