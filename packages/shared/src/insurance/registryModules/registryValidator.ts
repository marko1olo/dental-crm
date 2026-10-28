import type { DmsRegistryData } from "./registryTypes.js";
import { dmsRegistryDataSchema } from "./registrySchemas.js";

export interface RegistryValidationIssue {
	field: string;
	message: string;
}

export function validateRegistryData(data: DmsRegistryData): { isValid: boolean; issues: RegistryValidationIssue[] } {
	const issues: RegistryValidationIssue[] = [];
	const parseResult = dmsRegistryDataSchema.safeParse(data);

	if (!parseResult.success) {
		for (const err of parseResult.error.issues) {
			issues.push({ field: err.path.join("."), message: err.message });
		}
	}

	if (data.periodStart > data.periodEnd) {
		issues.push({
			field: "periodStart",
			message: `Дата начала периода (${data.periodStart}) не может быть позже окончания (${data.periodEnd})`,
		});
	}

	if (data.records.length === 0) {
		issues.push({ field: "records", message: "Реестр не содержит записей об оказанных услугах" });
	}

	return { isValid: issues.length === 0, issues };
}

export function assertValidRegistryData(data: DmsRegistryData): void {
	const result = validateRegistryData(data);
	if (!result.isValid) {
		const msg = result.issues.map((i) => `[${i.field}] ${i.message}`).join("; ");
		throw new Error(`Ошибка валидации реестра ДМС: ${msg}`);
	}
}
