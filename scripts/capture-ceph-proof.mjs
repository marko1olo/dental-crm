import fs, { existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const PROOFS_DIR = path.join(process.cwd(), "docs/proofs/orthodontics");
if (!existsSync(PROOFS_DIR)) {
	mkdirSync(PROOFS_DIR, { recursive: true });
}

const possibleBrowserPaths = [
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
	"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];
const browserPath = possibleBrowserPaths.find((p) => existsSync(p));

const browser = await chromium.launch({
	headless: true,
	args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
	...(browserPath ? { executablePath: browserPath } : {}),
});

const cephStates = [
	{
		filename: "05_ceph_canvas_pc_light_1440x900.png",
		theme: "light",
		viewport: { width: 1440, height: 900 },
	},
	{
		filename: "06_ceph_canvas_pc_dark_1440x900.png",
		theme: "dark",
		viewport: { width: 1440, height: 900 },
	},
];

for (const state of cephStates) {
	console.log(`\n[STATE] Switching to ${state.filename} (${state.viewport.width}x${state.viewport.height}, ${state.theme})...`);

	const context = await browser.newContext({
		viewport: state.viewport,
		locale: "ru-RU",
		colorScheme: state.theme,
	});

	await context.addInitScript(({ theme }) => {
		try {
			localStorage.setItem("dente_demo_showcase", "true");
			localStorage.setItem("dente_perspective", "orthodontic");
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_active_role", "doctor");
			localStorage.setItem("dente_role", "doctor");
			localStorage.setItem("dente_theme", theme);
			localStorage.setItem("dente_theme_mode", theme);
			sessionStorage.setItem("dente_unlocked", "true");
		} catch (_) {}
	}, { theme: state.theme });

	const page = await context.newPage();
	await page.goto("http://127.0.0.1:5173/?demo=true&patientId=pat-1#orthodontics", {
		waitUntil: "domcontentloaded",
		timeout: 45000,
	});

	await page.waitForFunction(() => {
		const boot = document.querySelector(".boot-state");
		return !boot || boot.clientHeight === 0;
	}, { timeout: 35000 }).catch(() => {});

	await page.waitForSelector('[data-testid="save-ortho-protocol-button"]', { state: "visible", timeout: 30000 });

	// Switch to photo_trg tab
	const trgTabBtn = page.locator('.ortho-tab-btn:has-text("ТРГ"), .ortho-tab-btn:has-text("Фото и ТРГ")').first();
	await trgTabBtn.click();
	await page.waitForTimeout(600);

	// Click to open Cephalometric Analysis Modal
	const openCephBtn = page.locator('button:has-text("Анализ ТРГ")').first();
	await openCephBtn.waitFor({ state: "visible", timeout: 10000 });
	console.log("[CLICK] Opening Cephalometric Analysis Modal...");
	await openCephBtn.click();
	await page.waitForTimeout(1500);

	await page.evaluate(({ theme }) => {
		const isDark = theme === "dark";
		document.documentElement.setAttribute("data-theme", theme);
		document.documentElement.classList.toggle("dark", isDark);
		document.documentElement.classList.toggle("light", !isDark);
		document.documentElement.style.colorScheme = isDark ? "dark" : "light";
		document.body.setAttribute("data-theme", theme);
		document.body.classList.toggle("dark", isDark);
		document.body.classList.toggle("light", !isDark);
	}, { theme: state.theme });

	await page.waitForTimeout(600);

	const filePath = path.join(PROOFS_DIR, state.filename);
	const buffer = await page.screenshot({ fullPage: false, animations: "disabled" });
	fs.writeFileSync(filePath, buffer);

	const stats = statSync(filePath);
	console.log(`[SAVED] ${state.filename} (${Math.round(stats.size / 1024)} KB)`);

	await context.close();
}

await browser.close();
console.log("Cephalometric proofs captured successfully.");
