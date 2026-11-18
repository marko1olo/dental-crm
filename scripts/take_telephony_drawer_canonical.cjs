const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const OUT_DOCS = path.resolve(__dirname, "../docs/proofs/telephony");
if (!fs.existsSync(OUT_DOCS)) {
	fs.mkdirSync(OUT_DOCS, { recursive: true });
}

async function saveProof(page, filename) {
	await page.waitForTimeout(600);
	const pDocs = path.join(OUT_DOCS, filename);
	await page.screenshot({ path: pDocs, fullPage: false, animations: "disabled" });
	const size = fs.statSync(pDocs).size;
	console.log(`[Captured] ${filename} (${size} bytes) -> OK: ${size >= 20000}`);
}

async function setTheme(page, theme) {
	await page.evaluate((th) => {
		document.documentElement.setAttribute("data-theme", th);
		document.body.setAttribute("data-theme", th);
		if (th === "dark") {
			document.documentElement.classList.add("dark");
			document.documentElement.classList.remove("light");
			document.body.classList.add("dark");
			document.body.classList.remove("light");
		} else {
			document.documentElement.classList.add("light");
			document.documentElement.classList.remove("dark");
			document.body.classList.add("light");
			document.body.classList.remove("dark");
		}
		document.documentElement.style.colorScheme = th;
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("dente_theme_mode", th);
	}, theme);
	await page.waitForTimeout(500);
}

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:5173";

