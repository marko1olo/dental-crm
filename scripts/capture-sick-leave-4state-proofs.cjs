const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const PROOF_DIR = path.join(process.cwd(), "docs/proofs/sick_leave");
if (!fs.existsSync(PROOF_DIR)) {
	fs.mkdirSync(PROOF_DIR, { recursive: true });
}

async function getAuthTokens() {
	try {
		const res = await fetch("http://127.0.0.1:4100/api/auth/login", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email: "clinic@example.com", password: "dente2026" }),
		});
		const data = await res.json();
		if (data.ok) {
			return { clinicToken: data.clinicToken, staffToken: data.staffToken, user: data.user };
		}
	} catch (e) {
		console.warn("Auth endpoint fetch failed:", e.message);
	}
	return {
		clinicToken: "demo-showcase-token-doctor",
		staffToken: "demo-showcase-staff-token-doctor",
		user: { id: "01a00000-0000-0000-0000-000000000001", role: "doctor", fullName: "Д-р Соколов А. В." },
	};
}

async function injectSession(context, tokens) {
	await context.addInitScript(({ cTok, sTok, user }) => {
		try {
			if (typeof window !== "undefined" && window.localStorage) {
				localStorage.setItem("dente_demo_showcase", "true");
				localStorage.setItem("dente_clinic_token", cTok);
				localStorage.setItem("dente_staff_token", sTok);
				localStorage.setItem("dente_active_session_token", sTok);
				localStorage.setItem("dente_active_user_id", user?.id || "01a00000-0000-0000-0000-000000000001");
				localStorage.setItem("dente_user_name", user?.fullName || "Д-р Соколов А. В.");
				localStorage.setItem("dente_active_role", "doctor");
				localStorage.setItem("dente_selected_workspace_role", "doctor");
				localStorage.setItem("dente_user_role", "doctor");
				localStorage.setItem("dente_role", "doctor");
				localStorage.setItem("dente_perspective", "doctor");
				localStorage.setItem("dente_active_view", "documents");
				sessionStorage.setItem("dente_unlocked", "true");
				sessionStorage.setItem("dente:sw-controller-reload", "1");
				localStorage.setItem("dente_tour_completed", "true");
				localStorage.setItem("dente_tour_dismissed", "true");
				localStorage.setItem("dente_demo_banner_dismissed", "true");
				localStorage.setItem("dente_onboarding_completed", "true");
				localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true }));
			}
		} catch (_) {}
		try {
			document.cookie = `dente_clinic_token=${encodeURIComponent(cTok)}; path=/; max-age=31536000`;
			document.cookie = `dente_staff_token=${encodeURIComponent(sTok)}; path=/; max-age=31536000`;
		} catch (_) {}
	}, { cTok: tokens.clinicToken, sTok: tokens.staffToken, user: tokens.user });
}

async function suppressOverlays(page) {
	await page.evaluate(() => {
		const style = document.createElement("style");
		style.id = "clean-proof-style";
		style.innerHTML = `
			.tour-spotlight-root,
			.tour-backdrop-clickable-zone,
			[data-testid="guided-tour-spotlight-overlay"],
			[data-testid="guided-tour-coach-mark-card"],
			[data-testid="demo-mode-banner"],
			.global-toast-container,
			.notification-toast,
			vite-error-overlay {
				display: none !important;
				pointer-events: none !important;
			}
		`;
		document.head.appendChild(style);
	}).catch(() => {});
}

async function setTheme(page, theme) {
	await page.evaluate((th) => {
		document.documentElement.setAttribute("data-theme", th);
		const isDark = (th === "dark");
		document.documentElement.classList.toggle("dark", isDark);
		document.documentElement.classList.toggle("light", !isDark);
		document.documentElement.style.colorScheme = th;
		document.body.setAttribute("data-theme", th);
		document.body.classList.toggle("dark", isDark);
		document.body.classList.toggle("light", !isDark);
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("dente_theme_mode", th);
		localStorage.setItem("theme", th);
	}, theme).catch(() => {});
	await suppressOverlays(page);
	await page.waitForTimeout(500);
}

