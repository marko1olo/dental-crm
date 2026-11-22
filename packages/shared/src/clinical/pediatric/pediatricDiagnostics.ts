import { ALL_PRIMARY_TEETH, isPrimaryTooth } from "./constants.js";
import { PRIMARY_TO_PERMANENT_SUCCESSOR_MAP } from "./toothSuccession.js";
import { RESORPTION_STAGE_DEFINITIONS, type ResorptionStagePercent } from "./resorption.js";
import { calculateEruptionTimelineByAge } from "./eruptionChronology.js";
import { calculateCariogramRisk, type CariogramInput } from "./cariogram.js";
import { getFranklDefinition, type FranklRating } from "./franklScale.js";
import {
	calculatePediatricPulpotomyProtocol,
	calculatePediatricFissureSealingProtocol,
	calculatePediatricSilveringProtocol,
	type PediatricPulpotomyOptions,
	type PediatricFissureSealingOptions,
	type PediatricSilveringOptions,
} from "./clinicalProcedures.js";

// ------------------------------------------------------------------------------------------------
// PEDIATRIC CLINICAL DIARY & DIAGNOSTICS (МЕДИЦИНСКАЯ КАРТА / ДНЕВНИК ПРИЁМА)
// ------------------------------------------------------------------------------------------------

export interface PediatricDiaryTextOptions {
	readonly patientAgeYears?: number;
	readonly teethStates?: Record<number, string>;
	readonly resorptionStages?: Record<number, ResorptionStagePercent>;
	readonly cariogramInput?: Partial<CariogramInput>;
	readonly franklRating?: FranklRating;
	readonly silvering?: PediatricSilveringOptions;
	readonly fissureSealing?: PediatricFissureSealingOptions;
	readonly pulpotomy?: PediatricPulpotomyOptions;
	readonly customNotes?: string;
}

/**
 * Generates a structured clinical diary text for pediatric patients (Медицинская карта приёма — Детский протокол).
 * Includes primary teeth resorption stages, mixed dentition analysis, Cariogram risk score, Frankl behavior rating, and preventive plan.
 */
