/**
 * boneQualityEngine.ts
 *
 * Misch bone classification + drill sequence generator for implantology.
 * Purely algorithmic — no LLM, no external calls.
 */

export type MischClass = "D1" | "D2" | "D3" | "D4";
export type ImplantSystem =
	| "osstem"
	| "straumann"
	| "nobel"
	| "bredent"
	| "mdi"
	| "other";

export interface HUZoneProfile {
	corticalHU: number; // avg HU of coronal 20% (cortical plate)
	cancellousHU: number; // avg HU of middle 60% (trabecular)
	apicalHU: number; // avg HU of apical 20%
}

export interface DrillStep {
	step: number;
	drillType: string;
	diameterMm: number;
	depthMm: number;
	rpmRange: string;
	torqueNcm: string;
	irrigation: boolean;
	note?: string;
}

export interface DrillProtocol {
	mischClass: MischClass;
	implantSystem: ImplantSystem;
	implantDiameterMm: number;
	implantLengthMm: number;
	avgOverallHU: number;
	zones: HUZoneProfile;
	steps: DrillStep[];
	warnings: string[];
	underdrillingApplied: boolean;
	corticalTapRequired: boolean;
}

/**
 * Classify bone density per Misch classification from averaged HU
 */
export function classifyMisch(avgHU: number): MischClass {
	if (avgHU > 1250) return "D1";
	if (avgHU >= 850) return "D2";
	if (avgHU >= 350) return "D3";
	return "D4";
}

/**
 * Extract HU zone profile from an array of HU samples along the implant axis.
 * Expects samples ordered from apex (tip) to neck.
 */
export function extractHUZones(huSamples: number[]): HUZoneProfile {
	if (huSamples.length === 0) {
		return { corticalHU: 0, cancellousHU: 0, apicalHU: 0 };
	}

	const n = huSamples.length;
	const corticalCount = Math.max(1, Math.round(n * 0.2));
	const apicalCount = Math.max(1, Math.round(n * 0.2));

	// Neck zone = first 20% (cortical plate at top)
	const corticalSamples = huSamples.slice(0, corticalCount);
	// Apical zone = last 20%
	const apicalSamples = huSamples.slice(n - apicalCount);
	// Middle zone = cancellous
	const cancellousSamples = huSamples.slice(corticalCount, n - apicalCount);

	const avg = (arr: number[]) =>
		arr.length === 0 ? 0 : arr.reduce((s, v) => s + v, 0) / arr.length;

	return {
		corticalHU: avg(corticalSamples),
		cancellousHU: avg(
			cancellousSamples.length > 0 ? cancellousSamples : huSamples,
		),
		apicalHU: avg(apicalSamples),
	};
}

/**
 * Generate a drill sequence protocol based on bone class, implant system and dimensions.
 */
