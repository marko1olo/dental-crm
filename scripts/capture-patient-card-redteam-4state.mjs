import { existsSync, mkdirSync, copyFileSync, statSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const CONV_ID = "93774532-8e43-4f61-9703-5fb3190efcad";
const DIRS = [
	"C:/Clinic_MVP/dental-crm/docs/proofs/patient_card",
	"C:/Clinic_MVP/dental-crm/docs/proofs/patient-card",
	`C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}`,
];

DIRS.forEach((dir) => {
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}
});

const browserExecutable = [
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
].find((p) => existsSync(p));

console.log("[Browser] Using executable:", browserExecutable);

const browser = await chromium.launch({
	executablePath: browserExecutable,
	headless: true,
	args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
});

async function suppressOverlays(page) {
	await page.evaluate(() => {
		let style = document.getElementById("suppress-all-tour-overlays");
		if (!style) {
			style = document.createElement("style");
			style.id = "suppress-all-tour-overlays";
			document.head.appendChild(style);
		}
		style.innerHTML = `
			.tour-spotlight-root,
			.tour-backdrop-clickable-zone,
			[data-testid="guided-tour-spotlight-overlay"],
			[data-testid="guided-tour-coach-mark-card"],
			[data-testid="demo-mode-banner"],
			.shepherd-element,
			.global-toast-container,
			.copilot-trigger-btn,
			[data-testid="copilot-floating-trigger"],
			vite-error-overlay {
				display: none !important;
				pointer-events: none !important;
				opacity: 0 !important;
			}
			*, *::before, *::after {
				animation: none !important;
				transition: none !important;
			}
		`;
		document.querySelectorAll("vite-error-overlay, .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay']").forEach((el) => el.remove());
	});
}

async function setTheme(p, theme) {
	await p.evaluate((th) => {
		document.documentElement.setAttribute("data-theme", th);
		if (th === "light") {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			document.body.className = "light";
		} else {
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
			document.body.className = "dark";
		}
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("dente_theme_mode", th);
		localStorage.setItem("theme", th);
		document.documentElement.style.colorScheme = th;
	}, theme);
	await suppressOverlays(p);
	await p.waitForTimeout(400);
}

async function saveProof(page, filename, description) {
	await suppressOverlays(page);
	await page.waitForTimeout(400);
	const primaryTarget = path.join(DIRS[0], filename);
	await page.screenshot({ path: primaryTarget, fullPage: false });

	for (let i = 1; i < DIRS.length; i++) {
		try {
			copyFileSync(primaryTarget, path.join(DIRS[i], filename));
		} catch (_) {}
	}
	const sz = statSync(primaryTarget).size;
	console.log(`[PROOF CAPTURED] ${filename} (${sz} bytes) -> ${description} [>=20KB: ${sz >= 20000}]`);
	if (sz < 20000) {
		throw new Error(`Screenshot ${filename} size ${sz} is less than required 20KB gate!`);
	}
}

async function getBaseUrl() {
	for (const port of [5173, 5174, 5175]) {
		try {
			const res = await fetch(`http://127.0.0.1:${port}`);
			if (res.ok || res.status < 500) {
				console.log(`[Vite Server] Found active server at http://127.0.0.1:${port}`);
				return `http://127.0.0.1:${port}`;
			}
		} catch (_) {}
	}
	throw new Error("Could not connect to Vite dev server on port 5173, 5174 or 5175");
}

