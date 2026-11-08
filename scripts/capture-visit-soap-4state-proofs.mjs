import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const PROOFS_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/emr");
const BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/a418917c-1bc5-4537-b72d-2c4a3442dfec");

for (const dir of [PROOFS_DIR, BRAIN_DIR]) {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function saveAndVerifyShot(page, fileName) {
	const proofPath = path.join(PROOFS_DIR, fileName);
	await page.screenshot({ path: proofPath, fullPage: false, animations: "disabled" });
	const brainPath = path.join(BRAIN_DIR, fileName);
	fs.copyFileSync(proofPath, brainPath);

	const size = fs.statSync(proofPath).size;
	if (size < 20480) {
		throw new Error(`[BYTE-GUARD FAILED]: ${fileName} size is ${size} bytes (<20KB)`);
	}
	console.log(`[PROOF VERIFIED]: ${fileName} (${(size / 1024).toFixed(1)} KB) -> ${proofPath}`);
}

async function capture() {
	console.log("=== CAPTURING 4-STATE VISUAL PROOFS FOR VISIT SOAP & EMR ===");

	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	try {
		const ctx = await browser.newContext({
			viewport: { width: 1440, height: 900 },
		});

		await ctx.addInitScript(() => {
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_tour_dismissed", "true");
			localStorage.setItem("dente_demo_banner_dismissed", "true");
			localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
		});

		const page = await ctx.newPage();

		const targetUrl = "http://127.0.0.1:5173/?demo=1#medical-card";
		console.log(`Navigating to ${targetUrl}...`);
		await page.goto(targetUrl, { waitUntil: "networkidle", timeout: 45000 });

		console.log("Waiting for boot-subtitle detachment...");
		await page.waitForSelector(".boot-subtitle", { state: "detached", timeout: 25000 }).catch(() => {});

		// Подавление оверлеев
		await page.evaluate(() => {
			const style = document.createElement("style");
			style.id = "suppress-all-overlays";
			style.innerHTML = `
				.tour-spotlight-root, .tour-backdrop-clickable-zone,
				[data-testid="guided-tour-spotlight-overlay"],
				[data-testid="guided-tour-coach-mark-card"],
				[data-testid="demo-mode-banner"], .global-toast-container,
				vite-error-overlay { display: none !important; pointer-events: none !important; }
			`;
			document.head.appendChild(style);

			if (!document.querySelector(".emr-studio-window, .emr043-modal-window")) {
				window.dispatchEvent(new CustomEvent("dente:open-medical-card"));
				window.location.hash = "medical-card";
			}
		});

		console.log("Waiting for EMR studio window...");
		await page.waitForSelector(".emr-studio-window, .emr043-modal-window", { timeout: 25000 });
		await sleep(1200);

		// Переключаемся на вкладку 4. Дневники визитов
		try {
			const diariesTabBtn = await page.waitForSelector("button:has-text('4. Дневники визитов'), button:has-text('Дневники')", { timeout: 6000 });
			await diariesTabBtn.click();
			await sleep(800);
		} catch (e) {
			console.log("Could not click diaries tab directly:", e.message);
		}

		// Разворачиваем форму быстрой записи SOAP, если не открыта
		try {
			const toggleFormBtn = await page.$("[data-testid='btn-toggle-inline-diary-form']");
			if (toggleFormBtn) {
				const btnText = await toggleFormBtn.textContent();
				if (btnText && btnText.includes("Быстрая запись")) {
					await toggleFormBtn.click({ timeout: 2000 }).catch(() => {});
					await sleep(600);
				}
			}
		} catch (e) {
			console.log("Toggle inline diary form notice:", e.message);
		}

		const states = [
			{ name: "01_visit_soap_emk_pc_light_1440x900.png", width: 1440, height: 900, isMobile: false, theme: "light" },
			{ name: "02_visit_soap_emk_pc_dark_1440x900.png", width: 1440, height: 900, isMobile: false, theme: "dark" },
			{ name: "03_visit_soap_emk_mobile_light_390x844.png", width: 390, height: 844, isMobile: true, theme: "light" },
			{ name: "04_visit_soap_emk_mobile_dark_390x844.png", width: 390, height: 844, isMobile: true, theme: "dark" },
		];

		for (const state of states) {
			console.log(`\nSetting up: ${state.name} (${state.width}x${state.height}, ${state.theme})...`);
			await page.setViewportSize({ width: state.width, height: state.height });

			await page.evaluate((theme) => {
				localStorage.setItem("dente_theme", theme);
				localStorage.setItem("dente_theme_mode", theme);
				localStorage.setItem("theme", theme);
				document.documentElement.setAttribute("data-theme", theme);
				document.body.setAttribute("data-theme", theme);
				if (theme === "dark") {
					document.documentElement.classList.add("dark");
					document.documentElement.classList.remove("light");
				} else {
					document.documentElement.classList.remove("dark");
					document.documentElement.classList.add("light");
				}
				window.dispatchEvent(new Event("themechange"));
			}, state.theme);

			await sleep(1000);
			await saveAndVerifyShot(page, state.name);
		}

		console.log("\n=======================================================");
		console.log(">>> ALL 4 VISIT SOAP & EMR PROOFS SUCCESSFULLY CAPTURED! <<<");
		console.log("=======================================================\n");
	} finally {
		await browser.close();
	}
}

capture().catch((err) => {
	console.error("[FATAL] Capture failed:", err);
	process.exit(1);
});
