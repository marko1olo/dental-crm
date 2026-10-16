const puppeteer = require("puppeteer");
const path = require("node:path");
const fs = require("node:fs");

const proofDir = path.resolve(__dirname, "../docs/proofs/anesthesia");
if (!fs.existsSync(proofDir)) {
	fs.mkdirSync(proofDir, { recursive: true });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function capture() {
	console.log("=== CAPTURING CANONICAL ANESTHESIA SCREENSHOTS ===");

	const browser = await puppeteer.launch({
		headless: "new",
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: [
			"--no-sandbox",
			"--disable-setuid-sandbox",
			"--disable-dev-shm-usage",
			"--disable-gpu",
		],
	});

	try {
		// 1. PC Light (1440x900)
		const pcPage = await browser.newPage();
		await pcPage.evaluateOnNewDocument(() => {
			localStorage.setItem("dental_token", "dev-test-token");
			localStorage.setItem("dental_current_user", JSON.stringify({ role: "doctor", id: "doc-1", name: "Воронов А.В." }));
			localStorage.setItem("dente_active_perspective", "chairsider");
			localStorage.setItem("dente_theme", "light");
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_demo_showcase", "true");
		});

		console.log("[1/3] Capturing 01_pc_anesthesia_quick_bar_light_1440x900.png ...");
		await pcPage.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
		await pcPage.goto("http://127.0.0.1:5173/?anesthesia", { waitUntil: "domcontentloaded", timeout: 30000 });
		await pcPage.waitForFunction(() => !document.querySelector(".boot-state"), { timeout: 30000 });
		await pcPage.waitForSelector(".anesthesia-quick-bar", { visible: true, timeout: 30000 });

		await pcPage.evaluate(() => {
			localStorage.setItem("dente_theme", "light");
			document.documentElement.setAttribute("data-theme", "light");
			document.documentElement.classList.remove("dark");
		});
		await sleep(1500);

		const pcLightPath = path.join(proofDir, "01_pc_anesthesia_quick_bar_light_1440x900.png");
		await pcPage.screenshot({ path: pcLightPath, fullPage: false });
		console.log(`Saved: ${pcLightPath} (${fs.statSync(pcLightPath).size} bytes)`);

		// 2. PC Dark (1440x900)
		console.log("[2/3] Capturing 02_pc_anesthesia_quick_bar_dark_1440x900.png ...");
		await pcPage.evaluate(() => {
			localStorage.setItem("dente_theme", "dark");
			document.documentElement.setAttribute("data-theme", "dark");
			document.documentElement.classList.add("dark");
		});
		await sleep(1500);

		const pcDarkPath = path.join(proofDir, "02_pc_anesthesia_quick_bar_dark_1440x900.png");
		await pcPage.screenshot({ path: pcDarkPath, fullPage: false });
		console.log(`Saved: ${pcDarkPath} (${fs.statSync(pcDarkPath).size} bytes)`);
		await pcPage.close();

		// 3. Mobile Light (390x844)
		console.log("[3/3] Capturing 03_mobile_anesthesia_light_390x844.png ...");
		const mobilePage = await browser.newPage();
		await mobilePage.evaluateOnNewDocument(() => {
			localStorage.setItem("dental_token", "dev-test-token");
			localStorage.setItem("dental_current_user", JSON.stringify({ role: "doctor", id: "doc-1", name: "Воронов А.В." }));
			localStorage.setItem("dente_active_perspective", "chairsider");
			localStorage.setItem("dente_theme", "light");
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_demo_showcase", "true");
		});

		await mobilePage.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
		await mobilePage.goto("http://127.0.0.1:5173/?anesthesia", { waitUntil: "domcontentloaded", timeout: 30000 });
		await mobilePage.waitForFunction(() => !document.querySelector(".boot-state"), { timeout: 30000 });
		await mobilePage.waitForSelector(".anesthesia-quick-bar", { visible: true, timeout: 30000 });

		await mobilePage.evaluate(() => {
			localStorage.setItem("dente_theme", "light");
			document.documentElement.setAttribute("data-theme", "light");
			document.documentElement.classList.remove("dark");
			const bar = document.querySelector(".anesthesia-quick-bar");
			if (bar) {
				bar.scrollIntoView({ behavior: "instant", block: "start" });
			}
		});
		await sleep(2000);

		const mobileLightPath = path.join(proofDir, "03_mobile_anesthesia_light_390x844.png");
		await mobilePage.screenshot({ path: mobileLightPath, fullPage: false });
		console.log(`Saved: ${mobileLightPath} (${fs.statSync(mobileLightPath).size} bytes)`);
		await mobilePage.close();

		console.log("=== ALL ANESTHESIA PROOFS CAPTURED SUCCESSFULLY ===");
	} finally {
		await browser.close();
	}
}

capture().catch((err) => {
	console.error("Capture failed:", err);
	process.exit(1);
});
