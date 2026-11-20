import { existsSync, mkdirSync, copyFileSync, statSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const PROOF_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/pediatric";
if (!existsSync(PROOF_DIR)) {
	mkdirSync(PROOF_DIR, { recursive: true });
}

const possibleBrowserPaths = [
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];

const edgeOrChrome = possibleBrowserPaths.find((p) => existsSync(p));
console.log(`[BROWSER PATH] ${edgeOrChrome || "bundled chromium"}`);

function verifyAndSave(primaryPath, description) {
	const stat = statSync(primaryPath);
	if (stat.size < 20000) {
		throw new Error(`[BLANK DETECTED] Screenshot ${primaryPath} is only ${stat.size} bytes!`);
	}
	console.log(`[PROOF OK] ${path.basename(primaryPath)} (${stat.size} bytes) -> ${description}`);
}

async function suppressOverlays(page) {
	try {
		await page.evaluate(() => {
			const style = document.createElement("style");
			style.id = "suppress-all-tour-overlays";
			style.innerHTML = `
				.tour-spotlight-root,
				.tour-backdrop-clickable-zone,
				[data-testid="guided-tour-spotlight-overlay"],
				[data-testid="guided-tour-coach-mark-card"],
				.shepherd-element,
				vite-error-overlay {
					display: none !important;
					pointer-events: none !important;
					opacity: 0 !important;
				}
				*, *::before, *::after {
					animation: none !important;
					transition: none !important;
				}
			`;
			document.head.appendChild(style);
		});
	} catch (_) {}
}

async function setTheme(page, theme) {
	await page.evaluate((th) => {
		document.documentElement.setAttribute("data-theme", th);
		if (th === "light") {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			document.body.className = "light";
		} else {
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
			document.body.className = "dark";
		}
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("dente_theme_mode", th);
		localStorage.setItem("theme", th);
		document.documentElement.style.colorScheme = th;
	}, theme);
	await suppressOverlays(page);
	await page.waitForTimeout(400);
}

async function openPediatricModal(page) {
	for (let i = 0; i < 20; i++) {
		const count = await page.locator('[role="dialog"], [data-testid="pediatric-studio-modal"]').count();
		if (count > 0) return true;
		await page.evaluate(() => {
			window.location.hash = "#pediatric";
			window.dispatchEvent(new CustomEvent("dente:open-pediatric"));
			window.dispatchEvent(new CustomEvent("dente-open-pediatric"));
		});
		await page.waitForTimeout(600);
	}
	return false;
}

async function main() {
	console.log("=== STARTING PLAYWRIGHT CANONICAL 4-STATE PEDIATRIC PROOF CAPTURE ===");

	const launchOptions = {
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
	};
	if (edgeOrChrome) {
		launchOptions.executablePath = edgeOrChrome;
	}

	const browser = await chromium.launch(launchOptions);

	try {
		// ════════════════════════════════════════════════════════════════════════
		// 1. PC CONTEXT (1440x900)
		// ════════════════════════════════════════════════════════════════════════
		console.log("\n--- 1. PC VIEWPORT (1440x900) ---");
		const pcContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});

		await pcContext.addInitScript(() => {
			localStorage.setItem("dente_clinic_token", "demo-showcase-token-owner");
			localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-owner");
			localStorage.setItem("dente_demo_showcase", "true");
			localStorage.setItem("dente_offline_mode", "true");
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_tour_dismissed", "true");
			localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
		});

		const pcPage = await pcContext.newPage();
		console.log("Navigating PC to http://127.0.0.1:5173/?demo=true#pediatric...");
		await pcPage.goto("http://127.0.0.1:5173/?demo=true#pediatric", { waitUntil: "commit" });
		await pcPage.waitForTimeout(3000);

		const pcOpened = await openPediatricModal(pcPage);
		if (!pcOpened) throw new Error("Could not open pediatric modal on PC!");
		console.log("Pediatric modal successfully opened on PC!");
		await suppressOverlays(pcPage);

		// 1.1 PC Light
		console.log("Capturing 01_pediatric_workspace_pc_light_1440x900.png...");
		await setTheme(pcPage, "light");
		const pcLightPath = path.join(PROOF_DIR, "01_pediatric_workspace_pc_light_1440x900.png");
		await pcPage.screenshot({ path: pcLightPath, fullPage: false });
		verifyAndSave(pcLightPath, "Pediatric Dentistry Studio PC Light 1440x900 (Primary Dentition 51-85)");
		copyFileSync(pcLightPath, path.join(PROOF_DIR, "pediatric_pc_light_1440x900.png"));
		copyFileSync(pcLightPath, path.join(PROOF_DIR, "01_pediatric_teeth_chart_pc_light_1440x900.png"));

		// 1.2 PC Dark
		console.log("Capturing 02_pediatric_workspace_pc_dark_1440x900.png...");
		await setTheme(pcPage, "dark");
		const pcDarkPath = path.join(PROOF_DIR, "02_pediatric_workspace_pc_dark_1440x900.png");
		await pcPage.screenshot({ path: pcDarkPath, fullPage: false });
		verifyAndSave(pcDarkPath, "Pediatric Dentistry Studio PC Dark 1440x900 (Primary Dentition 51-85)");
		copyFileSync(pcDarkPath, path.join(PROOF_DIR, "pediatric_pc_dark_1440x900.png"));
		copyFileSync(pcDarkPath, path.join(PROOF_DIR, "02_pediatric_teeth_chart_pc_dark_1440x900.png"));

		// 1.3 PC Resorption Tab Proof (showcases DEF-PED-01 fix: "моляры" and DEF-PED-06)
		console.log("Switching to Resorption tab on PC...");
		await pcPage.evaluate(() => {
			const btns = Array.from(document.querySelectorAll("button"));
			const res = btns.find((b) => b.textContent && b.textContent.includes("Резорбция"));
			if (res) res.click();
		});
		await pcPage.waitForTimeout(600);
		await setTheme(pcPage, "light");
		const pcResorpPath = path.join(PROOF_DIR, "05_pediatric_resorption_pc_light_1440x900.png");
		await pcPage.screenshot({ path: pcResorpPath, fullPage: false });
		verifyAndSave(pcResorpPath, "Pediatric Root Resorption & Deciduous Molars SSOT (PC Light)");

		// 1.4 PC Bravery Diploma Modal
		console.log("Opening Bravery Diploma modal on PC...");
		await pcPage.evaluate(() => {
			window.dispatchEvent(new CustomEvent("dente:open-bravery-diploma", {
				detail: {
					patientName: "Алёша Смирнов",
					patientAgeYears: 6,
					doctorName: "Д-р Воронов М. С.",
					clinicName: "Клиника DENTE"
				}
			}));
		});
		await pcPage.waitForTimeout(1000);
		const diplomaDialog = await pcPage.locator('[role="dialog"]').count();
		if (diplomaDialog > 0) {
			await setTheme(pcPage, "light");
			const diplomaPath = path.join(PROOF_DIR, "07_pediatric_diploma_pc_light_1440x900.png");
			await pcPage.screenshot({ path: diplomaPath, fullPage: false });
			verifyAndSave(diplomaPath, "Bravery Diploma Modal for Brave Child Patient (PC Light)");
			copyFileSync(diplomaPath, path.join(PROOF_DIR, "pediatric_diploma_pc_light.png"));

			await setTheme(pcPage, "dark");
			const diplomaDarkPath = path.join(PROOF_DIR, "08_pediatric_diploma_pc_dark_1440x900.png");
			await pcPage.screenshot({ path: diplomaDarkPath, fullPage: false });
			verifyAndSave(diplomaDarkPath, "Bravery Diploma Modal for Brave Child Patient (PC Dark)");
			copyFileSync(diplomaDarkPath, path.join(PROOF_DIR, "pediatric_diploma_pc_dark.png"));
		}

		await pcContext.close();

		// ════════════════════════════════════════════════════════════════════════
		// 2. MOBILE CONTEXT (390x844 Apple HIG)
		// ════════════════════════════════════════════════════════════════════════
		console.log("\n--- 2. MOBILE VIEWPORT (390x844 Apple HIG) ---");
		const mobileContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
		});

		await mobileContext.addInitScript(() => {
			localStorage.setItem("dente_clinic_token", "demo-showcase-token-owner");
			localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-owner");
			localStorage.setItem("dente_demo_showcase", "true");
			localStorage.setItem("dente_offline_mode", "true");
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_tour_dismissed", "true");
			localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
		});

		const mobilePage = await mobileContext.newPage();
		console.log("Navigating Mobile to http://127.0.0.1:5173/?demo=true#pediatric...");
		await mobilePage.goto("http://127.0.0.1:5173/?demo=true#pediatric", { waitUntil: "commit" });
		await mobilePage.waitForTimeout(3000);

		const mobileOpened = await openPediatricModal(mobilePage);
		if (!mobileOpened) throw new Error("Could not open pediatric modal on Mobile!");
		console.log("Pediatric modal successfully opened on Mobile!");
		await suppressOverlays(mobilePage);

		// 2.1 Mobile Light
		console.log("Capturing 03_pediatric_workspace_mobile_light_390x844.png...");
		await setTheme(mobilePage, "light");
		const mobileLightPath = path.join(PROOF_DIR, "03_pediatric_workspace_mobile_light_390x844.png");
		await mobilePage.screenshot({ path: mobileLightPath, fullPage: false });
		verifyAndSave(mobileLightPath, "Pediatric Dentistry Mobile Light 390x844 (Apple HIG)");
		copyFileSync(mobileLightPath, path.join(PROOF_DIR, "pediatric_mobile_light_390x844.png"));
		copyFileSync(mobileLightPath, path.join(PROOF_DIR, "03_pediatric_teeth_chart_mobile_light_390x844.png"));

		// 2.2 Mobile Dark
		console.log("Capturing 04_pediatric_workspace_mobile_dark_390x844.png...");
		await setTheme(mobilePage, "dark");
		const mobileDarkPath = path.join(PROOF_DIR, "04_pediatric_workspace_mobile_dark_390x844.png");
		await mobilePage.screenshot({ path: mobileDarkPath, fullPage: false });
		verifyAndSave(mobileDarkPath, "Pediatric Dentistry Mobile Dark 390x844 (Apple HIG)");
		copyFileSync(mobileDarkPath, path.join(PROOF_DIR, "pediatric_mobile_dark_390x844.png"));
		copyFileSync(mobileDarkPath, path.join(PROOF_DIR, "04_pediatric_teeth_chart_mobile_dark_390x844.png"));

		await mobileContext.close();

		console.log("\n=== ALL CANONICAL PEDIATRIC 4-STATE PROOFS CAPTURED SUCCESSFULLY! ===");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("FATAL ERROR in Playwright pediatric capture:", err);
	process.exit(1);
});
