import { chromium } from "playwright";

async function test() {
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

	const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

	page.on("console", (m) => console.log(`[Browser ${m.type()}]:`, m.text()));
	page.on("pageerror", (e) => console.error("[Browser Error]:", e.message));

	await page.addInitScript(() => {
		localStorage.setItem("dente_clinic_token", "audit-token-clinic");
		localStorage.setItem("dente_staff_token", "audit-token-staff");
		localStorage.setItem("dente_active_role", "owner");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_doctor_training_completed", "true");
		localStorage.setItem("dente_training_dismissed", "true");
		localStorage.setItem("dente_demo_showcase", "true");
		localStorage.setItem("dente_quest_progress_v2", JSON.stringify({
			activeTrackId: "solo_doctor",
			currentStepIndex: 0,
			completedStepIds: ["schedule_booking", "odontogram_formula", "visit_diary_043"],
			isTourActive: false,
			isDismissedPermanently: true,
			tracksProgress: {
				solo_doctor: { completed: true, completedStepIds: ["schedule_booking", "odontogram_formula", "visit_diary_043"] },
				reception_admin: { completed: true, completedStepIds: [] },
				imaging_diagnostics: { completed: true, completedStepIds: [] },
			},
		}));
	});

	await page.goto("http://127.0.0.1:5173/#imaging");
	await page.waitForTimeout(1500);

	const btn = page.locator("[data-testid='imaging-open-3d-mpr']");
	await btn.click({ force: true });
	await page.waitForTimeout(2000);

	const demoBtn = page.locator("[data-testid='cbct-btn-load-demo-empty']");
	if (await demoBtn.isVisible()) {
		await demoBtn.click({ force: true });
		await page.waitForTimeout(3000);
	}

	const diag = await page.evaluate(() => {
		const canvas = document.querySelector("[data-testid='cbct-volume-3d-canvas']");
		const hud = document.querySelector("[data-testid='cbct-hud-gpu-status']");
		if (!canvas) return { error: "No canvas found" };
		const gl = canvas.getContext("webgl2");
		return {
			canvasWidth: canvas.width,
			canvasHeight: canvas.height,
			hudText: hud ? hud.textContent : null,
			hasWebgl2: !!gl,
			glError: gl ? gl.getError() : null,
		};
	});

	console.log("DIAGNOSTIC RESULT:", diag);
	await browser.close();
}

test();
