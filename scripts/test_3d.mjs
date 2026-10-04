import { chromium } from "playwright";

async function run() {
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
	const page = await browser.newPage();
	page.on("console", (msg) => {
		const txt = msg.text();
		if (txt.includes("CbctVolume3D") || txt.includes("WebGL") || txt.includes("ERROR") || txt.includes("Init") || txt.includes("gl")) {
			console.log("PAGE LOG:", txt);
		}
	});
	page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));

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

	const res = await page.evaluate(async () => {
		const btn = document.querySelector("[data-testid='imaging-open-3d-mpr']");
		if (!btn) return "no open button";
		btn.click();
		await new Promise((r) => setTimeout(r, 1000));
		const demoBtn = document.querySelector("[data-testid='cbct-btn-load-demo-empty']");
		if (demoBtn) demoBtn.click();
		await new Promise((r) => setTimeout(r, 3000));
		const canvas = document.querySelector("[data-testid='cbct-volume-3d-canvas']");
		if (!canvas) return "no 3d canvas";
		const badge = document.querySelector("[data-testid='cbct-volume-3d-hardware-badge']");
		return {
			canvasWidth: canvas.width,
			canvasHeight: canvas.height,
			badgeText: badge ? badge.textContent : null,
		};
	});

	console.log("Result:", JSON.stringify(res));
	await browser.close();
}

run().catch(console.error);
