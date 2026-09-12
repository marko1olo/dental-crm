/**
 * DENTAL IMPLANT SYSTEM LIBRARY & SURGICAL SPECIFICATIONS
 * Comprehensive catalog for oral surgery, guided implantology & prosthetic planning.
 *
 * Supported Systems:
 * 1. Straumann (BLX, SLA / Bone Level, Tissue Level, Bone Level Tapered BLT)
 * 2. Nobel Biocare (NobelActive, NobelReplace CC, NobelReplace Tri-Channel)
 * 3. Osstem (TS III SA, TS III CA)
 * 4. Dentium (SuperLine, SimpleLine II)
 * 5. Astra Tech (OsseoSpeed EV)
 *
 * All pricing is stored in kopeck-exact integers (1 RUB = 100 kopecks).
 */

export type ImplantBrand =
	| "straumann"
	| "nobel_biocare"
	| "osstem"
	| "dentium"
	| "astra_tech";

export type PlatformType = "conical" | "internal_hex" | "external_hex";

export interface DrillStep {
	readonly stepNumber: number;
	readonly drillName: string;
	readonly diameterMm: number;
	readonly targetRpm: number;
	readonly maxRpm: number;
	readonly irrigation: "copious_sterile_saline" | "moderate_sterile_saline";
	readonly depthGuide: string;
	readonly isBoneDenseOnly?: boolean; // Required only for D1/D2 bone
	readonly isBoneSoftOptional?: boolean; // Skipped in D4 bone
}

export interface GuidedSleeveSpec {
	readonly sleeveDiameterMm: number;
	readonly sleeveHeightMm: number;
	readonly offsetMm: number;
	readonly sleeveArticle: string;
}

export interface ImplantFixture {
	readonly id: string;
	readonly brand: ImplantBrand;
	readonly brandName: string;
	readonly brandCountry: string;
	readonly line: string;
	readonly lineDescription: string;
	readonly diameterMm: number;
	readonly lengthMm: number;
	readonly platformType: PlatformType;
	readonly platformName: string;
	readonly platformDiameterMm: number;
	readonly apexDiameterMm: number;
	readonly surfaceTreatment: string;
	readonly surfaceDescription: string;
	readonly articleNumber: string;
	readonly guidedSleeve: GuidedSleeveSpec;
	readonly drillSequence: readonly DrillStep[];
	// Financial breakdown (kopeck-exact, integer)
	readonly fixturePriceKopecks: number;
	readonly healingCapPriceKopecks: number;
	readonly transferPriceKopecks: number;
	readonly standardAbutmentPriceKopecks: number;
	readonly guidedSleevePriceKopecks: number;
}

export interface BrandMetadata {
	readonly brand: ImplantBrand;
	readonly name: string;
	readonly country: string;
	readonly lines: readonly string[];
	readonly defaultPlatform: PlatformType;
	readonly connectionDescription: string;
}

export const IMPLANT_BRANDS_METADATA: Record<ImplantBrand, BrandMetadata> = {
	straumann: {
		brand: "straumann",
		name: "Straumann",
		country: "Швейцария",
		lines: ["BLX", "Bone Level (SLA)", "Tissue Level", "Bone Level Tapered (BLT)"],
		defaultPlatform: "conical",
		connectionDescription: "TorcFit™ / CrossFit® Conical / SynOcta® 8°",
	},
	nobel_biocare: {
		brand: "nobel_biocare",
		name: "Nobel Biocare",
		country: "Швейцария / Швеция",
		lines: ["NobelActive", "NobelReplace CC", "NobelReplace Tapered"],
		defaultPlatform: "conical",
		connectionDescription: "Conical Connection (NP/RP/WP) / Tri-channel",
	},
	osstem: {
		brand: "osstem",
		name: "Osstem",
		country: "Южная Корея",
		lines: ["TS III SA", "TS III CA"],
		defaultPlatform: "conical",
		connectionDescription: "11° Morse Taper + Internal Hex (Mini / Regular)",
	},
	dentium: {
		brand: "dentium",
		name: "Dentium",
		country: "Южная Корея",
		lines: ["SuperLine", "SimpleLine II"],
		defaultPlatform: "conical",
		connectionDescription: "11° Conical Seal Internal Hex / Octa",
	},
	astra_tech: {
		brand: "astra_tech",
		name: "Astra Tech",
		country: "Швеция",
		lines: ["OsseoSpeed EV"],
		defaultPlatform: "conical",
		connectionDescription: "Conical Seal Design™ EV",
	},
};

// ─── DRILL PROTOCOL GENERATORS ──────────────────────────────────────────────

