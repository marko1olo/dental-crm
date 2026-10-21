import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToString } from "react-dom/server";
import { chromium } from "playwright";
import { AnesthesiaQuickBar } from "../apps/web/src/components/anesthesia/AnesthesiaQuickBar.js";

const OUT_DIR = path.resolve("docs/proofs/anesthesia");
fs.mkdirSync(OUT_DIR, { recursive: true });

// Read CSS files to embed
const baseCss = fs.readFileSync("apps/web/src/styles/themes.css", "utf8");
const tokensCss = fs.readFileSync("apps/web/src/styles/tokens.css", "utf8");
const anesthCss = fs.readFileSync("apps/web/src/components/anesthesia/anesthesia.css", "utf8");
const tailwindCss = fs.existsSync("apps/web/src/styles/tailwind.css") 
  ? fs.readFileSync("apps/web/src/styles/tailwind.css", "utf8")
  : "";

function createHtml(componentHtml, theme = "light", isDrawerOpen = false) {
  return `<!DOCTYPE html>
<html lang="ru" data-theme="${theme}" class="${theme}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <title>Anesthesia Quick Bar Proof</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    ${baseCss}
    ${tokensCss}
    ${anesthCss}
    ${tailwindCss}
    body {
      background-color: var(--paper-soft, #f8fafc);
      color: var(--ink, #0f172a);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      padding: 16px;
      margin: 0;
      min-height: 100vh;
      box-sizing: border-box;
    }
    .dark body {
      background-color: var(--paper-deep, #090d16);
      color: var(--ink, #f1f5f9);
    }
  </style>
</head>
<body class="${theme}">
  <div style="max-width: 1200px; margin: 0 auto;">
    <div style="margin-bottom: 12px; font-size: 13px; font-weight: 600; color: var(--muted, #64748b);">
      DENTE CRM · Клинический протокол анестезии (1-click Autonomy, Mandates 8e & 8y)
    </div>
    ${componentHtml}
  </div>
</body>
</html>`;
}

async function main() {
  console.log("=== GENERATING & CAPTURING CANONICAL 4-STATE ANESTHESIA PROOFS ===");

  const standardHtml = renderToString(
    React.createElement(AnesthesiaQuickBar, {
      patientId: "pat-proof-01",
      visitId: "vis-proof-01",
      patientWeightKg: 70,
      patientAgeYears: 35,
      targetToothNumberFdi: 16,
    })
  );

  const allergyHtml = renderToString(
    React.createElement(AnesthesiaQuickBar, {
      patientId: "pat-proof-02",
      visitId: "vis-proof-02",
      patientWeightKg: 70,
      patientAgeYears: 35,
      hasLidocaineAllergy: true,
      targetToothNumberFdi: 26,
    })
  );

  const htmlPathStandardLight = path.resolve("scripts/anesthesia_stand_standard_light.html");
  const htmlPathStandardDark = path.resolve("scripts/anesthesia_stand_standard_dark.html");
  const htmlPathAllergyLight = path.resolve("scripts/anesthesia_stand_allergy_light.html");

  fs.writeFileSync(htmlPathStandardLight, createHtml(standardHtml, "light"));
  fs.writeFileSync(htmlPathStandardDark, createHtml(standardHtml, "dark"));
  fs.writeFileSync(htmlPathAllergyLight, createHtml(allergyHtml, "light"));

  const possibleBrowserPaths = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  ];
  const browserPath = possibleBrowserPaths.find((p) => fs.existsSync(p));
  console.log("Using browser binary:", browserPath);

  const browser = await chromium.launch({
    headless: true,
    executablePath: browserPath,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();

    // 1. PC Light (1440x900)
    console.log("Capturing 1. PC Light (1440x900)...");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`file:///${htmlPathStandardLight.replace(/\\/g, "/")}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    const shot1 = path.join(OUT_DIR, "anesthesia_4state_pc_light.png");
    await page.screenshot({ path: shot1, fullPage: false });
    console.log("Captured:", shot1, `(${fs.statSync(shot1).size} bytes)`);

    // 2. PC Dark (1440x900)
    console.log("Capturing 2. PC Dark (1440x900)...");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`file:///${htmlPathStandardDark.replace(/\\/g, "/")}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    const shot2 = path.join(OUT_DIR, "anesthesia_4state_pc_dark.png");
    await page.screenshot({ path: shot2, fullPage: false });
    console.log("Captured:", shot2, `(${fs.statSync(shot2).size} bytes)`);

    // 3. Mobile Light (390x844)
    console.log("Capturing 3. Mobile Light (390x844)...");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`file:///${htmlPathStandardLight.replace(/\\/g, "/")}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    const shot3 = path.join(OUT_DIR, "anesthesia_4state_mobile_light.png");
    await page.screenshot({ path: shot3, fullPage: false });
    console.log("Captured:", shot3, `(${fs.statSync(shot3).size} bytes)`);

    // 4. Mobile Dark (390x844)
    console.log("Capturing 4. Mobile Dark (390x844)...");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`file:///${htmlPathStandardDark.replace(/\\/g, "/")}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    const shot4 = path.join(OUT_DIR, "anesthesia_4state_mobile_dark.png");
    await page.screenshot({ path: shot4, fullPage: false });
    console.log("Captured:", shot4, `(${fs.statSync(shot4).size} bytes)`);

    // 5. Passive Allergy Proof (Mandate 8e & 8y: CTA enabled)
    console.log("Capturing 5. Passive Allergy Proof (PC Light)...");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`file:///${htmlPathAllergyLight.replace(/\\/g, "/")}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    const shot5 = path.join(OUT_DIR, "anesthesia_passive_allergy_proof.png");
    await page.screenshot({ path: shot5, fullPage: false });
    console.log("Captured:", shot5, `(${fs.statSync(shot5).size} bytes)`);

    console.log("\nALL 5 CANONICAL SCREENSHOTS SUCCESSFULLY CAPTURED!");
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
