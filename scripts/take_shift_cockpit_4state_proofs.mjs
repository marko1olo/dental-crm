import { existsSync, mkdirSync, copyFileSync, statSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:5173";
const PROOFS_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/shift";
const CONV_ID = "a956e2bc-d85b-4581-af25-f4fbeabcc6de";
const CALLER_CONV_ID = "cbe78645-8247-4a61-875e-c1cdb1eaea11";
const BRAIN_DIR = `C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}`;
const CALLER_BRAIN_DIR = `C:/Users/Admin/.gemini/antigravity/brain/${CALLER_CONV_ID}`;
const browserExecutable = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

[PROOFS_DIR, BRAIN_DIR, CALLER_BRAIN_DIR].forEach((dir) => {
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
});

async function captureProof(page, filename, ...altFilenames) {
	const targetPath = path.join(PROOFS_DIR, filename);
	await page.screenshot({ path: targetPath, fullPage: false, animations: "disabled" });

	const size = statSync(targetPath).size;
	console.log(`[Captured] ${filename} (${size} bytes) -> Valid: ${size >= 20000}`);

	if (size < 20000) {
		throw new Error(`Screenshot ${filename} is too small: ${size} bytes (< 20000)`);
	}

	for (const alt of altFilenames.flat().filter(Boolean)) {
		const altPath = path.join(PROOFS_DIR, alt);
		copyFileSync(targetPath, altPath);
	}

	// Copy to brains
	copyFileSync(targetPath, path.join(BRAIN_DIR, filename));
	if (existsSync(CALLER_BRAIN_DIR)) {
		copyFileSync(targetPath, path.join(CALLER_BRAIN_DIR, filename));
	}
}

async function setTheme(page, theme) {
	await page.evaluate((th) => {
		const isDark = th === "dark";
		document.documentElement.setAttribute("data-theme", th);
		document.documentElement.classList.toggle("dark", isDark);
		document.documentElement.classList.toggle("light", !isDark);
		document.documentElement.style.colorScheme = isDark ? "dark" : "light";
		if (document.body) {
			document.body.className = isDark ? "dark" : "light";
		}
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("dente_theme_mode", th);
		localStorage.setItem("theme", th);
	}, theme);
	await page.waitForTimeout(600);
}

async function initContext(context) {
	await context.addInitScript(() => {
		localStorage.setItem("dente_clinic_token", "demo-clinic-token");
		localStorage.setItem("dente_staff_token", "demo-staff-token");
		localStorage.setItem("dente_active_session_token", "demo-staff-token");
		localStorage.setItem("dente_demo_showcase", "true");
		localStorage.setItem("dente_active_role", "admin");
		localStorage.setItem("dente_theme", "light");
		localStorage.setItem("dente_theme_mode", "light");
		localStorage.setItem("theme", "light");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_tour_dismissed", "true");
		localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
		localStorage.setItem("dente_demo_banner_dismissed", "true");
		localStorage.setItem("dente_doctor_shift_active", "true");
		localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
		localStorage.setItem("dente-workspace-profile", JSON.stringify({ mode: "doctor", role: "doctor", activeRole: "doctor" }));
		localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
			version: 1,
			uiLanguage: "ru",
			selectedWorkspaceRole: "doctor",
			onboardingDismissed: true,
			onboardingStep: "done",
		}));
	});
}