function buildStraumannDrillSequence(diameter: number): DrillStep[] {
	const steps: DrillStep[] = [
		{
			stepNumber: 1,
			drillName: "Круглый маркировочный бор (Round Bur)",
			diameterMm: 2.3,
			targetRpm: 1200,
			maxRpm: 1500,
			irrigation: "copious_sterile_saline",
			depthGuide: "Маркировка кортикального слоя гребня",
		},
		{
			stepNumber: 2,
			drillName: "Пилотное сверло BLX / BL Ø2.2 мм",
			diameterMm: 2.2,
			targetRpm: 1000,
			maxRpm: 1200,
			irrigation: "copious_sterile_saline",
			depthGuide: "Формирование оси на полную длину имплантата",
		},
	];

	if (diameter >= 3.3) {
		steps.push({
			stepNumber: steps.length + 1,
			drillName: "Формирующее сверло Ø2.8 мм (BLX/BL Basic)",
			diameterMm: 2.8,
			targetRpm: 800,
			maxRpm: 1000,
			irrigation: "copious_sterile_saline",
			depthGuide: "Препарирование на рабочую длину",
		});
	}

	if (diameter >= 3.75) {
		steps.push({
			stepNumber: steps.length + 1,
			drillName: "Формирующее сверло Ø3.5 мм (BLX Basic)",
			diameterMm: 3.5,
			targetRpm: 600,
			maxRpm: 800,
			irrigation: "copious_sterile_saline",
			depthGuide: "Препарирование на рабочую длину",
		});
	}

	if (diameter >= 4.1) {
		steps.push({
			stepNumber: steps.length + 1,
			drillName: "Формирующее сверло Ø3.8 мм / Ø4.2 мм",
			diameterMm: 3.8,
			targetRpm: 500,
			maxRpm: 600,
			irrigation: "copious_sterile_saline",
			depthGuide: "Препарирование на рабочую длину",
		});
	}

	if (diameter >= 4.8) {
		steps.push({
			stepNumber: steps.length + 1,
			drillName: "Формирующее сверло Ø4.5 мм (BL Wide)",
			diameterMm: 4.5,
			targetRpm: 400,
			maxRpm: 500,
			irrigation: "copious_sterile_saline",
			depthGuide: "Препарирование на рабочую длину",
		});
	}

	// Profile & Tap for dense bone
	steps.push({
		stepNumber: steps.length + 1,
		drillName: `Профайлер шейки Straumann Profile Drill Ø${diameter.toFixed(1)} мм`,
		diameterMm: diameter,
		targetRpm: 300,
		maxRpm: 350,
		irrigation: "copious_sterile_saline",
		depthGuide: "Препарирование кортикальной шейки (D1/D2)",
		isBoneDenseOnly: true,
	});

	steps.push({
		stepNumber: steps.length + 1,
		drillName: `Метчик костный Straumann Bone Tap Ø${diameter.toFixed(1)} мм`,
		diameterMm: diameter,
		targetRpm: 15,
		maxRpm: 25,
		irrigation: "copious_sterile_saline",
		depthGuide: "Нарезание резьбы в плотной кости D1/D2",
		isBoneDenseOnly: true,
	});

	return steps;
}

function buildNobelDrillSequence(diameter: number): DrillStep[] {
	const steps: DrillStep[] = [
		{
			stepNumber: 1,
			drillName: "Прецизионный бор Nobel Precision Drill",
			diameterMm: 1.8,
			targetRpm: 1200,
			maxRpm: 1500,
			irrigation: "copious_sterile_saline",
			depthGuide: "Точечное позиционирование и перфорация кортикального слоя",
		},
		{
			stepNumber: 2,
			drillName: "Пилотное коническое сверло Nobel Ø2.0 мм",
			diameterMm: 2.0,
			targetRpm: 1000,
			maxRpm: 1200,
			irrigation: "copious_sterile_saline",
			depthGuide: "Формирование первичного ложа на рабочую длину",
		},
	];

	if (diameter >= 3.5) {
		steps.push({
			stepNumber: steps.length + 1,
			drillName: "Коническое сверло Nobel Tapered Drill Ø(2.4–2.8) мм",
			diameterMm: 2.8,
			targetRpm: 800,
			maxRpm: 1000,
			irrigation: "copious_sterile_saline",
			depthGuide: "Формирование ложа NP",
		});
	}

	if (diameter >= 4.3) {
		steps.push({
			stepNumber: steps.length + 1,
			drillName: "Коническое сверло Nobel Tapered Drill Ø(3.2–3.6) мм",
			diameterMm: 3.6,
			targetRpm: 600,
			maxRpm: 800,
			irrigation: "copious_sterile_saline",
			depthGuide: "Формирование ложа RP",
		});
	}

	if (diameter >= 5.0) {
		steps.push({
			stepNumber: steps.length + 1,
			drillName: "Коническое сверло Nobel Tapered Drill Ø(4.2–4.6) мм",
			diameterMm: 4.6,
			targetRpm: 400,
			maxRpm: 600,
			irrigation: "copious_sterile_saline",
			depthGuide: "Формирование ложа WP",
		});
	}

	steps.push({
		stepNumber: steps.length + 1,
		drillName: `Кортикальная развертка Nobel Dense Bone Drill Ø${diameter.toFixed(1)} мм`,
		diameterMm: diameter,
		targetRpm: 300,
		maxRpm: 400,
		irrigation: "copious_sterile_saline",
		depthGuide: "Снятие напряжения кортикальной пластины (D1/D2)",
		isBoneDenseOnly: true,
	});

	return steps;
}

