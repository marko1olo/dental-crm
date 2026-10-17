import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:5174";
const PROOFS_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/orthopedics";

mkdirSync(PROOFS_DIR, { recursive: true });

const browserCandidates = [
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
	"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];
const executablePath = browserCandidates.find((p) => existsSync(p));
if (!executablePath) {
	throw new Error("No browser executable found in candidates");
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
	console.log("🚀 Launching browser for Orthopedics 4-State Proofs:", executablePath);

	const browser = await chromium.launch({
		executablePath,
		headless: true,
		args: [
			"--no-sandbox",
			"--disable-setuid-sandbox",
			"--disable-dev-shm-usage",
			"--disable-gpu",
		],
	});

	const states = [
		{
			id: "pc_light_1440x900",
			width: 1440,
			height: 900,
			scale: 1,
			isMobile: false,
			theme: "light",
			file: "pc_light_1440x900.png",
		},
		{
			id: "pc_dark_1440x900",
			width: 1440,
			height: 900,
			scale: 1,
			isMobile: false,
			theme: "dark",
			file: "pc_dark_1440x900.png",
		},
		{
			id: "mobile_light_390x844",
			width: 390,
			height: 844,
			scale: 2,
			isMobile: true,
			theme: "light",
			file: "mobile_light_390x844.png",
		},
		{
			id: "mobile_dark_390x844",
			width: 390,
			height: 844,
			scale: 2,
			isMobile: true,
			theme: "dark",
			file: "mobile_dark_390x844.png",
		},
	];

	for (const state of states) {
		console.log(`\n📸 Capturing ${state.id} (${state.width}x${state.height}, theme=${state.theme})...`);

		const context = await browser.newContext({
			viewport: { width: state.width, height: state.height },
			deviceScaleFactor: state.scale,
			isMobile: state.isMobile,
			hasTouch: state.isMobile,
			colorScheme: state.theme,
		});

		const page = await context.newPage();

		page.on("console", (msg) => console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`));
		page.on("pageerror", (err) => console.error(`[Browser PageError]:`, err));

		await page.addInitScript(
			({ t }) => {
				localStorage.setItem("dente_clinic_token", "demo-token");
				localStorage.setItem("dente_staff_token", "demo-token");
				localStorage.setItem("dente_theme", t);
				localStorage.setItem("dente_theme_mode", t);
				localStorage.setItem(
					"dente_ui_preferences_v1",
					JSON.stringify({ onboardingDismissed: true, theme: t }),
				);
			},
			{ t: state.theme },
		);

		await page.goto(`${BASE_URL}/?standalone=orthopedics&theme=${state.theme}`, {
			waitUntil: "commit",
			timeout: 60000,
		});

		// Ждём реального монтирования рабочего кокпита ортопедии
		console.log("Waiting for orthopedics-standalone-workspace to mount...");
		await page.waitForSelector('[data-testid="orthopedics-standalone-workspace"]', {
			timeout: 60000,
		});
		console.log("Mounted successfully!");

		await sleep(800);

		// Принудительно устанавливаем тему
		await page.evaluate(({ t }) => {
			document.documentElement.setAttribute("data-theme", t);
			if (t === "dark") {
				document.documentElement.classList.add("dark");
				document.documentElement.classList.remove("light");
				document.body.className = "dark";
				document.documentElement.style.colorScheme = "dark";
			} else {
				document.documentElement.classList.remove("dark");
				document.documentElement.classList.add("light");
				document.body.className = "light";
				document.documentElement.style.colorScheme = "light";
			}
		}, { t: state.theme });

		await sleep(300);

		// Если это PC Dark или Mobile Dark — откроем шкалу культи ND и кликнем на ND3
		const stumpTab = page.locator('[data-testid="vita-stump-tab"]');
		if (await stumpTab.count() > 0 && await stumpTab.isVisible()) {
			await stumpTab.click();
			await sleep(300);
			const nd3Btn = page.locator('button:has-text("ND3")');
			if (await nd3Btn.count() > 0) {
				await nd3Btn.first().click();
				await sleep(200);
			}
		}

		const outPath = path.join(PROOFS_DIR, state.file);
		await page.screenshot({ path: outPath, fullPage: false });
		console.log(`✅ Saved: ${outPath}`);

		await context.close();
	}

	// Дополнительный скриншот: открытый Гарантийный Паспорт А4 с QR-кодом
	console.log("\n📸 Capturing Orthopedic Passport A4 Modal with QR code (PC Light)...");
	const passportContext = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 1,
		isMobile: false,
		colorScheme: "light",
	});
	const passportPage = await passportContext.newPage();
	await passportPage.addInitScript(() => {
		localStorage.setItem("dente_clinic_token", "demo-token");
		localStorage.setItem("dente_staff_token", "demo-token");
		localStorage.setItem("dente_theme", "light");
	});

	try {
		await passportPage.goto(`${BASE_URL}/?standalone=orthopedics&theme=light`, {
			waitUntil: "domcontentloaded",
			timeout: 30000,
		});
		await passportPage.waitForLoadState("domcontentloaded");
		await sleep(1000);

		// Кликаем на кнопку открытия гарантийного паспорта
		const passportBtn = passportPage.locator('[data-testid="open-orthopedic-passport-btn"]');
		if (await passportBtn.count() > 0 && await passportBtn.isVisible()) {
			await passportBtn.click();
			await sleep(800);
			const passportOut = path.join(PROOFS_DIR, "passport_a4_qr_pc_light.png");
			await passportPage.screenshot({ path: passportOut, fullPage: false });
			console.log(`✅ Saved Passport Modal: ${passportOut}`);
		}
	} catch (err) {
		console.warn("⚠️ Passport capture error:", err.message);
	}

	await passportContext.close();
	await browser.close();
	console.log("\n🎉 ALL 4-STATE ORTHOPEDICS PROOFS CAPTURED SUCCESSFULLY!");
}

run().catch((err) => {
	console.error("❌ Capture failed:", err);
	process.exit(1);
});
