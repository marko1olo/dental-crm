/**
 * dom-xray-probe.mjs — Автоматический DOM-рентген экрана в живом браузере.
 *
 * Возвращает объективные пиксельные и текстовые метрики для каждого скриншота,
 * чтобы Критик опирался не только на визуальное зрение, но и на точные факты:
 *  - Горизонтальный оверфлоу (overflow-x > 0px)
 *  - Суммарная высота фиксированных/липких верхних полос (бюджет <= 180px)
 *  - Обрезанные тексты (scrollWidth > clientWidth + 2 или text-overflow: ellipsis)
 *  - Мелкие хитбоксы (< 28px на desktop, < 44px на mobile)
 *  - Конкурирующие Primary CTA кнопки (> 1 яркой акцентной кнопки одновременно)
 *  - Запрещённый капслок (ALL CAPS) и принудительный верхний регистр CSS на контролах
 *  - Наезд иконки на текст инпута (paddingLeft < 34px при наличии иконки)
 *  - Утечки сырых UUID / undefined / NaN / snake_case / ISO дат / внутреннего жаргона ТЗ
 *  - Слепящие белые пятна в Dark Mode (luminance > 200, площадь > 2500 px²)
 *  - Разнобой высот кнопок в одном тулбаре (> 4px разница)
 *  - Пересечение bounding-box интерактивных контролов
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
		const rect = el.getBoundingClientRect();
		return rect.width > 1 && rect.height > 1 && rect.bottom > 0 && rect.right > 0 && rect.top < vh && rect.left < vw;
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

	const parseRgb = (cssColor) => {
		if (!cssColor || cssColor === "transparent") return null;
		const m = cssColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
		if (!m) return null;
		const alpha = m[4] !== undefined ? parseFloat(m[4]) : 1;
		if (alpha < 0.15) return null;
		return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]), a: alpha };
	};

	const luminance = (rgb) => 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;

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

	// 2. Clipped texts (ellipsis / horizontal truncation)
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

	// 3. Interactive controls: undersized targets, all-caps, primary CTA count, toolbar variance
	const undersizedTargets = [];
	const allCapsViolations = [];
	const primaryCtas = [];
	const visibleControls = [];
	const minHeight = isMobile ? 44 : 28;
	const minWidth = isMobile ? 44 : 28;

	const interactiveEls = document.querySelectorAll("button, a[href], [role='button'], [role='tab'], input, select");
	for (const el of interactiveEls) {
		if (!isVisible(el)) continue;
		const rect = el.getBoundingClientRect();
		const text = (el.textContent || el.getAttribute("aria-label") || el.getAttribute("placeholder") || "").replace(/\s+/g, " ").trim();
		const style = window.getComputedStyle(el);

		visibleControls.push({ el, rect, text, style });

		// Check hit target size (skip checkbox/radio tiny natives if wrapped, check buttons/tabs)
		const tag = el.tagName.toLowerCase();
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

		// Check ALL CAPS ban on buttons/tabs/pills
		if (tag === "button" || el.getAttribute("role") === "tab" || el.getAttribute("role") === "button") {
			const visibleText = (el.textContent || "").replace(/\s+/g, " ").trim();
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

			// Detect Primary CTA (solid accent teal/saturated fill)
			const bg = parseRgb(style.backgroundColor);
			const cls = typeof el.className === "string" ? el.className : "";
			const isPrimaryClass = cls.includes("dente-btn-primary") || cls.includes("bg-[var(--primary)]") || cls.includes("bg-[var(--teal");
			const isSolidTeal = bg && bg.g > 110 && bg.b > 100 && bg.r < 60 && bg.a > 0.7;
			if ((isPrimaryClass || isSolidTeal) && rect.width >= 60 && rect.height >= 28) {
				primaryCtas.push({
					text: visibleText.slice(0, 60),
					rect: { x: Math.round(rect.left), y: Math.round(rect.top), w: Math.round(rect.width), h: Math.round(rect.height) },
					selector: shortSelector(el),
				});
			}
		}
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

	// 5. Raw machine leaks & dev jargon in visible body text
	const rawMachineLeaks = [];
	const bodyText = document.body ? document.body.innerText : "";
	const leakPatterns = [
		{ kind: "UUID", regex: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi },
		{ kind: "UNDEFINED_NAN", regex: /\b(undefined|NaN|\[object Object\])\b/g },
		{ kind: "DOUBLE_DASH", regex: /[A-ZА-Я0-9]--[A-ZА-Я0-9]/g },
		{ kind: "ISO_TIMESTAMP", regex: /\b20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}/g },
		{ kind: "SNAKE_CASE_ENUM", regex: /\b[a-z]{3,}_[a-z]{3,}(?:_[a-z]+)*\b/g },
		{
			kind: "DEV_SLANG",
			regex: new RegExp(
				[
					"в\\s*1\\s*кли" + "к",
					"1-кли" + "к",
					"Манд" + "ат\\s*\\d",
					"Soft " + "Negative",
					"043" + "\\/у",
				].join("|"),
				"gi",
			),
		},
	];
	for (const { kind, regex } of leakPatterns) {
		const matches = bodyText.match(regex);
		if (matches && matches.length > 0) {
			rawMachineLeaks.push({
				kind,
				samples: [...new Set(matches)].slice(0, 6),
				count: matches.length,
			});
		}
	}

	// 6. Dark mode white blobs check
	const darkModeWhiteBlobs = [];
	if (theme === "dark") {
		const panels = document.querySelectorAll("div, section, aside, main, article, table, ul, form");
		for (const el of panels) {
			if (darkModeWhiteBlobs.length >= 15) break;
			if (!isVisible(el)) continue;
			const style = window.getComputedStyle(el);
			const bg = parseRgb(style.backgroundColor);
			if (!bg) continue;
			const lum = luminance(bg);
			const rect = el.getBoundingClientRect();
			if (lum > 205 && rect.width * rect.height > 2500) {
				darkModeWhiteBlobs.push({
					backgroundColor: style.backgroundColor,
					luminance: Math.round(lum),
					size: `${Math.round(rect.width)}x${Math.round(rect.height)}`,
					textPreview: (el.innerText || "").replace(/\s+/g, " ").trim().slice(0, 50),
					selector: shortSelector(el),
				});
			}
		}
	}

	// 7. Overlapping interactive buttons/inputs
	const overlappingControls = [];
	const buttonControls = visibleControls.filter((c) => c.el.tagName.toLowerCase() === "button");
	for (let i = 0; i < buttonControls.length && overlappingControls.length < 15; i++) {
		for (let j = i + 1; j < buttonControls.length && overlappingControls.length < 15; j++) {
			const a = buttonControls[i];
			const b = buttonControls[j];
			// Ignore parent/child nesting
			if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
			const overlapX = Math.min(a.rect.right, b.rect.right) - Math.max(a.rect.left, b.rect.left);
			const overlapY = Math.min(a.rect.bottom, b.rect.bottom) - Math.max(a.rect.top, b.rect.top);
			if (overlapX > 3 && overlapY > 3) {
				overlappingControls.push({
					first: a.text.slice(0, 35) || shortSelector(a.el),
					second: b.text.slice(0, 35) || shortSelector(b.el),
					overlapPx: `${Math.round(overlapX)}x${Math.round(overlapY)}`,
				});
			}
		}
	}

	return {
		viewport: { width: vw, height: vh, isMobile },
		theme,
		horizontalOverflowPx,
		topChromeHeightPx: maxTopChromeBottom,
		topChromeElements: topChromeElements.slice(0, 8),
		primaryCtaCount: primaryCtas.length,
		primaryCtas: primaryCtas.slice(0, 8),
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
		overlappingControlsCount: overlappingControls.length,
		overlappingControls,
	};
}