function buildOsstemDrillSequence(diameter: number): DrillStep[] {
	const steps: DrillStep[] = [
		{
			stepNumber: 1,
			drillName: "Направляющее сверло Osstem Guide Drill",
			diameterMm: 2.0,
			targetRpm: 1200,
			maxRpm: 1500,
			irrigation: "copious_sterile_saline",
			depthGuide: "Точечное центрирование по гребню",
		},
		{
			stepNumber: 2,
			drillName: "Пилотное сверло Osstem Taper Ø2.2 мм",
			diameterMm: 2.2,
			targetRpm: 1000,
			maxRpm: 1200,
			irrigation: "copious_sterile_saline",
			depthGuide: "Формирование начального канала на рабочую длину",
		},
	];

	if (diameter >= 3.5) {
		steps.push({
			stepNumber: steps.length + 1,
			drillName: "Коническое сверло Osstem Taper Drill Ø3.0 мм",
			diameterMm: 3.0,
			targetRpm: 800,
			maxRpm: 1000,
			irrigation: "copious_sterile_saline",
			depthGuide: "Препарирование для Mini/Regular",
		});
	}

	if (diameter >= 4.0) {
		steps.push({
			stepNumber: steps.length + 1,
			drillName: "Коническое сверло Osstem Taper Drill Ø3.5 мм",
			diameterMm: 3.5,
			targetRpm: 600,
			maxRpm: 800,
			irrigation: "copious_sterile_saline",
			depthGuide: "Препарирование для Regular Ø4.0",
		});
	}

	if (diameter >= 4.5) {
		steps.push({
			stepNumber: steps.length + 1,
			drillName: "Коническое сверло Osstem Taper Drill Ø4.0 мм",
			diameterMm: 4.0,
			targetRpm: 500,
			maxRpm: 700,
			irrigation: "copious_sterile_saline",
			depthGuide: "Препарирование для Regular Ø4.5",
		});
	}

	if (diameter >= 5.0) {
		steps.push({
			stepNumber: steps.length + 1,
			drillName: "Коническое сверло Osstem Taper Drill Ø4.5 мм",
			diameterMm: 4.5,
			targetRpm: 400,
			maxRpm: 600,
			irrigation: "copious_sterile_saline",
			depthGuide: "Препарирование для Regular Ø5.0",
		});
	}

	steps.push({
		stepNumber: steps.length + 1,
		drillName: `Кортикальная фреза Osstem Cortical Drill Ø${diameter.toFixed(1)} мм`,
		diameterMm: diameter,
		targetRpm: 300,
		maxRpm: 400,
		irrigation: "copious_sterile_saline",
		depthGuide: "Расширение входа кортикального слоя",
		isBoneDenseOnly: true,
	});

	return steps;
}

function buildDentiumDrillSequence(diameter: number): DrillStep[] {
	const steps: DrillStep[] = [
		{
			stepNumber: 1,
			drillName: "Начальное центрирующее сверло Dentium Lindemann Drill",
			diameterMm: 2.0,
			targetRpm: 1200,
			maxRpm: 1500,
			irrigation: "copious_sterile_saline",
			depthGuide: "Прохождение кортикальной пластинки",
		},
		{
			stepNumber: 2,
			drillName: "Пилотное ступенчатое сверло Dentium Pilot Drill Ø2.2/2.6 мм",
			diameterMm: 2.6,
			targetRpm: 1000,
			maxRpm: 1200,
			irrigation: "copious_sterile_saline",
			depthGuide: "Задание глубины и оси ложа",
		},
	];

	if (diameter >= 3.6) {
		steps.push({
			stepNumber: steps.length + 1,
			drillName: "Формирующее сверло Dentium SuperLine Drill Ø3.0/3.4 мм",
			diameterMm: 3.4,
			targetRpm: 800,
			maxRpm: 1000,
			irrigation: "copious_sterile_saline",
			depthGuide: "Подготовка ложа Ø3.6",
		});
	}

	if (diameter >= 4.0) {
		steps.push({
			stepNumber: steps.length + 1,
			drillName: "Формирующее сверло Dentium SuperLine Drill Ø3.4/3.8 мм",
			diameterMm: 3.8,
			targetRpm: 600,
			maxRpm: 800,
			irrigation: "copious_sterile_saline",
			depthGuide: "Подготовка ложа Ø4.0",
		});
	}

	if (diameter >= 4.5) {
		steps.push({
			stepNumber: steps.length + 1,
			drillName: "Формирующее сверло Dentium SuperLine Drill Ø3.9/4.3 мм",
			diameterMm: 4.3,
			targetRpm: 500,
			maxRpm: 700,
			irrigation: "copious_sterile_saline",
			depthGuide: "Подготовка ложа Ø4.5",
		});
	}

	if (diameter >= 5.0) {
		steps.push({
			stepNumber: steps.length + 1,
			drillName: "Формирующее сверло Dentium SuperLine Drill Ø4.4/4.8 мм",
			diameterMm: 4.8,
			targetRpm: 400,
			maxRpm: 600,
			irrigation: "copious_sterile_saline",
			depthGuide: "Подготовка ложа Ø5.0",
		});
	}

	steps.push({
		stepNumber: steps.length + 1,
		drillName: `Зенкер кортикальный Dentium Countersink Ø${diameter.toFixed(1)} мм`,
		diameterMm: diameter,
		targetRpm: 300,
		maxRpm: 400,
		irrigation: "copious_sterile_saline",
		depthGuide: "Зенкование кортикального края",
		isBoneDenseOnly: true,
	});

	return steps;
}

