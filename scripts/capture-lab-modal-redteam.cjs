const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const PROOFS_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/redteam_lab_docs");

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

async function run() {
	const browser = await chromium.launch({
		channel: "chrome",
		headless: true,
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	try {
		const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
		await context.addInitScript(() => {
			localStorage.setItem("dente_clinic_token", "demo-clinic-token");
			localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-chief");
			localStorage.setItem("dente_active_role", "owner");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_demo_showcase_mode_v1", "true");
			localStorage.setItem("dente_demo_showcase", "true");
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_theme", "light");
			localStorage.setItem("theme", "light");
		});

		const page = await context.newPage();
		await page.goto("http://127.0.0.1:5173/?demo=true#lab", { waitUntil: "networkidle", timeout: 30000 });
		await suppressOverlays(page);

		const newOrderBtn = await page.waitForSelector('[data-testid="lab-orders-new-order-btn"]', { timeout: 15000 });
		console.log("Clicking New Order Button...");
		await newOrderBtn.click();

		await page.waitForTimeout(1000);
		await suppressOverlays(page);

		const modalPath = path.join(PROOFS_DIR, "05_lab_order_modal_open_light.png");
		await page.screenshot({ path: modalPath, fullPage: false });
		const size = fs.statSync(modalPath).size;
		console.log(`[MODAL PROOF CAPTURED] 05_lab_order_modal_open_light.png (${size} bytes)`);
	} finally {
		await browser.close();
	}
}

run().catch((err) => {
	console.error("MODAL CAPTURE ERROR:", err);
	process.exit(1);
});
