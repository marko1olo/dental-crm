export type ToothSurface = "buccal" | "lingual" | "mesial" | "distal";

export interface AbfractionWedgeProps {
	readonly notchPath: string;
	readonly dentinFloorPath?: string | undefined;
	readonly stressApexLine?: string | undefined;
	readonly surface?: ToothSurface | undefined;
	readonly isDark?: boolean | undefined;
	readonly className?: string | undefined;
}