function buildAstraDrillSequence(diameter: number): DrillStep[] {
	const steps: DrillStep[] = [
		{
			stepNumber: 1,
			drillName: "Прецизионный направляющий бор Astra Tech Precision Drill",
			diameterMm: 1.9,
			targetRpm: 1200,
			maxRpm: 1500,
			irrigation: "copious_sterile_saline",
			depthGuide: "Маркировка и кортикальная пенетрация",
		},
		{
			stepNumber: 2,
			drillName: "Направляющее сверло Astra Guide Drill EV Ø2.0 мм",
			diameterMm: 2.0,
			targetRpm: 1000,
			maxRpm: 1200,
			irrigation: "copious_sterile_saline",
			depthGuide: "Установка базовой глубины ложа",
		},
	];

	if (diameter >= 3.6) {
		steps.push({
			stepNumber: steps.length + 1,
			drillName: "Спиральное сверло Astra Twist Drill EV Ø2.5/3.1 мм",
			diameterMm: 3.1,
			targetRpm: 800,
			maxRpm: 1000,
			irrigation: "copious_sterile_saline",
			depthGuide: "Препарирование для EV 3.6",
		});
	}

	if (diameter >= 4.2) {
		steps.push({
			stepNumber: steps.length + 1,
			drillName: "Спиральное сверло Astra Twist Drill EV Ø3.1/3.7 мм",
			diameterMm: 3.7,
			targetRpm: 600,
			maxRpm: 800,
			irrigation: "copious_sterile_saline",
			depthGuide: "Препарирование для EV 4.2",
		});
	}

	if (diameter >= 4.8) {
		steps.push({
			stepNumber: steps.length + 1,
			drillName: "Спиральное сверло Astra Twist Drill EV Ø3.7/4.3 мм",
			diameterMm: 4.3,
			targetRpm: 400,
			maxRpm: 600,
			irrigation: "copious_sterile_saline",
			depthGuide: "Препарирование для EV 4.8",
		});
	}

	steps.push({
		stepNumber: steps.length + 1,
		drillName: `Кортикальный расширитель Astra Cortical Drill EV Ø${diameter.toFixed(1)} мм`,
		diameterMm: diameter,
		targetRpm: 300,
		maxRpm: 400,
		irrigation: "copious_sterile_saline",
		depthGuide: "Калибровка кортикального ложа",
		isBoneDenseOnly: true,
	});

	return steps;
}

// ─── MASTER CATALOG GENERATION ──────────────────────────────────────────────