async function openSickLeaveModal(page) {
	console.log("  -> Searching for trigger button to open SickLeaveElnModal...");
	// 1. Try header button
	let btn = await page.$('[data-testid="open-sick-leave-eln-modal-btn"]');
	if (btn) {
		console.log("  -> Clicking [data-testid='open-sick-leave-eln-modal-btn']...");
		await btn.click();
		await page.waitForSelector('.sick-leave-modal-container', { state: "visible", timeout: 8000 });
		return;
	}
	// 2. Try scenario button
	btn = await page.$('[data-testid="scenario-sick-leave-eln-btn"]');
	if (btn) {
		console.log("  -> Clicking [data-testid='scenario-sick-leave-eln-btn']...");
		await btn.click();
		await page.waitForSelector('.sick-leave-modal-container', { state: "visible", timeout: 8000 });
		return;
	}
	// 3. Fallback text search
	console.log("  -> Fallback text matching button...");
	btn = await page.$('button:has-text("Больничный"), button:has-text("ЭЛН")');
	if (btn) {
		await btn.click();
		await page.waitForSelector('.sick-leave-modal-container', { state: "visible", timeout: 8000 });
	}
}

async function main() {
	console.log("=== CAPTURING 4-STATE VISUAL PROOFS FOR SICK LEAVE & ELN ===");
	const tokens = await getAuthTokens();
	console.log("Acquired auth tokens. User:", tokens.user?.fullName);

	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-gpu"],
	});

	try {
		// 1. PC CONTEXT (1440x900)
		console.log("\n--- [PC 1440x900] ---");
		const pcContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
			serviceWorkers: "block",
		});
		await injectSession(pcContext, tokens);
		const pcPage = await pcContext.newPage();
		console.log("Navigating PC to http://127.0.0.1:5173/documents-preview.html?open=sick-leave ...");
		await pcPage.goto("http://127.0.0.1:5173/documents-preview.html?open=sick-leave", { waitUntil: "domcontentloaded", timeout: 30000 });
		await pcPage.waitForSelector('.sick-leave-modal-container', { state: "visible", timeout: 15000 });
		await suppressOverlays(pcPage);
		await pcPage.waitForTimeout(1000);

		// PC Light
		console.log("Capturing pc_light_1440x900.png...");
		await setTheme(pcPage, "light");
		const pcLightPath = path.join(PROOF_DIR, "pc_light_1440x900.png");
		await pcPage.screenshot({ path: pcLightPath, fullPage: false });
		console.log(`Saved: ${pcLightPath} (${Math.round(fs.statSync(pcLightPath).size / 1024)} KB)`);

		// PC Dark
		console.log("Capturing pc_dark_1440x900.png...");
		await setTheme(pcPage, "dark");
		const pcDarkPath = path.join(PROOF_DIR, "pc_dark_1440x900.png");
		await pcPage.screenshot({ path: pcDarkPath, fullPage: false });
		console.log(`Saved: ${pcDarkPath} (${Math.round(fs.statSync(pcDarkPath).size / 1024)} KB)`);

		await pcContext.close();

		// 2. MOBILE CONTEXT (390x844)
		console.log("\n--- [Mobile 390x844] ---");
		const mobileContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
			serviceWorkers: "block",
		});
		await injectSession(mobileContext, tokens);
		const mobilePage = await mobileContext.newPage();
		console.log("Navigating Mobile to http://127.0.0.1:5173/documents-preview.html?open=sick-leave ...");
		await mobilePage.goto("http://127.0.0.1:5173/documents-preview.html?open=sick-leave", { waitUntil: "domcontentloaded", timeout: 30000 });
		await mobilePage.waitForSelector('.sick-leave-modal-container', { state: "visible", timeout: 15000 });
		await suppressOverlays(mobilePage);
		await mobilePage.waitForTimeout(1000);

		// Mobile Light
		console.log("Capturing mobile_light_390x844.png...");
		await setTheme(mobilePage, "light");
		const mobLightPath = path.join(PROOF_DIR, "mobile_light_390x844.png");
		await mobilePage.screenshot({ path: mobLightPath, fullPage: false });
		console.log(`Saved: ${mobLightPath} (${Math.round(fs.statSync(mobLightPath).size / 1024)} KB)`);

		// Mobile Dark
		console.log("Capturing mobile_dark_390x844.png...");
		await setTheme(mobilePage, "dark");
		const mobDarkPath = path.join(PROOF_DIR, "mobile_dark_390x844.png");
		await mobilePage.screenshot({ path: mobDarkPath, fullPage: false });
		console.log(`Saved: ${mobDarkPath} (${Math.round(fs.statSync(mobDarkPath).size / 1024)} KB)`);

		await mobileContext.close();
		console.log("\n[SUCCESS] All 4 states successfully captured in docs/proofs/sick_leave/ !");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("[FATAL ERROR]:", err);
	process.exit(1);
});
