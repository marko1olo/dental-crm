import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const API_BASE = "http://127.0.0.1:4100";
const APP_BASE = "http://127.0.0.1:5174";
const OUT_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/messaging";
const BRAIN_DIR = "C:/Users/Admin/.gemini/antigravity/brain/01503a8f-5786-4b8f-a36a-d1e231268998/scratch/screenshots";

for (const d of [OUT_DIR, BRAIN_DIR]) {
	fs.mkdirSync(d, { recursive: true });
}

async function provisionLiveClinic() {
	const uid = Date.now();
	console.log(`[API] Provisioning live clinic on ${API_BASE} test-${uid}...`);
	const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			clinicName: `Стоматология ДЕНТЕ Экспресс ${uid}`,
			email: `sbp-${uid}@dente-live.ru`,
			password: "Password123!",
			ownerName: "Д-р Смирнов Алексей Петрович",
			ownerPin: "123456",
		}),
	});
	if (!initRes.ok) throw new Error(`setup/init failed: ${await initRes.text()}`);
	const initData = await initRes.json();

	const unlockRes = await fetch(`${API_BASE}/api/auth/staff/unlock`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-dente-clinic-token": initData.clinicToken,
		},
		body: JSON.stringify({ userId: initData.ownerUserId, pinCode: "123456" }),
	});
	if (!unlockRes.ok) throw new Error(`staff/unlock failed: ${await unlockRes.text()}`);
	const unlockData = await unlockRes.json();

	return {
		clinicToken: initData.clinicToken,
		staffToken: unlockData.staffToken,
		user: unlockData.user || { id: initData.ownerUserId, fullName: "Д-р Смирнов Алексей Петрович", role: "owner" },
	};
}

async function applyTheme(page, mode) {
	await page.evaluate((themeMode) => {
		if (window.__useThemeStore) {
			window.__useThemeStore.getState().setThemeMode(themeMode);
		}
		const root = document.documentElement;
		const isDark = themeMode === "dark";
		if (isDark) {
			root.classList.add("dark");
			root.classList.remove("light");
		} else {
			root.classList.remove("dark");
			root.classList.add("light");
		}
		root.setAttribute("data-theme", themeMode);
		localStorage.setItem("dente_theme_mode", themeMode);
		localStorage.setItem("dente_theme", themeMode);
	}, mode);
	await page.waitForTimeout(600);
}

async function saveProof(page, fileName) {
	const outPath = path.join(OUT_DIR, fileName);
	const brainPath = path.join(BRAIN_DIR, fileName);
	await page.waitForTimeout(600);
	await page.screenshot({ path: outPath, fullPage: false, animations: "disabled" });
	try { fs.copyFileSync(outPath, brainPath); } catch {}
	const size = fs.statSync(outPath).size;
	console.log(`[CAPTURED] ${fileName} (${(size / 1024).toFixed(1)} KB)`);
	if (size < 40 * 1024) {
		throw new Error(`Screenshot ${fileName} is too small (${size} bytes < 40KB)!`);
	}
}

async function openSbpPaymentModal(page) {
	const isSbpOpen = await page.locator(".sbp-modal-container").isVisible().catch(() => false);
	if (isSbpOpen) {
		console.log("SBP modal already open!");
		return;
	}

	let isHubOpen = await page.locator(".omnichannel-modal-overlay, .hub-main-container").isVisible().catch(() => false);
	if (!isHubOpen) {
		// If Suspense or dynamic import is hydrating, wait a moment
		try {
			await page.waitForSelector(".omnichannel-modal-overlay, .hub-main-container", { state: "visible", timeout: 4000 });
			isHubOpen = true;
		} catch {}
	}

	if (!isHubOpen) {
		console.log("Clicking 'Омниканальный чат' button (data-testid=communications-omnichannel-hub-btn)...");
		// Ensure section is "tasks" so button is visible
		const tasksTab = page.locator('.dente-segmented-btn:has-text("Очередь и рассылки"), button:has-text("Очередь задач")').first();
		if (await tasksTab.isVisible().catch(() => false)) {
			await tasksTab.click();
			await page.waitForTimeout(500);
		}

		const omniBtn = page.locator('[data-testid="communications-omnichannel-hub-btn"]').first();
		await omniBtn.waitFor({ state: "visible", timeout: 25000 });
		await omniBtn.click({ force: true });
		await page.waitForTimeout(1000);
		await page.screenshot({ path: path.join(OUT_DIR, "debug_hub_clicked.png") });

		console.log("Waiting for .omnichannel-modal-overlay or .hub-main-container...");
		try {
			await page.waitForSelector(".omnichannel-modal-overlay, .hub-main-container", { state: "visible", timeout: 15000 });
		} catch (e) {
			console.log("Overlay not visible, dumping DOM text:", (await page.locator("body").innerText()).slice(0, 300).replace(/\n+/g, " "));
			throw e;
		}
	}

	console.log("Clicking 'Выставить счет СБП' button...");
	const sbpBtn = page.locator("button.hub-btn-sbp-invoice, button:has-text('Выставить счет СБП')").first();
	await sbpBtn.waitFor({ state: "visible", timeout: 15000 });
	await sbpBtn.click({ force: true });

	console.log("Waiting for .sbp-modal-container to appear...");
	await page.waitForSelector(".sbp-modal-container", { state: "visible", timeout: 15000 });
	await page.waitForTimeout(1200); // Wait for dynamic QR SVG and countdown timer to hydrate
}

