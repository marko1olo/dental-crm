import type { Patient } from "@dental/shared";
import { useMemo } from "react";
import { evaluatePatientSafetyFlags, isNegativeAllergyStatement } from "../safetyMath";

export function useMobilePatientSafetyAlerts(patient: Patient) {
	const allergyText = useMemo(() => {
		const raw = (patient as any).allergies || (patient as any).anamnesis?.allergies || patient.notes || "";
		if (typeof raw === "string" && raw.trim() && !isNegativeAllergyStatement(raw)) {
			const match = raw.match(/(?:аллерги[яиею]|аллергическ\w*)\s*(?:на|:)?\s*([^.,;!\n]+)/i);
			if (match && match[1] && !/отрицает|нет|не отягощ|без осложнен/i.test(match[1])) {
				const cleaned = match[1].replace(/^(на|к)\s+/i, "").trim();
				if (cleaned) return cleaned;
			}
			const found: string[] = [];
			const check = (re: RegExp, neg: RegExp, name: string) => {
				if (re.test(raw) && !neg.test(raw)) found.push(name);
			};
			check(/лидокаин/i, /переносимость.*лидокаин.*хорош|лидокаин.*отрицает/i, "Лидокаин");
			check(/пенициллин/i, /пенициллин.*отрицает/i, "Пенициллин");
			check(/новокаин/i, /новокаин.*отрицает/i, "Новокаин");
			check(/латекс/i, /латекс.*отрицает/i, "Латекс");
			check(/йод/i, /йод.*отрицает/i, "Йод");
			check(/артикаин|ультракаин/i, /переносимость.*артикаин.*хорош|артикаин.*отрицает|ультракаин.*отрицает/i, "Артикаин");
			if (found.length > 0) return found.join(", ");
		}
		if ((patient as any).clinicalSafetyProfile) {
			const evalResult = evaluatePatientSafetyFlags((patient as any).clinicalSafetyProfile);
			const allergyFlags = evalResult.activeFlags.filter(
				(f) => f.category === "anesthesia_allergy" || f.id.startsWith("allergy_") || f.id.includes("allergy") || f.id === "anaphylaxis_history",
			);
			if (allergyFlags.length > 0) return allergyFlags.map((f) => f.shortBadge || f.titleRu).join(", ");
		}
		return "";
	}, [patient]);

	const somaticRiskFlags = useMemo(() => {
		const profile = (patient as any).clinicalSafetyProfile || (patient as any).anamnesis?.clinicalSafetyProfile || (patient as any).somaticRiskProfile;
		if (profile) {
			const evalResult = evaluatePatientSafetyFlags(profile);
			return evalResult.activeFlags.filter(
				(f) => f.category !== "anesthesia_allergy" && !f.id.startsWith("allergy_") && !f.id.includes("allergy") && f.id !== "anaphylaxis_history",
			);
		}
		const notes = patient.notes || "";
		if (typeof notes === "string" && notes.trim()) {
			const flags: Array<{ id: string; title: string; desc: string }> = [];
			if (/кардиостимулятор|экс|ритмоводитель/i.test(notes)) {
				flags.push({ id: "pacemaker", title: "Кардиостимулятор", desc: "Запрет на ультразвуковой скейлер и диатермокоагулятор" });
			}
			if (/диабет|инсулин/i.test(notes)) {
				flags.push({ id: "diabetes", title: "Сахарный диабет", desc: "Риск замедленного заживления и гипогликемии" });
			}
			if (/беременност/i.test(notes)) {
				flags.push({ id: "pregnancy", title: "Беременность", desc: "Запрет адреналина и КТ без защиты" });
			}
			if (/антикоагулянт|варфарин|аспирин|ксарелто/i.test(notes)) {
				flags.push({ id: "anticoagulants", title: "Антикоагулянты", desc: "Риск кровотечения при хирургии" });
			}
			if (/гипертони|давление|аг\s/i.test(notes)) {
				flags.push({ id: "hypertension", title: "Гипертония", desc: "Контроль АД перед введением вазоконстриктора" });
			}
			return flags;
		}
		return [];
	}, [patient]);

	return { allergyText, somaticRiskFlags };
}
