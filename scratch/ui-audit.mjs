/**
 * Автоматический аудит интерфейса DENTE.
 *
 * Считает дефекты в живом браузере, а не «на глаз» по скриншотам:
 *   - горизонтальное переполнение страницы и виновные элементы
 *   - элементы, вылезающие за правый край окна
 *   - контраст текста по WCAG (эффективный фон ищется по предкам)
 *   - размер зон нажатия на мобильном
 *   - обрезанный текст (overflow:hidden + scrollWidth > clientWidth)
 *   - интерактивные элементы без доступного имени
 *   - невидимый текст (цвет совпадает с фоном)
 *
 * Проходит 4 состояния: PC/Mobile × Light/Dark по всем разделам.
 * Скриншоты — дополнение к цифрам, а не замена.
 *
 * Запуск: node scratch/ui-audit.mjs [--shots] [--views=patients,finance]
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const WEB = process.env.DENTE_WEB_URL || "http://127.0.0.1:5173";
const API = process.env.DENTE_API_URL || "http://127.0.0.1:4100";
const OUT_DIR = path.resolve("scratch/ui-audit-out");

/**
 * "onboarding" — не хеш-маршрут, а состояние: мастер первого запуска
 * показывается, пока в dente_ui_preferences_v1 нет onboardingDismissed.
 * Экран реальный и виден каждой новой клинике, поэтому проверяется тоже.
 */
const ALL_VIEWS = [
  "onboarding",
  "shift",
  "schedule",
  "patients",
  "imaging",
  "visit",
  "documents",
  "finance",
  "analytics",
  "communications",
  "settings",
  "marketing",
];

const args = process.argv.slice(2);
const WANT_SHOTS = args.includes("--shots");
const viewsArg = args.find((a) => a.startsWith("--views="));
const VIEWS = viewsArg ? viewsArg.slice("--views=".length).split(",").filter(Boolean) : ALL_VIEWS;

const VIEWPORTS = [
  { id: "pc", width: 1440, height: 900, isMobile: false },
  { id: "mobile", width: 390, height: 844, isMobile: true },
];
const THEMES = ["light", "dark"];

