import { existsSync, mkdirSync, statSync, copyFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const CALLER_ID = "8d148d14-84d7-401e-badd-c6ea47afd7f6";
const SELF_ID = "12880b53-2eba-4b15-a3bb-a7491441f623";

const OUT_DIRS = [
	path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/family_wallet"),
	path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${CALLER_ID}`),
	path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${SELF_ID}`),
];

OUT_DIRS.forEach((d) => {
	if (!existsSync(d)) mkdirSync(d, { recursive: true });
});

const TARGET_URL = "http://127.0.0.1:5173/?demo=true&patient_modal=1#patient-card";

const browserExecutable = [
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].find((p) => existsSync(p));

console.log("[Browser] Using executable:", browserExecutable);

const browser = await chromium.launch({
	executablePath: browserExecutable,
	headless: true,
	args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
});

async function injectAuth(context, theme = "light") {
	await context.addInitScript(
		({ th }) => {
			localStorage.setItem("dente_clinic_token", "demo-showcase-token-owner");
			localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-owner");
			localStorage.setItem("dente_active_session_token", "demo-showcase-staff-token-owner");
			localStorage.setItem("dente_active_role", "owner");
			localStorage.setItem("dente_user_role", "owner");
			localStorage.setItem("dente_role", "owner");
			localStorage.setItem("dente_active_user_id", "01a00000-0000-0000-0003-000000000001");
			localStorage.setItem("dente_theme", th);
			localStorage.setItem("dente_theme_mode", th);
			localStorage.setItem("theme", th);
			localStorage.setItem("dente_demo_showcase", "true");
			localStorage.setItem("dente_demo_mode", "true");
			sessionStorage.setItem("dente_unlocked", "true");
			localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true, step: "done" }));
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_tour_dismissed", "true");
			localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
			localStorage.setItem("dente_demo_banner_dismissed", "true");
			localStorage.setItem("dental-crm:active-user:v1", JSON.stringify({ id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" }));
		},
		{ th: theme },
	);
}

async function cleanOverlays(page, theme = "light") {
	await page.evaluate((th) => {
		document.documentElement.setAttribute("data-theme", th);
		document.body.setAttribute("data-theme", th);
		if (th === "dark") {
			document.documentElement.classList.add("dark");
			document.documentElement.classList.remove("light");
			document.body.className = "dark";
		} else {
			document.documentElement.classList.add("light");
			document.documentElement.classList.remove("dark");
			document.body.className = "light";
		}
		document.documentElement.style.colorScheme = th;
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("dente_theme_mode", th);
		localStorage.setItem("theme", th);
		window.dispatchEvent(new Event("themechange"));

		let style = document.getElementById("suppress-all-overlays");
		if (!style) {
			style = document.createElement("style");
			style.id = "suppress-all-overlays";
			document.head.appendChild(style);
		}
		style.innerHTML = `
			.tour-spotlight-root,
			.tour-backdrop-clickable-zone,
			[data-testid="guided-tour-spotlight-overlay"],
			[data-testid="guided-tour-coach-mark-card"],
			[data-testid="demo-mode-banner"],
			.shepherd-element,
			.boot-state,
			#boot-screen,
			vite-error-overlay {
				display: none !important;
				pointer-events: none !important;
			}
		`;
		document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container').forEach((el) => el.remove());
	}, theme);
	await page.waitForTimeout(400);
}

async function saveProof(page, filename, description) {
	await page.waitForTimeout(400);
	const targetPath = path.join(OUT_DIRS[0], filename);
	await page.screenshot({ path: targetPath, fullPage: false });
	const sz = statSync(targetPath).size;
	console.log(`[PROOF CAPTURED] ${filename} (${sz} bytes) -> ${description} [>=20KB: ${sz >= 20480}]`);
	if (sz < 20480) {
		throw new Error(`Screenshot ${filename} is smaller than 20KB: ${sz} bytes`);
	}
	for (let i = 1; i < OUT_DIRS.length; i++) {
		try {
			copyFileSync(targetPath, path.join(OUT_DIRS[i], filename));
		} catch (_) {}
	}
}

