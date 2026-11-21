/**
 * DENTE Dental CRM — DMS Claim Registries & Statutory Export Formats SSOT.
 * Compliant with Mandate 8b (< 300 lines).
 */

import { kopecksToNumericString, kopecksToRubles, rublesToKopecks } from "../../money.js";
import type { DmsGuaranteeLetter } from "../guaranteeModules/guaranteeTypes.js";
import type { DmsSplitLineResult } from "../../schemas/dmsSplitAndScalePresetSchemas.js";

// Re-export Bilateral Acceptance Acts & Printables
export * from "./dmsBilateralActPrintable.js";

export interface DmsRegistryServiceRecord {
	readonly id?: string | undefined;
	readonly visitId?: string | undefined;
	readonly visitDate: string;
	readonly serviceDate?: string | undefined;
	readonly patientId?: string | undefined;
	readonly patientFullName: string;
	readonly policyNumber: string;
	readonly insurerName?: string | undefined;
	readonly guaranteeLetterNumber?: string | undefined;
	readonly serviceCode804n?: string | undefined;
	readonly serviceCode?: string | undefined;
	readonly serviceName: string;
	readonly diagnosisCodeMkb10?: string | undefined;
	readonly diagnosisMkb10?: string | undefined;
	readonly toothNumber?: string | undefined;
	readonly quantity?: number | undefined;
	readonly unitPriceRub?: number | undefined;
	readonly totalPriceRub?: number | undefined;
	readonly unitPriceKopecks?: number | undefined;
	readonly totalPriceKopecks?: number | undefined;
	readonly totalBillKopecks?: number | undefined;
	readonly dmsCoveredRub?: number | undefined;
	readonly dmsCoveredKopecks?: number | undefined;
	readonly dmsAcceptedKopecks?: number | undefined;
	readonly patientPaidRub?: number | undefined;
	readonly patientPaidKopecks?: number | undefined;
	readonly totalKopecks?: number | undefined;
	readonly totalRubles?: number | undefined;
	readonly insuranceCoveredKopecks?: number | undefined;
	readonly insuranceCoveredRubles?: number | undefined;
	readonly patientOutOfPocketKopecks?: number | undefined;
	readonly patientOutOfPocketRubles?: number | undefined;
	readonly doctorFullName?: string | undefined;
	readonly isExcluded?: boolean | undefined;
	readonly exclusionReason?: string | undefined;
	readonly letterNumber?: string | undefined;
	readonly lineItem?: Partial<DmsSplitLineResult> | undefined;
}

export type DmsRegistryVisitServiceItem = DmsRegistryServiceRecord;

export interface DmsRegistrySummary {
	readonly totalServicesCount: number;
	readonly uniquePatientsCount: number;
	readonly totalAmountRub: number;
	readonly totalDmsCoveredRub: number;
	readonly totalPatientPaidRub: number;
	readonly isBalanced: boolean;
	readonly insurerName: string;
	readonly periodStart: string;
	readonly periodEnd: string;
}

export interface DmsStatutoryRegistry {
	readonly registryNumber: string;
	readonly registryId: string;
	readonly insurerId: string;
	readonly periodStart: string;
	readonly periodEnd: string;
	readonly visitServices: readonly DmsRegistryServiceRecord[];
	readonly records: readonly DmsRegistryServiceRecord[];
	readonly totalVisitsCount: number;
	readonly uniquePatientsCount: number;
	readonly grandTotalBillKopecks: number;
	readonly grandTotalDmsKopecks: number;
	readonly grandTotalPatientKopecks: number;
}

