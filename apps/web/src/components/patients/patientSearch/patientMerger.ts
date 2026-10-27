import type { Patient } from "@dental/shared";
import type { MergedPatientResult } from "./types";

function unionAllergies(primary: Patient, duplicate: Patient): string {
	const a = ((primary as any).allergies as string | undefined) ?? "";
	const b = ((duplicate as any).allergies as string | undefined) ?? "";
	const split = (str: string) => str.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
	return Array.from(new Set([...split(a), ...split(b)])).join("; ");
}

function unionSafetyProfile(primary: Patient, duplicate: Patient): {
	unitedProfile: Record<string, unknown>;
	safetyFlags: string[];
} {
	const a = (primary as any).clinicalSafetyProfile || {};
	const b = (duplicate as any).clinicalSafetyProfile || {};
	const p: Record<string, unknown> = {
		...a,
		hasLidocaineAllergy: Boolean(a.hasLidocaineAllergy || b.hasLidocaineAllergy),
		hasArticaineAllergy: Boolean(a.hasArticaineAllergy || b.hasArticaineAllergy),
		hasMepivacaineAllergy: Boolean(a.hasMepivacaineAllergy || b.hasMepivacaineAllergy),
		hasSulfiteAllergy: Boolean(a.hasSulfiteAllergy || b.hasSulfiteAllergy),
		hasAnestheticAllergy: Boolean(a.hasAnestheticAllergy || b.hasAnestheticAllergy),
		hasIodineAllergy: Boolean(a.hasIodineAllergy || b.hasIodineAllergy),
		hasAnaphylaxisHistory: Boolean(a.hasAnaphylaxisHistory || b.hasAnaphylaxisHistory),
		hasPacemakerExs: Boolean(a.hasPacemakerExs || b.hasPacemakerExs),
		hasCardiovascularDisease: Boolean(a.hasCardiovascularDisease || b.hasCardiovascularDisease),
		hasHypertension: Boolean(a.hasHypertension || b.hasHypertension),
		takesAnticoagulants: Boolean(a.takesAnticoagulants || b.takesAnticoagulants),
		takesBisphosphonates: Boolean(a.takesBisphosphonates || b.takesBisphosphonates),
		hasDiabetesMellitus: Boolean(a.hasDiabetesMellitus || b.hasDiabetesMellitus),
		hasBronchialAsthma: Boolean(a.hasBronchialAsthma || b.hasBronchialAsthma),
		hasEpilepsy: Boolean(a.hasEpilepsy || b.hasEpilepsy),
		hasHepatitis: Boolean(a.hasHepatitis || b.hasHepatitis),
		hasHiv: Boolean(a.hasHiv || b.hasHiv),
		hasPenicillinAllergy: Boolean(a.hasPenicillinAllergy || b.hasPenicillinAllergy),
		hasLatexAllergy: Boolean(a.hasLatexAllergy || b.hasLatexAllergy),
		hasNsaidAllergy: Boolean(a.hasNsaidAllergy || b.hasNsaidAllergy),
	};
	const flags: string[] = [];
	if (p.hasLidocaineAllergy) flags.push("Аллергия на лидокаин");
	if (p.hasArticaineAllergy) flags.push("Аллергия на артикаин");
	if (p.hasMepivacaineAllergy) flags.push("Аллергия на мепивакаин");
	if (p.hasPacemakerExs) flags.push("Кардиостимулятор (ЭКС)");
	if (p.takesAnticoagulants) flags.push("Антикоагулянтная терапия");
	if (p.takesBisphosphonates) flags.push("Бисфосфонаты (риск остеонекроза)");
	if (p.hasBronchialAsthma) flags.push("Бронхиальная астма");
	if (p.hasDiabetesMellitus) flags.push("Сахарный диабет");
	if (p.hasHypertension) flags.push("Гипертония");
	return { unitedProfile: p, safetyFlags: flags };
}

export function mergePatientRecordsNonDestructive(
	primary: Patient,
	duplicate: Patient,
	reason: string = "Объединение дубликата карты",
): MergedPatientResult {
	if (primary.id === duplicate.id) throw new Error("Невозможно объединить карточку саму с собой");
	const primBalKop = Math.round(Number(primary.balanceRub ?? (primary as any).balance ?? 0) * 100);
	const dupBalKop = Math.round(Number(duplicate.balanceRub ?? (duplicate as any).balance ?? 0) * 100);
	const combinedBalanceRub = (primBalKop + dupBalKop) / 100;

	const unitedAllergies = unionAllergies(primary, duplicate);
	const { unitedProfile, safetyFlags } = unionSafetyProfile(primary, duplicate);

	const adminA = (primary.administrativeProfile as Record<string, unknown> | null) || {};
	const adminB = (duplicate.administrativeProfile as Record<string, unknown> | null) || {};
	const unitedAdmin: Record<string, unknown> = { ...adminA };
	for (const [k, v] of Object.entries(adminB)) {
		if ((unitedAdmin[k] === null || unitedAdmin[k] === undefined || unitedAdmin[k] === "") && v) {
			unitedAdmin[k] = v;
		}
	}

	const auditNote = `[Аудит объединения карт: ${new Date().toISOString()}] Карточка объединена с дубликатом «${duplicate.fullName}» (ID: ${duplicate.id}). Причина: ${reason}.`;
	const combinedNotes = [primary.notes?.trim() || "", duplicate.notes?.trim() ? `Заметки из дубликата: ${duplicate.notes.trim()}` : "", auditNote]
		.filter(Boolean).join("\n\n");

	const primaryPatient: Patient = {
		...primary,
		phone: primary.phone || duplicate.phone,
		birthDate: primary.birthDate || duplicate.birthDate,
		email: primary.email || duplicate.email,
		balanceRub: combinedBalanceRub,
		familyGroupId: primary.familyGroupId || duplicate.familyGroupId,
		notes: combinedNotes,
		administrativeProfile: unitedAdmin as any,
		...({ allergies: unitedAllergies, clinicalSafetyProfile: unitedProfile } as any),
	};

	const archivedDuplicatePatient: Patient = {
		...duplicate,
		status: "archived" as any,
		mergedIntoPatientId: primary.id,
		notes: `[Объединение] Карточка объединена в основную карту «${primary.fullName}» (ID: ${primary.id}).`,
	};

	const summary = `Слияние завершено: Баланс объединен (${combinedBalanceRub.toFixed(2)} ₽). Аллергии и соматические риски объединены (${safetyFlags.length} факторов). Карта «${duplicate.fullName}» переведена в архив как merged_into.`;

	return {
		primaryPatient,
		archivedDuplicatePatient,
		combinedBalanceRub,
		unitedAllergies,
		unitedSafetyFlags: safetyFlags,
		summary,
	};
}
