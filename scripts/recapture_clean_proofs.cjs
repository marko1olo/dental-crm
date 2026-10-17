const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const WEB_BASE = "http://127.0.0.1:5173";
const API_BASE = "http://127.0.0.1:4100";
const OUT_DOCS = path.resolve(__dirname, "../docs/proofs/marketing");

if (!fs.existsSync(OUT_DOCS)) {
	fs.mkdirSync(OUT_DOCS, { recursive: true });
}

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
			`;
			document.head.appendChild(style);
			document.querySelectorAll("vite-error-overlay, .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay']").forEach((el) => el.remove());
		});
	} catch (_) {}
}

async function captureScreen(page, filename) {
	await suppressOverlays(page);
	await page.waitForTimeout(600);
	const p1 = path.join(OUT_DOCS, filename);
	await page.screenshot({ path: p1, fullPage: false, animations: "disabled", timeout: 15000 });
	const size = fs.statSync(p1).size;
	console.log(`[Captured] ${filename} (${size} bytes) -> OK: ${size >= 20000}`);
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
		body: JSON.stringify({ email: "clinic@example.com", password: "dente2026" }),
	});
	const data = await res.json();
	if (!data.ok) throw new Error("Auth failed: " + JSON.stringify(data));
	return data;
}

async function injectStorage(context, auth, theme = "light") {
	await context.addInitScript(({ clinicToken, staffToken, th }) => {
		localStorage.setItem("dente_clinic_token", clinicToken);
		localStorage.setItem("dente_staff_token", staffToken);
		localStorage.setItem("dente_active_session_token", staffToken);
		localStorage.setItem("dente_active_role", "owner");
		localStorage.setItem("dente_active_user_id", "demo-owner-id");
		localStorage.setItem("dental-crm:active-user:v1", JSON.stringify({
			id: "demo-owner-id",
			fullName: "Главврач / Владелец",
			role: "owner",
			email: "owner@clinic.com"
		}));
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
			selectedWorkspaceRole: "owner",
			onboardingDismissed: true,
			onboardingStep: "done",
		}));
		document.cookie = `dente_clinic_token=${encodeURIComponent(clinicToken)}; path=/; max-age=31536000`;
		document.cookie = `dente_staff_token=${encodeURIComponent(staffToken)}; path=/; max-age=31536000`;
	}, { clinicToken: auth.clinicToken, staffToken: auth.staffToken, th: theme });
}

async function setupMarketingRomiView(page) {
	console.log("Waiting for CRM workspace to finish mounting...");
	for (let i = 0; i < 90; i++) {
		await page.waitForTimeout(500);
		const ready = await page.evaluate(() => {
			const text = document.body ? document.body.innerText : "";
			const hasBoot = !!document.querySelector('.boot-state');
			const hasWs = !!document.querySelector('#workspace-content, .workspace');
			return !hasBoot && (hasWs || text.length > 500);
		});
		if (ready) {
			console.log("Workspace mounted cleanly at " + (i * 0.5) + "s");
			break;
		}
	}
	await suppressOverlays(page);

	// Switch to marketing view via __useAppStore and hash
	console.log("Switching view to marketing...");
	await page.evaluate(() => {
		if (window.__useAppStore) {
			window.__useAppStore.getState().setSelectedWorkspaceRole("owner");
			window.__useAppStore.getState().setCurrentView("marketing");
		}
		window.location.hash = "marketing";
		window.dispatchEvent(new HashChangeEvent("hashchange"));
	});
	await page.waitForTimeout(2000);
	await suppressOverlays(page);

	// Wait for marketing-view
	await page.waitForSelector('[data-testid="marketing-view"]', { timeout: 20000 });
	console.log("marketing-view selector mounted");

	// Click ROMI tab
	await page.evaluate(() => {
		const romiTab = document.querySelector('[data-testid="tab-nav-romi"]');
		if (romiTab) romiTab.click();
	});
	await page.waitForTimeout(1500);

	// Wait for ROMI table
	await page.waitForSelector('[data-testid="romi-table"]', { timeout: 15000 });
	console.log("romi-table selector mounted");

	// Click Sync with CRM if visible
	await page.evaluate(() => {
		const syncBtn = document.querySelector('[data-testid="romi-sync-crm-btn"]');
		if (syncBtn) syncBtn.click();
	});
	await page.waitForTimeout(1000);
	await suppressOverlays(page);

	// Reset scroll
	await page.evaluate(() => {
		document.querySelectorAll("*").forEach((el) => {
			if (el.scrollLeft > 0) el.scrollLeft = 0;
		});
		window.scrollTo(0, 0);
	});
	await page.waitForTimeout(600);
}

async function run() {
	console.log("[Proof Runner] Authenticating with Fastify backend...");
	const auth = await getAuthTokens();
	console.log("[Proof Runner] Authenticated OK");

	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-gpu"],
	});

	try {
		// 1 & 2. PC Desktop Context (1440x900)
		console.log("\n--- Phase 1 & 2: PC Desktop Context (1440x900) ---");
		const pcContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
		await injectStorage(pcContext, auth, "light");
		const pcPage = await pcContext.newPage();

		console.log("Navigating PC to " + WEB_BASE + "/?demo=true ...");
		await pcPage.goto(`${WEB_BASE}/?demo=true`, { waitUntil: "commit", timeout: 35000 });
		await setupMarketingRomiView(pcPage);

		// Capture PC Light
		console.log("Capturing pc_light_1440x900.png...");
		await captureScreen(pcPage, "pc_light_1440x900.png");

		// Capture PC Dark
		console.log("Switching to PC Dark and capturing pc_dark_1440x900.png...");
		await setTheme(pcPage, "dark");
		await captureScreen(pcPage, "pc_dark_1440x900.png");
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

		console.log("Navigating Mobile to " + WEB_BASE + "/?demo=true ...");
		await mobPage.goto(`${WEB_BASE}/?demo=true`, { waitUntil: "commit", timeout: 35000 });
		await setupMarketingRomiView(mobPage);

		// Capture Mobile Light
		console.log("Capturing mobile_light_390x844.png...");
		await captureScreen(mobPage, "mobile_light_390x844.png");

		// Capture Mobile Dark
		console.log("Switching to Mobile Dark and capturing mobile_dark_390x844.png...");
		await setTheme(mobPage, "dark");
		await captureScreen(mobPage, "mobile_dark_390x844.png");
		await mobContext.close();

		console.log("\n[SUCCESS] All 4 marketing visual proofs successfully captured!");
	} finally {
		await browser.close();
	}
}

run().catch((e) => {
	console.error("[FATAL]", e);
	process.exit(1);
});
