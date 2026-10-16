const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

async function capture() {
	const proofsDir = path.resolve(__dirname, "../docs/proofs/prescriptions");
	if (!fs.existsSync(proofsDir)) {
		fs.mkdirSync(proofsDir, { recursive: true });
	}

	console.log("[Chrome Playwright] Launching Chrome channel...");
	const browser = await chromium.launch({
		channel: "chrome",
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
	});

	try {
		// ==========================================
		// 1. PC Light & Dark (1440x900)
		// ==========================================
		console.log("[1/4] Preparing PC viewport (1440x900)...");
		const pcContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			colorScheme: "light",
		});
		const pcPage = await pcContext.newPage();
		await pcPage.goto("http://127.0.0.1:5173/?demo=true", { waitUntil: "domcontentloaded", timeout: 30000 });
		
		// Wait for boot-state splash to detach and app-shell to mount
		await pcPage.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});
		await pcPage.waitForSelector(".app-shell, #root > div", { timeout: 30000 }).catch(() => {});
		await pcPage.waitForTimeout(1500);

		// Trigger modal in Light Mode
		console.log("[1/4] Capturing PC Light (1440x900)...");
		await pcPage.evaluate(() => {
			document.documentElement.classList.remove("dark");
			document.documentElement.setAttribute("data-theme", "light");
			try { localStorage.setItem("theme", "light"); } catch (_) {}
			window.dispatchEvent(
				new CustomEvent("dente:open-prescriptions", {
					detail: { medicationId: "amoxiclav_875_125" },
				}),
			);
		});

		await pcPage.waitForSelector('[data-testid="prescription-print-modal"]', { state: "visible", timeout: 15000 });
		await pcPage.waitForTimeout(800);

		const pcLightPath = path.join(proofsDir, "prescription_pc_light_1440x900.png");
		await pcPage.screenshot({ path: pcLightPath, fullPage: false });
		fs.copyFileSync(pcLightPath, path.join(proofsDir, "prescriptions_pc_light_1440x900.png"));

		// PC Dark
		console.log("[2/4] Capturing PC Dark (1440x900)...");
		await pcPage.evaluate(() => {
			document.documentElement.classList.add("dark");
			document.documentElement.setAttribute("data-theme", "dark");
			try { localStorage.setItem("theme", "dark"); } catch (_) {}
		});
		await pcPage.waitForTimeout(800);

		const pcDarkPath = path.join(proofsDir, "prescription_pc_dark_1440x900.png");
		await pcPage.screenshot({ path: pcDarkPath, fullPage: false });
		fs.copyFileSync(pcDarkPath, path.join(proofsDir, "prescriptions_pc_dark_1440x900.png"));
		await pcContext.close();

		// ==========================================
		// 3. Mobile Light & Dark (390x844)
		// ==========================================
		console.log("[3/4] Preparing Mobile viewport (390x844)...");
		const mobileContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			isMobile: true,
			hasTouch: true,
			colorScheme: "light",
		});
		const mobilePage = await mobileContext.newPage();
		await mobilePage.goto("http://127.0.0.1:5173/?demo=true", { waitUntil: "domcontentloaded", timeout: 30000 });
		
		await mobilePage.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});
		await mobilePage.waitForSelector(".app-shell, #root > div", { timeout: 30000 }).catch(() => {});
		await mobilePage.waitForTimeout(1500);

		console.log("[3/4] Capturing Mobile Light (390x844)...");
		await mobilePage.evaluate(() => {
			document.documentElement.classList.remove("dark");
			document.documentElement.setAttribute("data-theme", "light");
			try { localStorage.setItem("theme", "light"); } catch (_) {}
			window.dispatchEvent(
				new CustomEvent("dente:open-prescriptions", {
					detail: { medicationId: "amoxiclav_875_125" },
				}),
			);
		});

		await mobilePage.waitForSelector('[data-testid="prescription-print-modal"]', { state: "visible", timeout: 15000 });
		await mobilePage.waitForTimeout(800);

		const mobileLightPath = path.join(proofsDir, "prescription_mobile_light_390x844.png");
		await mobilePage.screenshot({ path: mobileLightPath, fullPage: false });
		fs.copyFileSync(mobileLightPath, path.join(proofsDir, "prescriptions_mobile_light_390x844.png"));

		// Mobile Dark
		console.log("[4/4] Capturing Mobile Dark (390x844)...");
		await mobilePage.evaluate(() => {
			document.documentElement.classList.add("dark");
			document.documentElement.setAttribute("data-theme", "dark");
			try { localStorage.setItem("theme", "dark"); } catch (_) {}
		});
		await mobilePage.waitForTimeout(800);

		const mobileDarkPath = path.join(proofsDir, "prescription_mobile_dark_390x844.png");
		await mobilePage.screenshot({ path: mobileDarkPath, fullPage: false });
		fs.copyFileSync(mobileDarkPath, path.join(proofsDir, "prescriptions_mobile_dark_390x844.png"));
		await mobileContext.close();

		console.log("\n[SUCCESS] Captured all 4-state screenshots:");
		const files = [
			pcLightPath,
			pcDarkPath,
			mobileLightPath,
			mobileDarkPath,
		];
		for (const f of files) {
			const stat = fs.statSync(f);
			console.log(`- ${path.basename(f)}: ${(stat.size / 1024).toFixed(1)} KB`);
			if (stat.size < 20 * 1024) {
				throw new Error(`File ${f} is smaller than 20 KB (${stat.size} bytes)!`);
			}
		}
	} finally {
		await browser.close();
	}
}

capture().catch((err) => {
	console.error("[FATAL] Screenshot capture failed:", err);
	process.exit(1);
});
