/**
 * canonicalCatalogFixturesA.ts — Фикстуры имплантатов брендов Osstem, Straumann, Nobel, Dentium, MIS (Мандат 8b <= 120 строк).
 */

import type { CanonicalImplantFixture, GuidedSurgeryKitSpec, ImplantConnectionHexType } from "./canonicalCatalogTypes";
import { BRAND_METAS, SURGICAL_KITS } from "./canonicalSurgicalKits";

export function createFixture(
	brandKey: keyof typeof BRAND_METAS, lineName: string, modelPrefix: string,
	diameterMm: number, lengthMm: number, platformDiameterMm: number, apexDiameterMm: number,
	coneAngleDeg: number, hexType: ImplantConnectionHexType, platformCode: string,
	platformColorHex: string, isTapered: boolean, guidedKit: GuidedSurgeryKitSpec,
	priceKopecks: number, clinicalIndicationRu: string,
): CanonicalImplantFixture {
	const brandMeta = BRAND_METAS[brandKey];
	const dCode = Math.round(diameterMm * 10);
	const lCode = Math.round(lengthMm * 10);
	const modelName = `${modelPrefix}${dCode}${lCode}`;
	const id = `${brandKey}-${lineName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${dCode}-${lCode}`;

	return {
		id, brandKey, brandName: brandMeta.name, brandCountry: brandMeta.country,
		lineName, modelName, diameterMm, lengthMm, platformDiameterMm, apexDiameterMm,
		coneAngleDeg, hexType, platformCode, platformColorHex, isTapered, guidedKit,
		priceKopecks, articleNumber: modelName, clinicalIndicationRu,
	};
}

export function buildGroupAFixtures(): CanonicalImplantFixture[] {
	const items: CanonicalImplantFixture[] = [];
	const osstemKit = SURGICAL_KITS.osstem_oneguide!;
	for (const len of [8.5, 10.0, 11.5, 13.0, 15.0]) {
		items.push(createFixture("osstem", "TS III SA Mini", "TS3M", 3.5, len, 3.5, 2.5, 1.5, "morse_taper_11", "Mini", "#eab308", true, osstemKit, 1850000, "Премоляры, резцы"));
	}
	for (const diam of [4.0, 4.5, 5.0]) {
		const apex = diam === 4.0 ? 2.8 : diam === 4.5 ? 3.0 : 3.4;
		const color = diam === 4.0 ? "#10b981" : diam === 4.5 ? "#06b6d4" : "#a855f7";
		for (const len of [7.0, 8.5, 10.0, 11.5, 13.0, 15.0]) {
			items.push(createFixture("osstem", "TS III SA", "TS3S", diam, len, diam, apex, 1.5, "morse_taper_11", diam === 5.0 ? "Wide" : "Regular", color, true, osstemKit, 1850000, "Широкий гребень"));
		}
	}
	const straumannKit = SURGICAL_KITS.straumann_guided!;
	for (const len of [8.0, 10.0, 12.0, 14.0]) {
		items.push(createFixture("straumann", "Bone Level Tapered (BLT)", "021.", 3.3, len, 3.3, 2.1, 3.5, "crossfit_internal", "NC", "#eab308", true, straumannKit, 3750000, "Узкие фронтальные участки"));
	}
	for (const diam of [4.1, 4.8]) {
		for (const len of [8.0, 10.0, 12.0, 14.0]) {
			items.push(createFixture("straumann", "Bone Level Tapered (BLT)", "021.", diam, len, 4.1, diam === 4.1 ? 2.8 : 3.3, 3.5, "crossfit_internal", "RC", diam === 4.1 ? "#ef4444" : "#10b981", true, straumannKit, 3750000, "Универсальный протокол"));
			items.push(createFixture("straumann", "Tissue Level Standard Plus", "041.", diam, len, 4.8, diam, 0.0, "tissue_level_synocta", "RN", "#ef4444", false, straumannKit, 3550000, "Tissue Level"));
		}
	}
	items.push(createFixture("straumann", "BLX Roxolid", "061.", 4.0, 10.0, 4.0, 2.5, 4.0, "crossfit_internal", "BLX", "#0284c7", true, straumannKit, 3950000, "BLX"));
	const nobelKit = SURGICAL_KITS.nobel_guide!;
	for (const diam of [3.5, 4.3, 5.0]) {
		for (const len of [8.5, 10.0, 11.5, 13.0]) {
			items.push(createFixture("nobel_biocare", "NobelActive", "35", diam, len, diam, diam * 0.65, 5.0, "morse_taper_12", diam === 3.5 ? "NP" : "RP", diam === 3.5 ? "#f59e0b" : "#e11d48", true, nobelKit, 4200000, "Немедленная нагрузка"));
		}
	}
	items.push(createFixture("nobel_biocare", "NobelReplace Tapered", "321", 4.3, 10.0, 4.3, 4.3 * 0.75, 3.0, "tri_lobe", "RP", "#e11d48", true, nobelKit, 3900000, "NobelReplace"));
	const dentiumKit = SURGICAL_KITS.dentis_simple_guide!;
	for (const diam of [3.6, 4.0, 4.5, 5.0]) {
		const apex = diam === 4.0 ? 2.8 : diam * 0.7;
		for (const len of [8.0, 10.0, 12.0, 14.0]) {
			items.push(createFixture("dentium", "SuperLine", "FX", diam, len, 4.5, apex, 3.5, "morse_taper_11", "Regular", "#10b981", true, dentiumKit, 1750000, "Конический имплантат"));
		}
	}
	const misKit = SURGICAL_KITS.mis_mguide!;
	for (const diam of [3.75, 4.2, 5.0]) {
		for (const len of [8.0, 10.0, 11.5, 13.0]) {
			items.push(createFixture("mis", "C1", "C1-", diam, len, diam, diam * 0.7, 2.5, "morse_taper_12", "Standard", "#a855f7", true, misKit, 1950000, "Конический 12° Morse"));
			items.push(createFixture("mis", "SEVEN", "MF7-", diam, len, diam, diam * 0.7, 3.0, "internal_hex", "Standard", "#3b82f6", true, misKit, 1650000, "SEVEN"));
		}
	}
	items.push(createFixture("mis", "V3", "V3-", 3.9, 10.0, 3.9, 3.9 * 0.7, 2.5, "morse_taper_12", "V3", "#a855f7", true, misKit, 2100000, "V3 triangular"));
	return items;
}
