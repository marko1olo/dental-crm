export interface ExpressConstructionProfile {
	materialName: string;
	defaultPriceRub: number;
	turnaroundDays: number;
}

export function resolveExpressConstructionProfile(
	construction: string,
	isOneClickPreset: boolean | undefined,
): ExpressConstructionProfile {
	if (isOneClickPreset || construction === "crown_zirconia") {
		return {
			materialName: "Диоксид циркония Multi-Layer (Katana ML)",
			defaultPriceRub: 24000,
			turnaroundDays: 5,
		};
	}
	if (construction === "crown_emax") {
		return {
			materialName: "Дисиликат лития IPS e.max Press",
			defaultPriceRub: 26000,
			turnaroundDays: 5,
		};
	}
	if (construction === "metal_ceramic") {
		return {
			materialName: "КХС каркас с керамикой Noritake",
			defaultPriceRub: 15000,
			turnaroundDays: 7,
		};
	}
	if (construction === "clasp_denture") {
		return {
			materialName: "Бюгельный протез на замках Bredent",
			defaultPriceRub: 32000,
			turnaroundDays: 10,
		};
	}
	if (construction === "aligners") {
		return {
			materialName: "Ортодонтические элайнеры / Сплинт",
			defaultPriceRub: 45000,
			turnaroundDays: 5,
		};
	}
	return {
		materialName: "Диоксид циркония Multi-Layer (Katana ML)",
		defaultPriceRub: 24000,
		turnaroundDays: 5,
	};
}
