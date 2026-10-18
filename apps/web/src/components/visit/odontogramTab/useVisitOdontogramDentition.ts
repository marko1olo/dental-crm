import { useMemo } from "react";
import { calculateAge } from "@dental/shared";
import type { DentitionPhaseBadge, VisitOdontogramTabPatient } from "./visitOdontogramTabTypes";

export function useVisitOdontogramDentition(activePatient?: VisitOdontogramTabPatient | null) {
	const patientAge = useMemo(() => {
		return activePatient?.birthDate ? calculateAge(activePatient.birthDate) : null;
	}, [activePatient?.birthDate]);

	const dentitionPhaseBadge = useMemo<DentitionPhaseBadge | null>(() => {
		if (patientAge === null) return null;
		if (patientAge < 6) {
			return {
				label: "Молочные зубы (временный прикус)",
				hint: `Возраст пациента: ${patientAge} лет • Нотация FDI 51–85`,
			};
		}
		if (patientAge >= 6 && patientAge < 12) {
			return {
				label: "Сменный прикус (6–12 лет)",
				hint: `Возраст пациента: ${patientAge} лет • Сосуществование молочных и постоянных зубов`,
			};
		}
		return {
			label: "Постоянные зубы",
			hint: `Возраст пациента: ${patientAge} лет • Постоянный прикус (FDI 11–48)`,
		};
	}, [patientAge]);

	const smartDentitionMode = useMemo<"adult" | "pediatric" | "mixed">(() => {
		if (patientAge === null) return "adult";
		if (patientAge < 6) return "pediatric";
		if (patientAge < 12) return "mixed";
		return "adult";
	}, [patientAge]);

	const isPediatric = useMemo(() => {
		return smartDentitionMode !== "adult";
	}, [smartDentitionMode]);

	return {
		patientAge,
		dentitionPhaseBadge,
		smartDentitionMode,
		isPediatric,
	};
}
