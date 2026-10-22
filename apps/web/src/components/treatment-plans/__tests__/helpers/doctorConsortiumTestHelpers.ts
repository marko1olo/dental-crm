import type {
	TreatmentPlanDoctorOption,
	TreatmentPlanItem,
	TreatmentPlanStage,
} from "../../types";

export const mockDoctorsConsortium: readonly TreatmentPlanDoctorOption[] = [
	{ id: "doc-therapist-1", fullName: "Д-р Смирнова Е.А.", role: "doctor", specialty: "Терапевт" },
	{ id: "doc-surgeon-1", fullName: "Д-р Барабаш С.В.", role: "doctor", specialty: "Хирург-имплантолог" },
	{ id: "doc-orthopedist-1", fullName: "Д-р Ковалев В.Н.", role: "doctor", specialty: "Ортопед" },
];

export const mockItemWithDoctorConsortium: TreatmentPlanItem = {
	id: "item-therapy-01",
	toothNumber: 16,
	code804n: "A16.07.002",
	name: "Лечение кариеса 1.6",
	category: "Терапия",
	priceRub: 5500,
	unitPriceRub: 5500,
	discountRub: 500,
	quantity: 1,
	stageKind: "stage_1_therapy",
	phase: 1,
	doctorId: "doc-therapist-1",
	doctorName: "Д-р Смирнова Е.А.",
	doctorSpecialty: "Терапевт",
};

export const mockItemWithoutDoctorConsortium: TreatmentPlanItem = {
	id: "item-surgery-01",
	toothNumber: 46,
	code804n: "A16.07.006",
	name: "Установка дентального имплантата 4.6",
	category: "Хирургия",
	priceRub: 35000,
	unitPriceRub: 35000,
	discountRub: 0,
	quantity: 1,
	stageKind: "stage_2_surgery",
	phase: 2,
};
