import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const WEB_BASE = "http://127.0.0.1:5173";
const LEADS_DIR = path.resolve("docs/proofs/leads");
const TELEPHONY_DIR = path.resolve("docs/proofs/telephony");

fs.mkdirSync(LEADS_DIR, { recursive: true });
fs.mkdirSync(TELEPHONY_DIR, { recursive: true });

async function suppressOverlays(page) {
	await page.evaluate(() => {
		const style = document.createElement("style");
		style.id = "suppress-all-tour-overlays";
		style.innerHTML = `
			.tour-spotlight-root,
			.tour-backdrop-clickable-zone,
			[data-testid="guided-tour-spotlight-overlay"],
			[data-testid="guided-tour-coach-mark-card"],
			.shepherd-element {
				display: none !important;
				pointer-events: none !important;
				opacity: 0 !important;
			}
		`;
		document.head.appendChild(style);
	});
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
		try {
			localStorage.setItem("dente_theme", th);
			localStorage.setItem("theme", th);
		} catch (_) {}
	}, theme);
}

async function verifyAndSaveScreenshot(page, filePath, description) {
	await page.screenshot({ path: filePath, fullPage: false });
	const stat = fs.statSync(filePath);
	if (stat.size < 20000) {
		throw new Error(`[BLANK DETECTED] Screenshot ${filePath} is only ${stat.size} bytes!`);
	}
	console.log(`[PROOF CAPTURED] ${path.basename(filePath)} (${stat.size} bytes) -> ${description}`);
}