function createFixtures(): ImplantFixture[] {
	const catalog: ImplantFixture[] = [];

	// 1. STRAUMANN
	// BLX
	const straumannBlxDiameters = [3.3, 3.75, 4.1, 4.8];
	const straumannBlxLengths = [8, 10, 12, 14];
	for (const dia of straumannBlxDiameters) {
		for (const len of straumannBlxLengths) {
			catalog.push({
				id: `straumann-blx-${dia}-${len}`,
				brand: "straumann",
				brandName: "Straumann",
				brandCountry: "Швейцария",
				line: "BLX",
				lineDescription: "Самонарезающий конический имплантат с агрессивной резьбой для немедленной нагрузки",
				diameterMm: dia,
				lengthMm: len,
				platformType: "conical",
				platformName: "TorcFit™ Conical",
				platformDiameterMm: dia <= 3.75 ? 3.5 : 4.5,
				apexDiameterMm: Number((dia * 0.65).toFixed(2)),
				surfaceTreatment: "Roxolid® SLActive®",
				surfaceDescription: "Титан-циркониевый сплав (TiZr 15%) с гидрофильной наноструктурированной поверхностью",
				articleNumber: `061.${Math.round(dia * 100)}.${len}`,
				guidedSleeve: {
					sleeveDiameterMm: 5.0,
					sleeveHeightMm: 5.0,
					offsetMm: 9.0,
					sleeveArticle: `STR-GS-${dia}-50`,
				},
				drillSequence: buildStraumannDrillSequence(dia),
				fixturePriceKopecks: 4200000, // 42,000.00 RUB
				healingCapPriceKopecks: 380000, // 3,800.00 RUB
				transferPriceKopecks: 450000, // 4,500.00 RUB
				standardAbutmentPriceKopecks: 1450000, // 14,500.00 RUB
				guidedSleevePriceKopecks: 180000, // 1,800.00 RUB
			});
		}
	}

	// SLA / Bone Level (BL)
	const straumannBlDiameters = [3.3, 3.75, 4.1, 4.8];
	const straumannBlLengths = [8, 10, 12, 14];
	for (const dia of straumannBlDiameters) {
		for (const len of straumannBlLengths) {
			catalog.push({
				id: `straumann-bl-${dia}-${len}`,
				brand: "straumann",
				brandName: "Straumann",
				brandCountry: "Швейцария",
				line: "Bone Level (SLA)",
				lineDescription: "Классический цилиндро-конический имплантат с уровня кости и CrossFit соединением",
				diameterMm: dia,
				lengthMm: len,
				platformType: "conical",
				platformName: dia <= 3.3 ? "CrossFit® NC (3.3)" : "CrossFit® RC (4.1/4.8)",
				platformDiameterMm: dia <= 3.3 ? 3.3 : 4.1,
				apexDiameterMm: Number((dia * 0.72).toFixed(2)),
				surfaceTreatment: "Roxolid® SLA®",
				surfaceDescription: "Крупнозернистая пескоструйная обработка и кислотное травление на сплаве Roxolid",
				articleNumber: `021.${Math.round(dia * 100)}.${len}`,
				guidedSleeve: {
					sleeveDiameterMm: 5.0,
					sleeveHeightMm: 5.0,
					offsetMm: 9.0,
					sleeveArticle: `STR-BL-GS-${dia}`,
				},
				drillSequence: buildStraumannDrillSequence(dia),
				fixturePriceKopecks: 3850000, // 38,500.00 RUB
				healingCapPriceKopecks: 350000, // 3,500.00 RUB
				transferPriceKopecks: 420000, // 4,200.00 RUB
				standardAbutmentPriceKopecks: 1350000, // 13,500.00 RUB
				guidedSleevePriceKopecks: 180000, // 1,800.00 RUB
			});
		}
	}

	// Tissue Level (TL)
	const straumannTlDiameters = [3.3, 4.1, 4.8];
	const straumannTlLengths = [8, 10, 12, 14];
	for (const dia of straumannTlDiameters) {
		for (const len of straumannTlLengths) {
			catalog.push({
				id: `straumann-tl-${dia}-${len}`,
				brand: "straumann",
				brandName: "Straumann",
				brandCountry: "Швейцария",
				line: "Tissue Level",
				lineDescription: "Трансгингивальный имплантат с полированной шейкой 1.8/2.8 мм для одноэтапной методики",
				diameterMm: dia,
				lengthMm: len,
				platformType: "internal_hex",
				platformName: "synOcta® Internal Octagon",
				platformDiameterMm: dia <= 3.3 ? 3.5 : 4.8,
				apexDiameterMm: Number((dia * 0.75).toFixed(2)),
				surfaceTreatment: "Roxolid® SLA®",
				surfaceDescription: "Пескоструйная обработка костной части с гладкой трансгингивальной шейкой",
				articleNumber: `041.${Math.round(dia * 100)}.${len}`,
				guidedSleeve: {
					sleeveDiameterMm: 5.0,
					sleeveHeightMm: 5.0,
					offsetMm: 9.0,
					sleeveArticle: `STR-TL-GS-${dia}`,
				},
				drillSequence: buildStraumannDrillSequence(dia),
				fixturePriceKopecks: 3700000, // 37,000.00 RUB
				healingCapPriceKopecks: 320000, // 3,200.00 RUB
				transferPriceKopecks: 400000, // 4,000.00 RUB
				standardAbutmentPriceKopecks: 1280000, // 12,800.00 RUB
				guidedSleevePriceKopecks: 180000, // 1,800.00 RUB
			});
		}
	}

	// 2. NOBEL BIOCARE
	// NobelActive
	const nobelActiveDiameters = [3.5, 4.3, 5.0];
	const nobelActiveLengths = [8.5, 10.0, 11.5, 13.0, 15.0];
	for (const dia of nobelActiveDiameters) {
		for (const len of nobelActiveLengths) {
			catalog.push({
				id: `nobel-active-${dia}-${len}`,
				brand: "nobel_biocare",
				brandName: "Nobel Biocare",
				brandCountry: "Швейцария / Швеция",
				line: "NobelActive",
				lineDescription: "Имплантат с переменной резьбой и обратным конусом шейки для высокой первичной стабильности",
				diameterMm: dia,
				lengthMm: len,
				platformType: "conical",
				platformName: dia <= 3.5 ? "Conical Connection NP (3.5)" : dia <= 4.3 ? "Conical Connection RP (4.3)" : "Conical Connection WP (5.0)",
				platformDiameterMm: dia <= 3.5 ? 3.5 : dia <= 4.3 ? 4.3 : 5.0,
				apexDiameterMm: Number((dia * 0.58).toFixed(2)),
				surfaceTreatment: "TiUnite®",
				surfaceDescription: "Пористый оксидный слой диоксида титана с высоким содержанием фосфора",
				articleNumber: `35${Math.round(dia * 10)}${Math.round(len * 10)}`,
				guidedSleeve: {
					sleeveDiameterMm: 5.0,
					sleeveHeightMm: 5.0,
					offsetMm: 9.0,
					sleeveArticle: `NB-GS-ACT-${dia}`,
				},
				drillSequence: buildNobelDrillSequence(dia),
				fixturePriceKopecks: 3950000, // 39,500.00 RUB
				healingCapPriceKopecks: 360000, // 3,600.00 RUB
				transferPriceKopecks: 430000, // 4,300.00 RUB
				standardAbutmentPriceKopecks: 1380000, // 13,800.00 RUB
				guidedSleevePriceKopecks: 190000, // 1,900.00 RUB
			});
		}
	}

	// NobelReplace CC
	const nobelReplaceDiameters = [3.5, 4.3, 5.0];
	const nobelReplaceLengths = [8.5, 10.0, 11.5, 13.0, 15.0];
	for (const dia of nobelReplaceDiameters) {
		for (const len of nobelReplaceLengths) {
			catalog.push({
				id: `nobel-replace-cc-${dia}-${len}`,
				brand: "nobel_biocare",
				brandName: "Nobel Biocare",
				brandCountry: "Швейцария / Швеция",
				line: "NobelReplace CC",
				lineDescription: "Корневидный конический имплантат с герметичным коническим соединением",
				diameterMm: dia,
				lengthMm: len,
				platformType: "conical",
				platformName: dia <= 3.5 ? "Conical Connection NP" : "Conical Connection RP/WP",
				platformDiameterMm: dia <= 3.5 ? 3.5 : 4.3,
				apexDiameterMm: Number((dia * 0.68).toFixed(2)),
				surfaceTreatment: "TiUnite®",
				surfaceDescription: "Анодированная оксидная поверхность TiUnite с остеокондуктивной микропористостью",
				articleNumber: `36${Math.round(dia * 10)}${Math.round(len * 10)}`,
				guidedSleeve: {
					sleeveDiameterMm: 5.0,
					sleeveHeightMm: 5.0,
					offsetMm: 9.0,
					sleeveArticle: `NB-GS-REP-${dia}`,
				},
				drillSequence: buildNobelDrillSequence(dia),
				fixturePriceKopecks: 3600000, // 36,000.00 RUB
				healingCapPriceKopecks: 330000, // 3,300.00 RUB
				transferPriceKopecks: 410000, // 4,100.00 RUB
				standardAbutmentPriceKopecks: 1250000, // 12,500.00 RUB
				guidedSleevePriceKopecks: 190000, // 1,900.00 RUB
			});
		}
	}

	// 3. OSSTEM
	// TS III SA
	const osstemSaDiameters = [3.5, 4.0, 4.5, 5.0];
	const osstemSaLengths = [7.0, 8.5, 10.0, 11.5, 13.0];
	for (const dia of osstemSaDiameters) {
		for (const len of osstemSaLengths) {
			catalog.push({
				id: `osstem-ts3-sa-${dia}-${len}`,
				brand: "osstem",
				brandName: "Osstem",
				brandCountry: "Южная Корея",
				line: "TS III SA",
				lineDescription: "Универсальный конический имплантат с микрорезьбой шейки и 11° конусом Морзе",
				diameterMm: dia,
				lengthMm: len,
				platformType: "conical",
				platformName: dia <= 3.5 ? "Mini Platform (11° Hex)" : "Regular Platform (11° Hex)",
				platformDiameterMm: dia <= 3.5 ? 3.5 : 4.0,
				apexDiameterMm: Number((dia * 0.70).toFixed(2)),
				surfaceTreatment: "SA (Sandblasted & Acid-etched)",
				surfaceDescription: "Пескоструйная обработка оксидом алюминия и кислотное травление (Ra 2.5–3.0 мкм)",
				articleNumber: `TS3S${Math.round(dia * 10)}${Math.round(len * 10)}S`,
				guidedSleeve: {
					sleeveDiameterMm: 5.0,
					sleeveHeightMm: 5.0,
					offsetMm: 9.0,
					sleeveArticle: `OSS-GS-TS3-${dia}`,
				},
				drillSequence: buildOsstemDrillSequence(dia),
				fixturePriceKopecks: 1850000, // 18,500.00 RUB
				healingCapPriceKopecks: 180000, // 1,800.00 RUB
				transferPriceKopecks: 220000, // 2,200.00 RUB
				standardAbutmentPriceKopecks: 680000, // 6,800.00 RUB
				guidedSleevePriceKopecks: 120000, // 1,200.00 RUB
			});
		}
	}

	// TS III CA
	const osstemCaDiameters = [3.5, 4.0, 4.5, 5.0];
	const osstemCaLengths = [7.0, 8.5, 10.0, 11.5, 13.0];
	for (const dia of osstemCaDiameters) {
		for (const len of osstemCaLengths) {
			catalog.push({
				id: `osstem-ts3-ca-${dia}-${len}`,
				brand: "osstem",
				brandName: "Osstem",
				brandCountry: "Южная Корея",
				line: "TS III CA",
				lineDescription: "Ультрагидрофильная поверхность в растворе CaCl2 для ускоренной остеоинтеграции",
				diameterMm: dia,
				lengthMm: len,
				platformType: "conical",
				platformName: dia <= 3.5 ? "Mini Platform (11° Hex)" : "Regular Platform (11° Hex)",
				platformDiameterMm: dia <= 3.5 ? 3.5 : 4.0,
				apexDiameterMm: Number((dia * 0.70).toFixed(2)),
				surfaceTreatment: "CA (Calcium Hydrophilic)",
				surfaceDescription: "Кальций-активированная гидрофильная SA поверхность, хранимая в стерильном солевом растворе",
				articleNumber: `TS3C${Math.round(dia * 10)}${Math.round(len * 10)}S`,
				guidedSleeve: {
					sleeveDiameterMm: 5.0,
					sleeveHeightMm: 5.0,
					offsetMm: 9.0,
					sleeveArticle: `OSS-GS-TS3-CA-${dia}`,
				},
				drillSequence: buildOsstemDrillSequence(dia),
				fixturePriceKopecks: 2200000, // 22,000.00 RUB
				healingCapPriceKopecks: 180000, // 1,800.00 RUB
				transferPriceKopecks: 220000, // 2,200.00 RUB
				standardAbutmentPriceKopecks: 680000, // 6,800.00 RUB
				guidedSleevePriceKopecks: 120000, // 1,200.00 RUB
			});
		}
	}

	// 4. DENTIUM
	// SuperLine
	const dentiumSuperLineDiameters = [3.6, 4.0, 4.5, 5.0];
	const dentiumSuperLineLengths = [8.0, 10.0, 12.0, 14.0];
	for (const dia of dentiumSuperLineDiameters) {
		for (const len of dentiumSuperLineLengths) {
			catalog.push({
				id: `dentium-superline-${dia}-${len}`,
				brand: "dentium",
				brandName: "Dentium",
				brandCountry: "Южная Корея",
				line: "SuperLine",
				lineDescription: "Конический имплантат с двойной самонарезающей резьбой и 11° конусным шестигранником",
				diameterMm: dia,
				lengthMm: len,
				platformType: "conical",
				platformName: "11° Conical Seal Internal Hex",
				platformDiameterMm: 4.5, // Dentium single platform concept
				apexDiameterMm: Number((dia * 0.65).toFixed(2)),
				surfaceTreatment: "S.L.A. SuperLine",
				surfaceDescription: "Sandblasting with Large grit & Acid etching остеокондуктивная поверхность",
				articleNumber: `FX${Math.round(dia * 10)}${Math.round(len * 10)}`,
				guidedSleeve: {
					sleeveDiameterMm: 5.0,
					sleeveHeightMm: 5.0,
					offsetMm: 9.0,
					sleeveArticle: `DNT-GS-SL-${dia}`,
				},
				drillSequence: buildDentiumDrillSequence(dia),
				fixturePriceKopecks: 1900000, // 19,000.00 RUB
				healingCapPriceKopecks: 190000, // 1,900.00 RUB
				transferPriceKopecks: 230000, // 2,300.00 RUB
				standardAbutmentPriceKopecks: 690000, // 6,900.00 RUB
				guidedSleevePriceKopecks: 120000, // 1,200.00 RUB
			});
		}
	}

	// SimpleLine II
	const dentiumSimpleLineDiameters = [3.6, 4.0, 4.5, 5.0];
	const dentiumSimpleLineLengths = [8.0, 10.0, 12.0, 14.0];
	for (const dia of dentiumSimpleLineDiameters) {
		for (const len of dentiumSimpleLineLengths) {
			catalog.push({
				id: `dentium-simpleline2-${dia}-${len}`,
				brand: "dentium",
				brandName: "Dentium",
				brandCountry: "Южная Корея",
				line: "SimpleLine II",
				lineDescription: "Одноэтапный имплантат с полированной шейкой и внутренним восьмигранником",
				diameterMm: dia,
				lengthMm: len,
				platformType: "internal_hex",
				platformName: "Internal Octa Platform (4.8)",
				platformDiameterMm: 4.8,
				apexDiameterMm: Number((dia * 0.70).toFixed(2)),
				surfaceTreatment: "S.L.A. SimpleLine",
				surfaceDescription: "SLA пескоструйно-кислотная обработка на теле имплантата с гладким воротником",
				articleNumber: `SL2_${Math.round(dia * 10)}${Math.round(len * 10)}`,
				guidedSleeve: {
					sleeveDiameterMm: 5.0,
					sleeveHeightMm: 5.0,
					offsetMm: 9.0,
					sleeveArticle: `DNT-GS-SMP-${dia}`,
				},
				drillSequence: buildDentiumDrillSequence(dia),
				fixturePriceKopecks: 1800000, // 18,000.00 RUB
				healingCapPriceKopecks: 170000, // 1,700.00 RUB
				transferPriceKopecks: 210000, // 2,100.00 RUB
				standardAbutmentPriceKopecks: 650000, // 6,500.00 RUB
				guidedSleevePriceKopecks: 120000, // 1,200.00 RUB
			});
		}
	}

	// 5. ASTRA TECH
	// OsseoSpeed EV
	const astraDiameters = [3.6, 4.2, 4.8];
	const astraLengths = [8.0, 9.0, 11.0, 13.0, 15.0];
	for (const dia of astraDiameters) {
		for (const len of astraLengths) {
			catalog.push({
				id: `astra-osseospeed-ev-${dia}-${len}`,
				brand: "astra_tech",
				brandName: "Astra Tech",
				brandCountry: "Швеция",
				line: "OsseoSpeed EV",
				lineDescription: "Конический имплантат с микрорезьбой MicroThread™ шейки и фторированной поверхностью",
				diameterMm: dia,
				lengthMm: len,
				platformType: "conical",
				platformName: `Conical Seal Design™ EV (${dia.toFixed(1)})`,
				platformDiameterMm: dia,
				apexDiameterMm: Number((dia * 0.62).toFixed(2)),
				surfaceTreatment: "OsseoSpeed® (Fluoride-modified)",
				surfaceDescription: "Химически модифицированная наноповерхность диоксида титана с ионами фтора",
				articleNumber: `25${Math.round(dia * 10)}${Math.round(len * 10)}`,
				guidedSleeve: {
					sleeveDiameterMm: 5.0,
					sleeveHeightMm: 5.0,
					offsetMm: 9.0,
					sleeveArticle: `AST-GS-EV-${dia}`,
				},
				drillSequence: buildAstraDrillSequence(dia),
				fixturePriceKopecks: 3750000, // 37,500.00 RUB
				healingCapPriceKopecks: 340000, // 3,400.00 RUB
				transferPriceKopecks: 410000, // 4,100.00 RUB
				standardAbutmentPriceKopecks: 1300000, // 13,000.00 RUB
				guidedSleevePriceKopecks: 190000, // 1,900.00 RUB
			});
		}
	}

	return catalog;
}

