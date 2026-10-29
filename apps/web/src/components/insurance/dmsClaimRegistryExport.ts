/**
 * dmsClaimRegistryExport.ts — Canonical re-export facade from insuranceData SSOT.
 */

import {
	exportRegistryToCsv,
	formatCurrencyKopecks,
	formatCurrencyRub,
	generateBilateralAcceptanceActHtml,
	kopecksToRub,
	rubToKopecks,
	RUSSIAN_DMS_INSURERS,
} from "./insuranceData.js";

export * from "./insuranceData.js";

export const DEFAULT_CLINIC_PROFILE = {
	legalName: "ООО «Стоматологический Центр «ДЕНТЕ»",
	inn: "7701984210",
	ogrn: "1027700198421",
	kpp: "770101001",
	address: "г. Москва, ул. Арбат, д. 20",
	chiefDoctor: "Смирнов В.А.",
};

export const DEFAULT_STATUTORY_INSURANCE_CONTRACTS = [
	{ insurerKey: "sogaz", insurerShortName: "АО «СОГАЗ»", contractNumber: "ДМС-СОГ-2026/01", defaultFranchisePct: 0, inn: "7736035485" },
	{ insurerKey: "alfastrakhovanie", insurerShortName: "АО «АльфаСтрахование»", contractNumber: "ДМС-АЛЬФА-2026/02", defaultFranchisePct: 10, inn: "7713056834" },
	{ insurerKey: "ingosstrakh", insurerShortName: "СПАО «Ингосстрах»", contractNumber: "ДМС-ИНГ-2026/03", defaultFranchisePct: 15, inn: "7705042179" },
	{ insurerKey: "reso_garantiya", insurerShortName: "СПАО «РЕСО-Гарантия»", contractNumber: "ДМС-РЕСО-2026/04", defaultFranchisePct: 0, inn: "7710045520" },
	{ insurerKey: "vsk", insurerShortName: "САО «ВСК»", contractNumber: "ДМС-ВСК-2026/05", defaultFranchisePct: 20, inn: "7710026574" },
	{ insurerKey: "soglasie", insurerShortName: "ООО «СК «Согласие»", contractNumber: "ДМС-СОГЛ-2026/06", defaultFranchisePct: 0, inn: "7706070733" },
];

export const STATUTORY_DMS_CONTRACTS_CATALOG = DEFAULT_STATUTORY_INSURANCE_CONTRACTS;

export const DEFAULT_MONTHLY_DMS_REGISTRY_RECORDS = [
	{
		id: "rec-1",
		visitDate: "01.08.2026",
		patientFullName: "Иванов Сергей Алексеевич",
		policyNumber: "СГЗ-77-991283",
		letterNumber: "ГП-СОГАЗ-2026-8812",
		serviceCode804n: "A16.07.002.001",
		serviceName: "Восстановление зуба пломбой светового отверждения",
		diagnosisCodeMkb10: "K02.1",
		toothNumber: "16",
		quantity: 1,
		unitPriceKopecks: 450000,
		totalPriceKopecks: 450000,
		dmsCoveredKopecks: 450000,
		patientPaidKopecks: 0,
		unitPriceRub: 4500,
		totalPriceRub: 4500,
		dmsCoveredRub: 4500,
		patientPaidRub: 0,
		doctorFullName: "Д-р Соколов А.В.",
		isExcluded: false,
	},
	{
		id: "rec-2",
		visitDate: "05.08.2026",
		patientFullName: "Иванов Сергей Алексеевич",
		policyNumber: "СГЗ-77-991283",
		letterNumber: "ГП-СОГАЗ-2026-8812",
		serviceCode804n: "A16.07.030.002",
		serviceName: "Эндодонтическое лечение корневых каналов",
		diagnosisCodeMkb10: "K04.0",
		toothNumber: "16",
		quantity: 1,
		unitPriceKopecks: 580000,
		totalPriceKopecks: 580000,
		dmsCoveredKopecks: 580000,
		patientPaidKopecks: 0,
		unitPriceRub: 5800,
		totalPriceRub: 5800,
		dmsCoveredRub: 5800,
		patientPaidRub: 0,
		doctorFullName: "Д-р Соколов А.В.",
		isExcluded: false,
	},
];

