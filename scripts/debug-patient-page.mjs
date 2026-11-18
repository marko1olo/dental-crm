import { chromium } from "playwright";
import { existsSync } from "node:fs";

const browserExecutable = [
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
].find((p) => existsSync(p));

const browser = await chromium.launch({
	executablePath: browserExecutable,
	headless: true,
	args: ["--no-sandbox", "--disable-gpu"],
});

const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(() => {
	localStorage.setItem("dente_demo_mode", "true");
	localStorage.setItem("dente_onboarding_completed", "true");
	localStorage.setItem("dente_tour_completed", "true");
	localStorage.setItem("dente_tour_dismissed", "true");
	localStorage.setItem("dente_active_role", "doctor");
	localStorage.setItem("dente_user_role", "doctor");
});

const page = await ctx.newPage();
page.on("console", (msg) => console.log("[BROWSER CONSOLE]", msg.type(), msg.text()));
page.on("pageerror", (err) => console.log("[BROWSER ERROR]", err.message));

await page.goto("http://127.0.0.1:5173/?demo=true#patients", { waitUntil: "commit" });
await page.waitForTimeout(4000);

const title = await page.title();
const text = await page.evaluate(() => document.body.innerText.slice(0, 500));
console.log("TITLE:", title);
console.log("BODY TEXT PREVIEW:", text);

const buttons = await page.evaluate(() => Array.from(document.querySelectorAll("button")).map(b => b.innerText.trim()).filter(Boolean));
console.log("BUTTONS FOUND:", buttons.slice(0, 20));

await page.screenshot({ path: "docs/proofs/patients/debug_state.png" });
await browser.close();
