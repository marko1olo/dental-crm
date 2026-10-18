import { mkdirSync, statSync, copyFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const CURRENT_CONV_ID = "7ad7fea5-17cc-471c-9798-2e7d727e89a5";
const OUT_CONV = `C:/Users/Admin/.gemini/antigravity/brain/${CURRENT_CONV_ID}/screenshots`;
const OUT_DOCS = "C:/Clinic_MVP/dental-crm/docs/proofs/sterilization";
const API_URL = "http://127.0.0.1:4100";
const WEB_URL = "http://127.0.0.1:5173";

mkdirSync(OUT_CONV, { recursive: true });
mkdirSync(OUT_DOCS, { recursive: true });

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
			localStorage.setItem("dente_tour_dismissed", "true");
			localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
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
		document.querySelectorAll(
			'.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container, [role="alert"], .shepherd-element'
		).forEach((el) => el.remove());
	}, theme);
}

async function captureScreen(page, filename) {
	const p1 = path.join(OUT_CONV, filename);
	const p2 = path.join(OUT_DOCS, filename);
	await page.screenshot({ path: p1, fullPage: false });
	copyFileSync(p1, p2);
	const size = statSync(p1).size;
	console.log(`[Captured] ${filename} (${size} bytes) -> OK: ${size >= 20000}`);
}

async function main() {
	const auth = await provisionSession();
	console.log("[Auth] Provisioned clinic session.");

	const browser = await chromium.launch({
		headless: true,
		channel: "msedge",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	try {
		// Mobile Light (390x844)
		console.log("Capturing Mobile Light (390x844)...");
		const ctxMobLight = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
		});
		await injectStorage(ctxMobLight, auth, "light");
		const pageMobLight = await ctxMobLight.newPage();
		await pageMobLight.goto(`${WEB_URL}/#scanner`, { waitUntil: "domcontentloaded", timeout: 30000 });
		await pageMobLight.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});
		await pageMobLight.waitForTimeout(3000);
		await pageMobLight.evaluate(() => {
			window.location.hash = "scanner";
			window.dispatchEvent(new HashChangeEvent("hashchange"));
		});
		await pageMobLight.waitForSelector(".sanpin-container, [data-testid='tab-autoclave-btn']", { timeout: 25000 });
		await preparePage(pageMobLight, "light");

		await pageMobLight.evaluate(() => {
			const btn = document.querySelector("[data-testid='tab-disinfection-btn']");
			if (btn) btn.click();
		});
		await pageMobLight.waitForTimeout(2000);
		await captureScreen(pageMobLight, "cabinet_readiness_mobile_light.png");
		await ctxMobLight.close();

		// Mobile Dark (390x844)
		console.log("Capturing Mobile Dark (390x844)...");
		const ctxMobDark = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
		});
		await injectStorage(ctxMobDark, auth, "dark");
		const pageMobDark = await ctxMobDark.newPage();
		await pageMobDark.goto(`${WEB_URL}/#scanner`, { waitUntil: "domcontentloaded", timeout: 30000 });
		await pageMobDark.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});
		await pageMobDark.waitForTimeout(3000);
		await pageMobDark.evaluate(() => {
			window.location.hash = "scanner";
			window.dispatchEvent(new HashChangeEvent("hashchange"));
		});
		await pageMobDark.waitForSelector(".sanpin-container, [data-testid='tab-autoclave-btn']", { timeout: 25000 });
		await preparePage(pageMobDark, "dark");

		await pageMobDark.evaluate(() => {
			const btn = document.querySelector("[data-testid='tab-disinfection-btn']");
			if (btn) btn.click();
		});
		await pageMobDark.waitForTimeout(2000);
		await captureScreen(pageMobDark, "cabinet_readiness_mobile_dark.png");
		await ctxMobDark.close();

		console.log("Mobile captures complete!");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("[FATAL]", err);
	process.exit(1);
});
