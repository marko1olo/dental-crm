import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const OUT_CONV = "C:/Users/Admin/.gemini/antigravity/brain/61e49613-65b6-47dd-a3d7-13cc70872dcb/screenshots";
const OUT_DOCS = "C:/Clinic_MVP/dental-crm/docs/screenshots/sanpin";
const API_URL = "http://127.0.0.1:4100";
const WEB_URL = "http://127.0.0.1:5173";

await mkdir(OUT_CONV, { recursive: true });
await mkdir(OUT_DOCS, { recursive: true });

async function getLiveProvisionedTokens() {
	console.log("[Auth] Provisioning live clinic session via Fastify API /api/auth/setup/init...");
	let lastErr;
	for (let attempt = 1; attempt <= 5; attempt++) {
		try {
			const initRes = await fetch(`${API_URL}/api/auth/setup/init`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					clinicName: "Стоматология ДЕНТЕ Премиум",
					email: `doctor-sanpin-${Date.now()}-${attempt}@dente.local`,
					password: "Password123!",
					ownerName: "Д-р Воронов Алексей Владимирович",
					ownerPin: "1234",
				}),
			});
			if (!initRes.ok) {
				throw new Error(`Clinic setup init failed HTTP ${initRes.status}: ${await initRes.text()}`);
			}
			const initData = await initRes.json();
			console.log(`[Auth] Clinic init OK, clinicToken obtained. Owner user: ${initData.ownerUserId}`);

			console.log("[Auth] Unlocking doctor staff token via /api/auth/staff/unlock...");
			const unlockRes = await fetch(`${API_URL}/api/auth/staff/unlock`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-dente-clinic-token": initData.clinicToken,
				},
				body: JSON.stringify({ userId: initData.ownerUserId, pinCode: "1234" }),
			});
			if (!unlockRes.ok) {
				throw new Error(`Doctor unlock failed HTTP ${unlockRes.status}: ${await unlockRes.text()}`);
			}
			const unlockData = await unlockRes.json();
			console.log("[Auth] Doctor unlocked OK, staffToken obtained!");

			return {
				clinicToken: initData.clinicToken,
				staffToken: unlockData.staffToken,
				user: unlockData.user || {
					id: initData.ownerUserId,
					fullName: "Д-р Воронов Алексей Владимирович",
					role: "doctor",
				},
			};
		} catch (err) {
			lastErr = err;
			console.warn(`[Auth] Attempt ${attempt} failed, retrying in 1s...`, err.message);
			await new Promise((r) => setTimeout(r, 1000));
		}
	}
	throw lastErr;
}

function injectStorage(page, { ct, st, usr, theme }) {
	return page.addInitScript(
		({ clinicToken, staffToken, user, initialTheme }) => {
			localStorage.setItem("dente_clinic_token", clinicToken);
			localStorage.setItem("dente_staff_token", staffToken);
			localStorage.setItem("dente_active_role", "doctor");
			localStorage.setItem("dente_cached_active_staff_user", JSON.stringify(user));
			localStorage.setItem("dental-crm:active-user:v1", JSON.stringify(user));
			localStorage.setItem("dente_theme_mode", initialTheme);
			localStorage.setItem("dente_theme", initialTheme);
			localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_doctor_training_completed", "true");
			localStorage.setItem("dente_training_dismissed", "true");
			localStorage.setItem("dente_doctor_shift_active", "true");
			localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
			localStorage.setItem("dente_guide_tour_seen_roles_v2", JSON.stringify(["admin", "doctor", "director"]));
			localStorage.setItem(
				"dente_quest_progress_v2",
				JSON.stringify({ isDismissedPermanently: true, activeTrack: null, tracksProgress: {} }),
			);
			localStorage.setItem(
				"dental-crm:web-ui-preferences:v1",
				JSON.stringify({
					version: 1,
					uiLanguage: "ru",
					selectedWorkspaceRole: "doctor",
					onboardingDismissed: true,
					onboardingStep: "done",
				}),
			);
		},
		{ clinicToken: ct, staffToken: st, user: usr, initialTheme: theme },
	);
}

async function preparePage(page, theme) {
	await page.evaluate((th) => {
		document.documentElement.setAttribute("data-theme", th);
		if (th === "dark") {
			document.documentElement.classList.add("dark");
			document.documentElement.classList.remove("light");
		} else {
			document.documentElement.classList.add("light");
			document.documentElement.classList.remove("dark");
		}
		document.querySelectorAll(
			'.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container, [role="alert"]'
		).forEach((el) => el.remove());
		const b = Array.from(document.querySelectorAll("button, div")).find((el) =>
			el.textContent && el.textContent.includes("Сначала осмотреться")
		);
		if (b) b.click();
	}, theme);
}

async function setupAndNavigate(page, { ct, st, usr, theme }) {
	await injectStorage(page, { ct, st, usr, theme });
	await page.goto(`${WEB_URL}/`, { waitUntil: "commit", timeout: 30000 });
	await page.waitForTimeout(1000);
	await page.evaluate((th) => {
		document.documentElement.setAttribute("data-theme", th);
		if (th === "dark") {
			document.documentElement.classList.add("dark");
			document.documentElement.classList.remove("light");
		} else {
			document.documentElement.classList.add("light");
			document.documentElement.classList.remove("dark");
		}
		window.location.hash = "scanner";
	}, theme);
	await page.waitForTimeout(1500);
	await page.waitForSelector("text=Загрузка CRM", { state: "detached", timeout: 20000 }).catch(() => {});
	await page.waitForSelector(".sanpin-container, [data-testid='tab-autoclave-btn']", { state: "visible", timeout: 20000 }).catch(() => {});
	await preparePage(page, theme);
	await page.waitForTimeout(1000);
}

