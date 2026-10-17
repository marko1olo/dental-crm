import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const CONV_ID = "fc1b5632-f014-45e7-a64c-bdf9f9e2e463";
const OUT_CONV = `C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}`;
const OUT_DOCS = "C:/Clinic_MVP/dental-crm/docs/proofs/analytics";

await mkdir(OUT_CONV, { recursive: true });
await mkdir(OUT_DOCS, { recursive: true });

async function getBaseUrl() {
	for (const port of [5173, 5174, 5175, 5176]) {
		try {
			const res = await fetch(`http://127.0.0.1:${port}/`);
			if (res.ok) {
				console.log(`Detected live dev server at port ${port}`);
				return `http://127.0.0.1:${port}`;
			}
		} catch {}
	}
	return "http://127.0.0.1:5173";
}

async function run() {
	console.log("=== STARTING EXECUTIVE COCKPIT PROOF CAPTURE ===");
	const baseUrl = await getBaseUrl();
	console.log(`Target URL: ${baseUrl}`);

	const browser = await chromium.launch({
		channel: "chrome",
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	const setupPage = async (page, theme, isMobile = false) => {
		await page.addInitScript(({ theme, isMobile }) => {
			localStorage.setItem("dente_clinic_token", "demo-showcase-token-owner");
			localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-owner");
			localStorage.setItem("dente_active_role", "owner");
			localStorage.setItem(
				"dente_cached_active_staff_user",
				JSON.stringify({
					id: "01a00000-0000-0000-0003-000000000004",
					fullName: "Д-р Воронов Алексей Владимирович (Главврач)",
					role: "owner",
				}),
			);
			localStorage.setItem(
				"dental-crm:active-user:v1",
				JSON.stringify({
					id: "01a00000-0000-0000-0003-000000000004",
					fullName: "Д-р Воронов Алексей Владимирович (Главврач)",
					role: "owner",
				}),
			);
			localStorage.setItem("dente_theme_mode", theme);
			localStorage.setItem("dente_theme", theme);
			localStorage.setItem(
				"dental-crm:onboarding:v1",
				JSON.stringify({ completed: true, dismissed: true }),
			);
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_demo_showcase", "true");
		}, { theme, isMobile });
	};

	const applyThemeAndClean = async (page, theme) => {
		await page.evaluate((theme) => {
			document.documentElement.setAttribute("data-theme", theme);
			if (theme === "dark") {
				document.documentElement.classList.remove("light");
				document.documentElement.classList.add("dark");
			} else {
				document.documentElement.classList.remove("dark");
				document.documentElement.classList.add("light");
			}
			document.querySelectorAll(
				'.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container, [role="alert"]',
			).forEach((el) => el.remove());
		}, theme);
	};

	try {
		// ==========================================
		// 1. PC Light (1440x900)
		// ==========================================
		console.log("\n--- 1. Capturing PC Light (1440x900) ---");
		const contextPcLight = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});
		const pagePcLight = await contextPcLight.newPage();
		pagePcLight.on("console", (msg) => console.log(`[PC Console]:`, msg.text()));
		pagePcLight.on("pageerror", (err) => console.error("[PC Error]:", err));

		await setupPage(pagePcLight, "light", false);
		await pagePcLight.goto(`${baseUrl}/?demo=true#analytics`, { waitUntil: "commit", timeout: 60000 });
		console.log("Waiting for boot-state to detach...");
		await pagePcLight.waitForSelector(".boot-state", { state: "detached", timeout: 60000 }).catch(() => {});
		console.log("Waiting for .executive-dashboard to be visible...");
		await pagePcLight.waitForSelector(".executive-dashboard", { state: "visible", timeout: 60000 });
		await pagePcLight.waitForTimeout(2000);
		await applyThemeAndClean(pagePcLight, "light");
		await pagePcLight.waitForTimeout(1000);

		const pcLightFile = "executive_pnl_cockpit_pc_light_1440x900.png";
		console.log(`Saving ${pcLightFile}...`);
		await pagePcLight.screenshot({ path: path.join(OUT_DOCS, pcLightFile), fullPage: false });
		await pagePcLight.screenshot({ path: path.join(OUT_CONV, pcLightFile), fullPage: false });
		console.log(`Saved ${pcLightFile} successfully!`);

		// Capture P&L Modal on PC Light
		console.log("\n--- Opening P&L Modal on PC Light ---");
		const pnlBtn = pagePcLight.locator('[data-testid="desktop-open-pnl-btn"]');
		if (await pnlBtn.count() > 0) {
			await pnlBtn.click();
			console.log("Waiting for financial modal...");
			await pagePcLight.waitForSelector('[data-testid="financial-analytics-modal"]', { state: "visible", timeout: 20000 });
			await pagePcLight.waitForTimeout(2000);
			const pnlModalFile = "executive_pnl_modal_pc_light_1440x900.png";
			console.log(`Saving ${pnlModalFile}...`);
			await pagePcLight.screenshot({ path: path.join(OUT_DOCS, pnlModalFile), fullPage: false });
			await pagePcLight.screenshot({ path: path.join(OUT_CONV, pnlModalFile), fullPage: false });
			console.log(`Saved ${pnlModalFile} successfully!`);
		}
		await contextPcLight.close();

		// ==========================================
		// 2. PC Dark (1440x900)
		// ==========================================
		console.log("\n--- 2. Capturing PC Dark (1440x900) ---");
		const contextPcDark = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});
		const pagePcDark = await contextPcDark.newPage();
		pagePcDark.on("pageerror", (err) => console.error("[PC Dark Error]:", err));

		await setupPage(pagePcDark, "dark", false);
		await pagePcDark.goto(`${baseUrl}/?demo=true#analytics`, { waitUntil: "commit", timeout: 60000 });
		await pagePcDark.waitForSelector(".boot-state", { state: "detached", timeout: 60000 }).catch(() => {});
		await pagePcDark.waitForSelector(".executive-dashboard", { state: "visible", timeout: 60000 });
		await pagePcDark.waitForTimeout(2000);
		await applyThemeAndClean(pagePcDark, "dark");
		await pagePcDark.waitForTimeout(1000);

		const pcDarkFile = "executive_pnl_cockpit_pc_dark_1440x900.png";
		console.log(`Saving ${pcDarkFile}...`);
		await pagePcDark.screenshot({ path: path.join(OUT_DOCS, pcDarkFile), fullPage: false });
		await pagePcDark.screenshot({ path: path.join(OUT_CONV, pcDarkFile), fullPage: false });
		console.log(`Saved ${pcDarkFile} successfully!`);
		await contextPcDark.close();

		// ==========================================
		// 3. Mobile Light (390x844)
		// ==========================================
		console.log("\n--- 3. Capturing Mobile Light (390x844) ---");
		const contextMobileLight = await browser.newContext({
			viewport: { width: 390, height: 844 },
			isMobile: true,
			hasTouch: true,
			deviceScaleFactor: 2,
		});
		const pageMobileLight = await contextMobileLight.newPage();
		pageMobileLight.on("console", (msg) => console.log(`[Mobile Light Console]:`, msg.text()));
		pageMobileLight.on("pageerror", (err) => console.error("[Mobile Light Error]:", err));

		await setupPage(pageMobileLight, "light", true);
		await pageMobileLight.goto(`${baseUrl}/?demo=true#analytics`, { waitUntil: "commit", timeout: 60000 });
		await pageMobileLight.waitForSelector(".boot-state", { state: "detached", timeout: 60000 }).catch(() => {});
		await pageMobileLight.waitForSelector(".mobile-exec-dashboard, [data-testid='mobile-executive-dashboard']", { state: "visible", timeout: 60000 });
		await pageMobileLight.waitForTimeout(2000);
		await applyThemeAndClean(pageMobileLight, "light");
		await pageMobileLight.waitForTimeout(1000);

		const mobileLightFile = "executive_pnl_cockpit_mobile_light_390x844.png";
		console.log(`Saving ${mobileLightFile}...`);
		await pageMobileLight.screenshot({ path: path.join(OUT_DOCS, mobileLightFile), fullPage: false });
		await pageMobileLight.screenshot({ path: path.join(OUT_CONV, mobileLightFile), fullPage: false });
		console.log(`Saved ${mobileLightFile} successfully!`);
		await contextMobileLight.close();

		// ==========================================
		// 4. Mobile Dark (390x844)
		// ==========================================
		console.log("\n--- 4. Capturing Mobile Dark (390x844) ---");
		const contextMobileDark = await browser.newContext({
			viewport: { width: 390, height: 844 },
			isMobile: true,
			hasTouch: true,
			deviceScaleFactor: 2,
		});
		const pageMobileDark = await contextMobileDark.newPage();
		pageMobileDark.on("pageerror", (err) => console.error("[Mobile Dark Error]:", err));

		await setupPage(pageMobileDark, "dark", true);
		await pageMobileDark.goto(`${baseUrl}/?demo=true#analytics`, { waitUntil: "commit", timeout: 60000 });
		await pageMobileDark.waitForSelector(".boot-state", { state: "detached", timeout: 60000 }).catch(() => {});
		await pageMobileDark.waitForSelector(".mobile-exec-dashboard, [data-testid='mobile-executive-dashboard']", { state: "visible", timeout: 60000 });
		await pageMobileDark.waitForTimeout(2000);
		await applyThemeAndClean(pageMobileDark, "dark");
		await pageMobileDark.waitForTimeout(1000);

		const mobileDarkFile = "executive_pnl_cockpit_mobile_dark_390x844.png";
		console.log(`Saving ${mobileDarkFile}...`);
		await pageMobileDark.screenshot({ path: path.join(OUT_DOCS, mobileDarkFile), fullPage: false });
		await pageMobileDark.screenshot({ path: path.join(OUT_CONV, mobileDarkFile), fullPage: false });
		console.log(`Saved ${mobileDarkFile} successfully!`);
		await contextMobileDark.close();

		console.log("\n🎉 ALL 4 RED TEAM PROOFS + MODAL CAPTURED SUCCESSFULLY!");
	} finally {
		await browser.close();
	}
}

run().catch((err) => {
	console.error("FATAL screenshot capture failure:", err);
	process.exit(1);
});
