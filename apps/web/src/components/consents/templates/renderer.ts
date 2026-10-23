import type {
	ConsentTemplate,
	ConsentSubstitutionContext,
	RenderedConsentTemplate,
} from "./types";
import { substitutePlaceholders } from "./placeholderSubstitution";

export { getBlankConsentSubstitutionContext } from "./blankContext";
export { substitutePlaceholders, getMissingRequiredPlaceholders } from "./placeholderSubstitution";

/**
 * Полный рендеринг шаблона согласия со всеми секциями
 */
export function renderConsentTemplate(
	template: ConsentTemplate,
	context: ConsentSubstitutionContext,
): RenderedConsentTemplate {
	const renderedSections = template.sections.map((section) => ({
		id: section.id,
		title: substitutePlaceholders(section.title, context),
		content: substitutePlaceholders(section.content, context),
		bullets: section.bullets?.map((b) => substitutePlaceholders(b, context)),
	}));

	const aftercareInstructions = template.aftercareInstructions.map((i) =>
		substitutePlaceholders(i, context),
	);
	const riskFactors = template.riskFactors.map((r) =>
		substitutePlaceholders(r, context),
	);
	const alternativeTreatments = template.alternativeTreatments.map((a) =>
		substitutePlaceholders(a, context),
	);

	// Формируем сплошной текст документа для криптографического хеширования
	const lines: string[] = [];
	lines.push(template.title.toUpperCase());
	lines.push(template.subtitle);
	lines.push(`Нормативное основание: ${template.statutoryBasis}`);
	lines.push("----------------------------------------");

	for (const section of renderedSections) {
		lines.push(section.title);
		lines.push(section.content);
		if (section.bullets && section.bullets.length > 0) {
			for (const bullet of section.bullets) {
				lines.push(`  • ${bullet}`);
			}
		}
		lines.push("");
	}

	if (riskFactors.length > 0) {
		lines.push("СПЕЦИФИЧЕСКИЕ ФАКТОРЫ РИСКА:");
		for (const rf of riskFactors) {
			lines.push(`  - ${rf}`);
		}
		lines.push("");
	}

	if (aftercareInstructions.length > 0) {
		lines.push("РЕКОМЕНДАЦИИ И ОГРАНИЧЕНИЯ:");
		for (const ac of aftercareInstructions) {
			lines.push(`  - ${ac}`);
		}
		lines.push("");
	}

	lines.push(`Дата подписания: ${context.date || new Date().toLocaleDateString("ru-RU")}`);
	lines.push(`Пациент: ${context.patientName || "[ФИО]"}`);
	lines.push(`Врач: ${context.doctorName || "[ФИО]"}`);

	const fullTextContent = lines.join("\n");

	return {
		title: template.title,
		subtitle: template.subtitle,
		statutoryBasis: template.statutoryBasis,
		renderedSections,
		aftercareInstructions,
		riskFactors,
		alternativeTreatments,
		fullTextContent,
	};
}
