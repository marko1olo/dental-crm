const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const ORCH_ID = "1a5ac924-43af-42a0-a684-00dbb822c536";
const SUBAGENT_ID = "e11aca57-3fd4-4ad6-b6cd-48664d10630d";
const OUT_DOCS = path.resolve(__dirname, "../docs/proofs/dental_lab");
const OUT_ORCH = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${ORCH_ID}`);
const OUT_SELF = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${SUBAGENT_ID}`);

[OUT_DOCS, OUT_ORCH, OUT_SELF].forEach((dir) => {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

async function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForAppReady(page) {
	for (let i = 0; i < 40; i++) {
		const offlineBtn = page.locator('button:has-text("Перейти в автономный режим")');
		if ((await offlineBtn.count()) > 0 && (await offlineBtn.first().isVisible())) {
			console.log("[Browser] Clicking offline autonomy button...");
			await offlineBtn.first().click({ force: true });
			await sleep(600);
		}
		const hasLoading = await page.evaluate(() => {
			const text = document.body ? document.body.innerText : "";
			return text.includes("Загрузка CRM") || text.includes("Загрузка системы");
		}).catch(() => true);

		const hasDrawer = await page.$("[data-testid='standalone-quick-booking-root']");
		if (!hasLoading && hasDrawer) {
			console.log(`[Browser] Drawer fully mounted and ready! (loop ${i})`);
			return;
		}
		await sleep(800);
	}
}

async function captureState(page, filename) {
	await sleep(1000);
	const pDocs = path.join(OUT_DOCS, filename);
	const pOrch = path.join(OUT_ORCH, filename);
	const pSelf = path.join(OUT_SELF, filename);

	await page.screenshot({ path: pDocs, fullPage: false, animations: "disabled" });
	fs.copyFileSync(pDocs, pOrch);
	fs.copyFileSync(pDocs, pSelf);

	const size = fs.statSync(pDocs).size;
	console.log(`Saved ${filename} (${(size / 1024).toFixed(1)} KB)`);
	if (size < 20480) {
		throw new Error(`[BLANK DETECTED] ${filename} is ${size} bytes (< 20KB)!`);
	}
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
	}, theme);
	await sleep(600);
}

async function main() {
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	try {
		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
			colorScheme: "light",
		});

		await context.addInitScript(() => {
			sessionStorage.setItem("dente:sw-controller-reload", "1");
			sessionStorage.setItem("dente_unlocked", "true");
			localStorage.setItem("dente_clinic_token", "demo-clinic-token-12345");
			localStorage.setItem("dente_staff_token", "demo-staff-token-12345");
			localStorage.setItem("dente_active_session_token", "demo-staff-token-12345");
			localStorage.setItem("dente_active_user_id", "doc-1");
			localStorage.setItem("dente_active_role", "doctor");
			localStorage.setItem("dente_active_mode", "doctor");
			localStorage.setItem("dente_user_id", "doc-1");
			localStorage.setItem("dente_user_role", "doctor");
			localStorage.setItem("dente_token", "demo_dev_doctor_token");
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_tour_finished", "true");
			localStorage.setItem("dente_tour_dismissed", "true");
			localStorage.setItem("dente_offline_autonomy_mode", "true");
			localStorage.setItem("dente_demo_showcase", "true");
			localStorage.setItem("dente_demo_showcase_mode", "true");
			localStorage.setItem("dente_demo_mode", "true");
			localStorage.setItem("dente_theme", "light");
			localStorage.setItem("dente_theme_mode", "light");
			localStorage.setItem("theme", "light");
		});

		const page = await context.newPage();
		const targetUrl = "http://127.0.0.1:5173/?demo=true&standalone=quick-booking&patientId=01a00000-0000-0000-0000-000000000002&patientName=%D0%92%D0%BE%D1%80%D0%BE%D0%BD%D0%BE%D0%B2+%D0%94%D0%BC%D0%B8%D1%82%D1%80%D0%B8%D0%B9+%D0%98%D0%B3%D0%BE%D1%80%D0%B5%D0%B2%D0%B8%D1%87&startsAt=2026-11-04T10:00:00.000Z";
		console.log(`Navigating to ${targetUrl}...`);
		await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 35000 });
		await waitForAppReady(page);

		await page.waitForSelector("[data-testid='quick-booking-lab-collision-alert']", { state: "visible", timeout: 15000 });
		await sleep(1000);

		// Suppress toasts or banners
		await page.evaluate(() => {
			const style = document.createElement("style");
			style.innerHTML = `
				.tour-spotlight-root, .tour-backdrop-clickable-zone,
				[data-testid="guided-tour-spotlight-overlay"],
				[data-testid="guided-tour-coach-mark-card"],
				[data-testid="demo-mode-banner"], .global-toast-container,
				vite-error-overlay { display: none !important; pointer-events: none !important; }
			`;
			document.head.appendChild(style);
		});

		// 1. Light theme
		await setTheme(page, "light");
		await captureState(page, "09_quick_booking_lab_collision_pc_light.png");

		// 2. Dark theme
		await setTheme(page, "dark");
		await captureState(page, "10_quick_booking_lab_collision_pc_dark.png");

	} finally {
		await browser.close();
	}
}

main().catch(err => {
	console.error(err);
	process.exit(1);
});
