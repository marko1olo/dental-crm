import type {
	ClinicalToothRowInput,
	DentalFormulaRecordInput,
	ToothStateData,
} from "./formulaTypes.js";

interface GenericToothRow {
	readonly toothOrArea?: unknown;
	readonly toothNumber?: unknown;
	readonly status?: unknown;
	readonly diagnosisOrFinding?: unknown;
	readonly statusCode?: unknown;
	readonly diagnosisText?: unknown;
}

/**
 * Преобразует произвольный ввод данных зубной формулы в унифицированную карту зубов Map<number, ToothStateData>.
 */
export function extractTeethMapFromInput(
	input?:
		| Record<string | number, ToothStateData | string | Record<string, unknown>>
		| Array<ClinicalToothRowInput>
		| readonly Record<string, unknown>[]
		| DentalFormulaRecordInput
		| null
		| undefined,
): Map<number, ToothStateData> {
	const map = new Map<number, ToothStateData>();
	if (!input) return map;

	// Если передан массив строк
	if (Array.isArray(input)) {
		for (const row of input) {
			const item = row as GenericToothRow;
			const toothNum =
				typeof item.toothOrArea === "string"
					? Number.parseInt(item.toothOrArea, 10)
					: typeof item.toothNumber === "number" || typeof item.toothNumber === "string"
						? Number(item.toothNumber)
						: Number.NaN;
			if (Number.isFinite(toothNum)) {
				const status =
					typeof item.status === "string" && item.status
						? item.status
						: typeof item.diagnosisOrFinding === "string" && item.diagnosisOrFinding
							? item.diagnosisOrFinding
							: "sound";
				const statusCode =
					typeof item.statusCode === "string" && item.statusCode
						? item.statusCode
						: undefined;
				const diagnosisText =
					typeof item.diagnosisOrFinding === "string" && item.diagnosisOrFinding
						? item.diagnosisOrFinding
						: typeof item.diagnosisText === "string" && item.diagnosisText
							? item.diagnosisText
							: undefined;

				map.set(toothNum, {
					toothNumber: toothNum,
					status,
					statusCode,
					diagnosisText,
				});
			}
		}
		return map;
	}

	// Если передан объект с полем teeth
	if (typeof input === "object" && input !== null) {
		const obj = input as Record<string, unknown>;
		if (Array.isArray(obj.teeth)) {
			for (const t of obj.teeth as Array<Record<string, unknown>>) {
				const toothNum = Number(t.toothNumber ?? t.tooth ?? t.toothOrArea);
				if (Number.isFinite(toothNum)) {
					map.set(toothNum, {
						toothNumber: toothNum,
						status: String(t.status ?? t.state ?? "sound"),
						statusCode: t.statusCode ? String(t.statusCode) : undefined,
						diagnosisText: t.diagnosisText ? String(t.diagnosisText) : undefined,
					});
				}
			}
			return map;
		}

		// Иначе объект ключей 11..48: status
		for (const [key, val] of Object.entries(obj)) {
			const toothNum = Number.parseInt(key, 10);
			if (Number.isFinite(toothNum)) {
				if (typeof val === "string") {
					map.set(toothNum, {
						toothNumber: toothNum,
						status: val,
						statusCode: val,
					});
				} else if (typeof val === "object" && val !== null) {
					const tObj = val as Record<string, unknown>;
					map.set(toothNum, {
						toothNumber: toothNum,
						status: String(tObj.status ?? tObj.state ?? "sound"),
						statusCode: tObj.statusCode ? String(tObj.statusCode) : undefined,
						diagnosisText: tObj.diagnosisText ? String(tObj.diagnosisText) : undefined,
					});
				}
			}
		}
	}

	return map;
}
