import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function getLiveBaseUrl() {
	for (const port of [5173, 5174, 5175]) {
		try {
			const res = await fetch(`http://127.0.0.1:${port}/`);
			if (res.ok) {
				console.log(`✓ Detected live Vite web server at http://127.0.0.1:${port}`);
				return `http://127.0.0.1:${port}`;
			}
		} catch (_) {}
	}
	return "http://127.0.0.1:5173";
}

async function captureLiveLabProofs() {
	const proofsDir = path.resolve(__dirname, "../docs/proofs/lab");
	fs.mkdirSync(proofsDir, { recursive: true });

	const baseUrl = await getLiveBaseUrl();
	console.log(`=== Launching Playwright for LIVE CRM Dental Lab Proofs against ${baseUrl} ===`);
	const browser = await chromium.launch({
		headless: true,
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	const setupStorage = async (context, theme = "light") => {
		await context.addInitScript((th) => {
			try {
				localStorage.setItem("dente_clinic_token", "demo-clinic-token");
				localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-chief");
				localStorage.setItem("dente_active_role", "owner");
				localStorage.setItem("dente_tour_completed", "true");
				localStorage.setItem("dente_demo_showcase_mode_v1", "true");
				localStorage.setItem("dente_demo_showcase", "true");
				localStorage.setItem("dente_onboarding_completed", "true");
				localStorage.setItem("dente_tour_dismissed", "true");
				localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
				localStorage.setItem("dente_demo_banner_dismissed", "true");
				localStorage.setItem("dente_theme", th);
				localStorage.setItem("dente_theme_mode", th);
				localStorage.setItem("theme", th);
				localStorage.setItem(
					"dental-crm:onboarding:v1",
					JSON.stringify({ dismissed: true, step: "done", completed: true }),
				);
				localStorage.setItem(
					"dente_active_staff_user",
					JSON.stringify({
						id: "doc-1",
						fullName: "Д-р Воронов Алексей Владимирович",
						role: "owner",
					}),
				);
				if (document.documentElement) {
					document.documentElement.setAttribute("data-theme", th);
					if (th === "dark") {
						document.documentElement.classList.add("dark");
						document.documentElement.classList.remove("light");
					} else {
						document.documentElement.classList.add("light");
						document.documentElement.classList.remove("dark");
					}
				}
			} catch (_) {}
		}, theme);
	};

	const suppressTour = async (page) => {
		try {
			await page.evaluate(() => {
				const style = document.createElement("style");
				style.id = "suppress-all-overlays";
				style.innerHTML = `
					.tour-spotlight-root,
					.tour-backdrop-clickable-zone,
					[data-testid="guided-tour-spotlight-overlay"],
					[data-testid="guided-tour-coach-mark-card"],
					[data-testid="demo-mode-banner"],
					.shepherd-element {
						display: none !important;
						pointer-events: none !important;
					}
				`;
				document.head.appendChild(style);
				document.querySelectorAll("vite-error-overlay, .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay']").forEach((el) => el.remove());
			});
		} catch (_) {}
	};

	try {
		// ═══════════════════════════════════════════════════════════════════════
		// 1. PC 1440x900 LIGHT (Kanban Board)
		// ═══════════════════════════════════════════════════════════════════════
		console.log("Capturing 01_lab_orders_pc_light_1440x900.png...");
		const pcLightContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});
		await setupStorage(pcLightContext, "light");
		const pcLight = await pcLightContext.newPage();
		await pcLight.goto(`${baseUrl}/?demo=true#lab`, {
			waitUntil: "domcontentloaded",
			timeout: 30000,
		});
		await pcLight.waitForSelector('[data-testid="canonical-4-stage-kanban-board"]', { timeout: 15000 });
		await suppressTour(pcLight);
		await pcLight.waitForTimeout(1000);

		const p1 = path.join(proofsDir, "01_lab_orders_pc_light_1440x900.png");
		await pcLight.screenshot({ path: p1, fullPage: false, animations: "disabled" });
		const p1Size = fs.statSync(p1).size;
		console.log(`✓ Saved ${p1} (${(p1Size / 1024).toFixed(1)} KB)`);
		if (p1Size < 20480) throw new Error(`Screenshot size ${p1Size} is under 20KB threshold!`);

		// 1b. Open Order Modal on PC Light
		console.log("Capturing 05_lab_order_modal_pc_light_1440x900.png...");
		await pcLight.click('[data-testid="btn-open-create-lab-order"]');
		await pcLight.waitForSelector('[data-testid="lab-order-modal"]', { timeout: 10000 });
		await suppressTour(pcLight);
		await pcLight.waitForTimeout(800);

		const p5 = path.join(proofsDir, "05_lab_order_modal_pc_light_1440x900.png");
		await pcLight.screenshot({ path: p5, fullPage: false, animations: "disabled" });
		const p5Size = fs.statSync(p5).size;
		console.log(`✓ Saved ${p5} (${(p5Size / 1024).toFixed(1)} KB)`);
		if (p5Size < 20480) throw new Error(`Screenshot size ${p5Size} is under 20KB threshold!`);

		await pcLightContext.close();

		// ═══════════════════════════════════════════════════════════════════════
		// 2. PC 1440x900 DARK (Kanban Board & Modal)
		// ═══════════════════════════════════════════════════════════════════════
		console.log("Capturing 02_lab_orders_pc_dark_1440x900.png...");
		const pcDarkContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});
		await setupStorage(pcDarkContext, "dark");
		const pcDark = await pcDarkContext.newPage();
		await pcDark.goto(`${baseUrl}/?demo=true#lab`, {
			waitUntil: "domcontentloaded",
			timeout: 30000,
		});
		await pcDark.waitForSelector('[data-testid="canonical-4-stage-kanban-board"]', { timeout: 15000 });
		await suppressTour(pcDark);
		await pcDark.waitForTimeout(1000);

		const p2 = path.join(proofsDir, "02_lab_orders_pc_dark_1440x900.png");
		await pcDark.screenshot({ path: p2, fullPage: false, animations: "disabled" });
		const p2Size = fs.statSync(p2).size;
		console.log(`✓ Saved ${p2} (${(p2Size / 1024).toFixed(1)} KB)`);
		if (p2Size < 20480) throw new Error(`Screenshot size ${p2Size} is under 20KB threshold!`);

		// 2b. Open Order Modal on PC Dark
		console.log("Capturing 06_lab_order_modal_pc_dark_1440x900.png...");
		await pcDark.click('[data-testid="btn-open-create-lab-order"]');
		await pcDark.waitForSelector('[data-testid="lab-order-modal"]', { timeout: 10000 });
		await suppressTour(pcDark);
		await pcDark.waitForTimeout(800);

		const p6 = path.join(proofsDir, "06_lab_order_modal_pc_dark_1440x900.png");
		await pcDark.screenshot({ path: p6, fullPage: false, animations: "disabled" });
		const p6Size = fs.statSync(p6).size;
		console.log(`✓ Saved ${p6} (${(p6Size / 1024).toFixed(1)} KB)`);
		if (p6Size < 20480) throw new Error(`Screenshot size ${p6Size} is under 20KB threshold!`);

		await pcDarkContext.close();

		// ═══════════════════════════════════════════════════════════════════════
		// 3. MOBILE 390x844 LIGHT (Apple HIG View)
		// ═══════════════════════════════════════════════════════════════════════
		console.log("Capturing 03_lab_orders_mobile_light_390x844.png...");
		const mobileLightContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
		});
		await setupStorage(mobileLightContext, "light");
		const mobileLight = await mobileLightContext.newPage();
		await mobileLight.goto(`${baseUrl}/?demo=true#lab`, {
			waitUntil: "domcontentloaded",
			timeout: 30000,
		});
		await mobileLight.waitForSelector('[data-testid="canonical-4-stage-kanban-board"]', { timeout: 15000 });
		await suppressTour(mobileLight);
		await mobileLight.waitForTimeout(1000);

		const p3 = path.join(proofsDir, "03_lab_orders_mobile_light_390x844.png");
		await mobileLight.screenshot({ path: p3, fullPage: false, animations: "disabled" });
		const p3Size = fs.statSync(p3).size;
		console.log(`✓ Saved ${p3} (${(p3Size / 1024).toFixed(1)} KB)`);
		if (p3Size < 20480) throw new Error(`Screenshot size ${p3Size} is under 20KB threshold!`);

		// 3b. Mobile Order Drawer in Light Mode
		console.log("Capturing 07_lab_order_modal_mobile_light_390x844.png...");
		await mobileLight.click('[data-testid="btn-open-create-lab-order-mobile"]');
		await mobileLight.waitForSelector('[data-testid="dental-lab-order-drawer"], [data-testid="lab-order-modal"]', { timeout: 10000 });
		await suppressTour(mobileLight);
		await mobileLight.waitForTimeout(800);

		const p7 = path.join(proofsDir, "07_lab_order_modal_mobile_light_390x844.png");
		await mobileLight.screenshot({ path: p7, fullPage: false, animations: "disabled" });
		const p7Size = fs.statSync(p7).size;
		console.log(`✓ Saved ${p7} (${(p7Size / 1024).toFixed(1)} KB)`);
		if (p7Size < 20480) throw new Error(`Screenshot size ${p7Size} is under 20KB threshold!`);

		await mobileLightContext.close();

		// ═══════════════════════════════════════════════════════════════════════
		// 4. MOBILE 390x844 DARK (Apple HIG View)
		// ═══════════════════════════════════════════════════════════════════════
		console.log("Capturing 04_lab_orders_mobile_dark_390x844.png...");
		const mobileDarkContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
		});
		await setupStorage(mobileDarkContext, "dark");
		const mobileDark = await mobileDarkContext.newPage();
		await mobileDark.goto(`${baseUrl}/?demo=true#lab`, {
			waitUntil: "domcontentloaded",
			timeout: 30000,
		});
		await mobileDark.waitForSelector('[data-testid="canonical-4-stage-kanban-board"]', { timeout: 15000 });
		await suppressTour(mobileDark);
		await mobileDark.waitForTimeout(1000);

		const p4 = path.join(proofsDir, "04_lab_orders_mobile_dark_390x844.png");
		await mobileDark.screenshot({ path: p4, fullPage: false, animations: "disabled" });
		const p4Size = fs.statSync(p4).size;
		console.log(`✓ Saved ${p4} (${(p4Size / 1024).toFixed(1)} KB)`);
		if (p4Size < 20480) throw new Error(`Screenshot size ${p4Size} is under 20KB threshold!`);

		// 4b. Mobile Order Drawer in Dark Mode
		console.log("Capturing 08_lab_order_modal_mobile_dark_390x844.png...");
		await mobileDark.click('[data-testid="btn-open-create-lab-order-mobile"]');
		await mobileDark.waitForSelector('[data-testid="dental-lab-order-drawer"], [data-testid="lab-order-modal"]', { timeout: 10000 });
		await suppressTour(mobileDark);
		await mobileDark.waitForTimeout(800);

		const p8 = path.join(proofsDir, "08_lab_order_modal_mobile_dark_390x844.png");
		await mobileDark.screenshot({ path: p8, fullPage: false, animations: "disabled" });
		const p8Size = fs.statSync(p8).size;
		console.log(`✓ Saved ${p8} (${(p8Size / 1024).toFixed(1)} KB)`);
		if (p8Size < 20480) throw new Error(`Screenshot size ${p8Size} is under 20KB threshold!`);

		await mobileDarkContext.close();

		console.log("\n=== ALL CANONICAL 4-STATE DENTAL LAB PROOFS CAPTURED SUCCESSFULLY! ===");
	} finally {
		await browser.close();
	}
}

captureLiveLabProofs().catch((err) => {
	console.error("FATAL in captureLiveLabProofs:", err);
	process.exit(1);
});
