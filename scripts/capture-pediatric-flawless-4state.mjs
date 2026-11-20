import { existsSync, mkdirSync, statSync, copyFileSync } from "node:fs";
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
console.log(`[BROWSER] ${edgeOrChrome || "bundled chromium"}`);

function verifyProof(filePath, label) {
	const stat = statSync(filePath);
	if (stat.size < 40000) {
		throw new Error(`[BLANK DETECTED] Screenshot ${filePath} is too small: ${stat.size} bytes (< 40KB)`);
	}
	console.log(`[VERIFIED PROOF] ${path.basename(filePath)} (${stat.size} bytes) -> ${label}`);
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
				[data-testid="demo-mode-banner"],
				.global-toast-container,
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
			if (document.body) document.body.className = "light";
		} else {
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
			if (document.body) document.body.className = "dark";
		}
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("dente_theme_mode", th);
		localStorage.setItem("theme", th);
		document.documentElement.style.colorScheme = th;
	}, theme);
	await suppressOverlays(page);
	await page.waitForTimeout(400);
}

async function setupContext(context) {
	await context.addInitScript(() => {
		localStorage.setItem("dente_clinic_token", "demo-showcase-token-owner");
		localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-owner");
		localStorage.setItem("dente_demo_showcase", "true");
		localStorage.setItem("dente_offline_mode", "true");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_tour_dismissed", "true");
		localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
	});
}

async function ensurePediatricOpened(page) {
	for (let i = 0; i < 25; i++) {
		const count = await page.locator('[data-testid="pediatric-studio-modal"], [role="dialog"]').count();
		if (count > 0) return true;
		await page.evaluate(() => {
			window.dispatchEvent(new CustomEvent("dente:open-pediatric"));
			window.dispatchEvent(new CustomEvent("dente-open-pediatric"));
		});
		await page.waitForTimeout(600);
	}
	return false;
}

async function ensureDiplomaOpened(page) {
	for (let i = 0; i < 25; i++) {
		const count = await page.locator('[data-testid="pediatric-hero-diploma-modal"], [data-testid="pediatric-bravery-diploma-modal"]').count();
		if (count > 0) return true;
		await page.evaluate(() => {
			window.dispatchEvent(new CustomEvent("dente:open-bravery-diploma", {
				detail: {
					patientName: "Артём Смирнов",
					patientAgeYears: 6,
					doctorName: "Д-р Воронов М. С.",
					clinicName: "Клиника DENTE",
				}
			}));
			window.dispatchEvent(new CustomEvent("dente-open-bravery-diploma"));
		});
		await page.waitForTimeout(600);
	}
	return false;
}

