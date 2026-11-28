/**
 * scripts/lib/ui-purity-rules.mjs
 *
 * AST-анализатор статического качества фронтенда (TSX/JSX + CSS) с минимальным числом ложных срабатываний.
 * Использует официальный TypeScript Compiler AST (`ts.createSourceFile`), поэтому:
 *   - Игнорирует комментарии, SQL-схемы, API-контракты и внутренние имена переменных.
 *   - Проверяет ТОЛЬКО реальные JSX-теги (`<button>`, `<a>`, `<tr>`, модалки), их `className`,
 *     пользовательские атрибуты (`title`, `aria-label`, `placeholder`) и видимый текст `JsxText`.
 *   - Гарантирует защиту по порогам (Ratchet) из `scripts/config/ui-purity-baseline.json`:
 *     любой рост долга или регресс с 0 немедленно блокирует сборку/коммит.
 */

import ts from "typescript";

export const FORBIDDEN_BUTTON_CIRCUS_CLASS_RE =
	/\b(?:bg-amber-100|hover:bg-amber-100|text-yellow-600|border-amber-400|hover:border-amber-400|bg-purple-100|hover:bg-purple-100|bg-orange-100|hover:bg-orange-100|bg-teal-400|bg-teal-300)\b|\bbg-\[#2dd4bf\](?!\/)/i;

// Solid bg-[var(--teal)] or bg-[var(--teal,#0d9488)] without alpha slash `/10`, `/15`, `/20`
export const SOLID_VAR_TEAL_BG_RE = /\bbg-\[var\(--teal(?:,[^\]/]+)?\)\](?!\/)/;

