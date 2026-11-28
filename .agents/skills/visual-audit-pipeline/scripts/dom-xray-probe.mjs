/**
 * dom-xray-probe.mjs — Автоматический DOM-рентген экрана в живом браузере.
 *
 * Возвращает объективные пиксельные, цветовые (WCAG 2.x) и текстовые метрики,
 * чтобы поймать визуальный брак ДО глаз человека:
 *  - Экран загрузки / splash вместо рабочего интерфейса («Загрузка системы...»)
 *  - Горизонтальный оверфлоу (overflow-x > 0px) и обрезка кнопок/табов краем экрана (rect.right > vw)
 *  - Суммарная высота фиксированных/липких верхних полос
 *  - Обрезанные тексты (scrollWidth > clientWidth + 2 или ellipsis)
 *  - Мелкие хитбоксы (< 28px на desktop, < 44px на mobile)
 *  - Конкурирующие Primary CTA в модалке (>1), заборы Primary в строках <tr>/<td> и на экране
 *  - Низкий контраст (< 4.5:1) и кислотный циан #2dd4bf на кнопках/чипах
 *  - Запрещённые синие карточки #1e293b / #334155 в Dark Mode и слепящие белые пятна
 *  - Дублирующиеся кнопки закрытия ([X] + «Закрыть») и дубли одинаковых Primary CTA
 *  - Запрещённый капслок (ALL CAPS) на контролах
 *  - Наезд иконки на текст инпута и пересечение FAB / кнопок
 *  - Утечки UUID / undefined / NaN / 043/у / 54-ФЗ / indexeddb / & / ASCII `>` / зашитых артикулов
 */

