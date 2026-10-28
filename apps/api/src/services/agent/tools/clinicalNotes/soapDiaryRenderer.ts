/**
 * soapDiaryRenderer.ts — SOAP Clinical Diary Formatter and Text Renderer.
 *
 * Compliant with Mandate 8b / 8zi (Dense module, ~150 lines).
 * Formats clinical diary entries without Soviet bureaucracy jargon.
 */

import type { DentalSpecialty } from "./clinicalNoteTemplates.js";

// ─── TYPES & INTERFACES ───────────────────────────────────────────────────

export interface SoapNoteStructure {
	readonly specialty: DentalSpecialty;
	readonly toothNumber?: number | undefined;
	readonly subjective: {
		readonly complaints: string[];
		readonly anamnesis: string;
		readonly painCharacteristics?: string | undefined;
	};
	readonly objective: {
		readonly extraoralExam?: string | undefined;
		readonly intraoralExam?: string | undefined;
		readonly probing?: string | undefined;
		readonly percussion?: "positive" | "negative" | "slightly_positive" | undefined;
		readonly coldTest?: "positive" | "negative" | "lingering" | undefined;
		readonly xrayFindings?: string | undefined;
		readonly rawObjectiveText: string;
	};
	readonly assessment: {
		readonly icd10Code: string;
		readonly diagnosisTitleRu: string;
		readonly toothNumber?: number | undefined;
		readonly isToothSpecific: boolean;
		readonly validationStatus: "valid" | "invalid";
		readonly validationError?: string | undefined;
		readonly clinicalReasoning?: string | undefined;
	};
	readonly plan: {
		readonly anesthesia?: {
			readonly drug?: string | undefined;
			readonly technique?: string | undefined;
			readonly volumeMl?: number | undefined;
			readonly carpules?: number | undefined;
		} | undefined;
		readonly isolation?: string | undefined;
		readonly procedures: string[];
		readonly materials: string[];
		readonly homeCareRecommendations: string[];
		readonly nextVisit?: string | undefined;
	};
	readonly form043Text: string;
}

// ─── CLINICAL SOAP DIARY TEXT RENDERER ─────────────────────────────────────

export function renderForm043Diary(soap: Omit<SoapNoteStructure, "form043Text">): string {
	const toothStr = soap.toothNumber ? `Зуб: ${soap.toothNumber}` : "Полость рта / Зубной ряд";
	const specialtyRuMap: Record<DentalSpecialty, string> = {
		therapy: "Терапевтическая стоматология",
		orthopedics: "Ортопедическая стоматология",
		surgery: "Хирургическая стоматология",
		periodontics: "Пародонтология",
		pediatric: "Детская стоматология",
		endodontics: "Эндодонтия",
		implantology: "Дентальная имплантация",
		diagnosis: "Диагностический осмотр",
		administrative: "Административная запись",
		general: "Общая стоматология",
	};
	const specialtyRu = specialtyRuMap[soap.specialty] || "Стоматология";

	const lines: string[] = [
		`ДНЕВНИК ВРАЧА-СТОМАТОЛОГА (МЕДИЦИНСКАЯ КАРТА)`,
		`Специальность: ${specialtyRu} | Локализация: ${toothStr}`,
		`─────────────────────────────────────────────────────────────────────────────`,
		`S (Subiectivus / Жалобы и анамнез):`,
		`  • Жалобы: ${soap.subjective.complaints.join("; ") || "Активных жалоб не предъявляет."}`,
		`  • Анамнез: ${soap.subjective.anamnesis || "Без особенностей, аллергоанамнез спокойный."}`,
	];

	if (soap.subjective.painCharacteristics) {
		lines.push(`  • Характер болей: ${soap.subjective.painCharacteristics}`);
	}

	lines.push(
		``,
		`O (Obiectivus / Данные объективного обследования):`,
		`  • Объективный статус: ${soap.objective.rawObjectiveText || "Слизистая оболочка бледно-розовая, чистая."}`,
	);

	if (soap.objective.probing) {
		lines.push(`  • Зондирование: ${soap.objective.probing}`);
	}
	if (soap.objective.percussion) {
		const percMap = {
			positive: "положительная (+)",
			negative: "безболезненная (-)",
			slightly_positive: "слабоположительная (±)",
		};
		lines.push(`  • Перкуссия: ${percMap[soap.objective.percussion]}`);
	}
	if (soap.objective.coldTest) {
		const coldMap = {
			positive: "кратковременная реакция (+)",
			negative: "отрицательная (-)",
			lingering: "длительная ноющая боль (+)",
		};
		lines.push(`  • Холодовая проба: ${coldMap[soap.objective.coldTest]}`);
	}
	if (soap.objective.xrayFindings) {
		lines.push(`  • Рентгенологическое исследование: ${soap.objective.xrayFindings}`);
	}

	lines.push(
		``,
		`A (Assessio / Диагноз по МКБ-10):`,
		`  • [${soap.assessment.icd10Code}] ${soap.assessment.diagnosisTitleRu}${
			soap.assessment.toothNumber ? ` (зуб ${soap.assessment.toothNumber})` : ""
		}`,
	);
	if (soap.assessment.clinicalReasoning) {
		lines.push(`  • Обоснование: ${soap.assessment.clinicalReasoning}`);
	}

	lines.push(``, `P (Planus / Лечение и рекомендации):`);
	if (soap.plan.anesthesia?.drug) {
		lines.push(
			`  • Анестезия: ${soap.plan.anesthesia.technique || "инфильтрационная"} (${
				soap.plan.anesthesia.drug
			}, ${soap.plan.anesthesia.volumeMl ?? 1.7} мл)`,
		);
	}
	if (soap.plan.isolation) {
		lines.push(`  • Изоляция: ${soap.plan.isolation}`);
	}
	if (soap.plan.procedures.length > 0) {
		lines.push(`  • Протокол лечения:`);
		for (const proc of soap.plan.procedures) {
			lines.push(`      - ${proc}`);
		}
	}
	if (soap.plan.materials.length > 0) {
		lines.push(`  • Использованные материалы: ${soap.plan.materials.join(", ")}`);
	}
	if (soap.plan.homeCareRecommendations.length > 0) {
		lines.push(`  • Назначения и рекомендации пациенту:`);
		for (const rec of soap.plan.homeCareRecommendations) {
			lines.push(`      - ${rec}`);
		}
	}
	if (soap.plan.nextVisit) {
		lines.push(`  • Следующий визит: ${soap.plan.nextVisit}`);
	}

	return lines.join("\n");
}
