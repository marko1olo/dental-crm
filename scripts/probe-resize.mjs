import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const PROOFS_DIR = path.join(process.cwd(), "docs/proofs/hygiene");
const BRAIN_DIR = "C:/Users/Admin/.gemini/antigravity/brain/2294cf44-f989-42ca-a6cd-2f862a1894f4";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function applyTheme(page, theme) {
	await page.evaluate((th) => {
		const isDark = th === "dark";
		document.documentElement.classList.remove(isDark ? "light" : "dark");
		document.documentElement.classList.add(th);
		document.documentElement.setAttribute("data-theme", th);
		document.documentElement.style.colorScheme = th;
	}, theme);
	await wait(500);
}

async function saveProof(page, fileName) {
	const proofPath = path.join(PROOFS_DIR, fileName);
	await page.screenshot({ path: proofPath, fullPage: false, animations: "disabled" });
	const brainPath = path.join(BRAIN_DIR, fileName);
	fs.copyFileSync(proofPath, brainPath);
	const size = fs.statSync(proofPath).size;
	console.log(`[SAVED] ${fileName} (${(size / 1024).toFixed(1)} KB)`);
}

async function main() {
	const browser = await chromium.launch({ headless: true });
	const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
	const page = await context.newPage();
	await page.addInitScript(() => {
		localStorage.setItem("dente_clinic_token", "demo-clinic-token");
		localStorage.setItem("dente_staff_token", "demo-staff-token");
		localStorage.setItem("dente_workspace_perspective", "doctor");
		localStorage.setItem("dente_user_role", "doctor");
		localStorage.setItem("dental-crm:demo-mode:v1", "true");
	});

	await page.goto("http://127.0.0.1:5173/?demo=true&hygiene=1#hygiene", { waitUntil: "commit" });
	await wait(3500);
	await page.waitForSelector('[data-testid="hygiene-studio-modal"]', { timeout: 15000 });

	// 1. PC Light (1440x900)
	await applyTheme(page, "light");
	await saveProof(page, "01_hygiene_studio_pc_light_1440x900.png");

	// 2. PC Dark (1440x900)
	await applyTheme(page, "dark");
	await saveProof(page, "02_hygiene_studio_pc_dark_1440x900.png");

	// Switch to Mobile
	await page.setViewportSize({ width: 390, height: 844 });
	await wait(1000);

	// 3. Mobile Dark (390x844)
	await saveProof(page, "04_hygiene_studio_mobile_dark_390x844.png");

	// 4. Mobile Light (390x844)
	await applyTheme(page, "light");
	await saveProof(page, "03_hygiene_studio_mobile_light_390x844.png");

	await browser.close();
	console.log("=== COMPLETED ALL 4 PROOFS ===");
}

main().catch(console.error);