async function setupPageAuth(context) {
	await context.addInitScript(() => {
		localStorage.setItem("dente_organization_id", "org-1");
		localStorage.setItem("dente_clinic_token", "test-clinic-token-123");
		localStorage.setItem("dente_staff_token", "test-staff-token-456");
		localStorage.setItem("dente_active_session_token", "mock-session-token");
		localStorage.setItem("dente_user_role", "administrator");
		localStorage.setItem("dente_user_name", "Администратор Анна Смирнова");
		localStorage.setItem("dente_active_user", JSON.stringify({
			id: "user-1",
			orgId: "org-1",
			name: "Администратор Анна Смирнова",
			fullName: "Администратор Анна Смирнова",
			role: "administrator",
			email: "admin@dente.ru",
			active: true,
			pin: null,
		}));
		localStorage.setItem("dente_workspace_perspective", "administrator");
		localStorage.setItem("dente_active_role", "administrator");
		localStorage.setItem("dente_active_mode", "clinic");
		sessionStorage.setItem("dente_unlocked", "true");
		localStorage.setItem("dente_demo_showcase", "true");
		localStorage.setItem("dente_demo_mode", "true");
		localStorage.setItem("dente_offline_mode", "true");
		localStorage.setItem("dente_offline_readiness_banner_dismissed_v1", "true");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_tour_dismissed", "true");
		localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
		localStorage.setItem("dente_demo_banner_dismissed", "true");
		localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true, step: "done" }));
		localStorage.setItem(
			"dental-crm:web-ui-preferences:v1",
			JSON.stringify({
				version: 1,
				uiLanguage: "ru",
				selectedWorkspaceRole: "administrator",
				onboardingDismissed: true,
				onboardingStep: "done",
			})
		);
		localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({
			theme: "light",
			onboardingDismissed: true,
			onboardingStep: "done",
			onboardingDraftMode: false,
		}));
	});
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
				.shepherd-element {
					display: none !important;
					pointer-events: none !important;
					opacity: 0 !important;
				}
			`;
			document.head.appendChild(style);
			document.querySelectorAll(".tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay']").forEach(el => el.remove());
		});
	} catch (_) {}
}

async function unlockIfLogin(page) {
	const loginBtn = page.locator('button:has-text("Войти в систему"), button:has-text("Войти"), button:has-text("Демо"), .auth-submit-btn').first();
	if (await loginBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
		console.log("Login button visible, clicking...");
		await loginBtn.click({ force: true });
		await page.waitForTimeout(1500);
	}
	const demoBtn = page.locator(".auth-demo-btn").first();
	if (await demoBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
		console.log("Demo button visible, clicking...");
		await demoBtn.click({ force: true });
		await page.waitForTimeout(1000);
	}
}

async function triggerCall(page) {
	console.log("Dispatching incoming call event...");
	await page.evaluate(() => {
		window.dispatchEvent(
			new CustomEvent("dente:telephony-mock-incoming", {
				detail: {
					callId: "call-" + Date.now(),
					phone: "+7 (926) 555-12-34",
					patientName: "Смирнова Екатерина Васильевна",
					patientId: "01a00000-0000-0000-0000-000000000001",
					provider: "mango",
					timestamp: new Date().toISOString(),
					status: "ringing",
					acutePain: true,
				},
			})
		);
	});
	await page.waitForTimeout(1000);
}

async function openTelephonyDrawerWithActiveCall(page) {
	console.log("Opening TelephonyDrawer by triggering call and clicking card button...");
	await triggerCall(page);

	// Find the card open button in badge or capsule
	const cardBtn = page.locator('[data-testid="badge-action-card"], [data-testid="capsule-open-card-btn"]').first();
	await cardBtn.waitFor({ state: "visible", timeout: 8000 });
	console.log("Found card button, clicking...");
	await cardBtn.click();

	await page.waitForSelector('[data-testid="telephony-patient-side-drawer"]', { timeout: 10000 });
	console.log("Telephony patient side drawer is visible!");
	await page.waitForTimeout(1000);
}

async function main() {
	console.log("=== LAUNCHING PLAYWRIGHT FOR TELEPHONY DRAWER 4-STATE PROOFS ===");
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: [
			"--no-sandbox",
			"--disable-setuid-sandbox",
			"--proxy-server=direct://",
			"--proxy-bypass-list=*",
		],
	});

	try {
		// -----------------------------------------------------------------
		// 1. DESKTOP CONTEXT (1440x900)
		// -----------------------------------------------------------------
		console.log("\n[1/2] Desktop Context (1440x900)...");
		const pcContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});
		await setupPageAuth(pcContext);
		const pcPage = await pcContext.newPage();

		console.log(`Navigating PC to ${BASE_URL}/?demo=true#schedule ...`);
		await pcPage.goto(`${BASE_URL}/?demo=true#schedule`, { waitUntil: "commit", timeout: 45000 });
		await pcPage.waitForTimeout(4000);
		await unlockIfLogin(pcPage);
		await suppressOverlays(pcPage);
		await pcPage.waitForTimeout(1000);

		// Open Drawer with active call
		await openTelephonyDrawerWithActiveCall(pcPage);

		// PC Light Drawer
		console.log("Capturing 01_telephony_drawer_pc_light_1440x900.png...");
		await setTheme(pcPage, "light");
		await suppressOverlays(pcPage);
		await saveProof(pcPage, "01_telephony_drawer_pc_light_1440x900.png");

		// PC Dark Drawer
		console.log("Capturing 02_telephony_drawer_pc_dark_1440x900.png...");
		await setTheme(pcPage, "dark");
		await suppressOverlays(pcPage);
		await saveProof(pcPage, "02_telephony_drawer_pc_dark_1440x900.png");

		await pcContext.close();

		// -----------------------------------------------------------------
		// 2. MOBILE CONTEXT (390x844, iPhone 14)
		// -----------------------------------------------------------------
		console.log("\n[2/2] Mobile Context (390x844)...");
		const mobileContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
		});
		await setupPageAuth(mobileContext);
		const mobilePage = await mobileContext.newPage();

		console.log(`Navigating mobile to ${BASE_URL}/?demo=true#schedule ...`);
		await mobilePage.goto(`${BASE_URL}/?demo=true#schedule`, { waitUntil: "commit", timeout: 45000 });
		await mobilePage.waitForTimeout(4000);
		await unlockIfLogin(mobilePage);
		await suppressOverlays(mobilePage);
		await mobilePage.waitForTimeout(1000);

		// Open Drawer with active call
		await openTelephonyDrawerWithActiveCall(mobilePage);

		// Mobile Light Drawer
		console.log("Capturing 03_telephony_drawer_mobile_light_390x844.png...");
		await setTheme(mobilePage, "light");
		await suppressOverlays(mobilePage);
		await saveProof(mobilePage, "03_telephony_drawer_mobile_light_390x844.png");

		// Mobile Dark Drawer
		console.log("Capturing 04_telephony_drawer_mobile_dark_390x844.png...");
		await setTheme(mobilePage, "dark");
		await suppressOverlays(mobilePage);
		await saveProof(mobilePage, "04_telephony_drawer_mobile_dark_390x844.png");

		await mobileContext.close();

		console.log("\n=== ALL TELEPHONY DRAWER 4-STATE PROOFS CAPTURED SUCCESSFULLY! ===");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("FATAL screenshot capture failure:", err);
	process.exit(1);
});
