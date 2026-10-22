import type { Appointment } from "@dental/shared";

/**
 * Extracts teeth numbers list from appointment (FDI 11-48, 51-85).
 */
export function extractTeethList(appointment?: Appointment | null): string[] {
	if (!appointment) return [];
	const explicitTeeth = (appointment as any)?.teeth;
	if (Array.isArray(explicitTeeth) && explicitTeeth.length > 0) {
		return explicitTeeth.map(String);
	}
	const singleTooth = (appointment as any)?.toothNumber || (appointment as any)?.tooth;
	if (singleTooth) {
		return [String(singleTooth)];
	}
	const text = `${appointment.reason || ""} ${appointment.comment || ""}`;
	if (!text.trim()) return [];
	const matches = text.match(/\b([1-4][1-8]|[5-8][1-5])\b/g);
	if (matches && matches.length > 0) {
		return Array.from(new Set(matches));
	}
	return [];
}

/**
 * Formats full patient FIO into a readable, non-truncated medical card string.
 */
export function formatPatientDisplayFio(name: string | null | undefined): string {
	if (!name || !name.trim()) return "Пациент";
	const parts = name.trim().split(/\s+/);
	if (parts.length >= 3) {
		const lastName = parts[0];
		const firstInitial = parts[1]?.charAt(0);
		const middleInitial = parts[2]?.charAt(0);
		return `${lastName} ${firstInitial ? `${firstInitial}.` : ""}${middleInitial ? `${middleInitial}.` : ""}`.trim();
	}
	if (parts.length === 2) {
		const lastName = parts[0];
		const firstInitial = parts[1]?.charAt(0);
		return `${lastName} ${firstInitial ? `${firstInitial}.` : ""}`.trim();
	}
	return name.trim();
}

/**
 * Formats doctor full name to short display (e.g. "Смирнов А. В.")
 */
export function formatDoctorShortName(fullName?: string | null): string {
	if (!fullName) return "";
	const cleaned = fullName.trim();
	const parts = cleaned.split(/\s+/);
	const firstPart = parts[0];
	const nameParts =
		parts.length > 1 && firstPart && /^(д-р|доктор|врач)\.?$/i.test(firstPart)
			? parts.slice(1)
			: parts;
	if (nameParts.length === 0) return cleaned || "";
	const surname = nameParts[0] || "";
	if (!surname) return cleaned;
	if (nameParts.length === 1) return surname;

	const initials = nameParts
		.slice(1)
		.map((p) => {
			if (!p) return "";
			const matched = p.match(/[a-zA-Zа-яА-ЯёЁ]/g);
			if (!matched || matched.length === 0) return "";
			if (p.includes(".")) {
				return matched.map((l) => `${l.toUpperCase()}.`).join("");
			}
			const firstLetter = matched[0];
			return firstLetter ? `${firstLetter.toUpperCase()}.` : "";
		})
		.join("");

	return initials ? `${surname} ${initials}` : surname;
}
