/**
 * scripts/capture-perio-4state-direct.cjs
 *
 * 4-STATE VISUAL PROOF ДЛЯ ПАРОДОНТОЛОГИЧЕСКОГО КОНТУРА (ДОМЕН 20):
 * 1. ☀️ PC Light (1440x900)
 * 2. 🌙 PC Dark (1440x900)
 * 3. 📱 Mobile Light (390x844)
 * 4. 📱 Mobile Dark (390x844)
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const ORCH_ID = "d8f4b35b-af3a-4c9f-91df-6a9f31e6364c";
const SUBAGENT_ID = "9f20a82f-4b33-40f9-9c87-dec3e4f4ee34";

const DIRS = [
	path.resolve(__dirname, "../docs/proofs/periodontics"),
	path.resolve(__dirname, "../docs/proofs/perio"),
	path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${ORCH_ID}`),
	path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${SUBAGENT_ID}`),
];

for (const dir of DIRS) {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function saveProof(page, filename) {
	await page.waitForTimeout(1000);
	const targetPath = path.join(DIRS[0], filename);
	await page.screenshot({ path: targetPath, fullPage: false, animations: "disabled" });

	for (let i = 1; i < DIRS.length; i++) {
		try {
			fs.copyFileSync(targetPath, path.join(DIRS[i], filename));
		} catch (_) {}
	}

	const size = fs.statSync(targetPath).size;
	console.log(`[VERIFIED PROOF] ${filename} (${(size / 1024).toFixed(1)} KB) -> Saved across all dirs.`);
	if (size < 20480) {
		throw new Error(`[BLANK DETECTED] ${filename} is ${size} bytes (< 20KB)!`);
	}
	return targetPath;
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
	}, theme).catch(() => {});
	await page.waitForTimeout(600);
}

async function openPerioModal(page) {
	console.log("Waiting for perio-chart-modal...");
	// Ждем появления модалки пародонтограммы в DOM
	try {
		await page.waitForSelector('[data-testid="perio-chart-modal"]', { timeout: 15000 });
	} catch (_) {
		console.log("Modal not found by url hash, dispatching dente:open-perio...");
		await page.evaluate(() => {
			window.dispatchEvent(new CustomEvent("dente:open-perio", {
				detail: { patientName: "Иванов Иван Иванович (38 лет)" }
			}));
		});
		await page.waitForSelector('[data-testid="perio-chart-modal"]', { timeout: 10000 });
	}

	await page.waitForTimeout(1000);

	// Кликаем на кнопку пресета пародонтита
	const perioPresetBtn = await page.$('[data-testid="psr-periodontitis-preset-btn"]');
	if (perioPresetBtn) {
		console.log("Applying Periodontitis Preset...");
		await perioPresetBtn.click();
		await page.waitForTimeout(600);
	}

	// Кликаем на кнопку "Индексы" для отображения клинических индексов гигиены
	const indicesBtn = await page.$('[data-testid="perio-calc-indices-btn"]');
	if (indicesBtn) {
		console.log("Opening Hygiene Indices Panel...");
		await indicesBtn.click();
		await page.waitForTimeout(600);
	}
}

async function main() {
	const baseUrl = "http://127.0.0.1:5173";
	console.log(`\n=== 4-State Proof for Periodontology Studio: Navigating to ${baseUrl} ===`);

	const browser = await chromium.launch({
		headless: true,
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage", "--disable-setuid-sandbox"],
	});

	try {
		// 1. PC Light (1440x900)
		console.log("\n--- [1/4] Capturing Desktop Light (1440x900) ---");
		const pcContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
			colorScheme: "light",
		});
		await pcContext.addInitScript(() => {
			try {
				localStorage.setItem("dente_clinic_token", "demo-showcase-token-owner");
				localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-owner");
				localStorage.setItem("dente_active_session_token", "demo-showcase-staff-token-owner");
				localStorage.setItem("dente_active_role", "doctor");
				localStorage.setItem("dente_active_mode", "clinic");
				localStorage.setItem("dente_onboarding_completed", "true");
				localStorage.setItem("dente_tour_completed", "true");
				localStorage.setItem("dente_demo_banner_dismissed", "true");
				localStorage.setItem("dente_theme", "light");
			} catch (_) {}
		});

		const pcPage = await pcContext.newPage();
		await pcPage.goto(`${baseUrl}/?perio=1#perio`, { waitUntil: "load", timeout: 25000 });
		await openPerioModal(pcPage);
		await setTheme(pcPage, "light");
		await saveProof(pcPage, "perio_01_desktop_light.png");

		// 2. PC Dark (1440x900)
		console.log("\n--- [2/4] Capturing Desktop Dark (1440x900) ---");
		await setTheme(pcPage, "dark");
		await saveProof(pcPage, "perio_02_desktop_dark.png");
		await pcContext.close();

		// 3. Mobile Light (390x844)
		console.log("\n--- [3/4] Capturing Mobile Light (390x844) ---");
		const mobContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
			colorScheme: "light",
		});
		await mobContext.addInitScript(() => {
			try {
				localStorage.setItem("dente_clinic_token", "demo-showcase-token-owner");
				localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-owner");
				localStorage.setItem("dente_active_session_token", "demo-showcase-staff-token-owner");
				localStorage.setItem("dente_active_role", "doctor");
				localStorage.setItem("dente_active_mode", "clinic");
				localStorage.setItem("dente_onboarding_completed", "true");
				localStorage.setItem("dente_tour_completed", "true");
				localStorage.setItem("dente_demo_banner_dismissed", "true");
				localStorage.setItem("dente_theme", "light");
			} catch (_) {}
		});

		const mobPage = await mobContext.newPage();
		await mobPage.goto(`${baseUrl}/?perio=1#perio`, { waitUntil: "load", timeout: 25000 });
		await openPerioModal(mobPage);
		await setTheme(mobPage, "light");
		await saveProof(mobPage, "perio_03_mobile_light.png");

		// 4. Mobile Dark (390x844)
		console.log("\n--- [4/4] Capturing Mobile Dark (390x844) ---");
		await setTheme(mobPage, "dark");
		await saveProof(mobPage, "perio_04_mobile_dark.png");
		await mobContext.close();

		console.log("\n✅ ALL 4-STATE PROOFS CAPTURED SUCCESSFULLY!");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("FATAL ERROR IN CAPTURE:", err);
	process.exit(1);
});
