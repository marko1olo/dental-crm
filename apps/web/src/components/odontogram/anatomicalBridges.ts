/**
 * DENTE Dental CRM — Fixed Dental Bridge Detection & Span Analytics
 */

import type { ToothData } from "./ToothChart";
import type { BridgeSpanInfo } from "./anatomicalGeometriesTypes";

export function isToothAbutment(tooth?: ToothData | null): boolean {
	if (!tooth) return false;
	if (tooth.bridgeRole === "pillar") return true;
	if (tooth.state === "Crown") return true;
	const cData = tooth.clinicalData as Record<string, unknown> | undefined;
	if (
		cData &&
		(cData.isAbutment === true ||
			cData.prostheticType === "bridge_abutment" ||
			cData.statusCode === "bridge_abutment")
	) {
		return true;
	}
	const notes = tooth.notes?.toLowerCase() ?? "";
	return notes.includes("опор") || notes.includes("abutment");
}

export function isToothPontic(tooth?: ToothData | null): boolean {
	if (!tooth) return false;
	if (tooth.bridgeRole === "pontic") return true;
	const cData = tooth.clinicalData as Record<string, unknown> | undefined;
	if (
		cData &&
		(cData.isPontic === true ||
			cData.prostheticType === "bridge_pontic" ||
			cData.statusCode === "bridge_pontic")
	) {
		return true;
	}
	const notes = tooth.notes?.toLowerCase() ?? "";
	if (
		notes.includes("фасет") ||
		notes.includes("pontic") ||
		notes.includes("тело мост") ||
		notes.includes("промежуточн")
	) {
		return true;
	}
	return tooth.state === "Missing";
}

/**
 * Автоматическое определение непрерывных блоков мостовидных протезов в зубной дуге.
 */
export function detectBridgeSpans(
	archTeeth: readonly number[],
	teethData: readonly ToothData[],
): BridgeSpanInfo[] {
	if (!archTeeth || archTeeth.length < 2) return [];
	const dataMap = new Map<number, ToothData>();
	for (const t of teethData) {
		dataMap.set(t.toothNumber, t);
	}

	const spans: BridgeSpanInfo[] = [];
	let i = 0;

	while (i < archTeeth.length) {
		const startToothNum = archTeeth[i];
		if (!startToothNum) {
			i++;
			continue;
		}
		const startTooth = dataMap.get(startToothNum);

		if (isToothAbutment(startTooth)) {
			let j = i + 1;
			const candidatePontics: number[] = [];
			const candidateAbutments: number[] = [startToothNum];

			while (j < archTeeth.length) {
				const curNum = archTeeth[j];
				if (!curNum) {
					j++;
					continue;
				}
				const curTooth = dataMap.get(curNum);

				if (isToothAbutment(curTooth)) {
					candidateAbutments.push(curNum);
					if (candidatePontics.length > 0) {
						const allTeethInSpan = [
							...candidateAbutments.slice(0, 1),
							...candidatePontics,
							...candidateAbutments.slice(1),
						];
						const arch = archTeeth[0] && archTeeth[0] <= 28 ? "upper" : "lower";
						const startT = allTeethInSpan[0]!;
						const endT = allTeethInSpan[allTeethInSpan.length - 1]!;
						const primaryAbutment = dataMap.get(startT);
						const material = primaryAbutment?.material ?? "zirconia";

						spans.push({
							id: `bridge-${startT}-${endT}`,
							arch,
							material,
							teeth: allTeethInSpan,
							abutments: [...candidateAbutments],
							pontics: [...candidatePontics],
							startTooth: startT,
							endTooth: endT,
						});

						i = j;
						break;
					}
					candidateAbutments.length = 0;
					candidateAbutments.push(curNum);
				} else if (isToothPontic(curTooth)) {
					candidatePontics.push(curNum);
				} else {
					break;
				}
				j++;
			}

			if (j >= archTeeth.length || candidatePontics.length === 0) {
				i++;
			}
		} else {
			i++;
		}
	}

	return spans;
}

export function getBridgeSpanForTooth(
	toothNumber: number,
	spans: readonly BridgeSpanInfo[],
): BridgeSpanInfo | undefined {
	return spans.find((s) => s.teeth.includes(toothNumber));
}

export function isToothPonticInBridge(
	toothNumber: number,
	spans: readonly BridgeSpanInfo[],
): boolean {
	return spans.some((s) => s.pontics.includes(toothNumber));
}
