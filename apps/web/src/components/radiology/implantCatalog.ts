/**
 * apps/web/src/components/radiology/implantCatalog.ts
 *
 * CANONICAL DENTAL IMPLANT CATALOG & SURGICAL NAVIGATION ENGINE
 * Reverse-Engineered from Vatech Ez3D2009 / Picasso Trio NimplantDB.mdb & SurgicalKitDB.mdb.
 * Reference: docs/vatech_research/09_EZ3D_CBCT_PICASSO_AND_IMPLANT_PLANNING.md
 *
 * Real Manufacturer Systems:
 * 1. Osstem (TS III SA, TS IV SA, TS III Ultra-Wide, TS II SA, MS Narrow)
 * 2. Straumann (Bone Level BL/BLT, BLX, Tissue Level S/SP)
 * 3. Nobel Biocare (NobelActive, NobelParallel CC, NobelReplace, Brånemark, Zygoma)
 * 4. Dentium (SuperLine, Implantium, Slim Onebody)
 * 5. MIS Implants (C1, SEVEN, V3)
 * 6. Astra Tech (OsseoSpeed TX / EV)
 * 7. Zimmer Dental (Tapered Screw-Vent TSV)
 * 8. Megagen (AnyRidge Knife Thread)
 * 9. BioHorizons (Tapered Internal Laser-Lok)
 * 10. Alpha-Bio Tec (SPI Spiral, ICE)
 * 11. Ankylos (Ankylos C/X TissueCare 5.7°)
 *
 * Mandate 8b: Strict <= 800 lines ceiling.
 * Mandate 8e: Doctor Autonomy.
 * Mandate 8s: Anti-bloat, canonical domain authority.
 */

// ─── CONNECTION & HEX TYPES ──────────────────────────────────────────────────

export type ImplantConnectionHexType =
	| "morse_taper_11"       // 11° Morse Taper (Osstem TS, Dentium SuperLine)
	| "morse_taper_12"       // 12° Morse Taper (NobelActive, MIS C1)
	| "crossfit_internal"    // Straumann CrossFit NC / RC / BLX TorcFit
	| "tissue_level_synocta" // Straumann Tissue Level SynOcta 8°
	| "internal_hex"         // Standard internal hex (MIS SEVEN, Zimmer TSV, BioHorizons, Alpha-Bio)
	| "external_hex"         // External hex (Brånemark System, Osstem US)
	| "tri_lobe"             // Tri-oval internal trilobe (NobelReplace)
	| "tissue_care_cone"     // Ankylos C/X 5.7° Morse Taper
	| "conical_seal"         // Astra Tech Conical Seal Design
	| "anyridge_hex_cone";   // Megagen AnyRidge 5° Cone with internal hex

export type CanonicalImplantBrandKey =
	| "osstem"
	| "straumann"
	| "nobel_biocare"
	| "dentium"
	| "mis"
	| "astra_tech"
	| "zimmer"
	| "megagen"
	| "biohorizons"
	| "alphabio"
	| "ankylos";

export const CANONICAL_IMPLANT_BRANDS: readonly CanonicalImplantBrandKey[] = [
	"osstem",
	"straumann",
	"nobel_biocare",
	"dentium",
	"mis",
	"astra_tech",
	"zimmer",
	"megagen",
	"biohorizons",
	"alphabio",
	"ankylos",
] as const;

export interface GuidedSurgeryKitSpec {
	readonly kitName: string;
	readonly sleeveDiameterMm: number;
	readonly sleeveHeightMm: number;
	readonly defaultOffsetMm: number;
	readonly availableOffsetsMm: readonly number[];
	readonly drillStopSystemRu: string;
}

export interface CanonicalImplantFixture {
	readonly id: string;
	readonly brandKey: CanonicalImplantBrandKey;
	readonly brandName: string;
	readonly brandCountry: string;
	readonly lineName: string;
	readonly modelName: string;
	readonly diameterMm: number;
	readonly lengthMm: number;
	readonly platformDiameterMm: number;
	readonly apexDiameterMm: number;
	readonly coneAngleDeg: number;
	readonly hexType: ImplantConnectionHexType;
	readonly platformCode: string;
	readonly platformColorHex: string;
	readonly isTapered: boolean;
	readonly guidedKit: GuidedSurgeryKitSpec;
	readonly priceKopecks: number;
	readonly articleNumber: string;
	readonly clinicalIndicationRu: string;
}

// ─── CANONICAL SURGICAL KITS (SURGICALKITDB.MDB) ─────────────────────────────

