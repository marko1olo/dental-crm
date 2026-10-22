import type { CbctAutoPlanFindingsInput } from "../../ctImplantIntegrationBridge";

export const sampleCbctInput: CbctAutoPlanFindingsInput = {
	patientId: "PAT-CBCT-001",
	patientName: "Алексей Иванов",
	implants: [
		{
			toothFdi: 46,
			brand: "dentium",
			diameterMm: 4.5,
			lengthMm: 10.0,
			ridgeHeightMm: 12.0,
			ridgeWidthMm: 7.5,
			meanHU: 750,
			mischClass: "D2",
			nerveClearanceMm: 4.5,
		},
		{
			toothFdi: 16,
			brand: "dentium",
			diameterMm: 4.5,
			lengthMm: 10.0,
			ridgeHeightMm: 6.0,
			ridgeWidthMm: 7.0,
			needsSinusLift: true,
			sinusLiftType: "closed",
		},
	],
	boneDefects: [
		{
			toothFdi: 16,
			region: "maxilla_sinus",
			defectType: "sinus_pneumatization",
			residualHeightMm: 6.0,
			recommendedAugmentation: "closed_sinus_lift",
		},
	],
	toothDestructions: [
		{
			toothFdi: 47,
			destructionLevel: "periodontitis_periapical",
			rootCanalCount: 3,
			crownRecommendation: "zirconia",
		},
		{
			toothFdi: 38,
			destructionLevel: "subgingival_fracture_hopeless",
			isHopelessForExtraction: true,
		},
	],
};
