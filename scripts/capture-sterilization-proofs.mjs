import { mkdir } from "node:fs/promises";
import { statSync, copyFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const CURRENT_CONV_ID = "f95146ca-c75f-4f5b-ab31-39b13f0deb2b";
const OUT_CONV = `C:/Users/Admin/.gemini/antigravity/brain/${CURRENT_CONV_ID}/screenshots`;
const OUT_DOCS = "C:/Clinic_MVP/dental-crm/docs/proofs/sterilization";
const API_URL = "http://127.0.0.1:4100";
const WEB_URL = process.env.VITE_URL || "http://127.0.0.1:5174";

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
					email: `doctor-steril-${Date.now()}-${attempt}@dente.local`,
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
			localStorage.setItem("dente_active_role", "owner");
			localStorage.setItem("dente_user_id", user.id);
			localStorage.setItem("dente_cached_active_staff_user", JSON.stringify({ ...user, role: "owner" }));
			localStorage.setItem("dental-crm:active-user:v1", JSON.stringify({ ...user, role: "owner" }));
			localStorage.setItem("dente_theme_mode", initialTheme);
			localStorage.setItem("dente_theme", initialTheme);
			localStorage.setItem("theme", initialTheme);
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_doctor_training_completed", "true");
			localStorage.setItem("dente_training_dismissed", "true");
			localStorage.setItem("dente_doctor_shift_active", "true");
			localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
			localStorage.setItem("dente_guide_tour_seen_roles_v2", JSON.stringify(["admin", "doctor", "director", "owner"]));
			localStorage.setItem(
				"dente_quest_progress_v2",
				JSON.stringify({ isDismissedPermanently: true, activeTrack: null, tracksProgress: {} }),
			);
			localStorage.setItem(
				"dental-crm:onboarding:v1",
				JSON.stringify({ completed: true, dismissed: true, step: "done", onboardingDismissed: true, onboardingStep: "done", version: 1 })
			);
			localStorage.setItem(
				"dente_ui_preferences_v1",
				JSON.stringify({ onboardingDismissed: true, onboardingStep: "done", version: 1 })
			);
			localStorage.setItem(
				"dente-workspace-profile",
				JSON.stringify({ mode: "owner", role: "owner", activeRole: "owner" })
			);
			localStorage.setItem(
				"dental-crm:web-ui-preferences:v1",
				JSON.stringify({
					version: 1,
					uiLanguage: "ru",
					selectedWorkspaceRole: "owner",
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

async function resolveViteUrl() {
	for (const port of [5173, 5174, 5175]) {
		try {
			const res = await fetch(`http://127.0.0.1:${port}/`);
			if (res.ok || res.status === 200 || res.status === 304) {
				return `http://127.0.0.1:${port}`;
			}
		} catch (_) {}
	}
	return "http://127.0.0.1:5173";
}

async function setupAndNavigate(page, { ct, st, usr, theme }) {
	const webUrl = await resolveViteUrl();
	await injectStorage(page, { ct, st, usr, theme });
	await page.goto(`${webUrl}/#scanner`, { waitUntil: "domcontentloaded", timeout: 30000 });
	await page.waitForSelector(".boot-state", { state: "detached", timeout: 25000 }).catch(() => {});
	await page.waitForTimeout(2000);
	await page.evaluate(() => {
		window.location.hash = "scanner";
		window.dispatchEvent(new HashChangeEvent("hashchange"));
	});
	await page.waitForSelector(".sanpin-container", { state: "visible", timeout: 25000 });
	await preparePage(page, theme);
	await page.waitForTimeout(1000);
}

async function captureScreen(page, filename) {
	const p1 = path.join(OUT_CONV, filename);
	const p2 = path.join(OUT_DOCS, filename);
	await page.screenshot({ path: p1, fullPage: false });
	let size = statSync(p1).size;
	if (size < 20000) {
		console.warn(`[WARN] File size for ${filename} is only ${size} bytes, waiting 3s and retrying...`);
		await page.waitForTimeout(3000);
		await page.screenshot({ path: p1, fullPage: false });
		size = statSync(p1).size;
	}
	copyFileSync(p1, p2);
	console.log(`[Screenshot] Saved: ${filename} (${size} bytes) -> OK: ${size >= 20000}`);
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
		console.log("1. Capturing PC Light (1440x900)...");
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
		await captureScreen(pageLight, "sterilization_pc_light.png");
		await contextLight.close();

		// ==========================================
		// 2. PC Dark (1440x900)
		// ==========================================
		console.log("2. Capturing PC Dark (1440x900)...");
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
		await captureScreen(pageDark, "sterilization_pc_dark.png");
		await contextDark.close();

		// ==========================================
		// 3. Mobile Light (390x844)
		// ==========================================
		console.log("3. Capturing Mobile Light (390x844)...");
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
		await captureScreen(pageMobLight, "sterilization_mobile_light.png");
		await contextMobLight.close();

		// ==========================================
		// 4. Mobile Dark (390x844)
		// ==========================================
		console.log("4. Capturing Mobile Dark (390x844)...");
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
		await captureScreen(pageMobDark, "sterilization_mobile_dark.png");
		await contextMobDark.close();

		console.log("ALL 4 STERILIZATION SCREENSHOTS CAPTURED SUCCESSFULLY!");
	} finally {
		await browser.close();
	}
}

run().catch((err) => {
	console.error("FATAL in capture-sterilization-proofs:", err);
	process.exit(1);
});