export function generatePediatricCariogramDiaryText(
	options?: PediatricDiaryTextOptions,
): string {
	const age = options?.patientAgeYears ?? 8;
	const timeline = calculateEruptionTimelineByAge(age);
	const cariogram = calculateCariogramRisk(options?.cariogramInput ?? {});
	const resorption = options?.resorptionStages ?? {};
	const teethStates = options?.teethStates ?? {};
	const frankl = options?.franklRating ? getFranklDefinition(options.franklRating) : null;

	const lines: string[] = [];
	lines.push("ПРОТОКОЛ ДЕТСКОГО СТОМАТОЛОГИЧЕСКОГО ОСМОТРА (МЕДИЦИНСКАЯ КАРТА)");
	lines.push("────────────────────────────────────────────────────────────");

	// 1. Психоэмоциональный статус по Франклу (если указан)
	if (frankl) {
		lines.push("1. Психоэмоциональный статус (Шкала Франкла):");
		lines.push(`   • ${frankl.nameRu}`);
		lines.push(`   • Характеристика: ${frankl.descriptionRu}`);
		lines.push(`   • Примененная стратегия: ${frankl.managementStrategiesRu[0] ?? "Tell-Show-Do"}`);
		lines.push("");
	}

	lines.push(`${frankl ? "2" : "1"}. Зубной возраст и фаза сменного прикуса:`);
	lines.push(`   • Хронологический возраст: ${age} лет (расчетный зубной возраст: ${timeline.dentalAgeYears} лет)`);
	lines.push(`   • Фаза прикуса: ${timeline.stageNameRu} (${timeline.stageDescriptionRu})`);
	lines.push(`   • Ожидаемая сменяемость зубов: ${timeline.expectedExchangeDescriptionRu}`);
	lines.push("");

	// 2/3. Статус резорбции корней временных зубов (FDI)
	lines.push(`${frankl ? "3" : "2"}. Физиологическая резорбция корней временных зубов (FDI):`);
	const resorptionEntries = Object.entries(resorption)
		.map(([num, stage]) => ({ tooth: Number(num), stage }))
		.filter((e) => isPrimaryTooth(e.tooth));

	if (resorptionEntries.length > 0) {
		const formattedResorption = resorptionEntries
			.map((e) => {
				const successor = PRIMARY_TO_PERMANENT_SUCCESSOR_MAP[e.tooth];
				const stageDef = RESORPTION_STAGE_DEFINITIONS[e.stage]?.nameRu ?? `${e.stage}%`;
				const succStr = successor ? ` (зачаток постоянного зуба #${successor})` : "";
				return `   • Зуб #${e.tooth}: резорбция ${e.stage}% — ${stageDef}${succStr}`;
			})
			.join("\n");
		lines.push(formattedResorption);
	} else {
		const primaryTeethActive = ALL_PRIMARY_TEETH.filter(
			(t) => teethStates[t] && teethStates[t] !== "Missing" && teethStates[t] !== "Extracted"
		);
		if (primaryTeethActive.length > 0) {
			lines.push(`   • Временные зубы в полости рта: ${primaryTeethActive.join(", ")}`);
			lines.push("   • Резорбция корней соответствует возрастной физиологической норме.");
		} else {
			lines.push("   • Резорбция корней временных зубов протекает физиологически согласно хронологическому возрасту.");
		}
	}
	lines.push("");

	// 3/4. Клиническая оценка риска кариеса
	lines.push(`${frankl ? "4" : "3"}. Клиническая оценка риска кариеса:`);
	lines.push(`   • Категория риска: ${cariogram.riskCategoryNameRu}`);
	lines.push(`   • Характеристика: ${cariogram.riskCategoryDescriptionRu}`);
	lines.push(`   • Доминирующий фактор риска: ${cariogram.dominantRiskFactorRu}`);
	lines.push("");

	// 4/5. Индивидуализированный план профилактики и ремотерапии
	lines.push(`${frankl ? "5" : "4"}. Индивидуализированная программа детской профилактики и ремотерапии:`);
	lines.push(`   • ${cariogram.preventiveProgram.professionalHygieneRu}`);
	lines.push(`   • ${cariogram.preventiveProgram.fluorideVarnishProtocolRu}`);
	lines.push(`   • ${cariogram.preventiveProgram.fissureSealingIndicationRu}`);
	lines.push(`   • ${cariogram.preventiveProgram.homeCareProtocolRu}`);
	lines.push(`   • ${cariogram.preventiveProgram.dietaryGuidanceRu}`);
	lines.push(`   • Плановый контрольный осмотр: через ${cariogram.preventiveProgram.hygieneRecallIntervalMonths} месяца(ев).`);

	// 5/6. Выполненные детские клинические манипуляции
	const procLines: string[] = [];
	if (options?.pulpotomy) {
		const pulp = calculatePediatricPulpotomyProtocol(options.pulpotomy);
		procLines.push(`   • Пульпотомия зуба ${pulp.toothNumber}: лечебная паста ${pulp.subBaseMaterial}, реставрация ${pulp.restorationNameRu}.`);
	}
	if (options?.fissureSealing) {
		const fiss = calculatePediatricFissureSealingProtocol(options.fissureSealing);
		procLines.push(`   • Герметизация фиссур (${fiss.teethNumbers.join(", ")}): ${fiss.methodNameRu}, материал ${fiss.material}.`);
	}
	if (options?.silvering) {
		const silv = calculatePediatricSilveringProtocol(options.silvering);
		procLines.push(`   • Серебрение (${silv.teethNumbers.join(", ")}): препарат ${silv.drug}, ${silv.applicationsCount}-я аппликация.`);
	}

	if (procLines.length > 0) {
		lines.push("");
		lines.push(`${frankl ? "6" : "5"}. Выполненные клинические манипуляции:`);
		procLines.forEach((pl) => lines.push(pl));
	}

	if (options?.customNotes) {
		lines.push("");
		lines.push(`Особые отметки: ${options.customNotes}`);
	}

	return lines.join("\n");
}

/**
 * Validates pediatric pathology for temporary teeth (51..85).
 * Warns against adult-only diagnoses like chronic apical periodontitis with apex closure on unformed or resorbing roots.
 */
export function validatePediatricToothPathology(
	toothNumber: number,
	pathology: string,
): { valid: boolean; reasonRu?: string } {
	if (!isPrimaryTooth(toothNumber)) {
		return { valid: true };
	}

	const lowerPathology = pathology.toLowerCase();

	if (lowerPathology.includes("имплантат") || lowerPathology.includes("имплантация")) {
		return {
			valid: false,
			reasonRu: "Имплантация молочного зуба анатомически невозможна (FDI 51-85).",
		};
	}

	if (lowerPathology.includes("культевая вкладка")) {
		return {
			valid: false,
			reasonRu: "Культевые вкладки не применяются во временном прикусе.",
		};
	}

	return { valid: true };
}

