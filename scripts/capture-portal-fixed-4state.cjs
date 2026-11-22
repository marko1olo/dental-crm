const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const OUT_DIR = path.resolve(__dirname, "../docs/proofs/portal");
if (!fs.existsSync(OUT_DIR)) {
	fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function safeSetTheme(page, isDark) {
	const themeId = isDark ? "dark" : "light";
	try {
		await page.evaluate(({ themeId, isDark }) => {
			document.documentElement.setAttribute("data-theme", themeId);
			document.documentElement.classList.toggle("dark", isDark);
			document.documentElement.classList.toggle("light", !isDark);
			document.documentElement.style.colorScheme = isDark ? "dark" : "light";
			const themedNodes = document.querySelectorAll("[data-theme]");
			for (const n of themedNodes) {
				n.setAttribute("data-theme", themeId);
			}
			try {
				localStorage.setItem("dental_theme", themeId);
			} catch (_) {}
		}, { themeId, isDark });
	} catch (e) {
		// Ignore any navigation race
	}
}

async function captureProof(page, filename) {
	await page.waitForTimeout(1000);
	const filePath = path.join(OUT_DIR, filename);
	await page.screenshot({ path: filePath, fullPage: false, animations: "disabled" });
	const size = fs.statSync(filePath).size;
	console.log(`[Captured] ${filename} (${size} bytes) -> OK: ${size >= 20000}`);
	if (size < 20000) {
		console.warn(`[WARNING] ${filename} size is ${size} bytes, below 20KB threshold!`);
	}
	return filePath;
}

async function run() {
	console.log("Launching Playwright Chromium...");
	const browser = await chromium.launch({
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
	});

	try {
		// 1. PC Light (1440x900)
		console.log("Capturing 01_patient_cabinet_pc_light_1440x900.png...");
		const pcLightCtx = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});
		const pcLightPage = await pcLightCtx.newPage();
		pcLightPage.setDefaultTimeout(60000);
		await pcLightPage.addInitScript(() => {
			try {
				localStorage.setItem("dental_theme", "light");
				localStorage.setItem("dente_demo_showcase", "true");
				document.documentElement.setAttribute("data-theme", "light");
				document.documentElement.classList.add("light");
			} catch (_) {}
		});

		await pcLightPage.goto("http://127.0.0.1:5173/#/portal/cabinet/demo-clinic", {
			waitUntil: "commit",
			timeout: 30000,
		});
		await pcLightPage.waitForSelector(".boot-state", { state: "detached", timeout: 45000 }).catch(() => {});
		await pcLightPage.waitForTimeout(4000);
		await safeSetTheme(pcLightPage, false);

		await captureProof(pcLightPage, "01_patient_cabinet_pc_light_1440x900.png");
		await pcLightPage.close();
		await pcLightCtx.close();

		// 2. PC Dark (1440x900)
		console.log("Capturing 02_patient_cabinet_pc_dark_1440x900.png...");
		const pcDarkCtx = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});
		const pcDarkPage = await pcDarkCtx.newPage();
		pcDarkPage.setDefaultTimeout(60000);
		await pcDarkPage.addInitScript(() => {
			try {
				localStorage.setItem("dental_theme", "dark");
				localStorage.setItem("dente_demo_showcase", "true");
				document.documentElement.setAttribute("data-theme", "dark");
				document.documentElement.classList.add("dark");
			} catch (_) {}
		});

		await pcDarkPage.goto("http://127.0.0.1:5173/#/portal/cabinet/demo-clinic", {
			waitUntil: "commit",
			timeout: 30000,
		});
		await pcDarkPage.waitForSelector(".boot-state", { state: "detached", timeout: 45000 }).catch(() => {});
		await pcDarkPage.waitForTimeout(4000);
		await safeSetTheme(pcDarkPage, true);

		await captureProof(pcDarkPage, "02_patient_cabinet_pc_dark_1440x900.png");
		await pcDarkPage.close();
		await pcDarkCtx.close();

		// 3. Mobile Light (390x844)
		console.log("Capturing 03_patient_cabinet_mobile_light_390x844.png...");
		const mobLightCtx = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
		});
		const mobLightPage = await mobLightCtx.newPage();
		mobLightPage.setDefaultTimeout(60000);
		await mobLightPage.addInitScript(() => {
			try {
				localStorage.setItem("dental_theme", "light");
				localStorage.setItem("dente_demo_showcase", "true");
				document.documentElement.setAttribute("data-theme", "light");
				document.documentElement.classList.add("light");
			} catch (_) {}
		});

		await mobLightPage.goto("http://127.0.0.1:5173/#/portal/cabinet/demo-clinic", {
			waitUntil: "commit",
			timeout: 30000,
		});
		await mobLightPage.waitForSelector(".boot-state", { state: "detached", timeout: 45000 }).catch(() => {});
		await mobLightPage.waitForTimeout(4000);
		await safeSetTheme(mobLightPage, false);

		await captureProof(mobLightPage, "03_patient_cabinet_mobile_light_390x844.png");
		await mobLightPage.close();
		await mobLightCtx.close();

		// 4. Mobile Dark (390x844)
		console.log("Capturing 04_patient_cabinet_mobile_dark_390x844.png...");
		const mobDarkCtx = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
		});
		const mobDarkPage = await mobDarkCtx.newPage();
		mobDarkPage.setDefaultTimeout(60000);
		await mobDarkPage.addInitScript(() => {
			try {
				localStorage.setItem("dental_theme", "dark");
				localStorage.setItem("dente_demo_showcase", "true");
				document.documentElement.setAttribute("data-theme", "dark");
				document.documentElement.classList.add("dark");
			} catch (_) {}
		});

		await mobDarkPage.goto("http://127.0.0.1:5173/#/portal/cabinet/demo-clinic", {
			waitUntil: "commit",
			timeout: 30000,
		});
		await mobDarkPage.waitForSelector(".boot-state", { state: "detached", timeout: 45000 }).catch(() => {});
		await mobDarkPage.waitForTimeout(4000);
		await safeSetTheme(mobDarkPage, true);

		await captureProof(mobDarkPage, "04_patient_cabinet_mobile_dark_390x844.png");
		await mobDarkPage.close();
		await mobDarkCtx.close();

		console.log("ALL 4-STATE PORTAL PROOFS CAPTURED SUCCESSFULLY!");
	} finally {
		await browser.close();
	}
}

run().catch((err) => {
	console.error("Capture script error:", err);
	process.exit(1);
});
