import { chromium } from "playwright";

async function main() {
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: [
			"--no-sandbox",
			"--disable-setuid-sandbox",
			"--disable-web-security",
			"--ignore-gpu-blocklist",
			"--use-gl=angle",
			"--enable-webgl",
			"--disable-dev-shm-usage",
		],
	});

	const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
	const page = await context.newPage();

	page.on("console", (m) => {
		const txt = m.text();
		if (!txt.includes("vite") && !txt.includes("Download")) {
			console.log(`[PAGE ${m.type()}]:`, txt);
		}
	});
	page.on("pageerror", (e) => console.error("[PAGE ERROR]:", e));

	await page.addInitScript(() => {
		localStorage.setItem("dente_clinic_token", "audit-token-clinic");
		localStorage.setItem("dente_staff_token", "audit-token-staff");
		localStorage.setItem("dente_active_role", "owner");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_doctor_training_completed", "true");
		localStorage.setItem("dente_training_dismissed", "true");
		localStorage.setItem("dente_demo_showcase", "true");
		localStorage.setItem("dente_quest_progress_v2", JSON.stringify({ isTourActive: false, isDismissedPermanently: true }));
	});

	await page.goto("http://127.0.0.1:5173/#imaging", { waitUntil: "domcontentloaded" });
	await page.waitForTimeout(2000);

	// Open MPR Modal
	const openMprBtn = page.locator("[data-testid='imaging-open-3d-mpr']");
	await openMprBtn.click();
	await page.waitForTimeout(1500);

	// Click demo volume
	const loadDemoBtn = page.locator("[data-testid='cbct-btn-load-demo-empty']");
	if (await loadDemoBtn.isVisible()) {
		await loadDemoBtn.click();
		await page.waitForTimeout(3000);
	}

	const canvasInfo = await page.evaluate(() => {
		const canvas = document.querySelector("[data-testid='cbct-volume-3d-canvas']");
		if (!canvas) return { error: "canvas not found" };
		const rect = canvas.getBoundingClientRect();
		// Try reading pixels
		let centerPixel = null;
		let glError = null;
		try {
			const gl = canvas.getContext("webgl2");
			if (gl) {
				const pix = new Uint8Array(4);
				gl.readPixels(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pix);
				centerPixel = Array.from(pix);
				glError = gl.getError();
			}
		} catch (e) {
			glError = e.message;
		}

		const badge = document.querySelector("[data-testid='cbct-volume-3d-hardware-badge']");

		return {
			rect: { width: rect.width, height: rect.height },
			canvasSize: { width: canvas.width, height: canvas.height },
			centerPixel,
			glError,
			badgeText: badge ? badge.textContent : null,
		};
	});

	console.log("Canvas in-page diagnostic:", JSON.stringify(canvasInfo, null, 2));
	await browser.close();
}

main().catch(console.error);
