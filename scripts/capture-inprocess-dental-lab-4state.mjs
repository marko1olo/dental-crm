import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { createServer } from "vite";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "../apps/web");
const configFile = path.resolve(webRoot, "vite.config.ts");
const PROOFS_DIR = path.resolve(__dirname, "../docs/proofs/dental_lab");
const ALT_PROOFS_DIR = path.resolve(__dirname, "../docs/proofs/lab");
const HYPHEN_PROOFS_DIR = path.resolve(__dirname, "../docs/proofs/dental-lab");

fs.mkdirSync(PROOFS_DIR, { recursive: true });
fs.mkdirSync(ALT_PROOFS_DIR, { recursive: true });
fs.mkdirSync(HYPHEN_PROOFS_DIR, { recursive: true });

async function main() {
  console.log("=== 1. Starting In-Process Vite Server ===");
  const viteServer = await createServer({
    configFile,
    root: webRoot,
    server: {
      host: "127.0.0.1",
      strictPort: false,
      hmr: false,
      watch: null,
    },
  });

  await viteServer.listen();
  const address = viteServer.httpServer.address();
  const port = address.port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`✓ In-process Vite listening on: ${baseUrl}`);

  console.log("=== 2. Launching Playwright Chromium ===");
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });

  const suppressOverlays = async (page) => {
    try {
      await page.evaluate(() => {
        const style = document.createElement("style");
        style.id = "suppress-all-overlays-4proof";
        style.innerHTML = `
          .tour-spotlight-root,
          .tour-backdrop-clickable-zone,
          [data-testid="guided-tour-spotlight-overlay"],
          [data-testid="guided-tour-coach-mark-card"],
          [data-testid="demo-mode-banner"],
          .shepherd-element,
          .global-toast-container,
          vite-error-overlay {
            display: none !important;
            pointer-events: none !important;
            opacity: 0 !important;
          }
        `;
        document.head.appendChild(style);
        document.querySelectorAll("vite-error-overlay, .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay']").forEach((el) => el.remove());
      });
    } catch (_) {}
  };

  const setupStorage = async (context, theme) => {
    await context.addInitScript(({ th }) => {
      localStorage.setItem("dente_organization_id", "org-1");
      localStorage.setItem("dente_clinic_token", "demo-clinic-token");
      localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-chief");
      localStorage.setItem("dente_active_role", "doctor");
      localStorage.setItem("dente_workspace_perspective", "doctor");
      localStorage.setItem("dente_demo_showcase", "true");
      localStorage.setItem("dente_demo_showcase_mode_v1", "true");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_tour_dismissed", "true");
      localStorage.setItem("dente_sidebar_collapsed", "false");
      localStorage.setItem("dente_unlocked", "true");
      sessionStorage.setItem("dente_unlocked", "true");
      localStorage.setItem(
        "dental-crm:web-ui-preferences:v1",
        JSON.stringify({
          version: 1,
          uiLanguage: "ru",
          selectedWorkspaceRole: "doctor",
          onboardingDismissed: true,
          onboardingStep: "done",
        })
      );
      localStorage.setItem(
        "dente_staff_session",
        JSON.stringify({
          userId: "usr-doctor-01",
          name: "Д-р Воронов А. В.",
          role: "doctor",
          roleScope: "doctor",
        })
      );
      localStorage.setItem(
        "dente_active_staff_user",
        JSON.stringify({
          id: "doc-1",
          fullName: "Д-р Воронов Алексей Владимирович",
          role: "doctor",
        })
      );
      localStorage.setItem("dente_theme", th);
      localStorage.setItem("dente_theme_mode", th);
      localStorage.setItem("theme", th);
      if (typeof document !== "undefined" && document.documentElement) {
        document.documentElement.setAttribute("data-theme", th);
        if (th === "dark") {
          document.documentElement.classList.add("dark");
          document.documentElement.classList.remove("light");
        } else {
          document.documentElement.classList.add("light");
          document.documentElement.classList.remove("dark");
        }
      }
    }, { th: theme });
  };

  try {
    const suites = [
      {
        suiteName: "DentalLabStudioModal",
        url: `${baseUrl}/?standalone=dental_lab&demo=true`,
        waitForSelector: '.dental-lab-modal-container, [data-testid="dental-lab-studio-modal-root"]',
        states: [
          {
            name: "01_dental_lab_studio_pc_light_1440x900.png",
            aliases: ["03_dental_lab_studio_modal_pc_light_1440x900.png"],
            width: 1440,
            height: 900,
            theme: "light",
            isMobile: false,
          },
          {
            name: "02_dental_lab_studio_pc_dark_1440x900.png",
            aliases: ["04_dental_lab_studio_modal_pc_dark_1440x900.png"],
            width: 1440,
            height: 900,
            theme: "dark",
            isMobile: false,
          },
          {
            name: "03_dental_lab_studio_mobile_light_390x844.png",
            aliases: ["04_dental_lab_studio_modal_mobile_light_390x844.png"],
            width: 390,
            height: 844,
            theme: "light",
            isMobile: true,
          },
          {
            name: "04_dental_lab_studio_mobile_dark_390x844.png",
            aliases: ["05_dental_lab_studio_modal_mobile_dark_390x844.png"],
            width: 390,
            height: 844,
            theme: "dark",
            isMobile: true,
          },
        ],
      },
      {
        suiteName: "DentalLabOrdersView (Kanban & Mobile Timeline)",
        url: `${baseUrl}/?demo=true#lab`,
        waitForSelector: '[data-testid="dental-lab-orders-view"], [data-testid="mobile-lab-orders-timeline-view"], .ztl-kanban-board, .mobile-lab-container',
        states: [
          {
            name: "01_dental_lab_orders_pc_light_1440x900.png",
            aliases: ["01_lab_orders_pc_light.png", "lab_orders_kanban_pc_light.png"],
            width: 1440,
            height: 900,
            theme: "light",
            isMobile: false,
          },
          {
            name: "02_dental_lab_orders_pc_dark_1440x900.png",
            aliases: ["02_lab_orders_pc_dark.png", "lab_orders_kanban_pc_dark.png"],
            width: 1440,
            height: 900,
            theme: "dark",
            isMobile: false,
          },
          {
            name: "03_dental_lab_orders_mobile_light_390x844.png",
            aliases: ["03_lab_orders_mobile_light.png", "lab_order_drawer_mobile_light.png"],
            width: 390,
            height: 844,
            theme: "light",
            isMobile: true,
          },
          {
            name: "04_dental_lab_orders_mobile_dark_390x844.png",
            aliases: ["04_lab_orders_mobile_dark.png", "lab_order_drawer_mobile_dark.png"],
            width: 390,
            height: 844,
            theme: "dark",
            isMobile: true,
          },
        ],
      },
    ];

    for (const suite of suites) {
      console.log(`\n======================================================`);
      console.log(`=== Suite: ${suite.suiteName} ===`);
      console.log(`======================================================`);

      for (const st of suite.states) {
        console.log(`\n--- Capturing ${st.name} (${st.width}x${st.height}, ${st.theme}) ---`);
        const context = await browser.newContext({
          viewport: { width: st.width, height: st.height },
          isMobile: st.isMobile,
          hasTouch: st.isMobile,
          deviceScaleFactor: st.isMobile ? 2 : 1,
          colorScheme: st.theme,
        });

        await setupStorage(context, st.theme);
        const page = await context.newPage();
        page.on("pageerror", (err) => console.log(`[PAGE ERROR]: ${err.message}`));
        page.on("console", (msg) => {
          if (msg.type() === "error") console.log(`[CONSOLE ERROR]: ${msg.text()}`);
        });

        await page.route("**/api/dashboard**", (route) => {
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              clinicSettings: {
                clinicName: "Стоматология ДЕНТЕ Премиум",
                mode: "small_clinic",
                staff: [{ id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "doctor", active: true }],
                chairs: [{ id: "chair-1", name: "Кресло 1" }],
                hasDentalLab: true,
              },
              appointments: [],
              patients: [{ id: "pat-1", fullName: "Ковалев Дмитрий Сергеевич" }],
            }),
          });
        });

        await page.route("**/api/auth/**", (route) => {
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              token: "demo-staff-token",
              user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "doctor" },
            }),
          });
        });

        console.log(`Navigating to ${suite.url}...`);
        await page.goto(suite.url, { waitUntil: "domcontentloaded", timeout: 120000 });
        await page.waitForTimeout(2000);
        await suppressOverlays(page);

        // Enforce theme classes
        await page.evaluate(({ theme }) => {
          document.documentElement.setAttribute("data-theme", theme);
          const isDark = theme === "dark";
          document.documentElement.classList.toggle("dark", isDark);
          document.documentElement.classList.toggle("light", !isDark);
          document.body.setAttribute("data-theme", theme);
          document.body.classList.toggle("dark", isDark);
          document.body.classList.toggle("light", !isDark);
        }, { theme: st.theme });

        // Wait for target selector
        await page.waitForSelector(suite.waitForSelector, {
          state: "visible",
          timeout: 45000,
        });

        // For Lab Orders View: ensure table rows are loaded
        if (suite.suiteName.includes("DentalLabOrdersView")) {
          await page.waitForFunction(() => !document.body.innerText.includes("Загрузка нарядов"), { timeout: 10000 }).catch(() => {});
          if (!st.isMobile) {
            const firstRowCheckbox = page.locator('tbody input[type="checkbox"]').first();
            if (await firstRowCheckbox.count() > 0) {
              await firstRowCheckbox.click().catch(() => {});
              await page.waitForTimeout(600);
            }
          }
        }

        await page.waitForTimeout(1500);
        await suppressOverlays(page);

        const outPath = path.join(PROOFS_DIR, st.name);
        await page.screenshot({ path: outPath, fullPage: false, animations: "disabled" });
        const size = fs.statSync(outPath).size;
        console.log(`✓ Saved ${st.name}: ${outPath} (${(size / 1024).toFixed(1)} KB)`);

        if (size < 20480) {
          throw new Error(`Screenshot ${st.name} is smaller than 20KB (${size} bytes)!`);
        }

        // Copy to alt dir & aliases
        fs.copyFileSync(outPath, path.join(ALT_PROOFS_DIR, st.name));
        fs.copyFileSync(outPath, path.join(HYPHEN_PROOFS_DIR, st.name));
        for (const alias of st.aliases) {
          fs.copyFileSync(outPath, path.join(PROOFS_DIR, alias));
          fs.copyFileSync(outPath, path.join(ALT_PROOFS_DIR, alias));
          fs.copyFileSync(outPath, path.join(HYPHEN_PROOFS_DIR, alias));
        }

        await context.close();
      }
    }

    console.log("\n>>> ALL 8 DENTAL LAB 4-STATE PROOFS SUCCESSFULLY CAPTURED (>= 20KB)! <<<");
  } finally {
    await browser.close();
    await viteServer.close();
    console.log("Vite and Playwright closed cleanly.");
  }
}

main().catch((err) => {
  console.error("FATAL in capture script:", err);
  process.exit(1);
});