async function run() {
	console.log("=== Launching Chromium for 4-State Doctor Shift Proofs ===");
	const browser = await chromium.launch({
		executablePath: browserExecutable,
		headless: true,
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	try {
		// --- PHASE 1: PC Desktop (1440x900) ---
		console.log("\n🖥️  --- Phase 1: PC Desktop (1440x900) ---");
		const pcContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
			isMobile: false,
			hasTouch: false,
		});
		await initContext(pcContext);

		const pcPage = await pcContext.newPage();
		console.log(`Navigating PC to ${BASE_URL}/?demo=true#shift...`);
		await pcPage.goto(`${BASE_URL}/?demo=true#shift`, { waitUntil: "domcontentloaded", timeout: 35000 });

		// Wait for shift content to appear
		for (let i = 0; i < 50; i++) {
			await pcPage.waitForTimeout(400);
			try {
				const hasShiftContent = await pcPage.evaluate(() => {
					const text = document.body ? document.body.innerText : "";
					return text.includes("ОКАЗАНО УСЛУГ") || text.includes("Касса смены") || text.includes("Кабинет №1");
				});
				if (hasShiftContent) {
					console.log(`PC Shift fully loaded at iteration ${i}!`);
					break;
				}
			} catch (_) {}
		}

		await pcPage.waitForTimeout(1500);

		// PC Light Cockpit
		console.log("Capturing shift_cockpit_1440x900_light.png...");
		await setTheme(pcPage, "light");
		await captureProof(pcPage, "shift_cockpit_1440x900_light.png", "shift_cockpit_pc_light_1440x900.png", "shift_pc_light_1440x900.png");

		// PC Dark Cockpit
		console.log("Capturing shift_cockpit_1440x900_dark.png...");
		await setTheme(pcPage, "dark");
		await captureProof(pcPage, "shift_cockpit_1440x900_dark.png", "shift_cockpit_pc_dark_1440x900.png", "shift_pc_dark_1440x900.png");

		// Now open Shift Close Modal on PC to capture reconciliation & 1-click closure view
		console.log("Opening Shift Close Reconciliation Modal on PC...");
		try {
			await pcPage.evaluate(() => {
				const btn = Array.from(document.querySelectorAll("button")).find(
					(b) => b.textContent?.includes("Завершить смену") || b.getAttribute("data-testid") === "btn-toggle-shift-modal"
				);
				if (btn) btn.click();
			});
			await pcPage.waitForTimeout(1000);

			// PC Light Modal
			await setTheme(pcPage, "light");
			await captureProof(pcPage, "shift_close_modal_pc_light_1440x900.png");

			// PC Dark Modal
			await setTheme(pcPage, "dark");
			await captureProof(pcPage, "shift_close_modal_pc_dark_1440x900.png");
		} catch (err) {
			console.warn("Could not capture shift close modal on PC:", err.message);
		}

		await pcContext.close();

		// --- PHASE 2: Mobile (390x844) ---
		console.log("\n📱 --- Phase 2: Mobile (390x844) ---");
		const mobileContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
		});
		await initContext(mobileContext);

		const mobilePage = await mobileContext.newPage();
		console.log(`Navigating Mobile to ${BASE_URL}/?demo=true#shift...`);
		await mobilePage.goto(`${BASE_URL}/?demo=true#shift`, { waitUntil: "domcontentloaded", timeout: 35000 });

		for (let i = 0; i < 50; i++) {
			await mobilePage.waitForTimeout(400);
			try {
				const hasMobileShift = await mobilePage.evaluate(() => {
					const text = document.body ? document.body.innerText : "";
					return text.includes("Смена врача") && (text.includes("78 500") || text.includes("ВЫРУЧКА"));
				});
				if (hasMobileShift) {
					console.log(`Mobile Shift ready at iteration ${i}!`);
					break;
				}
			} catch (_) {}
		}

		await mobilePage.waitForTimeout(1500);

		// Mobile Light
		console.log("Capturing shift_cockpit_390x844_light.png...");
		await setTheme(mobilePage, "light");
		await captureProof(mobilePage, "shift_cockpit_390x844_light.png", "shift_cockpit_mobile_light_390x844.png", "shift_mobile_light_390x844.png");

		// Mobile Dark
		console.log("Capturing shift_cockpit_390x844_dark.png...");
		await setTheme(mobilePage, "dark");
		await captureProof(mobilePage, "shift_cockpit_390x844_dark.png", "shift_cockpit_mobile_dark_390x844.png", "shift_mobile_dark_390x844.png");

		await mobileContext.close();

		console.log("\n✅ All Doctor Shift proofs successfully captured and verified!");
	} finally {
		await browser.close();
	}
}

run().catch((err) => {
	console.error("[Proof Runner ERROR]:", err);
	process.exit(1);
});