// Blue dark mode cards incompatible with DENTE emerald dark palette
export const BLUE_DARK_CARD_RE = /\b(?:bg-\[#(?:1e293b|334155|0f172a)\]|(?:dark:)?bg-slate-800(?![/\w-])|(?:dark:)?bg-slate-900(?![/\w-]))/;

// Gradients forbidden on canonical buttons/tabs
export const GRADIENT_CONTROL_RE = /\bbg-gradient-to-(?:r|l|t|b|tr|tl|br|bl)\b/;

// Light-only neutral surface on buttons/tabs without dark: counterpart -> looks broken/washed-out in dark mode
export const UNTHEMED_LIGHT_SURFACE_RE = /\b(?:bg-white|bg-slate-(?:100|200)|bg-gray-(?:100|200)|bg-zinc-(?:100|200))\b(?![/\w-])/;

// Dark unreadable text on colored/dark chips without dark:text-* counterpart
export const UNTHEMED_DARK_TEXT_RE = /\b(?:text-slate-(?:700|800|900)|text-gray-(?:700|800|900)|text-black)\b(?![/\w-])/;

// Monster z-index magic numbers breaking canonical layer hierarchy (20/30/40/50/100/200)
export const MONSTER_ZINDEX_RE = /\bz-\[(?:[3-9]\d{2,}|1\d{3,})\]/;

// Primary CTA styling forbidden inside repeating <tr>/<tbody> rows
export const PRIMARY_BUTTON_TOKEN_RE = /\b(?:dente-btn-primary|primary-button)\b|\bbg-\[var\(--primary\)\]/;

// Visible JSX text / copy defects (low-FP rules targeting real UI text only)
const DEV_JARGON_RE = /(?:в\s*1\s*клик|1-клик|\bindexeddb\b|копеечн(?:ая|ой|ую|ые)?\s+точност|идемпотентност\w*\s+пакет|интерактивный\s+индекс\s+здоровь|\bmodeFit\b|Мандат\s*8)/i;
const REG_CODE_UI_RE = /(?:043\/у|804н|54-ФЗ|257\/у)/i;
const HARDCODED_BRAND_UI_RE = /(?:\bTS3S3510S\b|\bArticaini\b|\bD2\s*\(Misch\))/i;
const CYRILLIC_AMPERSAND_RE = /[А-Яа-яЁё]+\s+&\s+[А-Яа-яЁё]+/;
const BUTTON_ASCII_ARROW_RE = /(?:^|\s)(?:->|=>)(?:\s|$)|\s>\s/;
const BROKEN_PLURAL_CONSENT_RE = /\b[02-9]\s+информированное\s+согласие\b/i;

export const UI_PURITY_RULE_KEYS = [
	"circus_or_neon_button",
	"table_row_primary_fence",
	"solid_var_teal_button",
	"gradient_on_control",
	"unthemed_light_control",
	"unthemed_dark_text",
	"blue_dark_card_surface",
	"monster_zindex_override",
	"unlayered_css_utility",
	"duplicate_modal_close",
	"duplicate_primary_cta_jsx",
	"global_pointer_coarse",
	"ui_dev_jargon",
	"ui_reg_code_leak",
	"ui_hardcoded_brand",
	"ui_cyrillic_ampersand",
	"ui_button_ascii_arrow",
	"ui_broken_plural",
	"all_caps_ui_text",
	"hardcoded_bg_white_ui",
	"segmented_primary_abuse",
	"reverse_auth_token_order",
	"swallowed_fetch_or_json_fallback",
	"browser_blocking_dialog",
];

function extractStaticStringsFromExpr(node, out = []) {
	if (!node) return out;
	if (ts.isStringLiteralLike(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
		out.push(node.text);
		return out;
	}
	if (ts.isTemplateExpression(node)) {
		if (node.head?.text) out.push(node.head.text);
		for (const span of node.templateSpans) {
			extractStaticStringsFromExpr(span.expression, out);
			if (span.literal?.text) out.push(span.literal.text);
		}
		return out;
	}
	if (ts.isBinaryExpression(node) || ts.isConditionalExpression(node)) {
		ts.forEachChild(node, (child) => extractStaticStringsFromExpr(child, out));
		return out;
	}
	if (ts.isCallExpression(node) || ts.isArrayLiteralExpression(node) || ts.isParenthesizedExpression(node)) {
		ts.forEachChild(node, (child) => extractStaticStringsFromExpr(child, out));
		return out;
	}
	return out;
}

function readAttrTexts(openingNode, attrNames) {
	const found = [];
	const attrs = openingNode.attributes?.properties || [];
	for (const attr of attrs) {
		if (!ts.isJsxAttribute(attr)) continue;
		const name = ts.isIdentifier(attr.name) ? attr.name.text : attr.name?.getText?.() || "";
		if (!attrNames.has(name)) continue;
		if (!attr.initializer) continue;
		if (ts.isStringLiteral(attr.initializer)) {
			found.push({ name, text: attr.initializer.text, pos: attr.getStart() });
		} else if (ts.isJsxExpression(attr.initializer) && attr.initializer.expression) {
			for (const s of extractStaticStringsFromExpr(attr.initializer.expression)) {
				found.push({ name, text: s, pos: attr.getStart() });
			}
		}
	}
	return found;
}

function getTagName(openingNode) {
	return openingNode.tagName ? openingNode.tagName.getText() : "";
}

function collectJsxTextInside(elementNode) {
	const chunks = [];
	function walkText(node) {
		if (ts.isJsxText(node)) {
			const txt = node.getText().replace(/\s+/g, " ").trim();
			if (txt) chunks.push(txt);
			return;
		}
		if (ts.isJsxExpression(node) && node.expression) {
			for (const s of extractStaticStringsFromExpr(node.expression)) {
				const clean = s.replace(/\s+/g, " ").trim();
				if (clean) chunks.push(clean);
			}
			return;
		}
		ts.forEachChild(node, walkText);
	}
	if (elementNode.children) {
		for (const child of elementNode.children) walkText(child);
	}
	return chunks.join(" ").trim();
}

/**
 * Inspects a single TSX/JSX source string using TypeScript JSX AST.
 * Returns structured findings with exact 1-based line numbers and zero comment/type noise.
 */
export function scanTsxUiPurity(filePath, content) {
	const scriptKind = filePath.endsWith(".jsx") ? ts.ScriptKind.JSX : ts.ScriptKind.TSX;
	const sf = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true, scriptKind);
	const findings = [];

	const lineOf = (pos) => sf.getLineAndCharacterOfPosition(pos).line + 1;
	const push = (rule, pos, element, snippet, message) => {
		findings.push({
			rule,
			file: filePath,
			line: lineOf(pos),
			element,
			snippet: snippet.replace(/\s+/g, " ").trim().slice(0, 140),
			message,
		});
	};

	const closeSignals = []; // track dialog close buttons per file for duplicate check
	const unconditionalPrimaryButtons = []; // track multiple sibling filled Primary CTAs

	function visit(node, ctx) {
		// Scan visible UI property assignments like { label: "...", title: "...", placeholder: "..." } in TSX UI files
		if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name)) {
			const propName = node.name.text;
			if (/^(?:label|title|subtitle|description|heading|placeholder|cta|actionLabel|badge)$/i.test(propName)) {
				for (const s of extractStaticStringsFromExpr(node.initializer)) {
					checkVisibleCopy(s, node.getStart(sf), `{${propName}}`);
				}
			}
		}

		if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
			const opening = ts.isJsxElement(node) ? node.openingElement : node;
			const tagName = getTagName(opening);
			const classAttrs = readAttrTexts(opening, new Set(["className"]));
			const classValue = classAttrs.map((a) => a.text).join(" ");
			const roleAttrs = readAttrTexts(opening, new Set(["role", "type", "aria-label", "title", "placeholder"]));
			const roleVal = roleAttrs.find((a) => a.name === "role")?.text || "";
			const hasOnClick = (opening.attributes?.properties || []).some(
				(p) => ts.isJsxAttribute(p) && ts.isIdentifier(p.name) && p.name.text === "onClick",
			);

			const isInteractiveButton =
				tagName === "button" ||
				roleVal === "button" ||
				/\b(?:dente-btn|primary-button|secondary-button|cw-btn)\b/.test(classValue) ||
				(hasOnClick && /\b(?:pill|preset|chip|cursor-pointer)\b/.test(classValue));

			const nextCtx = {
				insideTableRow: ctx.insideTableRow || tagName === "tr",
				insideDialog: ctx.insideDialog || roleVal === "dialog" || /Modal|Drawer|Dialog$/.test(tagName),
				insideBranch: ctx.insideBranch || Boolean(node.parent && (ts.isConditionalExpression(node.parent) || ts.isBinaryExpression(node.parent))),
				insideSegmented: ctx.insideSegmented || roleVal === "tablist" || /\b(?:dente-segmented-bar|segmented)\b/.test(classValue),
				insidePrintSheet: ctx.insidePrintSheet || /\bprint-paper-sheet\b/.test(classValue),
			};

			// 1. Circus or Neon hex colors on interactive buttons
			if (isInteractiveButton && classValue) {
				const circusHit = classValue.match(FORBIDDEN_BUTTON_CIRCUS_CLASS_RE);
				if (circusHit) {
					push(
						"circus_or_neon_button",
						opening.getStart(sf),
						`<${tagName}>`,
						circusHit[0],
						`Запрещённый цирковой/кислотный класс кнопки "${circusHit[0]}". Используй var(--primary) или var(--paper)+var(--line).`,
					);
				}

				// 2. Solid bg-[var(--teal)] fill on buttons -> becomes neon cyan #2dd4bf in dark mode
				if (SOLID_VAR_TEAL_BG_RE.test(classValue)) {
					push(
						"solid_var_teal_button",
						opening.getStart(sf),
						`<${tagName}>`,
						classValue,
						`bg-[var(--teal)] на кнопке превращается в кислотный циан #2dd4bf в Dark Mode. Замени на bg-[var(--primary)] text-white (для тега — bg-[var(--teal-surface)]).`,
					);
				}

				// 3. Filled Primary button inside <tr> table row -> Primary button fence
				if (ctx.insideTableRow && PRIMARY_BUTTON_TOKEN_RE.test(classValue)) {
					push(
						"table_row_primary_fence",
						opening.getStart(sf),
						`<${tagName}>`,
						classValue,
						`Primary-кнопка внутри строки таблицы <tr> создаёт забор акцентов! В строках таблиц разрешены ТОЛЬКО Secondary/Ghost кнопки.`,
					);
				} else if (nextCtx.insideSegmented && PRIMARY_BUTTON_TOKEN_RE.test(classValue)) {
					push(
						"segmented_primary_abuse",
						opening.getStart(sf),
						`<${tagName}>`,
						classValue,
						`Внутри segmented-переключателя активный таб раскрашен как Primary CTA! Переведи на bg-[var(--paper)] shadow-xs text-[var(--ink)], чтобы не конкурировать с главной CTA экрана.`,
					);
				} else if (PRIMARY_BUTTON_TOKEN_RE.test(classValue) && !nextCtx.insideBranch && tagName === "button") {
					unconditionalPrimaryButtons.push({ pos: opening.getStart(sf), classValue });
				}

				// 3b. Gradients on interactive buttons/tabs
				const gradHit = classValue.match(GRADIENT_CONTROL_RE);
				if (gradHit) {
					push(
						"gradient_on_control",
						opening.getStart(sf),
						`<${tagName}>`,
						gradHit[0],
						`Градиент "${gradHit[0]}" на кнопке/табе запрещён дизайн-кодом DENTE (Мандат 8am). Используй var(--primary) или var(--paper).`,
					);
				}

				// 3c. Light-only grey/white background on buttons/tabs without dark: counterpart
				const unthemedHit = classValue.match(UNTHEMED_LIGHT_SURFACE_RE);
				if (unthemedHit && !/\bdark:bg-/.test(classValue) && !/\bprint:/.test(classValue) && !nextCtx.insidePrintSheet) {
					push(
						"unthemed_light_control",
						opening.getStart(sf),
						`<${tagName}>`,
						classValue,
						`Светлый класс "${unthemedHit[0]}" на кнопке/табе без dark:bg-* в Dark Mode превращается в слепящую/серую битую плашку! Замени на bg-[var(--paper)] или bg-[var(--paper-soft)].`,
					);
				}
			}

			// 4. Blue dark surfaces (#1e293b / dark:bg-slate-800), unthemed dark text, hardcoded bg-white, uppercase UI, monster z-index, global pointer:coarse
			if (classValue) {
				const isTinyIndicatorBar = /\bw-(?:0\.5|1|\[[12]px\])\b|\bh-(?:0\.5|1|\[[12]px\])\b/.test(classValue);
				const isQrCanvasContainer = /QrCode|qr/i.test(filePath) || /QrCode|QR/i.test(ts.isJsxElement(node) ? collectJsxTextInside(node) : "");
				if (
					/\bbg-white(?![/\w-])/.test(classValue) &&
					!isInteractiveButton &&
					!isTinyIndicatorBar &&
					!isQrCanvasContainer &&
					!/\bdark:bg-/.test(classValue) &&
					!/\bprint:/.test(classValue) &&
					!nextCtx.insidePrintSheet
				) {
					push(
						"hardcoded_bg_white_ui",
						opening.getStart(sf),
						`<${tagName}>`,
						classValue,
						`Жёсткий экранный bg-white без dark:bg-* слепит врача в Dark Mode! Используй bg-[var(--paper)] / bg-[var(--paper-strong)] (белый лист разрешён только внутри .print-paper-sheet и print:).`,
					);
				}
				if (/\buppercase\b/.test(classValue) && !/\bprint:/.test(classValue) && !nextCtx.insidePrintSheet) {
					const inlineTxt = ts.isJsxElement(node) ? collectJsxTextInside(node) : "";
					if (inlineTxt.length >= 6 || !inlineTxt) {
						push(
							"all_caps_ui_text",
							opening.getStart(sf),
							`<${tagName}>`,
							classValue,
							`Класс "uppercase" превращает подписи («ВЫРУЧКА ЗА ДЕНЬ») в капслок-спам! По стандарту DENTE используй Sentence case.`,
						);
					}
				}
				const blueHit = classValue.match(BLUE_DARK_CARD_RE);
				if (blueHit) {
					push(
						"blue_dark_card_surface",
						opening.getStart(sf),
						`<${tagName}>`,
						blueHit[0],
						`Синяя тёмная поверхность "${blueHit[0]}" конфликтует с изумрудной палитрой DENTE. Используй bg-[var(--paper)] / bg-[var(--paper-soft)].`,
					);
				}
				const darkTxtHit = classValue.match(UNTHEMED_DARK_TEXT_RE);
				if (darkTxtHit && !/\bdark:text-/.test(classValue) && !/\bprint:/.test(classValue) && !/\bbg-(?:white|slate-50|slate-100|amber-100|emerald-100|sky-50)\b/.test(classValue)) {
					push(
						"unthemed_dark_text",
						opening.getStart(sf),
						`<${tagName}>`,
						darkTxtHit[0],
						`Тёмный текст "${darkTxtHit[0]}" без dark:text-* исчезает/не читается на тёмном фоне! Используй text-[var(--ink)] или text-[var(--ink-2)].`,
					);
				}
				const zHit = classValue.match(MONSTER_ZINDEX_RE);
				if (zHit) {
					push(
						"monster_zindex_override",
						opening.getStart(sf),
						`<${tagName}>`,
						zHit[0],
						`Мусорный z-index "${zHit[0]}" ломает единую иерархию слоёв (Sticky 20, TopBar 30, Portal 40, Sheet 50, Studio 100, Toast 200).`,
					);
				}
				if (/\[@media\(pointer:coarse\)\]/.test(classValue)) {
					push(
						"global_pointer_coarse",
						opening.getStart(sf),
						`<${tagName}>`,
						classValue,
						`Глобальный [@media(pointer:coarse)] раздувает кнопки на сенсорных ПК >=1024px! Используй max-md:* или .mobile-touch-shell.`,
					);
				}
			}

			// 5. User-visible string attributes (title, aria-label, placeholder)
			for (const attr of roleAttrs) {
				if (attr.name === "role" || attr.name === "type") continue;
				checkVisibleCopy(attr.text, attr.pos, `<${tagName} ${attr.name}>`);
			}

			// Walk JSX attribute expressions (e.g. onClick={() => fetch().catch() / window.confirm()})
			if (opening.attributes) {
				visit(opening.attributes, nextCtx);
			}

			// 6. Real button children copy & duplicate modal close tracking
			if (ts.isJsxElement(node)) {
				if (tagName === "button" || roleVal === "button") {
					const btnText = collectJsxTextInside(node);
					if (btnText && BUTTON_ASCII_ARROW_RE.test(btnText)) {
						push(
							"ui_button_ascii_arrow",
							opening.getStart(sf),
							`<${tagName}>`,
							btnText,
							`ASCII-стрелка '>'/'->' внутри текста кнопки "${btnText}". Убери мусорный символ или замени на Lucide-иконку.`,
						);
					}
					if (nextCtx.insideDialog || /Modal|Dialog/.test(filePath)) {
						const ariaLabel = roleAttrs.find((a) => a.name === "aria-label")?.text || "";
						if (/^Закрыть$/i.test(ariaLabel) && !btnText) {
							closeSignals.push({ kind: "icon_close", pos: opening.getStart(sf) });
						} else if (/^Закрыть$/i.test(btnText)) {
							closeSignals.push({ kind: "text_close", pos: opening.getStart(sf) });
						}
					}
				}
				for (const child of node.children) {
					visit(child, nextCtx);
				}
			}
			return;
		}

		// 7. Pure visible JsxText (never comments, never JS identifiers)
		if (ts.isJsxText(node)) {
			const txt = node.getText().replace(/\s+/g, " ").trim();
			if (txt.length >= 2) {
				checkVisibleCopy(txt, node.getStart(sf), "#text");
			}
		}

		// 7b. Client auth header token inversion: `clinicToken || staffToken` breaks RBAC (Mandate 8bo)
		if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.BarBarToken) {
			const leftTxt = node.left.getText(sf);
			const rightTxt = node.right.getText(sf);
			if (/\bclinicToken\b/i.test(leftTxt) && /\bstaffToken\b/i.test(rightTxt)) {
				push(
					"reverse_auth_token_order",
					node.getStart(sf),
					"Authorization",
					`${leftTxt} || ${rightTxt}`,
					`Опасный баг авторизации: clinicToken стоит ПЕРЕД staffToken! Это ломает проверку роли/отзыва сессии. Ставь строго staffToken || clinicToken.`,
				);
			}
		}

		// 7c. Silent fetch().catch(() => null) / .json().catch(() => []) & blocking browser dialogs (alert/confirm/prompt)
		if (ts.isCallExpression(node)) {
			const callee = node.expression;
			if (
				ts.isPropertyAccessExpression(callee) &&
				callee.name.text === "catch" &&
				ts.isCallExpression(callee.expression)
			) {
				const innerCallee = callee.expression.expression;
				const innerName = ts.isIdentifier(innerCallee)
					? innerCallee.text
					: ts.isPropertyAccessExpression(innerCallee)
						? innerCallee.name.text
						: "";
				if (innerName === "fetch" || innerName === "json") {
					push(
						"swallowed_fetch_or_json_fallback",
						node.getStart(sf),
						`${innerName}().catch(...)`,
						node.getText(sf),
						`Молчаливое глушение ${innerName}().catch(...) обнуляет техкарты/склад или скрывает сбой сети от врача! Проверяй res.ok и показывай тост/ошибку.`,
					);
				}
			}
			const isWinDialog =
				(ts.isPropertyAccessExpression(callee) &&
					ts.isIdentifier(callee.expression) &&
					callee.expression.text === "window" &&
					/^(?:alert|confirm|prompt)$/.test(callee.name.text)) ||
				(ts.isIdentifier(callee) && /^(?:alert|confirm|prompt)$/.test(callee.text));
			if (isWinDialog) {
				push(
					"browser_blocking_dialog",
					node.getStart(sf),
					callee.getText(sf),
					node.getText(sf),
					`Нативный блокирующий диалог ${callee.getText(sf)}() ломает UX и зависает в мобильном/киоск-режиме! Используй тост или неблокирующую шторку.`,
				);
			}
		}

		ts.forEachChild(node, (child) => visit(child, ctx));
	}

	function checkVisibleCopy(text, pos, element) {
		if (!text) return;
		if (DEV_JARGON_RE.test(text)) {
			push("ui_dev_jargon", pos, element, text, `Утечка дев-жаргона/ТЗ в видимый UI ("${text.slice(0, 80)}"). Перепиши на живой клинический русский.`);
		}
		if (REG_CODE_UI_RE.test(text)) {
			push("ui_reg_code_leak", pos, element, text, `Канцелярский номер приказа/формы (043/у, 804н, 54-ФЗ) в видимом UI ("${text.slice(0, 80)}").`);
		}
		if (HARDCODED_BRAND_UI_RE.test(text)) {
			push("ui_hardcoded_brand", pos, element, text, `Зашитый бренд/артикул импланта или анестетика в UI ("${text.slice(0, 80)}"). Выноси в каталог/данные клиники.`);
		}
		if (CYRILLIC_AMPERSAND_RE.test(text)) {
			push("ui_cyrillic_ampersand", pos, element, text, `Амперсанд '&' вместо русского союза «и» ("${text.slice(0, 80)}").`);
		}
		if (BROKEN_PLURAL_CONSENT_RE.test(text)) {
			push("ui_broken_plural", pos, element, text, `Сломанное падежное согласование ("${text.slice(0, 80)}"). Используй корректное склонение числительных.`);
		}
	}

	visit(sf, { insideTableRow: false, insideDialog: false, insideBranch: false });

	if (unconditionalPrimaryButtons.length >= 3) {
		push(
			"duplicate_primary_cta_jsx",
			unconditionalPrimaryButtons[2].pos,
			`<button> (${unconditionalPrimaryButtons.length} Primary CTAs)`,
			unconditionalPrimaryButtons.map((b) => b.classValue.slice(0, 40)).join(" | "),
			`В одном компоненте одновременно отрендерено ${unconditionalPrimaryButtons.length} безусловных Primary CTA! Оставь 1 главный CTA на экран, остальные переведи в Secondary.`,
		);
	}

	const hasIconClose = closeSignals.some((s) => s.kind === "icon_close");
	const textCloses = closeSignals.filter((s) => s.kind === "text_close");
	if (hasIconClose && textCloses.length > 0) {
		push(
			"duplicate_modal_close",
			textCloses[0].pos,
			"<button>Закрыть</button>",
			"aria-label='Закрыть' + Закрыть",
			`Дубль кнопки закрытия в модалке: одновременно [X] в шапке и вторая кнопка «Закрыть». Для закрытия без формы оставь ТОЛЬКО один [X]!`,
		);
	}

	return findings;
}

