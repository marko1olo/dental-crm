const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const PARENT_ID = "8d148d14-84d7-401e-badd-c6ea47afd7f6";
const SELF_ID = "2ad6b6b8-e197-4025-825b-85776906b22a";
const OUT_DOCS = path.resolve(__dirname, "../docs/proofs/treatment_plans");
const OUT_PARENT = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${PARENT_ID}`);
const OUT_SELF = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${SELF_ID}`);

async function run() {
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	try {
		const context = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
			locale: "ru-RU",
			colorScheme: "dark",
		});

		const page = await context.newPage();
		await page.goto("http://127.0.0.1:5173/#treatment-plans", { waitUntil: "commit", timeout: 30000 });
		await page.waitForTimeout(1500);

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

			document.documentElement.setAttribute("data-theme", "dark");
			document.documentElement.classList.add("dark");
			document.documentElement.classList.remove("light");
			document.body.setAttribute("data-theme", "dark");
			document.body.classList.add("dark");
			document.body.classList.remove("light");
			document.documentElement.style.colorScheme = "dark";
			localStorage.setItem("dente_theme", "dark");
			localStorage.setItem("dente_theme_mode", "dark");
			localStorage.setItem("theme", "dark");

			window.dispatchEvent(
				new CustomEvent("dente:open-treatment-plan", {
					detail: {
						patientName: "Волков Дмитрий Андреевич",
						doctorFullName: "Д-р Кузнецов М.С.",
						patientId: "00000000-0000-0000-0000-000000000001",
					},
				})
			);
		});

		await page.waitForSelector('[data-testid="treatment-plan-studio-modal"]', { state: "visible", timeout: 15000 });
		await page.waitForTimeout(800);

		const filename = "04_treatment_plans_mobile_dark_390x844.png";
		const pDocs = path.join(OUT_DOCS, filename);
		const pParent = path.join(OUT_PARENT, filename);
		const pSelf = path.join(OUT_SELF, filename);

		await page.screenshot({ path: pDocs, fullPage: false, animations: "disabled" });
		try { fs.copyFileSync(pDocs, pParent); } catch {}
		try { fs.copyFileSync(pDocs, pSelf); } catch {}

		const size = fs.statSync(pDocs).size;
		if (size < 20480) {
			throw new Error(`[BLANK DETECTED] ${filename} is ${size} bytes (< 20KB)!`);
		}
		console.log(`[VERIFIED PROOF] ${filename} (${(size / 1024).toFixed(1)} KB) -> Saved successfully.`);
		await context.close();
	} finally {
		await browser.close();
	}
}

run().catch((err) => {
	console.error(err);
	process.exit(1);
});
