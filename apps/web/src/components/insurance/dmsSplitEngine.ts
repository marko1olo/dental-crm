/**
 * dmsSplitEngine.ts — Re-export facade from dmsCatalogData SSOT with reconciliation registry helpers.
 */

import {
	calculateDmsCoPaymentSplit,
	exportRegistryToCsv,
	kopecksToRub,
	rubToKopecks,
	type DmsBillableItem,
	type DmsGuaranteeLetter,
	type DmsSplitCalculationResult,
} from "./dmsCatalogData.js";

export * from "./dmsCatalogData.js";

export function buildDmsReconciliationRegistry(params: any): any {
	const items = params.splitResults || params.items || [];
	let totRub = 0;
	let dmsRub = 0;
	let patRub = 0;

	for (const item of items) {
		const line = item.lineItem || item;
		totRub += line.totalRubles ?? (line.totalKopecks ? kopecksToRub(line.totalKopecks) : 0);
		dmsRub += line.insuranceCoveredRubles ?? (line.insuranceCoveredKopecks ? kopecksToRub(line.insuranceCoveredKopecks) : 0);
		patRub += line.patientOutOfPocketRubles ?? (line.patientOutOfPocketKopecks ? kopecksToRub(line.patientOutOfPocketKopecks) : 0);
	}

	return {
		registryNumber: params.registryNumber || "РЕЕСТР-001",
		registryDate: params.registryDate || "2026-08-22",
		items,
		splitResults: items,
		totalRegistryAmountRubles: totRub,
		totalDmsClaimedRubles: dmsRub,
		totalPatientCoPaymentRubles: patRub,
		totalServicesCount: items.length,
		totalPatientsCount: new Set(items.map((i: any) => i.patientFullName)).size || 1,
	};
}

export function exportDmsRegistryToCsv(registry: any): string {
	const items = registry.splitResults || registry.items || [];
	const lines = [
		`# Реестр счетов ДМС;${registry.registryNumber}`,
		`№ п/п;Дата услуги;Ф.И.О. пациента;Номер полиса;Номер гарантийного письма;Код услуги;Наименование;Сумма;Покрыто ДМС;Доплата пациента`,
	];

	items.forEach((item: any, idx: number) => {
		const l = item.lineItem || item;
		lines.push(
			`${idx + 1};${item.serviceDate || "2026-08-10"};${item.patientFullName || ""};${item.policyNumber || ""};${item.guaranteeLetterNumber || "—"};${l.serviceCode || ""};${l.serviceName || ""};${l.totalKopecks / 100};${l.insuranceCoveredKopecks / 100};${l.patientOutOfPocketKopecks / 100}`,
		);
	});

	lines.push(`ИТОГО ПО РЕЕСТРУ;;;;;;;${registry.totalRegistryAmountRubles};${registry.totalDmsClaimedRubles};${registry.totalPatientCoPaymentRubles}`);
	return `\uFEFF${lines.join("\r\n")}`;
}
