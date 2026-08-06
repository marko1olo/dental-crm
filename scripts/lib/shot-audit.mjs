/**
 * ОБЩАЯ ОХРАНА ДВУХ КОНВЕЙЕРОВ СЪЁМКИ.
 *
 * ЗАЧЕМ ЭТОТ ФАЙЛ СУЩЕСТВУЕТ. Снимок, названный темой, которой на нём нет, —
 * это не плохой снимок, а подложное доказательство: по нему принимают решения о
 * палитре и контрасте. Так плита light_duplicateAlert.png оказалась побайтово
 * равна ночной (VISUAL_VERDICT.md, аддендум C1), а до неё четырнадцать копий
 * одного снимка экрана ошибки Vite легли под именами трёх тем и десяти разделов
 * (§0 и A0). Оба случая нашёл человек глазами; прогоны вышли с кодом 0.
 *
 * ЗАЧЕМ ОТДЕЛЬНЫМ МОДУЛЕМ, А НЕ ДВУМЯ КОПИЯМИ. Проверка жила в двух сценариях
 * дважды одним и тем же кодом на полсотни строк, а «доказательством» того, что
 * она краснеет, служили ещё две снятые с них копии на 1581 строку. Копия
 * доказывает себя, а не рабочий код: сценарий правят — копия остаётся вчерашней.
 * Здесь охрана одна, оба сценария её подключают, и на неё есть настоящий тест:
 *   node --test scripts/tests/shot-audit.test.mjs
 *
 * ЧТО ПРОВЕРЯЕТСЯ И В КАКОМ ПОРЯДКЕ.
 *  1) до затвора: применённая тема, режим в хранилище приложения, классы на
 *     <html>, наличие значений у тем-зависимых токенов, отпечаток палитры;
 *  2) до записи файла: побайтовое совпадение с уже записанной плитой — иначе
 *     файл-двойник успевает лечь на диск и попасть в чужую выборку, а прогон
 *     ругается на него только в самом конце;
 *  3) в конце прогона: все ожидаемые плиты действительно записаны. «38 плит, 38
 *     уникальных md5» без «38 из 38 ожидаемых» не значит ничего: прогон, снявший
 *     3 панели из 38, тоже даёт уникальные хеши и код 0.
 */

import { createHash } from "node:crypto";

/** Темы, ради которых существует съёмка. Порядок = порядок прогона. */
export const THEMES = ["light", "dark", "night"];

/** Хвост, которым помечается диагностический кадр «что оказалось на экране». */
export const MISS_SUFFIX = "_ПУСТО";

/**
 * СОСТОЯНИЕ ТЕМЫ, СЧИТАННОЕ СО СТРАНИЦЫ: не «что просили», а «что применено».
 *
 * Возвращает значение data-theme, режим из хранилища приложения, классы на
 * <html> и отпечаток палитры — вычисленные значения всех пользовательских
 * свойств, которые вообще зависят от темы.
 *
 * Список имён токенов здесь намеренно НЕ зашит. Он берётся из самих правил CSS:
 * токен считается зависящим от темы, если объявлен в блоках хотя бы двух разных
 * тем. Зашитый список разошёлся бы с палитрой, а расхождение означало бы, что
 * охрана проверяет не то, что рисуется.
 */
