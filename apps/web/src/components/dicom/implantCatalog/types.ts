/**
 * types.ts — Типы платформ и спецификаций имплантационных систем (Мандат 8b <= 120 строк).
 */

export interface ImplantPlatformInfo {
	code: string;
	labelRu: string;
	hexColor: string;
	cssToken: string;
}

export interface ImplantModelSize {
	diameterMm: number;
	lengthsMm: number[];
	platform: ImplantPlatformInfo;
}

export interface ImplantSystemSpec {
	id: string;
	brand: string;
	line: string;
	country: string;
	descriptionRu: string;
	sleeveDiameterMm: number;
	sleeveHeightMm: number;
	drillOffsetDefaultMm: number;
	primaryStabilityDesign: string;
	sizes: ImplantModelSize[];
	diameters: number[];
	lengths: number[];
}
