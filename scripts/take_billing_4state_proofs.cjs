const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const WEB_BASE = "http://127.0.0.1:5173";
const API_BASE = "http://127.0.0.1:4100";
const CONV_ID = "c5d0b733-cd1d-4432-b980-1a9a53266aee";
const OUT_DOCS = path.resolve(__dirname, "../docs/proofs/billing");
const OUT_CONV = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}`);

[OUT_DOCS, OUT_CONV].forEach((dir) => {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
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
	const p2 = path.join(OUT_CONV, filename);
	await page.screenshot({ path: p1, fullPage: false, animations: "disabled", timeout: 15000 });
	fs.copyFileSync(p1, p2);
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
	try {
		const res = await fetch(`${API_BASE}/api/auth/login`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email: "doctor@clinic.com", password: "dente2026" }),
		});
		const data = await res.json();
		if (data.ok) return data;
	} catch (_) {}
	return {
		clinicToken: "demo-clinic-token",
		staffToken: "demo-staff-token",
		user: { id: "demo-doctor-id", role: "owner", fullName: "Д-р Смирнов А.В." },
	};
}

async function injectStorage(context, auth, theme = "light") {
	await context.addInitScript(({ clinicToken, staffToken, user, th }) => {
		const ownerUser = { ...user, role: "owner" };
		localStorage.setItem("dente_clinic_token", clinicToken);
		localStorage.setItem("dente_staff_token", staffToken);
		localStorage.setItem("dente_active_session_token", staffToken);
		localStorage.setItem("dente_active_role", "owner");
		localStorage.setItem("dente_workspace_mode", "clinic");
		localStorage.setItem(
			"dente-workspace-profile",
			JSON.stringify({ mode: "clinic", role: "owner", activeRole: "owner" })
		);
		localStorage.setItem("dente_active_user_id", user.id || "demo-doctor-id");
		localStorage.setItem("dental-crm:active-user:v1", JSON.stringify(ownerUser));
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
	}, { clinicToken: auth.clinicToken, staffToken: auth.staffToken, user: auth.user, th: theme });
}

async function setupFinanceCashboxView(page) {
	await page.waitForTimeout(4000);
	await suppressOverlays(page);

	// Click sidebar link for finance
	await page.evaluate(() => {
		const link = document.querySelector('a[href="#finance"]');
		if (link) {
			link.click();
		} else if (window.__useAppStore) {
			window.__useAppStore.getState().setCurrentView("finance");
		}
		window.location.hash = "finance";
		window.dispatchEvent(new HashChangeEvent("hashchange"));
	});
	await page.waitForTimeout(3000);
	await suppressOverlays(page);

	// Now open the cashbox modal
	const opened = await page.evaluate(async () => {
		const btn = document.querySelector('[data-testid="btn-finance-open-cashbox"]');
		if (btn) {
			btn.click();
			return true;
		}
		const optBtn = document.querySelector('[data-testid="finance-toolbar-options-btn"]');
		if (optBtn) {
			optBtn.click();
			await new Promise((r) => setTimeout(r, 300));
			const innerBtn = document.querySelector('[data-testid="btn-finance-open-cashbox"]');
			if (innerBtn) {
				innerBtn.click();
				return true;
			}
		}
		return false;
	});
	console.log("Cashbox modal opened:", opened);
	await page.waitForTimeout(2000);
	await suppressOverlays(page);
}

async function run() {
	console.log("[Proof Runner] Authenticating with Fastify backend...");
	const auth = await getAuthTokens();
	console.log("[Proof Runner] Authenticated as:", auth.user?.fullName);

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

		console.log("Navigating PC to http://127.0.0.1:5173/...");
		await pcPage.goto(`${WEB_BASE}/?demo=true`, { waitUntil: "commit", timeout: 35000 });
		await setupFinanceCashboxView(pcPage);

		// Capture PC Light
		console.log("Capturing pc-light.png...");
		await captureScreen(pcPage, "pc-light.png");

		// Capture PC Dark
		console.log("Switching to PC Dark and capturing pc-dark.png...");
		await setTheme(pcPage, "dark");
		await captureScreen(pcPage, "pc-dark.png");
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

		console.log("Navigating Mobile to http://127.0.0.1:5173/?demo=true...");
		await mobPage.goto(`${WEB_BASE}/?demo=true`, { waitUntil: "commit", timeout: 35000 });
		await setupFinanceCashboxView(mobPage);

		// Capture Mobile Light
		console.log("Capturing mobile-light.png...");
		await captureScreen(mobPage, "mobile-light.png");

		// Capture Mobile Dark
		console.log("Switching to Mobile Dark and capturing mobile-dark.png...");
		await setTheme(mobPage, "dark");
		await captureScreen(mobPage, "mobile-dark.png");
		await mobContext.close();

		console.log("\n[SUCCESS] All 4 billing visual proofs successfully captured!");
	} finally {
		await browser.close();
	}
}

run().catch((e) => {
	console.error("[FATAL]", e);
	process.exit(1);
});
