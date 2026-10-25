import { mkdirSync, statSync, copyFileSync, existsSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import { chromium } from "playwright";

const CURRENT_CONV_ID = "e2713ddf-da1e-43b7-b726-c9f91f49200e";
const OUT_CONV = `C:/Users/Admin/.gemini/antigravity/brain/${CURRENT_CONV_ID}`;
const OUT_SANPIN = "C:/Clinic_MVP/dental-crm/docs/proofs/sanpin";
const OUT_SSOT = "C:/Clinic_MVP/dental-crm/docs/proofs/sanpin_ssot";
const OUT_STERIL = "C:/Clinic_MVP/dental-crm/docs/proofs/sterilization";
const API_URL = "http://127.0.0.1:4100";
const WEB_URL = "http://127.0.0.1:5173";

mkdirSync(OUT_CONV, { recursive: true });
mkdirSync(OUT_SANPIN, { recursive: true });
mkdirSync(OUT_SSOT, { recursive: true });
mkdirSync(OUT_STERIL, { recursive: true });

async function isPortResponding(url, timeoutMs = 2000) {
	try {
		const controller = new AbortController();
		const t = setTimeout(() => controller.abort(), timeoutMs);
		const baseUrl = new URL(url).origin;
		const res = await fetch(baseUrl, { signal: controller.signal });
		clearTimeout(t);
		return res.ok || res.status === 200 || res.status === 304;
	} catch {
		return false;
	}
}

async function ensureViteServer() {
	if (await isPortResponding(WEB_URL, 2000)) {
		console.log("[Vite] Detected active dev server on port 5173.");
		return null;
	}
	console.log("[Vite] Spawning dev server on port 5173...");
	const viteBin = path.resolve("C:/Clinic_MVP/dental-crm/node_modules/vite/bin/vite.js");
	const webDir = path.resolve("C:/Clinic_MVP/dental-crm/apps/web");
	const proc = spawn(process.execPath, ["--max-old-space-size=2048", viteBin, "--host", "127.0.0.1", "--port", "5173"], {
		cwd: webDir,
		stdio: "ignore",
	});
	for (let i = 0; i < 50; i++) {
		await new Promise((r) => setTimeout(r, 600));
		if (await isPortResponding(WEB_URL, 1000)) {
			console.log(`[Vite] Server ready in ${(i + 1) * 600}ms!`);
			return proc;
		}
	}
	try { proc.kill(); } catch {}
	throw new Error("Vite dev server failed to start on port 5173");
}

async function provisionSession() {
	console.log("[Auth] Provisioning live clinic session via API...");
	const uniqueId = Date.now();
	const initRes = await fetch(`${API_URL}/api/auth/setup/init`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			clinicName: "Стоматология ДЕНТЕ Премиум",
			email: `doctor-sanpin-${uniqueId}@dente.local`,
			password: "Password123!",
			ownerName: "Д-р Воронов Алексей Владимирович",
			ownerPin: "1234",
		}),
	});
	if (!initRes.ok) throw new Error(`Init failed: ${await initRes.text()}`);
	const initData = await initRes.json();

	const unlockRes = await fetch(`${API_URL}/api/auth/staff/unlock`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-dente-clinic-token": initData.clinicToken,
		},
		body: JSON.stringify({ userId: initData.ownerUserId, pinCode: "1234" }),
	});
	if (!unlockRes.ok) throw new Error(`Unlock failed: ${await unlockRes.text()}`);
	const unlockData = await unlockRes.json();

	return {
		clinicToken: initData.clinicToken,
		staffToken: unlockData.staffToken,
		ownerUserId: initData.ownerUserId,
	};
}

