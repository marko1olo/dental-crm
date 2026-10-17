import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const PROOFS_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/sanpin";
const API_URL = "http://127.0.0.1:4100";
const WEB_URL = "http://127.0.0.1:5173";

await mkdir(PROOFS_DIR, { recursive: true });

async function getLiveProvisionedTokens() {
	console.log("[Auth] Provisioning live clinic session via Fastify API /api/auth/setup/init...");
	const initRes = await fetch(`${API_URL}/api/auth/setup/init`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			clinicName: "Стоматология ДЕНТЕ Премиум",
			email: `doctor-sanpin-${Date.now()}@dente.local`,
			password: "Password123!",
			ownerName: "Д-р Воронов Алексей Владимирович",
			ownerPin: "1234",
		}),
	});
	if (!initRes.ok) {
		throw new Error(`Clinic setup init failed HTTP ${initRes.status}: ${await initRes.text()}`);
	}
	const initData = await initRes.json();
	console.log(`[Auth] Clinic init OK. Owner user: ${initData.ownerUserId}`);

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
	console.log("[Auth] Doctor unlocked OK, live tokens ready!");

	return {
		clinicToken: initData.clinicToken,
		staffToken: unlockData.staffToken,
		user: unlockData.user || {
			id: initData.ownerUserId,
			fullName: "Д-р Воронов Алексей Владимирович",
			role: "doctor",
		},
	};
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
	await page.goto(`${WEB_URL}/?demo=true#scanner`, { waitUntil: "commit", timeout: 30000 });
	await page.waitForTimeout(1500);
	await preparePage(page, theme);

	await page.evaluate(() => {
		window.location.hash = "scanner";
	});
	await page.waitForTimeout(1500);

	const link = page.locator('a[href="#scanner"]').first();
	if (await link.count() > 0 && await link.isVisible()) {
		await link.click({ force: true });
		await page.waitForTimeout(1000);
	}

	await page.waitForSelector(".sanpin-container", { state: "visible", timeout: 20000 });
	await preparePage(page, theme);
	await page.waitForTimeout(800);
}

async function captureScreen(page, filename) {
	const filePath = path.join(PROOFS_DIR, filename);
	await page.screenshot({ path: filePath, fullPage: false });
	const fileStat = await stat(filePath);
	console.log(`[Screenshot] Saved: ${filePath} (${(fileStat.size / 1024).toFixed(1)} KB)`);
}

async function run() {
	const auth = await getLiveProvisionedTokens();

	console.log("Launching Edge browser via Playwright...");
	let browser;
	try {
		browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
	} catch {
		browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
	}

	try {
		// =========================================================================
		// 1. PC Light (1440x900)
		// =========================================================================
		console.log("\n--- 1. PC Light (1440x900) ---");
		const contextPcLight = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
			colorScheme: "light",
		});
		const pagePcLight = await contextPcLight.newPage();
		await setupAndNavigate(pagePcLight, {
			ct: auth.clinicToken,
			st: auth.staffToken,
			usr: auth.user,
			theme: "light",
		});

		const autoclaveTab = pagePcLight.locator('[data-testid="tab-autoclave-btn"]');
		if (await autoclaveTab.count() > 0) {
			await autoclaveTab.click({ force: true });
			await pagePcLight.waitForTimeout(800);
		}

		await captureScreen(pagePcLight, "pc_light_sanpin_sterilization_1440x900.png");

		// 1.1 Open Batch Sterility Confirmation Modal
		console.log("\n--- 1.1 Batch Sterility Confirmation Modal ---");
		const batchModalBtn = pagePcLight.locator('[data-testid="batch-verify-modal-btn"]').first();
		if (await batchModalBtn.count() > 0 && await batchModalBtn.isVisible()) {
			await batchModalBtn.click({ force: true });
			await pagePcLight.waitForTimeout(800);
			await captureScreen(pagePcLight, "pc_light_batch_scanner_modal.png");
			const closeBatchBtn = pagePcLight.locator('button:has-text("Отмена"), button[aria-label="Закрыть"]').first();
			if (await closeBatchBtn.count() > 0) {
				await closeBatchBtn.click({ force: true });
				await pagePcLight.waitForTimeout(600);
			}
		}

		// 1.2 Open New Autoclave Cycle Modal
		console.log("\n--- 1.2 Autoclave Cycle Modal ---");
		const startCycleBtn = pagePcLight.locator('[data-testid="start-cycle-btn"]').first();
		if (await startCycleBtn.count() > 0 && await startCycleBtn.isVisible()) {
			await startCycleBtn.click({ force: true });
			await pagePcLight.waitForTimeout(800);
			await captureScreen(pagePcLight, "pc_light_autoclave_cycle_modal.png");
			const closeCycleBtn = pagePcLight.locator('button:has-text("Отмена"), [aria-label="Закрыть"]').first();
			if (await closeCycleBtn.count() > 0) {
				await closeCycleBtn.click({ force: true });
				await pagePcLight.waitForTimeout(600);
			}
		}

		await contextPcLight.close();

		// =========================================================================
		// 2. PC Dark (1440x900)
		// =========================================================================
		console.log("\n--- 2. PC Dark (1440x900) ---");
		const contextPcDark = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
			colorScheme: "dark",
		});
		const pagePcDark = await contextPcDark.newPage();
		await setupAndNavigate(pagePcDark, {
			ct: auth.clinicToken,
			st: auth.staffToken,
			usr: auth.user,
			theme: "dark",
		});

		const autoclaveTabDark = pagePcDark.locator('[data-testid="tab-autoclave-btn"]');
		if (await autoclaveTabDark.count() > 0) {
			await autoclaveTabDark.click({ force: true });
			await pagePcDark.waitForTimeout(800);
		}

		await captureScreen(pagePcDark, "pc_dark_sanpin_sterilization_1440x900.png");
		await contextPcDark.close();

		// =========================================================================
		// 3. Mobile Light (390x844)
		// =========================================================================
		console.log("\n--- 3. Mobile Light (390x844) ---");
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

		const autoclaveTabMobL = pageMobLight.locator('[data-testid="tab-autoclave-btn"]');
		if (await autoclaveTabMobL.count() > 0) {
			await autoclaveTabMobL.click({ force: true });
			await pageMobLight.waitForTimeout(800);
		}

		await captureScreen(pageMobLight, "mobile_light_sanpin_sterilization_390x844.png");
		await contextMobLight.close();

		// =========================================================================
		// 4. Mobile Dark (390x844)
		// =========================================================================
		console.log("\n--- 4. Mobile Dark (390x844) ---");
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

		const autoclaveTabMobD = pageMobDark.locator('[data-testid="tab-autoclave-btn"]');
		if (await autoclaveTabMobD.count() > 0) {
			await autoclaveTabMobD.click({ force: true });
			await pageMobDark.waitForTimeout(800);
		}

		await captureScreen(pageMobDark, "mobile_dark_sanpin_sterilization_390x844.png");
		await contextMobDark.close();

		console.log("\nAll SanPiN visual proof screenshots captured successfully!");
	} finally {
		await browser.close();
	}
}

run().catch((err) => {
	console.error("Screenshot capture failed:", err);
	process.exit(1);
});