/** Диагностика выполняется внутри страницы. */
const PAGE_PROBE = () => {
  const out = {
    docScrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    bodyBg: getComputedStyle(document.body).backgroundColor,
    htmlBg: getComputedStyle(document.documentElement).backgroundColor,
    bodyColor: getComputedStyle(document.body).color,
    dataTheme: document.documentElement.dataset.theme || null,
    htmlClass: document.documentElement.className,
    overflowX: [],
    lowContrast: [],
    tinyTargets: [],
    clippedText: [],
    unnamedControls: [],
    invisibleText: [],
    counts: {},
    // Оверлей ошибки Vite перекрывает страницу целиком. Без этой проверки
    // сломанная сборка выглядит как «стало меньше дефектов»: мерить-то
    // нечего. Один раз уже поймал себя на этом.
    buildError: (() => {
      const overlay = document.querySelector("vite-error-overlay");
      if (!overlay) return null;
      const txt = overlay.shadowRoot?.textContent || overlay.textContent || "";
      return txt.replace(/\s+/g, " ").trim().slice(0, 300);
    })(),
  };

  const isMobile = window.innerWidth < 700;

  function sel(el) {
    if (!el || el === document.body) return "body";
    const id = el.id ? `#${el.id}` : "";
    const cls = typeof el.className === "string" && el.className.trim()
      ? "." + el.className.trim().split(/\s+/).slice(0, 3).join(".")
      : "";
    return `${el.tagName.toLowerCase()}${id}${cls}`;
  }

  function pathOf(el) {
    const parts = [];
    let cur = el;
    for (let i = 0; cur && i < 4 && cur !== document.body; i += 1) {
      parts.unshift(sel(cur));
      cur = cur.parentElement;
    }
    return parts.join(" > ");
  }

  function parseColor(str) {
    const m = /rgba?\(([^)]+)\)/.exec(str || "");
    if (!m) return null;
    const p = m[1].split(/[,\s/]+/).filter(Boolean).map((v) => parseFloat(v));
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  }

  function over(fg, bg) {
    // Наложение полупрозрачного цвета на непрозрачный.
    const a = fg.a;
    return {
      r: fg.r * a + bg.r * (1 - a),
      g: fg.g * a + bg.g * (1 - a),
      b: fg.b * a + bg.b * (1 - a),
      a: 1,
    };
  }

  /**
   * Цвета остановок градиента.
   *
   * Раньше при любом background-image проверка сдавалась и подставляла белый.
   * Из-за этого .primary-button с `linear-gradient(180deg, var(--teal),
   * var(--teal-dark))` выглядел как «белый текст на белом фоне» — 41 ложная
   * находка на ровном месте. Теперь берём реальные остановки и считаем
   * контраст по худшей из них.
   */
  function gradientStops(bgImage) {
    if (!bgImage || bgImage === "none") return [];
    const out = [];
    const re = /rgba?\([^)]+\)/g;
    let m;
    while ((m = re.exec(bgImage))) {
      const c = parseColor(m[0]);
      if (c && c.a > 0.15) out.push(c);
    }
    return out;
  }

  /**
   * Возвращает набор возможных фонов под элементом. Для сплошной заливки это
   * один цвет, для градиента — все его остановки. Контраст считается по
   * худшему варианту: текст обязан читаться на всей площади.
   */
  function effectiveBgs(el) {
    let cur = el;
    let acc = null;
    const gradients = [];
    while (cur) {
      const cs = getComputedStyle(cur);
      const c = parseColor(cs.backgroundColor);
      const stops = gradientStops(cs.backgroundImage);
      if (stops.length) {
        for (const s of stops) gradients.push(acc ? over(acc, s) : s.a < 1 ? null : s);
      } else if (cs.backgroundImage && cs.backgroundImage !== "none") {
        // Растровая картинка — цвет неизвестен, честно помечаем.
        return { colors: acc ? [acc] : [{ r: 255, g: 255, b: 255, a: 1 }], uncertain: true };
      }
      if (c && c.a > 0) {
        acc = acc ? over(acc, c) : c;
        if (c.a >= 1) {
          const list = gradients.filter(Boolean);
          return { colors: list.length ? list : [acc], uncertain: false };
        }
      }
      if (gradients.length && gradients.every(Boolean)) {
        return { colors: gradients, uncertain: false };
      }
      cur = cur.parentElement;
    }
    const list = gradients.filter(Boolean);
    if (list.length) return { colors: list, uncertain: false };
    return { colors: [acc || { r: 255, g: 255, b: 255, a: 1 }], uncertain: !acc };
  }

  function lum({ r, g, b }) {
    const f = (v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  }

  function contrast(a, b) {
    const la = lum(a);
    const lb = lum(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }

  function visible(el, cs, rect) {
    if (cs.visibility === "hidden" || cs.display === "none") return false;
    if (parseFloat(cs.opacity) < 0.05) return false;
    if (rect.width < 1 || rect.height < 1) return false;
    if (rect.bottom < -200 || rect.top > document.documentElement.scrollHeight + 200) return false;
    // Прозрачность у предка не наследуется как вычисленное значение: у
    // потомка opacity остаётся 1, хотя на экране не видно ничего. Из-за
    // этого скрытый блок appointment-create-editor (opacity 0, размер 0)
    // попадал в выборку как видимый.
    let p = el.parentElement;
    for (let i = 0; p && i < 12; i += 1) {
      const pcs = getComputedStyle(p);
      if (parseFloat(pcs.opacity) < 0.05) return false;
      if (pcs.visibility === "hidden" || pcs.display === "none") return false;
      p = p.parentElement;
    }
    return true;
  }

  function ownText(el) {
    let t = "";
    for (const n of el.childNodes) {
      if (n.nodeType === 3) t += n.nodeValue;
    }
    return t.trim();
  }

  const all = document.body.querySelectorAll("*");
  out.counts.elements = all.length;

  const overflowSeen = new Set();
  const contrastSeen = new Set();

  for (const el of all) {
    const cs = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    if (!visible(el, cs, rect)) continue;

    // --- 1. Выход за правый край окна ---
    if (rect.right > window.innerWidth + 1 && rect.width > 4) {
      // Содержимое внутри области с собственной горизонтальной прокруткой
      // законно шире области: страница при этом не едет. Такие элементы
      // не считаются дефектом.
      let scrollableAncestor = false;
      for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
        const acs = getComputedStyle(a);
        if (acs.overflowX === "auto" || acs.overflowX === "scroll") { scrollableAncestor = true; break; }
      }
      // Виновником считаем самый внешний элемент цепочки.
      const key = pathOf(el);
      let blamed = scrollableAncestor;
      let p = el.parentElement;
      while (!blamed && p && p !== document.body) {
        if (p.getBoundingClientRect().right > window.innerWidth + 1) { blamed = true; break; }
        p = p.parentElement;
      }
      if (!blamed && !overflowSeen.has(key)) {
        overflowSeen.add(key);
        out.overflowX.push({
          sel: key,
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          viewport: window.innerWidth,
          overhang: Math.round(rect.right - window.innerWidth),
        });
      }
    }

    // --- 2. Обрезанный текст ---
    // Приём «визуально скрыто» (clip: rect(0 0 0 0) при размере 1x1 и
    // overflow: hidden) — это не дефект, а штатный способ спрятать
    // ссылку-переход до получения фокуса. Все 40 находок этой категории
    // приходились на .skip-link.
    const visuallyHidden =
      (cs.clip && cs.clip !== "auto") ||
      (cs.clipPath && cs.clipPath !== "none" && rect.width <= 2 && rect.height <= 2) ||
      (rect.width <= 2 && rect.height <= 2);
    const clipsX = cs.overflowX === "hidden" || cs.overflow === "hidden";
    if (!visuallyHidden && clipsX && el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0) {
      const txt = (el.textContent || "").trim();
      const ellipsis = cs.textOverflow === "ellipsis";
      if (txt && !ellipsis && el.children.length === 0) {
        out.clippedText.push({
          sel: pathOf(el),
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth,
          text: txt.slice(0, 60),
        });
      }
    }

    const text = ownText(el);

    // --- 3. Контраст ---
    if (text.length >= 2) {
      const fgRaw = parseColor(cs.color);
      if (fgRaw) {
        const bgInfo = effectiveBgs(el);
        let worst = null;
        for (const bg of bgInfo.colors) {
          const fg = fgRaw.a < 1 ? over(fgRaw, bg) : fgRaw;
          const ratio = contrast(fg, bg);
          if (!worst || ratio < worst.ratio) worst = { ratio, bg };
        }
        const ratio = worst.ratio;
        const bgText = `rgb(${Math.round(worst.bg.r)}, ${Math.round(worst.bg.g)}, ${Math.round(worst.bg.b)})`;
        const size = parseFloat(cs.fontSize);
        const weight = parseInt(cs.fontWeight, 10) || 400;
        const large = size >= 24 || (size >= 18.66 && weight >= 700);
        const need = large ? 3 : 4.5;
        const r = el.getBoundingClientRect();
        const box = {
          x: Math.round(r.left + window.scrollX),
          y: Math.round(r.top + window.scrollY),
          w: Math.round(r.width),
          h: Math.round(r.height),
        };
        if (ratio < 1.15 && !bgInfo.uncertain) {
          out.invisibleText.push({
            sel: pathOf(el),
            ratio: Number(ratio.toFixed(2)),
            color: cs.color,
            bg: bgText,
            text: text.slice(0, 50),
            box,
          });
        } else if (ratio < need && !bgInfo.uncertain) {
          const key = `${pathOf(el)}|${cs.color}`;
          if (!contrastSeen.has(key)) {
            contrastSeen.add(key);
            out.lowContrast.push({
              sel: pathOf(el),
              ratio: Number(ratio.toFixed(2)),
              need,
              fontSize: size,
              color: cs.color,
              bg: bgText,
              text: text.slice(0, 50),
              box,
            });
          }
        }
      }
    }

    // --- 4. Интерактив: имя и размер ---
    const tag = el.tagName.toLowerCase();
    const role = el.getAttribute("role");
    const interactive =
      tag === "button" ||
      tag === "a" ||
      tag === "select" ||
      tag === "summary" ||
      (tag === "input" && el.type !== "hidden") ||
      role === "button" ||
      role === "tab" ||
      role === "link" ||
      el.hasAttribute("onclick");
    if (interactive) {
      // Доступное имя может давать не только атрибут на самом элементе:
      // <label> вокруг поля и <label for="id"> тоже считаются. Без этого
      // детектор ругался на 108 корректно подписанных полей из 112.
      const labelledBy = el.getAttribute("aria-labelledby");
      const labelledByText = labelledBy
        ? labelledBy
            .split(/\s+/)
            .map((id) => document.getElementById(id)?.textContent?.trim() || "")
            .join(" ")
            .trim()
        : "";
      const wrappingLabel = el.closest("label");
      const forLabel = el.id ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`) : null;
      const name =
        (el.getAttribute("aria-label") || "").trim() ||
        labelledByText ||
        (el.getAttribute("title") || "").trim() ||
        (el.textContent || "").trim() ||
        (el.getAttribute("alt") || "").trim() ||
        (el.getAttribute("placeholder") || "").trim() ||
        (wrappingLabel ? (wrappingLabel.textContent || "").trim() : "") ||
        (forLabel ? (forLabel.textContent || "").trim() : "");
      if (!name) {
        out.unnamedControls.push({ sel: pathOf(el), tag, html: el.outerHTML.slice(0, 110) });
      }
      // Настоящая зона нажатия для отметки внутри <label> — сама подпись:
      // клик по ней переключает поле. Мерить нужно её, иначе компактный
      // квадратик 20x20 в подписи высотой 44px считается дефектом, хотя
      // палец попадает без промаха.
      let target = rect;
      const hitLabel = el.closest("label");
      if (hitLabel && hitLabel !== el) {
        const lr = hitLabel.getBoundingClientRect();
        if (lr.width >= rect.width && lr.height >= rect.height) target = lr;
      }
      if (isMobile && tag !== "a" && (target.width < 32 || target.height < 32)) {
        out.tinyTargets.push({
          sel: pathOf(el),
          w: Math.round(target.width),
          h: Math.round(target.height),
          own: `${Math.round(rect.width)}x${Math.round(rect.height)}`,
          text: (el.textContent || "").trim().slice(0, 30),
        });
      }
    }
  }

  return out;
};

/** Владелец демо-клиники: PIN 0000, доступны все разделы. */
const OWNER_ID = "e44d32ca-7777-4c00-a001-c88f01b92e21";

/**
 * Проверка находок по реально отрисованным пикселям.
 *
 * Разбор CSS всегда остаётся приближением: тени, псевдоэлементы, наложения,
 * backdrop-filter и растровые фоны им не описываются. Поэтому каждая находка
 * «текст не виден» перепроверяется по скриншоту: внутри рамки элемента
 * считается гистограмма яркости, и берётся отношение 95-го перцентиля к 5-му.
 * Если текст действительно нарисован, разброс яркости большой; если текст
 * слился с фоном — гистограмма почти плоская и отношение близко к 1.
 *
 * Находка признаётся дефектом только при подтверждении пикселями.
 */
const PIXEL_VERIFY = async ({ dataUrl, items }) => {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx2d = canvas.getContext("2d", { willReadFrequently: true });
  ctx2d.drawImage(img, 0, 0);

  const lin = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };

  return items.map((it) => {
    const { x, y, w, h } = it.box;
    if (w < 2 || h < 2 || x < 0 || y < 0 || x + w > canvas.width || y + h > canvas.height) {
      return { ...it, pixel: null, pixelNote: "вне снимка" };
    }
    const data = ctx2d.getImageData(x, y, w, h).data;
    const lums = [];
    for (let i = 0; i < data.length; i += 4) {
      lums.push(0.2126 * lin(data[i]) + 0.7152 * lin(data[i + 1]) + 0.0722 * lin(data[i + 2]));
    }
    lums.sort((a, b) => a - b);
    const at = (q) => lums[Math.min(lums.length - 1, Math.max(0, Math.floor(q * (lums.length - 1))))];
    const lo = at(0.05);
    const hi = at(0.95);
    const pixelRatio = (hi + 0.05) / (lo + 0.05);
    return { ...it, pixel: Number(pixelRatio.toFixed(2)), samples: lums.length };
  });
};

async function login(page) {
  const res = await page.evaluate(
    async ({ api, ownerId }) => {
      const r = await fetch(`${api}/api/auth/clinic/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "clinic@example.com", password: "dente2026" }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok || !body.clinicToken) {
        return { ok: false, stage: "clinic", status: r.status, message: body.message };
      }
      const s = await fetch(`${api}/api/auth/staff/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-dente-clinic-token": body.clinicToken },
        body: JSON.stringify({ userId: ownerId, pinCode: "0000" }),
      });
      const sb = await s.json().catch(() => ({}));
      if (!s.ok || !sb.staffToken) {
        return { ok: false, stage: "staff", status: s.status, message: sb.message };
      }
      return { ok: true, clinicToken: body.clinicToken, staffToken: sb.staffToken, user: sb.user };
    },
    { api: API, ownerId: OWNER_ID },
  );
  if (!res.ok) throw new Error(`Вход не выполнен (${res.stage}): ${res.status} ${res.message || ""}`);
  await page.evaluate((t) => {
    localStorage.setItem("dente_clinic_token", t.clinicToken);
    localStorage.setItem("dente_staff_token", t.staffToken);
  }, res);
  return res;
}

async function run() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const report = { generatedFor: WEB, states: [], consoleErrors: [], buildErrors: [] };
  const buildErrors = report.buildErrors;

  for (const vp of VIEWPORTS) {
    for (const theme of THEMES) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 1,
        isMobile: vp.isMobile,
        hasTouch: vp.isMobile,
        locale: "ru-RU",
      });
      const page = await context.newPage();
      const errs = [];
      page.on("console", (m) => {
        if (m.type() === "error") errs.push(m.text().slice(0, 200));
      });
      page.on("pageerror", (e) => errs.push(`PAGEERROR ${String(e).slice(0, 200)}`));

      await page.goto(WEB, { waitUntil: "domcontentloaded" });
      await page.evaluate((t) => localStorage.setItem("dente_theme_mode", t), theme);
      await login(page);

      for (const view of VIEWS) {
        const stateId = `${vp.id}_${theme}_${view}`;
        try {
          await page.evaluate((v) => {
            if (v === "onboarding") localStorage.removeItem("dente_ui_preferences_v1");
            else localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true }));
          }, view);
          // goto на тот же URL с другим хешем — навигация внутри документа:
          // страница не перезагружается, стор темы и вида остаются прежними.
          // Поэтому хеш ставим и делаем явный reload.
          await page.goto(`${WEB}/#${view === "onboarding" ? "shift" : view}`, { waitUntil: "domcontentloaded" });
          await page.reload({ waitUntil: "domcontentloaded" });
          await page.waitForTimeout(2200);
          // Тема применяется контроллером после монтирования — дожидаемся.
          const themed = await page
            .waitForFunction((t) => document.documentElement.dataset.theme === t, theme, {
              timeout: 5000,
            })
            .then(() => true)
            .catch(() => false);
          if (!themed) console.log(`  ! тема ${theme} не применилась на ${stateId}`);
          await page.waitForTimeout(700);

          const probe = await page.evaluate(PAGE_PROBE);
          if (probe.buildError) {
            buildErrors.push({ state: stateId, error: probe.buildError });
            console.log(`${stateId.padEnd(34)} ОШИБКА СБОРКИ: ${probe.buildError.slice(0, 110)}`);
            report.states.push({ id: stateId, viewport: vp.id, theme, view, buildError: probe.buildError });
            continue;
          }

          // Пиксельная перепроверка контрастных находок.
          const candidates = [...probe.invisibleText, ...probe.lowContrast].filter((c) => c.box);
          if (candidates.length) {
            const shot = await page.screenshot({ fullPage: true, type: "png" });
            const verified = await page.evaluate(PIXEL_VERIFY, {
              dataUrl: `data:image/png;base64,${shot.toString("base64")}`,
              items: candidates,
            });
            const byKey = new Map(verified.map((v) => [`${v.sel}|${v.text}|${v.box.y}`, v]));
            const attach = (list) =>
              list.map((f) => byKey.get(`${f.sel}|${f.text}|${f.box?.y}`) ?? f);
            probe.invisibleText = attach(probe.invisibleText);
            probe.lowContrast = attach(probe.lowContrast);
            // Дефект засчитывается только если пиксели подтверждают: текст
            // почти не отличается от фона. pixel === null — не проверено.
            probe.invisibleTextUnconfirmed = probe.invisibleText.filter(
              (f) => f.pixel !== null && f.pixel !== undefined && f.pixel >= 1.6,
            );
            probe.invisibleText = probe.invisibleText.filter(
              (f) => f.pixel === null || f.pixel === undefined || f.pixel < 1.6,
            );
            // То же и для низкого контраста. Разбор CSS говорит, что цвета
            // близки; пиксели говорят, что видно на экране. Рамка элемента
            // шире глифов, поэтому в выборку попадает и окружение — если по
            // пикселям разброс яркости уже достаточный, текст читается и
            // находка не подтверждается. Требуем оба признака.
            probe.lowContrastUnconfirmed = probe.lowContrast.filter(
              (f) => f.pixel !== null && f.pixel !== undefined && f.pixel >= f.need,
            );
            probe.lowContrast = probe.lowContrast.filter(
              (f) => f.pixel === null || f.pixel === undefined || f.pixel < f.need,
            );
          }

          report.states.push({ id: stateId, viewport: vp.id, theme, view, ...probe });

          if (WANT_SHOTS) {
            await page.screenshot({ path: path.join(OUT_DIR, `${stateId}.png`), fullPage: false });
          }
          const n =
            probe.overflowX.length +
            probe.lowContrast.length +
            probe.tinyTargets.length +
            probe.clippedText.length +
            probe.unnamedControls.length +
            probe.invisibleText.length;
          const oflow = probe.docScrollWidth > probe.innerWidth + 1 ? ` DOC-OVERFLOW(${probe.docScrollWidth}>${probe.innerWidth})` : "";
          const droppedN =
            (probe.invisibleTextUnconfirmed?.length ?? 0) + (probe.lowContrastUnconfirmed?.length ?? 0);
          const dropped = droppedN ? ` (отсеяно пикселями: ${droppedN})` : "";
          console.log(
            `${stateId.padEnd(34)} issues=${String(n).padStart(3)}  ovf=${probe.overflowX.length} contrast=${probe.lowContrast.length} tiny=${probe.tinyTargets.length} clip=${probe.clippedText.length} noname=${probe.unnamedControls.length} invis=${probe.invisibleText.length}${oflow}${dropped}`,
          );
        } catch (e) {
          console.log(`${stateId.padEnd(34)} ОШИБКА: ${String(e.message).slice(0, 120)}`);
          report.states.push({ id: stateId, viewport: vp.id, theme, view, error: String(e.message) });
        }
      }
      if (errs.length) report.consoleErrors.push({ viewport: vp.id, theme, errors: [...new Set(errs)].slice(0, 25) });
      await context.close();
    }
  }

  await browser.close();
  fs.writeFileSync(path.join(OUT_DIR, "report.json"), JSON.stringify(report, null, 2), "utf8");
  console.log(`\nОтчёт: ${path.join(OUT_DIR, "report.json")}`);
  if (buildErrors.length) {
    console.log(
      `\nАУДИТ НЕДЕЙСТВИТЕЛЕН: ошибка сборки в ${buildErrors.length} состояниях. ` +
        `Цифры ниже мерить нечего — сначала починить сборку.`,
    );
    process.exitCode = 2;
  }
}

run().catch((e) => {
  console.error("СБОЙ АУДИТА:", e);
  process.exit(1);
});