async function run() {
	console.log("=== STARTING CANONICAL TELEPHONY & LEADS SCREENSHOT CAPTURE ===");

	const browser = await chromium.launch({
		headless: true,
		channel: "msedge",
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--font-render-hinting=none"],
	});

	try {
		// ==========================================
		// 1. DESKTOP VIEWPORT: 1440 x 900
		// ==========================================
		console.log("1. Setting up Desktop context (1440x900)...");
		const pcContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});

		// Ensure preferences default to owner role
		await pcContext.addInitScript(() => {
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_tour_completed", "true");
			sessionStorage.setItem("dente_unlocked", "true");
			localStorage.setItem(
				"dental-crm:web-ui-preferences:v1",
				JSON.stringify({
					version: 1,
					uiLanguage: "ru",
					selectedWorkspaceRole: "owner",
					onboardingDismissed: true,
					onboardingStep: "done",
				})
			);
			localStorage.setItem(
				"dente-workspace-profile",
				JSON.stringify({ mode: "clinic", role: "owner", activeRole: "owner" })
			);
		});

		const pcPage = await pcContext.newPage();
		console.log("Navigating to http://127.0.0.1:5173/?demo=true ...");
		await pcPage.goto(`${WEB_BASE}/?demo=true`, { waitUntil: "domcontentloaded" });
		await pcPage.waitForTimeout(2000);

		// If on login screen, enter demo tour
		const demoBtn = pcPage.locator(".auth-demo-btn");
		if (await demoBtn.isVisible()) {
			console.log("Clicking .auth-demo-btn...");
			await demoBtn.click();
			await pcPage.waitForTimeout(1000);

			// Choose "Главврач" (owner) card
			const ownerCard = pcPage.locator(".auth-demo-role-card", { hasText: "Главврач" });
			if (await ownerCard.isVisible()) {
				console.log("Selecting Главврач demo role card...");
				await ownerCard.click();
				await pcPage.waitForTimeout(500);
			}

			const launchBtn = pcPage.locator(".auth-demo-tour-actions button.auth-submit-btn").first();
			if (await launchBtn.isVisible()) {
				console.log("Launching demo tour...");
				await launchBtn.click();
				await pcPage.waitForTimeout(3000);
			}
		}

		// If top demo simulator bar exists, ensure "Главврач" role is active
		const glavvrachPill = pcPage.locator("button:has-text('Главврач')").first();
		if (await glavvrachPill.isVisible()) {
			console.log("Switching to Главврач role in Demo bar...");
			await glavvrachPill.click();
			await pcPage.waitForTimeout(1500);
		}

		// Navigate to Leads view
		console.log("Navigating to #leads...");
		await pcPage.evaluate(() => {
			window.location.hash = "leads";
			window.dispatchEvent(new HashChangeEvent("hashchange"));
		});
		await pcPage.waitForTimeout(2000);

		// Wait for Kanban board to hydrate and render
		console.log("Waiting for Leads Kanban board cards to render...");
		await pcPage.waitForSelector(".leads-kanban-board, [data-testid=\"leads-kanban-board\"]", {
			timeout: 20000,
		});
		await pcPage.waitForSelector("[data-testid^=\"lead-card-\"], .lead-kanban-card", {
			timeout: 20000,
		});
		await suppressOverlays(pcPage);
		await pcPage.waitForTimeout(1000);

		// ─── PROOF 1: Leads Kanban PC Light 1440x900 ────────────────────────────
		console.log("Capturing Leads Kanban PC Light...");
		await setTheme(pcPage, "light");
		await pcPage.waitForTimeout(1000);
		const leadsPcLight = path.join(LEADS_DIR, "leads_kanban_pc_light_1440x900.png");
		await verifyAndSaveScreenshot(pcPage, leadsPcLight, "Leads Kanban Board PC Light 1440x900");

		// ─── PROOF 2: Leads Kanban PC Dark 1440x900 ─────────────────────────────
		console.log("Capturing Leads Kanban PC Dark...");
		await setTheme(pcPage, "dark");
		await pcPage.waitForTimeout(1000);
		const leadsPcDark = path.join(LEADS_DIR, "leads_kanban_pc_dark_1440x900.png");
		await verifyAndSaveScreenshot(pcPage, leadsPcDark, "Leads Kanban Board PC Dark 1440x900");

		// ─── PROOF 3: Softphone Floating Dynamic Island Studio (PC Light) ────────
		console.log("Triggering live simulated incoming call...");
		await setTheme(pcPage, "light");
		await pcPage.evaluate(() => {
			window.dispatchEvent(
				new CustomEvent("dente:telephony-mock-incoming", {
					detail: {
						callId: "call-demo-proof-1",
						phone: "+7 (916) 234-56-78",
						patientName: "Смирнова Анна Сергеевна",
						patientId: "01a00000-0000-0000-0000-000000000001",
						provider: "mango",
						timestamp: new Date().toISOString(),
						status: "ringing",
						advertisingChannel: "yandex_direct",
						leadId: "lead-proof-1",
					},
				})
			);
		});
		await pcPage.waitForTimeout(1000);

		// Expand details via Dynamic Island capsule button
		const expandBtn = pcPage.locator(".dnt-telephony-island-pill button[title*=\"Развернуть\"]");
		if (await expandBtn.isVisible()) {
			console.log("Expanding Softphone Dynamic Island Studio...");
			await expandBtn.click();
			await pcPage.waitForTimeout(1000);
		}

		console.log("Capturing Softphone Floating Widget PC Light...");
		const softphoneLight = path.join(TELEPHONY_DIR, "telephony_softphone_pc_light_1440x900.png");
		await verifyAndSaveScreenshot(pcPage, softphoneLight, "Telephony Softphone Floating Widget PC Light 1440x900");

		// ─── PROOF 4: Softphone Floating Dynamic Island Studio (PC Dark) ─────────
		console.log("Capturing Softphone Floating Widget PC Dark...");
		await setTheme(pcPage, "dark");
		await pcPage.waitForTimeout(1000);
		const softphoneDark = path.join(TELEPHONY_DIR, "telephony_softphone_pc_dark_1440x900.png");
		await verifyAndSaveScreenshot(pcPage, softphoneDark, "Telephony Softphone Floating Widget PC Dark 1440x900");

		// Dismiss call before navigating to #communications
		await pcPage.evaluate(() => {
			const closeBtn = document.querySelector(".dnt-btn-icon[title*=\"Закрыть\"]");
			if (closeBtn) closeBtn.click();
		});
		await pcPage.waitForTimeout(600);

		// ─── PROOF 5: Communications & Calls Journal (PC Light) ──────────────────
		console.log("Navigating to #communications...");
		await pcPage.evaluate(() => {
			window.location.hash = "communications";
			window.dispatchEvent(new HashChangeEvent("hashchange"));
		});
		await pcPage.waitForTimeout(2000);
		await setTheme(pcPage, "light");
		await pcPage.waitForTimeout(1000);
		const callsJournalLight = path.join(TELEPHONY_DIR, "telephony_calls_journal_pc_light_1440x900.png");
		await verifyAndSaveScreenshot(pcPage, callsJournalLight, "Telephony Calls Journal PC Light 1440x900");

		// ─── PROOF 6: Communications & Calls Journal (PC Dark) ───────────────────
		console.log("Capturing Communications & Calls Journal PC Dark...");
		await setTheme(pcPage, "dark");
		await pcPage.waitForTimeout(1000);
		const callsJournalDark = path.join(TELEPHONY_DIR, "telephony_calls_journal_pc_dark_1440x900.png");
		await verifyAndSaveScreenshot(pcPage, callsJournalDark, "Telephony Calls Journal PC Dark 1440x900");

		await pcContext.close();

		// ==========================================
		// 2. MOBILE VIEWPORT: 390 x 844 (iPhone 14)
		// ==========================================
		console.log("2. Setting up Mobile context (390x844)...");
		const mobileContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
		});

		await mobileContext.addInitScript(() => {
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_tour_completed", "true");
			sessionStorage.setItem("dente_unlocked", "true");
			localStorage.setItem(
				"dental-crm:web-ui-preferences:v1",
				JSON.stringify({
					version: 1,
					uiLanguage: "ru",
					selectedWorkspaceRole: "owner",
					onboardingDismissed: true,
					onboardingStep: "done",
				})
			);
			localStorage.setItem(
				"dente-workspace-profile",
				JSON.stringify({ mode: "clinic", role: "owner", activeRole: "owner" })
			);
		});

		const mobilePage = await mobileContext.newPage();
		console.log("Navigating mobile to http://127.0.0.1:5173/?demo=true#leads ...");
		await mobilePage.goto(`${WEB_BASE}/?demo=true#leads`, { waitUntil: "domcontentloaded" });
		await mobilePage.waitForTimeout(3000);

		// If on login, launch demo
		const mobileDemoBtn = mobilePage.locator(".auth-demo-btn");
		if (await mobileDemoBtn.isVisible()) {
			await mobileDemoBtn.click();
			await mobilePage.waitForTimeout(1000);
			const ownerCard = mobilePage.locator(".auth-demo-role-card", { hasText: "Главврач" });
			if (await ownerCard.isVisible()) {
				await ownerCard.click();
				await mobilePage.waitForTimeout(500);
			}
			const launchBtn = mobilePage.locator(".auth-demo-tour-actions button.auth-submit-btn").first();
			if (await launchBtn.isVisible()) {
				await launchBtn.click();
				await mobilePage.waitForTimeout(3000);
			}
		}

		await mobilePage.evaluate(() => {
			window.location.hash = "leads";
			window.dispatchEvent(new HashChangeEvent("hashchange"));
		});
		await mobilePage.waitForTimeout(2000);
		await suppressOverlays(mobilePage);

		// ─── PROOF 7: Leads Mobile Light 390x844 ─────────────────────────────────
		console.log("Capturing Leads Mobile Light...");
		await setTheme(mobilePage, "light");
		await mobilePage.waitForTimeout(1000);
		const leadsMobileLight = path.join(LEADS_DIR, "leads_mobile_light_390x844.png");
		await verifyAndSaveScreenshot(mobilePage, leadsMobileLight, "Leads Mobile Feed Light 390x844");

		// ─── PROOF 8: Leads Mobile Dark 390x844 ──────────────────────────────────
		console.log("Capturing Leads Mobile Dark...");
		await setTheme(mobilePage, "dark");
		await mobilePage.waitForTimeout(1000);
		const leadsMobileDark = path.join(LEADS_DIR, "leads_mobile_dark_390x844.png");
		await verifyAndSaveScreenshot(mobilePage, leadsMobileDark, "Leads Mobile Feed Dark 390x844");

		// ─── PROOF 9: Telephony Mobile Call Pill Light 390x844 ─────────────────
		console.log("Triggering mobile incoming call in Light theme...");
		await setTheme(mobilePage, "light");
		await mobilePage.waitForTimeout(600);
		await mobilePage.evaluate(() => {
			window.dispatchEvent(
				new CustomEvent("dente:telephony-mock-incoming", {
					detail: {
						callId: "call-demo-mobile-1",
						phone: "+7 (999) 123-45-67",
						patientName: "Елена Васильева",
						patientId: "01a00000-0000-0000-0000-000000000002",
						provider: "mango",
						timestamp: new Date().toISOString(),
						status: "ringing",
					},
				})
			);
		});
		await mobilePage.waitForTimeout(1000);
		const mobileTelephonyLight = path.join(TELEPHONY_DIR, "telephony_mobile_light_390x844.png");
		await verifyAndSaveScreenshot(mobilePage, mobileTelephonyLight, "Telephony Mobile Pill Light 390x844");

		// ─── PROOF 10: Telephony Mobile Call Pill Dark 390x844 ──────────────────
		console.log("Capturing mobile telephony in Dark theme...");
		await setTheme(mobilePage, "dark");
		await mobilePage.waitForTimeout(600);
		const mobileTelephonyDark = path.join(TELEPHONY_DIR, "telephony_mobile_dark_390x844.png");
		await verifyAndSaveScreenshot(mobilePage, mobileTelephonyDark, "Telephony Mobile Pill Dark 390x844");

		await mobileContext.close();

		console.log("=== ALL CANONICAL PROOFS SUCCESSFULLY CAPTURED! ===");
	} finally {
		await browser.close();
	}
}

run().catch((err) => {
	console.error("[FATAL CAPTURE ERROR]:", err);
	process.exit(1);
});
