const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const CONV_ID = process.env.CONV_ID || "c8a35277-b5cf-4cab-9d05-e883361f0b14";
const OUT_DOCS = path.resolve(__dirname, "../docs/proofs/copilot");
const OUT_BRAIN = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}`);

[OUT_DOCS, OUT_BRAIN].forEach((dir) => {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

async function saveProof(page, filename) {
	await page.waitForTimeout(600);
	const pDocs = path.join(OUT_DOCS, filename);
	const pBrain = path.join(OUT_BRAIN, filename);
	await page.screenshot({ path: pDocs, fullPage: false, animations: "disabled" });
	fs.copyFileSync(pDocs, pBrain);
	const size = fs.statSync(pDocs).size;
	console.log(`[Captured] ${filename} (${size} bytes) -> OK: ${size >= 25000}`);
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
		document.documentElement.style.colorScheme = th;
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("dente_theme_mode", th);
	}, theme);
	await page.waitForTimeout(500);
}

async function run() {
	console.log("[Studio Proof Runner] Launching Playwright Chrome for Copilot Studio Proofs...");
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	try {
		// 1. PC 1440x900
		const pcContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
		const pcPage = await pcContext.newPage();
		await pcPage.goto("http://127.0.0.1:5173/?copilot=1&demo=1", { waitUntil: "domcontentloaded", timeout: 30000 });
		await pcPage.waitForSelector('[data-testid="chairside-copilot-studio-root"]', { state: "visible", timeout: 20000 });
		await pcPage.waitForTimeout(1000);

		// PC Light
		console.log("Capturing 01_copilot_studio_pc_light_1440x900.png...");
		await setTheme(pcPage, "light");
		await saveProof(pcPage, "01_copilot_studio_pc_light_1440x900.png");

		// PC Dark
		console.log("Capturing 02_copilot_studio_pc_dark_1440x900.png...");
		await setTheme(pcPage, "dark");
		await saveProof(pcPage, "02_copilot_studio_pc_dark_1440x900.png");

		// Actions Tab PC Dark
		console.log("Capturing 09_copilot_actions_tab_pc_dark_1440x900.png...");
		const actionsBtn = pcPage.locator('button:has-text("Быстрые действия")').first();
		if (await actionsBtn.isVisible()) {
			await actionsBtn.click();
			await pcPage.waitForTimeout(500);
			await saveProof(pcPage, "09_copilot_actions_tab_pc_dark_1440x900.png");
		}

		// Memory Tab PC Light
		console.log("Capturing 08_copilot_memory_tab_pc_light_1440x900.png...");
		await setTheme(pcPage, "light");
		const memoryBtn = pcPage.locator('button:has-text("Память")').first();
		if (await memoryBtn.isVisible()) {
			await memoryBtn.click();
			await pcPage.waitForTimeout(500);
			await saveProof(pcPage, "08_copilot_memory_tab_pc_light_1440x900.png");
		}

		// Dialog Empty Starters PC Light
		console.log("Capturing 05_copilot_empty_starters_pc_light_1440x900.png...");
		const dialogTabBtn = pcPage.locator('button:has-text("Клинический диалог")').first();
		if (await dialogTabBtn.isVisible()) await dialogTabBtn.click();
		const historyTrigger = pcPage.locator('[data-testid="copilot-history-trigger"]').first();
		if (await historyTrigger.isVisible()) {
			await historyTrigger.click();
			await pcPage.waitForTimeout(400);
			const newThreadBtn = pcPage.locator('button:has-text("Новый диалог")').first();
			if (await newThreadBtn.isVisible()) {
				await newThreadBtn.click();
				await pcPage.waitForTimeout(600);
				await saveProof(pcPage, "05_copilot_empty_starters_pc_light_1440x900.png");
			}
		}
		await pcContext.close();

		// 2. Mobile 390x844
		const mobileContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			isMobile: true,
			hasTouch: true,
			userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
		});
		const mobilePage = await mobileContext.newPage();
		await mobilePage.goto("http://127.0.0.1:5173/?copilot=1&demo=1", { waitUntil: "domcontentloaded", timeout: 30000 });
		await mobilePage.waitForSelector('[data-testid="chairside-copilot-studio-root"]', { state: "visible", timeout: 20000 });
		await mobilePage.waitForTimeout(1000);

		// Mobile Light
		console.log("Capturing 03_copilot_studio_mobile_light_390x844.png...");
		await setTheme(mobilePage, "light");
		await saveProof(mobilePage, "03_copilot_studio_mobile_light_390x844.png");

		// Mobile Dark
		console.log("Capturing 04_copilot_studio_mobile_dark_390x844.png...");
		await setTheme(mobilePage, "dark");
		await saveProof(mobilePage, "04_copilot_studio_mobile_dark_390x844.png");

		// Mobile Empty Starters Light
		console.log("Capturing 06_copilot_empty_starters_mobile_light_390x844.png...");
		await setTheme(mobilePage, "light");
		const mobHistoryTrigger = mobilePage.locator('[data-testid="copilot-history-trigger"]').first();
		if (await mobHistoryTrigger.isVisible()) {
			await mobHistoryTrigger.click();
			await mobilePage.waitForTimeout(400);
			const mobNewThreadBtn = mobilePage.locator('button:has-text("Новый диалог")').first();
			if (await mobNewThreadBtn.isVisible()) {
				await mobNewThreadBtn.click();
				await mobilePage.waitForTimeout(600);
				await saveProof(mobilePage, "06_copilot_empty_starters_mobile_light_390x844.png");
			}
		}

		await mobileContext.close();
		console.log("[Studio Proof Runner] Completed successfully!");
	} finally {
		await browser.close();
	}
}

run().catch((err) => {
	console.error("[Studio Proof ERROR]:", err);
	process.exit(1);
});
