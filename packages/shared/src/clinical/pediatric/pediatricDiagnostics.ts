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
// PEDIATRIC CLINICAL DIARY & DIAGNOSTICS (ФОРМА 043/у)
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
 * Generates a structured clinical diary text for pediatric patients (Форма 043/у — Детский протокол).
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
	lines.push("ПРОТОКОЛ ДЕТСКОГО СТОМАТОЛОГИЧЕСКОГО ОСМОТРА (ФОРМА 043/у)");
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
	lines.push(`   • Диспансерный осмотр: через ${cariogram.preventiveProgram.hygieneRecallIntervalMonths} месяца(ев).`);

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

/**
 * Calculates primary caries intensity index КП (к = кариозные, п = пломбированные).
 */
export function calculatePediatricCariesIndex(teethStates: Record<number, string>): {
	k: number;
	p: number;
	kpTotal: number;
	summaryRu: string;
} {
	let k = 0;
	let p = 0;

	for (const tooth of ALL_PRIMARY_TEETH) {
		const state = teethStates[tooth];
		if (!state) continue;

		const lower = state.toLowerCase();
		if (lower.includes("caries") || lower.includes("кариес")) {
			k++;
		} else if (lower.includes("filled") || lower.includes("пломба") || lower.includes("restoration")) {
			p++;
		}
	}

	const kpTotal = k + p;
	let levelRu = "низкая";
	if (kpTotal >= 5) levelRu = "высокая";
	else if (kpTotal >= 3) levelRu = "средняя";

	return {
		k,
		p,
		kpTotal,
		summaryRu: `Индекс КП: ${kpTotal} (К=${k}, П=${p}), интенсивность кариеса: ${levelRu}`,
	};
}
