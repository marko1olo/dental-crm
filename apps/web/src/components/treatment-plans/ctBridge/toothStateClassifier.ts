import type { ToothData } from "../../odontogram/ToothChart";
import type { CbctBoneDefectFinding, CbctImplantFinding, CbctToothDestructionFinding } from "./types";

export function processToothData(
	tooth: ToothData,
	implants: CbctImplantFinding[],
	boneDefects: CbctBoneDefectFinding[],
	toothDestructions: CbctToothDestructionFinding[],
) {
	const rawNum = tooth.toothNumber ?? (typeof (tooth as any).id === "number" ? (tooth as any).id : Number.parseInt(String((tooth as any).id), 10));
	if (!rawNum || Number.isNaN(rawNum)) return;
	const num = rawNum;
	const state = ((tooth as any).state || (tooth as any).status || "").toLowerCase();

	if (state.includes("implant") || state.includes("planned_implant")) {
		if (!implants.some((i) => i.toothFdi === num)) {
			implants.push({
				toothFdi: num,
				brand: num === 46 || num === 48 ? "dentium" : "osstem",
				diameterMm: num % 10 >= 6 ? 4.5 : 4.0,
				lengthMm: 10.0,
				angulationDeg: 0,
				ridgeHeightMm: num === 48 ? 10.2 : 12.0,
				ridgeWidthMm: 6.8,
				meanHU: 680,
				mischClass: "D2",
				nerveClearanceMm: num >= 44 && num <= 48 ? 3.5 : null,
				recommendedTorqueNcm: ">= 35 Н·см",
				needsSinusLift: [15, 16, 17, 25, 26, 27].includes(num),
			});
		}
	} else if (state.includes("missing") || state.includes("absent")) {
		if (!implants.some((i) => i.toothFdi === num)) {
			const isUpperMolar = [14, 15, 16, 17, 24, 25, 26, 27].includes(num);
			implants.push({
				toothFdi: num,
				brand: "dentium",
				diameterMm: num % 10 >= 6 ? 4.5 : 4.0,
				lengthMm: 10.0,
				ridgeHeightMm: isUpperMolar ? 6.5 : 11.0,
				ridgeWidthMm: 6.5,
				mischClass: isUpperMolar ? "D3" : "D2",
				needsSinusLift: isUpperMolar,
				sinusLiftType: isUpperMolar ? "closed" : undefined,
				nerveClearanceMm: num >= 45 && num <= 48 ? 3.8 : null,
			});
			if (isUpperMolar) {
				boneDefects.push({
					toothFdi: num,
					region: "maxilla_sinus",
					defectType: "sinus_pneumatization",
					residualHeightMm: 6.5,
					recommendedAugmentation: "closed_sinus_lift",
					notes: `Пневматизация синуса в проекции зуба #${num}`,
				});
			}
		}
	} else if (state.includes("pulpitis") || state.includes("periodontitis") || state.includes("caries")) {
		toothDestructions.push({
			toothFdi: num,
			destructionLevel: state.includes("periodontitis") ? "periodontitis_periapical" : state.includes("pulpitis") ? "pulpitis" : "caries",
			rootCanalCount: num % 10 >= 6 ? 3 : num % 10 >= 4 ? 2 : 1,
			crownRecommendation: num % 10 >= 4 ? "zirconia" : "composite",
		});
	} else if (state.includes("root") || state.includes("fracture") || state.includes("hopeless")) {
		toothDestructions.push({
			toothFdi: num,
			destructionLevel: "subgingival_fracture_hopeless",
			isHopelessForExtraction: true,
			crownRecommendation: "zirconia",
		});
	}
}
