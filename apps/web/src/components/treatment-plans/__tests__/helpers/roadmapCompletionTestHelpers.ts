import type { RoadmapStageData } from "../../TreatmentPlanRoadmap";

export const sampleProcedures = [
	{
		id: "proc-1",
		code804n: "A16.07.002",
		medicalTitleRu: "Лечение кариеса 16",
		patientFriendlyTitleRu: "Лечение кариеса с анатомической реставрацией",
		toothNumber: 16,
		priceRub: 5000,
		priceKopecks: 500000,
		quantity: 1,
		isCompleted: true,
	},
	{
		id: "proc-2",
		code804n: "A16.07.030",
		medicalTitleRu: "Эндодонтия 16",
		patientFriendlyTitleRu: "Лечение корневых каналов под микроскопом",
		toothNumber: 16,
		priceRub: 6000,
		priceKopecks: 600000,
		quantity: 1,
		isCompleted: true,
	},
];

export const sampleCompletedStage: RoadmapStageData = {
	stageNumber: 2,
	stageKind: "stage_2_therapy",
	titleRu: "Этап 2: Терапевтическая санация",
	subtitleRu: "Лечение кариеса и корневых каналов",
	patientGoalRu: "Ликвидация кариеса и инфекции",
	timelineRu: "1 визит • 1.5 часа",
	preparationRu: "Поесть за 2 часа",
	warrantyRu: "Гарантия 2 года",
	status: "completed",
	teethFdiList: ["16"],
	procedures: sampleProcedures,
	totalRub: 11000,
	totalKopecks: 1100000,
	completedRub: 11000,
	completedKopecks: 1100000,
	remainingRub: 0,
	remainingKopecks: 0,
	estimatedVisitsCount: 1,
};
