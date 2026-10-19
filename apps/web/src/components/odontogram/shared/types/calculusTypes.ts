export type CalculusSeverity = "mild" | "moderate" | "severe";

export interface CalculusBandProps {
	readonly supraPath?: string | undefined;
	readonly subPath?: string | undefined;
	readonly cejCurve?: string | undefined;
	readonly severity?: CalculusSeverity | undefined;
	readonly isDark?: boolean | undefined;
	readonly className?: string | undefined;
}
