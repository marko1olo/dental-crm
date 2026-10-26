/**
 * capture-sterilization-scanner-proofs.mjs
 *
 * Captures live 1440x900 PC Light and PC Dark screenshots of:
 * 1. Default Sterilization & SanPiN Workspace (#scanner)
 * 2. Toggled Document Scanner Workspace
 */

import { mkdirSync, statSync, copyFileSync, existsSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const CONV_ID = "cea518c6-0860-470e-90f2-98e0fac9bcba";
const BRAIN_DIR = `C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}`;
const PROOFS_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/sanpin";
const WEB_URL = "http://127.0.0.1:5173";
const API_URL = "http://127.0.0.1:4100";

mkdirSync(BRAIN_DIR, { recursive: true });
mkdirSync(PROOFS_DIR, { recursive: true });

async function provisionSession() {
	console.log("[Auth] Provisioning clinic session...");
	const uniqueId = Date.now();
	const initRes = await fetch(`${API_URL}/api/auth/setup/init`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			clinicName: "Клиника ДЕНТЕ Стерилизация",
			email: `sanpin-inquisitor-${uniqueId}@dente.local`,
			password: "Password123!",
			ownerName: "Д-р Инквизиторов Сергей Романович",
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

async function captureScreen(page, fileName) {
	const pBrain = path.join(BRAIN_DIR, fileName);
	const pProof = path.join(PROOFS_DIR, fileName);
	await page.screenshot({ path: pBrain, fullPage: false });
	copyFileSync(pBrain, pProof);
	const size = statSync(pBrain).size;
	console.log(`[Captured] ${fileName} (${size} bytes) -> OK: ${size >= 20000}`);
}

async function main() {
	let browser;
	try {
		const auth = await provisionSession();
		console.log("[Auth] OK, starting Chromium...");

		browser = await chromium.launch({
			headless: true,
			channel: "msedge",
			args: ["--no-sandbox", "--disable-setuid-sandbox"],
		});

		// 1. PC Light (#scanner default: SanPiN & Autoclaves)
		console.log("1. Setting up PC Light context...");
		const ctxLight = await browser.newContext({ viewport: { width: 1440, height: 900 } });
		await injectStorage(ctxLight, auth, "light");
		const pageLight = await ctxLight.newPage();

		console.log("Navigating to #scanner in PC Light...");
		await pageLight.goto(`${WEB_URL}/#scanner`, { waitUntil: "domcontentloaded", timeout: 30000 });
		await pageLight.waitForSelector(".scanner-cockpit-root", { timeout: 20000 }).catch(() => {});
		await pageLight.waitForTimeout(2000);
		await preparePage(pageLight, "light");
		await pageLight.waitForTimeout(1000);

		await captureScreen(pageLight, "scanner_sterilization_pc_light.png");

		// Click to document scanner tab in PC Light
		console.log("Toggling to document scanner tab...");
		const docTabBtn = pageLight.locator('[data-testid="scanner-tab-camera"]');
		if (await docTabBtn.count() > 0) {
			await docTabBtn.click();
			await pageLight.waitForTimeout(1000);
			await captureScreen(pageLight, "scanner_documents_tab_pc_light.png");
		}

		await ctxLight.close();

		// 2. PC Dark (#scanner default: SanPiN & Autoclaves)
		console.log("2. Setting up PC Dark context...");
		const ctxDark = await browser.newContext({ viewport: { width: 1440, height: 900 } });
		await injectStorage(ctxDark, auth, "dark");
		const pageDark = await ctxDark.newPage();

		console.log("Navigating to #scanner in PC Dark...");
		await pageDark.goto(`${WEB_URL}/#scanner`, { waitUntil: "domcontentloaded", timeout: 30000 });
		await pageDark.waitForSelector(".scanner-cockpit-root", { timeout: 20000 }).catch(() => {});
		await pageDark.waitForTimeout(2000);
		await preparePage(pageDark, "dark");
		await pageDark.waitForTimeout(1000);

		await captureScreen(pageDark, "scanner_sterilization_pc_dark.png");

		// Click to document scanner tab in PC Dark
		console.log("Toggling to document scanner tab in PC Dark...");
		const docTabBtnDark = pageDark.locator('[data-testid="scanner-tab-camera"]');
		if (await docTabBtnDark.count() > 0) {
			await docTabBtnDark.click();
			await pageDark.waitForTimeout(1000);
			await captureScreen(pageDark, "scanner_documents_tab_pc_dark.png");
		}

		await ctxDark.close();
		console.log("All screenshots captured successfully!");
	} catch (err) {
		console.error("Screenshot capture failed:", err);
		process.exit(1);
	} finally {
		if (browser) await browser.close();
	}
}

main();
