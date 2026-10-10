import type { Appointment } from "@dental/shared";

export function extractTeethList(appointment: Appointment): string[] {
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
 * Formats full patient FIO into a readable, non-truncated medical card string:
 * "Иванов Иван Сергеевич" -> "Иванов Иван С."
 * "Петрова Анна" -> "Петрова Анна"
 */
export function formatPatientDisplayFio(name: string | null | undefined): string {
	if (!name || !name.trim()) return "Пациент";
	const parts = name.trim().split(/\s+/);
	if (parts.length >= 3) {
		const lastName = parts[0];
		const firstName = parts[1];
		const middleInitial = parts[2]?.charAt(0);
		return `${lastName} ${firstName} ${middleInitial ? `${middleInitial}.` : ""}`.trim();
	}
	return name.trim();
}