export const THEME_STATE_EXPRESSION = `
  (() => {
    const root = document.documentElement;
    const store = window.__useThemeStore;
    const themesOfToken = new Map();
    const collect = (rules) => {
      for (const rule of rules) {
        if (rule.cssRules) collect(rule.cssRules);
        const selector = rule.selectorText;
        if (!selector || !rule.style) continue;
        const themes = selector
          .split("[data-theme=")
          .slice(1)
          .map((part) => part.slice(0, part.indexOf("]")).split('"').join("").split("'").join("").trim())
          .filter(Boolean);
        if (!themes.length) continue;
        for (let index = 0; index < rule.style.length; index += 1) {
          const name = rule.style.item(index);
          if (!name.startsWith("--")) continue;
          let seen = themesOfToken.get(name);
          if (!seen) {
            seen = new Set();
            themesOfToken.set(name, seen);
          }
          for (const theme of themes) seen.add(theme);
        }
      }
    };
    for (const sheet of document.styleSheets) {
      try {
        collect(sheet.cssRules);
      } catch {
        /* чужой источник (шрифты Google): правила недоступны, палитры там нет */
      }
    }
    const computed = getComputedStyle(root);
    const activeTheme = root.dataset.theme || "";
    const varying = [...themesOfToken.entries()]
      .filter((entry) => entry[1].size > 1)
      .map((entry) => entry[0])
      .sort();
    const values = varying.map((name) => name + ":" + computed.getPropertyValue(name).trim());
    /* Пустым считается только токен, который для ТЕКУЩЕЙ темы объявлен, но не
       разрешился: значит цепочка var() оборвалась, и плашка покрасится в
       ничто. Токен, которого в этой теме просто нет, — не дефект. */
    const declaredHere = varying.filter((name) => themesOfToken.get(name).has(activeTheme));
    return {
      dataTheme: activeTheme,
      mode: store ? store.getState().themeMode : null,
      storeAvailable: Boolean(store),
      className: root.className,
      colorScheme: root.style.colorScheme,
      tokenCount: varying.length,
      declaredHere: declaredHere.length,
      empty: declaredHere.filter((name) => !computed.getPropertyValue(name).trim()),
      values,
    };
  })()
`;

/** Отпечаток палитры: короткий хеш от «имя:значение» всех тем-зависимых токенов. */
export function paletteFingerprint(values) {
	return createHash("sha256")
		.update(values.join("\n"))
		.digest("hex")
		.slice(0, 12);
}

/**
 * «Этот контейнер ещё занят» для СПИСКА селекторов.
 *
 * ЧТО БЫЛО СЛОМАНО. Ожидание раздела строило проверку склейкой:
 *   querySelector('#shift, .shift-hero, .panel' + '[aria-busy="true"]')
 * В списке селекторов условие приклеивается ТОЛЬКО к последнему элементу, то
 * есть выражение читалось как «#shift, ИЛИ .shift-hero, ИЛИ .panel[aria-busy]».
 * Любой найденный #shift означал «раздел занят», и признак готовности не
 * становился истинным НИКОГДА ни для одного из одиннадцати разделов. Пока рядом
 * стоял console.warn, это было незаметно; когда там появилось падение, сценарий
 * перестал снимать вообще и врал в тексте ошибки: на диагностическом кадре
 * раздел был полностью отрисован.
 */
export function busySelector(selectorList) {
	const parts = String(selectorList)
		.split(",")
		.map((part) => part.trim())
		.filter(Boolean);
	if (!parts.length) throw new Error("busySelector: пустой список селекторов");
	return parts.map((part) => `${part}[aria-busy="true"]`).join(", ");
}

/**
 * Ожидаемые плиты как ДАННЫЕ, а не как догадка по имени файла.
 *
 * ЧТО БЫЛО СЛОМАНО. Соответствие имени и темы искалось подстрокой:
 * THEMES.find((c) => fileName.includes(c)). Для narrow_*, finance_full и
 * communications_full ни одна тема в имя не входит, поэтому проверка молча не
 * делалась для 10 плит из 38 — а на слизне со словом «light» внутри сработала бы
 * наоборот. Теперь тема каждой плиты объявлена заранее, проверка полная, и файл,
 * которого прогон не ждал, доказательством не считается.
 */
export function expectedPlate(file, theme) {
	if (!file.endsWith(".png"))
		throw new Error(`Ожидаемая плита «${file}» должна быть .png`);
	if (!THEMES.includes(theme))
		throw new Error(`Ожидаемая плита «${file}»: неизвестная тема «${theme}»`);
	return { file, theme };
}

/**
 * Аудит одного прогона съёмки: список ожидаемого, охрана темы перед затвором,
 * охрана побайтовых двойников перед записью, проверка полноты в конце.
 */
