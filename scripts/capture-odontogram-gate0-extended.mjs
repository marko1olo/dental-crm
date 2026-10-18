import { existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const STAND_URL = "http://127.0.0.1:5173/?stand=odontogram-gate0";
const OUT_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/odontogram");
const BYTE_GUARD_MIN = 20480;

if (!existsSync(OUT_DIR)) {
	mkdirSync(OUT_DIR, { recursive: true });
}

async function isPortResponding(url, timeoutMs = 2000) {
	try {
		const controller = new AbortController();
		const t = setTimeout(() => controller.abort(), timeoutMs);
		const res = await fetch(url, { signal: controller.signal });
		clearTimeout(t);
		return res.ok || res.status === 200 || res.status === 304;
	} catch {
		return false;
	}
}

async function ensureViteServer() {
	if (await isPortResponding(STAND_URL, 1500)) return null;
	const viteBin = path.resolve("C:/Clinic_MVP/dental-crm/node_modules/vite/bin/vite.js");
	const webDir = path.resolve("C:/Clinic_MVP/dental-crm/apps/web");
	const proc = spawn(process.execPath, [viteBin, "--host", "127.0.0.1", "--port", "5173"], {
		cwd: webDir,
		stdio: "ignore",
	});
	for (let i = 0; i < 50; i++) {
		await new Promise((r) => setTimeout(r, 600));
		if (await isPortResponding(STAND_URL, 1000)) return proc;
	}
	throw new Error("Vite failed to start");
}

function verifyByteGuard(filePath) {
	const stats = statSync(filePath);
	if (stats.size < BYTE_GUARD_MIN) {
		throw new Error(`Size ${stats.size} < ${BYTE_GUARD_MIN}`);
	}
	return stats.size;
}

async function run() {
	const viteProc = await ensureViteServer();
	const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
	const browser = await chromium.launch({
		headless: true,
		executablePath: existsSync(chromePath) ? chromePath : undefined,
	});

	try {
		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});
		const page = await context.newPage();

		await page.goto(STAND_URL, { waitUntil: "networkidle", timeout: 30000 });
		await page.waitForSelector('[data-testid="tooth-46-gate0-stand"]');

		// Set Zoom 4x for high-res macro captures
		await page.evaluate(() => {
			const btns = Array.from(document.querySelectorAll("button")).filter(
				(b) => b.innerText.trim() === "4x",
			);
			if (btns.length > 0) btns[0].click();
		});
		await page.waitForTimeout(600);

		const svgBox = await page.locator('svg[role="img"]').boundingBox();
		const wholeClip = {
			x: Math.max(0, Math.floor(svgBox.x - 12)),
			y: Math.max(0, Math.floor(svgBox.y - 10)),
			width: Math.floor(svgBox.width + 24),
			height: Math.floor(svgBox.height + 20),
		};

		await page.evaluate(() => {
			const hud = document.querySelector(".stand-hud");
			if (hud) hud.style.display = "none";
		});

		// 1. Defective Composite
		await page.evaluate(() => {
			const btns = Array.from(document.querySelectorAll("button"));
			const b = btns.find((el) => el.textContent.includes("Пломба (дефект)"));
			if (b) b.click();
		});
		await page.waitForTimeout(400);
		const p1 = path.join(OUT_DIR, "gate0_tooth46_macro_composite_defective.png");
		await page.screenshot({ path: p1, clip: wholeClip });
		console.log(`[Captured] composite_defective: ${verifyByteGuard(p1)} bytes`);

		// 2. Crown Gold
		await page.evaluate(() => {
			const btns = Array.from(document.querySelectorAll("button"));
			const b = btns.find((el) => el.textContent.trim() === "Золото");
			if (b) b.click();
		});
		await page.waitForTimeout(400);
		const p2 = path.join(OUT_DIR, "gate0_tooth46_macro_crown_gold.png");
		await page.screenshot({ path: p2, clip: wholeClip });
		console.log(`[Captured] crown_gold: ${verifyByteGuard(p2)} bytes`);

		// 3. Crown PFM
		await page.evaluate(() => {
			const btns = Array.from(document.querySelectorAll("button"));
			const b = btns.find((el) => el.textContent.trim() === "PFM");
			if (b) b.click();
		});
		await page.waitForTimeout(400);
		const p3 = path.join(OUT_DIR, "gate0_tooth46_macro_crown_pfm.png");
		await page.screenshot({ path: p3, clip: wholeClip });
		console.log(`[Captured] crown_pfm: ${verifyByteGuard(p3)} bytes`);

		// 4. Defective Crown (Chipping & Washout)
		await page.evaluate(() => {
			const btns = Array.from(document.querySelectorAll("button"));
			const b = btns.find((el) => el.textContent.includes("Цирконий (скол)"));
			if (b) b.click();
		});
		await page.waitForTimeout(400);
		const p4 = path.join(OUT_DIR, "gate0_tooth46_macro_crown_defective.png");
		await page.screenshot({ path: p4, clip: wholeClip });
		console.log(`[Captured] crown_defective: ${verifyByteGuard(p4)} bytes`);

		// 5. Abfraction
		await page.evaluate(() => {
			const btns = Array.from(document.querySelectorAll("button"));
			const b = btns.find((el) => el.textContent.includes("Клин. дефект"));
			if (b) b.click();
		});
		await page.waitForTimeout(400);
		const p5 = path.join(OUT_DIR, "gate0_tooth46_macro_abfraction.png");
		await page.screenshot({ path: p5, clip: wholeClip });
		console.log(`[Captured] abfraction: ${verifyByteGuard(p5)} bytes`);

		// 6. Post & Core
		await page.evaluate(() => {
			const btns = Array.from(document.querySelectorAll("button"));
			const b = btns.find((el) => el.textContent.includes("Штифт/Культя"));
			if (b) b.click();
		});
		await page.waitForTimeout(400);
		const p6 = path.join(OUT_DIR, "gate0_tooth46_macro_post_core.png");
		await page.screenshot({ path: p6, clip: wholeClip });
		console.log(`[Captured] post_core: ${verifyByteGuard(p6)} bytes`);

		// 7. Titanium Implant
		await page.evaluate(() => {
			const btns = Array.from(document.querySelectorAll("button"));
			const b = btns.find((el) => el.textContent.trim() === "Имплант");
			if (b) b.click();
		});
		await page.waitForTimeout(400);
		const p7 = path.join(OUT_DIR, "gate0_tooth46_macro_implant.png");
		await page.screenshot({ path: p7, clip: wholeClip });
		console.log(`[Captured] implant: ${verifyByteGuard(p7)} bytes`);

		// 8. Missing Tooth
		await page.evaluate(() => {
			const btns = Array.from(document.querySelectorAll("button"));
			const b = btns.find((el) => el.textContent.includes("Удален"));
			if (b) b.click();
		});
		await page.waitForTimeout(400);
		const p8 = path.join(OUT_DIR, "gate0_tooth46_macro_missing.png");
		await page.screenshot({ path: p8, clip: wholeClip });
		console.log(`[Captured] missing: ${verifyByteGuard(p8)} bytes`);

		await context.close();
		console.log("[DONE] All 8 extended clinical macro proofs captured successfully!");
	} finally {
		await browser.close();
		if (viteProc) {
			try {
				viteProc.kill();
			} catch {}
		}
	}
}

run().catch((e) => {
	console.error(e);
	process.exit(1);
});
