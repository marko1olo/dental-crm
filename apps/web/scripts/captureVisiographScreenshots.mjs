import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const PROOFS_DIR = path.resolve(process.cwd(), "docs/proofs/visiograph");
const DOCS_DIR = path.resolve(process.cwd(), "docs/screenshots");
const BRAIN_DIR = path.resolve(
	"C:/Users/Admin/.gemini/antigravity/brain/f5ef9d23-3d88-437f-a5aa-4eec066dd654",
);

for (const dir of [PROOFS_DIR, DOCS_DIR, BRAIN_DIR]) {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function saveProof(page, filename) {
	const proofPath = path.join(PROOFS_DIR, filename);
	const docsPath = path.join(DOCS_DIR, filename);
	const brainPath = path.join(BRAIN_DIR, filename);
	await page.screenshot({ path: proofPath, fullPage: false });
	fs.copyFileSync(proofPath, docsPath);
	fs.copyFileSync(proofPath, brainPath);
	const size = fs.statSync(proofPath).size;
	console.log(`[PROOF CAPTURED]: ${filename} (${(size / 1024).toFixed(1)} KB)`);
}

async function capture() {
	console.log("Starting Red Team 4-State Visual Proof Runner...");
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	// --- 1 & 2: PC Desktop (1440x900) ---
	{
		const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
		const page = await context.newPage();
		await page.addInitScript(() => {
			window.localStorage.setItem("dente_clinic_token", "demo-showcase-token-therapist");
			window.localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-therapist");
			window.localStorage.setItem("dente_demo_showcase_active", "true");
			window.localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ onboardingDismissed: true }));
			window.localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true }));
			window.localStorage.setItem("dente_onboarding_strip_dismissed", "true");
			window.localStorage.setItem("active_staff_user", JSON.stringify({
				id: "01a00000-0000-0000-0000-000000000002", fullName: "Д-р Соколов А. В.", role: "doctor",
			}));
		});

		await page.goto("http://127.0.0.1:5173/?demo=true#visit", { waitUntil: "domcontentloaded", timeout: 45000 });
		await page.waitForSelector(".boot-state", { state: "detached", timeout: 20000 }).catch(() => {});
		await sleep(1500);

		try {
			const nextBtn = await page.$('button:has-text("Начать следующий приём"), button:has-text("Начать приём")');
			if (nextBtn) { await nextBtn.click(); await sleep(1200); }
		} catch {}

		try {
			const diagTab = await page.$('[data-testid="visit-subtab-diagnostics"]');
			if (diagTab) { await diagTab.click(); await sleep(1200); }
		} catch {}

		try {
			const directRvg = await page.$('[data-testid="btn-open-direct-rvg-modal"]');
			if (directRvg) { await directRvg.click(); await sleep(1500); }
		} catch {}

		// PC Light
		console.log("Capturing pc_light_1440x900.png...");
		await page.evaluate(() => {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			document.documentElement.setAttribute("data-theme", "light");
		});
		await sleep(800);
		await saveProof(page, "pc_light_1440x900.png");

		// PC Dark
		console.log("Capturing pc_dark_1440x900.png...");
		await page.evaluate(() => {
			document.documentElement.classList.add("dark");
			document.documentElement.classList.remove("light");
			document.documentElement.setAttribute("data-theme", "dark");
		});
		await sleep(800);
		await saveProof(page, "pc_dark_1440x900.png");

		await context.close();
	}

	// --- 3 & 4: Mobile iPhone 14/15 (390x844) ---
	{
		const context = await browser.newContext({
			viewport: { width: 390, height: 844 },
			isMobile: true,
			hasTouch: true,
		});
		const page = await context.newPage();
		await page.addInitScript(() => {
			window.localStorage.setItem("dente_clinic_token", "demo-showcase-token-therapist");
			window.localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-therapist");
			window.localStorage.setItem("dente_demo_showcase_active", "true");
			window.localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ onboardingDismissed: true }));
			window.localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true }));
			window.localStorage.setItem("dente_onboarding_strip_dismissed", "true");
			window.localStorage.setItem("active_staff_user", JSON.stringify({
				id: "01a00000-0000-0000-0000-000000000002", fullName: "Д-р Соколов А. В.", role: "doctor",
			}));
		});

		await page.goto("http://127.0.0.1:5173/?demo=true#visit", { waitUntil: "domcontentloaded", timeout: 45000 });
		await page.waitForSelector(".boot-state", { state: "detached", timeout: 20000 }).catch(() => {});
		await sleep(2000);

		try {
			const nextBtn = await page.$('button:has-text("Начать следующий приём"), button:has-text("Начать приём")');
			if (nextBtn) { await nextBtn.click(); await sleep(1500); }
		} catch {}

		try {
			const diagTab = await page.$('[data-testid="visit-subtab-diagnostics"]');
			if (diagTab) { await diagTab.click(); await sleep(1500); }
		} catch {}

		try {
			const directRvg = await page.$('[data-testid="btn-open-direct-rvg-modal"]');
			if (directRvg) { await directRvg.click(); await sleep(1500); }
		} catch {}

		// Mobile Dark
		console.log("Capturing mobile_dark_390x844.png...");
		await page.evaluate(() => {
			document.documentElement.classList.add("dark");
			document.documentElement.classList.remove("light");
			document.documentElement.setAttribute("data-theme", "dark");
		});
		await sleep(800);
		await saveProof(page, "mobile_dark_390x844.png");

		// Mobile Light
		console.log("Capturing mobile_light_390x844.png...");
		await page.evaluate(() => {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			document.documentElement.setAttribute("data-theme", "light");
		});
		await sleep(800);
		await saveProof(page, "mobile_light_390x844.png");

		await context.close();
	}

	await browser.close();
	console.log("All 4 states successfully captured and saved!");
}

capture().catch((err) => {
	console.error("Capture script error:", err);
	process.exit(1);
});
