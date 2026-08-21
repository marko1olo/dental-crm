import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const OUT_DIRS = [
	"C:/Clinic_MVP/dental-crm/docs/proofs/odontogram",
	"C:/Clinic_MVP/dental-crm/apps/web/screenshots",
	"C:/Users/Admin/.gemini/antigravity/brain/0284cf50-cf45-4b19-be4c-f6f53b03120f/visual_audit_shots",
	"C:/Users/Admin/.gemini/antigravity/brain/0284cf50-cf45-4b19-be4c-f6f53b03120f",
];

for (const dir of OUT_DIRS) {
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}
}

const edgePath = [
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].find((p) => existsSync(p));

if (!edgePath) {
	console.error("Microsoft Edge not found!");
	process.exit(1);
}

const browser = await chromium.launch({
	executablePath: edgePath,
	headless: true,
	args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
});

async function setTheme(p, theme) {
	await p.evaluate((th) => {
		document.documentElement.setAttribute("data-theme", th);
		if (th === "light") {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			document.body.className = "light";
		} else {
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
			document.body.className = "dark";
		}
	}, theme);
	await p.waitForTimeout(400);
}

async function captureAll() {
	const context = await browser.newContext({
		viewport: { width: 1440, height: 960 },
		deviceScaleFactor: 2,
	});

	const page = await context.newPage();
	await page.goto("http://127.0.0.1:5173/#odontogram-studio", {
		waitUntil: "networkidle",
	});

	await page.waitForSelector(".tooth-chart-arch-container, .tooth-chart-container, .gost-odontogram-container, header", {
		timeout: 15000,
	});

	// 1. 01_studio_3d_anatomical_pc_dark.png (PC Dark)
	await setTheme(page, "dark");
	const tab3d = page.locator("button", { hasText: "3D Анатомический" });
	if (await tab3d.count()) await tab3d.click();
	await page.waitForTimeout(600);

	for (const dir of OUT_DIRS) {
		await page.screenshot({
			path: path.join(dir, "01_studio_3d_anatomical_pc_dark.png"),
			fullPage: false,
		});
	}
	console.log("Saved: 01_studio_3d_anatomical_pc_dark.png");

	// 2. 02_studio_3d_anatomical_pc_light.png (PC Light)
	await setTheme(page, "light");
	await page.waitForTimeout(600);
	for (const dir of OUT_DIRS) {
		await page.screenshot({
			path: path.join(dir, "02_studio_3d_anatomical_pc_light.png"),
			fullPage: false,
		});
	}
	console.log("Saved: 02_studio_3d_anatomical_pc_light.png");

	// Switch back to Dark for remaining PC views
	await setTheme(page, "dark");

	// 3. 03_studio_radial_menu_pc_dark.png (Radial Menu Open on Tooth 16)
	const tooth16Btn = page.locator("button[data-tooth-id='16']").first();
	if (await tooth16Btn.count()) {
		await tooth16Btn.click();
		await page.waitForTimeout(500);
		for (const dir of OUT_DIRS) {
			await page.screenshot({
				path: path.join(dir, "03_studio_radial_menu_pc_dark.png"),
				fullPage: false,
			});
		}
		console.log("Saved: 03_studio_radial_menu_pc_dark.png");

		// Close radial menu
		await page.keyboard.press("Escape");
		await page.waitForTimeout(300);
	}

	// 4. 04_studio_compact_clinical_pc_dark.png (5-Surface Compact)
	const tab5s = page.locator("button", { hasText: "5-Поверхностный" });
	if (await tab5s.count()) await tab5s.click();
	await page.waitForTimeout(600);
	for (const dir of OUT_DIRS) {
			await page.screenshot({
				path: path.join(dir, "04_studio_compact_clinical_pc_dark.png"),
				fullPage: false,
				animations: "disabled",
				timeout: 15000,
			});
	}
	console.log("Saved: 04_studio_compact_clinical_pc_dark.png");

	// 5. 05_studio_classic_gost_pc_dark.png (Classic GOST 043/u)
	const tabGost = page.locator("button", { hasText: "ГОСТ 043/у" });
	if (await tabGost.count()) await tabGost.click();
	await page.waitForTimeout(600);
	for (const dir of OUT_DIRS) {
		await page.screenshot({
			path: path.join(dir, "05_studio_classic_gost_pc_dark.png"),
			fullPage: false,
			animations: "disabled",
			timeout: 15000,
		});
	}
	console.log("Saved: 05_studio_classic_gost_pc_dark.png");

	// 6. 06_studio_live_invoice_pc_dark.png (Live Invoice Open)
	const btnInvoice = page.locator("button", { hasText: "Живая смета" });
	if (await btnInvoice.count()) await btnInvoice.click();
	await page.waitForTimeout(600);
	for (const dir of OUT_DIRS) {
		await page.screenshot({
			path: path.join(dir, "06_studio_live_invoice_pc_dark.png"),
			fullPage: false,
			animations: "disabled",
			timeout: 15000,
		});
	}
	console.log("Saved: 06_studio_live_invoice_pc_dark.png");

	await context.close();

	// 7 & 8: Mobile Viewports (390 x 844)
	const mobileContext = await browser.newContext({
		viewport: { width: 390, height: 844 },
		deviceScaleFactor: 3,
		isMobile: true,
		hasTouch: true,
	});

	const mobilePage = await mobileContext.newPage();
	await mobilePage.goto("http://127.0.0.1:5173/#odontogram-studio", {
		waitUntil: "networkidle",
	});
	await mobilePage.waitForTimeout(600);

	// 07_studio_mobile_light.png
	await setTheme(mobilePage, "light");
	await mobilePage.waitForTimeout(600);
	for (const dir of OUT_DIRS) {
		await mobilePage.screenshot({
			path: path.join(dir, "07_studio_mobile_light.png"),
			fullPage: false,
			animations: "disabled",
			timeout: 15000,
		});
	}
	console.log("Saved: 07_studio_mobile_light.png");

	// 08_studio_mobile_dark.png
	await setTheme(mobilePage, "dark");
	await mobilePage.waitForTimeout(600);
	for (const dir of OUT_DIRS) {
		await mobilePage.screenshot({
			path: path.join(dir, "08_studio_mobile_dark.png"),
			fullPage: false,
			animations: "disabled",
			timeout: 15000,
		});
	}
	console.log("Saved: 08_studio_mobile_dark.png");

	await mobileContext.close();
	await browser.close();
	console.log("All screenshots successfully captured and audited!");
}

await captureAll();
