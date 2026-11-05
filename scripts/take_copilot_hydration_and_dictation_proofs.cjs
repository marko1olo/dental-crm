const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const CONV_ID = process.env.CONV_ID || "b11b7049-4e93-4de2-ae57-aa2fd073fb20";
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
	}, theme);
	await page.waitForTimeout(500);
}

async function run() {
	console.log("[Hydration & Dictation Proof Runner] Launching Playwright Chrome...");
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	try {
		const pcContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
		const page = await pcContext.newPage();

		console.log("Navigating to http://127.0.0.1:5173/?copilot=1 ...");
		await page.goto("http://127.0.0.1:5173/?copilot=1", { waitUntil: "domcontentloaded", timeout: 30000 });
		await page.waitForSelector('[data-testid="chairside-copilot-studio-root"]', { state: "visible", timeout: 20000 });
		await page.waitForTimeout(1000);

		// Задаем пакетный осмотр зубов: 16 (Caries), 36 (Pulpitis), 47 (Defective_Restoration)
		console.log("Setting up batch teeth findings in useVisitStore and localStorage...");
		await page.evaluate(() => {
			const teethData = [
				{ toothNumber: 16, state: "Caries" },
				{ toothNumber: 36, state: "Pulpitis" },
				{ toothNumber: 47, state: "Defective_Restoration" },
			];
			// 1. Dispatch update event
			window.dispatchEvent(
				new CustomEvent("dente-odontogram-update", {
					detail: {
						states: teethData,
						teeth: teethData,
					},
				}),
			);
			// 2. Direct store update if available
			if (window.__useVisitStore) {
				window.__useVisitStore.getState().setVisitToothStateByCode((prev) => ({
					...prev,
					"16": "caries",
					"36": "pulpitis",
					"47": "caries",
				}));
			}
		});

		await page.waitForTimeout(1000);

		// 1. Сценарий А: Пакетный дайджест осмотра визита PC Light
		console.log("Capturing 01_copilot_batch_digest_pc_light_1440x900.png...");
		await setTheme(page, "light");
		await saveProof(page, "01_copilot_batch_digest_pc_light_1440x900.png");

		// 2. Сценарий А: Пакетный дайджест осмотра визита PC Dark
		console.log("Capturing 02_copilot_batch_digest_pc_dark_1440x900.png...");
		await setTheme(page, "dark");
		await saveProof(page, "02_copilot_batch_digest_pc_dark_1440x900.png");

		// Переключаем обратно на Light для диктовки
		await setTheme(page, "light");

		// 3. Сценарий Б: Свободная диктовка врача
		console.log("Submitting free clinical dictation...");
		const inputField = page.locator('input[placeholder*="диктовка"]').first();
		await inputField.waitFor({ state: "visible", timeout: 10000 });
		await inputField.fill("36 глубокий кариес, анестезия септанест, биодентин, пломба эстелайт а3, зуб 16 кариес в план");
		await page.waitForTimeout(400);

		const sendBtn = page.locator('button[aria-label="Отправить запрос"]').first();
		await sendBtn.click();
		await page.waitForTimeout(2000);

		console.log("Capturing 03_copilot_dictation_applied_pc_light_1440x900.png...");
		await saveProof(page, "03_copilot_dictation_applied_pc_light_1440x900.png");

		console.log("Capturing 04_copilot_dictation_applied_pc_dark_1440x900.png...");
		await setTheme(page, "dark");
		await saveProof(page, "04_copilot_dictation_applied_pc_dark_1440x900.png");

		console.log("All 4 proofs captured successfully!");
	} catch (err) {
		console.error("Proof runner failed:", err);
		process.exit(1);
	} finally {
		await browser.close();
	}
}

run();
