import {
	buildPatientClinicalSnapshot,
	createPatientBranchTransferConsent,
	type PatientClinicalSnapshot,
} from "../branchTransferEngine.js";

export function createTestSnapshot(overrides: Partial<Parameters<typeof buildPatientClinicalSnapshot>[0]> = {}): PatientClinicalSnapshot {
	const consent = createPatientBranchTransferConsent({
		patientId: "PAT-TEST-001",
		patientFullName: "Смирнова Елена Васильевна",
		patientPassportOrId: "45 12 987654",
		sourceBranchId: "branch-central",
		targetBranchId: "branch-west",
		transferPurposeRu: "Переезд в Западный округ, продолжение ортодонтического лечения",
		operatorFullName: "Волкова М. А.",
		operatorPosition: "Старший администратор",
		signatureType: "simple_electronic_signature_sms",
	});

	return buildPatientClinicalSnapshot({
		sourceBranchId: "branch-central",
		targetBranchId: "branch-west",
		demographics: {
			fullName: "Смирнова Елена Васильевна",
			birthDate: "1988-04-12",
			gender: "female",
			phone: "+7 (926) 123-45-67",
			snils: "123-456-789 00",
			taxpayerInn: "771234567890",
			identityDocument: "Паспорт РФ 45 12 987654",
		},
		somaticAnamnesis: {
			allergies: ["Лидокаин"],
			chronicDiseases: ["Гипертоническая болезнь I ст."],
			isPregnantOrLactating: false,
			contraindications: ["Амидные анестетики с адреналином 1:100000"],
		},
		odontogramTeeth: {
			16: { fdi: 16, state: "caries", surface: "MOD" },
			26: { fdi: 26, state: "filled" },
			36: { fdi: 36, state: "implant" },
		},
		visitDiaries: [
			{
				id: "vis-001",
				dateIso: "2026-08-15T10:00:00Z",
				doctorFullName: "Кузнецов И. В.",
				diagnosisIcd10: "K02.1 Кариес дентина",
				complaints: "Кратковременная боль от сладкого в области 16 зуба",
				objectiveStatus: "Глубокая кариозная полость на окклюзионной поверхности 16 зуба",
				therapyProtocol: "Препарирование, медобработка 2% хлоргексидином, пломба Estelite Asteria A3",
				recommendations: "Контрольный осмотр через 6 месяцев",
			},
		],
		treatmentPlans: [
			{
				id: "plan-001",
				title: "Комплексная ортодонтическая реабилитация",
				totalCostRub: 185000,
				status: "active",
				itemsCount: 12,
			},
		],
		balanceRub: 15400,
		balanceKopecks: 1540000,
		consent152Fz: consent,
		selectedComponents: {
			demographics: true,
			somaticAnamnesis: true,
			odontogram043u: true,
			visitDiaries: true,
			treatmentPlans: true,
			imagingArchive: true,
			depositBalance: true,
			activeLabOrders: true,
		},
		transferReasonRu: "Переезд в Западный округ, продолжение лечения",
		staffName: "Волкова М. А.",
		staffPosition: "Старший администратор",
		...overrides,
	});
}
