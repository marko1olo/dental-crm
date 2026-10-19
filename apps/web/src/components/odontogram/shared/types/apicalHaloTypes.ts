export type PeriapicalLesionType =
	| "granuloma"
	| "periodontitis_flame"
	| "radicular_cyst";

export interface ApexAnchor {
	readonly id: string;
	readonly x: number;
	readonly y: number;
	readonly r?: number | undefined;
	readonly lesionType?: PeriapicalLesionType | undefined;
	readonly customFlamePath?: string | undefined;
}

export interface ApicalHaloProps {
	readonly apices: readonly ApexAnchor[];
	readonly defaultRadius?: number | undefined;
	readonly lesionType?: PeriapicalLesionType | undefined;
	readonly isDark?: boolean | undefined;
	readonly className?: string | undefined;
}