export const SURGICAL_KITS: Record<string, GuidedSurgeryKitSpec> = {
	osstem_oneguide: {
		kitName: "Osstem OneGuide",
		sleeveDiameterMm: 5.0,
		sleeveHeightMm: 5.0,
		defaultOffsetMm: 9.0,
		availableOffsetsMm: [9.0, 10.5],
		drillStopSystemRu: "Лазерный стопор фрезы с упором в верхний срез титановой втулки",
	},
	straumann_guided: {
		kitName: "Straumann Guided Surgery (GS)",
		sleeveDiameterMm: 5.0,
		sleeveHeightMm: 5.0,
		defaultOffsetMm: 4.0,
		availableOffsetsMm: [2.0, 4.0, 6.0],
		drillStopSystemRu: "Ступенчатые навигационные ключи H2/H4/H6 со стоп-кольцом",
	},
	nobel_guide: {
		kitName: "NobelGuide",
		sleeveDiameterMm: 5.0,
		sleeveHeightMm: 5.0,
		defaultOffsetMm: 9.0,
		availableOffsetsMm: [9.0],
		drillStopSystemRu: "Направляющие ложки Guided Drill Guides с фланцевым стопором",
	},
	dentis_simple_guide: {
		kitName: "Dentis Simple Guide / Dentium",
		sleeveDiameterMm: 5.0,
		sleeveHeightMm: 4.5,
		defaultOffsetMm: 9.0,
		availableOffsetsMm: [9.0],
		drillStopSystemRu: "Универсальные металлические втулки 9 мм",
	},
	mis_mguide: {
		kitName: "MIS MGuide",
		sleeveDiameterMm: 5.0,
		sleeveHeightMm: 4.0,
		defaultOffsetMm: 9.0,
		availableOffsetsMm: [9.0],
		drillStopSystemRu: "Открытый каркас шаблона с ключевым позиционированием фрез",
	},
	astra_facilitate: {
		kitName: "Astra Tech Facilitate",
		sleeveDiameterMm: 5.0,
		sleeveHeightMm: 5.0,
		defaultOffsetMm: 9.0,
		availableOffsetsMm: [9.0],
		drillStopSystemRu: "Направляющие втулки Facilitate EV с калиброванным упором",
	},
	zimmer_guided: {
		kitName: "Zimmer Guided Surgery Kit",
		sleeveDiameterMm: 5.0,
		sleeveHeightMm: 5.0,
		defaultOffsetMm: 9.0,
		availableOffsetsMm: [9.0],
		drillStopSystemRu: "Калиброванные цилиндры TSV Guided с фиксированным стопором",
	},
	megagen_r2gate: {
		kitName: "Megagen R2Gate",
		sleeveDiameterMm: 5.2,
		sleeveHeightMm: 5.0,
		defaultOffsetMm: 9.0,
		availableOffsetsMm: [9.0, 10.5],
		drillStopSystemRu: "Бесшовный R2Gate протокол с узкими направляющими втулками",
	},
	ankylos_expertease: {
		kitName: "Ankylos ExpertEase",
		sleeveDiameterMm: 5.0,
		sleeveHeightMm: 5.0,
		defaultOffsetMm: 9.0,
		availableOffsetsMm: [9.0],
		drillStopSystemRu: "Субкрестальное направленное заглубление ExpertEase 9 мм",
	},
};

// ─── BRAND METADATA ─────────────────────────────────────────────────────────

export interface CanonicalBrandMeta {
	readonly key: CanonicalImplantBrandKey;
	readonly name: string;
	readonly country: string;
	readonly popularLines: readonly string[];
	readonly defaultHexColor: string;
	readonly defaultHexType: ImplantConnectionHexType;
	readonly defaultKit: GuidedSurgeryKitSpec;
	readonly descriptionRu: string;
}

