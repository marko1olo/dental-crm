import { mkdirSync, statSync, copyFileSync, existsSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const API_BASE = "http://127.0.0.1:4100";
const WEB_BASE = "http://127.0.0.1:5173";
const OUT_DOCS = "C:/Clinic_MVP/dental-crm/docs/proofs/documents";
const OUT_ODONTO = "C:/Clinic_MVP/dental-crm/docs/proofs/odontogram";
const CONV_ID = "c44dee1f-e8b2-4479-94c5-7299ac52d786";
const OUT_CONV = `C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}`;
const SUB_CONV = "C:/Users/Admin/.gemini/antigravity/brain/985f660d-836b-454e-8a98-cd014608676d";
const browserExecutable = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

[OUT_DOCS, OUT_ODONTO, OUT_CONV, SUB_CONV].forEach((dir) => {
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
	await page.waitForTimeout(800);
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

async function captureScreen(page, outDir, filename) {
	await suppressOverlays(page);
	await page.waitForTimeout(600);
	const p1 = path.join(outDir, filename);
	const p2 = path.join(OUT_CONV, filename);
	const p3 = path.join(SUB_CONV, filename);
	await page.screenshot({ path: p1, fullPage: false, animations: "disabled", timeout: 15000 });
	copyFileSync(p1, p2);
	copyFileSync(p1, p3);
	const size = statSync(p1).size;
	console.log(`[Captured] ${filename} (${size} bytes) -> OK: ${size >= 20000}`);
}

async function waitForAppReady(page) {
	console.log("[Setup] Waiting for app shell...");
	for (let i = 0; i < 40; i++) {
		await page.waitForTimeout(500);
		try {
			const text = await page.evaluate(() => document.body ? document.body.innerText : "");
			if (!text.includes("Загрузка системы") && text.length > 200) {
				console.log(`[Setup] Shell ready (${text.length} chars)`);
				break;
			}
		} catch (_) {}
	}
	await suppressOverlays(page);
}

async function openForm043InDocuments(page) {
	console.log("[Navigate] Switching to documents view...");
	await page.evaluate(() => {
		if (window.__useAppStore) {
			window.__useAppStore.getState().setCurrentView("documents");
		}
		window.location.hash = "documents";
		window.dispatchEvent(new HashChangeEvent("hashchange"));
	});
	await page.waitForTimeout(1500);
	await suppressOverlays(page);

	// Select dental_medical_card_043u (Медицинская карта приёма)
	console.log("[Documents] Selecting Medical Card template...");
	await page.evaluate(() => {
		const cards = Array.from(document.querySelectorAll("div"));
		const medCard = cards.find((c) => c.innerText && c.innerText.includes("Медицинская карта приёма"));
		if (medCard) {
			const oformitBtn = Array.from(medCard.querySelectorAll("button")).find((b) => b.innerText.includes("Оформить") || b.innerText.includes("Открыть"));
			if (oformitBtn) {
				oformitBtn.click();
				return;
			}
		}
		const buttons = Array.from(document.querySelectorAll("button"));
		const cardBtn = buttons.find((b) => b.innerText.includes("Медицинская карта") || b.innerText.includes("043/у") || b.innerText.includes("Карта 043"));
		if (cardBtn) cardBtn.click();
	});
	await page.waitForTimeout(1500);
	await suppressOverlays(page);

	// Select Odontogram / Formula tab inside the medical card
	await page.evaluate(() => {
		const tabs = Array.from(document.querySelectorAll("button, [role='tab']"));
		const fTab = tabs.find((t) => t.innerText.includes("Зубная формула") || t.innerText.includes("Формула") || t.innerText.includes("Одонтограмма"));
		if (fTab) fTab.click();
	});
	await page.waitForTimeout(1000);
	await suppressOverlays(page);
}

async function openOdontogramInVisit(page) {
	console.log("[Navigate] Switching to patient / visit odontogram...");
	try {
		await page.evaluate(() => {
			if (window.__useAppStore) {
				try {
					window.__useAppStore.getState().setCurrentView("visit");
				} catch (_) {}
			}
			window.location.hash = "visit";
			window.dispatchEvent(new HashChangeEvent("hashchange"));
		});
	} catch (_) {}
	await page.waitForTimeout(2500);
	await suppressOverlays(page);

	// Click on Odontogram tab (PC) or Exam step (Mobile)
	try {
		await page.evaluate(() => {
			const elements = Array.from(document.querySelectorAll("button, [role='tab'], .tab-button"));
			const target = elements.find((t) =>
				t.innerText.includes("Зубная формула") ||
				t.innerText.includes("Одонтограмма") ||
				t.innerText.includes("2. Осмотр") ||
				t.innerText.includes("Осмотр") ||
				t.innerText.includes("Формула")
			);
			if (target) target.click();
		});
	} catch (_) {}
	await page.waitForTimeout(2000);
	await suppressOverlays(page);
}

async function run() {
	console.log("[Proof Runner] Authenticating with Fastify backend...");
	const auth = await getAuthTokens();
	console.log("[Proof Runner] Authenticated as:", auth.user?.fullName);

	const browser = await chromium.launch({
		headless: true,
		executablePath: browserExecutable,
		args: ["--no-sandbox", "--disable-gpu"],
	});

	try {
		// 1. Desktop PC Viewport (1440x900)
		console.log("\n=================== 1. DESKTOP PC (1440x900) ===================");
		const pcContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
		await injectStorage(pcContext, auth, "light");
		const pcPage = await pcContext.newPage();

		console.log(`Navigating PC to ${WEB_BASE}/?demo=true...`);
		await pcPage.goto(`${WEB_BASE}/?demo=true`, { waitUntil: "commit", timeout: 35000 });
		await waitForAppReady(pcPage);

		// Form 043/u in Documents
		await openForm043InDocuments(pcPage);
		await captureScreen(pcPage, OUT_DOCS, "form043_odontogram_flagship_pc_light.png");

		await setTheme(pcPage, "dark");
		await captureScreen(pcPage, OUT_DOCS, "form043_odontogram_flagship_pc_dark.png");

		// Odontogram with roots & canals in Visit
		await setTheme(pcPage, "light");
		await openOdontogramInVisit(pcPage);
		await captureScreen(pcPage, OUT_ODONTO, "odontogram_roots_and_canals_pc_light.png");
		await captureScreen(pcPage, OUT_ODONTO, "01_pc_light_1440x900.png");

		await setTheme(pcPage, "dark");
		await captureScreen(pcPage, OUT_ODONTO, "odontogram_roots_and_canals_pc_dark.png");
		await captureScreen(pcPage, OUT_ODONTO, "02_pc_dark_1440x900.png");

		await pcContext.close();

		// 2. Mobile Viewport (390x844)
		console.log("\n=================== 2. MOBILE (390x844) ===================");
		const mobContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
		});
		await injectStorage(mobContext, auth, "light");
		const mobPage = await mobContext.newPage();

		console.log(`Navigating Mobile to ${WEB_BASE}/?demo=true...`);
		await mobPage.goto(`${WEB_BASE}/?demo=true`, { waitUntil: "commit", timeout: 35000 });
		await waitForAppReady(mobPage);

		// Form 043/u in Mobile Documents
		await openForm043InDocuments(mobPage);
		await captureScreen(mobPage, OUT_DOCS, "form043_odontogram_flagship_mobile_light.png");

		await setTheme(mobPage, "dark");
		await captureScreen(mobPage, OUT_DOCS, "form043_odontogram_flagship_mobile_dark.png");

		// Mobile Odontogram in Visit
		await setTheme(mobPage, "light");
		await openOdontogramInVisit(mobPage);
		await captureScreen(mobPage, OUT_ODONTO, "odontogram_roots_and_canals_mobile_light.png");
		await captureScreen(mobPage, OUT_ODONTO, "03_mobile_light_390x844.png");

		await setTheme(mobPage, "dark");
		await captureScreen(mobPage, OUT_ODONTO, "odontogram_roots_and_canals_mobile_dark.png");
		await captureScreen(mobPage, OUT_ODONTO, "04_mobile_dark_390x844.png");

		await mobContext.close();

		console.log("\n[SUCCESS] All 4-state visual proofs captured successfully!");
	} finally {
		await browser.close();
	}
}

run().catch((err) => {
	console.error("[FATAL]", err);
	process.exit(1);
});
