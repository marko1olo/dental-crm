/**
 * scripts/lib/ui-xray-rules.mjs
 *
 * Чистая логика оценки DOM X-Ray замеров живого браузера (`runDomXrayProbeInPage`).
 * Для каждого реального нарушения формирует точный разбор: что сломалось в браузере,
 * почему так делают только халтурщики и что именно нужно переделать в коде.
 */

export const XRAY_REMEDIATION_HINTS = {
	SPLASH_SCREEN_CAPTURED:
		"Ты сфотографировал экран загрузки вместо реального интерфейса. Так делать — прямое враньё в пруфе: жди гидратации контента и исчезновения .boot-state/спиннера до screenshot().",
	HORIZONTAL_OVERFLOW:
		"Экран вылезает за правый край (scrollWidth > innerWidth). Убери жёсткие min-w / table-fixed перегрузы, проверь flex/grid min-w-0 и overflow-x-clip.",
	VIEWPORT_CLIPPED_CONTROLS:
		"Кнопки действий или табы режутся пополам правым краем экрана (rect.right > vw). Пользователь не может на них нажать! Пересчитай ширины колонок таблицы или сделай аккуратный перенос/скролл-полосу.",
	OVERLAPPING_CONTROLS:
		"Одна кнопка физически залезла поверх другой (часто FAB ИИ-ассистента поверх кнопки карточки на 390x844). Разнеси зоны через safe padding-bottom, перенос кнопки левее или скрытие FAB на тесном списке.",
	TABLE_ROW_PRIMARY_FENCE:
		"В строках таблицы <tr>/<td> торчат залитые Primary-кнопки, превращая экран в зелёный забор. В строках таблиц и карточках разрешены ТОЛЬКО нейтральные Secondary/Ghost-кнопки (var(--paper)+var(--line)).",
	MULTIPLE_MODAL_PRIMARY_CTA:
		"В одной модалке больше одной залитой Primary CTA — врач не понимает, что главное. Оставь СТРОГО 1 Primary CTA (справа от «Отмена»).",
	PRIMARY_CTA_FENCE:
		"На одном экране натыкано >=3 залитых Primary CTA (шапка + тулбар + тело/панель). Выдели 1 главное действие экрана, второстепенные переведи в Secondary.",
	LOW_CONTRAST_OR_NEON_BUTTON:
		"Вырвиглазный неон #2dd4bf (часто от bg-[var(--teal)] в Dark Mode!) или контраст текста ниже 4.5:1. Для Primary используй строго bg-[var(--primary)] text-white, для бейджей — var(--teal-surface) + var(--ink).",
	DARK_MODE_WHITE_BLOBS:
		"В Dark Mode висит ослепляющая белая плита. Убери хардкодный белый фон и замени на var(--paper) / var(--paper-strong).",
	BLUE_DARK_CARDS:
		"В тёмно-изумрудном интерфейсе DENTE торчат чужеродные синие карты #1e293b/#334155/slate-800. Переведи их на var(--paper) и var(--paper-soft).",
	DUPLICATE_CLOSE_BUTTON:
		"В модалке одновременно крестик [X] и вторая кнопка «Закрыть». Хватит дублировать закрытие — оставь только один [X] (или для формы — «Отмена» слева от CTA).",
	DUPLICATE_PRIMARY_LABEL:
		"Одна и та же Primary-кнопка («Показать администратору» и т.п.) продублирована на одном экране. Оставь в одном каноническом месте.",
	MOBILE_UNDERSIZED_TOUCH:
		"На 390x844 кнопки/табы меньше 44x44px — врач в перчатках промахнётся! Поставь min-h-[44px] h-11 / w-11 строго для <=768px (max-md:*), не трогая ПК!",
	WASHED_OUT_DARK_TAB:
		"В Dark Mode неактивный таб/сегмент выглядит как светло-серый выключенный блок. Переведи фон табов на var(--paper-soft)/var(--paper) + text-[var(--ink)].",
	BLANK_TOP_VOID:
		"Между шапкой и таблицей/контентом зияет пустая дыра >180px. Убери лишние пустые обёртки/flex-1 центрирования.",
	DISABLED_CRITICAL_CTA:
		"Кнопки Сохранить/Печать/Оплатить/Создать заблокированы (disabled)! По Мандату 8e врач НИКОГДА не должен упираться в заблокированную Primary CTA.",
	BROKEN_IMAGES:
		"На экране видна битая картинка (naturalWidth === 0). Почини URL/статик-ассет или убери битый <img>.",
	DUPLICATE_SVG_IDS:
		"В SVG-дереве дублируются одинаковые #id (коллизия градиентов/clipPath одонтограммы Wheeler!). Добавь const archUid = useId().replace(/:/g, '') и префиксируй все #id.",
	STACKED_MODAL_MATRYOSHKA:
		"На экране открыты сразу несколько модальных окон друг поверх друга (Depth > 1)! Разверни в плоский стек или встроенную боковую панель.",
	TOOLBAR_HEIGHT_MISMATCH:
		"Кнопки в одном тулбаре/строке разной высоты (>6px разброс). Выровняй единым стандартом h-9 desktop / h-11 mobile.",
	UI_TEXT_LEAK:
		"В живой DOM утекли UUID, undefined/NaN, коды приказов (043/у, 54-ФЗ), дев-жаргон (indexeddb, 1 клик, копеечная точность), '&' вместо «и», '>' в кнопке или кривые падежи. Чисти текст до живого русского.",
	MODAL_OCCLUDED_BY_NAV:
		"Модальное окно / BottomSheet оказалось ПОД нижней навигацией (.mobile-bottom-nav) на 390x844 — тап попадает мимо кнопки модалки! Подними шкалу z-index оверлея (z-[100] > z-30/z-40) или скрывай bottom-nav при открытом dialog.",
	TOAST_COVERING_CTA:
		"Фиксированный тост/плашка наехала поверх интерактивной кнопки действия! Размести тосты в верхней safe-зоне или дай отступ от нижней кнопки CTA.",
	ALL_CAPS_UI_TEXT:
		"В живом интерфейсе найден запрещённый КАПСЛОК (text-transform: uppercase или слова капсом вроде «ВЫРУЧКА ЗА ДЕНЬ»). Перепиши в Sentence case (только 1-я буква заглавная).",
	DUPLICATE_CARD_CODE:
		"Одинаковый номер заказа/счёта/наряда («ЗТЛ-...» / «СЧ-...») скопирован в несколько разных строк/карточек! Почини генерацию/ключ дедупликации на бэкенде или сиде.",
	RUNTIME_CONSOLE_OR_HTTP_ERROR:
		"Во время рендера живого экрана браузер поймал JS исключение (pageerror/console.error) или API ответил HTTP 5xx! Нельзя прятать рантайм-падение за красивой картинкой.",
	ICON_BUTTON_NO_LABEL:
		"Иконочная кнопка не имеет ни видимого текста, ни aria-label, ни title — врач и скринридер не понимают, что она делает. Добавь осмысленный aria-label.",
};