export function generateDrillProtocol(
	zones: HUZoneProfile,
	system: ImplantSystem,
	diameterMm: number,
	lengthMm: number,
): DrillProtocol {
	const avgHU = (zones.corticalHU + zones.cancellousHU + zones.apicalHU) / 3;
	const mischClass = classifyMisch(avgHU);
	const warnings: string[] = [];
	let underdrillingApplied = false;
	let corticalTapRequired = false;

	const steps: DrillStep[] = [];

	// --- Common first step: Pilot drill ---
	steps.push({
		step: 1,
		drillType: "Pilot Drill",
		diameterMm: 2.0,
		depthMm: lengthMm,
		rpmRange: "800–1000 RPM",
		torqueNcm: "45 Ncm",
		irrigation: true,
		note: "Обязательное охлаждение физраствором",
	});

	if (mischClass === "D1") {
		// Very dense — cortical tap required, low RPM, prevent necrosis
		corticalTapRequired = true;
		warnings.push(
			`D1-кость (HU=${Math.round(avgHU)}): Обязательно кортикальная фреза (Cortical Tap). Низкие обороты! Риск остеонекроза при перегреве.`,
		);

		steps.push({
			step: 2,
			drillType: "Cortical Drill",
			diameterMm: 2.8,
			depthMm: Math.min(4, lengthMm * 0.3),
			rpmRange: "400–600 RPM",
			torqueNcm: "40 Ncm",
			irrigation: true,
			note: "Только кортикальная зона — не глубже 30% длины",
		});
		steps.push({
			step: 3,
			drillType: `Profile Drill ${diameterMm - 0.5}mm`,
			diameterMm: diameterMm - 0.5,
			depthMm: lengthMm,
			rpmRange: "500–700 RPM",
			torqueNcm: "45 Ncm",
			irrigation: true,
			note: "Профильное сверло на 0.5мм меньше номинала",
		});
		steps.push({
			step: 4,
			drillType: "Cortical Tap",
			diameterMm: diameterMm,
			depthMm: Math.min(3, lengthMm * 0.2),
			rpmRange: "15–20 RPM",
			torqueNcm: "50 Ncm",
			irrigation: true,
			note: "Нарезка резьбы только в кортикальной зоне",
		});
		steps.push({
			step: 5,
			drillType: `Final Profile ${diameterMm}mm`,
			diameterMm,
			depthMm: lengthMm,
			rpmRange: "500 RPM",
			torqueNcm: "45 Ncm",
			irrigation: true,
		});
	} else if (mischClass === "D2") {
		steps.push({
			step: 2,
			drillType: "Twist Drill 2.8mm",
			diameterMm: 2.8,
			depthMm: lengthMm,
			rpmRange: "800–1000 RPM",
			torqueNcm: "45 Ncm",
			irrigation: true,
		});
		steps.push({
			step: 3,
			drillType: `Profile Drill ${diameterMm - 0.2}mm`,
			diameterMm: diameterMm - 0.2,
			depthMm: lengthMm,
			rpmRange: "700–900 RPM",
			torqueNcm: "45 Ncm",
			irrigation: true,
		});
		steps.push({
			step: 4,
			drillType: `Final Drill ${diameterMm}mm`,
			diameterMm,
			depthMm: lengthMm,
			rpmRange: "800 RPM",
			torqueNcm: "45 Ncm",
			irrigation: true,
		});
	} else if (mischClass === "D3") {
		steps.push({
			step: 2,
			drillType: "Twist Drill 2.8mm",
			diameterMm: 2.8,
			depthMm: lengthMm,
			rpmRange: "1000–1200 RPM",
			torqueNcm: "35 Ncm",
			irrigation: true,
		});
		steps.push({
			step: 3,
			drillType: `Final Drill ${diameterMm}mm`,
			diameterMm,
			depthMm: lengthMm,
			rpmRange: "1000 RPM",
			torqueNcm: "35 Ncm",
			irrigation: true,
			note: "Нормальный протокол — кость достаточно мягкая",
		});
	} else {
		// D4 — very soft, underdrill 1-1.5 steps to maximize primary stability
		underdrillingApplied = true;
		const effectiveDrill = Math.max(2.0, diameterMm - 1.5);
		warnings.push(
			`D4-кость (HU=${Math.round(avgHU)}): Недопрепарирование (Under-drilling)! Сверло на ${(diameterMm - effectiveDrill).toFixed(1)}мм меньше номинала. Максимальная первичная стабильность.`,
		);
		steps.push({
			step: 2,
			drillType: "Twist Drill 2.0mm",
			diameterMm: 2.0,
			depthMm: lengthMm,
			rpmRange: "1200 RPM",
			torqueNcm: "25 Ncm",
			irrigation: false,
			note: "D4: минимальный диаметр для максимального захвата",
		});
		steps.push({
			step: 3,
			drillType: `Under-profile ${effectiveDrill}mm`,
			diameterMm: effectiveDrill,
			depthMm: lengthMm,
			rpmRange: "1000 RPM",
			torqueNcm: "30 Ncm",
			irrigation: false,
			note: `Намеренно меньше ${diameterMm}мм — компрессионная остеоинтеграция`,
		});
	}

	// System-specific final notes
	const systemNote = getSystemNote(system, mischClass, diameterMm);
	if (systemNote) {
		steps[steps.length - 1]!.note =
			(steps[steps.length - 1]!.note || "") + " | " + systemNote;
	}

	// Angulation note if zones differ significantly (rough heuristic)
	if (Math.abs(zones.corticalHU - zones.apicalHU) > 400) {
		warnings.push(
			`Значительная разница плотности кортикала (${Math.round(zones.corticalHU)} HU) и апекса (${Math.round(zones.apicalHU)} HU). Учитывайте при планировании глубины.`,
		);
	}

	return {
		mischClass,
		implantSystem: system,
		implantDiameterMm: diameterMm,
		implantLengthMm: lengthMm,
		avgOverallHU: avgHU,
		zones,
		steps,
		warnings,
		underdrillingApplied,
		corticalTapRequired,
	};
}

function getSystemNote(
	system: ImplantSystem,
	misch: MischClass,
	diameter: number,
): string {
	switch (system) {
		case "osstem":
			return misch === "D4"
				? `Osstem: TS III SA — активная резьба, рекомендован Ø${diameter}×10mm+`
				: `Osstem: TS III — стандартный протокол`;
		case "straumann":
			return misch === "D1"
				? `Straumann BLT: обязателен Tap бор`
				: `Straumann BLX: самонарезающий — исключить tap`;
		case "nobel":
			return misch === "D4"
				? `Nobel Active: самоконденсирующая резьба — ДОПУСТИМО без финального сверла`
				: `Nobel Parallel CC: стандартный протокол`;
		default:
			return "";
	}
}

/**
 * Human-readable summary for a Misch class
 */
export function mischDescription(cls: MischClass): string {
	switch (cls) {
		case "D1":
			return "D1 — Очень плотная (>1250 HU): кортикальная, трудно сверлить";
		case "D2":
			return "D2 — Плотная (850–1250 HU): идеальна для имплантации";
		case "D3":
			return "D3 — Средняя (350–850 HU): приемлема, хороший прогноз";
		case "D4":
			return "D4 — Мягкая (150–350 HU): риск нестабильности, недопрепарирование";
	}
}
