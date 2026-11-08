import type { Patient } from "@dental/shared";
import { useMemo } from "react";
import { evaluatePatientSafetyFlags, isNegativeAllergyStatement } from "../safetyMath";

export function useMobilePatientSafetyAlerts(patient: Patient) {
	const allergyText = useMemo(() => {
		// Реляционная истина (Мандат 8ap): сначала проверяем структурированный профиль безопасности
		const profile = (patient as any).clinicalSafetyProfile || (patient as any).anamnesis?.clinicalSafetyProfile || (patient as any).somaticRiskProfile;
		if (profile) {
			const evalResult = evaluatePatientSafetyFlags(profile);
			const allergyFlags = evalResult.activeFlags.filter(
				(f) => f.category === "anesthesia_allergy" || f.id.startsWith("allergy_") || f.id.includes("allergy") || f.id === "anaphylaxis_history",
			);
			if (allergyFlags.length > 0) return allergyFlags.map((f) => f.shortBadge || f.titleRu).join(", ");
		}

		// Выделенное поле аллергий пациента (без синтаксического майнинга свободных заметок)
		const rawAllergies = (patient as any).allergies || (patient as any).anamnesis?.allergies || "";
		if (typeof rawAllergies === "string" && rawAllergies.trim() && !isNegativeAllergyStatement(rawAllergies)) {
			const match = rawAllergies.match(/(?:аллерги[яиею]|аллергическ\w*)\s*(?:на|:)?\s*([^.,;!\n]+)/i);
			if (match && match[1] && !/отрицает|нет|не отягощ|без осложнен/i.test(match[1])) {
				const cleaned = match[1].replace(/^(на|к)\s+/i, "").trim();
				if (cleaned) return cleaned;
			}
			return rawAllergies.trim();
		}

		return "";
	}, [patient]);

	const somaticRiskFlags = useMemo(() => {
		// Мандат 8ap: риски извлекаются СТРОГО из реляционной модели без ложных срабатываний из свободных заметок
		const profile = (patient as any).clinicalSafetyProfile || (patient as any).anamnesis?.clinicalSafetyProfile || (patient as any).somaticRiskProfile;
		if (profile) {
			const evalResult = evaluatePatientSafetyFlags(profile);
			return evalResult.activeFlags.filter(
				(f) => f.category !== "anesthesia_allergy" && !f.id.startsWith("allergy_") && !f.id.includes("allergy") && f.id !== "anaphylaxis_history",
			);
		}
		return [];
	}, [patient]);

	return { allergyText, somaticRiskFlags };
}