export function evaluateDomXrayReport(domMetrics, context = {}) {
	if (!domMetrics || typeof domMetrics !== "object") {
		return {
			passed: false,
			blockers: [{ code: "MISSING_DOM_METRICS", message: "DOM X-Ray метрики не собраны — невозможно доказать качество экрана.", hint: "Подключи runDomXrayProbeInPage перед проверкой." }],
			warnings: [],
		};
	}

	const blockers = [];
	const warnings = [];
	const stateLabel = context.state || `${context.viewport?.width ?? "?"}x${context.viewport?.height ?? "?"} ${context.theme ?? ""}`.trim();
	const addBlocker = (code, message) => {
		const hintKey = code.startsWith("UI_TEXT_LEAK") ? "UI_TEXT_LEAK" : code;
		blockers.push({ code, message, hint: XRAY_REMEDIATION_HINTS[hintKey] || "" });
	};

	if (domMetrics.splashScreenDetected) {
		addBlocker("SPLASH_SCREEN_CAPTURED", `[${stateLabel}] Сфотографирован экран загрузки («Загрузка системы...») вместо рабочего интерфейса!`);
	}

	if ((domMetrics.horizontalOverflowPx ?? 0) > 2) {
		addBlocker("HORIZONTAL_OVERFLOW", `[${stateLabel}] Горизонтальный скролл документа ${domMetrics.horizontalOverflowPx}px (норма 0px).`);
	}

	if ((domMetrics.viewportClippedControlsCount ?? 0) > 0) {
		const samples = (domMetrics.viewportClippedControls || [])
			.slice(0, 3)
			.map((c) => {
				if (c.rectLeft !== undefined && c.rectLeft < -1) {
					return `"${c.text || c.selector}" (left=${c.rectLeft}px < 0)`;
				}
				return `"${c.text || c.selector}" (right=${c.rectRight}px > vw=${c.viewportWidth}px)`;
			})
			.join(", ");
		addBlocker("VIEWPORT_CLIPPED_CONTROLS", `[${stateLabel}] Кнопки/табы обрезаны краем экрана (${domMetrics.viewportClippedControlsCount} шт.): ${samples}.`);
	}

	const overlapsCount = (domMetrics.overlappingControlsCount ?? 0) + (domMetrics.fabOverlapsCount ?? 0);
	if (overlapsCount > 0) {
		const samples = [...(domMetrics.fabOverlaps || []), ...(domMetrics.overlappingControls || [])]
			.slice(0, 3)
			.map((o) => `"${o.first}" ∩ "${o.second}" (${o.overlapPx})`)
			.join(", ");
		addBlocker("OVERLAPPING_CONTROLS", `[${stateLabel}] Наезд кнопок/FAB друг на друга (${overlapsCount} пар): ${samples}.`);
	}

	if ((domMetrics.tableRowPrimaryButtonsCount ?? 0) > 0) {
		const samples = (domMetrics.tableRowPrimaryButtons || []).slice(0, 3).map((b) => `"${b.text}" (${b.selector})`).join(", ");
		addBlocker("TABLE_ROW_PRIMARY_FENCE", `[${stateLabel}] Забор Primary CTA в строках таблицы (${domMetrics.tableRowPrimaryButtonsCount} шт.): ${samples}.`);
	}

	if ((domMetrics.modalPrimaryCtaCount ?? 0) > 1) {
		addBlocker("MULTIPLE_MODAL_PRIMARY_CTA", `[${stateLabel}] Внутри модалки ${domMetrics.modalPrimaryCtaCount} залитых Primary CTA (допускается строго 1!).`);
	}

	if ((domMetrics.workspacePrimaryCtaCount ?? 0) > 2) {
		const samples = (domMetrics.primaryCtas || []).slice(0, 5).map((b) => `"${b.text}"`).join(", ");
		addBlocker("PRIMARY_CTA_FENCE", `[${stateLabel}] Забор Primary CTA на одном экране (${domMetrics.workspacePrimaryCtaCount} шт.): ${samples}.`);
	}

	if ((domMetrics.lowContrastControlsCount ?? 0) > 0) {
		const samples = (domMetrics.lowContrastControls || [])
			.slice(0, 3)
			.map((c) => `"${c.text}" (${c.reason}, bg=${c.bg}, fg=${c.fg}, CR=${c.contrastRatio})`)
			.join("; ");
		addBlocker("LOW_CONTRAST_OR_NEON_BUTTON", `[${stateLabel}] Низкий контраст (<4.5:1) или неон на кнопках/чипах: ${samples}.`);
	}

	if ((domMetrics.darkModeWhiteBlobsCount ?? 0) > 0) {
		addBlocker("DARK_MODE_WHITE_BLOBS", `[${stateLabel}] Слепящие светлые поверхности в Dark Mode (${domMetrics.darkModeWhiteBlobsCount} шт.).`);
	}
	if ((domMetrics.blueDarkCardsCount ?? 0) > 0) {
		const samples = (domMetrics.blueDarkCards || []).slice(0, 3).map((b) => `${b.selector} (${b.backgroundColor})`).join(", ");
		addBlocker("BLUE_DARK_CARDS", `[${stateLabel}] Запрещённые синие карточки #1e293b/#334155 в Dark Mode: ${samples}.`);
	}

	if ((domMetrics.duplicateCloseButtonsCount ?? 0) > 0) {
		addBlocker("DUPLICATE_CLOSE_BUTTON", `[${stateLabel}] В модалке одновременно кнопка [X] и вторая кнопка «Закрыть».`);
	}
	if ((domMetrics.duplicatePrimaryLabelsCount ?? 0) > 0) {
		addBlocker("DUPLICATE_PRIMARY_LABEL", `[${stateLabel}] Дубль одинаковой Primary-кнопки: ${(domMetrics.duplicatePrimaryLabels || []).join(", ")}.`);
	}
	if ((domMetrics.washedOutDarkTabsCount ?? 0) > 0) {
		const samples = (domMetrics.washedOutDarkTabs || []).slice(0, 3).map((t) => `"${t.text}" (lum=${t.lum}, ${t.selector})`).join(", ");
		addBlocker("WASHED_OUT_DARK_TAB", `[${stateLabel}] В Dark Mode серые «битые» табы (${domMetrics.washedOutDarkTabsCount} шт.): ${samples}.`);
	}
	if ((domMetrics.blankTopVoidPx ?? 0) > 180) {
		addBlocker("BLANK_TOP_VOID", `[${stateLabel}] Пустая вертикальная дыра ${domMetrics.blankTopVoidPx}px над таблицей/контентом.`);
	}
	if ((domMetrics.disabledCriticalCtasCount ?? 0) > 0) {
		const samples = (domMetrics.disabledCriticalCtas || []).map((c) => `"${c.text}" (${c.selector})`).join(", ");
		addBlocker("DISABLED_CRITICAL_CTA", `[${stateLabel}] Заблокированы критические кнопки (${domMetrics.disabledCriticalCtasCount} шт.): ${samples}.`);
	}
	if ((domMetrics.brokenImagesCount ?? 0) > 0) {
		const samples = (domMetrics.brokenImages || []).map((i) => `${i.src} (${i.selector})`).join(", ");
		addBlocker("BROKEN_IMAGES", `[${stateLabel}] Битые картинки на экране (${domMetrics.brokenImagesCount} шт.): ${samples}.`);
	}
	if ((domMetrics.duplicateSvgIdsCount ?? 0) > 0) {
		addBlocker("DUPLICATE_SVG_IDS", `[${stateLabel}] Коллизия SVG #id (${domMetrics.duplicateSvgIdsCount} шт.): ${(domMetrics.duplicateSvgIds || []).join(", ")}.`);
	}
	if ((domMetrics.stackedModalsCount ?? 0) > 1) {
		addBlocker("STACKED_MODAL_MATRYOSHKA", `[${stateLabel}] Открыта матрёшка из ${domMetrics.stackedModalsCount} модалок одновременно (Depth > 1).`);
	}
	if ((domMetrics.modalOccludedByNavCount ?? 0) > 0) {
		const samples = (domMetrics.modalOccludedByNav || []).map((o) => `"${o.buttonText}" под ${o.navSelector}`).join(", ");
		addBlocker("MODAL_OCCLUDED_BY_NAV", `[${stateLabel}] Нижняя навигация перекрыла кнопки модалки (${domMetrics.modalOccludedByNavCount} шт.): ${samples}.`);
	}
	if ((domMetrics.toastCoveringControlsCount ?? 0) > 0) {
		const samples = (domMetrics.toastCoveringControls || []).map((t) => `"${t.toastText}" ∩ "${t.buttonText}" (${t.overlapPx})`).join(", ");
		addBlocker("TOAST_COVERING_CTA", `[${stateLabel}] Всплывающее уведомление наехало на кнопки экрана (${domMetrics.toastCoveringControlsCount} шт.): ${samples}.`);
	}
	if ((domMetrics.allCapsViolationsCount ?? 0) > 0) {
		const samples = (domMetrics.allCapsViolations || []).slice(0, 4).map((a) => `"${a.text}" (${a.selector})`).join(", ");
		addBlocker("ALL_CAPS_UI_TEXT", `[${stateLabel}] Запрещённый КАПСЛОК в интерфейсе (${domMetrics.allCapsViolationsCount} шт.): ${samples}.`);
	}
	if ((domMetrics.duplicateCardCodesCount ?? 0) > 0) {
		addBlocker("DUPLICATE_CARD_CODE", `[${stateLabel}] Дубль номера документа/наряда в списке: ${(domMetrics.duplicateCardCodes || []).join(", ")}.`);
	}
	if ((context.runtimeErrors?.length ?? 0) > 0) {
		const samples = context.runtimeErrors.slice(0, 4).join(" | ");
		addBlocker("RUNTIME_CONSOLE_OR_HTTP_ERROR", `[${stateLabel}] Рантайм-сбой в браузере/API (${context.runtimeErrors.length} шт.): ${samples}.`);
	}
	if ((domMetrics.iconButtonsMissingLabelCount ?? 0) > 0) {
		const samples = (domMetrics.iconButtonsMissingLabel || []).slice(0, 4).map((b) => b.selector).join(", ");
		warnings.push({
			code: "ICON_BUTTON_NO_LABEL",
			message: `[${stateLabel}] Немые иконочные кнопки без aria-label/title (${domMetrics.iconButtonsMissingLabelCount} шт.): ${samples}.`,
			hint: XRAY_REMEDIATION_HINTS.ICON_BUTTON_NO_LABEL,
		});
	}
	if ((domMetrics.toolbarHeightMismatchesCount ?? 0) > 0) {
		const samples = (domMetrics.toolbarHeightMismatches || []).map((m) => `${m.selector} (${m.minH}px vs ${m.maxH}px)`).join(", ");
		addBlocker("TOOLBAR_HEIGHT_MISMATCH", `[${stateLabel}] Разнобой высот кнопок в тулбаре: ${samples}.`);
	}

	const criticalLeakKinds = new Set(["UUID", "UNDEFINED_NAN", "DEV_SLANG", "REG_CODE_UI", "BROKEN_PLURAL", "CYRILLIC_AMPERSAND", "BUTTON_ASCII_ARROW"]);
	for (const leak of domMetrics.rawMachineLeaks || []) {
		if (criticalLeakKinds.has(leak.kind)) {
			addBlocker(`UI_TEXT_LEAK_${leak.kind}`, `[${stateLabel}] Бракованный текст в живом DOM (${leak.kind}): ${leak.samples.join(", ")}.`);
		} else {
			warnings.push({
				code: `UI_TEXT_WARN_${leak.kind}`,
				message: `[${stateLabel}] Подозрительный текст в DOM (${leak.kind}): ${leak.samples.join(", ")}.`,
			});
		}
	}

	if ((domMetrics.clippedTextsCount ?? 0) > 0) {
		const controlClipped = (domMetrics.clippedTexts || []).filter((c) => /^(?:button|th|td|h1|h2)/i.test(c.selector || "") || /role=['"]?tab/.test(c.selector || ""));
		if (controlClipped.length > 0) {
			const samples = controlClipped.slice(0, 3).map((c) => `"${c.text}" (${c.selector}, scrollW=${c.scrollWidth}>clientW=${c.clientWidth})`).join(", ");
			addBlocker("VIEWPORT_CLIPPED_CONTROLS", `[${stateLabel}] Обрезан текст кнопок/табов/заголовков (${controlClipped.length} шт.): ${samples}.`);
		} else {
			const first = domMetrics.clippedTexts?.[0];
			warnings.push({
				code: "CLIPPED_TEXT_ELLIPSIS",
				message: `[${stateLabel}] Обрезка текста (${domMetrics.clippedTextsCount} шт.), напр. "${first?.text || ""}".`,
			});
		}
	}
	if ((domMetrics.undersizedTargetsCount ?? 0) > 0) {
		if (context.viewport?.isMobile || domMetrics.viewport?.isMobile) {
			const samples = (domMetrics.undersizedTargets || []).slice(0, 4).map((t) => `"${t.text}" (${t.width}x${t.height} < 44x44)`).join(", ");
			addBlocker("MOBILE_UNDERSIZED_TOUCH", `[${stateLabel}] На мобильном 390x844 мелкие кнопки <44x44px (${domMetrics.undersizedTargetsCount} шт.): ${samples}.`);
		} else {
			warnings.push({
				code: "UNDERSIZED_TOUCH_TARGET",
				message: `[${stateLabel}] Мелкие интерактивные цели (< min px): ${domMetrics.undersizedTargetsCount} шт.`,
			});
		}
	}

	return {
		passed: blockers.length === 0,
		blockers,
		warnings,
	};
}

export function formatDomXrayBlockers(report) {
	if (!report || report.passed) return "";
	return report.blockers
		.map((b, i) => `${i + 1}. [${b.code}] ${b.message}${b.hint ? `\n   ↳ ПОЧЕМУ ЭТО БРАК И КАК ЧИНИТЬ: ${b.hint}` : ""}`)
		.join("\n");
}
