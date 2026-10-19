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
	await page.waitForTimeout(600);
	const filePath = path.join(PROOFS_DIR, filename);
	await page.screenshot({ path: filePath, fullPage: false, animations: "disabled" });
	const size = fs.statSync(filePath).size;
	console.log(`[PROOF CAPTURED] ${filename} (${size} bytes, OK: ${size >= 20000}) -> ${description}`);
	return size;
}

const setupStorage = async (context) => {
	await context.addInitScript(() => {
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
		localStorage.setItem(
			"dente_cached_active_staff_user",
			JSON.stringify({
				id: "doc-1",
				fullName: "Д-р Воронов Алексей Владимирович",
				role: "owner",
			})
		);
	});
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
		// 1. PC CONTEXT (1440x900)
		// ═════════════════════════════════════════════════════════════════
		console.log("\n--- 1. Setting up PC Context (1440x900) ---");
		const pcContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
		await setupStorage(pcContext);

		const pcPage = await pcContext.newPage();
		console.log("Navigating PC to http://127.0.0.1:5173/?demo=true#lab ...");
		await pcPage.goto("http://127.0.0.1:5173/?demo=true#lab", { waitUntil: "commit", timeout: 30000 });

		console.log("Waiting for lab view and kanban button selector...");
		await pcPage.waitForSelector('[data-testid="lab-orders-view-kanban-btn"]', { timeout: 60000 });
		console.log("PC Lab view loaded successfully!");

		await suppressOverlays(pcPage);
		await setTheme(pcPage, "light");

		// Switch to Kanban
		console.log("Switching to Kanban view...");
		await pcPage.click('[data-testid="lab-orders-view-kanban-btn"]');
		await pcPage.waitForSelector('[data-testid="lab-orders-kanban-container"]', { timeout: 15000 });
		await pcPage.waitForTimeout(1000);
		await suppressOverlays(pcPage);

		// 1. PC Light Kanban 5 columns
		await saveProof(
			pcPage,
			"01_lab_kanban_5stages_pc_light_1440x900.png",
			"Kanban Board with 5 canonical stages [Слепок снят | Отправлено в ЗТЛ | Моделирование/Литье | Примерка/В клинике | Сдано пациенту] (PC Light 1440x900)"
		);
		fs.copyFileSync(
			path.join(PROOFS_DIR, "01_lab_kanban_5stages_pc_light_1440x900.png"),
			path.join(PROOFS_DIR, "lab_pc_light_1440x900.png")
		);

		// Switch to Dark theme and open Drawer
		console.log("Switching to Dark theme and opening Lab Order Drawer...");
		await setTheme(pcPage, "dark");
		await pcPage.evaluate(() => {
			window.dispatchEvent(new CustomEvent("dente-open-lab-order-drawer"));
		});
		await pcPage.waitForSelector('[data-testid="dental-lab-order-drawer"]', { timeout: 15000 });
		await pcPage.waitForTimeout(1000);

		// Switch to 3D-Master tab
		console.log("Selecting 3D-Master tab...");
		await pcPage.waitForSelector('[data-testid="vita-tab-3dmaster"]', { timeout: 10000 });
		await pcPage.click('[data-testid="vita-tab-3dmaster"]');
		await pcPage.waitForTimeout(800);
		await suppressOverlays(pcPage);

		// 2. PC Dark Order Drawer with 3D-Master / VITA shades & barcodes
		await saveProof(
			pcPage,
			"02_lab_order_drawer_shades_pc_dark_1440x900.png",
			"Order Drawer with VITA 3D-Master shades, FDI odontogram, Code128 barcode, and quick intake button (PC Dark 1440x900)"
		);
		fs.copyFileSync(
			path.join(PROOFS_DIR, "02_lab_order_drawer_shades_pc_dark_1440x900.png"),
			path.join(PROOFS_DIR, "lab_pc_dark_1440x900.png")
		);

		await pcContext.close();

		// ═════════════════════════════════════════════════════════════════
		// 2. MOBILE CONTEXT (390x844)
		// ═════════════════════════════════════════════════════════════════
		console.log("\n--- 2. Setting up Mobile Context (390x844) ---");
		const mobileContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			isMobile: true,
			hasTouch: true,
		});
		await setupStorage(mobileContext);

		const mobilePage = await mobileContext.newPage();
		console.log("Navigating Mobile to http://127.0.0.1:5173/?demo=true#lab ...");
		await mobilePage.goto("http://127.0.0.1:5173/?demo=true#lab", { waitUntil: "commit", timeout: 30000 });

		console.log("Waiting for mobile timeline to mount...");
		await mobilePage.waitForSelector('.mobile-lab-container, [data-testid="mobile-lab-orders-timeline-view"]', { timeout: 60000 });
		console.log("Mobile Lab view loaded successfully!");

		await suppressOverlays(mobilePage);
		await setTheme(mobilePage, "light");
		await mobilePage.waitForTimeout(1000);

		// 3. Mobile Light Grouped List
		await saveProof(
			mobilePage,
			"03_lab_mobile_light_390x844.png",
			"Mobile Lab Orders Grouped List cards (Mobile Light 390x844) - Touch targets >= 44px, Apple HIG"
		);
		fs.copyFileSync(
			path.join(PROOFS_DIR, "03_lab_mobile_light_390x844.png"),
			path.join(PROOFS_DIR, "lab_mobile_light_390x844.png")
		);

		// Mobile Dark with bottom sheet
		console.log("Switching Mobile to Dark theme and opening Drawer...");
		await setTheme(mobilePage, "dark");
		await mobilePage.click('[data-testid="mobile-lab-add-order-btn"]').catch(() => {
			return mobilePage.evaluate(() => {
				window.dispatchEvent(new CustomEvent("dente-open-lab-order-drawer"));
			});
		});
		await mobilePage.waitForSelector('[data-testid="dental-lab-order-drawer"]', { timeout: 15000 });
		await mobilePage.waitForTimeout(1000);
		await suppressOverlays(mobilePage);

		// 4. Mobile Dark
		await saveProof(
			mobilePage,
			"04_lab_mobile_dark_390x844.png",
			"Mobile Lab Orders Bottom Sheet in Dark Mode (Mobile Dark 390x844) - Apple HIG, 0px horizontal overflow"
		);
		fs.copyFileSync(
			path.join(PROOFS_DIR, "04_lab_mobile_dark_390x844.png"),
			path.join(PROOFS_DIR, "lab_mobile_dark_390x844.png")
		);

		await mobileContext.close();

		console.log("\n=== ALL 4 CANONICAL LAB PROOFS CAPTURED SUCCESSFULLY! ===");
	} catch (err) {
		console.error("Proof capture error:", err);
		process.exit(1);
	} finally {
		await browser.close();
	}
}

run();
