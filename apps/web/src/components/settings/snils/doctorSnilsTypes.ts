export interface DoctorSnilsValidationWidgetProps {
	readonly initialSnils?: string;
	readonly onValidSnils?: (formattedSnils: string) => void;
}

export interface SnilsValidationResult {
	readonly ok: boolean;
	readonly formatted?: string;
	readonly message?: string;
}
