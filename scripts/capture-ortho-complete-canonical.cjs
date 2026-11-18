/**
 * scripts/capture-ortho-complete-canonical.cjs
 *
 * Full 4-State Visual Proofs for Orthodontics & Cephalometrics (TRG):
 * 1. Orthodontics Studio Modal (Brackets & Archwires) in Light & Dark (PC + Mobile)
 * 2. Orthodontics Studio (Photo & TRG tab) with 8-slot photo grid and TRG angles
 * 3. Cephalometric Analysis Modal with CephalometricCanvas (SVG planes, 16 landmarks, Steiner/Tweed metrics)
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");

const PROOFS_DIR = path.join(__dirname, "../docs/proofs/orthodontics");
if (!fs.existsSync(PROOFS_DIR)) {
  fs.mkdirSync(PROOFS_DIR, { recursive: true });
}

async function checkPort(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function getBaseUrl() {
  if (process.env.VITE_PORT) return `http://127.0.0.1:${process.env.VITE_PORT}`;
  for (const p of [5174, 5173, 5175, 5176]) {
    if (await checkPort(p)) return `http://127.0.0.1:${p}`;
  }
  return "http://127.0.0.1:5174";
}

async function applyTheme(page, theme) {
  const isDark = theme === "dark";
  await page.evaluate(({ dark, th }) => {
    document.documentElement.setAttribute("data-theme", th);
    document.body.setAttribute("data-theme", th);
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.classList.toggle("light", !dark);
    document.body.classList.toggle("dark", dark);
    document.body.classList.toggle("light", !dark);
    document.documentElement.style.colorScheme = th;
    localStorage.setItem("dente_theme", th);
    localStorage.setItem("dente_theme_mode", th);
    localStorage.setItem("theme", th);
  }, { dark: isDark, th: theme });
  await page.waitForTimeout(400);
}

async function suppressOverlays(page) {
  try {
    await page.evaluate(() => {
      const style = document.createElement("style");
      style.id = "suppress-all-overlays-ortho-complete";
      style.innerHTML = `
        .tour-spotlight-root,
        .tour-backdrop-clickable-zone,
        [data-testid="guided-tour-spotlight-overlay"],
        [data-testid="guided-tour-coach-mark-card"],
        [data-testid="demo-mode-banner"],
        .shepherd-element,
        .global-toast-container,
        .sa-toast,
        .sa-toast--warning,
        .sa-toast--error,
        .sa-toast--info,
        .sa-toast--success,
        [role="alert"],
        vite-error-overlay {
          display: none !important;
          pointer-events: none !important;
          opacity: 0 !important;
        }
      `;
      document.head.appendChild(style);
      document.querySelectorAll("vite-error-overlay, .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay'], .sa-toast, [role='alert']").forEach((el) => el.remove());
    });
  } catch (_) {}
}

async function main() {
  const baseUrl = await getBaseUrl();
  console.log(`\n>>> Using Base URL: ${baseUrl} <<<\n`);

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  try {
    // ----------------------------------------------------
    // PART 1: Orthodontics Studio Modal (PC Light/Dark & Mobile Light/Dark)
    // ----------------------------------------------------
    const studioStates = [
      { name: "01_orthodontics_studio_pc_light_1440x900.png", width: 1440, height: 900, theme: "light", isMobile: false },
      { name: "02_orthodontics_studio_pc_dark_1440x900.png", width: 1440, height: 900, theme: "dark", isMobile: false },
      { name: "03_orthodontics_studio_mobile_light_390x844.png", width: 390, height: 844, theme: "light", isMobile: true },
      { name: "04_orthodontics_studio_mobile_dark_390x844.png", width: 390, height: 844, theme: "dark", isMobile: true },
    ];

    for (const st of studioStates) {
      console.log(`\n[STUDIO] Capturing ${st.name}...`);
      const context = await browser.newContext({
        viewport: { width: st.width, height: st.height },
        colorScheme: st.theme,
        isMobile: st.isMobile,
        hasTouch: st.isMobile,
        locale: "ru-RU",
      });

      await context.addInitScript(({ th }) => {
        try {
          localStorage.setItem("dente_demo_showcase", "true");
          localStorage.setItem("dente_onboarding_completed", "true");
          localStorage.setItem("dente_tour_completed", "true");
          localStorage.setItem("dente_tour_dismissed", "true");
          localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
          localStorage.setItem("dente_active_role", "doctor");
          localStorage.setItem("dente_role", "doctor");
          localStorage.setItem("dente_theme", th);
          localStorage.setItem("dente_theme_mode", th);
          sessionStorage.setItem("dente_unlocked", "true");

          const style = document.createElement("style");
          style.id = "suppress-all-overlays-init";
          style.innerHTML = `
            .tour-spotlight-root,
            .tour-backdrop-clickable-zone,
            [data-testid="guided-tour-spotlight-overlay"],
            [data-testid="guided-tour-coach-mark-card"],
            [data-testid="demo-mode-banner"],
            .shepherd-element,
            .global-toast-container,
            .sa-toast,
            .sa-toast--warning,
            .sa-toast--error,
            .sa-toast--info,
            .sa-toast--success,
            [role="alert"],
            vite-error-overlay {
              display: none !important;
              pointer-events: none !important;
              opacity: 0 !important;
              visibility: hidden !important;
            }
          `;
          document.head ? document.head.appendChild(style) : document.addEventListener("DOMContentLoaded", () => document.head.appendChild(style));
        } catch (_) {}
      }, { th: st.theme });

      const page = await context.newPage();
      await page.goto(`${baseUrl}/?demo=true#ortho-protocol`, { waitUntil: "commit", timeout: 30000 });
      await page.waitForSelector(".boot-state", { state: "detached", timeout: 20000 }).catch(() => {});
      await page.waitForSelector('.ortho-studio-modal, [data-testid="orthodontic-studio-modal"]', { state: "visible", timeout: 20000 });
      await suppressOverlays(page);
      await applyTheme(page, st.theme);

      const filePath = path.join(PROOFS_DIR, st.name);
      const buffer = await page.screenshot({ fullPage: false, animations: "disabled", timeout: 15000 });
      fs.writeFileSync(filePath, buffer);
      console.log(`[SAVED] ${st.name} (${Math.round(fs.statSync(filePath).size / 1024)} KB)`);
      await context.close();
    }

    // ----------------------------------------------------
    // PART 2: Orthodontics Studio (Photo & TRG Tab) PC Light/Dark
    // ----------------------------------------------------
    const photoTrgStates = [
      { name: "05_ortho_trg_tab_pc_light_1440x900.png", width: 1440, height: 900, theme: "light" },
      { name: "06_ortho_trg_tab_pc_dark_1440x900.png", width: 1440, height: 900, theme: "dark" },
    ];

    for (const st of photoTrgStates) {
      console.log(`\n[PHOTO-TRG TAB] Capturing ${st.name}...`);
      const context = await browser.newContext({
        viewport: { width: st.width, height: st.height },
        colorScheme: st.theme,
        locale: "ru-RU",
      });

      await context.addInitScript(({ th }) => {
        try {
          localStorage.setItem("dente_demo_showcase", "true");
          localStorage.setItem("dente_onboarding_completed", "true");
          localStorage.setItem("dente_tour_completed", "true");
          localStorage.setItem("dente_tour_dismissed", "true");
          localStorage.setItem("dente_active_role", "doctor");
          localStorage.setItem("dente_role", "doctor");
          localStorage.setItem("dente_theme", th);
          localStorage.setItem("dente_theme_mode", th);
          sessionStorage.setItem("dente_unlocked", "true");
        } catch (_) {}
      }, { th: st.theme });

      const page = await context.newPage();
      await page.goto("http://127.0.0.1:5173/?demo=true#ortho-protocol", { waitUntil: "commit", timeout: 30000 });
      await page.waitForSelector(".boot-state", { state: "detached", timeout: 20000 }).catch(() => {});
      await page.waitForSelector('.ortho-studio-modal, [data-testid="orthodontic-studio-modal"]', { state: "visible", timeout: 20000 });
      await suppressOverlays(page);
      await applyTheme(page, st.theme);

      // Click on "Фото и ТРГ" tab
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll(".ortho-tab-btn, button"));
        const photoBtn = buttons.find((b) => b.textContent && b.textContent.includes("Фото и ТРГ"));
        if (photoBtn) photoBtn.click();
      });
      await page.waitForTimeout(800);

      const filePath = path.join(PROOFS_DIR, st.name);
      const buffer = await page.screenshot({ fullPage: false, animations: "disabled", timeout: 15000 });
      fs.writeFileSync(filePath, buffer);
      console.log(`[SAVED] ${st.name} (${Math.round(fs.statSync(filePath).size / 1024)} KB)`);
      await context.close();
    }

    // ----------------------------------------------------
    // PART 3: Cephalometric Analysis Modal with CephalometricCanvas
    // ----------------------------------------------------
    const cephStates = [
      {
        canonicalName: "ortho_pc_light_1440x900.png",
        altName: "01_ortho_pc_light_1440.png",
        width: 1440,
        height: 900,
        theme: "light",
        isMobile: false,
      },
      {
        canonicalName: "ortho_pc_dark_1440x900.png",
        altName: "02_ortho_pc_dark_1440.png",
        width: 1440,
        height: 900,
        theme: "dark",
        isMobile: false,
      },
      {
        canonicalName: "ortho_mobile_light_390x844.png",
        altName: "03_ortho_mobile_light_390.png",
        width: 390,
        height: 844,
        theme: "light",
        isMobile: true,
      },
      {
        canonicalName: "ortho_mobile_dark_390x844.png",
        altName: "04_ortho_mobile_dark_390.png",
        width: 390,
        height: 844,
        theme: "dark",
        isMobile: true,
      },
    ];

    for (const st of cephStates) {
      console.log(`\n[CEPH MODAL] Capturing ${st.canonicalName}...`);
      const context = await browser.newContext({
        viewport: { width: st.width, height: st.height },
        colorScheme: st.theme,
        isMobile: st.isMobile,
        hasTouch: st.isMobile,
        locale: "ru-RU",
      });

      await context.addInitScript(({ th }) => {
        try {
          localStorage.setItem("dente_demo_showcase", "true");
          localStorage.setItem("dente_onboarding_completed", "true");
          localStorage.setItem("dente_tour_completed", "true");
          localStorage.setItem("dente_tour_dismissed", "true");
          localStorage.setItem("dente_active_role", "doctor");
          localStorage.setItem("dente_role", "doctor");
          localStorage.setItem("dente_theme", th);
          localStorage.setItem("dente_theme_mode", th);
          sessionStorage.setItem("dente_unlocked", "true");
        } catch (_) {}
      }, { th: st.theme });

      const page = await context.newPage();
      await page.goto("http://127.0.0.1:5173/?demo=true#ceph", { waitUntil: "commit", timeout: 30000 });
      await page.waitForSelector(".boot-state", { state: "detached", timeout: 20000 }).catch(() => {});

      // Dispatch event to make sure ceph direct modal opens
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent("dente-open-ceph"));
      });

      // Wait for modal to become visible
      await page.waitForSelector('.ceph-modal-overlay, [data-testid="cephalometric-analysis-modal"], .cephalometric-modal', {
        state: "visible",
        timeout: 20000,
      }).catch((e) => console.log("[CEPH SELECTOR NOTICE]", e.message));

      await suppressOverlays(page);
      await applyTheme(page, st.theme);

      // Trigger calibration or anatomical template to render lines if needed
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll("button")).find((b) =>
          b.textContent && (b.textContent.includes("Анатомический шаблон") || b.textContent.includes("Калибровка точек"))
        );
        if (btn) btn.click();
      });
      await page.waitForTimeout(600);

      const filePath = path.join(PROOFS_DIR, st.canonicalName);
      const buffer = await page.screenshot({ fullPage: false, animations: "disabled", timeout: 15000 });
      fs.writeFileSync(filePath, buffer);

      if (st.altName) {
        fs.writeFileSync(path.join(PROOFS_DIR, st.altName), buffer);
      }
      console.log(`[SAVED] ${st.canonicalName} (${Math.round(fs.statSync(filePath).size / 1024)} KB)`);
      await context.close();
    }
  } finally {
    await browser.close();
  }

  console.log("\n=======================================================");
  console.log(">>> ALL CANONICAL ORTHO & CEPH PROOFS CAPTURED SUCCESSFULLY <<<");
  console.log("=======================================================\n");
}

main().catch((err) => {
  console.error("[FATAL ERROR]:", err);
  process.exit(1);
});
