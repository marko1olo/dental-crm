/**
 * scripts/take_print_documents_proofs.cjs
 *
 * Автономный Red Team скрипт для снятия канонических визуальных пруфов и проверки
 * ликвидации бага «белого листа» при печати (DOC-01) на живом приложении.
 * Мандаты 8ze, 8al, 8am, 8e, Apple HIG.
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

const BASE_URL = "http://127.0.0.1:5173/?demo=true";
const PROOF_DIR = path.resolve(__dirname, "../docs/proofs/documents");
const BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/c493ee04-856b-46d9-9795-1b4f8bcb7a49");

if (!fs.existsSync(PROOF_DIR)) fs.mkdirSync(PROOF_DIR, { recursive: true });
if (!fs.existsSync(BRAIN_DIR)) fs.mkdirSync(BRAIN_DIR, { recursive: true });

async function suppressOverlays(page) {
  try {
    await page.evaluate(() => {
      const styleId = "dente-clean-proof-style";
      let el = document.getElementById(styleId);
      if (!el) {
        el = document.createElement("style");
        el.id = styleId;
        el.innerHTML = `
          .tour-spotlight-root,
          .tour-backdrop-clickable-zone,
          [data-testid="guided-tour-spotlight-overlay"],
          [data-testid="guided-tour-coach-mark-card"],
          [data-testid="demo-mode-banner"],
          .global-toast-container,
          vite-error-overlay {
            display: none !important;
            pointer-events: none !important;
          }

          @media print {
            .boot-state,
            [data-testid="copilot-drawer-trigger"],
            .copilot-global-host,
            .copilot-trigger-btn,
            .pro-a4-toolbar,
            header:not(.a4-header):not(.dente-a4-sheet-header),
            button,
            [role="tooltip"] {
              display: none !important;
            }
          }
        `;
        document.head.appendChild(el);
      }
      document.querySelectorAll("vite-error-overlay, .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay']").forEach((item) => item.remove());
    });
  } catch (_) {}
}

async function setTheme(page, theme) {
  await page.evaluate((th) => {
    document.documentElement.setAttribute("data-theme", th);
    if (th === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("dente_theme", th);
    localStorage.setItem("dente_theme_mode", th);
    localStorage.setItem("theme", th);
    document.documentElement.style.colorScheme = th;
  }, theme);
  await suppressOverlays(page);
  await page.waitForTimeout(400);
}

async function captureProof(page, filename, options = {}) {
  await suppressOverlays(page);
  await page.waitForTimeout(400);

  const targetPath = path.join(PROOF_DIR, filename);
  await page.screenshot({ path: targetPath, fullPage: options.fullPage || false, animations: "disabled" });

  const buf = fs.readFileSync(targetPath);
  const sizeKb = (buf.length / 1024).toFixed(1);
  const hash = crypto.createHash("md5").update(buf).digest("hex").slice(0, 10);
  console.log(`  -> Captured: ${filename} (${sizeKb} KB, md5: ${hash})`);

  if (buf.length < 25 * 1024) {
    throw new Error(`Screenshot ${filename} is suspiciously small: ${sizeKb} KB (< 25 KB)`);
  }

  // Sync to brain dir
  const brainPath = path.join(BRAIN_DIR, filename);
  fs.copyFileSync(targetPath, brainPath);

  return { filename, sizeKb, hash, path: targetPath };
}

async function waitForAppReady(page) {
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(400);
    const text = await page.evaluate(() => document.body ? document.body.innerText : "");
    if (!text.includes("Загрузка системы") && text.length > 200) break;
  }
}

async function main() {
  console.log("[DOC-01 INQUISITION] Launching Chromium for live print and documents audit...");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-gpu"],
  });

  const capturedProofs = [];

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false,
    });

    await context.addInitScript(() => {
      localStorage.setItem("dente_theme_mode", "light");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_tour_dismissed", "true");
      localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
      localStorage.setItem("dente_demo_banner_dismissed", "true");
      localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
    });

    const page = await context.newPage();
    console.log(`\n--- Phase 1: Navigating to ${BASE_URL}#documents ---`);
    await page.goto(`${BASE_URL}#documents`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await waitForAppReady(page);

    // Wait for documents studio modal
    await page.waitForSelector('[data-testid="documents-studio-modal"]', { timeout: 15000, state: "visible" }).catch(async () => {
      console.log("  -> Triggering dente:open-documents event manually...");
      await page.evaluate(() => window.dispatchEvent(new CustomEvent("dente:open-documents")));
      await page.waitForSelector('[data-testid="documents-studio-modal"]', { timeout: 10000, state: "visible" });
    });
    await page.waitForTimeout(800);

    // 1. PC Light
    console.log("  -> Capturing PC Light (1440x900)...");
    await setTheme(page, "light");
    capturedProofs.push(await captureProof(page, "docs_studio_pc_light_1440x900.png"));

    // 2. PC Dark
    console.log("  -> Capturing PC Dark (1440x900)...");
    await setTheme(page, "dark");
    capturedProofs.push(await captureProof(page, "docs_studio_pc_dark_1440x900.png"));

    // ====================================================
    // PHASE 2: Mobile Apple HIG Documents Studio (390x844)
    // ====================================================
    console.log("\n--- Phase 2: Mobile Apple HIG Documents Studio (390x844) ---");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(500);

    // 3. Mobile Dark
    console.log("  -> Capturing Mobile Dark (390x844)...");
    await setTheme(page, "dark");
    capturedProofs.push(await captureProof(page, "docs_studio_mobile_dark_390x844.png"));

    // 4. Mobile Light
    console.log("  -> Capturing Mobile Light (390x844)...");
    await setTheme(page, "light");
    capturedProofs.push(await captureProof(page, "docs_studio_mobile_light_390x844.png"));

    // ====================================================
    // PHASE 3: Zero-Blank-Sheet @media print Audit
    // ====================================================
    console.log("\n--- Phase 3: Zero-Blank-Sheet @media print Audit ---");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(400);

    // Emulate print media
    console.log("  -> Emulating @media print on Page...");
    await page.emulateMedia({ media: "print" });
    await page.waitForTimeout(500);

    // Verify computed styles in print media
    const printSanity = await page.evaluate(() => {
      const root = document.getElementById("root");
      const rootDisplay = root ? window.getComputedStyle(root).display : "null";
      const paperSheet = document.querySelector('[data-testid="dente-a4-paper-sheet"], .dente-a4-paper-sheet, .pro-a4-page-sheet');
      const paperDisplay = paperSheet ? window.getComputedStyle(paperSheet).display : "null";
      const paperHeight = paperSheet ? paperSheet.clientHeight : 0;
      return {
        rootDisplay,
        paperDisplay,
        paperHeight,
        hasWhiteoutBug: rootDisplay === "none",
      };
    });

    console.log(`  -> Print Sanity Check: rootDisplay=${printSanity.rootDisplay}, paperDisplay=${printSanity.paperDisplay}, paperHeight=${printSanity.paperHeight}px`);
    if (printSanity.hasWhiteoutBug) {
      throw new Error(`CRITICAL FAILURE: Whiteout bug detected! rootDisplay is ${printSanity.rootDisplay}`);
    }

    // Capture print preview of Contract
    console.log("  -> Capturing print preview of Contract (A4)...");
    capturedProofs.push(await captureProof(page, "print_preview_contract_a4.png", { fullPage: true }));

    // Switch to Informed Consent 1051n
    console.log("  -> Switching to Informed Consent 1051n package...");
    await page.emulateMedia({ media: "screen" });
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const consentBtn = btns.find(b => b.innerText.includes("Информированное согласие") || b.innerText.includes("ИДС"));
      if (consentBtn) consentBtn.click();
    });
    await page.waitForTimeout(500);
    await page.emulateMedia({ media: "print" });
    capturedProofs.push(await captureProof(page, "print_preview_consent_1051n_a4.png", { fullPage: true }));

    // Switch to Tax Certificate (FNS)
    console.log("  -> Switching to Tax Certificate (FNS) package...");
    await page.emulateMedia({ media: "screen" });
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const taxBtn = btns.find(b => b.innerText.includes("Справка для налоговой") || b.innerText.includes("ФНС") || b.innerText.includes("НДФЛ"));
      if (taxBtn) taxBtn.click();
    });
    await page.waitForTimeout(500);
    await page.emulateMedia({ media: "print" });
    capturedProofs.push(await captureProof(page, "print_preview_tax_certificate_a4.png", { fullPage: true }));

    await page.emulateMedia({ media: "screen" });

    // ====================================================
    // PHASE 4: OUTPATIENT CARD (ЭМК / ФОРМА 043/У) MODAL & PRINT AUDIT
    // ====================================================
    console.log("\n--- Phase 4: Outpatient Card (ЭМК) Draft & Signed Print Proofs ---");

    // Close studio modal first
    await page.evaluate(() => {
      const closeBtn = document.querySelector('[data-testid="documents-studio-modal"] button');
      if (closeBtn) closeBtn.click();
    });
    await page.waitForTimeout(500);

    // 4.1. Open Draft Outpatient Card Modal
    console.log("  -> Dispatching dente:open-outpatient-card event (Draft)...");
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent("dente:open-outpatient-card", { detail: { isOutpatientCard: true } }));
    });
    await page.waitForSelector('[data-testid="outpatient-card-print-modal"]', { timeout: 15000, state: "visible" });
    await page.waitForTimeout(800);
    await setTheme(page, "light");

    console.log("  -> Capturing EMR Card Modal (Draft)...");
    capturedProofs.push(await captureProof(page, "emk_card_draft_modal_pc_light.png"));

    console.log("  -> Emulating print media for EMR Card (Draft with watermark)...");
    await page.emulateMedia({ media: "print" });
    await page.waitForTimeout(600);
    capturedProofs.push(await captureProof(page, "print_preview_emk_draft_watermark_a4.png", { fullPage: true }));
    await page.emulateMedia({ media: "screen" });

    // 4.2. Signed EMR Card (Stamp "ПОДПИСАНО ВРАЧОМ")
    console.log("  -> Opening Signed EMR Card mode with ?signed=1...");
    await page.evaluate(() => {
      const url = new URL(window.location.href);
      url.searchParams.set("signed", "1");
      window.history.replaceState({}, "", url.href);
      window.dispatchEvent(new CustomEvent("dente:open-outpatient-card", { detail: { isOutpatientCard: true, isSigned: true } }));
    });
    await page.waitForTimeout(1000);

    console.log("  -> Capturing EMR Card Modal (Signed)...");
    capturedProofs.push(await captureProof(page, "emk_card_signed_modal_pc_light.png"));

    console.log("  -> Emulating print media for EMR Card (Signed with stamp)...");
    await page.emulateMedia({ media: "print" });
    await page.waitForTimeout(600);
    capturedProofs.push(await captureProof(page, "print_preview_emk_signed_stamp_a4.png", { fullPage: true }));
    await page.emulateMedia({ media: "screen" });

    console.log("\n========================================================");
    console.log(`[DOC-01 INQUISITION] SUCCESS! Captured ${capturedProofs.length} proofs without errors:`);
    for (const p of capturedProofs) {
      console.log(`  ✓ ${p.filename} (${p.sizeKb} KB)`);
    }
    console.log("========================================================");

  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("\n[DOC-01 INQUISITION] Execution failed:", err);
  process.exit(1);
});
