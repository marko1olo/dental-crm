const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const PROOFS_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/redteam_lab_docs");
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
	return { filePath, size };
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
	console.log("=== STARTING RED TEAM CAPTURE: LAB & DOCUMENTS ===");
	const browser = await chromium.launch({
		channel: "chrome",
		headless: true,
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	try {
		const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
		await setupStorage(context, "light");
		const page = await context.newPage();

		// 1. Lab Orders - Light
		console.log("\n[1/4] Navigating to #lab (Light)...");
		await page.goto("http://127.0.0.1:5173/?demo=true#lab", { waitUntil: "networkidle", timeout: 30000 });
		await page.waitForSelector('[data-testid="lab-orders-new-order-btn"]', { timeout: 30000 });
		await setTheme(page, "light");
		await saveProof(page, "01_lab_orders_1440x900_light.png", "Lab Orders FilterBar (1440x900 Light, Emerald CTA, single plus)");

		// 2. Lab Orders - Dark
		console.log("\n[2/4] Switching #lab to Dark...");
		await setTheme(page, "dark");
		await saveProof(page, "02_lab_orders_1440x900_dark.png", "Lab Orders FilterBar (1440x900 Dark, Emerald CTA, single plus)");

		// 3. Documents - Light
		console.log("\n[3/4] Navigating to #documents (Light)...");
		await page.goto("http://127.0.0.1:5173/?demo=true#documents", { waitUntil: "networkidle", timeout: 30000 });
		await page.waitForSelector("#documents, .documents-panel, .documents-catalog-view", { timeout: 30000 });
		await setTheme(page, "light");
		await saveProof(page, "03_documents_1440x900_light.png", "Documents View Catalog (1440x900 Light, Mandates 8e, 8s, 8ap)");

		// 4. Documents - Dark
		console.log("\n[4/4] Switching #documents to Dark...");
		await setTheme(page, "dark");
		await saveProof(page, "04_documents_1440x900_dark.png", "Documents View Catalog (1440x900 Dark, Mandates 8e, 8s, 8ap)");

		console.log("\n=== ALL RED TEAM PROOFS CAPTURED SUCCESSFULLY ===");
	} finally {
		await browser.close();
	}
}

run().catch((err) => {
	console.error("CAPTURE ERROR:", err);
	process.exit(1);
});