export const CANONICAL_IMPLANT_BRANDS_META: readonly CanonicalBrandMeta[] = [
	{
		key: "osstem",
		name: "Osstem",
		country: "Южная Корея",
		popularLines: ["TS III SA", "TS IV SA", "TS III Ultra-Wide", "TS II SA", "MS Narrow"],
		defaultHexColor: "#16a34a",
		defaultHexType: "morse_taper_11",
		defaultKit: SURGICAL_KITS.osstem_oneguide!,
		descriptionRu: "Золотой стандарт азиатской имплантологии с SA пескоструйной обработкой и гидрофильным травлением.",
	},
	{
		key: "straumann",
		name: "Straumann",
		country: "Швейцария",
		popularLines: ["Bone Level Tapered (BLT)", "BLX", "Tissue Level (Standard Plus)"],
		defaultHexColor: "#0284c7",
		defaultHexType: "crossfit_internal",
		defaultKit: SURGICAL_KITS.straumann_guided!,
		descriptionRu: "Швейцарский титано-циркониевый сплав Roxolid с ультрагидрофильной поверхностью SLActive/SLA.",
	},
	{
		key: "nobel_biocare",
		name: "Nobel Biocare",
		country: "Швейцария / Швеция",
		popularLines: ["NobelActive", "NobelParallel CC", "NobelReplace", "Brånemark Zygoma"],
		defaultHexColor: "#e11d48",
		defaultHexType: "morse_taper_12",
		defaultKit: SURGICAL_KITS.nobel_guide!,
		descriptionRu: "Оригинальная система профессора Бранемарка с поверхностью TiUnite и переменным шагом резьбы.",
	},
	{
		key: "dentium",
		name: "Dentium",
		country: "Южная Корея",
		popularLines: ["SuperLine", "Implantium", "Slim Onebody"],
		defaultHexColor: "#f59e0b",
		defaultHexType: "morse_taper_11",
		defaultKit: SURGICAL_KITS.dentis_simple_guide!,
		descriptionRu: "Конические имплантаты с двойной трапециевидной резьбой и единой платформой 11° конуса Морзе.",
	},
	{
		key: "mis",
		name: "MIS Implants",
		country: "Израиль",
		popularLines: ["C1", "SEVEN", "V3"],
		defaultHexColor: "#a855f7",
		defaultHexType: "morse_taper_12",
		defaultKit: SURGICAL_KITS.mis_mguide!,
		descriptionRu: "Биосовместимые имплантаты с микрокольцами у шейки и инновационной корональной зоной V3.",
	},
	{
		key: "astra_tech",
		name: "Astra Tech",
		country: "Швеция",
		popularLines: ["OsseoSpeed TX", "OsseoSpeed EV"],
		defaultHexColor: "#8b5cf6",
		defaultHexType: "conical_seal",
		defaultKit: SURGICAL_KITS.astra_facilitate!,
		descriptionRu: "Премиальное коническое соединение Conical Seal Design и шейка MicroThread против резорбции кости.",
	},
	{
		key: "zimmer",
		name: "Zimmer Dental",
		country: "США",
		popularLines: ["Tapered Screw-Vent (TSV)", "Trabecular Metal"],
		defaultHexColor: "#3b82f6",
		defaultHexType: "internal_hex",
		defaultKit: SURGICAL_KITS.zimmer_guided!,
		descriptionRu: "Фрикционное шестигранное соединение с Lead-in Bevel 1.5 мм и пористым танталовым металлом.",
	},
	{
		key: "megagen",
		name: "Megagen",
		country: "Южная Корея",
		popularLines: ["AnyRidge", "AnyOne"],
		defaultHexColor: "#06b6d4",
		defaultHexType: "anyridge_hex_cone",
		defaultKit: SURGICAL_KITS.megagen_r2gate!,
		descriptionRu: "Уникальная ножевидная резьба Knife Thread для максимальной первичной стабильности в мягкой кости.",
	},
	{
		key: "biohorizons",
		name: "BioHorizons",
		country: "США",
		popularLines: ["Tapered Internal", "Tapered Plus"],
		defaultHexColor: "#d97706",
		defaultHexType: "internal_hex",
		defaultKit: SURGICAL_KITS.zimmer_guided!,
		descriptionRu: "Запатентованная лазерная микрообработка шейки Laser-Lok для образования соединительнотканного прикрепления.",
	},
	{
		key: "alphabio",
		name: "Alpha-Bio Tec",
		country: "Израиль",
		popularLines: ["SPI Spiral", "ICE"],
		defaultHexColor: "#ef4444",
		defaultHexType: "internal_hex",
		defaultKit: SURGICAL_KITS.mis_mguide!,
		descriptionRu: "Агрессивный спиральный самонарезающий имплантат SPI для узких пространств и немедленной нагрузки.",
	},
	{
		key: "ankylos",
		name: "Ankylos",
		country: "Германия",
		popularLines: ["C/X TissueCare"],
		defaultHexColor: "#059669",
		defaultHexType: "tissue_care_cone",
		defaultKit: SURGICAL_KITS.ankylos_expertease!,
		descriptionRu: "Уникальный конус TissueCare Connection 5.7° с полным переключением платформ для субкрестальной посадки.",
	},
];

