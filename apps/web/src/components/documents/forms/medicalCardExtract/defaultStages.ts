import type { MedicalExtractTreatmentStage } from "@dental/shared";

export function getDefaultDemoStages(doctorFullName: string): MedicalExtractTreatmentStage[] {
	return [
		{
			treatmentDate: "2026-08-10",
			toothOrAnatomicalArea: "26",
			diagnosisIcd10: "K04.0",
			diagnosisText: "Пульпит",
			performedIntervention: "Анестезия Ubistesin 1.7 мл, экстирпация пульпы, медикаментозная обработка 3 каналов, временная обтурация гидроксидом кальция",
			anesthesiaUsed: "Ubistesin 4% 1.7 мл",
			attendingDoctorFullName: doctorFullName,
		},
		{
			treatmentDate: "2026-08-17",
			toothOrAnatomicalArea: "26",
			diagnosisIcd10: "K04.0",
			diagnosisText: "Пульпит",
			performedIntervention: "Постоянная обтурация корневых каналов методом латеральной компакции гуттаперчи с силером AH-Plus, реставрация коронковой части светоотверждаемым композитом",
			attendingDoctorFullName: doctorFullName,
		},
	];
}
