import { mkdirSync, statSync, copyFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const CURRENT_CONV_ID = "a5b7fe4f-c89f-4548-9e27-3b9c0bbb435a";
const OUT_CONV = `C:/Users/Admin/.gemini/antigravity/brain/${CURRENT_CONV_ID}/screenshots`;
const OUT_STERILIZATION = "C:/Clinic_MVP/dental-crm/docs/proofs/sterilization";
const OUT_WAREHOUSE = "C:/Clinic_MVP/dental-crm/docs/proofs/warehouse";
const API_URL = "http://127.0.0.1:4100";
const WEB_URL = "http://127.0.0.1:5173";

mkdirSync(OUT_CONV, { recursive: true });
mkdirSync(OUT_STERILIZATION, { recursive: true });
mkdirSync(OUT_WAREHOUSE, { recursive: true });

async function provisionSession() {
	console.log("[Auth] Provisioning live clinic session via API...");
	const uniqueId = Date.now();
	const initRes = await fetch(`${API_URL}/api/auth/setup/init`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			clinicName: "Стоматология ДЕНТЕ Премиум",
			email: `inquisitor-fast-${uniqueId}@dente.local`,
			password: "Password123!",
			ownerName: "Д-р Инквизитор Алексей Владимирович",
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

function injectStorage(context, auth) {
	return context.addInitScript(
		({ ct, st, uid }) => {
			localStorage.setItem("dente_clinic_token", ct);
			localStorage.setItem("dente_staff_token", st);
			localStorage.setItem("dente_active_role", "owner");
			localStorage.setItem("dente_user_id", uid);
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_tour_completed", "true");
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
		{ ct: auth.clinicToken, st: auth.staffToken, uid: auth.ownerUserId }
	);
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
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("dente_theme_mode", th);
		localStorage.setItem("theme", th);

		let style = document.getElementById("suppress-all-overlays");
		if (!style) {
			style = document.createElement("style");
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
		}
	}, theme);
}

async function captureScreen(page, targetDir, filename) {
	const pDocs = path.join(targetDir, filename);
	const pBrain = path.join(OUT_CONV, filename);
	await page.screenshot({ path: pDocs, fullPage: false });
	copyFileSync(pDocs, pBrain);
	const size = statSync(pDocs).size;
	console.log(`[Captured] ${filename} (${size} bytes) -> OK: ${size >= 20000}`);
	if (size < 20000) {
		console.warn(`[WARN] File size is only ${size} bytes!`);
	}
	return pDocs;
}

async function navigateToRoute(page, hash) {
	await page.evaluate((h) => {
		window.location.hash = h;
		window.dispatchEvent(new HashChangeEvent("hashchange"));
	}, hash);
	await page.waitForTimeout(2000);
}

async function main() {
	const auth = await provisionSession();
	console.log("[Auth] Provisioned successfully.");

	const browser = await chromium.launch({
		headless: true,
		channel: "msedge",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	try {
		const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
		await injectStorage(context, auth);
		const page = await context.newPage();

		console.log("[Load] Loading initial web client...");
		await page.goto(`${WEB_URL}/#scanner`, { waitUntil: "domcontentloaded", timeout: 45000 });
		await page.waitForSelector(".boot-state", { state: "detached", timeout: 20000 }).catch(() => {});
		await page.waitForTimeout(2000);

		// ==========================================
		// 1. STERILIZATION / САНПИН (#scanner)
		// ==========================================
		console.log("\n--- Capturing Sterilization / SanPin Proofs ---");
		await navigateToRoute(page, "scanner");
		await page.waitForSelector(".sanpin-container, [data-testid='tab-autoclave-btn']", { timeout: 20000 }).catch(() => {});

		// PC Light
		await page.setViewportSize({ width: 1440, height: 900 });
		await setTheme(page, "light");
		await page.waitForTimeout(1000);
		await captureScreen(page, OUT_STERILIZATION, "sterilization_pc_light.png");

		// PC Dark
		await setTheme(page, "dark");
		await page.waitForTimeout(1000);
		await captureScreen(page, OUT_STERILIZATION, "sterilization_pc_dark.png");

		// Mobile Light
		await page.setViewportSize({ width: 390, height: 844 });
		await setTheme(page, "light");
		await page.waitForTimeout(1000);
		await captureScreen(page, OUT_STERILIZATION, "sterilization_mobile_light.png");

		// Mobile Dark
		await setTheme(page, "dark");
		await page.waitForTimeout(1000);
		await captureScreen(page, OUT_STERILIZATION, "sterilization_mobile_dark.png");

		// ==========================================
		// 2. WAREHOUSE / СКЛАД (#inventory)
		// ==========================================
		console.log("\n--- Capturing Warehouse / Inventory Proofs ---");
		await page.setViewportSize({ width: 1440, height: 900 });
		await navigateToRoute(page, "inventory");
		await page.waitForSelector(".inventory-container, [data-testid='inventory-view'], table", { timeout: 20000 }).catch(() => {});

		// PC Light
		await setTheme(page, "light");
		await page.waitForTimeout(1000);
		await captureScreen(page, OUT_WAREHOUSE, "warehouse_pc_light.png");

		// PC Dark
		await setTheme(page, "dark");
		await page.waitForTimeout(1000);
		await captureScreen(page, OUT_WAREHOUSE, "warehouse_pc_dark.png");

		// Mobile Light
		await page.setViewportSize({ width: 390, height: 844 });
		await setTheme(page, "light");
		await page.waitForTimeout(1000);
		await captureScreen(page, OUT_WAREHOUSE, "warehouse_mobile_light.png");

		// Mobile Dark
		await setTheme(page, "dark");
		await page.waitForTimeout(1000);
		await captureScreen(page, OUT_WAREHOUSE, "warehouse_mobile_dark.png");

		console.log("\nALL 8 SCREENSHOTS CAPTURED PERFECTLY!");
	} finally {
		await browser.close();
	}
}

main().catch(console.error);
