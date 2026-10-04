/**
 * scripts/capture_mobile_communications_screenshots.cjs
 * Red Team Inquisitor: Снятие мобильных скриншотов сообщений и мессенджера (390x844 iPhone 14/15/16).
 */

const puppeteer = require("puppeteer");
const path = require("node:path");
const fs = require("node:fs");

async function main() {
  const outputDir = path.resolve(__dirname, "../docs/screenshots/inquisition_live");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const artifactsDir = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\beb92312-c6d7-426d-a438-12dcad022abc";
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }

  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const execPath = fs.existsSync(chromePath) ? chromePath : edgePath;

  console.log(`>>> Launching mobile browser from: ${execPath}`);
  const browser = await puppeteer.launch({
    executablePath: execPath,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=390,844"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });

    // ─── 1. СВЕТЛАЯ ТЕМА — СПИСОК ДИАЛОГОВ (LIGHT 390x844) ───
    console.log(">>> Navigating to Mobile Communications Feed (Light 390x844)...");
    await page.goto("http://127.0.0.1:5173/communications_mobile_preview.html?theme=light", {
      waitUntil: "networkidle0",
      timeout: 30000,
    });

    await page.waitForSelector('[data-testid="mobile-communications-messenger"]', { visible: true, timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1200));

    const feedLightPath = path.join(outputDir, "proof_mobile_communications_feed_light.png");
    await page.screenshot({ path: feedLightPath, fullPage: false });
    console.log(`>>> Captured Mobile Feed Light: ${feedLightPath} (${fs.statSync(feedLightPath).size} bytes)`);
    fs.copyFileSync(feedLightPath, path.join(artifactsDir, "proof_mobile_communications_feed_light.png"));

    // ─── 2. ТЁМНАЯ ТЕМА — СПИСОК ДИАЛОГОВ (DARK 390x844) ───
    console.log(">>> Navigating to Mobile Communications Feed (Dark 390x844)...");
    await page.goto("http://127.0.0.1:5173/communications_mobile_preview.html?theme=dark", {
      waitUntil: "networkidle0",
      timeout: 30000,
    });

    await page.waitForSelector('[data-testid="mobile-communications-messenger"]', { visible: true, timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1200));

    const feedDarkPath = path.join(outputDir, "proof_mobile_communications_feed_dark.png");
    await page.screenshot({ path: feedDarkPath, fullPage: false });
    console.log(`>>> Captured Mobile Feed Dark: ${feedDarkPath} (${fs.statSync(feedDarkPath).size} bytes)`);
    fs.copyFileSync(feedDarkPath, path.join(artifactsDir, "proof_mobile_communications_feed_dark.png"));

    // ─── 3. ТЁМНАЯ ТЕМА — ПОЛНОЭКРАННЫЙ ЧАТ ПАЦИЕНТА (DARK 390x844 CHAT) ───
    console.log(">>> Navigating to Mobile Fullscreen Chat (Dark 390x844)...");
    await page.goto("http://127.0.0.1:5173/communications_mobile_preview.html?theme=dark&chat=1", {
      waitUntil: "networkidle0",
      timeout: 30000,
    });

    await page.waitForSelector('[data-testid="mobile-chat-fullscreen"]', { visible: true, timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1200));

    const chatDarkPath = path.join(outputDir, "proof_mobile_communications_chat_dark.png");
    await page.screenshot({ path: chatDarkPath, fullPage: false });
    console.log(`>>> Captured Mobile Chat Dark: ${chatDarkPath} (${fs.statSync(chatDarkPath).size} bytes)`);
    fs.copyFileSync(chatDarkPath, path.join(artifactsDir, "proof_mobile_communications_chat_dark.png"));

    console.log(">>> All 3 mobile screenshots successfully captured and copied to artifacts!");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(">>> Screenshot capture failed:", err);
  process.exit(1);
});