export function formatKopecksToRub(kopecks: number): string {
	const rub = kopecksToRub(kopecks);
	return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", minimumFractionDigits: 2 }).format(rub);
}

export function formatRubInt(kopecks: number): string {
	const rub = Math.round(kopecksToRub(kopecks));
	return `${rub.toLocaleString("ru-RU")} ₽`;
}

export function formatKopecksToRubles(kopecks: number): string {
	return formatKopecksToRub(kopecks);
}

export function generateDmsRegistryXml(records: readonly any[], clinic: any, contract: any, period: string, regNum: string): string {
	const recXml = records
		.map(
			(r) => `<Record>
				<VisitDate>${r.visitDate}</VisitDate>
				<Patient>${r.patientFullName}</Patient>
				<PolicyNumber>${r.policyNumber}</PolicyNumber>
				<ServiceCode804n>${r.serviceCode804n}</ServiceCode804n>
				<DmsCoveredKopecks>${r.dmsCoveredKopecks}</DmsCoveredKopecks>
			</Record>`,
		)
		.join("\n");

	return `<?xml version="1.0" encoding="UTF-8"?>
<DmsReconciliationRegistry>
	<RegistryNumber>${regNum}</RegistryNumber>
	<Period>${period}</Period>
	<Clinic>
		<LegalName>${clinic.legalName}</LegalName>
		<INN>${clinic.inn}</INN>
	</Clinic>
	<Insurer>
		<Name>${contract.insurerShortName}</Name>
	</Insurer>
	<Records>${recXml}</Records>
</DmsReconciliationRegistry>`;
}

export function generateDmsRegistryCsv(records: readonly any[], clinic: any, insurerName: string, period: string): string {
	const header = "№ п/п;Дата визита;Ф.И.О. Застрахованного;Полис;Код услуги;Наименование;Покрыто ДМС;Доплата пациента";
	const rows = records.map((r, i) => `${i + 1};${r.visitDate};${r.patientFullName};${r.policyNumber};${r.serviceCode804n};${r.serviceName};${r.dmsCoveredRub || kopecksToRub(r.dmsCoveredKopecks)};${r.patientPaidRub || kopecksToRub(r.patientPaidKopecks)}`);
	const totalRow = "ИТОГО;;;;;Всего;;";
	return `\uFEFF${[header, ...rows, totalRow].join("\r\n")}`;
}

export function generateDmsA4PrintableHtml(records: readonly any[], clinic: any, contract: any, period: string, regNum: string): string {
	return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>СЧЕТ-РЕЕСТР МЕДИЦИНСКИХ УСЛУГ ПО ДМС № ${regNum}</title></head>
<body>
	<h1>СЧЕТ-РЕЕСТР МЕДИЦИНСКИХ УСЛУГ ПО ДМС № ${regNum}</h1>
	<p>Исполнитель: ${clinic.legalName || clinic.name}</p>
	<p>Период: ${period}</p>
	<h2>ДВУСТОРОННИЙ АКТ СДАЧИ-ПРИЕМКИ ОКАЗАННЫХ УСЛУГ</h2>
</body>
</html>`;
}

export function generateDmsClaimXml(params: any): string {
	return generateDmsRegistryXml(params.records || [], params.clinic || DEFAULT_CLINIC_PROFILE, params.contract || DEFAULT_STATUTORY_INSURANCE_CONTRACTS[0], "2026", "CLM-001");
}

export function generateDmsClaimCsv(records: readonly any[], clinic: any, insurer: any): string {
	return generateDmsRegistryCsv(records, clinic, insurer, "2026");
}

export function generateDmsConsolidatedInvoiceHtml(params: any): string {
	return generateDmsA4PrintableHtml(params.records || [], params.clinicInfo || DEFAULT_CLINIC_PROFILE, params.contract || DEFAULT_STATUTORY_INSURANCE_CONTRACTS[0], "2026", params.actNumber || "АКТ-1");
}

export function validateRegistryKopeckBalance(totalBillKop: number, dmsKop: number, patientKop: number): boolean {
	return totalBillKop === dmsKop + patientKop;
}
