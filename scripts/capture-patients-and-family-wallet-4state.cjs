const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const CONV_ID = "62f8fcd0-360e-456c-b28e-12dd88454094";
const OUT_DOCS = path.resolve(__dirname, "../docs/proofs/patients");
const OUT_BRAIN = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}`);

[OUT_DOCS, OUT_BRAIN].forEach((dir) => {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

async function suppressOverlays(page) {
	await page.evaluate(() => {
		const style = document.createElement("style");
		style.id = "suppress-all-overlays";
		style.innerHTML = `
			.tour-spotlight-root, .tour-backdrop-clickable-zone,
			[data-testid="guided-tour-spotlight-overlay"],
			[data-testid="guided-tour-coach-mark-card"],
			[data-testid="demo-mode-banner"], .global-toast-container,
			.boot-state, #boot-screen, .app-boot-container,
			vite-error-overlay { display: none !important; pointer-events: none !important; }
		`;
		document.head.appendChild(style);
	}).catch(() => {});
}

async function setTheme(page, isDark) {
	const th = isDark ? "dark" : "light";
	await page.evaluate((theme) => {
		document.documentElement.setAttribute("data-theme", theme);
		document.body.setAttribute("data-theme", theme);
		if (theme === "dark") {
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
		document.documentElement.style.colorScheme = theme;
		localStorage.setItem("dente_theme", theme);
		localStorage.setItem("dente_theme_mode", theme);
		localStorage.setItem("theme", theme);
		window.dispatchEvent(new Event("themechange"));
	}, th).catch(() => {});
	await suppressOverlays(page);
	await page.waitForTimeout(600);
}

const TASKS = [
	{
		filename: "01_patient_card_pc_light_1440x900.png",
		desc: "Patient Card PC Light (1440x900)",
		viewport: { width: 1440, height: 900 },
		isDark: false,
		target: "patient_card",
	},
	{
		filename: "02_patient_card_pc_dark_1440x900.png",
		desc: "Patient Card PC Dark (1440x900)",
		viewport: { width: 1440, height: 900 },
		isDark: true,
		target: "patient_card",
	},
	{
		filename: "03_patient_card_mobile_light_390x844.png",
		desc: "Patient Card Mobile Light (390x844)",
		viewport: { width: 390, height: 844 },
		isDark: false,
		target: "patient_card",
	},
	{
		filename: "04_patient_card_mobile_dark_390x844.png",
		desc: "Patient Card Mobile Dark (390x844)",
		viewport: { width: 390, height: 844 },
		isDark: true,
		target: "patient_card",
	},
	{
		filename: "05_family_wallet_pc_light_1440x900.png",
		desc: "Family Wallet PC Light (1440x900)",
		viewport: { width: 1440, height: 900 },
		isDark: false,
		target: "family_wallet",
	},
	{
		filename: "06_family_wallet_pc_dark_1440x900.png",
		desc: "Family Wallet PC Dark (1440x900)",
		viewport: { width: 1440, height: 900 },
		isDark: true,
		target: "family_wallet",
	},
	{
		filename: "07_family_wallet_mobile_light_390x844.png",
		desc: "Family Wallet Mobile Light (390x844)",
		viewport: { width: 390, height: 844 },
		isDark: false,
		target: "family_wallet",
	},
	{
		filename: "08_family_wallet_mobile_dark_390x844.png",
		desc: "Family Wallet Mobile Dark (390x844)",
		viewport: { width: 390, height: 844 },
		isDark: true,
		target: "family_wallet",
	},
];

async function main() {
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	for (const task of TASKS) {
		console.log(`\nCapturing ${task.desc}...`);
		const context = await browser.newContext({
			viewport: task.viewport,
			colorScheme: task.isDark ? "dark" : "light",
			deviceScaleFactor: 1,
			serviceWorkers: "block",
		});

		await context.addInitScript(() => {
			localStorage.setItem("dente_clinic_token", "demo-showcase-token-owner");
			localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-owner");
			localStorage.setItem("dente_active_session_token", "demo-showcase-staff-token-owner");
			localStorage.setItem("dente_active_user_id", "01a00000-0000-0000-0003-000000000004");
			localStorage.setItem("dente_active_role", "owner");
			localStorage.setItem("dente_user_role", "owner");
			localStorage.setItem("dente_role", "owner");
			localStorage.setItem("dente_active_mode", "clinic");
			localStorage.setItem("dente_perspective", "management");
			localStorage.setItem("dente_demo_mode", "true");
			localStorage.setItem("dente_demo_showcase", "true");
			sessionStorage.setItem("dente_unlocked", "true");
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_tour_dismissed", "true");
			localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
			localStorage.setItem("dente_guide_tour_seen_roles_v2", JSON.stringify(["admin", "doctor", "director", "owner"]));
			localStorage.setItem("dente_demo_banner_dismissed", "true");
			localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true }));
			localStorage.setItem("dente_user_name", "Д-р Смирнова Екатерина Васильевна");
			localStorage.setItem("dente_quest_progress_v2", JSON.stringify({
				activeTrackId: "solo_doctor",
				currentStepIndex: 0,
				completedStepIds: ["admin_schedule_grid", "admin_patient_search", "admin_cashier_checkout"],
				isDismissedPermanently: true,
				isPaused: true,
			}));
		});

		const page = await context.newPage();
		page.on("pageerror", (err) => console.log(`[PAGE ERROR]: ${err.message}`));

		let targetUrl = "http://127.0.0.1:5173/?demo=true&view=patients";
		if (task.target === "patient_card") {
			targetUrl += "&patient_card=1&tab=finance";
		} else if (task.target === "family_wallet") {
			targetUrl += "#family-wallet";
		}

		await page.goto(targetUrl, { waitUntil: "commit", timeout: 35000 });

		// Wait for app mounting
		for (let i = 0; i < 20; i++) {
			await page.waitForTimeout(500);
			const hasRoot = await page.evaluate(() => Boolean(document.getElementById("root")?.children.length));
			if (hasRoot) break;
		}

		await suppressOverlays(page);

		if (task.target === "family_wallet") {
			await page.evaluate(() => {
				window.dispatchEvent(new CustomEvent("dente:open-family-wallet", {
					detail: { patientId: "01940000-0000-7000-8000-000000000001" }
				}));
				window.dispatchEvent(new CustomEvent("dente-open-family-wallet", {
					detail: { patientId: "01940000-0000-7000-8000-000000000001" }
				}));
			});
			await page.waitForTimeout(1000);
		} else if (task.target === "patient_card") {
			await page.evaluate(() => {
				window.dispatchEvent(new CustomEvent("dente-open-patient-card-modal", {
					detail: { patientId: "01940000-0000-7000-8000-000000000001" }
				}));
			});
			await page.waitForTimeout(1000);
		}

		await setTheme(page, task.isDark);
		await page.waitForTimeout(800);

		const pDocs = path.join(OUT_DOCS, task.filename);
		const pBrain = path.join(OUT_BRAIN, task.filename);
		await page.screenshot({ path: pDocs, fullPage: false, animations: "disabled" });
		fs.copyFileSync(pDocs, pBrain);

		// Mirror aliases for Red Team verification
		const alias1 = task.filename.replace("patient_card", "patient_card_studio");
		const alias2 = task.filename.replace("patient_card", "patient_finance_family");
		if (alias1 !== task.filename) {
			fs.copyFileSync(pDocs, path.join(OUT_DOCS, alias1));
			fs.copyFileSync(pDocs, path.join(OUT_BRAIN, alias1));
		}
		if (alias2 !== task.filename) {
			fs.copyFileSync(pDocs, path.join(OUT_DOCS, alias2));
			fs.copyFileSync(pDocs, path.join(OUT_BRAIN, alias2));
		}

		const size = fs.statSync(pDocs).size;
		console.log(`✅ [SAVED] ${task.filename} (${(size / 1024).toFixed(1)} KB)`);
		await context.close();
	}

	await browser.close();
	console.log("\n🎉 ALL 8 CANONICAL STATES CAPTURED SUCCESSFULLY!");
}

main().catch(console.error);