export const IMPLANT_CATALOG: readonly ImplantFixture[] = Object.freeze(createFixtures());

// ─── QUERY & HELPER UTILITIES ───────────────────────────────────────────────

export function getFixturesByBrand(brand: ImplantBrand): ImplantFixture[] {
	return IMPLANT_CATALOG.filter((f) => f.brand === brand);
}

export function getLinesByBrand(brand: ImplantBrand): string[] {
	const fixtures = getFixturesByBrand(brand);
	return Array.from(new Set(fixtures.map((f) => f.line)));
}

export function getAvailableDiameters(brand: ImplantBrand, line?: string): number[] {
	const filtered = IMPLANT_CATALOG.filter(
		(f) => f.brand === brand && (!line || f.line === line),
	);
	return Array.from(new Set(filtered.map((f) => f.diameterMm))).sort((a, b) => a - b);
}

export function getAvailableLengths(brand: ImplantBrand, line?: string, diameter?: number): number[] {
	const filtered = IMPLANT_CATALOG.filter(
		(f) =>
			f.brand === brand &&
			(!line || f.line === line) &&
			(diameter === undefined || f.diameterMm === diameter),
	);
	return Array.from(new Set(filtered.map((f) => f.lengthMm))).sort((a, b) => a - b);
}

export function findFixture(id: string): ImplantFixture | undefined {
	return IMPLANT_CATALOG.find((f) => f.id === id);
}

