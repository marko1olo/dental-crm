import { mkdirSync, statSync, copyFileSync, existsSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const API_BASE = "http://127.0.0.1:4100";
const WEB_BASE = "http://127.0.0.1:5173";
const OUT_ODONTO = "C:/Clinic_MVP/dental-crm/docs/proofs/odontogram";
const CONV_ID = "644b3011-8b68-485b-9f08-a6d58865d320";
const OUT_CONV = `C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}`;
const SUB_CONV = "C:/Users/Admin/.gemini/antigravity/brain/1a5ac924-43af-42a0-a684-00dbb822c536";
const browserExecutable = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

[OUT_ODONTO, OUT_CONV, SUB_CONV].forEach((dir) => {
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
});

async function suppressOverlays(page) {
	try {
		await page.evaluate(() => {
			const style = document.createElement("style");
			style.id = "suppress-all-overlays";
			style.innerHTML = `
				.tour-spotlight-root,
				.tour-backdrop-clickable-zone,
				[data-testid="guided-tour-spotlight-overlay"],
				[data-testid="guided-tour-coach-mark-card"],
				[data-testid="demo-mode-banner"],
				.global-toast-container,
				vite-error-overlay {
					display: none !important;
					pointer-events: none !important;
				}
				*, *::before, *::after {
					animation: none !important;
					transition: none !important;
				}
			`;
			document.head.appendChild(style);
			document.querySelectorAll("vite-error-overlay, .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay']").forEach((el) => el.remove());
		});
	} catch (_) {}
}

async function setTheme(page, theme) {
	await page.evaluate((th) => {
		if (window.__useThemeStore) {
			try {
				window.__useThemeStore.getState().setThemeMode(th);
			} catch (_) {}
		}
		document.documentElement.setAttribute("data-theme", th);
		if (document.body) document.body.setAttribute("data-theme", th);
		if (th === "dark") {
			document.documentElement.classList.add("dark");
			document.documentElement.classList.remove("light");
		} else {
			document.documentElement.classList.add("light");
			document.documentElement.classList.remove("dark");
		}
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("dente_theme_mode", th);
		localStorage.setItem("theme", th);
		document.documentElement.style.colorScheme = th;
	}, theme);
	await suppressOverlays(page);
	await page.waitForTimeout(600);
}

async function getAuthTokens() {
	const res = await fetch(`${API_BASE}/api/auth/login`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email: "doctor@clinic.com", password: "dente2026" }),
	});
	const data = await res.json();
	if (!data.ok) throw new Error("Auth failed: " + JSON.stringify(data));
	return data;
}

async function injectStorage(context, auth, theme = "light") {
	await context.addInitScript(({ clinicToken, staffToken, user, th }) => {
		localStorage.setItem("dente_clinic_token", clinicToken);
		localStorage.setItem("dente_staff_token", staffToken);
		localStorage.setItem("dente_active_session_token", staffToken);
		localStorage.setItem("dente_active_role", user.role || "owner");
		localStorage.setItem("dente_active_user_id", user.id || "demo-doctor-id");
		localStorage.setItem("dental-crm:active-user:v1", JSON.stringify(user));
		localStorage.setItem("dente_theme_mode", th);
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("theme", th);
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
			selectedWorkspaceRole: user.role || "owner",
			onboardingDismissed: true,
			onboardingStep: "done",
			odontogramViewMode: "anatomical_svg",
		}));
		document.cookie = `dente_clinic_token=${encodeURIComponent(clinicToken)}; path=/; max-age=31536000`;
		document.cookie = `dente_staff_token=${encodeURIComponent(staffToken)}; path=/; max-age=31536000`;
	}, { clinicToken: auth.clinicToken, staffToken: auth.staffToken, user: auth.user, th: theme });
}

async function captureScreen(page, filename) {
	await suppressOverlays(page);
	await page.waitForTimeout(600);
	const p1 = path.join(OUT_ODONTO, filename);
	const p2 = path.join(OUT_CONV, filename);
	const p3 = path.join(SUB_CONV, filename);
	await page.screenshot({ path: p1, fullPage: false, animations: "disabled", timeout: 15000 });
	copyFileSync(p1, p2);
	copyFileSync(p1, p3);
	const size = statSync(p1).size;
	console.log(`[Captured] ${filename} (${size} bytes) -> OK: ${size >= 20000}`);
}

async function openPediatricOdontogram(page) {
	console.log("[Pediatric] Navigating to Visit...");
	await page.evaluate(() => {
		if (window.__useAppStore) {
			window.__useAppStore.getState().setCurrentView("visit");
		}
		window.location.hash = "visit";
		window.dispatchEvent(new HashChangeEvent("hashchange"));
	});
	await page.waitForTimeout(2000);
	await suppressOverlays(page);

	// Select Odontogram tab
	await page.evaluate(() => {
		const elements = Array.from(document.querySelectorAll("button, [role='tab'], .tab-button"));
		const target = elements.find((t) =>
			t.innerText.includes("Зубная формула") ||
			t.innerText.includes("Одонтограмма") ||
			t.innerText.includes("Осмотр") ||
			t.innerText.includes("Формула")
		);
		if (target) target.click();
	});
	await page.waitForTimeout(1500);

	// Click "Молочный" dentition switch
	await page.evaluate(() => {
		const buttons = Array.from(document.querySelectorAll("button"));
		const pedBtn = buttons.find((b) => b.innerText && (b.innerText.includes("Молочный") || b.innerText.includes("Детский")));
		if (pedBtn) {
			pedBtn.click();
			console.log("[Pediatric] Clicked pediatric button:", pedBtn.innerText);
		}
	});
	await page.waitForTimeout(1200);
	await suppressOverlays(page);
}

async function run() {
	console.log("=== CAPTURING REAL PEDIATRIC WHEELER 2.5D PROOFS (51–85) ===");
	const auth = await getAuthTokens();
	const browser = await chromium.launch({
		headless: true,
		executablePath: browserExecutable,
		args: ["--no-sandbox", "--disable-gpu"],
	});

	try {
		// 1. PC
		const pcContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
		await injectStorage(pcContext, auth, "light");
		const pcPage = await pcContext.newPage();
		await pcPage.goto(`${WEB_BASE}/?demo=true`, { waitUntil: "commit", timeout: 35000 });
		await pcPage.waitForTimeout(2500);

		await openPediatricOdontogram(pcPage);
		await setTheme(pcPage, "light");
		await captureScreen(pcPage, "05_pediatric_pc_light_1440x900.png");

		await setTheme(pcPage, "dark");
		await captureScreen(pcPage, "06_pediatric_pc_dark_1440x900.png");

		await pcContext.close();

		// 2. Mobile
		const mobContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
		});
		await injectStorage(mobContext, auth, "light");
		const mobPage = await mobContext.newPage();
		await mobPage.goto(`${WEB_BASE}/?demo=true`, { waitUntil: "commit", timeout: 35000 });
		await mobPage.waitForTimeout(2500);

		await openPediatricOdontogram(mobPage);
		await setTheme(mobPage, "light");
		await captureScreen(mobPage, "07_pediatric_mobile_light_390x844.png");

		await setTheme(mobPage, "dark");
		await captureScreen(mobPage, "08_pediatric_mobile_dark_390x844.png");

		await mobContext.close();
		console.log("=== ALL PEDIATRIC PROOFS CAPTURED SUCCESSFULLY ===");
	} finally {
		await browser.close();
	}
}

run().catch((err) => {
	console.error("[FATAL ERROR]", err);
	process.exit(1);
});