export interface PediatricToothRecord {
	readonly toothNumber: number;
	readonly state?: string | null | undefined;
	readonly surfaces?: unknown;
	readonly notes?: string | null | undefined;
	readonly resorptionStage?: number | undefined;
	readonly isPhysiologicalResorption?: boolean | undefined;
}

export interface PediatricCariesIndicesResult {
	readonly dentitionType: "primary" | "mixed" | "permanent";
	readonly indices: {
		readonly permanent: {
			readonly kpuZ: number;
			readonly kpuP: number;
			readonly c: number;
			readonly p: number;
			readonly u: number;
		};
		readonly primary: {
			readonly kp: number;
			readonly kpSurfaces: number;
			readonly c: number;
			readonly p: number;
			readonly prematurelyExtracted: number;
			readonly surfacesC: number;
			readonly surfacesP: number;
		};
		readonly totalMixedIndex: number;
		readonly cariesActivity: "high" | "medium" | "low";
	};
	readonly counts: {
		readonly primaryTeethCataloged: number;
		readonly permanentTeethCataloged: number;
	};
	readonly summaryRu: string;
}

export function parseToothSurfacesCount(surfaces: unknown): number {
	if (Array.isArray(surfaces)) {
		return surfaces.length > 0 ? surfaces.length : 1;
	}
	if (typeof surfaces === "string") {
		const trimmed = surfaces.trim();
		if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
			try {
				const parsed = JSON.parse(trimmed);
				if (Array.isArray(parsed)) {
					return parsed.length > 0 ? parsed.length : 1;
				}
			} catch {
				// fallback to comma split
			}
		}
		const parts = trimmed.split(",").map((s) => s.trim()).filter(Boolean);
		return parts.length > 0 ? parts.length : 1;
	}
	return 1;
}

export function parseClinicalNotes(notes: string | null | undefined): Record<string, unknown> | null {
	if (!notes) return null;
	const trimmed = notes.trim();
	if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return null;
	try {
		const parsed = JSON.parse(trimmed);
		if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
			return parsed as Record<string, unknown>;
		}
	} catch {
		// Non-JSON notes
	}
	return null;
}

/**
 * Canonical SSOT for pediatric and mixed caries intensity indices (Мандат 8bf).
 * Evaluates deciduous (FDI 51..85) and permanent teeth (11..48), taking into account
 * physiological root resorption, premature tooth loss, tooth surfaces (kpSurfaces / kpuP),
 * and caries activity according to WHO/clinical standards.
 */
