export type ShadeSystemKey = "classical" | "3d_master" | "bleach" | "stump";

export interface DentalLabShadePickerProps {
	readonly shadeSystem?: ShadeSystemKey | undefined;
	readonly onShadeSystemChange?: ((system: ShadeSystemKey) => void) | undefined;
	readonly selectedShade: string;
	readonly onSelectShade: (shade: string) => void;
	readonly selectedStumpShade?: string | null | undefined;
	readonly onSelectStumpShade?: ((stumpShade: string) => void) | undefined;
	readonly showStumpSelector?: boolean | undefined;
	readonly showBleachTab?: boolean | undefined;
	readonly compact?: boolean | undefined;
	readonly shadePhotoUrl?: string | null | undefined;
	readonly onShadePhotoChange?: ((url: string | null) => void) | undefined;

	// 3-Zone Stratification & Characterizations (SSOT)
	readonly showStratification?: boolean | undefined;
	readonly shadeCervical?: string | undefined;
	readonly onShadeCervicalChange?: ((s: string) => void) | undefined;
	readonly shadeBody?: string | undefined;
	readonly onShadeBodyChange?: ((s: string) => void) | undefined;
	readonly shadeIncisal?: string | undefined;
	readonly onShadeIncisalChange?: ((s: string) => void) | undefined;
	readonly translucency?: string | undefined;
	readonly onTranslucencyChange?: ((t: string) => void) | undefined;
	readonly mamelons?: boolean | undefined;
	readonly onMamelonsChange?: ((m: boolean) => void) | undefined;
	readonly calcifications?: boolean | undefined;
	readonly onCalcificationsChange?: ((c: boolean) => void) | undefined;
	readonly opalescence?: boolean | undefined;
	readonly onOpalescenceChange?: ((o: boolean) => void) | undefined;
}
