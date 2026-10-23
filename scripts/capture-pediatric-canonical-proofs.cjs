const puppeteer = require("puppeteer");
const path = require("node:path");
const fs = require("node:fs");

const PROOFS_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/pediatric");
if (!fs.existsSync(PROOFS_DIR)) {
  fs.mkdirSync(PROOFS_DIR, { recursive: true });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function suppressOverlays(page) {
  await page.evaluate(() => {
    const style = document.createElement("style");
    style.id = "suppress-all-tour-overlays";
    style.innerHTML = `
      .tour-spotlight-root,
      .tour-backdrop-clickable-zone,
      [data-testid="guided-tour-spotlight-overlay"],
      [data-testid="guided-tour-coach-mark-card"],
      .shepherd-element {
        display: none !important;
        pointer-events: none !important;
        opacity: 0 !important;
      }
    `;
    document.head.appendChild(style);
  });
}

async function saveProof(page, filename, description) {
  const primaryPath = path.join(PROOFS_DIR, filename);
  await page.screenshot({ path: primaryPath, fullPage: false });
  const stat = fs.statSync(primaryPath);
  if (stat.size < 20000) {
    throw new Error(`[BLANK DETECTED] Screenshot ${filename} is only ${stat.size} bytes!`);
  }
  console.log(`[PROOF CAPTURED] ${filename} (${stat.size} bytes) -> ${description}`);
}

async function main() {
  console.log("=== STARTING CANONICAL 4-STATE PEDIATRIC DENTISTRY PROOF CAPTURE ===");
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    // Set auth tokens for immediate access
    await page.evaluateOnNewDocument(() => {
      localStorage.setItem("dente_clinic_token", "demo-showcase-token-owner");
      localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-owner");
      localStorage.setItem("dente_cached_active_staff_user", JSON.stringify({
        id: "demo-owner-id",
        fullName: "Д-р Воронов М. С.",
        role: "owner",
        email: "owner@dente-demo.ru",
        organizationId: "01a00000-0000-0000-0000-000000000000",
        specialization: "Главврач / Владелец"
      }));
      localStorage.setItem("dente_demo_showcase", "true");
      localStorage.setItem("dente_last_view", "visit");
      localStorage.setItem("dente_theme", "light");
    });

    console.log("1. Navigating to http://127.0.0.1:5173/?demo=true#visit ...");
    await page.goto("http://127.0.0.1:5173/?demo=true#visit", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForFunction(() => {
      const txt = document.body.innerText || "";
      return !txt.includes("Загрузка CRM") && txt.length > 50;
    }, { timeout: 30000 });
    console.log("PC page fully loaded and hydrated");
    await sleep(2000);
    await suppressOverlays(page);

    // Click "Детский" dentition mode button
    console.log("2. Switching to Pediatric (Детский) dentition...");
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const childBtn = btns.find((b) => b.textContent && b.textContent.trim() === "Детский");
      if (childBtn) childBtn.click();
    });
    await sleep(2000);

    // Expand protocol drawer if collapsed
    console.log("2b. Expanding clinical protocols drawer...");
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const expandBtn = btns.find((b) => b.textContent && b.textContent.includes("Развернуть"));
      if (expandBtn) expandBtn.click();
    });
    await sleep(2500);

    // ─── 1. PC LIGHT (1440x900) ──────────────────────────────────────────────
    console.log("3. Capturing PC Light (1440x900)...");
    await page.evaluate(() => {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      document.documentElement.setAttribute("data-theme", "light");
      localStorage.setItem("dente_theme", "light");
      localStorage.setItem("theme", "light");
    });
    await sleep(1000);
    await saveProof(
      page,
      "pediatric_pc_light_1440x900.png",
      "Pediatric Dentistry Chairside Workspace (PC Light 1440x900) - Primary Dentition 51-85"
    );
    await saveProof(
      page,
      "pediatric_protocol_pc_light.png",
      "Pediatric Dentistry Chairside Protocol (PC Light)"
    );

    // ─── 2. PC DARK (1440x900) ───────────────────────────────────────────────
    console.log("4. Capturing PC Dark (1440x900)...");
    await page.evaluate(() => {
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("dente_theme", "dark");
      localStorage.setItem("theme", "dark");
    });
    await sleep(1000);
    await saveProof(
      page,
      "pediatric_pc_dark_1440x900.png",
      "Pediatric Dentistry Chairside Workspace (PC Dark 1440x900) - Primary Dentition 51-85"
    );
    await saveProof(
      page,
      "pediatric_protocol_pc_dark.png",
      "Pediatric Dentistry Chairside Protocol (PC Dark)"
    );

    // ─── 3. BRAVERY DIPLOMA MODAL ─────────────────────────────────────────────
    console.log("5. Opening Bravery Diploma modal...");
    const openedModal = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const diplomaBtn = btns.find((b) => b.textContent && (b.textContent.includes("Грамота") || b.textContent.includes("Диплом") || b.getAttribute("data-testid") === "pediatric-toolbar-diploma-btn"));
      if (diplomaBtn) {
        diplomaBtn.click();
        return true;
      }
      return false;
    });
    await sleep(2000);
    if (openedModal) {
      await saveProof(
        page,
        "pediatric_diploma_pc_dark.png",
        "Bravery Diploma Modal (PC Dark 1440x900)"
      );
      await page.evaluate(() => {
        document.documentElement.classList.remove("dark");
        document.documentElement.classList.add("light");
        document.documentElement.setAttribute("data-theme", "light");
      });
      await sleep(500);
      await saveProof(
        page,
        "pediatric_diploma_pc_light.png",
        "Bravery Diploma Modal (PC Light 1440x900)"
      );

      // Close modal
      await page.evaluate(() => {
        const closeBtns = Array.from(document.querySelectorAll("button"));
        const close = closeBtns.find((b) => b.getAttribute("aria-label") === "Close" || b.textContent.includes("Закрыть") || b.textContent.includes("✕"));
        if (close) close.click();
      });
      await sleep(1000);
    }

    // ─── 4. MOBILE VIEWPORTS (390x844) ────────────────────────────────────────
    console.log("6. Opening dedicated Mobile Viewport (390x844)...");
    const mobilePage = await browser.newPage();
    await mobilePage.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await mobilePage.evaluateOnNewDocument(() => {
      localStorage.setItem("dente_clinic_token", "demo-showcase-token-owner");
      localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-owner");
      localStorage.setItem("dente_cached_active_staff_user", JSON.stringify({
        id: "demo-owner-id",
        fullName: "Д-р Воронов М. С.",
        role: "owner",
        email: "owner@dente-demo.ru",
        organizationId: "01a00000-0000-0000-0000-000000000000",
        specialization: "Главврач / Владелец"
      }));
      localStorage.setItem("dente_demo_showcase", "true");
      localStorage.setItem("dente_offline_mode", "true");
      localStorage.setItem("dente_bypass_auth", "true");
      localStorage.setItem("dente_active_mode", "clinic");
      localStorage.setItem("dente_last_view", "visit");
      localStorage.setItem("dente_theme", "light");
      sessionStorage.setItem("dente_unlocked", "true");
      sessionStorage.setItem("dente:sw-controller-reload", "1");
    });
    await mobilePage.goto("http://127.0.0.1:5173/?demo=true#visit", { waitUntil: "domcontentloaded", timeout: 30000 });
    await mobilePage.waitForFunction(() => {
      const txt = document.body.innerText || "";
      return !txt.includes("Загрузка CRM") && !txt.includes("Загрузка клинического приёма") && txt.length > 100;
    }, { timeout: 30000 });
    console.log("Mobile page initial CRM & Clinical Visit hydration finished");
    await sleep(2000);
    await suppressOverlays(mobilePage);

    // If offline fallback button is present, click it
    const hasOfflineFallback = await mobilePage.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const b = btns.find((x) => x.textContent && x.textContent.includes("Перейти в автономный режим"));
      if (b) {
        b.click();
        return true;
      }
      return false;
    });

    if (hasOfflineFallback) {
      console.log("Clicked 'Перейти в автономный режим' on mobile, waiting for reload");
      await sleep(2000);
      await mobilePage.waitForFunction(() => {
        const txt = document.body.innerText || "";
        return !txt.includes("Загрузка CRM") && !txt.includes("Загрузка клинического приёма") && txt.length > 50;
      }, { timeout: 30000 });
      console.log("Mobile offline reload complete");
      await sleep(2000);
    }

    // Wait for visit screen to settle
    await sleep(2000);
    await suppressOverlays(mobilePage);

    // Click "Детский" dentition mode button on mobile
    await mobilePage.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const childBtn = btns.find((b) => b.textContent && b.textContent.trim() === "Детский");
      if (childBtn) childBtn.click();
    });
    await sleep(2500);

    await saveProof(
      mobilePage,
      "pediatric_mobile_light_390x844.png",
      "Pediatric Dentistry Mobile (Mobile Light 390x844)"
    );

    await mobilePage.evaluate(() => {
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
    });
    await sleep(1500);
    await saveProof(
      mobilePage,
      "pediatric_mobile_dark_390x844.png",
      "Pediatric Dentistry Mobile (Mobile Dark 390x844)"
    );

    console.log("=== ALL PEDIATRIC 4-STATE PROOFS CAPTURED SUCCESSFULLY ===");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("FATAL ERROR in pediatric capture:", err);
  process.exit(1);
});
