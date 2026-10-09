import type { DentalSpecialty } from "@dental/shared";
import { specialtyLabels } from "../../../workspaceUiLabels";
import type { ScheduleChair } from "./types";

export const DEFAULT_CLINIC_CHAIRS: readonly ScheduleChair[] = [
	{ id: "chair-1", name: "Кресло 1", specialization: "therapist", room: "Каб. 1 (Терапия)", active: true },
	{ id: "chair-2", name: "Кресло 2", specialization: "surgeon", room: "Каб. 2 (Хирургия)", active: true },
	{ id: "chair-3", name: "Кресло 3", specialization: "orthodontist", room: "Каб. 3 (Ортодонтия)", active: true },
];

export function formatChairSpecialtyLabel(rawSpec?: string | null): string | null {
	if (!rawSpec) return null;
	const lower = rawSpec.toLowerCase().trim();
	if (lower === "surgeon" || lower === "хирург" || lower === "хирургия") return "Хирургия";
	if (lower === "therapist" || lower === "терапевт" || lower === "терапия") return "Терапия";
	if (lower === "orthodontist" || lower === "ортодонт" || lower === "ортодонтия") return "Ортодонтия";
	if (lower === "orthopedist" || lower === "ортопед" || lower === "ортопедия") return "Ортопедия";
	if (lower === "periodontist" || lower === "пародонтолог" || lower === "пародонтология") return "Пародонт.";
	if (lower === "hygienist" || lower === "гигиенист" || lower === "гигиена") return "Гигиена";
	if (lower === "pediatric" || lower === "детский" || lower === "детская") return "Детская";
	if (lower === "implantologist" || lower === "имплантолог" || lower === "имплантация") return "Имплант.";
	const specKey = rawSpec as DentalSpecialty;
	const label = specialtyLabels[specKey] || rawSpec;
	return label.charAt(0).toUpperCase() + label.slice(1);
}