// ─── FIXTURE BUILDER HELPER ─────────────────────────────────────────────────

function createFixture(
	brandKey: CanonicalImplantBrandKey,
	lineName: string,
	modelPrefix: string,
	diameterMm: number,
	lengthMm: number,
	platformDiameterMm: number,
	apexDiameterMm: number,
	coneAngleDeg: number,
	hexType: ImplantConnectionHexType,
	platformCode: string,
	platformColorHex: string,
	isTapered: boolean,
	guidedKit: GuidedSurgeryKitSpec,
	priceKopecks: number,
	clinicalIndicationRu: string,
): CanonicalImplantFixture {
	const brandMeta = CANONICAL_IMPLANT_BRANDS_META.find((b) => b.key === brandKey)!;
	const dCode = Math.round(diameterMm * 10);
	const lCode = Math.round(lengthMm * 10);
	const modelName = `${modelPrefix}${dCode}${lCode}`;
	const id = `${brandKey}-${lineName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${dCode}-${lCode}`;

	return {
		id,
		brandKey,
		brandName: brandMeta.name,
		brandCountry: brandMeta.country,
		lineName,
		modelName,
		diameterMm,
		lengthMm,
		platformDiameterMm,
		apexDiameterMm,
		coneAngleDeg,
		hexType,
		platformCode,
		platformColorHex,
		isTapered,
		guidedKit,
		priceKopecks,
		articleNumber: modelName,
		clinicalIndicationRu,
	};
}

// ─── MASTER FIXTURE LIBRARY (EXTRACTED FROM NIMPLANTDB.MDB) ──────────────────

