/**
 * navigationGrammar.ts — Голосовая навигация (открыть карту, печать, следующий пациент) и цефалометрия
 */

export * from "./cephLandmarksGrammar";
export * from "./endoGrammar";

export interface NavigationVoiceCommand {
	target: "open_card" | "print" | "next_patient" | "schedule" | "odontogram";
	patientId?: string | undefined;
}

export function extractNavigationIntent(text: string): NavigationVoiceCommand | null {
	if (!text) return null;
	const lower = text.toLowerCase().trim();

	if (lower.includes("следующий пациент") || lower.includes("следующий приём") || lower.includes("дальше")) {
		return { target: "next_patient" };
	}
	if (lower.includes("печать") || lower.includes("распечатать") || lower.includes("печать карты")) {
		return { target: "print" };
	}
	if (lower.includes("открыть карту") || lower.includes("открой карту") || lower.includes("медицинская карта")) {
		return { target: "open_card" };
	}
	if (lower.includes("расписание") || lower.includes("к расписанию") || lower.includes("сетка")) {
		return { target: "schedule" };
	}
	if (lower.includes("зубная формула") || lower.includes("одонтограмма")) {
		return { target: "odontogram" };
	}

	return null;
}
