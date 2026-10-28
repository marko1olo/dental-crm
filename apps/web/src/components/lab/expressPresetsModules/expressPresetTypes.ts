export interface ExpressLabPreset {
	id: string;
	title: string;
	shortDesc: string;
	constructionType: string;
	materialId: string;
	colorVita: string;
	workingDays: number;
	priceRub: number;
	labCostRub?: number;
	patientPriceRub?: number;
	patientPriceKopecks?: number;
	labCostKopecks?: number;
	toothFdi?: string | null;
	isFullArchOrJaw?: boolean;
	implantSystem?: string;
	abutmentType?: string;
	occlusalScheme: string;
	contactTightness: string;
	surfaceTexture: string;
	cementGapMicrons: number;
	badge: string;
	impressionType?: string;
}

export const ONE_CLICK_LAB_DEFAULTS = {
	materialId: "zirconia_multilayer",
	materialName: "Диоксид циркония (Katana STML)",
	colorVita: "A2",
	workingDays: 5,
	translucency: "HT",
	surfaceTexture: "natural_anatomy",
	cementGapMicrons: 30,
	shadeSystem: "classical" as const,
	restorationTypeSingle: "single_crown",
	restorationTypeBridge: "bridge",
};
