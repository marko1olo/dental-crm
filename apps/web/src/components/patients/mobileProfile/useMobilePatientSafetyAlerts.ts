import type { Patient } from "@dental/shared";
import { useMemo } from "react";
import { evaluatePatientSafetyFlags, isNegativeAllergyStatement } from "../safetyMath";

export interface PatientWithSafetyFields extends Patient {
	clinicalSafetyProfile?: Record<string, unknown> | null | undefined;
	somaticRiskProfile?: Record<string, unknown> | null | undefined;
	allergies?: string | null | undefined;
	anamnesis?: {
		clinicalSafetyProfile?: Record<string, unknown> | null | undefined;
		allergies?: string | null | undefined;
	} | null | undefined;
}

export function useMobilePatientSafetyAlerts(patient: PatientWithSafetyFields | Patient) {
	const p = patient as PatientWithSafetyFields;

	const allergyText = useMemo(() => {
		// Реляционная истина (Мандат 8ap): сначала проверяем структурированный профиль безопасности
		const profile =
			(p.administrativeProfile?.clinicalSafetyProfile as Record<string, unknown> | null | undefined) ??
			p.clinicalSafetyProfile ??
			p.anamnesis?.clinicalSafetyProfile ??
			(p.administrativeProfile?.somaticRiskProfile as Record<string, unknown> | null | undefined) ??
			p.somaticRiskProfile;

		if (profile) {
			const evalResult = evaluatePatientSafetyFlags(profile);
			const allergyFlags = evalResult.activeFlags.filter(
				(f) => f.category === "anesthesia_allergy" || f.id.startsWith("allergy_") || f.id.includes("allergy") || f.id === "anaphylaxis_history",
			);
			if (allergyFlags.length > 0) return allergyFlags.map((f) => f.shortBadge || f.titleRu).join(", ");
		}

		// Выделенное поле аллергий пациента (без синтаксического майнинга свободных заметок)
		const rawAllergies = p.allergies || p.anamnesis?.allergies || "";
		if (typeof rawAllergies === "string" && rawAllergies.trim() && !isNegativeAllergyStatement(rawAllergies)) {
			const match = rawAllergies.match(/(?:аллерги[яиею]|аллергическ\w*)\s*(?:на|:)?\s*([^.,;!\n]+)/i);
			const candidate = match?.[1];
			if (candidate && !/отрицает|нет|не отягощ|без осложнен/i.test(candidate)) {
				const cleaned = candidate.replace(/^(на|к)\s+/i, "").trim();
				if (cleaned) return cleaned;
			}
			return rawAllergies.trim();
		}

		return "";
	}, [p]);

	const somaticRiskFlags = useMemo(() => {
		// Мандат 8ap: риски извлекаются СТРОГО из реляционной модели без ложных срабатываний из свободных заметок
		const profile =
			(p.administrativeProfile?.clinicalSafetyProfile as Record<string, unknown> | null | undefined) ??
			p.clinicalSafetyProfile ??
			p.anamnesis?.clinicalSafetyProfile ??
			(p.administrativeProfile?.somaticRiskProfile as Record<string, unknown> | null | undefined) ??
			p.somaticRiskProfile;

		if (profile) {
			const evalResult = evaluatePatientSafetyFlags(profile);
			return evalResult.activeFlags.filter(
				(f) => f.category !== "anesthesia_allergy" && !f.id.startsWith("allergy_") && !f.id.includes("allergy") && f.id !== "anaphylaxis_history",
			);
		}
		return [];
	}, [p]);

	return { allergyText, somaticRiskFlags };
}