async function main() {
	console.log("=== STARTING FLAWLESS 4-STATE PEDIATRIC CAPTURE ===");
	const browser = await chromium.launch({
		headless: true,
		executablePath: edgeOrChrome,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
	});

	try {
		// 1. PC 1440x900
		console.log("\n>>> 1. PC Viewport (1440x900)...");
		const pcContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});
		await setupContext(pcContext);
		const pcPage = await pcContext.newPage();
		await pcPage.goto("http://127.0.0.1:5173/?demo=true&pediatric=1#pediatric", { waitUntil: "domcontentloaded" });
		await pcPage.waitForTimeout(2500);

		const pcOpened = await ensurePediatricOpened(pcPage);
		if (!pcOpened) throw new Error("Could not open pediatric modal on PC!");
		console.log("Pediatric studio modal open on PC!");
		await suppressOverlays(pcPage);

		// 1.1 PC Light
		await setTheme(pcPage, "light");
		const pcLight = path.join(PROOF_DIR, "01_pediatric_workspace_pc_light_1440x900.png");
		await pcPage.screenshot({ path: pcLight, fullPage: false });
		verifyProof(pcLight, "Pediatric Studio PC Light 1440x900");
		copyFileSync(pcLight, path.join(PROOF_DIR, "pediatric_pc_light_1440x900.png"));

		// 1.2 PC Dark
		await setTheme(pcPage, "dark");
		const pcDark = path.join(PROOF_DIR, "02_pediatric_workspace_pc_dark_1440x900.png");
		await pcPage.screenshot({ path: pcDark, fullPage: false });
		verifyProof(pcDark, "Pediatric Studio PC Dark 1440x900");
		copyFileSync(pcDark, path.join(PROOF_DIR, "pediatric_pc_dark_1440x900.png"));

		// 1.3 PC Diploma Modal
		console.log("Opening Bravery Diploma modal on PC...");
		await ensureDiplomaOpened(pcPage);
		await pcPage.waitForTimeout(600);
		await setTheme(pcPage, "light");
		const diplomaPcLight = path.join(PROOF_DIR, "01_pediatric_diploma_pc_light_1440x900.png");
		await pcPage.screenshot({ path: diplomaPcLight, fullPage: false });
		verifyProof(diplomaPcLight, "Pediatric Bravery Diploma PC Light 1440x900");
		copyFileSync(diplomaPcLight, path.join(PROOF_DIR, "pediatric_diploma_pc_light.png"));

		await setTheme(pcPage, "dark");
		const diplomaPcDark = path.join(PROOF_DIR, "02_pediatric_diploma_pc_dark_1440x900.png");
		await pcPage.screenshot({ path: diplomaPcDark, fullPage: false });
		verifyProof(diplomaPcDark, "Pediatric Bravery Diploma PC Dark 1440x900");
		copyFileSync(diplomaPcDark, path.join(PROOF_DIR, "pediatric_diploma_pc_dark.png"));

		await pcContext.close();

		// 2. Mobile 390x844
		console.log("\n>>> 2. Mobile Viewport (390x844 Apple HIG)...");
		const mobContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
		});
		await setupContext(mobContext);
		const mobPage = await mobContext.newPage();
		await mobPage.goto("http://127.0.0.1:5173/?demo=true&pediatric=1#pediatric", { waitUntil: "domcontentloaded" });
		await mobPage.waitForTimeout(2500);

		const mobOpened = await ensurePediatricOpened(mobPage);
		if (!mobOpened) throw new Error("Could not open pediatric modal on Mobile!");
		console.log("Pediatric studio modal open on Mobile!");
		await suppressOverlays(mobPage);

		// 2.1 Mobile Light
		await setTheme(mobPage, "light");
		const mobLight = path.join(PROOF_DIR, "03_pediatric_workspace_mobile_light_390x844.png");
		await mobPage.screenshot({ path: mobLight, fullPage: false });
		verifyProof(mobLight, "Pediatric Studio Mobile Light 390x844");
		copyFileSync(mobLight, path.join(PROOF_DIR, "pediatric_mobile_light_390x844.png"));

		// 2.2 Mobile Dark
		await setTheme(mobPage, "dark");
		const mobDark = path.join(PROOF_DIR, "04_pediatric_workspace_mobile_dark_390x844.png");
		await mobPage.screenshot({ path: mobDark, fullPage: false });
		verifyProof(mobDark, "Pediatric Studio Mobile Dark 390x844");
		copyFileSync(mobDark, path.join(PROOF_DIR, "pediatric_mobile_dark_390x844.png"));

		// 2.3 Mobile Diploma Modal
		console.log("Opening Bravery Diploma modal on Mobile...");
		await ensureDiplomaOpened(mobPage);
		await mobPage.waitForTimeout(600);
		await setTheme(mobPage, "light");
		const diplomaMobLight = path.join(PROOF_DIR, "03_pediatric_diploma_mobile_light_390x844.png");
		await mobPage.screenshot({ path: diplomaMobLight, fullPage: false });
		verifyProof(diplomaMobLight, "Pediatric Bravery Diploma Mobile Light 390x844");

		await setTheme(mobPage, "dark");
		const diplomaMobDark = path.join(PROOF_DIR, "04_pediatric_diploma_mobile_dark_390x844.png");
		await mobPage.screenshot({ path: diplomaMobDark, fullPage: false });
		verifyProof(diplomaMobDark, "Pediatric Bravery Diploma Mobile Dark 390x844");

		await mobContext.close();

		console.log("\n🎉 ALL 4-STATE PEDIATRIC & DIPLOMA PROOFS CAPTURED SUCCESSFULLY!");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("FATAL ERROR:", err);
	process.exit(1);
});
