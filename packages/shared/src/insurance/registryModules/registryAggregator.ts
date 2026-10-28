import type { DmsRegistryData, DmsRegistryRecord, DmsRegistryClinicInfo, DmsRegistryInsuranceCompanyInfo } from "./registryTypes.js";

export interface AggregateRegistryInput {
	registryNumber: string;
	registryDate: string;
	periodStart: string;
	periodEnd: string;
	clinic: DmsRegistryClinicInfo;
	insuranceCompany: DmsRegistryInsuranceCompanyInfo;
	records: DmsRegistryRecord[];
}

export function buildDmsRegistryData(input: AggregateRegistryInput): DmsRegistryData {
	const sortedRecords = [...input.records].sort((a, b) => {
		if (a.serviceDate !== b.serviceDate) {
			return a.serviceDate.localeCompare(b.serviceDate);
		}
		return a.patientFullName.localeCompare(b.patientFullName, "ru");
	});

	return {
		registryNumber: input.registryNumber.trim(),
		registryDate: input.registryDate.slice(0, 10),
		periodStart: input.periodStart.slice(0, 10),
		periodEnd: input.periodEnd.slice(0, 10),
		clinic: input.clinic,
		insuranceCompany: input.insuranceCompany,
		records: sortedRecords,
	};
}

export function filterRegistryRecordsByPeriod(
	records: readonly DmsRegistryRecord[],
	periodStart: string,
	periodEnd: string,
): DmsRegistryRecord[] {
	return records.filter((r) => r.serviceDate >= periodStart && r.serviceDate <= periodEnd);
}

export function groupRecordsByPatient(
	records: readonly DmsRegistryRecord[],
): Map<string, DmsRegistryRecord[]> {
	const map = new Map<string, DmsRegistryRecord[]>();
	for (const r of records) {
		const key = `${r.patientFullName.trim()}|${r.policyNumber.trim()}`;
		const list = map.get(key) ?? [];
		list.push(r);
		map.set(key, list);
	}
	return map;
}
