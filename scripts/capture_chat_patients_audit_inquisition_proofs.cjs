const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const ARTIFACTS_DIR = "C:/Users/Admin/.gemini/antigravity/brain/531a8719-c181-443b-baab-10b5bf1ebe3e";
const DOCS_DIR = path.resolve("docs/screenshots/chat_patients_audit_inquisition");

fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
fs.mkdirSync(DOCS_DIR, { recursive: true });

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function capture() {
  console.log("Starting Playwright capture for Chat, Omnichannel, Patients & Audit...");

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"]
  });

  const targets = [
    { view: "chat", theme: "light", width: 1440, height: 900, name: "proof_chat_desk_pc_light.png" },
    { view: "chat", theme: "dark", width: 1440, height: 900, name: "proof_chat_desk_pc_dark.png" },
    { view: "hub", theme: "light", width: 1440, height: 900, name: "proof_patient_hub_pc_light.png" },
    { view: "hub", theme: "dark", width: 1440, height: 900, name: "proof_patient_hub_pc_dark.png" },
    { view: "patients", theme: "light", width: 390, height: 844, name: "proof_patients_mobile_light.png" },
    { view: "patients", theme: "dark", width: 390, height: 844, name: "proof_patients_mobile_dark.png" },
    { view: "audit", theme: "light", width: 1440, height: 900, name: "proof_audit_trail_pc_light.png" },
    { view: "audit", theme: "dark", width: 1440, height: 900, name: "proof_audit_trail_pc_dark.png" },
    { view: "journal", theme: "light", width: 1440, height: 900, name: "proof_staff_journal_pc_light.png" },
    { view: "journal", theme: "dark", width: 1440, height: 900, name: "proof_staff_journal_pc_dark.png" },
  ];

  for (const t of targets) {
    console.log(`Capturing: ${t.name} (${t.view}, ${t.theme}, ${t.width}x${t.height})`);
    const context = await browser.newContext({
      viewport: { width: t.width, height: t.height },
      deviceScaleFactor: 2,
    });

    const page = await context.newPage();
    const url = `http://127.0.0.1:5173/chat_patients_audit_inquisition_preview.html?view=${t.view}&theme=${t.theme}`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    await wait(1500);

    const docPath = path.join(DOCS_DIR, t.name);
    const artPath = path.join(ARTIFACTS_DIR, t.name);

    await page.screenshot({ path: docPath, fullPage: false });
    await page.screenshot({ path: artPath, fullPage: false });

    console.log(`Saved: ${docPath} (${fs.statSync(docPath).size} bytes)`);
    await context.close();
  }

  await browser.close();
  console.log("All screenshots captured successfully!");
}

capture().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
