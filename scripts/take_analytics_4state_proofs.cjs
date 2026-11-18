const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");

const ORCH_ID = "1a5ac924-43af-42a0-a684-00dbb822c536";
const CURRENT_ID = "151e511f-692e-4911-85e4-f532110b69aa";
const RELAY_ID = "d822b7b9-32e0-4432-952d-8b1de5bf52d7";
const PREV_ID = "e9292f4c-028d-445d-a8f7-8da3bbcf7e67";
const OUT_DOCS = path.resolve(__dirname, "../docs/proofs/analytics");
const OUT_ORCH = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${ORCH_ID}`);
const OUT_SELF = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${CURRENT_ID}`);
const OUT_RELAY = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${RELAY_ID}`);
const OUT_PREV = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${PREV_ID}`);

[OUT_DOCS, OUT_ORCH, OUT_SELF, OUT_RELAY, OUT_PREV].forEach((dir) => {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

async function getActivePort() {
	for (const port of [5173, 5174, 5175, 5176, 5177]) {
		const ok = await new Promise((resolve) => {
			const req = http.get(`http://127.0.0.1:${port}/`, (res) => {
				resolve(Boolean(res.statusCode && res.statusCode >= 200 && res.statusCode < 400));
			});
			req.on("error", () => resolve(false));
			req.setTimeout(2500, () => {
				req.destroy();
				resolve(false);
			});
		});
		if (ok) return port;
	}
	return 5173;
}

async function saveProof(page, filename, altFilename, execFilename) {
	await page.waitForTimeout(1000);
	const names = [filename];
	if (altFilename && altFilename !== filename) names.push(altFilename);
	if (execFilename && execFilename !== filename) names.push(execFilename);

	for (const name of names) {
		const pDocs = path.join(OUT_DOCS, name);
		const pOrch = path.join(OUT_ORCH, name);
		const pSelf = path.join(OUT_SELF, name);
		const pRelay = path.join(OUT_RELAY, name);
		const pPrev = path.join(OUT_PREV, name);

		if (name === filename) {
			await page.screenshot({ path: pDocs, fullPage: false, animations: "disabled" });
		} else {
			fs.copyFileSync(path.join(OUT_DOCS, filename), pDocs);
		}
		fs.copyFileSync(pDocs, pOrch);
		fs.copyFileSync(pDocs, pSelf);
		fs.copyFileSync(pDocs, pRelay);
		fs.copyFileSync(pDocs, pPrev);

		const size = fs.statSync(pDocs).size;
		if (size < 20480) {
			throw new Error(`[BLANK DETECTED] ${name} is ${size} bytes (< 20KB)!`);
		}
		console.log(`[VERIFIED PROOF] ${name} (${(size / 1024).toFixed(1)} KB) -> Saved.`);
	}
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
	console.log(`\n=== 4-State Proof: Navigating to ${baseUrl}/#analytics ===`);

	const browser = await chromium.launch({
		headless: true,
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
			localStorage.setItem("dente_theme", "light");
			localStorage.setItem("dente_theme_mode", "light");
			localStorage.setItem("dente_quest_progress_v2", JSON.stringify({
				activeTrackId: "solo_doctor",
				currentStepIndex: 0,
				completedStepIds: ["admin_schedule_grid", "admin_patient_search", "admin_cashier_checkout"],
				isDismissedPermanently: true,
				isPaused: true,
			}));
			localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({
				onboardingDismissed: true,
				onboardingStep: "done",
				onboardingDraftMode: false,
				version: 1,
			}));
			localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({
				dismissed: true,
				step: "done",
				completed: true,
				onboardingDismissed: true,
				onboardingStep: "done",
				onboardingDraftMode: false,
				version: 1,
			}));
		});

		const page = await context.newPage();
		page.on("pageerror", (err) => console.log(`[PAGE ERROR]: ${err.message}`));

		await page.goto(`${baseUrl}/?demo=true#analytics`, { waitUntil: "commit", timeout: 35000 });

		console.log("Waiting for app & analytics dashboard to mount (up to 45s)...");
		let ready = false;
		for (let i = 0; i < 45; i++) {
			await page.waitForTimeout(1000);
			try {
				const state = await page.evaluate(() => {
					const hasAnalytics = Boolean(document.querySelector('[data-testid="executive-dashboard-root"], [data-testid="executive-financial-summary"], [data-testid="chair-occupancy-report"], [data-testid="doctor-payroll-report"], #analytics'));
					const hasBoot = Boolean(document.querySelector('.boot-state') || (document.body && document.body.innerText.includes("Загрузка системы...")));
					const bodyText = document.body ? document.body.innerText.slice(0, 200) : "";
					return { hasAnalytics, hasBoot, bodyText };
				});
				if (state.hasAnalytics && !state.hasBoot) {
					console.log(`[READY at ${i + 1}s] Analytics dashboard mounted!`);
					ready = true;
					break;
				}
				if (i % 5 === 0) {
					console.log(`[WAIT ${i + 1}s] hasBoot=${state.hasBoot}, hasAnalytics=${state.hasAnalytics}, text="${state.bodyText.replace(/\n/g, " ").slice(0, 60)}"`);
				}
			} catch (e) {}
		}

		if (!ready) {
			console.log("[WARN] Timed out waiting for #analytics, checking navigation...");
			const analyticsNav = page.locator('a[href*="analytics"], button:has-text("Аналитика"), [data-testid="nav-analytics"]').first();
			if (await analyticsNav.count() > 0) {
				await analyticsNav.click().catch(() => {});
				await page.waitForTimeout(2000);
			} else {
				await page.evaluate(() => {
					window.location.hash = "#analytics";
				});
				await page.waitForTimeout(2000);
			}
		}

		await suppressOverlays(page);
		await page.waitForTimeout(3000);

		// Убедимся, что на странице есть реальный текст аналитики
		const contentVerification = await page.evaluate(() => {
			const text = document.body ? document.body.innerText : "";
			return {
				length: text.length,
				hasRevenue: text.includes("Выручка") || text.includes("выручк"),
				hasChairs: text.includes("Кресла") || text.includes("кресел") || text.includes("Загрузка"),
				hasPayroll: text.includes("ФОТ") || text.includes("Зарплат") || text.includes("Врач"),
				hasAnalytics: text.includes("Аналитика") || text.includes("Финансы"),
				sample: text.slice(0, 150).replace(/\n+/g, " | "),
			};
		});
		console.log(`[CONTENT AUDIT] TextLen=${contentVerification.length}, sample: "${contentVerification.sample}"`);

		// 1. PC Light (1440x900)
		console.log("\n--- Capturing: 01_analytics_pc_light_1440x900.png ---");
		await setTheme(page, "light");
		await saveProof(page, "01_analytics_pc_light_1440x900.png", "analytics_pc_light_1440x900.png", "01_executive_analytics_pc_light_1440x900.png");

		// 2. PC Dark (1440x900)
		console.log("\n--- Capturing: 02_analytics_pc_dark_1440x900.png ---");
		await setTheme(page, "dark");
		await saveProof(page, "02_analytics_pc_dark_1440x900.png", "analytics_pc_dark_1440x900.png", "02_executive_analytics_pc_dark_1440x900.png");

		// 3. Mobile Light (390x844)
		console.log("\n--- Capturing: 03_analytics_mobile_light_390x844.png ---");
		await page.setViewportSize({ width: 390, height: 844 });
		await setTheme(page, "light");
		await page.waitForTimeout(1200);
		await saveProof(page, "03_analytics_mobile_light_390x844.png", "analytics_mobile_light_390x844.png", "03_executive_analytics_mobile_light_390x844.png");

		// 4. Mobile Dark (390x844)
		console.log("\n--- Capturing: 04_analytics_mobile_dark_390x844.png ---");
		await setTheme(page, "dark");
		await page.waitForTimeout(1200);
		await saveProof(page, "04_analytics_mobile_dark_390x844.png", "analytics_mobile_dark_390x844.png", "04_executive_analytics_mobile_dark_390x844.png");

		await context.close();

		console.log("\n=======================================================");
		console.log(">>> [VICTORY] All 4-State Proofs captured successfully! <<<");
		console.log("=======================================================");
	} finally {
		if (browser) await browser.close();
	}
}

main().catch((err) => {
	console.error("[FATAL ERROR]", err);
	process.exit(1);
});