export function findFixtureBySpecs(
	brand: ImplantBrand,
	line: string,
	diameterMm: number,
	lengthMm: number,
): ImplantFixture | undefined {
	return IMPLANT_CATALOG.find(
		(f) =>
			f.brand === brand &&
			f.line === line &&
			Math.abs(f.diameterMm - diameterMm) < 0.05 &&
			Math.abs(f.lengthMm - lengthMm) < 0.05,
	);
}

export interface ImplantKitCost {
	readonly fixtureKopecks: number;
	readonly healingCapKopecks: number;
	readonly transferKopecks: number;
	readonly abutmentKopecks: number;
	readonly guidedSleeveKopecks: number;
	readonly totalKitKopecks: number;
	readonly totalRublesFormatted: string;
}

export function calculateKitPriceKopecks(
	fixture: ImplantFixture,
	options?: {
		includeHealingCap?: boolean;
		includeTransfer?: boolean;
		includeAbutment?: boolean;
		includeGuidedSleeve?: boolean;
	},
): ImplantKitCost {
	const includeHealing = options?.includeHealingCap ?? true;
	const includeTransfer = options?.includeTransfer ?? true;
	const includeAbutment = options?.includeAbutment ?? true;
	const includeSleeve = options?.includeGuidedSleeve ?? true;

	const fixtureKopecks = fixture.fixturePriceKopecks;
	const healingCapKopecks = includeHealing ? fixture.healingCapPriceKopecks : 0;
	const transferKopecks = includeTransfer ? fixture.transferPriceKopecks : 0;
	const abutmentKopecks = includeAbutment ? fixture.standardAbutmentPriceKopecks : 0;
	const guidedSleeveKopecks = includeSleeve ? fixture.guidedSleevePriceKopecks : 0;

	const totalKitKopecks =
		fixtureKopecks + healingCapKopecks + transferKopecks + abutmentKopecks + guidedSleeveKopecks;

	const rubles = totalKitKopecks / 100;
	const formatted = rubles.toLocaleString("ru-RU", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}) + " ₽";

	return {
		fixtureKopecks,
		healingCapKopecks,
		transferKopecks,
		abutmentKopecks,
		guidedSleeveKopecks,
		totalKitKopecks,
		totalRublesFormatted: formatted,
	};
}
