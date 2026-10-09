import { BUILT_IN_TEMPLATES } from "./builtinTemplates.js";
import type {
	InteractiveButton,
	RenderedTemplate,
	SupportedLocale,
	TemplateDefinition,
} from "./types.js";
import { interpolateVariables } from "./variableResolver.js";

export class TemplateEngine {
	private readonly customTemplates: Map<string, TemplateDefinition> = new Map();

	/**
	 * Register a custom template into the engine.
	 */
	public registerTemplate(template: TemplateDefinition): void {
		this.customTemplates.set(template.templateKey, template);
	}

	/**
	 * Renders a template by key, locale, and context variables.
	 */
	public render(
		templateKey: string,
		locale: SupportedLocale | string = "ru",
		context: Record<string, unknown> = {},
	): RenderedTemplate {
		const def =
			this.customTemplates.get(templateKey) || BUILT_IN_TEMPLATES[templateKey];

		if (!def) {
			// Fallback generic template
			const bodyText = context.bodyText
				? String(context.bodyText)
				: `Уведомление: ${templateKey}`;
			return {
				templateKey,
				locale,
				subject: (context.subject as string) || "Уведомление клиники",
				bodyText: interpolateVariables(bodyText, context),
				buttons: (context.buttons as InteractiveButton[]) || [],
			};
		}

		// Resolve locale with fallback to 'ru' then first available
		const localeData =
			def.locales[locale] || def.locales.ru || Object.values(def.locales)[0];

		if (!localeData) {
			throw new Error(
				`No locale definition available for template '${templateKey}'`,
			);
		}

		const renderedSubject = interpolateVariables(localeData.subject, context);
		const renderedBody = interpolateVariables(localeData.bodyText, context);
		const renderedHtml = localeData.bodyHtml
			? interpolateVariables(localeData.bodyHtml, context)
			: undefined;

		const result: RenderedTemplate = {
			templateKey,
			locale,
			subject: renderedSubject,
			bodyText: renderedBody,
		};
		if (renderedHtml !== undefined) {
			result.bodyHtml = renderedHtml;
		}
		if (localeData.buttons) {
			result.buttons = [...localeData.buttons];
		}
		return result;
	}
}

export const templateEngine = new TemplateEngine();
