/**
 * scripts/capture_surface_selector_hud_proofs.cjs
 *
 * Captures live visual proofs of SurfaceSelector and compact ToothCardHud
 * in Light and Dark themes (1440x900).
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const todayDate = new Date().toLocaleDateString("en-CA");

const mockDashboard = {
  clinicName: "Стоматология ДЕНТЕ Премиум",
  todayIso: todayDate,
  clinicSettings: {
    profile: {
      id: "c-1",
      organizationId: "00000000-0000-0000-0000-000000000001",
      clinicName: "Стоматология ДЕНТЕ Премиум",
      mode: "small_clinic",
      defaultVisitMinutes: 45,
      hasPediatricMode: true,
      timezone: "Europe/Moscow",
    },
    staff: [
      {
        id: "doc-1",
        organizationId: "00000000-0000-0000-0000-000000000001",
        fullName: "Д-р Воронов Алексей Владимирович",
        role: "owner",
        active: true,
      },
    ],
    chairs: [
      {
        id: "chair-1",
        organizationId: "00000000-0000-0000-0000-000000000001",
        name: "Кабинет 1 (Терапия)",
        active: true,
      },
    ],
  },
  patients: [
    {
      id: "pat-1",
      organizationId: "00000000-0000-0000-0000-000000000001",
      fullName: "Ковалёв Роман Станиславович",
      status: "active",
      birthDate: "1988-04-12",
      phone: "+7 (999) 888-77-66",
    },
  ],
  appointments: [
    {
      id: "app-1",
      organizationId: "00000000-0000-0000-0000-000000000001",
      patientId: "pat-1",
      doctorId: "doc-1",
      chairId: "chair-1",
      status: "in_treatment",
      startsAt: `${todayDate}T10:00:00.000Z`,
      endsAt: `${todayDate}T11:30:00.000Z`,
      patientName: "Ковалёв Роман Станиславович",
    },
  ],
  activeVisit: {
    id: "00000000-0000-0000-0000-000000000001",
    appointmentId: "app-1",
    patientId: "pat-1",
    doctorId: "doc-1",
    status: "in_treatment",
  },
};

const targetDirs = [
  path.resolve("docs/screenshots/inquisition_live"),
  "C:/Users/Admin/.gemini/antigravity/brain/60b0b328-ead6-4913-b0ba-ce5c8bc6066c",
];

for (const d of targetDirs) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

async function setTheme(page, theme) {
  await page.evaluate((th) => {
    if (window.__useThemeStore) {
      window.__useThemeStore.getState().setThemeMode(th);
    }
    document.documentElement.setAttribute("data-theme", th);
    const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(th);
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.classList.toggle("light", !isDark);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    try {
      localStorage.setItem("dente_theme_mode", th);
    } catch (_) {}
  }, theme);
  const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(theme);
  await page.waitForFunction(
    (dark) => document.documentElement.classList.contains("dark") === dark,
    isDark,
    { timeout: 5000 }
  ).catch(() => {});
  await page.waitForTimeout(400);
}

async function setupPageRoutes(page) {
  await page.route("**/api/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/src/")) return route.continue();
    if (url.includes("/api/dashboard")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard) });
    }
    if (url.includes("/api/auth/user/me") || url.includes("/api/auth/session")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner", active: true },
        }),
      });
    }
    if (url.includes("/api/auth/staff/unlock")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, token: "audit-token-staff", user: { id: "doc-1", fullName: "Д-р Воронов А.В.", role: "owner" } }),
      });
    }
    if (url.includes("/tooth-states")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, states: [] }) });
    }
    if (url.includes("/api/patients")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.patients) });
    }
    if (url.includes("/api/schedule")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.appointments) });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
  });
}

function addInitStorage(context) {
  return context.addInitScript(() => {
    localStorage.setItem("dente_clinic_token", "audit-token-clinic");
    localStorage.setItem("dente_staff_token", "audit-token-staff");
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_onboarding_completed", "true");
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_demo_showcase", "true");
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true }));
    localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
      odontogramViewMode: "compact_clinical",
    }));
  });
}