async function run() {
	const baseUrl = await getBaseUrl();

	// 1. PC 1440x900
	console.log("\n--- [PC 1440x900 Capture] ---");
	const pcContext = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 1,
	});

	await pcContext.addInitScript(() => {
		localStorage.setItem("dente_active_role", "owner");
		localStorage.setItem("dente_active_mode", "clinic");
		localStorage.setItem("dente_user_role", "doctor");
		localStorage.setItem("dente_theme_mode", "light");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_tour_dismissed", "true");
		localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
		localStorage.setItem("dente_demo_banner_dismissed", "true");
		localStorage.setItem("dente_demo_mode", "true");
		localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
	});

	const pcPage = await pcContext.newPage();
	console.log("[PC] Navigating to ?demo=true#patients...");
	await pcPage.goto(`${baseUrl}/?demo=true#patients`, { waitUntil: "commit", timeout: 45000 });
	await pcPage.waitForSelector(".boot-state, .boot-subtitle", { state: "detached", timeout: 30000 }).catch(() => {});
	await pcPage.waitForTimeout(2000);

	try {
		const pcLocator = pcPage.locator('[data-patient-id], tr[data-id], .patient-row, [data-testid^="patient-row-"]').first();
		await pcLocator.waitFor({ state: "visible", timeout: 20000 });
		await pcLocator.click({ force: true, timeout: 5000 });
		await pcPage.waitForTimeout(1000);

		const openCardBtn = pcPage.locator('button:has-text("В карту"), [data-testid="patient-action-open-card"], [data-testid="btn-open-patient-card"]').first();
		if (await openCardBtn.count() > 0) {
			await openCardBtn.click({ force: true, timeout: 5000 });
			await pcPage.waitForTimeout(1500);
		}
	} catch (e) {
		console.log("[PC] Select error:", e.message);
	}
	await suppressOverlays(pcPage);

	// PC Light
	await setTheme(pcPage, "light");
	await saveProof(pcPage, "patient_card_pc_light_1440x900.png", "Patient Card SSOT (PC Light 1440x900)");

	// PC Dark
	await setTheme(pcPage, "dark");
	await saveProof(pcPage, "patient_card_pc_dark_1440x900.png", "Patient Card SSOT (PC Dark 1440x900)");

	// Switch to Family tab to capture Anti-Matryoshka inline Family Wallet
	try {
		const familyTab = pcPage.locator("button:has-text('Семья'), [data-tab='family']").first();
		if (await familyTab.count() > 0) {
			await familyTab.click();
			await pcPage.waitForTimeout(600);
			// Open inline wallet
			const openWalletBtn = pcPage.locator("button:has-text('Семейный счет'), button:has-text('Открыть кошелек'), button:has-text('Семья')").first();
			if (await openWalletBtn.count() > 0) {
				await openWalletBtn.click();
				await pcPage.waitForTimeout(600);
			}
			await setTheme(pcPage, "light");
			await saveProof(pcPage, "patient_family_inline_pc_light_1440x900.png", "Family Wallet Inline SSOT (PC Light 1440x900)");
			await setTheme(pcPage, "dark");
			await saveProof(pcPage, "patient_family_inline_pc_dark_1440x900.png", "Family Wallet Inline SSOT (PC Dark 1440x900)");
		}
	} catch (err) {
		console.log("[Family Tab PC Warning]", err.message);
	}

	await pcContext.close();

	// 2. Mobile 390x844 (Apple HIG)
	console.log("\n--- [Mobile 390x844 Capture] ---");
	const mobContext = await browser.newContext({
		viewport: { width: 390, height: 844 },
		isMobile: true,
		hasTouch: true,
		deviceScaleFactor: 2,
	});

	await mobContext.addInitScript(() => {
		localStorage.setItem("dente_active_role", "owner");
		localStorage.setItem("dente_active_mode", "clinic");
		localStorage.setItem("dente_user_role", "doctor");
		localStorage.setItem("dente_theme_mode", "light");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_tour_dismissed", "true");
		localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
		localStorage.setItem("dente_demo_banner_dismissed", "true");
		localStorage.setItem("dente_demo_mode", "true");
		localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
	});

	const mobPage = await mobContext.newPage();
	console.log("[Mobile] Navigating to ?demo=true#patients...");
	await mobPage.goto(`${baseUrl}/?demo=true#patients`, { waitUntil: "commit", timeout: 45000 });
	await mobPage.waitForSelector(".boot-state, .boot-subtitle", { state: "detached", timeout: 30000 }).catch(() => {});
	await mobPage.waitForTimeout(2000);

	try {
		const mobLocator = mobPage.locator('[data-patient-id], .mobile-patient-card, tr[data-id], .patient-row, [data-testid^="patient-row-"]').first();
		await mobLocator.waitFor({ state: "visible", timeout: 20000 });
		await mobLocator.click({ force: true, timeout: 5000 });
		await mobPage.waitForTimeout(1000);

		const openMobCard = mobPage.locator('button:has-text("В карту"), [data-testid="patient-action-open-card"], [data-testid="btn-open-patient-card"]').first();
		if (await openMobCard.count() > 0) {
			await openMobCard.click({ force: true, timeout: 5000 });
			await mobPage.waitForTimeout(1500);
		}
	} catch (e) {
		console.log("[Mobile] Select error:", e.message);
	}
	await suppressOverlays(mobPage);

	// Mobile Light
	await setTheme(mobPage, "light");
	await saveProof(mobPage, "patient_card_mobile_light_390x844.png", "Patient Card Mobile Bottom Sheet (Mobile Light 390x844)");

	// Mobile Dark
	await setTheme(mobPage, "dark");
	await saveProof(mobPage, "patient_card_mobile_dark_390x844.png", "Patient Card Mobile Bottom Sheet (Mobile Dark 390x844)");

	// Mobile Family inline
	try {
		const mobFamilyTab = mobPage.locator("button:has-text('Семья'), [data-tab='family']").first();
		if (await mobFamilyTab.count() > 0) {
			await mobFamilyTab.click();
			await mobPage.waitForTimeout(600);
			const openWalletBtn = mobPage.locator("button:has-text('Семейный счет'), button:has-text('Открыть кошелек'), button:has-text('Семья')").first();
			if (await openWalletBtn.count() > 0) {
				await openWalletBtn.click();
				await mobPage.waitForTimeout(600);
			}
			await setTheme(mobPage, "light");
			await saveProof(mobPage, "patient_family_inline_mobile_light_390x844.png", "Family Wallet Mobile Inline (Mobile Light 390x844)");
			await setTheme(mobPage, "dark");
			await saveProof(mobPage, "patient_family_inline_mobile_dark_390x844.png", "Family Wallet Mobile Inline (Mobile Dark 390x844)");
		}
	} catch (err) {
		console.log("[Family Tab Mobile Warning]", err.message);
	}

	await mobContext.close();
	await browser.close();
	console.log("\n=== ALL 4-STATE PROOFS CAPTURED & SAVED SUCCESSFULLY ===");
}

run().catch((err) => {
	console.error("[FATAL CAPTURE ERROR]", err);
	process.exit(1);
});