export function createShotAudit({ expected }) {
	if (!Array.isArray(expected) || expected.length === 0) {
		throw new Error(
			"createShotAudit: список ожидаемых плит пуст — аудировать нечего",
		);
	}
	const themeOfFile = new Map();
	for (const plate of expected) {
		const { file, theme } = expectedPlate(plate.file, plate.theme);
		if (themeOfFile.has(file))
			throw new Error(`Ожидаемая плита «${file}» объявлена дважды`);
		themeOfFile.set(file, theme);
	}

	const entries = [];
	const byMd5 = new Map();
	const paletteByThemeAndViewport = new Map();
	let viewport = "не задан";

	/** Диагностический кадр наследует тему той плиты, вместо которой он записан. */
	function declaredTheme(file) {
		const direct = themeOfFile.get(file);
		if (direct) return direct;
		const base = file.endsWith(`${MISS_SUFFIX}.png`)
			? `${file.slice(0, -`${MISS_SUFFIX}.png`.length)}.png`
			: null;
		const viaMiss = base ? themeOfFile.get(base) : undefined;
		if (viaMiss) return viaMiss;
		throw new Error(
			`Снимок «${file}» не заявлен в списке ожидаемых плит этого прогона. Файл, которого прогон не ждал, доказательством не является: либо имя разошлось со списком, либо в списке забыли строку.`,
		);
	}

	return {
		/** Размер окна входит в ключ отпечатка: часть токенов объявлена внутри @media. */
		setViewport(next) {
			viewport = next;
		},
		get viewport() {
			return viewport;
		},
		expectedFiles: () => [...themeOfFile.keys()],
		declaredTheme,

		/**
		 * ПРОВЕРКА ВПЛОТНУЮ ПЕРЕД ЗАТВОРОМ. Прогон падает, а не предупреждает: файл
		 * с чужой темой не должен лечь на диск и быть подшит как плита темы.
		 */
		assertThemeBeforeShot(state, theme, file) {
			if (!state)
				throw new Error(`${file}: страница не вернула состояние темы`);
			const where = `${file} (ожидалась тема «${theme}»)`;

			const named = declaredTheme(file);
			if (named !== theme) {
				throw new Error(
					`${where}: в списке ожидаемых плит у этого файла тема «${named}». Ошибка в сценарии, а не в приложении: имя и снимаемая тема разошлись.`,
				);
			}
			if (state.dataTheme !== theme) {
				throw new Error(
					`${where}: на <html> применена тема «${state.dataTheme || "нет атрибута"}», режим хранилища «${state.mode}». Снимок с чужой темой под этим именем — подложное доказательство, прогон остановлен.`,
				);
			}
			if (state.mode !== theme) {
				throw new Error(
					`${where}: атрибут data-theme верный, но режим в хранилище приложения «${state.mode}». Перезагрузка страницы вернёт другую тему, снимку доверять нельзя.`,
				);
			}
			/* Класс на <html> — второй источник правды о теме: несколько старых правил
         CSS опираются на html.dark и html.light. Класс ЧУЖОЙ темы означает
         гибрид: часть страницы нарисована по атрибуту, часть по классу. Ночная
         тема класса не получает вовсе (lib/themeClasses.ts:49-50), поэтому
         сверяется не соответствие «тема = класс», а отсутствие чужого. */
			const foreign = String(state.className || "")
				.split(/\s+/)
				.filter(Boolean)
				.filter((name) => THEMES.includes(name) && name !== theme);
			if (foreign.length > 0) {
				throw new Error(
					`${where}: на <html> остался класс чужой темы «${foreign.join(", ")}» (класс целиком: «${state.className}»). Правила, опирающиеся на html.dark/html.light, нарисуют часть страницы в другой теме — это гибрид, а не тема.`,
				);
			}
			if (!state.tokenCount) {
				throw new Error(
					`${where}: в загруженных стилях не найдено ни одного токена, зависящего от темы. Палитра не загрузилась — снимать нечего.`,
				);
			}
			if (state.empty.length > 0) {
				throw new Error(
					`${where}: тем-зависимые токены без значения (${state.empty.length}): ${state.empty.slice(0, 6).join(", ")}. Пустой var() красит плашку в чёрное поверх текста.`,
				);
			}

			const fingerprint = state.fingerprint ?? paletteFingerprint(state.values);
			const key = `${theme}@${viewport}`;
			const known = paletteByThemeAndViewport.get(key);
			if (known && known !== fingerprint) {
				throw new Error(
					`${where}: палитра темы «${theme}» изменилась посреди прогона (${known} -> ${fingerprint}). Плиты одной темы сняты в разных палитрах.`,
				);
			}
			if (!known) {
				for (const [otherKey, otherFingerprint] of paletteByThemeAndViewport) {
					if (otherFingerprint !== fingerprint) continue;
					const [otherTheme, otherViewport] = otherKey.split("@");
					if (otherTheme === theme || otherViewport !== viewport) continue;
					throw new Error(
						`${where}: палитра совпала с темой «${otherTheme}» при том же размере окна (отпечаток ${fingerprint}). Атрибут темы переставлен, а цвета не сменились.`,
					);
				}
				paletteByThemeAndViewport.set(key, fingerprint);
			}
			return { ...state, fingerprint };
		},

		/**
		 * ЗАПИСЬ В ВЕДОМОСТЬ ДО ЗАПИСИ ФАЙЛА. Побайтовый двойник обрывает прогон
		 * здесь, а не в конце: иначе файл-двойник успевает лечь на диск, и следующий
		 * читатель каталога берёт его как плиту темы. Диагностические кадры «ПУСТО»
		 * из правила исключены — это снимок всего экрана вместо ненайденной панели, и
		 * две подряд неудачи законно дают один и тот же кадр.
		 */
		register({ file, buffer, theme, state, diagnostic = false, note = "" }) {
			const declared = declaredTheme(file);
			if (!diagnostic && declared !== theme) {
				throw new Error(
					`${file}: заявлена тема «${theme}», в списке ожидаемых плит — «${declared}»`,
				);
			}
			const md5 = createHash("md5").update(buffer).digest("hex");
			if (!diagnostic) {
				const twin = byMd5.get(md5);
				if (twin) {
					throw new Error(
						`${file} побайтово совпадает с ${twin.file} (тема ${twin.theme}, ${twin.viewport}, md5 ${md5}). Разные панели, темы и размеры окна не могут дать один файл — снимок не отражает то, чем назван. Файл не записан, прогон остановлен.`,
					);
				}
				byMd5.set(md5, { file, theme, viewport });
			}
			const entry = {
				file,
				theme,
				dataTheme: state?.dataTheme ?? null,
				storeMode: state?.mode ?? null,
				className: state?.className ?? null,
				palette: state?.fingerprint ?? null,
				viewport,
				md5,
				bytes: buffer.length,
				diagnostic,
				note,
			};
			entries.push(entry);
			return entry;
		},

		plates: () => entries.filter((entry) => !entry.diagnostic),
		diagnostics: () => entries.filter((entry) => entry.diagnostic),
		palettes: () =>
			[...paletteByThemeAndViewport].map(([key, fingerprint]) => ({
				key,
				fingerprint,
			})),

		/** Чего прогон не снял. Пустой список — обязательное условие зелёного прогона. */
		missing() {
			const written = new Set(
				entries.filter((entry) => !entry.diagnostic).map((entry) => entry.file),
			);
			return [...themeOfFile.keys()].filter((file) => !written.has(file));
		},

		manifest(extra = {}) {
			const plates = entries.filter((entry) => !entry.diagnostic);
			return {
				...extra,
				expected: themeOfFile.size,
				plates: plates.length,
				uniqueMd5: new Set(plates.map((entry) => entry.md5)).size,
				missing: this.missing(),
				palettes: this.palettes(),
				diagnostics: entries
					.filter((entry) => entry.diagnostic)
					.map((entry) => entry.file),
				shots: entries,
			};
		},

		/**
		 * ПОЛНОТА ПРОГОНА. Раньше конвейер считал только то, что записал, поэтому
		 * прогон, снявший 3 панели из 38, печатал «нет плиты» для остальных и
		 * заканчивался зелёным. Для конвейера, чья работа — не давать подделывать
		 * доказательства, это дыра ровно того же класса, что и ненадёжная тема.
		 */
		assertComplete() {
			const gone = this.missing();
			if (gone.length === 0) return;
			const diag = new Set(
				entries.filter((entry) => entry.diagnostic).map((entry) => entry.file),
			);
			const detail = gone
				.map((file) => {
					const missName = `${file.slice(0, -4)}${MISS_SUFFIX}.png`;
					return diag.has(missName)
						? `${file} (есть только диагностический ${missName})`
						: file;
				})
				.join(", ");
			throw new Error(
				`Аудит прогона: не снято ${gone.length} из ${themeOfFile.size} ожидаемых плит: ${detail}. Неполная партия не доказательство: следующий читатель каталога не отличит «панель не открылась» от «панель не снималась».`,
			);
		},
	};
}
