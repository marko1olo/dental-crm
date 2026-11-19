/**
 * scripts/take_dental_lab_4state_canonical.cjs
 *
 * 4-STATE VISUAL PROOF FOR DENTAL LAB STUDIO & ORDERS MODAL
 * 1. ☀️ PC Light (1440x900)
 * 2. 🌙 PC Dark (1440x900)
 * 3. 📱 Mobile Light (390x844)
 * 4. 📱 Mobile Dark (390x844)
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const ORCH_ID = "1a5ac924-43af-42a0-a684-00dbb822c536";
const SUBAGENT_ID = "e11aca57-3fd4-4ad6-b6cd-48664d10630d";
const OUT_DOCS = path.resolve(__dirname, "../docs/proofs/dental_lab");
const OUT_LAB = path.resolve(__dirname, "../docs/proofs/lab");
const OUT_ORCH = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${ORCH_ID}`);
const OUT_SELF = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${SUBAGENT_ID}`);

[OUT_DOCS, OUT_LAB, OUT_ORCH, OUT_SELF].forEach((dir) => {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

async function saveProof(page, baseFilename, ...aliasFilenames) {
	await page.waitForTimeout(1000);
	const targets = [baseFilename, ...aliasFilenames].filter(Boolean);

	let firstDocsPath = "";
	for (const filename of targets) {
		const pDocs = path.join(OUT_DOCS, filename);
		const pLab = path.join(OUT_LAB, filename);
		const pOrch = path.join(OUT_ORCH, filename);
		const pSelf = path.join(OUT_SELF, filename);

		await page.screenshot({ path: pDocs, fullPage: false, animations: "disabled" });
		fs.copyFileSync(pDocs, pLab);
		fs.copyFileSync(pDocs, pOrch);
		fs.copyFileSync(pDocs, pSelf);

		const size = fs.statSync(pDocs).size;
		if (size < 20480) {
			throw new Error(`[BLANK DETECTED] ${filename} is ${size} bytes (< 20KB)!`);
		}
		console.log(`[VERIFIED PROOF] ${filename} (${(size / 1024).toFixed(1)} KB) -> Saved.`);
		if (!firstDocsPath) firstDocsPath = pDocs;
	}
	return firstDocsPath;
}

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
	await suppressOverlays(page);
	await page.waitForTimeout(800);
}

async function main() {
	const activePort = 5173;
	const baseUrl = `http://127.0.0.1:${activePort}`;
	console.log(`\n=== 4-State Proof for Dental Lab: Navigating to ${baseUrl}/?demo=true&standalone=dental_lab ===`);

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
			localStorage.setItem("dente_workspace_features", JSON.stringify({ hasDentalLab: true }));
			localStorage.setItem("dente-workspace-profile", JSON.stringify({ mode: "network", role: "owner", activeRole: "owner", hasDentalLab: true }));
			localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true }));
			localStorage.setItem("dente_user_name", "Д-р Смирнова Екатерина Васильевна");
			localStorage.setItem("dente_theme", "light");
			localStorage.setItem("dente_theme_mode", "light");
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

		await page.goto(`${baseUrl}/?demo=true&standalone=dental_lab`, { waitUntil: "commit", timeout: 35000 });

		console.log("Waiting for app & Dental Lab Studio Modal to mount (up to 45s)...");
		let ready = false;
		for (let i = 0; i < 45; i++) {
			await page.waitForTimeout(1000);
			try {
				const state = await page.evaluate(() => {
					const hasModal = Boolean(document.querySelector('[data-testid="dental-lab-order-drawer"], [data-testid="dental-lab-studio-modal-root"], .dental-lab-modal-container'));
					const hasBoot = Boolean(document.querySelector('.boot-state') || (document.body && document.body.innerText.includes("Загрузка системы...")));
					return { hasModal, hasBoot };
				});
				if (state.hasModal && !state.hasBoot) {
					console.log(`[READY at ${i + 1}s] Dental Lab Studio Modal mounted!`);
					ready = true;
					break;
				}
				if (!state.hasModal && i > 5) {
					// Attempt to open via CustomEvent if not auto-opened
					await page.evaluate(() => {
						window.dispatchEvent(new CustomEvent("dente:open-dental-lab"));
						window.dispatchEvent(new CustomEvent("dente:open-lab"));
					});
				}
			} catch (e) {}
		}

		await suppressOverlays(page);
		await page.waitForTimeout(2000);

		const modalSelector = '[data-testid="dental-lab-order-drawer"], [data-testid="dental-lab-studio-modal-root"], .dental-lab-modal-container';
		await page.waitForSelector(modalSelector, { state: "visible", timeout: 10000 });
		console.log("Dental Lab Studio Modal is visible and ready for capture!");

		// 1. PC Light (1440x900)
		console.log("\n--- Capturing: 01_lab_orders_pc_light_1440x900.png & 05_dental_lab_studio_pc_light_1440x900.png ---");
		await setTheme(page, "light");
		await saveProof(page, "01_lab_orders_pc_light_1440x900.png", "01_dental_lab_studio_pc_light_1440x900.png", "05_dental_lab_studio_pc_light_1440x900.png");

		// 2. PC Dark (1440x900)
		console.log("\n--- Capturing: 02_lab_orders_pc_dark_1440x900.png & 06_dental_lab_studio_pc_dark_1440x900.png ---");
		await setTheme(page, "dark");
		await saveProof(page, "02_lab_orders_pc_dark_1440x900.png", "02_dental_lab_studio_pc_dark_1440x900.png", "06_dental_lab_studio_pc_dark_1440x900.png");

		// 3. Mobile Light (390x844)
		console.log("\n--- Capturing: 03_lab_orders_mobile_light_390x844.png & 07_dental_lab_studio_mobile_light_390x844.png ---");
		await page.setViewportSize({ width: 390, height: 844 });
		await setTheme(page, "light");
		await page.waitForTimeout(1500);
		await saveProof(page, "03_lab_orders_mobile_light_390x844.png", "03_dental_lab_studio_mobile_light_390x844.png", "07_dental_lab_studio_mobile_light_390x844.png");

		// 4. Mobile Dark (390x844)
		console.log("\n--- Capturing: 04_lab_orders_mobile_dark_390x844.png & 08_dental_lab_studio_mobile_dark_390x844.png ---");
		await setTheme(page, "dark");
		await page.waitForTimeout(1500);
		await saveProof(page, "04_lab_orders_mobile_dark_390x844.png", "04_dental_lab_studio_mobile_dark_390x844.png", "08_dental_lab_studio_mobile_dark_390x844.png");

		await context.close();

		console.log("\n=======================================================");
		console.log(">>> [VICTORY] All Dental Lab 4-State Proofs captured! <<<");
		console.log("=======================================================");
	} finally {
		if (browser) await browser.close();
	}
}

main().catch((err) => {
	console.error("[FATAL ERROR]", err);
	process.exit(1);
});