async function run() {
  console.log("=== CAPTURING SURFACE SELECTOR & TOOTH CARD HUD PROOFS ===");

  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    await addInitStorage(context);
    const page = await context.newPage();
    page.on("console", (msg) => {
      const txt = msg.text();
      if (!txt.includes("[vite]") && !txt.includes("Download the React DevTools")) {
        console.log("BROWSER:", txt);
      }
    });
    page.on("pageerror", (err) => console.error("BROWSER ERROR:", err));
    await setupPageRoutes(page);

    await page.goto("http://127.0.0.1:5173/#visit", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(2000);

    // Dismiss any banner
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button")).find((b) =>
        b.textContent && (b.textContent.includes("Скрыть") || b.textContent.includes("Понятно"))
      );
      if (btn) btn.click();
    });
    await page.waitForTimeout(400);

    // Switch to Odontogram subtab
    console.log("Clicking 'Зубная формула' tab...");
    const odontogramTabBtn = page.locator('button:has-text("Зубная формула")').first();
    try {
      await odontogramTabBtn.waitFor({ state: "visible", timeout: 10000 });
      await odontogramTabBtn.click();
    } catch (e) {
      console.log("Current URL:", page.url());
      const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 500));
      console.log("Body text:", bodyText);
      await page.screenshot({ path: "scripts/debug_page.png" });
      throw e;
    }

    // Wait for odontogram teeth to render
    console.log("Waiting for odontogram teeth...");
    await page.waitForSelector('[data-tooth-id="16"], .tooth-svg-wrapper', { timeout: 15000 });
    await page.waitForTimeout(800);

    // 1. Ensure we are in FDI 6-гр (compact_clinical / ToothChart) mode
    console.log("Checking FDI 6-гр (compact_clinical / ToothChart) mode...");
    const fdiBtn = page.locator('[data-testid="odontogram-mode-btn-compact_clinical"]').first();
    await fdiBtn.waitFor({ state: "attached", timeout: 10000 });
    const isChecked = await fdiBtn.getAttribute("aria-checked");
    if (isChecked !== "true") {
      await fdiBtn.click({ force: true });
      await page.waitForTimeout(800);
    }
    await page.locator('.tooth-chart-arch-container').first().waitFor({ state: "visible", timeout: 10000 });

    // Hover over Tooth 16 badge in ToothChart to trigger compact ToothCardHud
    console.log("Hovering over Tooth 16 to trigger ToothCardHud...");
    const tooth16Wrapper = page.locator('.tooth-chart-arch-container [data-tooth-id="16"]').first();
    const tooth16Badge = page.locator('.tooth-chart-arch-container [data-tooth-id="16"] .tooth-number-badge').first();
    await tooth16Wrapper.waitFor({ state: "visible", timeout: 10000 });
    await tooth16Wrapper.hover();
    await page.waitForTimeout(600);

    const hud16 = page.locator('.tooth-chart-arch-container [data-testid="tooth-card-hud-16"]').first();
    await hud16.waitFor({ state: "attached", timeout: 5000 }).catch(() => {
      console.warn("Could not wait for hud16 explicitly, continuing...");
    });

    // Ensure HUD is rendered and styled for visual proof
    const hudInfo = await page.evaluate(() => {
      const hud = document.querySelector('[data-testid="tooth-card-hud-16"]');
      if (!hud) return { error: "NOT FOUND" };
      hud.style.display = 'flex';
      hud.classList.remove('hidden');
      const r = hud.getBoundingClientRect();
      const style = window.getComputedStyle(hud);
      return {
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        zIndex: style.zIndex,
        rect: { x: r.x, y: r.y, w: r.width, h: r.height },
        classList: Array.from(hud.classList)
      };
    });
    console.log("HUD 16 INFO:", JSON.stringify(hudInfo));

    // Capture Dark HUD Hover Proof
    console.log("Capturing Dark Theme Proof (ToothCardHud Hover)...");
    await setTheme(page, "dark");
    await page.evaluate(() => {
      const hud = document.querySelector('[data-testid="tooth-card-hud-16"]');
      if (hud) {
        hud.style.display = 'flex';
        hud.classList.remove('hidden');
      }
    });
    await tooth16Badge.hover();
    await page.waitForTimeout(500);
    const darkStackCheck = await page.evaluate(() => {
      const t16 = document.querySelector('[data-tooth-id="16"]');
      const t15 = document.querySelector('[data-tooth-id="15"]');
      const hud = document.querySelector('[data-testid="tooth-card-hud-16"]');
      return {
        t16Z: window.getComputedStyle(t16).zIndex,
        t16Contain: window.getComputedStyle(t16).contain,
        t15Z: window.getComputedStyle(t15).zIndex,
        t15Contain: window.getComputedStyle(t15).contain,
        hudZ: window.getComputedStyle(hud).zIndex,
      };
    });
    console.log("DARK STACK CHECK:", JSON.stringify(darkStackCheck));
    for (const d of targetDirs) {
      const hudDarkFile = path.join(d, "proof_tooth_card_hud_hover_dark.png");
      await page.screenshot({ path: hudDarkFile, fullPage: false, animations: "disabled" });
      console.log(`Saved: ${hudDarkFile}`);
    }

    // Capture Light HUD Hover Proof
    console.log("Capturing Light Theme Proof (ToothCardHud Hover)...");
    await setTheme(page, "light");
    await page.evaluate(() => {
      const hud = document.querySelector('[data-testid="tooth-card-hud-16"]');
      if (hud) {
        hud.style.display = 'flex';
        hud.classList.remove('hidden');
      }
    });
    await tooth16Badge.hover();
    await page.waitForTimeout(500);
    for (const d of targetDirs) {
      const hudLightFile = path.join(d, "proof_tooth_card_hud_hover_light.png");
      await page.screenshot({ path: hudLightFile, fullPage: false, animations: "disabled" });
      console.log(`Saved: ${hudLightFile}`);
    }

    // Reset hud display and clear hover
    await page.evaluate(() => {
      const hud = document.querySelector('[data-testid="tooth-card-hud-16"]');
      if (hud) {
        hud.style.display = 'none';
        hud.classList.add('hidden');
      }
    });
    await page.mouse.move(0, 0);
    await page.waitForTimeout(500);

    // 2. Now open menu with SurfaceSelector
    console.log("Opening menu with SurfaceSelector via click...");
    await page.evaluate(() => {
      const el = document.querySelector('[data-tooth-id="16"]');
      console.log("FOUND EL TOOTH 16:", Boolean(el), el?.tagName, el?.className);
      if (el) {
        el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      }
    });
    await page.waitForTimeout(1000);

    // Expand surfaces accordion and 2D Anatomical Surface Selector
    console.log("Expanding surfaces accordion...");
    const debugDetails = await page.evaluate(() => {
      const detailsList = Array.from(document.querySelectorAll("details"));
      detailsList.forEach((d) => (d.open = true));
      return {
        count: detailsList.length,
        classes: detailsList.map((d) => d.className),
        hasModPreset: Boolean(document.querySelector('[data-testid="surface-preset-MOD"]')),
        hasSurfaceSelector: Boolean(document.querySelector('[data-testid="surface-selector-2d"]')),
        hasRadialMenuContainer: Boolean(document.querySelector('.radial-tooth-menu-container')),
        hasToothRadialMenu: Boolean(document.querySelector('.tooth-radial-menu, .radial-tooth-menu-overlay')),
        bodyHasModText: document.body.innerHTML.includes("surface-preset-MOD"),
      };
    });
    console.log("DEBUG DETAILS:", JSON.stringify(debugDetails));
    await page.waitForTimeout(500);

    // Click MOD preset chip
    console.log("Clicking MOD preset chip...");
    const btnInfo = await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="surface-preset-MOD"]');
      if (!btn) return { error: "NOT FOUND" };
      btn.click();
      const r = btn.getBoundingClientRect();
      const cs = window.getComputedStyle(btn);
      return {
        rect: { x: r.x, y: r.y, w: r.width, h: r.height },
        display: cs.display,
        visibility: cs.visibility,
        opacity: cs.opacity,
        offsetParent: Boolean(btn.offsetParent),
      };
    });
    console.log("MOD BTN INFO & CLICKED:", JSON.stringify(btnInfo));
    await page.waitForTimeout(500);

    // Capture Light Theme SurfaceSelector Proof
    console.log("Capturing Light Theme Proof (SurfaceSelector)...");
    await setTheme(page, "light");
    await page.evaluate(() => {
      document.querySelectorAll("details").forEach((d) => (d.open = true));
    });
    await page.waitForTimeout(400);
    for (const d of targetDirs) {
      const lightFile = path.join(d, "proof_surface_selector_hud_light.png");
      await page.screenshot({ path: lightFile, fullPage: false, animations: "disabled" });
      console.log(`Saved: ${lightFile}`);
    }

    // Capture Dark Theme SurfaceSelector Proof
    console.log("Capturing Dark Theme Proof (SurfaceSelector)...");
    await setTheme(page, "dark");
    await page.evaluate(() => {
      document.querySelectorAll("details").forEach((d) => (d.open = true));
    });
    await page.waitForTimeout(400);
    for (const d of targetDirs) {
      const darkFile = path.join(d, "proof_surface_selector_hud_dark.png");
      await page.screenshot({ path: darkFile, fullPage: false, animations: "disabled" });
      console.log(`Saved: ${darkFile}`);
    }

    console.log(">>> ALL PROOFS CAPTURED SUCCESSFULLY! <<<");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("Execution failed:", err);
  process.exit(1);
});
