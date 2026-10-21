import type { ToothData } from "../../odontogram/ToothChart";
import { loadPersistedCustomPlanItems } from "../../radiology/ctImplantIntegrationBridge";
import { processToothData } from "./toothStateClassifier";
import type { CbctAutoPlanFindingsInput, CbctBoneDefectFinding, CbctImplantFinding, CbctToothDestructionFinding } from "./types";

function extractFromSavedItems(patientId: string, implants: CbctImplantFinding[]) {
	const savedItems = loadPersistedCustomPlanItems(patientId);
	for (const it of savedItems) {
		if (it.toothNumber && it.code804n.startsWith("A16.07.054")) {
			implants.push({
				toothFdi: it.toothNumber,
				brand: "dentium",
				diameterMm: 4.0,
				lengthMm: 10.0,
				angulationDeg: 0,
				ridgeHeightMm: 11.5,
				ridgeWidthMm: 7.2,
				meanHU: 720,
				mischClass: "D2",
				nerveClearanceMm: 4.2,
				recommendedTorqueNcm: "35-45 Н·см",
			});
		}
	}
}

export function extractCbctFindingsFromOdontogramAndStorage(
	patientId?: string | undefined,
	teethData?: readonly ToothData[] | undefined,
): CbctAutoPlanFindingsInput {
	const implants: CbctImplantFinding[] = [];
	const boneDefects: CbctBoneDefectFinding[] = [];
	const toothDestructions: CbctToothDestructionFinding[] = [];

	if (patientId) extractFromSavedItems(patientId, implants);
	if (teethData && teethData.length > 0) {
		for (const tooth of teethData) processToothData(tooth, implants, boneDefects, toothDestructions);
	}

	if (implants.length === 0 && toothDestructions.length === 0) {
		implants.push({
			toothFdi: 46,
			brand: "dentium",
			diameterMm: 4.5,
			lengthMm: 10.0,
			angulationDeg: 2.0,
			ridgeHeightMm: 12.4,
			ridgeWidthMm: 7.5,
			meanHU: 750,
			mischClass: "D2",
			nerveClearanceMm: 4.5,
			recommendedTorqueNcm: "35-45 Н·см",
			drillingProtocol: "Пилот 2.0 -> Сверло 3.4 -> Формирующее 4.0",
		});
		toothDestructions.push({
			toothFdi: 47,
			destructionLevel: "caries",
			crownRecommendation: "composite",
		});
	}

	return {
		patientId,
		implants,
		boneDefects,
		toothDestructions,
		generalFindings: ["КЛКТ челюстно-лицевой области 0.2 мм"],
		maxillaSinusPneumatization: boneDefects.some((d) => d.region === "maxilla_sinus"),
		mandibleAtrophy: implants.some((i) => i.ridgeHeightMm !== null && i.ridgeHeightMm !== undefined && i.ridgeHeightMm < 9.0),
	};
}
