export type PracticeScale = "solo" | "clinic";

export interface RegisterProps {
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	onSuccess: (clinicProfile: any, userProfile: any) => void;
	onSwitchToLogin: () => void;
	onSwitchToDemoTour?: () => void;
}

/**
 * Нормализует телефонный номер или email (Mandate 8n Zero Dead-Ends).
 * "+7 (999) 123-45-67" -> "+79991234567"
 * "8 999 123-45-67" -> "+79991234567"
 * "9991234567" -> "+79991234567"
 */
export function normalizeContactInput(input: string): {
	loginIdentifier: string;
	normalizedPhone?: string;
	isPhone: boolean;
} {
	const trimmed = input.trim();
	if (!trimmed) {
		return { loginIdentifier: "", isPhone: false };
	}
	if (trimmed.includes("@")) {
		return { loginIdentifier: trimmed.toLowerCase(), isPhone: false };
	}

	const digitsOnly = trimmed.replace(/\D/g, "");
	if (digitsOnly.length >= 10) {
		let digits = digitsOnly;
		if (digits.length === 11 && (digits.startsWith("7") || digits.startsWith("8"))) {
			digits = `7${digits.slice(1)}`;
		} else if (digits.length === 10) {
			digits = `7${digits}`;
		}
		const phoneFormatted = `+${digits}`;
		return {
			loginIdentifier: phoneFormatted,
			normalizedPhone: phoneFormatted,
			isPhone: true,
		};
	}

	return {
		loginIdentifier: trimmed,
		isPhone: false,
	};
}
