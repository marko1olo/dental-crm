import type {
	ClinicalToothRowInput,
	GraphicalDentalFormulaOptions,
	ToothStateData,
} from "./formulaTypes.js";

/**
 * Собирает объединенную карту состояний зубов из различных форматов входных данных.
 */
export function buildConsolidatedTeethMap(options: GraphicalDentalFormulaOptions): Map<number, ToothStateData> {
	const map = new Map<number, ToothStateData>();

	// 1. Из toothStateMap
	if (options.toothStateMap) {
		for (const [key, val] of Object.entries(options.toothStateMap)) {
			const n = Number(key);
			if (n) map.set(n, val);
		}
	}

	// 2. Из dentalFormula
	if (options.dentalFormula) {
		const df = options.dentalFormula;
		if (Array.isArray(df.teeth)) {
			for (const t of df.teeth) {
				if (t && typeof t === "object") {
					const tObj = t as Record<string, unknown>;
					const n = Number(tObj.toothNumber);
					if (n) {
						map.set(n, {
							toothNumber: n,
							status: typeof tObj.status === "string" ? tObj.status : (typeof tObj.condition === "string" ? tObj.condition : "sound"),
							statusCode: typeof tObj.statusCode === "string" ? tObj.statusCode : (typeof tObj.code === "string" ? tObj.code : "H"),
							diagnosisText: typeof tObj.diagnosis === "string" ? tObj.diagnosis : (typeof tObj.diagnosisText === "string" ? tObj.diagnosisText : undefined),
							mobilityGrade: typeof tObj.mobilityGrade === "string" ? tObj.mobilityGrade : (typeof tObj.mobility === "string" ? tObj.mobility : undefined),
						});
					}
				}
			}
		} else if (typeof df === "object") {
			for (const [key, val] of Object.entries(df)) {
				const n = Number(key);
				if (n) {
					if (typeof val === "string") {
						map.set(n, {
							toothNumber: n,
							status: val,
							statusCode: val,
						});
					} else if (typeof val === "object" && val !== null) {
						const tVal = val as Record<string, unknown>;
						map.set(n, {
							toothNumber: n,
							status: typeof tVal.status === "string" ? tVal.status : (typeof tVal.condition === "string" ? tVal.condition : "sound"),
							statusCode: typeof tVal.statusCode === "string" ? tVal.statusCode : (typeof tVal.code === "string" ? tVal.code : "H"),
							diagnosisText: typeof tVal.diagnosisText === "string" ? tVal.diagnosisText : (typeof tVal.diagnosis === "string" ? tVal.diagnosis : undefined),
						});
					}
				}
			}
		}
	}

	// 3. Из clinicalToothRows
	if (Array.isArray(options.clinicalToothRows)) {
		for (const rawRow of options.clinicalToothRows) {
			if (rawRow && typeof rawRow === "object") {
				const row = rawRow as ClinicalToothRowInput;
				const n = Number(row.toothOrArea);
				if (n) {
					const existing = map.get(n);
					map.set(n, {
						toothNumber: n,
						status: row.status || existing?.status || "sound",
						statusCode: existing?.statusCode,
						surfaces: Array.isArray(row.surfaces) ? row.surfaces : existing?.surfaces,
						diagnosisText: row.diagnosisOrFinding || existing?.diagnosisText,
						plannedAction: row.plannedAction || existing?.plannedAction,
					});
				}
			}
		}
	}

	return map;
}
