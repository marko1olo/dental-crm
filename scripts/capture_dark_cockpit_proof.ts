import { chromium } from "playwright";
import * as path from "node:path";
import { existsSync, mkdirSync, copyFileSync } from "node:fs";

async function main() {
	console.log("=== CAPTURING CBCT DARK COCKPIT & ANTI-BLINDING PROOFS ===");

	const outDir = path.resolve("docs/screenshots/cbct_live");
	if (!existsSync(outDir)) {
		mkdirSync(outDir, { recursive: true });
	}

	const browser = await chromium.launch({
		channel: "msedge",
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--enable-webgl", "--ignore-gpu-blocklist"],
	});

	try {
		// 1. DESKTOP LIGHT THEME: Тюнер при активной светлой теме CRM
		console.log("\n[1] Testing Desktop in LIGHT theme (1600x950)...");
		const desktopContext = await browser.newContext({
			viewport: { width: 1600, height: 950 },
			deviceScaleFactor: 1,
		});
		const desktopPage = await desktopContext.newPage();

		// Set light theme in localStorage before navigation
		await desktopPage.addInitScript(() => {
			localStorage.setItem("dente_theme", "light");
			document.documentElement.setAttribute("data-theme", "light");
		});

		await desktopPage.goto("http://127.0.0.1:5173/?cbct=tuner", { waitUntil: "domcontentloaded", timeout: 30000 });

		const tunerContainer = desktopPage.locator('[data-testid="cbct-tuner-playground"]');
		await tunerContainer.waitFor({ state: "visible", timeout: 15000 });

		// Wait for render
		await desktopPage.waitForTimeout(2000);

		const proofDesktopLight = path.join(outDir, "proof_tuner_light_theme_desktop.png");
		await desktopPage.screenshot({ path: proofDesktopLight, fullPage: false });
		console.log(`✓ Saved Desktop Light Theme Proof: ${proofDesktopLight}`);

		// 2. MOBILE IPHONE 14: Вкладка Ползунки в светлой теме CRM (Touch 44px, Zero Blinding White Blocks)
		console.log("\n[2] Testing Mobile iPhone 14 in LIGHT theme (390x844)...");
		const mobileContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
		});
		const mobilePage = await mobileContext.newPage();

		await mobilePage.addInitScript(() => {
			localStorage.setItem("dente_theme", "light");
			document.documentElement.setAttribute("data-theme", "light");
		});

		await mobilePage.goto("http://127.0.0.1:5173/?cbct=tuner", { waitUntil: "domcontentloaded", timeout: 30000 });
		await mobilePage.waitForTimeout(1500);

		// Switch to Controls tab
		const tabControls = mobilePage.locator('[data-testid="cbct-tuner-tab-controls"]');
		await tabControls.waitFor({ state: "visible", timeout: 10000 });
		await tabControls.click();
		await mobilePage.waitForTimeout(1000);

		const proofMobileControls = path.join(outDir, "proof_tuner_mobile_controls_light_theme.png");
		await mobilePage.screenshot({ path: proofMobileControls, fullPage: false });
		console.log(`✓ Saved Mobile Controls Light Theme Proof: ${proofMobileControls}`);

		// Copy to brain directories for multimodal review
		const brainDirs = [
			"C:\\Users\\Admin\\.gemini\\antigravity\\brain\\9bd515d4-936b-4ea4-8192-7c7792988575",
			"C:\\Users\\Admin\\.gemini\\antigravity\\brain\\df880520-dc90-48e7-ab9e-032bd60d9f31",
			"C:\\Users\\Admin\\.gemini\\antigravity\\brain\\00680fa2-e6ce-40d7-b173-2e3b624aa013",
		];
		for (const bDir of brainDirs) {
			if (existsSync(bDir)) {
				copyFileSync(proofDesktopLight, path.join(bDir, "proof_tuner_light_theme_desktop.png"));
				copyFileSync(proofMobileControls, path.join(bDir, "proof_tuner_mobile_controls_light_theme.png"));
				console.log(`✓ Copied screenshots to brain: ${bDir}`);
			}
		}

		console.log("\n=== ALL SCREENSHOT PROOFS SUCCESSFULLY CAPTURED ===");
	} catch (err) {
		console.error("Capture script error:", err);
		process.exit(1);
	} finally {
		await browser.close();
	}
}

main();
