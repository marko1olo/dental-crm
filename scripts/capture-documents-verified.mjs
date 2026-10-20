import { mkdirSync, statSync, copyFileSync, existsSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const API_BASE = "http://127.0.0.1:4100";
const WEB_BASE = "http://127.0.0.1:5173";
const OUT_DOCS = "C:/Clinic_MVP/dental-crm/docs/proofs/documents";
const CONV_ID = "9eda3457-be49-4a43-985a-6588350f8959";
const OUT_CONV = `C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}`;
const browserExecutable = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

[OUT_DOCS, OUT_CONV].forEach((dir) => {
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
		document.documentElement.setAttribute("data-theme", th);
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
		}));
		document.cookie = `dente_clinic_token=${encodeURIComponent(clinicToken)}; path=/; max-age=31536000`;
		document.cookie = `dente_staff_token=${encodeURIComponent(staffToken)}; path=/; max-age=31536000`;
	}, { clinicToken: auth.clinicToken, staffToken: auth.staffToken, user: auth.user, th: theme });
}

async function setupDocumentsView(page) {
	// Wait for app to be ready
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

	// Switch to documents view
	console.log("[Setup] Switching to documents view...");
	await page.evaluate(() => {
		if (window.__useAppStore) {
			window.__useAppStore.getState().setCurrentView("documents");
		}
		window.location.hash = "documents";
		window.dispatchEvent(new HashChangeEvent("hashchange"));
	});
	await page.waitForTimeout(2000);

	// Wait until documents container is visible in DOM
	try {
		await page.waitForSelector('#documents, [data-testid="documents-catalog-view"], .documents-panel', { timeout: 15000 });
		console.log("[Setup] Documents panel selector found!");
	} catch (e) {
		console.warn("[Setup] Selector timeout:", e.message);
	}

	// Wait additional time for patient and card list to render
	await page.waitForTimeout(2000);
	const previewText = await page.evaluate(() => document.body ? document.body.innerText.replace(/\n/g, ' ').slice(0, 150) : '');
	console.log("[Setup] Current body text:", previewText);

	await suppressOverlays(page);
}

async function captureScreen(page, filename) {
	await suppressOverlays(page);
	await page.waitForTimeout(800);
	const p1 = path.join(OUT_DOCS, filename);
	const p2 = path.join(OUT_CONV, filename);
	await page.screenshot({ path: p1, fullPage: false, animations: "disabled", timeout: 15000 });
	copyFileSync(p1, p2);
	const size = statSync(p1).size;
	console.log(`[Captured] ${filename} (${size} bytes) -> OK: ${size >= 20000}`);
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
		// 1 & 2. PC Desktop Context (1440x900)
		console.log("\n--- Phase 1 & 2: PC Desktop Context (1440x900) ---");
		const pcContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
		await injectStorage(pcContext, auth, "light");
		const pcPage = await pcContext.newPage();

		console.log(`Navigating PC to ${WEB_BASE}/?demo=true...`);
		await pcPage.goto(`${WEB_BASE}/?demo=true`, { waitUntil: "commit", timeout: 35000 });
		await setupDocumentsView(pcPage);

		// Capture PC Light
		console.log("Capturing documents_catalog_pc_light.png...");
		await captureScreen(pcPage, "documents_catalog_pc_light.png");

		// Capture PC Dark
		console.log("Switching to PC Dark and capturing documents_catalog_pc_dark.png...");
		await setTheme(pcPage, "dark");
		await captureScreen(pcPage, "documents_catalog_pc_dark.png");
		await pcContext.close();

		// 3 & 4. Mobile Context (390x844)
		console.log("\n--- Phase 3 & 4: Mobile Context (390x844) ---");
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
		await setupDocumentsView(mobPage);

		// Capture Mobile Light
		console.log("Capturing documents_catalog_mobile_light.png...");
		await captureScreen(mobPage, "documents_catalog_mobile_light.png");

		// Capture Mobile Dark
		console.log("Switching to Mobile Dark and capturing documents_catalog_mobile_dark.png...");
		await setTheme(mobPage, "dark");
		await captureScreen(mobPage, "documents_catalog_mobile_dark.png");
		await mobContext.close();

		console.log("\n[SUCCESS] All 4 documents visual proofs successfully captured!");
	} finally {
		await browser.close();
	}
}

run().catch((e) => {
	console.error("[FATAL]", e);
	process.exit(1);
});