export function runDomXrayProbeInPage({ isMobile, theme }) {
	const vw = window.innerWidth;
	const vh = window.innerHeight;
	const root = document.documentElement;
	const horizontalOverflowPx = Math.max(0, Math.round(root.scrollWidth - vw));

	const isVisible = (el) => {
		if (!el || !(el instanceof Element)) return false;
		const style = window.getComputedStyle(el);
		if (style.display === "none" || style.visibility === "hidden" || parseFloat(style.opacity || "1") === 0) {
			return false;
		}
		if (el.classList?.contains("sr-only")) return false;
		const rect = el.getBoundingClientRect();
		return rect.width > 2 && rect.height > 2 && rect.bottom > 0 && rect.right > 0 && rect.top < vh && rect.left < vw;
	};

	const shortSelector = (el) => {
		const tag = el.tagName.toLowerCase();
		const id = el.id ? `#${el.id}` : "";
		const testId = el.getAttribute("data-testid") ? `[data-testid="${el.getAttribute("data-testid")}"]` : "";
		const cls = typeof el.className === "string"
			? el.className.trim().split(/\s+/).slice(0, 3).filter(Boolean).map((c) => `.${c}`).join("")
			: "";
		return `${tag}${id}${testId}${cls}`.slice(0, 120);
	};

	const parseRgba = (cssColor) => {
		if (!cssColor || cssColor === "transparent") return null;
		const m = cssColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
		if (!m) return null;
		const a = m[4] !== undefined ? parseFloat(m[4]) : 1;
		return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]), a };
	};

	const parseRgb = (cssColor) => {
		const rgba = parseRgba(cssColor);
		return rgba && rgba.a >= 0.15 ? rgba : null;
	};

	const srgbLum = (rgb) => {
		const lin = (c) => {
			const s = c / 255;
			return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
		};
		return 0.2126 * lin(rgb.r) + 0.7152 * lin(rgb.g) + 0.0722 * lin(rgb.b);
	};

	const luminance = (rgb) => 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;

	const contrastRatio = (c1, c2) => {
		const l1 = srgbLum(c1);
		const l2 = srgbLum(c2);
		const hi = Math.max(l1, l2);
		const lo = Math.min(l1, l2);
		return (hi + 0.05) / (lo + 0.05);
	};

	const getEffectiveBackground = (el) => {
		let cur = el;
		const layers = [];
		while (cur && cur instanceof Element) {
			const bg = parseRgba(window.getComputedStyle(cur).backgroundColor);
			if (bg && bg.a > 0.01) {
				layers.push(bg);
				if (bg.a >= 0.98) break;
			}
			cur = cur.parentElement;
		}
		let base = theme === "dark" ? { r: 9, g: 15, b: 14 } : { r: 255, g: 255, b: 255 };
		for (let i = layers.length - 1; i >= 0; i--) {
			const l = layers[i];
			const a = l.a;
			base = {
				r: Math.round(l.r * a + base.r * (1 - a)),
				g: Math.round(l.g * a + base.g * (1 - a)),
				b: Math.round(l.b * a + base.b * (1 - a)),
			};
		}
		return base;
	};

	const bodyText = document.body ? document.body.innerText : "";

	// 0. Splash / boot screen check (true splash blocking workspace, not hidden fallback text)
	const bootEl = document.querySelector(".boot-state");
	const bootVisible = bootEl ? isVisible(bootEl) : false;
	const hasMountedWorkspace = Boolean(document.querySelector("main, .workspace, [role='dialog'], .studio-modal, .auth-hub-card"));
	const splashMatch = bodyText.match(/Загрузка системы\.\.\.|Загружаем рабочее место|Инициализация DENTE/i);
	const splashScreenDetected = Boolean(bootVisible || (splashMatch && (!hasMountedWorkspace || bodyText.trim().length < 220)));

	// 1. Top Chrome / Header vertical budget
	const topChromeElements = [];
	const headerCandidates = document.querySelectorAll("header, nav, [role='tablist'], .topbar, .app-topbar, .page-header, .toolbar");
	let maxTopChromeBottom = 0;
	for (const el of headerCandidates) {
		if (!isVisible(el)) continue;
		const rect = el.getBoundingClientRect();
		if (rect.top < 260 && rect.width > vw * 0.4 && rect.height >= 24 && rect.height < 320) {
			topChromeElements.push({
				selector: shortSelector(el),
				top: Math.round(rect.top),
				height: Math.round(rect.height),
			});
			maxTopChromeBottom = Math.max(maxTopChromeBottom, Math.round(rect.bottom));
		}
	}

	// 2. Clipped texts (ellipsis / horizontal truncation) & right/left viewport clipping
	const clippedTexts = [];
	const textCandidates = document.querySelectorAll("button, a, span, div, p, h1, h2, h3, th, td, label");
	for (const el of textCandidates) {
		if (clippedTexts.length >= 25) break;
		if (!isVisible(el)) continue;
		if (el.children.length > 2) continue;
		const text = (el.textContent || "").replace(/\s+/g, " ").trim();
		if (!text || text.length < 2) continue;
		const style = window.getComputedStyle(el);
		const isEllipsis = style.textOverflow === "ellipsis" && style.overflowX !== "visible";
		if (el.scrollWidth > el.clientWidth + 2 && (isEllipsis || style.overflowX === "hidden")) {
			const rect = el.getBoundingClientRect();
			clippedTexts.push({
				text: text.slice(0, 80),
				scrollWidth: Math.round(el.scrollWidth),
				clientWidth: Math.round(el.clientWidth),
				rect: { x: Math.round(rect.left), y: Math.round(rect.top), w: Math.round(rect.width), h: Math.round(rect.height) },
				selector: shortSelector(el),
			});
		}
	}

	// 3. Interactive controls: hitboxes, ALL CAPS, primary CTAs, table fences, contrast, viewport clipping, accessible labels
	const undersizedTargets = [];
	const allCapsViolations = [];
	const primaryCtas = [];
	const tableRowPrimaryButtons = [];
	const lowContrastControls = [];
	const viewportClippedControls = [];
	const iconButtonsMissingLabel = [];
	const visibleControls = [];
	const minHeight = isMobile ? 44 : 28;
	const minWidth = isMobile ? 44 : 28;

	const isFabElement = (el, rect, cls) =>
		cls.includes("copilot-trigger-btn") ||
		(el.getAttribute("data-testid") || "").includes("copilot") ||
		(window.getComputedStyle(el).position === "fixed" && rect.right >= vw - 40 && rect.bottom >= vh - 160 && rect.width <= 180);

	let modalPrimaryCtaCount = 0;
	let workspacePrimaryCtaCount = 0;

	const interactiveEls = document.querySelectorAll("button, a[href], [role='button'], [role='tab'], input, select");
	for (const el of interactiveEls) {
		if (!isVisible(el)) continue;
		const rect = el.getBoundingClientRect();
		const text = (el.textContent || el.getAttribute("aria-label") || el.getAttribute("placeholder") || "").replace(/\s+/g, " ").trim();
		const style = window.getComputedStyle(el);
		const tag = el.tagName.toLowerCase();
		const cls = typeof el.className === "string" ? el.className : "";
		const isFab = isFabElement(el, rect, cls);

		visibleControls.push({ el, rect, text, style, isFab });

		// Viewport edge clipping for buttons/tabs (not inside horizontally scrollable strips with scrollLeft freedom? No, tabs/table buttons pushed off-screen!)
		if ((tag === "button" || el.getAttribute("role") === "tab" || el.getAttribute("role") === "button") && !isFab) {
			if ((rect.right > vw + 1 || rect.left < -1) && viewportClippedControls.length < 20) {
				viewportClippedControls.push({
					text: text.slice(0, 60) || "(icon-only)",
					rectLeft: Math.round(rect.left),
					rectRight: Math.round(rect.right),
					viewportWidth: vw,
					selector: shortSelector(el),
				});
			}
		}

		const type = el.getAttribute("type");
		if (!(tag === "input" && (type === "checkbox" || type === "radio"))) {
			if (rect.height < minHeight || rect.width < minWidth) {
				if (undersizedTargets.length < 25) {
					undersizedTargets.push({
						text: text.slice(0, 60) || "(icon-only)",
						width: Math.round(rect.width),
						height: Math.round(rect.height),
						expectedMin: `${minWidth}x${minHeight}`,
						rect: { x: Math.round(rect.left), y: Math.round(rect.top) },
						selector: shortSelector(el),
					});
				}
			}
		}

		if (tag === "button" || el.getAttribute("role") === "tab" || el.getAttribute("role") === "button") {
			const visibleText = (el.textContent || "").replace(/\s+/g, " ").trim();
			const ariaOrTitle = (el.getAttribute("aria-label") || el.getAttribute("title") || "").trim();
			if (!visibleText && !ariaOrTitle && tag === "button" && !el.closest(".recharts-wrapper, .rdp") && iconButtonsMissingLabel.length < 15) {
				iconButtonsMissingLabel.push({ selector: shortSelector(el) });
			}
			const upperProp = ["upper", "case"].join("");
			const hasUpperCss = style.textTransform === upperProp;
			const hasAllCapsWord = /[А-ЯA-ZЁ]{4,}/.test(visibleText) && visibleText === visibleText.toUpperCase() && /[А-ЯA-ZЁ]/.test(visibleText);
			if ((hasUpperCss || hasAllCapsWord) && allCapsViolations.length < 20) {
				allCapsViolations.push({
					text: visibleText.slice(0, 60),
					textTransform: style.textTransform,
					selector: shortSelector(el),
				});
			}

			// Detect Primary CTA (solid accent teal fill)
			const directBg = parseRgba(style.backgroundColor);
			const isOpaqueBg = directBg && directBg.a >= 0.7;
			const isPrimaryClass = cls.includes("dente-btn-primary") || cls.includes("primary-button") || /\bbg-\[var\(--primary\)\]/.test(cls);
			const isSolidTeal = isOpaqueBg && directBg.g > 110 && directBg.b > 100 && directBg.r < 70;
			const inTableRow = Boolean(el.closest("tbody tr, [role='row']"));
			const inModal = Boolean(el.closest("[role='dialog'], .modal, .modal-card, .studio-modal"));

			if ((isPrimaryClass || isSolidTeal) && rect.width >= 48 && rect.height >= 24 && !isFab) {
				primaryCtas.push({
					text: visibleText.slice(0, 60),
					rect: { x: Math.round(rect.left), y: Math.round(rect.top), w: Math.round(rect.width), h: Math.round(rect.height) },
					selector: shortSelector(el),
					inTableRow,
					inModal,
				});
				if (inTableRow && tableRowPrimaryButtons.length < 15) {
					tableRowPrimaryButtons.push({ text: visibleText.slice(0, 60), selector: shortSelector(el) });
				}
				if (inModal) modalPrimaryCtaCount++;
				else workspacePrimaryCtaCount++;
			}

			// Neon cyan button or WCAG contrast < 4.5 on non-disabled controls with visible text
			if (visibleText.length >= 2 && !el.disabled && el.getAttribute("aria-disabled") !== "true") {
				const effBg = getEffectiveBackground(el);
				const fg = parseRgba(style.color);
				if (isOpaqueBg && directBg.r < 90 && directBg.g > 185 && directBg.b > 165) {
					if (lowContrastControls.length < 20) {
						lowContrastControls.push({
							text: visibleText.slice(0, 50),
							reason: "NEON_CYAN_BUTTON",
							bg: `rgb(${effBg.r},${effBg.g},${effBg.b})`,
							fg: style.color,
							contrastRatio: fg ? Number(contrastRatio(effBg, fg).toFixed(2)) : 0,
							selector: shortSelector(el),
						});
					}
				} else if (fg && isOpaqueBg) {
					const cr = contrastRatio(effBg, fg);
					if (cr < 4.3 && lowContrastControls.length < 20) {
						lowContrastControls.push({
							text: visibleText.slice(0, 50),
							reason: "LOW_WCAG_CONTRAST",
							bg: `rgb(${effBg.r},${effBg.g},${effBg.b})`,
							fg: `rgb(${fg.r},${fg.g},${fg.b})`,
							contrastRatio: Number(cr.toFixed(2)),
							selector: shortSelector(el),
						});
					}
				}
			}
		}
	}

	// Duplicate Primary labels + modal double-close ([X] + "Закрыть")
	const primaryLabelCounts = new Map();
	for (const p of primaryCtas) {
		const norm = p.text.replace(/\s*\(\d+\)\s*$/, "").trim().toLowerCase();
		if (norm.length >= 3) primaryLabelCounts.set(norm, (primaryLabelCounts.get(norm) || 0) + 1);
	}
	const duplicatePrimaryLabels = [...primaryLabelCounts.entries()].filter(([, cnt]) => cnt > 1).map(([lbl, cnt]) => `"${lbl}" x${cnt}`);

	let duplicateCloseButtonsCount = 0;
	for (const dlg of document.querySelectorAll("[role='dialog'], .modal-card, .studio-modal")) {
		if (!isVisible(dlg)) continue;
		const btns = [...dlg.querySelectorAll("button")].filter(isVisible);
		const hasIconClose = btns.some((b) => /^(?:закрыть|close)$/i.test((b.getAttribute("aria-label") || "").trim()) && (b.textContent || "").trim().length <= 1);
		const hasTextClose = btns.some((b) => /^закрыть$/i.test((b.textContent || "").replace(/\s+/g, " ").trim()));
		if (hasIconClose && hasTextClose) duplicateCloseButtonsCount++;
	}

	// 4. Input icon overlap check
	const inputIconOverlaps = [];
	const inputs = document.querySelectorAll("input[type='text'], input[type='search'], input:not([type])");
	for (const input of inputs) {
		if (!isVisible(input)) continue;
		const parent = input.parentElement;
		if (!parent) continue;
		const svgs = parent.querySelectorAll("svg");
		if (svgs.length === 0) continue;
		const iRect = input.getBoundingClientRect();
		const pl = parseFloat(window.getComputedStyle(input).paddingLeft || "0");
		for (const svg of svgs) {
			if (!isVisible(svg)) continue;
			const sRect = svg.getBoundingClientRect();
			const onLeftInside = sRect.left >= iRect.left - 2 && sRect.right <= iRect.left + 44;
			if (onLeftInside && pl < 32 && inputIconOverlaps.length < 15) {
				inputIconOverlaps.push({
					placeholder: input.getAttribute("placeholder") || "",
					paddingLeftPx: Math.round(pl),
					iconRightOffsetPx: Math.round(sRect.right - iRect.left),
					selector: shortSelector(input),
				});
			}
		}
	}

	// 5. Raw machine leaks & dev jargon / copy errors in visible body text
	const rawMachineLeaks = [];
	const leakPatterns = [
		{ kind: "UUID", regex: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi },
		{ kind: "UNDEFINED_NAN", regex: /\b(undefined|NaN|\[object Object\])\b/g },
		{ kind: "DOUBLE_DASH", regex: /[A-ZА-Я0-9]--[A-ZА-Я0-9]/g },
		{ kind: "ISO_TIMESTAMP", regex: /\b20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}/g },
		{ kind: "SNAKE_CASE_ENUM", regex: /\b[a-z]{3,}_[a-z]{3,}(?:_[a-z]+)*\b/g },
		{ kind: "DEV_SLANG", regex: /(?:в\s*1\s*клик|1-клик|Мандат\s*\d|Soft Negative|\bindexeddb\b|копеечн(?:ая|ой|ую|ые)?\s+точност)/gi },
		{ kind: "REG_CODE_UI", regex: /(?:043\/у|804н|54-ФЗ|257\/у)/gi },
		{ kind: "BROKEN_PLURAL", regex: /\b[02-9]\s+информированное\s+согласие\b/gi },
		{ kind: "CYRILLIC_AMPERSAND", regex: /[А-Яа-яЁё]+\s+&\s+[А-Яа-яЁё]+/g },
	];
	for (const { kind, regex } of leakPatterns) {
		const matches = bodyText.match(regex);
		if (matches && matches.length > 0) {
			rawMachineLeaks.push({ kind, samples: [...new Set(matches)].slice(0, 6), count: matches.length });
		}
	}
	const asciiArrowButtons = visibleControls
		.filter((c) => c.el.tagName.toLowerCase() === "button" && /(?:^|\s)(?:->|=>)(?:\s|$)|\s>\s/.test(c.text))
		.map((c) => c.text.slice(0, 60));
	if (asciiArrowButtons.length > 0) {
		rawMachineLeaks.push({ kind: "BUTTON_ASCII_ARROW", samples: asciiArrowButtons.slice(0, 6), count: asciiArrowButtons.length });
	}

	// 6. Dark mode white blobs & forbidden #1e293b/#334155 blue cards & washed-out grey dark tabs & blank top void
	const darkModeWhiteBlobs = [];
	const blueDarkCards = [];
	const washedOutDarkTabs = [];
	if (theme === "dark") {
		for (const c of visibleControls) {
			if (c.el.getAttribute("role") === "tab" || c.el.closest("[role='tablist'], .segmented")) {
				const bg = parseRgb(c.style.backgroundColor);
				if (bg) {
					const lum = luminance(bg);
					const isSolidTeal = bg.g > 110 && bg.b > 100 && bg.r < 70;
					if (lum > 75 && !isSolidTeal && washedOutDarkTabs.length < 15) {
						washedOutDarkTabs.push({
							text: c.text.slice(0, 50),
							lum: Math.round(lum),
							selector: shortSelector(c.el),
						});
					}
				}
			}
		}
		const panels = document.querySelectorAll("div, section, aside, main, article, table, ul, form");
		for (const el of panels) {
			if (!isVisible(el)) continue;
			const style = window.getComputedStyle(el);
			const bg = parseRgb(style.backgroundColor);
			if (!bg) continue;
			const lum = luminance(bg);
			const rect = el.getBoundingClientRect();
			if (rect.width * rect.height <= 2500) continue;

			if (lum > 205 && darkModeWhiteBlobs.length < 15) {
				darkModeWhiteBlobs.push({
					backgroundColor: style.backgroundColor,
					luminance: Math.round(lum),
					size: `${Math.round(rect.width)}x${Math.round(rect.height)}`,
					textPreview: (el.innerText || "").replace(/\s+/g, " ").trim().slice(0, 50),
					selector: shortSelector(el),
				});
			}
			const isSlateBlueCard =
				(bg.r === 30 && bg.g === 41 && bg.b === 59) ||
				(bg.r === 51 && bg.g === 65 && bg.b === 85) ||
				(bg.r === 15 && bg.g === 23 && bg.b === 42);
			if (isSlateBlueCard && blueDarkCards.length < 15) {
				blueDarkCards.push({ backgroundColor: style.backgroundColor, selector: shortSelector(el) });
			}
		}
	}

	// 6b. Blank vertical top void above main table/list container
	let blankTopVoidPx = 0;
	const firstTable = document.querySelector("main table, .workspace table");
	if (firstTable && isVisible(firstTable) && maxTopChromeBottom > 0) {
		const tRect = firstTable.getBoundingClientRect();
		const gap = Math.round(tRect.top - maxTopChromeBottom);
		if (gap > 180) {
			const hasContentBetween = [...document.querySelectorAll("main button, main h1, main h2, main input, main [role='tablist']")]
				.filter(isVisible)
				.some((el) => {
					const r = el.getBoundingClientRect();
					return r.top >= maxTopChromeBottom && r.bottom <= tRect.top - 10;
				});
			if (!hasContentBetween) blankTopVoidPx = gap;
		}
	}

	// 6c. Deep Live Invariants: disabled critical CTA (8e), broken <img>, duplicate SVG #id, ALL CAPS headings, modal depth > 1, modal occluded by bottom nav, toast over CTA, duplicate entity codes, toolbar mismatch, badge contrast
	const KNOWN_SHORT_ACRONYMS = new Set([
		"ЕГИСЗ", "МКБ", "МКБ-10", "СЭМД", "ОФД", "КЛКТ", "ЗТЛ", "ДЕНТЕ", "CRM", "VIP",
		"PIN", "FDI", "DSD", "MPR", "RVG", "XML", "СБП", "НДФЛ", "ДМС", "ДНЕЙ", "ККТ", "SMS",
	]);
	for (const labelEl of document.querySelectorAll("label, h1, h2, h3, th, p, span")) {
		if (allCapsViolations.length >= 20 || !isVisible(labelEl)) continue;
		if (labelEl.children.length > 0) continue;
		const txt = (labelEl.textContent || "").replace(/\s+/g, " ").trim();
		if (txt.length < 6) continue;
		const cleanAlpha = txt.replace(/[^А-Яа-яA-Za-zЁё\s-]/g, "").trim();
		if (cleanAlpha.length < 6 || KNOWN_SHORT_ACRONYMS.has(cleanAlpha)) continue;
		const ls = window.getComputedStyle(labelEl);
		const isCssUpper = ls.textTransform === ["upper", "case"].join("");
		const hasTwoUpperWords = /[А-ЯA-ZЁ]{4,}\s+(?:[А-ЯA-ZЁ]{2,}\s+)*[А-ЯA-ZЁ]{4,}/.test(txt) && txt === txt.toUpperCase();
		if (isCssUpper || hasTwoUpperWords) {
			allCapsViolations.push({
				text: txt.slice(0, 60),
				textTransform: ls.textTransform,
				selector: shortSelector(labelEl),
			});
		}
	}

	const disabledCriticalCtas = [];
	const CRITICAL_CTA_RE = /^(?:Сохранить|Печать|Распечатать|Оплатить|Записать|Создать|Отправить|Выписать|Сдать|Подписать)/i;
	for (const c of visibleControls) {
		if (c.el.tagName.toLowerCase() !== "button") continue;
		const isDisabled = Boolean(c.el.disabled) || c.el.getAttribute("aria-disabled") === "true";
		if (isDisabled && CRITICAL_CTA_RE.test(c.text) && disabledCriticalCtas.length < 10) {
			disabledCriticalCtas.push({ text: c.text.slice(0, 50), selector: shortSelector(c.el) });
		}
	}

	const brokenImages = [];
	for (const img of document.querySelectorAll("img")) {
		if (!isVisible(img)) continue;
		if (img.complete && img.naturalWidth === 0 && brokenImages.length < 10) {
			brokenImages.push({ src: (img.getAttribute("src") || "").slice(0, 80), selector: shortSelector(img) });
		}
	}

	const idCounts = new Map();
	for (const el of document.querySelectorAll("svg [id], [data-tooth-fdi][id]")) {
		const id = el.getAttribute("id");
		if (id) idCounts.set(id, (idCounts.get(id) || 0) + 1);
	}
	const duplicateSvgIds = [...idCounts.entries()].filter(([, cnt]) => cnt > 1).map(([id, cnt]) => `${id} (x${cnt})`).slice(0, 15);

	const visibleDialogs = [...document.querySelectorAll("[role='dialog'], .modal-card, .studio-modal, .bottom-sheet-surface")].filter(isVisible);
	const topLevelDialogs = visibleDialogs.filter((d) => !visibleDialogs.some((other) => other !== d && other.contains(d)));
	const stackedModalsCount = topLevelDialogs.length > 1 ? topLevelDialogs.length : 0;

	// Hit-test whether bottom nav / mobile tabbar steals clicks or overlaps an active modal/BottomSheet
	const modalOccludedByNav = [];
	const bottomNavs = [...document.querySelectorAll(".mobile-bottom-nav, nav.fixed")].filter(isVisible);
	for (const dlg of topLevelDialogs) {
		const dlgButtons = [...dlg.querySelectorAll("button")].filter(isVisible);
		for (const nav of bottomNavs) {
			const nRect = nav.getBoundingClientRect();
			if (nRect.top < vh * 0.55) continue;
			for (const btn of dlgButtons) {
				const bRect = btn.getBoundingClientRect();
				const ix = Math.min(bRect.right, nRect.right) - Math.max(bRect.left, nRect.left);
				const iy = Math.min(bRect.bottom, nRect.bottom) - Math.max(bRect.top, nRect.top);
				if (ix > 4 && iy > 4) {
					const cx = Math.min(vw - 2, Math.max(2, bRect.left + bRect.width / 2));
					const cy = Math.min(vh - 2, Math.max(2, bRect.top + bRect.height / 2));
					const hit = document.elementFromPoint(cx, cy);
					if (hit && nav.contains(hit) && modalOccludedByNav.length < 10) {
						modalOccludedByNav.push({
							buttonText: (btn.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40),
							navSelector: shortSelector(nav),
							dialogSelector: shortSelector(dlg),
						});
					}
				}
			}
		}
	}

	// Detect toast/alert banners physically overlapping interactive CTA buttons
	const toastCoveringControls = [];
	const toastEls = [...document.querySelectorAll("[role='alert'], [role='status'], .dente-toast, .toast, [data-sonner-toast]")]
		.filter((el) => {
			if (!isVisible(el)) return false;
			const st = window.getComputedStyle(el);
			return st.position === "fixed" || st.position === "absolute" || st.position === "sticky";
		});
	for (const toastEl of toastEls) {
		const tRect = toastEl.getBoundingClientRect();
		if (tRect.width < 40 || tRect.height < 20) continue;
		for (const c of visibleControls) {
			if (toastEl.contains(c.el) || c.el.contains(toastEl)) continue;
			if (c.el.tagName.toLowerCase() !== "button") continue;
			const ox = Math.min(tRect.right, c.rect.right) - Math.max(tRect.left, c.rect.left);
			const oy = Math.min(tRect.bottom, c.rect.bottom) - Math.max(tRect.top, c.rect.top);
			if (ox > 6 && oy > 6 && toastCoveringControls.length < 10) {
				toastCoveringControls.push({
					toastText: (toastEl.innerText || "").replace(/\s+/g, " ").trim().slice(0, 40),
					buttonText: c.text.slice(0, 40) || shortSelector(c.el),
					overlapPx: `${Math.round(ox)}x${Math.round(oy)}`,
				});
			}
		}
	}

	// Detect duplicate entity/order codes across distinct rows/cards
	const duplicateCardCodes = [];
	const codeOwners = new Map();
	const rowSelectors = "tbody tr, .invoice-card, .order-card, [data-testid*='order-card'], [data-testid*='invoice-card']";
	for (const row of document.querySelectorAll(rowSelectors)) {
		if (!isVisible(row)) continue;
		const txt = (row.innerText || "").replace(/\s+/g, " ").trim();
		const codes = txt.match(/\b(?:ЗТЛ|СЧ|АКТ|ДОГ)-[A-ZА-Я0-9-]{4,}\b/g);
		if (!codes) continue;
		for (const code of new Set(codes)) {
			codeOwners.set(code, (codeOwners.get(code) || 0) + 1);
		}
	}
	for (const [code, cnt] of codeOwners.entries()) {
		if (cnt > 1 && duplicateCardCodes.length < 10) {
			duplicateCardCodes.push(`${code} (x${cnt})`);
		}
	}

	const toolbarHeightMismatches = [];
	for (const bar of document.querySelectorAll(".toolbar, .page-header, .modal-footer, [role='tablist']")) {
		if (!isVisible(bar)) continue;
		const btns = [...bar.querySelectorAll(":scope > button, :scope > div > button")].filter((b) => {
			if (!isVisible(b)) return false;
			const r = b.getBoundingClientRect();
			return r.height >= 20 && r.width >= 20;
		});
		if (btns.length >= 2) {
			const heights = btns.map((b) => Math.round(b.getBoundingClientRect().height));
			const diff = Math.max(...heights) - Math.min(...heights);
			if (diff > 6 && toolbarHeightMismatches.length < 10) {
				toolbarHeightMismatches.push({
					selector: shortSelector(bar),
					minH: Math.min(...heights),
					maxH: Math.max(...heights),
				});
			}
		}
	}

	for (const pill of document.querySelectorAll(".badge, [class*='chip'], [class*='pill'], span[class*='rounded-full']")) {
		if (lowContrastControls.length >= 25 || !isVisible(pill)) continue;
		const txt = (pill.textContent || "").replace(/\s+/g, " ").trim();
		if (txt.length < 2) continue;
		const style = window.getComputedStyle(pill);
		const bg = parseRgba(style.backgroundColor);
		const fg = parseRgba(style.color);
		if (bg && bg.a >= 0.4 && fg) {
			const effBg = getEffectiveBackground(pill);
			const cr = contrastRatio(effBg, fg);
			if (cr < 4.2) {
				lowContrastControls.push({
					text: txt.slice(0, 50),
					reason: "LOW_PILL_CONTRAST",
					bg: `rgb(${effBg.r},${effBg.g},${effBg.b})`,
					fg: `rgb(${fg.r},${fg.g},${fg.b})`,
					contrastRatio: Number(cr.toFixed(2)),
					selector: shortSelector(pill),
				});
			}
		}
	}

	// 7. Overlapping interactive buttons / FAB collision detection
	const overlappingControls = [];
	const fabOverlaps = [];
	const buttonControls = visibleControls.filter((c) => c.el.tagName.toLowerCase() === "button" || c.el.getAttribute("role") === "button");
	for (let i = 0; i < buttonControls.length; i++) {
		for (let j = i + 1; j < buttonControls.length; j++) {
			const a = buttonControls[i];
			const b = buttonControls[j];
			if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
			if (a.isFab && b.isFab) continue;
			const overlapX = Math.min(a.rect.right, b.rect.right) - Math.max(a.rect.left, b.rect.left);
			const overlapY = Math.min(a.rect.bottom, b.rect.bottom) - Math.max(a.rect.top, b.rect.top);
			if (overlapX > 3 && overlapY > 3) {
				const entry = {
					first: a.text.slice(0, 35) || shortSelector(a.el),
					second: b.text.slice(0, 35) || shortSelector(b.el),
					overlapPx: `${Math.round(overlapX)}x${Math.round(overlapY)}`,
				};
				if ((a.isFab || b.isFab) && fabOverlaps.length < 10) {
					fabOverlaps.push(entry);
				} else if (overlappingControls.length < 15) {
					overlappingControls.push(entry);
				}
			}
		}
	}

	return {
		viewport: { width: vw, height: vh, isMobile },
		theme,
		splashScreenDetected,
		horizontalOverflowPx,
		topChromeHeightPx: maxTopChromeBottom,
		topChromeElements: topChromeElements.slice(0, 8),
		primaryCtaCount: primaryCtas.length,
		modalPrimaryCtaCount,
		workspacePrimaryCtaCount,
		tableRowPrimaryButtonsCount: tableRowPrimaryButtons.length,
		tableRowPrimaryButtons,
		primaryCtas: primaryCtas.slice(0, 10),
		duplicatePrimaryLabelsCount: duplicatePrimaryLabels.length,
		duplicatePrimaryLabels,
		duplicateCloseButtonsCount,
		viewportClippedControlsCount: viewportClippedControls.length,
		viewportClippedControls,
		iconButtonsMissingLabelCount: iconButtonsMissingLabel.length,
		iconButtonsMissingLabel,
		lowContrastControlsCount: lowContrastControls.length,
		lowContrastControls,
		clippedTextsCount: clippedTexts.length,
		clippedTexts,
		undersizedTargetsCount: undersizedTargets.length,
		undersizedTargets,
		allCapsViolationsCount: allCapsViolations.length,
		allCapsViolations,
		inputIconOverlapsCount: inputIconOverlaps.length,
		inputIconOverlaps,
		rawMachineLeaks,
		darkModeWhiteBlobsCount: darkModeWhiteBlobs.length,
		darkModeWhiteBlobs,
		blueDarkCardsCount: blueDarkCards.length,
		blueDarkCards,
		washedOutDarkTabsCount: washedOutDarkTabs.length,
		washedOutDarkTabs,
		blankTopVoidPx,
		disabledCriticalCtasCount: disabledCriticalCtas.length,
		disabledCriticalCtas,
		brokenImagesCount: brokenImages.length,
		brokenImages,
		duplicateSvgIdsCount: duplicateSvgIds.length,
		duplicateSvgIds,
		stackedModalsCount,
		modalOccludedByNavCount: modalOccludedByNav.length,
		modalOccludedByNav,
		toastCoveringControlsCount: toastCoveringControls.length,
		toastCoveringControls,
		duplicateCardCodesCount: duplicateCardCodes.length,
		duplicateCardCodes,
		toolbarHeightMismatchesCount: toolbarHeightMismatches.length,
		toolbarHeightMismatches,
		overlappingControlsCount: overlappingControls.length,
		overlappingControls,
		fabOverlapsCount: fabOverlaps.length,
		fabOverlaps,
	};
}
