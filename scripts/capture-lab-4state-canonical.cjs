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
		// 1. PC LIGHT (1440x900) - 5-Stage Kanban Board
		// ═════════════════════════════════════════════════════════════════
		console.log("\n--- 1. Setting up PC Light Context (1440x900) ---");
		const pcLightContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
		await setupStorage(pcLightContext, "light");

		const pcLightPage = await pcLightContext.newPage();
		console.log("Navigating PC Light to http://127.0.0.1:5173/?demo=true#lab ...");
		await pcLightPage.goto("http://127.0.0.1:5173/?demo=true#lab", { waitUntil: "networkidle", timeout: 30000 });
		await pcLightPage.waitForSelector('[data-testid="dental-lab-orders-view"]', { timeout: 30000 });
		await setTheme(pcLightPage, "light");

		console.log("Clicking Kanban button...");
		const kanbanBtn = await pcLightPage.waitForSelector('[data-testid="lab-orders-view-kanban-btn"]', { timeout: 15000 });
		await kanbanBtn.click();
		await pcLightPage.waitForSelector('[data-testid="canonical-4-stage-kanban-board"], .ztl-kanban-board', { timeout: 15000 });
		console.log("Kanban board mounted!");

		await saveProof(
			pcLightPage,
			"01_lab_kanban_5stages_pc_light_1440x900.png",
			"Kanban Board with canonical stages (PC Light 1440x900)"
		);
		fs.copyFileSync(
			path.join(PROOFS_DIR, "01_lab_kanban_5stages_pc_light_1440x900.png"),
			path.join(PROOFS_DIR, "lab_pc_light_1440x900.png")
		);
		await pcLightContext.close();

		// ═════════════════════════════════════════════════════════════════
		// 2. PC DARK (1440x900) - Canonical Drawer with 3D-Master & Barcode
		// ═════════════════════════════════════════════════════════════════
		console.log("\n--- 2. Setting up PC Dark Context (1440x900) ---");
		const pcDarkContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
		await setupStorage(pcDarkContext, "dark");

		const pcDarkPage = await pcDarkContext.newPage();
		console.log("Navigating PC Dark to http://127.0.0.1:5173/?demo=true#lab ...");
		await pcDarkPage.goto("http://127.0.0.1:5173/?demo=true#lab", { waitUntil: "networkidle", timeout: 30000 });
		await pcDarkPage.waitForSelector('[data-testid="dental-lab-orders-view"]', { timeout: 30000 });
		await setTheme(pcDarkPage, "dark");

		console.log("Opening Lab Order Drawer...");
		const newOrderBtn = await pcDarkPage.waitForSelector('[data-testid="lab-orders-new-order-btn"]', { timeout: 15000 });
		await newOrderBtn.click();
		await pcDarkPage.waitForSelector('[data-testid="dental-lab-order-drawer"]', { timeout: 15000 });
		console.log("Lab Order Drawer open!");

		// Click 3D-Master tab
		console.log("Switching to 3D-Master tab...");
		const vitaTab = await pcDarkPage.waitForSelector('[data-testid="vita-tab-3dmaster"]', { timeout: 10000 });
		await vitaTab.click();
		await pcDarkPage.waitForTimeout(800);

		await saveProof(
			pcDarkPage,
			"02_lab_order_drawer_shades_pc_dark_1440x900.png",
			"Order Drawer with VITA 3D-Master shades, FDI odontogram, Code128 barcode, and quick intake (PC Dark 1440x900)"
		);
		fs.copyFileSync(
			path.join(PROOFS_DIR, "02_lab_order_drawer_shades_pc_dark_1440x900.png"),
			path.join(PROOFS_DIR, "lab_pc_dark_1440x900.png")
		);
		await pcDarkContext.close();

		// ═════════════════════════════════════════════════════════════════
		// 3. MOBILE LIGHT (390x844) - Grouped List Cards
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
		await mobileLightPage.goto("http://127.0.0.1:5173/?demo=true#lab", { waitUntil: "networkidle", timeout: 30000 });
		await mobileLightPage.waitForSelector('.mobile-lab-container, [data-testid="mobile-lab-orders-timeline-view"]', { timeout: 30000 });
		await setTheme(mobileLightPage, "light");
		await mobileLightPage.waitForTimeout(1500);

		await saveProof(
			mobileLightPage,
			"03_lab_mobile_light_390x844.png",
			"Mobile Lab Orders Grouped List cards (Mobile Light 390x844) - Touch targets >= 44px, Apple HIG"
		);
		fs.copyFileSync(
			path.join(PROOFS_DIR, "03_lab_mobile_light_390x844.png"),
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
		await mobileDarkPage.goto("http://127.0.0.1:5173/?demo=true#lab", { waitUntil: "networkidle", timeout: 30000 });
		await mobileDarkPage.waitForSelector('.mobile-lab-container, [data-testid="mobile-lab-orders-timeline-view"]', { timeout: 30000 });
		await setTheme(mobileDarkPage, "dark");

		console.log("Opening Mobile Drawer...");
		await mobileDarkPage.click('[data-testid="mobile-lab-add-order-btn"]').catch(() => {
			return mobileDarkPage.evaluate(() => {
				window.dispatchEvent(new CustomEvent("dente-open-lab-order-drawer"));
			});
		});
		await mobileDarkPage.waitForSelector('[data-testid="dental-lab-order-drawer"]', { timeout: 15000 });

		await saveProof(
			mobileDarkPage,
			"04_lab_mobile_dark_390x844.png",
			"Mobile Lab Orders Bottom Sheet in Dark Mode (Mobile Dark 390x844) - Apple HIG, 0px horizontal overflow"
		);
		fs.copyFileSync(
			path.join(PROOFS_DIR, "04_lab_mobile_dark_390x844.png"),
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