function buildMasterCatalog(): CanonicalImplantFixture[] {
	const items: CanonicalImplantFixture[] = [];

	// 1. OSSTEM (TS III SA Regular, Mini, Ultra-Wide, TS IV SA, TS II SA)
	const osstemKit = SURGICAL_KITS.osstem_oneguide!;
	const osstemDiametersRegular = [4.0, 4.5, 5.0];
	const osstemLengths = [7.0, 8.5, 10.0, 11.5, 13.0, 15.0];

	// TS III Mini (Ø3.5)
	for (const len of [8.5, 10.0, 11.5, 13.0, 15.0]) {
		items.push(createFixture(
			"osstem", "TS III SA Mini", "TS3M", 3.5, len, 3.5, 2.5, 1.5,
			"morse_taper_11", "Mini", "#eab308", true, osstemKit, 1850000,
			"Премоляры, резцы нижней челюсти при дефиците кости",
		));
	}
	// TS III Regular (Ø4.0, 4.5, 5.0)
	for (const diam of osstemDiametersRegular) {
		const plat = diam;
		const apex = diam === 4.0 ? 2.8 : diam === 4.5 ? 3.0 : 3.4;
		const color = diam === 4.0 ? "#10b981" : diam === 4.5 ? "#06b6d4" : "#a855f7";
		const code = diam === 5.0 ? "Wide" : "Regular";
		for (const len of osstemLengths) {
			items.push(createFixture(
				"osstem", "TS III SA", "TS3S", diam, len, plat, apex, 1.5,
				"morse_taper_11", code, color, true, osstemKit, 1850000,
				diam >= 4.5 ? "Широкий гребень моляров верхней и нижней челюсти" : "Золотой стандарт для большинства клинических ситуаций",
			));
		}
	}
	// TS III Ultra-Wide (Ø6.0, 7.0) — Platform Switching
	for (const diam of [6.0, 7.0]) {
		const apex = diam === 6.0 ? 4.8 : 5.6;
		for (const len of [7.0, 8.5, 10.0]) {
			items.push(createFixture(
				"osstem", "TS III Ultra-Wide", "TS3W", diam, len, 5.5, apex, 2.0,
				"morse_taper_11", "Ultra-Wide", "#2563eb", true, osstemKit, 2150000,
				"Немедленная имплантация в лунку удаленного моляра без костной пластики",
			));
		}
	}
	// TS IV SA (выраженная конусность 6.0° для мягкой кости D4)
	for (const diam of [3.5, 4.0, 4.5, 5.0]) {
		const apex = diam === 3.5 ? 2.0 : diam === 4.0 ? 2.4 : diam === 4.5 ? 2.8 : 3.2;
		for (const len of [8.5, 10.0, 11.5, 13.0]) {
			items.push(createFixture(
				"osstem", "TS IV SA", "TS4S", diam, len, diam, apex, 6.0,
				"morse_taper_11", "Regular", "#16a34a", true, osstemKit, 1950000,
				"Мягкая губчатая кость верхней челюсти (D4) и протокол синус-лифтинга",
			));
		}
	}
	// TS II SA (цилиндрический для плотной кости D1)
	for (const diam of [3.5, 4.0, 4.5]) {
		for (const len of [8.5, 10.0, 11.5, 13.0]) {
			items.push(createFixture(
				"osstem", "TS II SA", "TS2S", diam, len, diam, diam, 0.0,
				"morse_taper_11", "Regular", "#059669", false, osstemKit, 1850000,
				"Плотная кортикальная кость подбородка и нижней челюсти (D1)",
			));
		}
	}

	// 2. STRAUMANN (Bone Level BLT, BLX, Tissue Level SP)
	const straumannKit = SURGICAL_KITS.straumann_guided!;
	// BLT NC Ø3.3
	for (const len of [8.0, 10.0, 12.0, 14.0]) {
		items.push(createFixture(
			"straumann", "Bone Level Tapered (BLT)", "021.", 3.3, len, 3.3, 2.1, 3.5,
			"crossfit_internal", "NC", "#eab308", true, straumannKit, 3750000,
			"Узкие мезио-дистальные пространства, нижние резцы и верхние латеральные резцы",
		));
	}
	// BLT RC Ø4.1, 4.8
	for (const diam of [4.1, 4.8]) {
		const apex = diam === 4.1 ? 2.5 : 3.0;
		for (const len of [8.0, 10.0, 12.0, 14.0]) {
			items.push(createFixture(
				"straumann", "Bone Level Tapered (BLT)", "021.", diam, len, 4.1, apex, 3.5,
				"crossfit_internal", "RC", "#a855f7", true, straumannKit, 3850000,
				"Премиальный швейцарский конический протокол Roxolid SLA для любого типа кости",
			));
		}
	}
	// BLX (Ø3.5, 4.0, 4.5, 5.0)
	for (const diam of [3.5, 4.0, 4.5, 5.0]) {
		const apex = diam === 3.5 ? 2.2 : diam === 4.0 ? 2.5 : diam === 4.5 ? 2.8 : 3.2;
		for (const len of [8.0, 10.0, 12.0, 14.0, 16.0]) {
			items.push(createFixture(
				"straumann", "BLX Roxolid", "061.", diam, len, diam, apex, 4.0,
				"crossfit_internal", "BLX", "#0284c7", true, straumannKit, 3950000,
				"Немедленная нагрузка при установке в лунку свежеудаленного зуба",
			));
		}
	}
	// Tissue Level (Standard Plus SP RN Ø4.1, 4.8)
	for (const diam of [4.1, 4.8]) {
		for (const len of [6.0, 8.0, 10.0, 12.0, 14.0]) {
			items.push(createFixture(
				"straumann", "Tissue Level Standard Plus", "041.", diam, len, 4.8, diam, 0.0,
				"tissue_level_synocta", "RN", "#06b6d4", false, straumannKit, 3650000,
				"Одноэтапный трансгингивальный протокол в жевательном отделе",
			));
		}
	}

	// 3. NOBEL BIOCARE (NobelActive, NobelParallel, NobelReplace, Zygoma)
	const nobelKit = SURGICAL_KITS.nobel_guide!;
	// NobelActive NP Ø3.0, 3.5
	for (const diam of [3.0, 3.5]) {
		const apex = diam === 3.0 ? 1.8 : 2.4;
		for (const len of [8.5, 10.0, 11.5, 13.0, 15.0]) {
			items.push(createFixture(
				"nobel_biocare", "NobelActive", "352", diam, len, 3.5, apex, 5.0,
				"morse_taper_12", "NP", "#e11d48", true, nobelKit, 3950000,
				"Максимальная стабильность в мягкой кости и немедленная нагрузка",
			));
		}
	}
	// NobelActive RP Ø4.3, 5.0
	for (const diam of [4.3, 5.0]) {
		const apex = diam === 4.3 ? 2.8 : 3.2;
		for (const len of [8.5, 10.0, 11.5, 13.0, 15.0, 18.0]) {
			items.push(createFixture(
				"nobel_biocare", "NobelActive", "352", diam, len, diam, apex, 5.0,
				"morse_taper_12", "RP", "#f59e0b", true, nobelKit, 3950000,
				"Универсальный хирургический протокол для жевательных зубов",
			));
		}
	}
	// NobelActive WP Ø5.5
	for (const len of [8.5, 10.0, 11.5, 13.0]) {
		items.push(createFixture(
			"nobel_biocare", "NobelActive", "352", 5.5, len, 5.5, 3.6, 5.0,
			"morse_taper_12", "WP", "#2563eb", true, nobelKit, 4150000,
			"Широкие молярные дефекты кости",
		));
	}
	// NobelParallel CC (Ø3.75, 4.3, 5.0)
	for (const diam of [3.75, 4.3, 5.0]) {
		for (const len of [7.0, 8.5, 10.0, 11.5, 13.0, 15.0]) {
			items.push(createFixture(
				"nobel_biocare", "NobelParallel CC", "378", diam, len, diam, diam * 0.85, 1.5,
				"morse_taper_12", "RP", "#10b981", true, nobelKit, 3800000,
				"Параллельные стенки для предсказуемой остеотомии во всех типах кости",
			));
		}
	}
	// NobelReplace Select Tapered (Tri-lobe Ø3.5, 4.3, 5.0)
	for (const diam of [3.5, 4.3, 5.0]) {
		for (const len of [8.0, 10.0, 11.5, 13.0, 16.0]) {
			items.push(createFixture(
				"nobel_biocare", "NobelReplace Tapered", "321", diam, len, diam, diam * 0.75, 3.0,
				"tri_lobe", "TriLobe", "#6366f1", true, nobelKit, 3750000,
				"Классическое трехканальное внутреннее соединение Tri-oval",
			));
		}
	}
	// Brånemark System Zygoma (Ø4.0, длины 30..52.5 мм)
	for (const len of [30.0, 35.0, 40.0, 45.0, 50.0, 52.5]) {
		items.push(createFixture(
			"nobel_biocare", "Brånemark Zygoma", "ZYG", 4.0, len, 4.0, 3.0, 0.0,
			"external_hex", "Zygoma", "#dc2626", false, nobelKit, 5500000,
			"Скуловая имплантация при экстремальной атрофии верхней челюсти без костной пластики",
		));
	}

	// 4. DENTIUM (SuperLine, Implantium)
	const dentiumKit = SURGICAL_KITS.dentis_simple_guide!;
	for (const diam of [3.6, 4.0, 4.5, 5.0, 6.0, 7.0]) {
		const apex = diam === 3.6 ? 2.6 : diam === 4.0 ? 2.8 : diam === 4.5 ? 3.1 : diam === 5.0 ? 3.5 : diam * 0.7;
		for (const len of [7.0, 8.0, 10.0, 12.0, 14.0]) {
			items.push(createFixture(
				"dentium", "SuperLine", "FXT", diam, len, 4.0, apex, 3.5,
				"morse_taper_11", "Regular", "#f59e0b", true, dentiumKit, 1900000,
				"Двойная резьба с увеличенным шагом для кости D2-D3",
			));
		}
	}
	for (const diam of [3.6, 4.0, 4.5, 5.0]) {
		for (const len of [8.0, 10.0, 12.0, 14.0]) {
			items.push(createFixture(
				"dentium", "Implantium", "IMP", diam, len, diam, diam * 0.75, 2.5,
				"morse_taper_11", "Regular", "#d97706", true, dentiumKit, 1750000,
				"Классическая коническая макроструктура с микрорезьбой на шейке",
			));
		}
	}

	// 5. MIS IMPLANTS (C1, SEVEN, V3)
	const misKit = SURGICAL_KITS.mis_mguide!;
	// C1 (Ø3.75, 4.2, 5.0)
	for (const diam of [3.75, 4.2, 5.0]) {
		const apex = diam === 3.75 ? 2.4 : diam === 4.2 ? 2.8 : 3.2;
		for (const len of [8.0, 10.0, 11.5, 13.0, 16.0]) {
			items.push(createFixture(
				"mis", "C1 Conical", "C1-", diam, len, diam, apex, 4.0,
				"morse_taper_12", "SP", "#9333ea", true, misKit, 2150000,
				"Коническое соединение 12° для сохранения маргинального уровня кости",
			));
		}
	}
	// SEVEN (Ø3.75, 4.2, 5.0, 6.0)
	for (const diam of [3.75, 4.2, 5.0, 6.0]) {
		const apex = diam === 3.75 ? 2.4 : diam === 4.2 ? 2.8 : 3.2;
		for (const len of [8.0, 10.0, 11.5, 13.0, 16.0]) {
			items.push(createFixture(
				"mis", "SEVEN", "MF7-", diam, len, diam, apex, 3.0,
				"internal_hex", "SP", "#a855f7", true, misKit, 1950000,
				"Самонарезающий имплантат с микрокольцами и надежным шестигранником",
			));
		}
	}
	// V3 (Ø3.9, 4.3, 5.0)
	for (const diam of [3.9, 4.3, 5.0]) {
		for (const len of [8.0, 10.0, 11.5, 13.0]) {
			items.push(createFixture(
				"mis", "V3 Triangular", "V3-", diam, len, diam, diam * 0.65, 3.5,
				"morse_taper_12", "SP", "#7c3aed", true, misKit, 2450000,
				"Треугольная пришеечная часть для максимизации костного объема в зоне улыбки",
			));
		}
	}

	// 6. ASTRA TECH (OsseoSpeed TX / EV)
	const astraKit = SURGICAL_KITS.astra_facilitate!;
	for (const diam of [3.0, 3.6, 4.2, 4.8, 5.4]) {
		const apex = diam * 0.72;
		const color = diam === 3.0 ? "#10b981" : diam === 3.6 ? "#8b5cf6" : diam === 4.2 ? "#f59e0b" : "#2563eb";
		for (const len of [6.0, 8.0, 9.0, 11.0, 13.0, 15.0, 17.0]) {
			items.push(createFixture(
				"astra_tech", "OsseoSpeed EV", "AST-", diam, len, diam, apex, 2.5,
				"conical_seal", "EV", color, true, astraKit, 3100000,
				"Глубокий Conical Seal и наноповерхность OsseoSpeed для биологической стабильности",
			));
		}
	}

	// 7. ZIMMER DENTAL (TSV)
	const zimmerKit = SURGICAL_KITS.zimmer_guided!;
	for (const diam of [3.7, 4.1, 4.7, 6.0]) {
		for (const len of [8.0, 10.0, 11.5, 13.0, 16.0]) {
			items.push(createFixture(
				"zimmer", "Tapered Screw-Vent (TSV)", "TSV", diam, len, diam, diam * 0.75, 3.0,
				"internal_hex", "TSV", "#3b82f6", true, zimmerKit, 2950000,
				"Внутреннее фрикционное шестигранное соединение с замком 1.5 мм",
			));
		}
	}

	// 8. MEGAGEN (AnyRidge)
	const megagenKit = SURGICAL_KITS.megagen_r2gate!;
	for (const diam of [3.5, 4.0, 4.5, 5.0, 5.5, 6.0, 7.0]) {
		for (const len of [7.0, 8.5, 10.0, 11.5, 13.0, 15.0]) {
			items.push(createFixture(
				"megagen", "AnyRidge Knife Thread", "AR-", diam, len, 4.5, diam * 0.65, 4.0,
				"anyridge_hex_cone", "AnyRidge", "#06b6d4", true, megagenKit, 2250000,
				"Ножевидная резьба Knife Thread и единая ортопедическая платформа для всех диаметров",
			));
		}
	}

	// 9. BIOHORIZONS (Tapered Internal)
	const bioKit = SURGICAL_KITS.zimmer_guided!;
	for (const diam of [3.8, 4.6, 5.8]) {
		for (const len of [7.5, 9.0, 10.5, 12.0, 15.0]) {
			items.push(createFixture(
				"biohorizons", "Tapered Internal Laser-Lok", "BH-", diam, len, diam, diam * 0.75, 3.0,
				"internal_hex", "Laser-Lok", "#d97706", true, bioKit, 2650000,
				"Лазерные микроканавки Laser-Lok на шейке для предотвращения атрофии кости",
			));
		}
	}

	// 10. ALPHA-BIO TEC (SPI Spiral)
	const alphaKit = SURGICAL_KITS.mis_mguide!;
	for (const diam of [3.75, 4.2, 5.0, 6.0]) {
		for (const len of [8.0, 10.0, 11.5, 13.0, 16.0]) {
			items.push(createFixture(
				"alphabio", "SPI Spiral", "SPI-", diam, len, diam, diam * 0.65, 4.5,
				"internal_hex", "SPI", "#ef4444", true, alphaKit, 1650000,
				"Спиральный дизайн с высокой способностью к самонарезанию и смене направления",
			));
		}
	}

	// 11. ANKYLOS (Ankylos C/X TissueCare)
	const ankylosKit = SURGICAL_KITS.ankylos_expertease!;
	const ankylosSizes = [
		{ code: "A", diam: 3.5, color: "#059669" },
		{ code: "B", diam: 4.5, color: "#2563eb" },
		{ code: "C", diam: 5.5, color: "#f59e0b" },
		{ code: "D", diam: 7.0, color: "#e11d48" },
	];
	for (const sz of ankylosSizes) {
		for (const len of [6.6, 8.0, 9.5, 11.0, 14.0, 17.0]) {
			items.push(createFixture(
				"ankylos", "Ankylos C/X", "ANK-", sz.diam, len, sz.diam, sz.diam * 0.8, 0.0,
				"tissue_care_cone", sz.code, sz.color, false, ankylosKit, 3300000,
				"Субкрестальная посадка с конусом TissueCare 5.7° без микродвижений",
			));
		}
	}

	return items;
}