export function calculatePediatricIndices(
	teeth: readonly PediatricToothRecord[],
): PediatricCariesIndicesResult {
	let permanentC = 0;
	let permanentP = 0;
	let permanentU = 0;
	let primaryC = 0;
	let primaryP = 0;
	let primaryExtracted = 0;
	let permanentSurfacesC = 0;
	let permanentSurfacesP = 0;
	let primarySurfacesC = 0;
	let primarySurfacesP = 0;
	let primaryCount = 0;
	let permanentCount = 0;

	for (const t of teeth) {
		const isPrimary = isPrimaryTooth(t.toothNumber);
		if (isPrimary) primaryCount++; else permanentCount++;
		const state = t.state || "";
		const surfacesCount = parseToothSurfacesCount(t.surfaces);

		const stateLower = state.toLowerCase();
		const clin = parseClinicalNotes(t.notes);
		const resorptionStage = t.resorptionStage ?? (typeof clin?.resorptionStage === "number" ? clin.resorptionStage : undefined);
		const isPhysiologicalResorption =
			t.isPhysiologicalResorption ||
			stateLower === "resorption" ||
			stateLower === "exfoliated" ||
			stateLower === "exfoliat" ||
			(typeof resorptionStage === "number" && resorptionStage > 0) ||
			Boolean(clin?.isPhysiologicalResorption);

		if (isPrimary) {
			if (
				state === "Caries" ||
				state === "Pulpitis" ||
				state === "Periodontitis" ||
				stateLower.includes("caries") ||
				stateLower.includes("кариес") ||
				stateLower.includes("pulpitis") ||
				stateLower.includes("пульпит")
			) {
				primaryC++;
				primarySurfacesC += surfacesCount;
			} else if (
				state === "Filled" ||
				state === "Crown" ||
				stateLower.includes("filled") ||
				stateLower.includes("пломба") ||
				stateLower.includes("restoration")
			) {
				primaryP++;
				primarySurfacesP += surfacesCount;
			} else if (
				(state === "Extracted" ||
					state === "Missing" ||
					state === "Root" ||
					stateLower.includes("extracted") ||
					stateLower.includes("missing")) &&
				!isPhysiologicalResorption
			) {
				primaryExtracted++;
			}
		} else {
			if (
				state === "Caries" ||
				state === "Pulpitis" ||
				state === "Periodontitis" ||
				stateLower.includes("caries") ||
				stateLower.includes("кариес") ||
				stateLower.includes("pulpitis") ||
				stateLower.includes("пульпит")
			) {
				permanentC++;
				permanentSurfacesC += surfacesCount;
			} else if (
				state === "Filled" ||
				state === "Crown" ||
				state === "Bridge" ||
				stateLower.includes("filled") ||
				stateLower.includes("пломба") ||
				stateLower.includes("restoration")
			) {
				permanentP++;
				permanentSurfacesP += surfacesCount;
			} else if (
				state === "Missing" ||
				state === "Extracted" ||
				state === "Root" ||
				stateLower.includes("missing") ||
				stateLower.includes("extracted")
			) {
				permanentU++;
			}
		}
	}

	const kpuZ = permanentC + permanentP + permanentU;
	const kpuP = permanentSurfacesC + permanentSurfacesP + permanentU;
	const kp = primaryC + primaryP + primaryExtracted;
	const kpSurfaces = primarySurfacesC + primarySurfacesP;
	const mixedIndex = kpuZ + kp;
	const dentitionType: "primary" | "mixed" | "permanent" =
		primaryCount > 0 && permanentCount > 0
			? "mixed"
			: primaryCount > 0 && permanentCount === 0
				? "primary"
				: "permanent";
	const cariesActivity: "high" | "medium" | "low" =
		kpuZ >= 7 || kp >= 5 ? "high" : kpuZ >= 3 || kp >= 2 ? "medium" : "low";

	const activityRu =
		cariesActivity === "high" ? "высокая" : cariesActivity === "medium" ? "средняя" : "низкая";

	const summaryRu =
		dentitionType === "mixed"
			? `Индекс сменного прикуса КПУ(з)+кп: ${mixedIndex} (КПУ(з)=${kpuZ}, кп=${kp}), активность: ${activityRu}`
			: dentitionType === "primary"
				? `Индекс временного прикуса кп(з): ${kp} (к=${primaryC}, п=${primaryP}${primaryExtracted > 0 ? `, у=${primaryExtracted}` : ""}), кп(п): ${kpSurfaces}, активность: ${activityRu}`
				: `Индекс постоянного прикуса КПУ(з): ${kpuZ} (К=${permanentC}, П=${permanentP}, У=${permanentU}), КПУ(п): ${kpuP}, активность: ${activityRu}`;

	return {
		dentitionType,
		indices: {
			permanent: { kpuZ, kpuP, c: permanentC, p: permanentP, u: permanentU },
			primary: {
				kp,
				kpSurfaces,
				c: primaryC,
				p: primaryP,
				prematurelyExtracted: primaryExtracted,
				surfacesC: primarySurfacesC,
				surfacesP: primarySurfacesP,
			},
			totalMixedIndex: mixedIndex,
			cariesActivity,
		},
		counts: {
			primaryTeethCataloged: primaryCount,
			permanentTeethCataloged: permanentCount,
		},
		summaryRu,
	};
}

/**
 * Calculates primary caries intensity index КП (к = кариозные, п = пломбированные).
 * Delegates to canonical calculatePediatricIndices (Mandate 8bf).
 */
export function calculatePediatricCariesIndex(teethStates: Record<number, string>): {
	k: number;
	p: number;
	kpTotal: number;
	summaryRu: string;
} {
	const records: PediatricToothRecord[] = Object.entries(teethStates).map(([num, state]) => ({
		toothNumber: Number(num),
		state,
	}));
	const res = calculatePediatricIndices(records);
	return {
		k: res.indices.primary.c,
		p: res.indices.primary.p,
		kpTotal: res.indices.primary.c + res.indices.primary.p,
		summaryRu: res.summaryRu,
	};
}
