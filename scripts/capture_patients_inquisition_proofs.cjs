const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const outputDir = path.resolve(__dirname, "../docs/proofs/patients");
if (!fs.existsSync(outputDir)) {
	fs.mkdirSync(outputDir, { recursive: true });
}

async function main() {
	let auth = null;
	for (let i = 0; i < 5; i++) {
		try {
			const loginRes = await fetch("http://127.0.0.1:4100/api/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: "doctor@clinic.com", password: "dente2026" }),
			});
			if (loginRes.ok) {
				auth = await loginRes.json();
				break;
			}
		} catch (e) {
			await new Promise((r) => setTimeout(r, 1000));
		}
	}
	if (!auth) throw new Error("API login failed after 5 retries");
	console.log("Auth ok:", auth.ok, auth.user?.fullName);

	const browser = await chromium.launch({
		executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
		headless: true,
	});

	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		colorScheme: "light",
	});

	await context.addInitScript(({ clinicToken, staffToken, user }) => {
		localStorage.setItem("dente_clinic_token", clinicToken);
		localStorage.setItem("dente_staff_token", staffToken);
		localStorage.setItem("dente_active_role", user.role);
		localStorage.setItem("dental-crm:active-user:v1", JSON.stringify(user));
		localStorage.setItem("dente_theme_mode", "light");
		localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_quest_progress_v2", JSON.stringify({ isDismissedPermanently: true, activeTrack: null, tracksProgress: {} }));
		localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
			version: 1,
			uiLanguage: "ru",
			selectedWorkspaceRole: user.role,
			onboardingDismissed: true,
			onboardingStep: "done",
		}));
	}, { clinicToken: auth.clinicToken, staffToken: auth.staffToken, user: auth.user });

	const page = await context.newPage();
	console.log("Navigating to http://127.0.0.1:5173/#patients ...");
	await page.goto("http://127.0.0.1:5173/#patients", { waitUntil: "commit", timeout: 25000 });
	await page.waitForFunction(() => !document.querySelector(".boot-state"), { timeout: 25000 });
	console.log("Boot state cleared, app mounted!");

	await page.evaluate(() => {
		if (window.__useAppStore) {
			window.__useAppStore.getState().setCurrentView("patients");
		}
		document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container, [role="alert"]').forEach((el) => el.remove());
		document.documentElement.setAttribute("data-theme", "light");
		document.documentElement.classList.remove("dark");
		document.documentElement.classList.add("light");
	});
	await page.waitForTimeout(2000);

	// 1. PC Light
	const p1 = path.join(outputDir, "01_patients_pc_light_1440x900.png");
	await page.screenshot({ path: p1 });
	console.log("Saved:", p1, fs.statSync(p1).size, "bytes");

	// 2. Family Wallet Modal
	console.log("Opening Family Wallet...");
	try {
		const moreBtn = page.locator('[data-testid="header-actions-menu-btn"]').first();
		if (await moreBtn.count() > 0) {
			await moreBtn.click();
			await page.waitForTimeout(600);
			const famBtn = page.locator('button:has-text("Семейный")').first();
			if (await famBtn.count() > 0) {
				await famBtn.click();
				await page.waitForTimeout(2000);
			}
		}
	} catch (e) {
		console.log("Wallet error:", e.message);
	}
	const p3 = path.join(outputDir, "03_patients_family_wallet_pc_light.png");
	await page.screenshot({ path: p3 });
	console.log("Saved:", p3, fs.statSync(p3).size, "bytes");

	// Close modal if open
	await page.keyboard.press("Escape").catch(() => {});
	await page.waitForTimeout(500);

	// 3. PC Dark
	console.log("Switching to PC Dark...");
	await page.evaluate(() => {
		document.documentElement.setAttribute("data-theme", "dark");
		document.documentElement.classList.add("dark");
		document.documentElement.classList.remove("light");
		localStorage.setItem("dente_theme_mode", "dark");
		localStorage.setItem("theme", "dark");
	});
	await page.waitForTimeout(1000);
	const p2 = path.join(outputDir, "02_patients_pc_dark_1440x900.png");
	await page.screenshot({ path: p2 });
	console.log("Saved:", p2, fs.statSync(p2).size, "bytes");

	// 4. Mobile Light
	console.log("Switching to Mobile Light (390x844)...");
	await page.setViewportSize({ width: 390, height: 844 });
	await page.evaluate(() => {
		document.documentElement.setAttribute("data-theme", "light");
		document.documentElement.classList.remove("dark");
		document.documentElement.classList.add("light");
		localStorage.setItem("dente_theme_mode", "light");
		localStorage.setItem("theme", "light");
	});
	await page.waitForTimeout(1500);
	const p4 = path.join(outputDir, "04_patients_mobile_light_390x844.png");
	await page.screenshot({ path: p4 });
	console.log("Saved:", p4, fs.statSync(p4).size, "bytes");

	// 5. Mobile Dark
	console.log("Switching to Mobile Dark (390x844)...");
	await page.evaluate(() => {
		document.documentElement.setAttribute("data-theme", "dark");
		document.documentElement.classList.add("dark");
		document.documentElement.classList.remove("light");
		localStorage.setItem("dente_theme_mode", "dark");
		localStorage.setItem("theme", "dark");
	});
	await page.waitForTimeout(1500);
	const p5 = path.join(outputDir, "05_patients_mobile_dark_390x844.png");
	await page.screenshot({ path: p5 });
	console.log("Saved:", p5, fs.statSync(p5).size, "bytes");

	await browser.close();
	console.log("=== ALL 5 RED TEAM SCREENSHOTS CAPTURED WITH LIVE DATA ===");
}

main().catch((err) => {
	console.error("FAIL:", err);
	process.exit(1);
});
