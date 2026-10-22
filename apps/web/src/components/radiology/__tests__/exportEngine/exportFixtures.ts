import {
	analyzeMischBoneQuality,
	computeHUZoneProfile,
} from "../../boneDensityMischMath";
import {
	findImplantSpec,
	type CrossSectionImplantPose,
	type AlveolarContainmentResult,
	type NerveSafetyAuditResult,
} from "../../implantSafetyEngine";

export function createExportEngineFixtures() {
	const mockSpec = findImplantSpec("osstem", 4.0, 10.0);

	const mockPose: CrossSectionImplantPose = {
		entryPoint: { x: 0, y: 2.0 },
		angulationDeg: 3.5,
		implantSpec: mockSpec,
		targetToothFdi: 46,
	};

	const mockHuSampling = computeHUZoneProfile(1150, 720, 950);
	const mockMischResult = analyzeMischBoneQuality(mockHuSampling, 4.0);

	const mockContainment: AlveolarContainmentResult = {
		residualBuccalBoneMm: 2.1,
		residualLingualBoneMm: 2.4,
		isBuccalBoneAdequate: true,
		isLingualBoneAdequate: true,
		isApexContained: true,
		requiresGbrAugmentation: false,
	};

	const mockNerveSafety: NerveSafetyAuditResult = {
		distanceToCanalCenterMm: 5.4,
		netClearanceToCanalWallMm: 4.0,
		netClearanceToSafetyCorridorMm: 2.0,
		safetyStatus: "safe",
		isDangerous: false,
		isWarning: false,
		shouldTriggerAudioAlarm: false,
		closestImplantPoint: { x: 0, y: 12.0 },
		closestNervePoint: { x: 2.0, y: 16.5 },
		clinicalMessageRu: "Безопасный отступ до нижнечелюстного канала (4.0 мм)",
	};

	return {
		mockSpec,
		mockPose,
		mockHuSampling,
		mockMischResult,
		mockContainment,
		mockNerveSafety,
	};
}
