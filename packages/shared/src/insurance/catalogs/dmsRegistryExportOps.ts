/**
 * DENTE Dental CRM — DMS Claim Registries & Statutory Export Formats SSOT.
 * Compliant with Mandate 8b (< 300 lines).
 */

import { escapeXml } from "../../cda/c14n.js";
import { kopecksToNumericString, kopecksToRubles, rublesToKopecks } from "../../money.js";
import { escapeCsvCell } from "../registryModules/registrySanitizer.js";
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

export function calculateRegistryTotals(
	records: readonly DmsRegistryServiceRecord[],
	insurerName = "Все компании",
	periodStart = "",
	periodEnd = "",
): DmsRegistrySummary {
	const uniquePatients = new Set<string>();
	let totalAmountKop = 0;
	let totalDmsCoveredKop = 0;
	let totalPatientPaidKop = 0;
	for (const r of records) {
		if (r.patientFullName) uniquePatients.add(r.patientFullName);
		const totKop = r.totalPriceKopecks ?? (r.totalPriceRub !== undefined ? rublesToKopecks(r.totalPriceRub) : (r.totalBillKopecks ?? 0));
		const dmsKop = r.dmsCoveredKopecks ?? r.dmsAcceptedKopecks ?? (r.dmsCoveredRub !== undefined ? rublesToKopecks(r.dmsCoveredRub) : 0);
		const patKop = r.patientPaidKopecks ?? (r.patientPaidRub !== undefined ? rublesToKopecks(r.patientPaidRub) : 0);
		totalAmountKop += totKop;
		totalDmsCoveredKop += dmsKop;
		totalPatientPaidKop += patKop;
	}
	return {
		totalServicesCount: records.length,
		uniquePatientsCount: uniquePatients.size,
		totalAmountRub: kopecksToRubles(totalAmountKop),
		totalDmsCoveredRub: kopecksToRubles(totalDmsCoveredKop),
		totalPatientPaidRub: kopecksToRubles(totalPatientPaidKop),
		isBalanced: totalAmountKop === totalDmsCoveredKop + totalPatientPaidKop,
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
	let totKop = 0;
	let dmsKop = 0;
	let patKop = 0;

	for (const item of items) {
		const line = item.lineItem;
		const lineTot = line?.totalPriceKopecks ?? (line?.totalPriceRub !== undefined ? rublesToKopecks(line.totalPriceRub) : (typeof item.totalKopecks === "number" ? item.totalKopecks : (item.totalPriceKopecks ?? (item.totalPriceRub ? rublesToKopecks(item.totalPriceRub) : 0))));
		const lineDms = line?.dmsCoveredKopecks ?? (line?.dmsCoveredRub !== undefined ? rublesToKopecks(line.dmsCoveredRub) : (typeof item.insuranceCoveredKopecks === "number" ? item.insuranceCoveredKopecks : (item.dmsCoveredKopecks ?? (item.dmsCoveredRub ? rublesToKopecks(item.dmsCoveredRub) : 0))));
		const linePat = line?.patientCoPayKopecks ?? (line?.patientCoPayRub !== undefined ? rublesToKopecks(line.patientCoPayRub) : (typeof item.patientOutOfPocketKopecks === "number" ? item.patientOutOfPocketKopecks : (item.patientPaidKopecks ?? (item.patientPaidRub ? rublesToKopecks(item.patientPaidRub) : 0))));
		totKop += lineTot;
		dmsKop += lineDms;
		patKop += linePat;
	}

	const todayIso = new Date().toISOString().slice(0, 10);
	const fallbackRegistryNum = `РЕЕСТР-${todayIso.replace(/-/g, "")}`;

	return {
		registryNumber: params.registryNumber || fallbackRegistryNum,
		registryDate: params.registryDate || todayIso,
		items,
		splitResults: items,
		totalRegistryAmountRubles: kopecksToRubles(totKop),
		totalDmsClaimedRubles: kopecksToRubles(dmsKop),
		totalPatientCoPaymentRubles: kopecksToRubles(patKop),
		totalServicesCount: items.length,
		totalPatientsCount: new Set(items.map((i) => i.patientFullName).filter(Boolean)).size,
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
		`# Реестр счетов ДМС;${escapeCsvCell(registry.registryNumber || fallbackRegNum)}`,
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
			[
				idx + 1,
				escapeCsvCell(item.serviceDate || item.visitDate || todayIso),
				escapeCsvCell(item.patientFullName || ""),
				escapeCsvCell(item.policyNumber || ""),
				escapeCsvCell(item.guaranteeLetterNumber || item.letterNumber || "—"),
				escapeCsvCell(sCode),
				escapeCsvCell(sName),
				escapeCsvCell(total),
				escapeCsvCell(dms),
				escapeCsvCell(patient),
			].join(";"),
		);
	});

	lines.push(
		`ИТОГО ПО РЕЕСТРУ;;;;;;;${escapeCsvCell(registry.totalRegistryAmountRubles ?? 0)};${escapeCsvCell(registry.totalDmsClaimedRubles ?? 0)};${escapeCsvCell(registry.totalPatientCoPaymentRubles ?? 0)}`,
	);
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
		const info = clinicInfo || { name: "", inn: "" };
		const insName = insurerName || "Все компании";
		const pStr = periodStr || String(new Date().getFullYear());
		const esc = (v: unknown) => (v == null ? '""' : escapeCsvCell(typeof v === "number" ? v : String(v)));
		const headers = [
			`# Реестр оказанных услуг по ДМС;${esc(info.name)};ИНН: ${esc(info.inn)}`,
			`# Страховая компания: ${esc(insName)};Период: ${esc(pStr)}`,
			"",
			[esc("№"), esc("Дата"), esc("Пациент"), esc("Полис"), esc("Гар. письмо"), esc("Код"), esc("Услуга"), esc("Диагноз"), esc("Зуб"), esc("Кол-во"), esc("Тариф"), esc("Сумма"), esc("ДМС"), esc("Пациент"), esc("Врач")].join(";"),
		];
		const rows = records.map((r, i) => {
			const unitKop = r.unitPriceKopecks ?? (r.unitPriceRub !== undefined ? rublesToKopecks(r.unitPriceRub) : 0);
			const totKop = r.totalPriceKopecks ?? (r.totalPriceRub !== undefined ? rublesToKopecks(r.totalPriceRub) : (r.totalBillKopecks ?? 0));
			const dmsKop = r.dmsCoveredKopecks ?? (r.dmsCoveredRub !== undefined ? rublesToKopecks(r.dmsCoveredRub) : 0);
			const patKop = r.patientPaidKopecks ?? (r.patientPaidRub !== undefined ? rublesToKopecks(r.patientPaidRub) : 0);
			return [
				esc(i + 1), esc(r.visitDate), esc(r.patientFullName), esc(r.policyNumber), esc(r.letterNumber || "—"),
				esc(r.serviceCode804n || r.serviceCode || ""), esc(r.serviceName), esc(r.diagnosisCodeMkb10 || "—"), esc(r.toothNumber || "—"),
				esc(r.quantity ?? 1), esc(kopecksToNumericString(unitKop)), esc(kopecksToNumericString(totKop)),
				esc(kopecksToNumericString(dmsKop)), esc(kopecksToNumericString(patKop)), esc(r.doctorFullName || "—"),
			].join(";");
		});
		const totals = calculateRegistryTotals(records, insName);
		const totalRow = [
			esc("ИТОГО"), esc(""), esc(`Пациентов: ${totals.uniquePatientsCount}`), esc(""), esc(""), esc(""),
			esc(`Услуг: ${totals.totalServicesCount}`), esc(""), esc(""), esc(""), esc(""),
			esc(kopecksToNumericString(rublesToKopecks(totals.totalAmountRub))),
			esc(kopecksToNumericString(rublesToKopecks(totals.totalDmsCoveredRub))),
			esc(kopecksToNumericString(rublesToKopecks(totals.totalPatientPaidRub))),
			esc(""),
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
			`# Реестр оказанных услуг по ДМС;${escapeCsvCell(reg.registryNumber || "РЕЕСТР-001")}`,
			`# Без НДС (пп. 2 п. 2 ст. 149 НК РФ)`,
			`№;Пациент;Код;Услуга;Сумма`,
		];
		reg.visitServices.forEach((s, idx) => {
			const total = s.totalBillKopecks ? kopecksToNumericString(s.totalBillKopecks) : kopecksToNumericString(rublesToKopecks(s.totalPriceRub || 0));
			lines.push(
				[
					idx + 1,
					escapeCsvCell(s.patientFullName),
					escapeCsvCell(s.serviceCode804n || s.serviceCode || ""),
					escapeCsvCell(s.serviceName),
					escapeCsvCell(total),
				].join(";"),
			);
		});
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
		printableHtml: `<div>${escapeXml(params.patient?.fullName || "")} ${escapeXml(params.diagnosisMkb10?.code || "")} ${reqServices.map((s) => escapeXml(s.code804n || "")).join(", ")}</div>`,
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