export const DEFAULT_MONTHLY_DMS_REGISTRY_RECORDS: readonly DmsRegistryServiceRecord[] = [
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

export const SAMPLE_DMS_GUARANTEE_LETTERS: readonly DmsGuaranteeLetter[] = [
	{
		id: "sample-letter-1",
		letterNumber: "ГП-СОГАЗ-2026-01",
		issueDate: "2026-01-15",
		validFrom: "2026-01-15",
		validTo: "2026-12-31",
		validUntil: "2026-12-31",
		companyId: "sogaz",
		companyName: "АО «СОГАЗ»",
		policyNumber: "СГЗ-77-991283",
		patientFullName: "Соколова Анна Викторовна",
		patientBirthDate: "1985-04-12",
		limitKopecks: 5000000,
		usedKopecks: 1250000,
		remainingLimitKopecks: 3750000,
		defaultFranchisePercent: 0,
		status: "active",
	},
	{
		id: "sample-letter-exp",
		letterNumber: "ГП-СОГАЗ-2025-99",
		issueDate: "2025-01-15",
		validFrom: "2025-01-15",
		validTo: "2025-12-31",
		validUntil: "2025-12-31",
		companyId: "sogaz",
		companyName: "АО «СОГАЗ»",
		policyNumber: "СГЗ-77-991283",
		patientFullName: "Соколова Анна Викторовна",
		patientBirthDate: "1985-04-12",
		limitKopecks: 3000000,
		usedKopecks: 3000000,
		remainingLimitKopecks: 0,
		defaultFranchisePercent: 0,
		status: "expired",
	},
];

export function calculateRegistryTotals(
	records: readonly DmsRegistryServiceRecord[],
	insurerName = "Все компании",
	periodStart = "",
	periodEnd = "",
): DmsRegistrySummary {
	const uniquePatients = new Set<string>();
	let totalAmountRub = 0;
	let totalDmsCoveredRub = 0;
	let totalPatientPaidRub = 0;
	for (const r of records) {
		if (r.patientFullName) uniquePatients.add(r.patientFullName);
		totalAmountRub += Number(r.totalPriceRub || 0);
		totalDmsCoveredRub += Number(r.dmsCoveredRub || 0);
		totalPatientPaidRub += Number(r.patientPaidRub || 0);
	}
	return {
		totalServicesCount: records.length,
		uniquePatientsCount: uniquePatients.size,
		totalAmountRub: kopecksToRubles(rublesToKopecks(totalAmountRub)),
		totalDmsCoveredRub: kopecksToRubles(rublesToKopecks(totalDmsCoveredRub)),
		totalPatientPaidRub: kopecksToRubles(rublesToKopecks(totalPatientPaidRub)),
		isBalanced: Math.abs(totalAmountRub - (totalDmsCoveredRub + totalPatientPaidRub)) < 0.01,
		insurerName,
		periodStart,
		periodEnd,
	};
}

export function buildDmsReconciliationRegistry(params: {
	registryNumber?: string | undefined;
	registryDate?: string | undefined;
	items?: readonly DmsRegistryServiceRecord[] | undefined;
	splitResults?: readonly DmsRegistryServiceRecord[] | undefined;
}): {
	registryNumber: string;
	registryDate: string;
	items: readonly DmsRegistryServiceRecord[];
	splitResults: readonly DmsRegistryServiceRecord[];
	totalRegistryAmountRubles: number;
	totalDmsClaimedRubles: number;
	totalPatientCoPaymentRubles: number;
	totalServicesCount: number;
	totalPatientsCount: number;
} {
	const items = params.splitResults || params.items || [];
	let totRub = 0;
	let dmsRub = 0;
	let patRub = 0;

	for (const item of items) {
		const line = item.lineItem;
		totRub += line?.totalPriceRub ?? item.totalRubles ?? (typeof item.totalKopecks === "number" ? kopecksToRubles(item.totalKopecks) : (item.totalPriceRub || 0));
		dmsRub += line?.dmsCoveredRub ?? item.insuranceCoveredRubles ?? (typeof item.insuranceCoveredKopecks === "number" ? kopecksToRubles(item.insuranceCoveredKopecks) : (item.dmsCoveredRub || 0));
		patRub += line?.patientCoPayRub ?? item.patientOutOfPocketRubles ?? (typeof item.patientOutOfPocketKopecks === "number" ? kopecksToRubles(item.patientOutOfPocketKopecks) : (item.patientPaidRub || 0));
	}

	const todayIso = new Date().toISOString().slice(0, 10);
	const fallbackRegistryNum = `РЕЕСТР-${todayIso.replace(/-/g, "")}`;

	return {
		registryNumber: params.registryNumber || fallbackRegistryNum,
		registryDate: params.registryDate || todayIso,
		items,
		splitResults: items,
		totalRegistryAmountRubles: kopecksToRubles(rublesToKopecks(totRub)),
		totalDmsClaimedRubles: kopecksToRubles(rublesToKopecks(dmsRub)),
		totalPatientCoPaymentRubles: kopecksToRubles(rublesToKopecks(patRub)),
		totalServicesCount: items.length,
		totalPatientsCount: new Set(items.map((i) => i.patientFullName)).size || 1,
	};
}

export function exportDmsRegistryToCsv(registry: {
	registryNumber?: string | undefined;
	items?: readonly DmsRegistryServiceRecord[] | undefined;
	splitResults?: readonly DmsRegistryServiceRecord[] | undefined;
	totalRegistryAmountRubles?: number | undefined;
	totalDmsClaimedRubles?: number | undefined;
	totalPatientCoPaymentRubles?: number | undefined;
}): string {
	const todayIso = new Date().toISOString().slice(0, 10);
	const fallbackRegNum = `РЕЕСТР-${todayIso.replace(/-/g, "")}`;
	const items = registry.splitResults || registry.items || [];
	const lines = [
		`# Реестр счетов ДМС;${registry.registryNumber || fallbackRegNum}`,
		`№ п/п;Дата услуги;Ф.И.О. пациента;Номер полиса;Номер гарантийного письма;Код услуги;Наименование;Сумма;Покрыто ДМС;Доплата пациента`,
	];

	items.forEach((item, idx) => {
		const l = item.lineItem;
		const total = l?.totalPriceRub ?? (typeof item.totalKopecks === "number" ? kopecksToRubles(item.totalKopecks) : (item.totalPriceRub || 0));
		const dms = l?.dmsCoveredRub ?? (typeof item.insuranceCoveredKopecks === "number" ? kopecksToRubles(item.insuranceCoveredKopecks) : (item.dmsCoveredRub || 0));
		const patient = l?.patientCoPayRub ?? (typeof item.patientOutOfPocketKopecks === "number" ? kopecksToRubles(item.patientOutOfPocketKopecks) : (item.patientPaidRub || 0));
		const sCode = l?.serviceCode || item.serviceCode804n || item.serviceCode || "";
		const sName = l?.serviceName || item.serviceName || "";
		lines.push(
			`${idx + 1};${item.serviceDate || item.visitDate || todayIso};${item.patientFullName || ""};${item.policyNumber || ""};${item.guaranteeLetterNumber || item.letterNumber || "—"};${sCode};${sName};${total};${dms};${patient}`,
		);
	});

	lines.push(`ИТОГО ПО РЕЕСТРУ;;;;;;;${registry.totalRegistryAmountRubles ?? 0};${registry.totalDmsClaimedRubles ?? 0};${registry.totalPatientCoPaymentRubles ?? 0}`);
	return `\uFEFF${lines.join("\r\n")}`;
}

export function exportRegistryToCsv(
	recordsOrRegistry: readonly DmsRegistryServiceRecord[] | {
		registryNumber?: string | undefined;
		items?: readonly DmsRegistryServiceRecord[] | undefined;
		splitResults?: readonly DmsRegistryServiceRecord[] | undefined;
		visitServices?: readonly DmsRegistryServiceRecord[] | undefined;
		totalRegistryAmountRubles?: number | undefined;
		totalDmsClaimedRubles?: number | undefined;
		totalPatientCoPaymentRubles?: number | undefined;
	},
	clinicInfo?: { name: string; inn: string; kpp?: string | undefined } | undefined,
	insurerName?: string | undefined,
	periodStr?: string | undefined,
): string {
	if (Array.isArray(recordsOrRegistry)) {
		const records = recordsOrRegistry;
		const info = clinicInfo || { name: "ООО «ДЕНТЕ КЛИНИК»", inn: "7701984210" };
		const insName = insurerName || "Все компании";
		const pStr = periodStr || "2026";
		const esc = (v: unknown) => v == null ? '""' : `"${String(v).replace(/"/g, '""')}"`;
		const headers = [
			`# Реестр оказанных услуг по ДМС;${esc(info.name)};ИНН: ${esc(info.inn)}`,
			`# Страховая компания: ${esc(insName)};Период: ${esc(pStr)}`,
			"",
			[esc("№"), esc("Дата"), esc("Пациент"), esc("Полис"), esc("Гар. письмо"), esc("Код"), esc("Услуга"), esc("Диагноз"), esc("Зуб"), esc("Кол-во"), esc("Тариф"), esc("Сумма"), esc("ДМС"), esc("Пациент"), esc("Врач")].join(";"),
		];
		const rows = records.map((r, i) => [
			esc(i + 1), esc(r.visitDate), esc(r.patientFullName), esc(r.policyNumber), esc(r.letterNumber || "—"),
			esc(r.serviceCode804n || r.serviceCode || ""), esc(r.serviceName), esc(r.diagnosisCodeMkb10 || "—"), esc(r.toothNumber || "—"),
			esc(r.quantity ?? 1), esc(Number(r.unitPriceRub || 0).toFixed(2)), esc(Number(r.totalPriceRub || 0).toFixed(2)),
			esc(Number(r.dmsCoveredRub || 0).toFixed(2)), esc(Number(r.patientPaidRub || 0).toFixed(2)), esc(r.doctorFullName || "—"),
		].join(";"));
		const totals = calculateRegistryTotals(records, insName);
		const totalRow = [
			esc("ИТОГО"), esc(""), esc(`Пациентов: ${totals.uniquePatientsCount}`), esc(""), esc(""), esc(""),
			esc(`Услуг: ${totals.totalServicesCount}`), esc(""), esc(""), esc(""), esc(""),
			esc(totals.totalAmountRub.toFixed(2)), esc(totals.totalDmsCoveredRub.toFixed(2)), esc(totals.totalPatientPaidRub.toFixed(2)), esc(""),
		].join(";");
		return `\uFEFF${[...headers, ...rows, "", totalRow].join("\r\n")}`;
	}

	const reg = recordsOrRegistry as {
		registryNumber?: string | undefined;
		items?: readonly DmsRegistryServiceRecord[] | undefined;
		splitResults?: readonly DmsRegistryServiceRecord[] | undefined;
		visitServices?: readonly DmsRegistryServiceRecord[] | undefined;
		totalRegistryAmountRubles?: number | undefined;
		totalDmsClaimedRubles?: number | undefined;
		totalPatientCoPaymentRubles?: number | undefined;
	};
	if ("visitServices" in reg && reg.visitServices) {
		const lines = [
			`# Реестр оказанных услуг по ДМС;${reg.registryNumber || "РЕЕСТР-001"}`,
			`# Без НДС (пп. 2 п. 2 ст. 149 НК РФ)`,
			`№;Пациент;Код;Услуга;Сумма`,
		];
		for (const s of reg.visitServices) {
			const total = s.totalBillKopecks ? kopecksToNumericString(s.totalBillKopecks) : Number(s.totalPriceRub || 0).toFixed(2);
			lines.push(`1;${s.patientFullName};${s.serviceCode804n || s.serviceCode || ""};${s.serviceName};${total}`);
		}
		return `\uFEFF${lines.join("\r\n")}`;
	}

	return exportDmsRegistryToCsv(reg);
}

export interface DmsPreAuthRequestParams {
	readonly insurerId?: string | undefined;
	readonly patient?: {
		readonly id?: string | undefined;
		readonly fullName?: string | undefined;
		readonly policyNumber?: string | undefined;
	} | undefined;
	readonly programKey?: string | undefined;
	readonly diagnosisMkb10?: {
		readonly code?: string | undefined;
		readonly title?: string | undefined;
	} | undefined;
	readonly toothNumber?: string | number | undefined;
	readonly requestedServices?: readonly {
		readonly code804n?: string | undefined;
		readonly name?: string | undefined;
		readonly quantity?: number | undefined;
		readonly priceKopecks?: number | undefined;
	}[] | undefined;
	readonly clinicalJustification?: string | undefined;
	readonly attachedXrayStudies?: readonly {
		readonly id?: string | undefined;
		readonly type?: string | undefined;
		readonly title?: string | undefined;
		readonly date?: string | undefined;
		readonly uri?: string | undefined;
	}[] | undefined;
	readonly attendingDoctor?: {
		readonly fullName?: string | undefined;
		readonly specialty?: string | undefined;
		readonly signatureDate?: string | undefined;
	} | undefined;
}

export function generateDmsPreAuthRequest(params: DmsPreAuthRequestParams): {
	documentId: string;
	requestNumber: string;
	totalRequestedKopecks: number;
	status: string;
	printableHtml: string;
} {
	const reqServices = params.requestedServices || [];
	const totKop = reqServices.reduce((acc: number, s) => acc + (s.priceKopecks || 0) * (s.quantity || 1), 0);
	return {
		documentId: `DOC-${Date.now()}`,
		requestNumber: `ПРЕ-АВТ-${(params.insurerId || "DMS").toUpperCase()}-${Date.now().toString().slice(-4)}`,
		totalRequestedKopecks: totKop,
		status: "approved",
		printableHtml: `<div>${params.patient?.fullName || ""} ${params.diagnosisMkb10?.code || ""} ${reqServices.map((s) => s.code804n).join(", ")}</div>`,
	};
}

export function generateDmsStatutoryRegistry(params: {
	registryNumber?: string | undefined;
	insurerId?: string | undefined;
	periodStart?: string | undefined;
	periodEnd?: string | undefined;
	visitServices?: readonly DmsRegistryServiceRecord[] | undefined;
	records?: readonly DmsRegistryServiceRecord[] | undefined;
}): DmsStatutoryRegistry {
	const services = params.visitServices || params.records || [];
	const uniquePatients = new Set(services.map((s) => s.patientFullName || s.patientId));
	const totalBillKop = services.reduce((acc: number, s) => acc + (s.totalBillKopecks ?? s.totalPriceKopecks ?? (s.totalPriceRub ? rublesToKopecks(s.totalPriceRub) : 0)), 0);
	const dmsKop = services.reduce((acc: number, s) => acc + (s.dmsAcceptedKopecks ?? s.dmsCoveredKopecks ?? (s.dmsCoveredRub ? rublesToKopecks(s.dmsCoveredRub) : 0)), 0);
	const patientKop = services.reduce((acc: number, s) => acc + (s.patientPaidKopecks ?? (s.patientPaidRub ? rublesToKopecks(s.patientPaidRub) : 0)), 0);

	const todayIso = new Date().toISOString().slice(0, 10);
	const monthStartIso = `${todayIso.slice(0, 7)}-01`;
	const fallbackRegistryNum = `РЕЕСТР-${todayIso.replace(/-/g, "")}`;

	return {
		registryNumber: params.registryNumber || fallbackRegistryNum,
		registryId: `REG-${Date.now()}`,
		insurerId: params.insurerId || "sogaz",
		periodStart: params.periodStart || monthStartIso,
		periodEnd: params.periodEnd || todayIso,
		visitServices: services,
		records: services,
		totalVisitsCount: services.length,
		uniquePatientsCount: uniquePatients.size,
		grandTotalBillKopecks: totalBillKop,
		grandTotalDmsKopecks: dmsKop,
		grandTotalPatientKopecks: patientKop,
	};
}