function injectStorage(context, auth, theme = "light") {
	return context.addInitScript(
		({ ct, st, uid, th }) => {
			localStorage.setItem("dente_clinic_token", ct);
			localStorage.setItem("dente_staff_token", st);
			localStorage.setItem("dente_active_role", "owner");
			localStorage.setItem("dente_user_id", uid);
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_theme", th);
			localStorage.setItem("dente_theme_mode", th);
			localStorage.setItem("theme", th);
			localStorage.setItem(
				"dente_ui_preferences_v1",
				JSON.stringify({ onboardingDismissed: true, onboardingStep: "done", version: 1 })
			);
			localStorage.setItem(
				"dental-crm:onboarding:v1",
				JSON.stringify({ dismissed: true, step: "done", completed: true, onboardingDismissed: true, onboardingStep: "done", version: 1 })
			);
			localStorage.setItem(
				"dental-crm:web-ui-preferences:v1",
				JSON.stringify({ version: 1, uiLanguage: "ru", selectedWorkspaceRole: "owner", onboardingDismissed: true, onboardingStep: "done" })
			);
			localStorage.setItem(
				"dente-workspace-profile",
				JSON.stringify({ mode: "owner", role: "owner", activeRole: "owner" })
			);
		},
		{ ct: auth.clinicToken, st: auth.staffToken, uid: auth.ownerUserId, th: theme }
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
		const style = document.createElement("style");
		style.id = "suppress-all-overlays";
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

async function captureScreen(page, canonicalName, aliases = []) {
	const pConv = path.join(OUT_CONV, canonicalName);
	await page.screenshot({ path: pConv, fullPage: false });

	const targetDirs = [OUT_SANPIN, OUT_SSOT, OUT_STERIL];
	for (const dir of targetDirs) {
		copyFileSync(pConv, path.join(dir, canonicalName));
	}

	for (const alias of aliases) {
		copyFileSync(pConv, path.join(OUT_CONV, alias));
		for (const dir of targetDirs) {
			copyFileSync(pConv, path.join(dir, alias));
		}
	}

	const size = statSync(pConv).size;
	console.log(`[Captured] ${canonicalName} (${size} bytes) -> OK: ${size >= 20000}`);
	if (size < 20000) {
		console.warn(`[WARN] File size is only ${size} bytes!`);
	}
}

async function main() {
	const auth = await provisionSession();
	console.log("[Auth] Done, launching browser...");
	const webUrl = await resolveViteUrl();

	const browser = await chromium.launch({
		headless: true,
		channel: "msedge",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	try {
		// 1. PC Light
		console.log("1. Setting up PC Light context...");
		const ctxLight = await browser.newContext({ viewport: { width: 1440, height: 900 } });
		await injectStorage(ctxLight, auth, "light");
		const pageLight = await ctxLight.newPage();

		console.log("Navigating to #scanner in PC Light...");
		await pageLight.goto(`${webUrl}/#scanner`, { waitUntil: "domcontentloaded", timeout: 30000 });
		await pageLight.waitForSelector(".boot-state", { state: "detached", timeout: 20000 }).catch(() => {});
		await pageLight.waitForTimeout(2000);
		await pageLight.evaluate(() => {
			window.location.hash = "scanner";
			window.dispatchEvent(new HashChangeEvent("hashchange"));
		});
		await pageLight.waitForSelector(".sanpin-container", { timeout: 20000 });
		await preparePage(pageLight, "light");
		await pageLight.waitForTimeout(1000);

		await captureScreen(pageLight, "pc_light_sanpin_sterilization_1440x900.png", [
			"sanpin_pc_light_autoclave.png",
			"sterilization_pc_light.png",
		]);
		await ctxLight.close();

		// 2. PC Dark
		console.log("2. Setting up PC Dark context...");
		const ctxDark = await browser.newContext({ viewport: { width: 1440, height: 900 } });
		await injectStorage(ctxDark, auth, "dark");
		const pageDark = await ctxDark.newPage();

		console.log("Navigating to #scanner in PC Dark...");
		await pageDark.goto(`${webUrl}/#scanner`, { waitUntil: "domcontentloaded", timeout: 30000 });
		await pageDark.waitForSelector(".boot-state", { state: "detached", timeout: 20000 }).catch(() => {});
		await pageDark.waitForTimeout(2000);
		await pageDark.evaluate(() => {
			window.location.hash = "scanner";
			window.dispatchEvent(new HashChangeEvent("hashchange"));
		});
		await pageDark.waitForSelector(".sanpin-container", { timeout: 20000 });
		await preparePage(pageDark, "dark");
		await pageDark.waitForTimeout(1000);

		await captureScreen(pageDark, "pc_dark_sanpin_sterilization_1440x900.png", [
			"sanpin_pc_dark_autoclave.png",
			"sterilization_pc_dark.png",
		]);
		await ctxDark.close();

		// 3. Mobile Light (390x844)
		console.log("3. Setting up Mobile Light context...");
		const ctxMobLight = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
		});
		await injectStorage(ctxMobLight, auth, "light");
		const pageMobLight = await ctxMobLight.newPage();

		console.log("Navigating to #scanner in Mobile Light...");
		await pageMobLight.goto(`${webUrl}/#scanner`, { waitUntil: "domcontentloaded", timeout: 30000 });
		await pageMobLight.waitForSelector(".boot-state", { state: "detached", timeout: 20000 }).catch(() => {});
		await pageMobLight.waitForTimeout(2000);
		await pageMobLight.evaluate(() => {
			window.location.hash = "scanner";
			window.dispatchEvent(new HashChangeEvent("hashchange"));
		});
		await pageMobLight.waitForSelector(".sanpin-container, .sanpin-panel, [data-testid='tab-autoclave-btn']", { timeout: 20000 }).catch(() => {});
		await preparePage(pageMobLight, "light");
		await pageMobLight.waitForTimeout(1000);

		await captureScreen(pageMobLight, "mobile_light_sanpin_sterilization_390x844.png", [
			"sanpin_mobile_light_autoclave.png",
			"sterilization_mobile_light.png",
		]);
		await ctxMobLight.close();

		// 4. Mobile Dark (390x844)
		console.log("4. Setting up Mobile Dark context...");
		const ctxMobDark = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
		});
		await injectStorage(ctxMobDark, auth, "dark");
		const pageMobDark = await ctxMobDark.newPage();

		console.log("Navigating to #scanner in Mobile Dark...");
		await pageMobDark.goto(`${webUrl}/#scanner`, { waitUntil: "domcontentloaded", timeout: 30000 });
		await pageMobDark.waitForSelector(".boot-state", { state: "detached", timeout: 20000 }).catch(() => {});
		await pageMobDark.waitForTimeout(2000);
		await pageMobDark.evaluate(() => {
			window.location.hash = "scanner";
			window.dispatchEvent(new HashChangeEvent("hashchange"));
		});
		await pageMobDark.waitForSelector(".sanpin-container, .sanpin-panel, [data-testid='tab-autoclave-btn']", { timeout: 20000 }).catch(() => {});
		await preparePage(pageMobDark, "dark");
		await pageMobDark.waitForTimeout(1000);

		await captureScreen(pageMobDark, "mobile_dark_sanpin_sterilization_390x844.png", [
			"sanpin_mobile_dark_autoclave.png",
			"sterilization_mobile_dark.png",
		]);
		await ctxMobDark.close();

		console.log("ALL 4 SANPIN SCREENSHOTS CAPTURED PERFECTLY!");
	} finally {
		await browser.close();
	}
}

main().catch(console.error);
