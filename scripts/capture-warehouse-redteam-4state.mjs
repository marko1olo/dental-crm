import fs, { existsSync, mkdirSync, statSync, copyFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const PROOFS_DIR = path.join(process.cwd(), "docs/proofs/warehouse");
const CONV_DIR = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\39a81ca1-7b90-4863-a049-8b39ec65d7c7";

if (!existsSync(PROOFS_DIR)) mkdirSync(PROOFS_DIR, { recursive: true });
if (!existsSync(CONV_DIR)) mkdirSync(CONV_DIR, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

console.log("[AUTH] Logging in via real Fastify API on http://127.0.0.1:4100/api/auth/login...");
const loginRes = await fetch("http://127.0.0.1:4100/api/auth/login", {
	method: "POST",
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify({ email: "clinic@example.com", password: "dente2026" }),
});
const auth = await loginRes.json();
console.log(`[AUTH] Authenticated user: ${auth?.user?.fullName}, role: ${auth?.user?.role}`);

async function suppressOverlays(page) {
	try {
		await page.evaluate(() => {
			const style = document.createElement("style");
			style.id = "suppress-all-tour-overlays";
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
			document.querySelectorAll(".tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay']").forEach((el) => el.remove());
		});
	} catch (_) {}
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
			localStorage.setItem("dente_theme_mode", th);
			localStorage.setItem("theme", th);
		} catch (_) {}
	}, theme);
	await sleep(600);
}

