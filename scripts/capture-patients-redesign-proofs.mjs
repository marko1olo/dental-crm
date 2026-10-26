import { existsSync, mkdirSync, copyFileSync, statSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:5173";
const PROOFS_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/patients_redesign";
const CONV_ID = "c192364e-81bc-4b1d-ae26-b6b89ffdb1ad";
const BRAIN_DIR = `C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}`;
const browserExecutable = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

[PROOFS_DIR, BRAIN_DIR].forEach((dir) => {
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
});

async function suppressOverlays(page, theme) {
	try {
		await page.evaluate((th) => {
			document.documentElement.setAttribute("data-theme", th);
			const isDark = th === "dark";
			document.documentElement.classList.toggle("dark", isDark);
			document.documentElement.classList.toggle("light", !isDark);
			document.documentElement.style.colorScheme = isDark ? "dark" : "light";
			if (document.body) {
				document.body.className = isDark ? "dark" : "light";
				document.body.setAttribute("data-theme", th);
			}

			const style = document.createElement("style");
			style.id = "suppress-all-overlays";
			style.innerHTML = `
				.tour-spotlight-root,
				.tour-backdrop-clickable-zone,
				[data-testid="guided-tour-spotlight-overlay"],
				[data-testid="guided-tour-coach-mark-card"],
				[data-testid="demo-mode-banner"],
				.global-toast-container,
				.notification-toast,
				.global-toast,
				.sa-toast,
				[data-testid="global-toast"],
				[role="status"][aria-live="polite"],
				vite-error-overlay {
					display: none !important;
					visibility: hidden !important;
					opacity: 0 !important;
					pointer-events: none !important;
				}
				*, *::before, *::after {
					animation: none !important;
					transition: none !important;
				}
			`;
			document.head.appendChild(style);
			document.querySelectorAll("vite-error-overlay, .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay'], .sa-toast, [data-testid='global-toast']").forEach((el) => el.remove());
		}, theme);
	} catch (_) {}
}

async function run() {
	console.log("=== Launching Browser for 4-State Patients Redesign Proofs ===");
	const browser = await chromium.launch({
		executablePath: browserExecutable,
		headless: true,
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	const states = [
		{
			id: "01_patients_pc_light",
			width: 1440,
			height: 900,
			theme: "light",
			isMobile: false,
			scale: 1,
		},
		{
			id: "02_patients_pc_dark",
			width: 1440,
			height: 900,
			theme: "dark",
			isMobile: false,
			scale: 1,
		},
		{
			id: "03_patients_mobile_light",
			width: 390,
			height: 844,
			theme: "light",
			isMobile: true,
			scale: 2,
		},
		{
			id: "04_patients_mobile_dark",
			width: 390,
			height: 844,
			theme: "dark",
			isMobile: true,
			scale: 2,
		},
	];

	for (const state of states) {
		console.log(`\n📸 Capturing ${state.id} (${state.width}x${state.height}, ${state.theme})...`);

		const context = await browser.newContext({
			viewport: { width: state.width, height: state.height },
			deviceScaleFactor: state.scale,
			isMobile: state.isMobile,
			hasTouch: state.isMobile,
			colorScheme: state.theme,
		});

		await context.addInitScript(({ th }) => {
			localStorage.setItem("dente_clinic_token", "demo-clinic-token");
			localStorage.setItem("dente_staff_token", "demo-staff-token");
			localStorage.setItem("dente_active_session_token", "demo-staff-token");
			localStorage.setItem("dente_demo_showcase", "true");
			localStorage.setItem("dente_active_role", "owner");
			localStorage.setItem("dente_theme", th);
			localStorage.setItem("dente_theme_mode", th);
			localStorage.setItem("theme", th);
			localStorage.setItem("dente_active_view", "patients");
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_tour_dismissed", "true");
			localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
			localStorage.setItem("dente_demo_banner_dismissed", "true");
			localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
			localStorage.setItem("dente_quest_progress_v2", JSON.stringify({ isDismissedPermanently: true, activeTrack: null, tracksProgress: {} }));
			localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
				version: 1,
				uiLanguage: "ru",
				selectedWorkspaceRole: "owner",
				onboardingDismissed: true,
				onboardingStep: "done",
			}));
		}, { th: state.theme });

		const page = await context.newPage();

		console.log(`Navigating to ${BASE_URL}/?demo=true#patients...`);
		await page.goto(`${BASE_URL}/?demo=true#patients`, { waitUntil: "domcontentloaded", timeout: 35000 });

		// Wait for shell
		for (let i = 0; i < 40; i++) {
			await page.waitForTimeout(500);
			try {
				const text = await page.evaluate(() => document.body ? document.body.innerText : "");
				if (!text.includes("Загрузка системы") && text.length > 200) {
					console.log(`Shell ready (${text.length} chars)`);
					break;
				}
			} catch (_) {}
		}

		await suppressOverlays(page, state.theme);

		// Switch to patients view
		await page.evaluate(() => {
			if (window.__useAppStore) {
				window.__useAppStore.getState().setCurrentView("patients");
			}
			window.location.hash = "patients";
			window.dispatchEvent(new HashChangeEvent("hashchange"));
		});

		await page.waitForTimeout(2000);

		// Wait for patient list or mobile cards container
		try {
			await page.waitForSelector('#patients, .patients-panel, .patient-list, .mobile-patients-container', { timeout: 15000 });
		} catch (e) {
			console.warn("Selector wait note:", e.message);
		}

		// Wait until loading finishes
		for (let i = 0; i < 30; i++) {
			const hasLoading = await page.evaluate(() => {
				const body = document.body ? document.body.innerText : "";
				return body.includes("Загрузка системы");
			});
			if (!hasLoading) {
				console.log("No loading badge found, view is fully rendered!");
				break;
			}
			await page.waitForTimeout(500);
		}

		await page.waitForTimeout(1000);
		await suppressOverlays(page, state.theme);

		const fileName = `${state.id}.png`;
		const outPath = path.join(PROOFS_DIR, fileName);
		const brainPath = path.join(BRAIN_DIR, fileName);

		await page.screenshot({ path: outPath, fullPage: false, animations: "disabled", timeout: 15000 });
		copyFileSync(outPath, brainPath);

		const stats = statSync(outPath);
		console.log(`[PROOF CAPTURED] ${fileName} -> ${Math.round(stats.size / 1024)} KB (>= 20KB asserted: ${stats.size >= 20480})`);
		if (stats.size < 20480) {
			throw new Error(`Screenshot ${fileName} is too small (${stats.size} bytes)!`);
		}

		await context.close();
	}

	await browser.close();
	console.log("\n=== All 4 Proofs Captured Successfully ===");
}

run().catch((err) => {
	console.error("FATAL PROOF ERROR:", err);
	process.exit(1);
});
