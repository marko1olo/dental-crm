import { templateEngine } from "./engineClass.js";
import type {
	RenderTemplateOptions,
	RenderedTemplate,
	SupportedLocale,
	TemplateExecutionContext,
} from "./types.js";
import { buildTemplateVariablesMap } from "./variableResolver.js";

function escapeRegExp(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Рендерит HTML-шаблон документа, подставляя реальные данные из контекста.
 * Поддерживает:
 * 1. Синтаксис {{ Токен }}, { Токен }, [ Токен ]
 * 2. Префикс восклицательного знака {!Токен} / {{!Токен}}: при пустом значении
 *    строка / элемент / абзац с токеном полностью скрывается.
 */
export function renderDocumentTemplate(
	templateHtml: string,
	ctx: TemplateExecutionContext,
	options: RenderTemplateOptions = {},
): string {
	if (!templateHtml) return "";

	const emptyPlaceholder = options.emptyPlaceholder ?? "";
	const preserveUnknown = options.preserveUnknownTokens ?? false;
	const varsMap = buildTemplateVariablesMap(ctx);

	let result = templateHtml;

	// ── 1. ОБРАБОТКА ТОКЕНОВ С ВОСКЛИЦАТЕЛЬНЫМ ЗНАКОМ: {!Токен}, {{!Токен}}, [!Токен] ──
	// Если значение пустое — скрывается вся строка или охватывающий тег (<p>, <tr>, <li>, <div>, <br>)
	const exclamationTokenRegex =
		/(?:\{\{|\{|\[)!\s*([А-Яа-яA-Za-z0-9_.-]+)\s*(?:\}\}|\}|\])/g;
	const exclamationTokens = new Set<string>();
	let exMatch: RegExpExecArray | null;
	while ((exMatch = exclamationTokenRegex.exec(result)) !== null) {
		if (exMatch[1]) {
			exclamationTokens.add(exMatch[1].trim());
		}
	}

	for (const tokenName of exclamationTokens) {
		const val = varsMap[tokenName];
		const isFilled = val !== undefined && val !== null && val.trim() !== "";
		const trimmedVal = isFilled ? val.trim() : "";

		const tokenPatterns = [
			`\\{!\\s*${escapeRegExp(tokenName)}\\s*\\}`,
			`\\{\\{!\\s*${escapeRegExp(tokenName)}\\s*\\}\\}`,
			`\\[!\\s*${escapeRegExp(tokenName)}\\s*\\]`,
		];

		for (const patternStr of tokenPatterns) {
			if (isFilled) {
				// Заменяем токен на значение
				result = result.replace(new RegExp(patternStr, "g"), trimmedVal);
			} else {
				// Удаляем родительский блок при пустом значении

				// а) Строка таблицы: <tr...>...{!Token}...</tr>
				const trRegex = new RegExp(
					`<tr[^>]*>(?:(?!<\\/tr>)[\\s\\S])*?${patternStr}(?:(?!<\\/tr>)[\\s\\S])*?<\\/tr>\\s*`,
					"gi",
				);
				result = result.replace(trRegex, "");

				// б) Параграф: <p...>...{!Token}...</p>
				const pRegex = new RegExp(
					`<p[^>]*>(?:(?!<\\/p>)[\\s\\S])*?${patternStr}(?:(?!<\\/p>)[\\s\\S])*?<\\/p>\\s*`,
					"gi",
				);
				result = result.replace(pRegex, "");

				// в) Элемент списка: <li...>...{!Token}...</li>
				const liRegex = new RegExp(
					`<li[^>]*>(?:(?!<\\/li>)[\\s\\S])*?${patternStr}(?:(?!<\\/li>)[\\s\\S])*?<\\/li>\\s*`,
					"gi",
				);
				result = result.replace(liRegex, "");

				// г) Блок div: <div...>...{!Token}...</div>
				const divRegex = new RegExp(
					`<div[^>]*>(?:(?!<\\/div>)[\\s\\S])*?${patternStr}(?:(?!<\\/div>)[\\s\\S])*?<\\/div>\\s*`,
					"gi",
				);
				result = result.replace(divRegex, "");

				// д) Строка с тегом <br>: ... {!Token} ... <br />
				const brRegex = new RegExp(
					`(?:^|>)[^<\\n]*?${patternStr}[^<\\n]*?<br\\s*\\/?>\\s*`,
					"gim",
				);
				result = result.replace(brRegex, (m) => (m.startsWith(">") ? ">" : ""));

				// е) Текстовая строка: вся строка целиком
				const lineRegex = new RegExp(
					`^[^\r\n]*?${patternStr}[^\r\n]*(?:\r?\n|$)`,
					"gm",
				);
				result = result.replace(lineRegex, "");

				// ж) Оставшийся токен (если остался в тексте)
				result = result.replace(new RegExp(patternStr, "g"), "");
			}
		}
	}

	// ── 2. ЗАМЕНА СИНТАКСИСА MUSTACHE: {{ Токен }} ──
	result = result.replace(
		/\{\{\s*([^{}]+?)\s*\}\}/g,
		(match, tokenName: string) => {
			const cleanToken = tokenName.trim();
			if (Object.hasOwn(varsMap, cleanToken)) {
				const val = varsMap[cleanToken];
				return val && val.trim() !== "" ? val : emptyPlaceholder;
			}
			return preserveUnknown ? match : emptyPlaceholder;
		},
	);

	// ── 3. ЗАМЕНА СИНТАКСИСА КВАДРАТНЫХ СКОБОК: [Токен] ──
	result = result.replace(
		/\[([А-Яа-яA-Za-z0-9_.-]+)\]/g,
		(match, tokenName: string) => {
			const cleanToken = tokenName.trim();
			if (Object.hasOwn(varsMap, cleanToken)) {
				const val = varsMap[cleanToken];
				return val && val.trim() !== "" ? val : emptyPlaceholder;
			}
			return preserveUnknown ? match : emptyPlaceholder;
		},
	);

	// ── 4. ЗАМЕНА СИНТАКСИСА ОДИНОЧНЫХ СКОБОК ИДЕНТ: { Токен } ──
	// Проверяем наличие токена в varsMap для исключения CSS-правил
	result = result.replace(
		/\{([А-Яа-яA-Za-z0-9_.-]+)\}/g,
		(match, tokenName: string) => {
			const cleanToken = tokenName.trim();
			if (Object.hasOwn(varsMap, cleanToken)) {
				const val = varsMap[cleanToken];
				return val && val.trim() !== "" ? val : emptyPlaceholder;
			}
			return preserveUnknown ? match : match;
		},
	);

	return result;
}

/**
 * Рендерит шаблон сообщения по ключу, локали и контексту переменных через канонический templateEngine.
 */
export function renderMessageTemplate(
	templateKey: string,
	locale: SupportedLocale | string = "ru",
	context: Record<string, unknown> = {},
): RenderedTemplate {
	return templateEngine.render(templateKey, locale, context);
}