async function main() {
	console.log("=== Launching Chrome Playwright for Warehouse 4-State Proofs ===");

	const possibleBrowserPaths = [
		"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
		"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	];
	const browserPath = possibleBrowserPaths.find((p) => existsSync(p));

	const launchOptions = {
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	};
	if (browserPath) launchOptions.executablePath = browserPath;

	const browser = await chromium.launch(launchOptions);
	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 1,
	});

	await context.addCookies([
		{ name: "dente_clinic_token", value: auth.clinicToken, domain: "127.0.0.1", path: "/" },
		{ name: "dente_staff_token", value: auth.staffToken, domain: "127.0.0.1", path: "/" },
	]);

	const page = await context.newPage();
	await page.addInitScript(({ cTok, sTok, uid, fn, orgId }) => {
		try {
			localStorage.setItem("dente_clinic_token", cTok);
			localStorage.setItem("dente_staff_token", sTok);
			localStorage.setItem("dente_active_session_token", sTok);
			localStorage.setItem("dente_organization_id", orgId || "01a00000-0000-0000-0000-000000000000");
			localStorage.setItem("dente_user_id", uid);
			localStorage.setItem("dente_user_name", fn);
			localStorage.setItem("dente_user_role", "doctor");
			localStorage.setItem("dente_role", "doctor");
			localStorage.setItem("dente_perspective", "doctor");
			localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_tour_dismissed", "true");
			localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
			localStorage.setItem("dente_demo_banner_dismissed", "true");
			localStorage.setItem(
				"dente-workspace-profile",
				JSON.stringify({ mode: "clinic", role: "doctor", activeRole: "doctor" })
			);
			localStorage.setItem(
				"dental-crm:web-ui-preferences:v1",
				JSON.stringify({
					version: 1,
					uiLanguage: "ru",
					selectedWorkspaceRole: "doctor",
					selectedSpecialty: "therapist",
					onboardingDismissed: true,
				})
			);
		} catch (_) {}
	}, {
		cTok: auth.clinicToken,
		sTok: auth.staffToken,
		uid: auth.user.id,
		fn: auth.user.fullName,
		orgId: auth.user.organizationId,
	});

	console.log("Navigating to http://127.0.0.1:5173/#inventory ...");
	await page.goto("http://127.0.0.1:5173/#inventory", { waitUntil: "domcontentloaded", timeout: 45000 });
	await sleep(4000);

	// Ensure view is inventory
	await page.evaluate(() => {
		window.location.hash = "#inventory";
		window.dispatchEvent(new HashChangeEvent("hashchange"));
	});
	await sleep(2500);

	const bodyText = await page.evaluate(() => document.body.innerText);
	console.log(`Page mounted, length ${bodyText.length}, has 'Склад': ${bodyText.includes("Склад")}`);

	await suppressOverlays(page);
	await sleep(1000);

	// 1. 01_warehouse_stock_pc_light_1440x900.png
	console.log("[Capturing] 01_warehouse_stock_pc_light_1440x900.png...");
	await setTheme(page, "light");
	await suppressOverlays(page);
	await sleep(1000);

	const pcLightPath = path.join(PROOFS_DIR, "01_warehouse_stock_pc_light_1440x900.png");
	await page.screenshot({ path: pcLightPath, fullPage: false });
	copyFileSync(pcLightPath, path.join(CONV_DIR, "01_warehouse_stock_pc_light_1440x900.png"));
	console.log(`[OK] Saved 01_warehouse_stock_pc_light_1440x900.png (${Math.round(statSync(pcLightPath).size / 1024)} KB)`);

	// 2. 02_warehouse_stock_pc_dark_1440x900.png
	console.log("[Capturing] 02_warehouse_stock_pc_dark_1440x900.png...");
	await setTheme(page, "dark");
	await suppressOverlays(page);
	await sleep(1000);

	const pcDarkPath = path.join(PROOFS_DIR, "02_warehouse_stock_pc_dark_1440x900.png");
	await page.screenshot({ path: pcDarkPath, fullPage: false });
	copyFileSync(pcDarkPath, path.join(CONV_DIR, "02_warehouse_stock_pc_dark_1440x900.png"));
	console.log(`[OK] Saved 02_warehouse_stock_pc_dark_1440x900.png (${Math.round(statSync(pcDarkPath).size / 1024)} KB)`);

	// 3. SWITCH TO MOBILE VIEWPORT (390x844)
	console.log("\n[Switching Viewport to Mobile 390x844]...");
	await page.setViewportSize({ width: 390, height: 844 });
	await sleep(2500);

	const hasMobile = await page.evaluate(() => Boolean(document.querySelector(".mobile-inventory-container, [data-testid='mobile-inventory-bottom-bar']")));
	console.log(`Mobile view detected: ${hasMobile}`);
	await suppressOverlays(page);
	await sleep(1000);

	// 4. 04_warehouse_mobile_dark_390x844.png
	console.log("[Capturing] 04_warehouse_mobile_dark_390x844.png...");
	await setTheme(page, "dark");
	await suppressOverlays(page);
	await sleep(1000);

	const mobileDarkPath = path.join(PROOFS_DIR, "04_warehouse_mobile_dark_390x844.png");
	const mobileDarkStockPath = path.join(PROOFS_DIR, "04_warehouse_stock_mobile_dark_390x844.png");
	await page.screenshot({ path: mobileDarkPath, fullPage: false });
	copyFileSync(mobileDarkPath, mobileDarkStockPath);
	copyFileSync(mobileDarkPath, path.join(CONV_DIR, "04_warehouse_mobile_dark_390x844.png"));
	console.log(`[OK] Saved 04_warehouse_mobile_dark_390x844.png (${Math.round(statSync(mobileDarkPath).size / 1024)} KB)`);

	// 5. 03_warehouse_mobile_light_390x844.png
	console.log("[Capturing] 03_warehouse_mobile_light_390x844.png...");
	await setTheme(page, "light");
	await suppressOverlays(page);
	await sleep(1000);

	const mobileLightPath = path.join(PROOFS_DIR, "03_warehouse_mobile_light_390x844.png");
	const mobileLightStockPath = path.join(PROOFS_DIR, "03_warehouse_stock_mobile_light_390x844.png");
	await page.screenshot({ path: mobileLightPath, fullPage: false });
	copyFileSync(mobileLightPath, mobileLightStockPath);
	copyFileSync(mobileLightPath, path.join(CONV_DIR, "03_warehouse_mobile_light_390x844.png"));
	console.log(`[OK] Saved 03_warehouse_mobile_light_390x844.png (${Math.round(statSync(mobileLightPath).size / 1024)} KB)`);

	await browser.close();
	console.log("\n=== ALL 4 WAREHOUSE PROOFS CAPTURED SUCCESSFULLY ===");
}

main().catch((err) => {
	console.error("[FATAL ERROR]:", err);
	process.exit(1);
});
