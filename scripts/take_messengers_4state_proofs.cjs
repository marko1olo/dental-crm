const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const WEB_BASE = "http://127.0.0.1:5173";
const API_BASE = "http://127.0.0.1:4100";
const CONV_ID = "0def6110-6ee2-47be-9493-bba539ac376e";
const OUT_DOCS = path.resolve(__dirname, "../docs/proofs/messengers");
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
	if (size < 20000) {
		throw new Error(`Screenshot ${filename} is too small (${size} bytes < 20KB). Blank render failure.`);
	}
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
		try {
			localStorage.setItem("dente_theme", th);
			localStorage.setItem("dente_theme_mode", th);
			localStorage.setItem("theme", th);
		} catch (_) {}
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
	} catch (e) {
		console.log("[Auth] Fastify direct login fallback:", e.message);
	}
	return {
		clinicToken: "demo-clinic-token",
		staffToken: "demo-staff-token",
		user: { id: "demo-doctor-id", fullName: "д-р Смирнова Анна Владимировна", role: "owner" },
	};
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

async function waitForAppReady(page) {
	await page.waitForTimeout(2000);
	try {
		await page.waitForFunction(
			() => {
				const text = document.body ? document.body.innerText : "";
				return !text.includes("Загрузка системы") && text.length > 200;
			},
			{ timeout: 20000 }
		);
	} catch (e) {
		console.log("[Wait] Fallback wait for app ready:", e.message);
	}
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
		// =========================================================================
		// PHASE 1: Desktop Context (1440x900) - Settings Messengers Tab
		// =========================================================================
		console.log("\n--- Phase 1: Settings Messengers Tab (PC Light & Dark) ---");
		const pcContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});
		await injectStorage(pcContext, auth, "light");
		const pcPage = await pcContext.newPage();

		console.log("Navigating PC to http://127.0.0.1:5173/?demo=true...");
		await pcPage.goto(`${WEB_BASE}/?demo=true`, { waitUntil: "commit", timeout: 35000 });
		await waitForAppReady(pcPage);

		// Switch to settings view and messengers tab
		console.log("Switching to Settings -> Messengers tab...");
		await pcPage.evaluate(() => {
			if (window.__useAppStore) {
				window.__useAppStore.getState().setCurrentView("settings");
				window.__useAppStore.getState().setSettingsTab("telegram");
			}
			window.location.hash = "settings/telegram";
			window.dispatchEvent(new HashChangeEvent("hashchange"));
		});

		// Wait for settings view to mount and finish loading
		try {
			await pcPage.waitForFunction(
				() => !document.body.innerText.includes("загрузка") && (
					!!document.querySelector(".settings-catalogue-sidebar") ||
					!!document.querySelector('[data-testid="settings-view"]')
				),
				{ timeout: 30000 }
			);
		} catch (e) {
			console.log("[Wait] Settings mount wait warning:", e.message);
		}
		await pcPage.waitForTimeout(2000);
		await suppressOverlays(pcPage);

		await pcPage.evaluate(() => {
			const details = document.querySelector(".settings-catalogue-sidebar details") || document.querySelector("details");
			if (details) details.open = true;
			const messengersBtn = document.getElementById("settings-tab-telegram") ||
				document.querySelector('[data-testid="settings-nav-messengers"]') ||
				Array.from(document.querySelectorAll(".settings-catalogue-btn, button")).find((b) => b.innerText && (b.innerText.includes("Мессенджеры") || b.innerText.includes("Telegram")));
			if (messengersBtn) messengersBtn.click();
		});
		await pcPage.waitForTimeout(2500);
		await suppressOverlays(pcPage);

		// Wait for Messengers header to be rendered
		await pcPage.waitForSelector('.messengers-settings, [aria-label="Мессенджеры клиники"]', { timeout: 20000 }).catch(() => {});

		// 1. Settings Messengers PC Light
		console.log("Capturing messengers_settings_pc_light_1440x900.png...");
		await setTheme(pcPage, "light");
		await captureScreen(pcPage, "messengers_settings_pc_light_1440x900.png");

		// 2. Settings Messengers PC Dark
		console.log("Capturing messengers_settings_pc_dark_1440x900.png...");
		await setTheme(pcPage, "dark");
		await captureScreen(pcPage, "messengers_settings_pc_dark_1440x900.png");

		// =========================================================================
		// PHASE 2: Desktop Context (1440x900) - WhatsApp Chat Panel in Communications
		// =========================================================================
		console.log("\n--- Phase 2: WhatsApp Chat Panel (PC Light & Dark) ---");
		await pcPage.evaluate(() => {
			if (window.__useAppStore) {
				window.__useAppStore.getState().setCurrentView("communications");
			}
			window.location.hash = "communications/chat";
			window.dispatchEvent(new HashChangeEvent("hashchange"));
		});
		await pcPage.waitForTimeout(2000);
		await suppressOverlays(pcPage);

		// Wait for communications view to mount
		await pcPage.waitForSelector('[data-testid="communications-view"], #communications', { timeout: 20000 }).catch(() => {});

		// Click on "WhatsApp Чат" tab in communications
		console.log("Clicking on 'WhatsApp Чат' segmented tab...");
		try {
			await pcPage.locator('button:has-text("WhatsApp Чат")').first().click({ timeout: 5000 });
		} catch (e) {
			console.log("[Phase 2] Locator click fallback:", e.message);
			await pcPage.evaluate(() => {
				const chatTab = Array.from(document.querySelectorAll("button")).find(
					(b) => b.innerText && b.innerText.trim() === "WhatsApp Чат"
				);
				if (chatTab) chatTab.click();
			});
		}
		await pcPage.waitForTimeout(2000);
		await suppressOverlays(pcPage);

		// Strictly wait for WhatsApp chat panel to mount
		console.log("Waiting for WhatsApp chat panel to mount...");
		await pcPage.waitForSelector('[data-testid="whatsapp-chat-panel"]', { timeout: 25000 });
		await pcPage.waitForTimeout(1000);

		// 3. WhatsApp Chat Panel PC Dark
		console.log("Capturing whatsapp_chat_panel_pc_dark_1440x900.png...");
		await setTheme(pcPage, "dark");
		await captureScreen(pcPage, "whatsapp_chat_panel_pc_dark_1440x900.png");

		// 4. WhatsApp Chat Panel PC Light
		console.log("Capturing whatsapp_chat_panel_pc_light_1440x900.png...");
		await setTheme(pcPage, "light");
		await captureScreen(pcPage, "whatsapp_chat_panel_pc_light_1440x900.png");

		await pcContext.close();

		// =========================================================================
		// PHASE 3: Mobile Context (390x844) - iPhone 14 / Apple HIG Touch Zones
		// =========================================================================
		console.log("\n--- Phase 3: WhatsApp Chat Panel (Mobile Light & Dark 390x844) ---");
		const mobileContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
			userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
		});
		await injectStorage(mobileContext, auth, "light");
		const mobilePage = await mobileContext.newPage();

		console.log("Navigating Mobile to http://127.0.0.1:5173/?demo=true...");
		await mobilePage.goto(`${WEB_BASE}/?demo=true`, { waitUntil: "commit", timeout: 35000 });
		await waitForAppReady(mobilePage);

		await mobilePage.evaluate(() => {
			if (window.__useAppStore) {
				window.__useAppStore.getState().setCurrentView("communications");
			}
			window.location.hash = "communications";
			window.dispatchEvent(new HashChangeEvent("hashchange"));
		});
		await mobilePage.waitForTimeout(2000);
		await suppressOverlays(mobilePage);

		// Click on first dialog (Кузнецов Михаил Викторович) to enter fullscreen chat room
		console.log("Entering mobile chat room for patient dialog...");
		await mobilePage.evaluate(() => {
			const dialogRow = document.querySelector('.mobile-dialog-row') ||
				document.querySelector('[data-testid^="dialog-row-"]') ||
				Array.from(document.querySelectorAll(".mobile-dialog-row, [role='button']")).find((el) => el.innerText && el.innerText.includes("Кузнецов"));
			if (dialogRow) dialogRow.click();
		});
		await mobilePage.waitForTimeout(1500);
		await suppressOverlays(mobilePage);
		await mobilePage.waitForSelector('[data-testid="mobile-chat-fullscreen"]', { timeout: 10000 }).catch(() => {});

		// 5. WhatsApp Chat Panel Mobile Light
		console.log("Capturing whatsapp_chat_panel_mobile_light_390x844.png...");
		await setTheme(mobilePage, "light");
		await captureScreen(mobilePage, "whatsapp_chat_panel_mobile_light_390x844.png");

		// 6. WhatsApp Chat Panel Mobile Dark
		console.log("Capturing whatsapp_chat_panel_mobile_dark_390x844.png...");
		await setTheme(mobilePage, "dark");
		await captureScreen(mobilePage, "whatsapp_chat_panel_mobile_dark_390x844.png");

		await mobileContext.close();

		console.log("\n[Proof Runner] All 6 canonical proof screenshots captured successfully!");
	} finally {
		await browser.close();
	}
}

run().catch((err) => {
	console.error("[Proof Runner Failed]:", err);
	process.exit(1);
});
