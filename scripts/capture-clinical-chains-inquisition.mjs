import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { chromium } from "playwright";

const BRAIN_DIR = "C:/Users/Admin/.gemini/antigravity/brain/3c2a7513-a1fb-4b0c-8e1c-00c59ecadf8a";
const DOCS_DIR = path.join(process.cwd(), "docs/proofs/clinical_chains");

[BRAIN_DIR, DOCS_DIR].forEach((dir) => {
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}
});

const TARGETS = [
	{
		id: "01_doctor_emk_toolbar_light",
		url: "http://127.0.0.1:5173/doctor_autonomy_preview.html?view=emk_toolbar&theme=light",
		theme: "light",
		title: "ЭМК 043/у Приём врача — Светлая тема (1440x900)",
		selector: '[data-testid="emk-toolbar-container"], .emk-card-container, #root',
	},
	{
		id: "02_doctor_emk_toolbar_dark",
		url: "http://127.0.0.1:5173/doctor_autonomy_preview.html?view=emk_toolbar&theme=dark",
		theme: "dark",
		title: "ЭМК 043/у Приём врача — Тёмная тема (1440x900)",
		selector: '[data-testid="emk-toolbar-container"], .emk-card-container, #root',
	},
	{
		id: "03_dental_lab_registry_light",
		url: "http://127.0.0.1:5173/lab_orders_preview.html?tab=registry&theme=light&demo=true",
		theme: "light",
		title: "ЗТЛ Наряды и проводки — Светлая тема (1440x900)",
		selector: '[data-testid="dental-lab-orders-view"], table, #root',
	},
	{
		id: "04_dental_lab_registry_dark",
		url: "http://127.0.0.1:5173/lab_orders_preview.html?tab=registry&theme=dark&demo=true",
		theme: "dark",
		title: "ЗТЛ Наряды и проводки — Тёмная тема (1440x900)",
		selector: '[data-testid="dental-lab-orders-view"], table, #root',
	},
	{
		id: "05_fast_checkout_54fz_light",
		url: "http://127.0.0.1:5173/doctor_autonomy_preview.html?view=fast_checkout&theme=light",
		theme: "light",
		title: "Касса 54-ФЗ Fast Checkout — Светлая тема (1440x900)",
		selector: '[data-testid="fast-checkout-modal"], .fast-checkout-dialog, #root',
	},
	{
		id: "06_fast_checkout_54fz_dark",
		url: "http://127.0.0.1:5173/doctor_autonomy_preview.html?view=fast_checkout&theme=dark",
		theme: "dark",
		title: "Касса 54-ФЗ Fast Checkout — Тёмная тема (1440x900)",
		selector: '[data-testid="fast-checkout-modal"], .fast-checkout-dialog, #root',
	},
];

async function run() {
	console.log("🚀 Starting Playwright capture for Clinical Chains E2E Inquisitor...");

	let browser;
	try {
		browser = await chromium.launch({
			channel: "msedge",
			headless: true,
			args: [
				"--no-sandbox",
				"--disable-setuid-sandbox",
				"--disable-gpu",
				"--disable-dev-shm-usage",
			],
		});
		console.log("✅ Microsoft Edge launched via Playwright channel: msedge");
	} catch (e) {
		console.warn("⚠️ Failed with channel msedge, falling back to default chromium:", e.message);
		browser = await chromium.launch({
			headless: true,
			args: ["--no-sandbox", "--disable-setuid-sandbox"],
		});
	}

	const hashes = new Map();

	for (const t of TARGETS) {
		console.log(`\n📸 Capturing ${t.id}: ${t.title}`);
		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
			colorScheme: t.theme,
		});

		const page = await context.newPage();
		await page.goto(t.url, { waitUntil: "domcontentloaded", timeout: 20000 });
		await page.waitForTimeout(1000);

		// Apply theme attribute
		await page.evaluate((theme) => {
			document.documentElement.setAttribute("data-theme", theme);
			if (theme === "dark") {
				document.documentElement.classList.add("dark");
				document.documentElement.classList.remove("light");
			} else {
				document.documentElement.classList.add("light");
				document.documentElement.classList.remove("dark");
			}
		}, t.theme);

		await page.waitForTimeout(500);

		const brainPath = path.join(BRAIN_DIR, `${t.id}.png`);
		const docsPath = path.join(DOCS_DIR, `${t.id}.png`);

		await page.screenshot({ path: brainPath, fullPage: false });
		await page.screenshot({ path: docsPath, fullPage: false });

		const buf = readFileSync(brainPath);
		const hash = crypto.createHash("md5").update(buf).digest("hex");
		const sizeKb = Math.round(buf.length / 1024);

		console.log(`   Saved: ${brainPath}`);
		console.log(`   Size: ${sizeKb} KB, MD5: ${hash}`);

		if (hashes.has(hash)) {
			console.error(`🚨 HASH COLLISION detected with ${hashes.get(hash)}!`);
		}
		hashes.set(hash, t.id);

		await context.close();
	}

	await browser.close();
	console.log("\n🎉 All 6 visual proofs captured successfully!");
}

run().catch((err) => {
	console.error("❌ Fatal capture error:", err);
	process.exit(1);
});