/**
 * Checks CSS files for global `@media (pointer: coarse)` bloat outside narrow mobile breakpoints,
 * monster z-index magic numbers, and top-level unlayered `.flex-1`/`.hidden` utility overrides.
 */
export function scanCssUiPurity(filePath, content) {
	const findings = [];
	const clean = content.replace(/\/\*[\s\S]*?\*\//g, "");
	const re = /@media[^{]*pointer\s*:\s*coarse/gi;
	let m;
	while ((m = re.exec(clean)) !== null) {
		const beforeRule = clean.slice(Math.max(0, m.index - 80), m.index + m[0].length);
		if (!/max-width\s*:\s*(?:768|640|480)px/i.test(beforeRule)) {
			const line = clean.slice(0, m.index).split("\n").length;
			findings.push({
				rule: "global_pointer_coarse",
				file: filePath,
				line,
				element: "@media",
				snippet: beforeRule.replace(/\s+/g, " ").trim().slice(0, 120),
				message: `Глобальный @media (pointer: coarse) без max-width <= 768px ломает сенсорные ПК-моноблоки!`,
			});
		}
	}

	// Unlayered bare utility class overrides (.flex-1 { ... } / .hidden { ... } outside @layer)
	if (!clean.includes("@layer utilities")) {
		const unlayeredRe = /(?:^|\n)\s*\.(?:flex-1|hidden|flex|block)\s*\{[^}]*\}/g;
		while ((m = unlayeredRe.exec(clean)) !== null) {
			const prefix = clean.slice(Math.max(0, m.index - 200), m.index);
			if (/@layer\s+/i.test(prefix)) continue;
			const line = clean.slice(0, m.index).split("\n").length;
			findings.push({
				rule: "unlayered_css_utility",
				file: filePath,
				line,
				element: "css-rule",
				snippet: m[0].replace(/\s+/g, " ").trim().slice(0, 120),
				message: `Неслойная утилита (.flex-1/.hidden/.flex) вне @layer перебивает Tailwind sm:flex-none / md:hidden и режет кнопки! Заверни в @layer.`,
			});
		}
	}
	return findings;
}