async function main() {
	const auth = await provisionLiveClinic();
	console.log("Starting Playwright Chrome runner against " + APP_BASE + " ...");

	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	try {
		// ══════════════════════════════════════════════════════════════
		// 1. PC VIEWPORT (1440x900)
		// ══════════════════════════════════════════════════════════════
		console.log("\n=== 1. PC LIGHT & DARK (1440x900) ===");
		const pcContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			serviceWorkers: "block",
		});
		const pcPage = await pcContext.newPage();

		await pcPage.addInitScript((a) => {
			// Complete suppression of Vite HMR WebSocket & reload
			window.location.reload = function() {
				console.log("[SHIELD] Suppressed window.location.reload");
			};
			const OriginalWebSocket = window.WebSocket;
			window.WebSocket = function(url, protocols) {
				if (typeof url === "string" && (url.includes("5174") || url.includes("5173") || url.includes("vite"))) {
					console.log("[SHIELD] Suppressed Vite HMR WebSocket:", url);
					return {
						addEventListener: () => {},
						removeEventListener: () => {},
						send: () => {},
						close: () => {},
						readyState: 3,
					};
				}
				return new OriginalWebSocket(url, protocols);
			};

			localStorage.setItem("dente_offline_autonomy_mode", "true");
			localStorage.setItem("dente_staff_session", JSON.stringify({ id: "usr-owner-001", name: "Д-р Главврач", role: "CHIEF_DOCTOR", permissions: ["*"] }));
			localStorage.setItem("dente_demo_showcase", "true");
			sessionStorage.setItem("dente:sw-controller-reload", "1");

			localStorage.setItem("dente_clinic_token", a.clinicToken);
			localStorage.setItem("dente_staff_token", a.staffToken);
			localStorage.setItem("dente_active_session_token", a.staffToken);
			localStorage.setItem("dente_active_role", "owner");
			localStorage.setItem("dente_active_staff_user", JSON.stringify(a.user));
			sessionStorage.setItem("dente_unlocked", "true");
			localStorage.setItem("dente_unlocked", "true");
			localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true }));
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
			localStorage.setItem("dente_demo_banner_dismissed", "true");
			localStorage.setItem("dente_privacy_shield_locked", "false");
			localStorage.setItem("dente_active_view", "communications");
		}, auth);

		pcPage.on("console", (m) => console.log(`[BROWSER ${m.type()}]:`, m.text().slice(0, 160)));
		pcPage.on("pageerror", (e) => console.log("[BROWSER ERROR]:", e.message));

		console.log(`Navigating to ${APP_BASE}/#communications...`);
		await pcPage.goto(`${APP_BASE}/#communications`, { waitUntil: "commit", timeout: 60000 });

		console.log("Waiting for communications view to mount...");
		for (let i = 1; i <= 60; i++) {
			await pcPage.waitForTimeout(1000);
			try {
				const text = await pcPage.evaluate(() => document.body ? document.body.innerText.replace(/\n+/g, " | ").slice(0, 160) : "");
				if (i % 5 === 0) console.log(`Sec ${i}: ${text}`);
				if (!text.includes("Загрузка системы") && !text.includes("Загрузка CRM") && text.length > 50) {
					console.log(`Application mounted in ${i}s! Text: ${text}`);
					break;
				}
			} catch (e) {
				console.log(`Sec ${i}: Transient evaluate error (${e.message}), continuing...`);
			}
		}
		await pcPage.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});
		
		// Ensure we navigate to communications view via sidebar if needed
		const commNav = pcPage.locator('a[href="#communications"], a:has-text("Связь")').first();
		if (await commNav.isVisible().catch(() => false)) {
			console.log("Clicking sidebar link 'Связь'...");
			await commNav.click({ force: true });
			await pcPage.waitForTimeout(1500);
		}

		await pcPage.waitForSelector('[data-testid="communications-view"], [data-testid="communications-omnichannel-hub-btn"], button:has-text("Омниканальный чат")', { timeout: 30000 });
		await pcPage.waitForTimeout(2000);

		// ☀️ 1. PC Light Mode
		console.log("Setting theme light...");
		await applyTheme(pcPage, "light");
		await openSbpPaymentModal(pcPage);
		await saveProof(pcPage, "01_messaging_sbp_modal_pc_light_1440.png");

		// 🌙 2. PC Dark Mode
		console.log("Setting theme dark...");
		await applyTheme(pcPage, "dark");
		await saveProof(pcPage, "02_messaging_sbp_modal_pc_dark_1440.png");

		// ══════════════════════════════════════════════════════════════
		// 2. MOBILE VIEWPORT (390x844)
		// ══════════════════════════════════════════════════════════════
		console.log("\n=== 2. MOBILE LIGHT & DARK (390x844) ===");
		console.log("Resizing page to 390x844...");
		await pcPage.setViewportSize({ width: 390, height: 844 });
		await pcPage.evaluate(() => window.dispatchEvent(new Event("resize")));
		await pcPage.waitForTimeout(2000);

		// Ensure SbpPaymentQrModal is still open or reopen it
		await openSbpPaymentModal(pcPage);

		// 📱 3. Mobile Light Mode
		console.log("Setting theme light on mobile...");
		await applyTheme(pcPage, "light");
		await saveProof(pcPage, "03_messaging_sbp_modal_mobile_light_390.png");

		// 📱 4. Mobile Dark Mode
		console.log("Setting theme dark on mobile...");
		await applyTheme(pcPage, "dark");
		await saveProof(pcPage, "04_messaging_sbp_modal_mobile_dark_390.png");

		await pcContext.close();
		console.log("\n[SUCCESS] All 4 states of SbpPaymentQrModal captured successfully!");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("Execution failed:", err);
	process.exit(1);
});
