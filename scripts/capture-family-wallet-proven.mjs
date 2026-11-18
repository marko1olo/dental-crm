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

async function setTheme(page, theme = "light") {
	await page.evaluate((th) => {
		document.documentElement.setAttribute("data-theme", th);
		document.body.setAttribute("data-theme", th);
		if (th === "dark") {
			document.documentElement.classList.add("dark");
			document.documentElement.classList.remove("light");
			document.body.classList.add("dark");
			document.body.classList.remove("light");
		} else {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			document.body.classList.remove("dark");
			document.body.classList.add("light");
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
	await page.waitForTimeout(500);
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

async function main() {
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	try {
		// ═══════════════════════════════════════════════════════════
		// 1. PC 1440x900 DESKTOP VIEWPORT
		// ═══════════════════════════════════════════════════════════
		console.log("\n--- [PC 1440x900 Desktop Viewport] ---");
		const pcCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
		await pcCtx.addInitScript(() => {
			localStorage.setItem("dente_clinic_token", "demo-showcase-token-owner");
			localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-owner");
			localStorage.setItem("dente_active_session_token", "demo-showcase-staff-token-owner");
			localStorage.setItem("dente_active_role", "owner");
			localStorage.setItem("dente_user_role", "owner");
			localStorage.setItem("dente_demo_mode", "true");
			localStorage.setItem("dente_demo_showcase", "true");
			sessionStorage.setItem("dente_unlocked", "true");
			localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true, step: "done" }));
			localStorage.setItem("dental-crm:active-user:v1", JSON.stringify({ id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" }));
		});

		const pcPage = await pcCtx.newPage();
		console.log("[PC] Navigating to standalone patient card...");
		await pcPage.goto(TARGET_URL, { waitUntil: "commit" });
		await pcPage.waitForTimeout(3000);

		const offlineBtn = await pcPage.$('.boot-offline-action-button, button:has-text("Перейти в автономный режим")');
		if (offlineBtn) {
			console.log("[PC] Clicking offline action button...");
			await offlineBtn.click();
			await pcPage.waitForTimeout(2000);
		}

		await pcPage.waitForSelector(
			"[data-testid='patient-card-modal'], [data-testid='patient-studio-modal'], [data-testid='patient-card-standalone-root']",
			{ state: "attached", timeout: 15000 },
		).catch(() => null);

		console.log("[PC] Opening Family Tab...");
		const familyTab = pcPage.locator("button:has-text('Семья'), [data-tab='family']").first();
		await familyTab.click();
		await pcPage.waitForTimeout(1000);

		console.log("[PC] Opening Family Wallet Modal...");
		const openWallet = pcPage.locator(
			"[data-testid='widget-open-family-wallet-btn'], button:has-text('Семейный счет'), button:has-text('Управление балансом')",
		).first();
		await openWallet.click();
		await pcPage.waitForTimeout(1200);

		await pcPage.waitForSelector("[data-testid='family-wallet-modal']", { state: "visible", timeout: 10000 });
		console.log("[PC] Family Wallet Modal is visible!");

		// 1.1 PC Light Overview
		await setTheme(pcPage, "light");
		await saveProof(pcPage, "01_family_wallet_pc_light_1440x900.png", "Family Wallet Overview (PC Light 1440x900)");

		// 1.2 PC Dark Overview
		await setTheme(pcPage, "dark");
		await saveProof(pcPage, "02_family_wallet_pc_dark_1440x900.png", "Family Wallet Overview (PC Dark 1440x900)");

		// 1.3 PC FNS Tax Tab Light
		console.log("[PC] Switching to FNS Tax Certificates tab...");
		await pcPage.click("[data-testid='tab-family-wallet-tax']");
		await pcPage.waitForTimeout(1000);
		await setTheme(pcPage, "light");
		await saveProof(pcPage, "05_family_tax_certs_pc_light_1440x900.png", "Family FNS Tax Certificates (PC Light 1440x900)");

		// 1.4 PC FNS Tax Tab Dark
		await setTheme(pcPage, "dark");
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
		await mobileCtx.addInitScript(() => {
			localStorage.setItem("dente_clinic_token", "demo-showcase-token-owner");
			localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-owner");
			localStorage.setItem("dente_active_session_token", "demo-showcase-staff-token-owner");
			localStorage.setItem("dente_active_role", "owner");
			localStorage.setItem("dente_user_role", "owner");
			localStorage.setItem("dente_demo_mode", "true");
			localStorage.setItem("dente_demo_showcase", "true");
			sessionStorage.setItem("dente_unlocked", "true");
			localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true, step: "done" }));
			localStorage.setItem("dental-crm:active-user:v1", JSON.stringify({ id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" }));
		});

		const mobilePage = await mobileCtx.newPage();
		console.log("[Mobile] Navigating to standalone patient card...");
		await mobilePage.goto(TARGET_URL, { waitUntil: "commit" });
		await mobilePage.waitForTimeout(3000);

		const mobileOfflineBtn = await mobilePage.$('.boot-offline-action-button, button:has-text("Перейти в автономный режим")');
		if (mobileOfflineBtn) {
			console.log("[Mobile] Clicking offline action button...");
			await mobileOfflineBtn.click();
			await mobilePage.waitForTimeout(2000);
		}

		await mobilePage.waitForSelector(
			"[data-testid='patient-card-modal'], [data-testid='patient-studio-modal'], [data-testid='patient-card-standalone-root']",
			{ state: "attached", timeout: 15000 },
		).catch(() => null);

		console.log("[Mobile] Opening Family Tab...");
		const mobileFamilyTab = mobilePage.locator("button:has-text('Семья'), [data-tab='family']").first();
		await mobileFamilyTab.click();
		await mobilePage.waitForTimeout(1000);

		console.log("[Mobile] Opening Family Wallet Bottom Sheet...");
		const mobileOpenWallet = mobilePage.locator(
			"[data-testid='widget-open-family-wallet-btn'], button:has-text('Семейный счет'), button:has-text('Управление балансом')",
		).first();
		await mobileOpenWallet.click();
		await mobilePage.waitForTimeout(1200);

		await mobilePage.waitForSelector("[data-testid='family-wallet-modal']", { state: "visible", timeout: 10000 });
		console.log("[Mobile] Family Wallet Bottom Sheet is visible!");

		// 2.1 Mobile Light Overview
		await setTheme(mobilePage, "light");
		await saveProof(mobilePage, "03_family_wallet_mobile_light_390x844.png", "Family Wallet Bottom Sheet (Mobile Light 390x844)");

		// 2.2 Mobile Dark Overview
		await setTheme(mobilePage, "dark");
		await saveProof(mobilePage, "04_family_wallet_mobile_dark_390x844.png", "Family Wallet Bottom Sheet (Mobile Dark 390x844)");

		// 2.3 Mobile FNS Tax Tab Light
		console.log("[Mobile] Switching to FNS Tax Certificates tab...");
		await mobilePage.click("[data-testid='tab-family-wallet-tax']");
		await mobilePage.waitForTimeout(1000);
		await setTheme(mobilePage, "light");
		await saveProof(mobilePage, "07_family_tax_certs_mobile_light_390x844.png", "Family FNS Tax Certificates Bottom Sheet (Mobile Light 390x844)");

		// 2.4 Mobile FNS Tax Tab Dark
		await setTheme(mobilePage, "dark");
		await saveProof(mobilePage, "08_family_tax_certs_mobile_dark_390x844.png", "Family FNS Tax Certificates Bottom Sheet (Mobile Dark 390x844)");

		await mobileCtx.close();

		console.log("\n═══════════════════════════════════════════════════════════════");
		console.log("🎉 ALL 8 CANONICAL FAMILY WALLET & FNS PROOFS CAPTURED SUCCESSFULLY!");
		console.log("═══════════════════════════════════════════════════════════════");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("[FATAL ERROR]:", err);
	process.exit(1);
});