async function ensureServerReady() {
	for (let i = 0; i < 20; i++) {
		try {
			const res = await fetch("http://127.0.0.1:5173/");
			if (res.ok) {
				console.log("[Server Ready] Port 5173 is responding 200 OK");
				return true;
			}
		} catch (_) {}
		await new Promise((r) => setTimeout(r, 1000));
	}
	return false;
}

async function main() {
	console.log("=== CAPTURING CANONICAL 4-STATE PROOFS FOR FAMILY WALLET & FNS TAX CERTS ===");
	await ensureServerReady();

	try {
		// ═══════════════════════════════════════════════════════════
		// 1. PC 1440x900 DESKTOP VIEWPORT
		// ═══════════════════════════════════════════════════════════
		console.log("\n--- [PC 1440x900 Desktop Viewport] ---");
		const pcCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
		await injectAuth(pcCtx, "light");
		const pcPage = await pcCtx.newPage();

		console.log(`[PC] Navigating to ${TARGET_URL}...`);
		await pcPage.goto(TARGET_URL, { waitUntil: "commit", timeout: 35000 });
		await pcPage.waitForTimeout(3000);

		const offlineBtn = await pcPage.$('.boot-offline-action-button, button:has-text("Перейти в автономный режим")');
		if (offlineBtn) {
			console.log("[PC] Clicking offline action button...");
			await offlineBtn.click();
			await pcPage.waitForTimeout(1500);
		}

		await pcPage.waitForSelector(
			"[data-testid='patient-card-modal'], [data-testid='patient-studio-modal'], [data-testid='patient-card-standalone-root']",
			{ state: "attached", timeout: 30000 },
		);
		console.log("[PC] Patient card modal attached!");

		// Click Family tab
		console.log("[PC] Opening Family Tab...");
		const familyTab = pcPage.locator("button:has-text('Семья'), [data-tab='family']").first();
		await familyTab.click();
		await pcPage.waitForTimeout(1200);

		// Click Open Family Wallet modal
		console.log("[PC] Opening Family Wallet Modal...");
		const openWalletBtn = pcPage.locator(
			"[data-testid='widget-open-family-wallet-btn'], button:has-text('Семейный счет'), button:has-text('Управление балансом')",
		).first();
		await openWalletBtn.click();
		await pcPage.waitForTimeout(1200);

		await pcPage.waitForSelector("[data-testid='family-wallet-modal']", { state: "visible", timeout: 15000 });
		console.log("[PC] Family Wallet Modal is visible!");

		// 1.1 PC Light Overview
		await cleanOverlays(pcPage, "light");
		await saveProof(pcPage, "01_family_wallet_pc_light_1440x900.png", "Family Wallet Overview (PC Light 1440x900)");

		// 1.2 PC Dark Overview
		await cleanOverlays(pcPage, "dark");
		await saveProof(pcPage, "02_family_wallet_pc_dark_1440x900.png", "Family Wallet Overview (PC Dark 1440x900)");

		// 1.3 PC FNS Tax Tab Light
		console.log("[PC] Switching to FNS Tax Certificates Tab...");
		await pcPage.click("[data-testid='tab-family-wallet-tax']");
		await pcPage.waitForTimeout(1000);
		await cleanOverlays(pcPage, "light");
		await saveProof(pcPage, "05_family_tax_certs_pc_light_1440x900.png", "Family FNS Tax Certificates (PC Light 1440x900)");

		// 1.4 PC FNS Tax Tab Dark
		await cleanOverlays(pcPage, "dark");
		await saveProof(pcPage, "06_family_tax_certs_pc_dark_1440x900.png", "Family FNS Tax Certificates (PC Dark 1440x900)");

		await pcCtx.close();

		// ═══════════════════════════════════════════════════════════
		// 2. MOBILE 390x844 APPLE HIG BOTTOM SHEET
		// ═══════════════════════════════════════════════════════════
		console.log("\n--- [Mobile 390x844 Apple HIG Viewport] ---");
		const mobileCtx = await browser.newContext({
			viewport: { width: 390, height: 844 },
			userAgent:
				"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
			isMobile: true,
			hasTouch: true,
			deviceScaleFactor: 2,
		});
		await injectAuth(mobileCtx, "light");
		const mobilePage = await mobileCtx.newPage();

		console.log(`[Mobile] Navigating to ${TARGET_URL}...`);
		await mobilePage.goto(TARGET_URL, { waitUntil: "commit", timeout: 35000 });
		await mobilePage.waitForTimeout(3000);

		const mobileOfflineBtn = await mobilePage.$('.boot-offline-action-button, button:has-text("Перейти в автономный режим")');
		if (mobileOfflineBtn) {
			console.log("[Mobile] Clicking offline action button...");
			await mobileOfflineBtn.click();
			await mobilePage.waitForTimeout(1500);
		}

		await mobilePage.waitForSelector(
			"[data-testid='patient-card-modal'], [data-testid='patient-studio-modal'], [data-testid='patient-card-standalone-root']",
			{ state: "attached", timeout: 30000 },
		);
		console.log("[Mobile] Patient card modal attached!");

		// Click Family tab
		console.log("[Mobile] Opening Family Tab...");
		const mobileFamilyTab = mobilePage.locator("button:has-text('Семья'), [data-tab='family']").first();
		await mobileFamilyTab.click();
		await mobilePage.waitForTimeout(1200);

		// Click Open Family Wallet modal
		console.log("[Mobile] Opening Family Wallet Bottom Sheet...");
		const mobileOpenWalletBtn = mobilePage.locator(
			"[data-testid='widget-open-family-wallet-btn'], button:has-text('Семейный счет'), button:has-text('Управление балансом')",
		).first();
		await mobileOpenWalletBtn.click();
		await mobilePage.waitForTimeout(1200);

		await mobilePage.waitForSelector("[data-testid='family-wallet-modal']", { state: "visible", timeout: 15000 });
		console.log("[Mobile] Family Wallet Bottom Sheet is visible!");

		// 2.1 Mobile Light Overview
		await cleanOverlays(mobilePage, "light");
		await saveProof(mobilePage, "03_family_wallet_mobile_light_390x844.png", "Family Wallet Bottom Sheet (Mobile Light 390x844)");

		// 2.2 Mobile Dark Overview
		await cleanOverlays(mobilePage, "dark");
		await saveProof(mobilePage, "04_family_wallet_mobile_dark_390x844.png", "Family Wallet Bottom Sheet (Mobile Dark 390x844)");

		// 2.3 Mobile FNS Tax Tab Light
		console.log("[Mobile] Switching to FNS Tax Certificates Tab...");
		await mobilePage.click("[data-testid='tab-family-wallet-tax']");
		await mobilePage.waitForTimeout(1000);
		await cleanOverlays(mobilePage, "light");
		await saveProof(mobilePage, "07_family_tax_certs_mobile_light_390x844.png", "Family FNS Tax Certificates Bottom Sheet (Mobile Light 390x844)");

		// 2.4 Mobile FNS Tax Tab Dark
		await cleanOverlays(mobilePage, "dark");
		await saveProof(mobilePage, "08_family_tax_certs_mobile_dark_390x844.png", "Family FNS Tax Certificates Bottom Sheet (Mobile Dark 390x844)");

		await mobileCtx.close();

		console.log("\n═══════════════════════════════════════════════════════════════");
		console.log("🎉 ALL 8 CANONICAL PROOFS FOR FAMILY WALLET & FNS CAPTURED!");
		console.log("═══════════════════════════════════════════════════════════════");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("[FATAL ERROR]:", err);
	process.exit(1);
});