async function captureScreen(page, filename) {
	const p1 = path.join(OUT_CONV, filename);
	const p2 = path.join(OUT_DOCS, filename);
	await page.screenshot({ path: p1, fullPage: false });
	await page.screenshot({ path: p2, fullPage: false });
	console.log(`[Screenshot] Saved: ${filename}`);
}

async function run() {
	const auth = await getLiveProvisionedTokens();

	console.log("Launching Edge browser via Playwright (channel: msedge)...");
	const browser = await chromium.launch({
		channel: "msedge",
		headless: true,
	});

	try {
		// ==========================================
		// 1. PC Light (1440x900)
		// ==========================================
		console.log("Capturing PC Light (1440x900)...");
		const contextLight = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
			colorScheme: "light",
		});
		const pageLight = await contextLight.newPage();
		await setupAndNavigate(pageLight, {
			ct: auth.clinicToken,
			st: auth.staffToken,
			usr: auth.user,
			theme: "light",
		});

		// 1.1 Tab: Автоклавирование
		await captureScreen(pageLight, "sanpin_pc_light_autoclave.png");

		// 1.2 Switch to Tab: ПСО
		console.log("Switching to PSO tab in PC Light...");
		const psoTabBtn = pageLight.locator('[data-testid="tab-pso-btn"]');
		if (await psoTabBtn.count() > 0) {
			await psoTabBtn.click();
			await pageLight.waitForTimeout(1000);
			await captureScreen(pageLight, "sanpin_pc_light_pso.png");
		}

		// 1.3 Switch to Tab: Дезинфекция
		console.log("Switching to Disinfection tab in PC Light...");
		const disTabBtn = pageLight.locator('[data-testid="tab-disinfection-btn"]');
		if (await disTabBtn.count() > 0) {
			await disTabBtn.click();
			await pageLight.waitForTimeout(1000);
			await captureScreen(pageLight, "sanpin_pc_light_disinfection.png");
		}

		await contextLight.close();

		// ==========================================
		// 2. PC Dark (1440x900)
		// ==========================================
		console.log("Capturing PC Dark (1440x900)...");
		const contextDark = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
			colorScheme: "dark",
		});
		const pageDark = await contextDark.newPage();
		await setupAndNavigate(pageDark, {
			ct: auth.clinicToken,
			st: auth.staffToken,
			usr: auth.user,
			theme: "dark",
		});

		// 2.1 Tab: Автоклавирование Dark
		await captureScreen(pageDark, "sanpin_pc_dark_autoclave.png");

		// 2.2 Switch to Tab: ПСО Dark
		const psoTabDark = pageDark.locator('[data-testid="tab-pso-btn"]');
		if (await psoTabDark.count() > 0) {
			await psoTabDark.click();
			await pageDark.waitForTimeout(1000);
			await captureScreen(pageDark, "sanpin_pc_dark_pso.png");
		}

		await contextDark.close();

		// ==========================================
		// 3. Mobile Light (390x844 - iPhone 14)
		// ==========================================
		console.log("Capturing Mobile Light (390x844)...");
		const contextMobLight = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
			colorScheme: "light",
		});
		const pageMobLight = await contextMobLight.newPage();
		await setupAndNavigate(pageMobLight, {
			ct: auth.clinicToken,
			st: auth.staffToken,
			usr: auth.user,
			theme: "light",
		});

		await captureScreen(pageMobLight, "sanpin_mobile_light_autoclave.png");

		const mobPsoTab = pageMobLight.locator('[data-testid="tab-pso-btn"]');
		if (await mobPsoTab.count() > 0) {
			await mobPsoTab.click();
			await pageMobLight.waitForTimeout(1000);
			await captureScreen(pageMobLight, "sanpin_mobile_light_pso.png");
		}

		await contextMobLight.close();

		// ==========================================
		// 4. Mobile Dark (390x844 - iPhone 14)
		// ==========================================
		console.log("Capturing Mobile Dark (390x844)...");
		const contextMobDark = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
			colorScheme: "dark",
		});
		const pageMobDark = await contextMobDark.newPage();
		await setupAndNavigate(pageMobDark, {
			ct: auth.clinicToken,
			st: auth.staffToken,
			usr: auth.user,
			theme: "dark",
		});

		await captureScreen(pageMobDark, "sanpin_mobile_dark_autoclave.png");

		const mobPsoTabDark = pageMobDark.locator('[data-testid="tab-pso-btn"]');
		if (await mobPsoTabDark.count() > 0) {
			await mobPsoTabDark.click();
			await pageMobDark.waitForTimeout(1000);
			await captureScreen(pageMobDark, "sanpin_mobile_dark_pso.png");
		}

		await contextMobDark.close();

		console.log("All SanPiN screenshots captured successfully!");
	} finally {
		await browser.close();
	}
}

run().catch((err) => {
	console.error("Screenshot capture failed:", err);
	process.exit(1);
});
