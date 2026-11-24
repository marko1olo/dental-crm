import { resolvePatientSomaticAlerts, type Patient } from "@dental/shared";
import { useMemo } from "react";
import { evaluatePatientSafetyFlags, isNegativeAllergyStatement } from "../safetyMath";

export interface PatientWithSafetyFields extends Patient {
	clinicalSafetyProfile?: Record<string, unknown> | null | undefined;
	somaticRiskProfile?: Record<string, unknown> | null | undefined;
	allergies?: string | null | undefined;
	medicalHistory?: string | null | undefined;
	anamnesis?: {
		clinicalSafetyProfile?: Record<string, unknown> | null | undefined;
		allergies?: string | null | undefined;
		medicalHistory?: string | null | undefined;
	} | null | undefined;
}

export function useMobilePatientSafetyAlerts(patient: PatientWithSafetyFields | Patient) {
	const p = patient as PatientWithSafetyFields;

	const { allergyText, somaticRiskFlags } = useMemo(() => {
		// 1. Реляционная истина (Мандат 8ap): проверяем структурированный профиль безопасности
		const profile =
			(p.administrativeProfile?.clinicalSafetyProfile as Record<string, unknown> | null | undefined) ??
			p.clinicalSafetyProfile ??
			p.anamnesis?.clinicalSafetyProfile ??
			(p.administrativeProfile?.somaticRiskProfile as Record<string, unknown> | null | undefined) ??
			p.somaticRiskProfile;

		const structuredAllergies: string[] = [];
		const structuredSomatic: Array<{
			id: string;
			title: string;
			titleRu: string;
			desc?: string | undefined;
			description?: string | undefined;
		}> = [];

		if (profile) {
			const evalResult = evaluatePatientSafetyFlags(profile);
			const allergyFlags = evalResult.activeFlags.filter(
				(f) =>
					f.category === "anesthesia_allergy" ||
					f.id.startsWith("allergy_") ||
					f.id.includes("allergy") ||
					f.id === "anaphylaxis_history",
			);
			for (const f of allergyFlags) {
				const label = f.shortBadge || f.titleRu;
				if (label) structuredAllergies.push(label);
			}

			const nonAllergyFlags = evalResult.activeFlags.filter(
				(f) =>
					f.category !== "anesthesia_allergy" &&
					!f.id.startsWith("allergy_") &&
					!f.id.includes("allergy") &&
					f.id !== "anaphylaxis_history",
			);
			for (const f of nonAllergyFlags) {
				structuredSomatic.push({
					id: f.id,
					title: f.titleRu,
					titleRu: f.titleRu,
					desc: f.description ?? undefined,
					description: f.description ?? undefined,
				});
			}
		}

		// 2. Выделенное поле аллергий пациента
		const rawDirectAllergies = p.allergies || p.anamnesis?.allergies || "";
		const directAllergies = Array.isArray(rawDirectAllergies)
			? rawDirectAllergies.join(", ")
			: typeof rawDirectAllergies === "string"
				? rawDirectAllergies
				: "";
		let directAllergyText = "";
		if (typeof directAllergies === "string" && directAllergies.trim() && !isNegativeAllergyStatement(directAllergies)) {
			const match = directAllergies.match(/(?:аллерги[яиею]|аллергическ\w*)\s*(?:на|:)?\s*([^.,;!\n]+)/i);
			const candidate = match?.[1];
			if (candidate && !/отрицает|нет|не отягощ|без осложнен/i.test(candidate)) {
				const cleaned = candidate.replace(/^(на|к)\s+/i, "").trim();
				if (cleaned) directAllergyText = cleaned;
			}
			if (!directAllergyText) directAllergyText = directAllergies.trim();
		}

		// 3. Канонический резолвер заметок и анамнеза (patientSomaticAlertsResolver)
		const notesSources = [
			p.notes,
			p.medicalHistory,
			p.anamnesis?.medicalHistory,
		]
			.filter((s): s is string => typeof s === "string" && s.trim().length > 0)
			.join(". ");

		const notesNotNegative = notesSources && !isNegativeAllergyStatement(notesSources) ? notesSources : undefined;

		const telephonyAlerts = resolvePatientSomaticAlerts({
			id: p.id,
			fullName: p.fullName,
			phone: p.phone,
			notes: notesNotNegative,
			allergies: directAllergyText || undefined,
		});

		const textAllergies = telephonyAlerts
			.filter((a) => a.category === "allergy")
			.map((a) => a.label);

		const textSomatic = telephonyAlerts
			.filter((a) => a.category !== "allergy")
			.map((a) => ({
				id: a.id,
				title: a.label,
				titleRu: a.label,
				desc: a.label,
				description: a.label,
			}));

		// Объединяем аллергии
		const combinedAllergies = new Set<string>();
		for (const a of structuredAllergies) combinedAllergies.add(a);
		if (directAllergyText) combinedAllergies.add(directAllergyText);
		for (const a of textAllergies) combinedAllergies.add(a);

		const finalAllergyText = Array.from(combinedAllergies).join(", ");

		// Объединяем соматические риски с дедупликацией по заголовку
		const somaticResult = [...structuredSomatic];
		const seenSomatic = new Set(structuredSomatic.map((s) => s.titleRu.toLowerCase().trim()));
		for (const t of textSomatic) {
			const norm = t.titleRu.toLowerCase().trim();
			const alreadyCovered = Array.from(seenSomatic).some((s) => s.includes(norm) || norm.includes(s));
			if (!alreadyCovered) {
				seenSomatic.add(norm);
				somaticResult.push(t);
			}
		}

		return {
			allergyText: finalAllergyText,
			somaticRiskFlags: somaticResult,
		};
	}, [p]);

	return { allergyText, somaticRiskFlags };
}