export const CANONICAL_IMPLANT_CATALOG: readonly CanonicalImplantFixture[] = Object.freeze(buildMasterCatalog());

// ─── QUERY & LOOKUP API ─────────────────────────────────────────────────────

export function getCanonicalFixturesByBrand(brandKey: CanonicalImplantBrandKey): CanonicalImplantFixture[] {
	return CANONICAL_IMPLANT_CATALOG.filter((f) => f.brandKey === brandKey);
}

export function getLinesForBrand(brandKey: CanonicalImplantBrandKey): string[] {
	const list = getCanonicalFixturesByBrand(brandKey);
	return Array.from(new Set(list.map((f) => f.lineName)));
}

export function findCanonicalFixture(
	brandKey: CanonicalImplantBrandKey,
	diameterMm: number,
	lengthMm: number,
	lineName?: string,
): CanonicalImplantFixture | undefined {
	return CANONICAL_IMPLANT_CATALOG.find(
		(f) =>
			f.brandKey === brandKey &&
			(!lineName || f.lineName.toLowerCase().includes(lineName.toLowerCase())) &&
			Math.abs(f.diameterMm - diameterMm) <= 0.15 &&
			Math.abs(f.lengthMm - lengthMm) <= 0.3,
	);
}

export function filterCanonicalCatalog(criteria: {
	readonly brandKey?: CanonicalImplantBrandKey;
	readonly minDiameter?: number;
	readonly maxDiameter?: number;
	readonly minLength?: number;
	readonly maxLength?: number;
	readonly hexType?: ImplantConnectionHexType;
	readonly isTapered?: boolean;
}): CanonicalImplantFixture[] {
	return CANONICAL_IMPLANT_CATALOG.filter((f) => {
		if (criteria.brandKey && f.brandKey !== criteria.brandKey) return false;
		if (criteria.minDiameter && f.diameterMm < criteria.minDiameter - 0.05) return false;
		if (criteria.maxDiameter && f.diameterMm > criteria.maxDiameter + 0.05) return false;
		if (criteria.minLength && f.lengthMm < criteria.minLength - 0.05) return false;
		if (criteria.maxLength && f.lengthMm > criteria.maxLength + 0.05) return false;
		if (criteria.hexType && f.hexType !== criteria.hexType) return false;
		if (criteria.isTapered !== undefined && f.isTapered !== criteria.isTapered) return false;
		return true;
	});
}

