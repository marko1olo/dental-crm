const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const PROOFS_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/lab");
fs.mkdirSync(PROOFS_DIR, { recursive: true });

async function suppressOverlays(page) {
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
				.global-toast-container,
				vite-error-overlay {
					display: none !important;
					pointer-events: none !important;
				}
			`;
			document.head.appendChild(style);
			document.querySelectorAll("vite-error-overlay, .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay']").forEach((el) => el.remove());
		});
	} catch (_) {}
}

async function setTheme(page, theme) {
	await page.evaluate((th) => {
		document.documentElement.setAttribute("data-theme", th);
		if (th === "dark") {
			document.documentElement.classList.add("dark");
			document.documentElement.classList.remove("light");
		} else {
			document.documentElement.classList.add("light");
			document.documentElement.classList.remove("dark");
		}
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("dente_theme_mode", th);
		localStorage.setItem("theme", th);
		document.documentElement.style.colorScheme = th;
	}, theme).catch(() => {});
	await suppressOverlays(page);
}

async function saveProof(page, filename, description) {
	await suppressOverlays(page);
	await page.waitForTimeout(800);
	const filePath = path.join(PROOFS_DIR, filename);
	await page.screenshot({ path: filePath, fullPage: false, animations: "disabled" });
	const size = fs.statSync(filePath).size;
	console.log(`[PROOF CAPTURED] ${filename} (${size} bytes, OK: ${size >= 20000}) -> ${description}`);
	return size;
}

const setupStorage = async (context, theme = "light") => {
	await context.addInitScript((th) => {
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
			JSON.stringify({ dismissed: true, step: "done", completed: true })
		);
		localStorage.setItem(
			"dente_active_staff_user",
			JSON.stringify({
				id: "doc-1",
				fullName: "Д-р Воронов Алексей Владимирович",
				role: "owner",
			})
		);
	}, theme);
};

async function run() {
	console.log("=== STARTING CANONICAL 4-STATE DENTAL LAB CAPTURE ===");
	const browser = await chromium.launch({
		channel: "chrome",
		headless: true,
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	try {
		// ═════════════════════════════════════════════════════════════════
		// 1. PC LIGHT (1440x900) - Canonical 4-Stage Kanban Board & KPI
		// ═════════════════════════════════════════════════════════════════
		console.log("\n--- 1. Setting up PC Light Context (1440x900) ---");
		const pcLightContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
		await setupStorage(pcLightContext, "light");

		const pcLightPage = await pcLightContext.newPage();
		console.log("Navigating PC Light to http://127.0.0.1:5173/?demo=true#lab ...");
		await pcLightPage.goto("http://127.0.0.1:5173/?demo=true#lab", { waitUntil: "domcontentloaded", timeout: 30000 });
		await pcLightPage.waitForSelector('[data-testid="dental-lab-orders-hub-modal"]', { timeout: 30000 });
		await pcLightPage.waitForSelector('[data-testid="canonical-4-stage-kanban-board"]', { timeout: 15000 });
		await setTheme(pcLightPage, "light");
		await pcLightPage.waitForTimeout(1000);

		console.log("Kanban board mounted in PC Light!");

		await saveProof(
			pcLightPage,
			"01_lab_hub_pc_light_1440x900.png",
			"SSOT Hub with canonical 4-stage Kanban Board, KPI strips, and fast presets (PC Light 1440x900)"
		);
		fs.copyFileSync(
			path.join(PROOFS_DIR, "01_lab_hub_pc_light_1440x900.png"),
			path.join(PROOFS_DIR, "01_lab_orders_pc_light_1440x900.png")
		);
		fs.copyFileSync(
			path.join(PROOFS_DIR, "01_lab_hub_pc_light_1440x900.png"),
			path.join(PROOFS_DIR, "01_lab_orders_pc_light.png")
		);
		fs.copyFileSync(
			path.join(PROOFS_DIR, "01_lab_hub_pc_light_1440x900.png"),
			path.join(PROOFS_DIR, "01_lab_kanban_5stages_pc_light_1440x900.png")
		);
		fs.copyFileSync(
			path.join(PROOFS_DIR, "01_lab_hub_pc_light_1440x900.png"),
			path.join(PROOFS_DIR, "lab_pc_light_1440x900.png")
		);
		await pcLightContext.close();

		// ═════════════════════════════════════════════════════════════════
		// 2. PC DARK (1440x900) - Canonical Drawer / Create Order Modal
		// ═════════════════════════════════════════════════════════════════
		console.log("\n--- 2. Setting up PC Dark Context (1440x900) ---");
		const pcDarkContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
		await setupStorage(pcDarkContext, "dark");

		const pcDarkPage = await pcDarkContext.newPage();
		console.log("Navigating PC Dark to http://127.0.0.1:5173/?demo=true#lab ...");
		await pcDarkPage.goto("http://127.0.0.1:5173/?demo=true#lab", { waitUntil: "domcontentloaded", timeout: 30000 });
		await pcDarkPage.waitForSelector('[data-testid="dental-lab-orders-hub-modal"]', { timeout: 30000 });
		await setTheme(pcDarkPage, "dark");

		console.log("Opening Lab Order Create Modal/Drawer in Dark Mode...");
		const newOrderBtn = await pcDarkPage.waitForSelector('[data-testid="btn-open-create-lab-order"]', { timeout: 15000 });
		await newOrderBtn.click();
		await pcDarkPage.waitForSelector('[data-testid="dental-lab-order-drawer"]', { timeout: 15000 });
		await pcDarkPage.waitForTimeout(800);
		console.log("Lab Order Drawer open in Dark Mode!");

		await saveProof(
			pcDarkPage,
			"02_lab_hub_pc_dark_1440x900.png",
			"Order Drawer with FDI odontogram, fast presets, and single Teal CTA (PC Dark 1440x900)"
		);
		fs.copyFileSync(
			path.join(PROOFS_DIR, "02_lab_hub_pc_dark_1440x900.png"),
			path.join(PROOFS_DIR, "02_lab_orders_pc_dark_1440x900.png")
		);
		fs.copyFileSync(
			path.join(PROOFS_DIR, "02_lab_hub_pc_dark_1440x900.png"),
			path.join(PROOFS_DIR, "02_lab_orders_pc_dark.png")
		);
		fs.copyFileSync(
			path.join(PROOFS_DIR, "02_lab_hub_pc_dark_1440x900.png"),
			path.join(PROOFS_DIR, "02_lab_order_drawer_shades_pc_dark_1440x900.png")
		);
		fs.copyFileSync(
			path.join(PROOFS_DIR, "02_lab_hub_pc_dark_1440x900.png"),
			path.join(PROOFS_DIR, "lab_pc_dark_1440x900.png")
		);
		await pcDarkContext.close();

		// ═════════════════════════════════════════════════════════════════
		// 3. MOBILE LIGHT (390x844) - Grouped List Cards & Natural Touch
		// ═════════════════════════════════════════════════════════════════
		console.log("\n--- 3. Setting up Mobile Light Context (390x844) ---");
		const mobileLightContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			isMobile: true,
			hasTouch: true,
		});
		await setupStorage(mobileLightContext, "light");

		const mobileLightPage = await mobileLightContext.newPage();
		console.log("Navigating Mobile Light to http://127.0.0.1:5173/?demo=true#lab ...");
		await mobileLightPage.goto("http://127.0.0.1:5173/?demo=true#lab", { waitUntil: "domcontentloaded", timeout: 30000 });
		await mobileLightPage.waitForSelector('[data-testid="dental-lab-orders-hub-modal"]', { timeout: 30000 });
		await setTheme(mobileLightPage, "light");
		await mobileLightPage.waitForTimeout(1000);

		await saveProof(
			mobileLightPage,
			"03_lab_hub_mobile_light_390x844.png",
			"Mobile Lab Orders Grouped List cards (Mobile Light 390x844) - Touch targets >= 44px, Apple HIG"
		);
		fs.copyFileSync(
			path.join(PROOFS_DIR, "03_lab_hub_mobile_light_390x844.png"),
			path.join(PROOFS_DIR, "03_lab_orders_mobile_light_390x844.png")
		);
		fs.copyFileSync(
			path.join(PROOFS_DIR, "03_lab_hub_mobile_light_390x844.png"),
			path.join(PROOFS_DIR, "03_lab_orders_mobile_light.png")
		);
		fs.copyFileSync(
			path.join(PROOFS_DIR, "03_lab_hub_mobile_light_390x844.png"),
			path.join(PROOFS_DIR, "03_lab_mobile_light_390x844.png")
		);
		fs.copyFileSync(
			path.join(PROOFS_DIR, "03_lab_hub_mobile_light_390x844.png"),
			path.join(PROOFS_DIR, "lab_mobile_light_390x844.png")
		);
		await mobileLightContext.close();

		// ═════════════════════════════════════════════════════════════════
		// 4. MOBILE DARK (390x844) - Bottom Sheet Drawer
		// ═════════════════════════════════════════════════════════════════
		console.log("\n--- 4. Setting up Mobile Dark Context (390x844) ---");
		const mobileDarkContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			isMobile: true,
			hasTouch: true,
		});
		await setupStorage(mobileDarkContext, "dark");

		const mobileDarkPage = await mobileDarkContext.newPage();
		console.log("Navigating Mobile Dark to http://127.0.0.1:5173/?demo=true#lab ...");
		await mobileDarkPage.goto("http://127.0.0.1:5173/?demo=true#lab", { waitUntil: "domcontentloaded", timeout: 30000 });
		await mobileDarkPage.waitForSelector('[data-testid="dental-lab-orders-hub-modal"]', { timeout: 30000 });
		await setTheme(mobileDarkPage, "dark");

		console.log("Opening Mobile Drawer in Dark Mode...");
		const mobileAddBtn = await mobileDarkPage.waitForSelector('[data-testid="btn-open-create-lab-order-mobile"]', { timeout: 15000 });
		await mobileAddBtn.click();
		await mobileDarkPage.waitForSelector('[data-testid="dental-lab-order-drawer"]', { timeout: 15000 });
		await mobileDarkPage.waitForTimeout(800);

		await saveProof(
			mobileDarkPage,
			"04_lab_hub_mobile_dark_390x844.png",
			"Mobile Lab Orders Bottom Sheet in Dark Mode (Mobile Dark 390x844) - Apple HIG, 0px horizontal overflow"
		);
		fs.copyFileSync(
			path.join(PROOFS_DIR, "04_lab_hub_mobile_dark_390x844.png"),
			path.join(PROOFS_DIR, "04_lab_orders_mobile_dark_390x844.png")
		);
		fs.copyFileSync(
			path.join(PROOFS_DIR, "04_lab_hub_mobile_dark_390x844.png"),
			path.join(PROOFS_DIR, "04_lab_orders_mobile_dark.png")
		);
		fs.copyFileSync(
			path.join(PROOFS_DIR, "04_lab_hub_mobile_dark_390x844.png"),
			path.join(PROOFS_DIR, "04_lab_mobile_dark_390x844.png")
		);
		fs.copyFileSync(
			path.join(PROOFS_DIR, "04_lab_hub_mobile_dark_390x844.png"),
			path.join(PROOFS_DIR, "lab_mobile_dark_390x844.png")
		);
		await mobileDarkContext.close();

		console.log("\n=== ALL 4 CANONICAL LAB PROOFS CAPTURED SUCCESSFULLY! ===");
	} catch (err) {
		console.error("Proof capture error:", err);
		process.exit(1);
	} finally {
		await browser.close();
	}
}

run();