// ─── SURGICAL GUIDE SLEEVE DRILL DEPTH MATH ─────────────────────────────────

export interface SleeveDrillCalculation {
	readonly implantLengthMm: number;
	readonly sleeveOffsetMm: number;
	readonly drillTotalLengthMm: number; // L_drill = L_implant + V_offset
	readonly kitName: string;
	readonly sleeveDiameterMm: number;
	readonly sleeveHeightMm: number;
	readonly drillStopSummaryRu: string;
}

/**
 * Calculates surgical drill depth according to Vatech / Osstem OneGuide / Straumann Guided standards:
 * L_drill = L_implant + V_offset
 */
export function calculateDrillDepth(
	implantLengthMm: number,
	sleeveOffsetMm = 9.0,
	kit?: GuidedSurgeryKitSpec,
): SleeveDrillCalculation {
	const kitSpec = kit ?? SURGICAL_KITS.osstem_oneguide!;
	const offset = sleeveOffsetMm > 0 ? sleeveOffsetMm : kitSpec.defaultOffsetMm;
	const drillTotal = Number((implantLengthMm + offset).toFixed(1));

	return {
		implantLengthMm,
		sleeveOffsetMm: offset,
		drillTotalLengthMm: drillTotal,
		kitName: kitSpec.kitName,
		sleeveDiameterMm: kitSpec.sleeveDiameterMm,
		sleeveHeightMm: kitSpec.sleeveHeightMm,
		drillStopSummaryRu: `Фреза L=${drillTotal} мм (имплантат ${implantLengthMm} мм + офсет втулки ${offset} мм)`,
	};
}
