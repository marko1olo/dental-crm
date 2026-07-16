const { chromium } = require("playwright");
const path = require("path");

async function capture() {
	const browser = await chromium.launch({ headless: true });
	const context = await browser.newContext();
	const page = await context.newPage();

	page.on("console", (msg) =>
		console.log("BROWSER_CONSOLE:", msg.type(), msg.text()),
	);
	page.on("pageerror", (exception) => console.log("BROWSER_ERROR:", exception));

	const destDir =
		"C:\\Users\\Admin\\.gemini\\antigravity\\brain\\63103875-698a-4be4-a4a4-73961a003915";

	console.log("Navigating to app...");
	await page.goto("http://127.0.0.1:5173");

	// Inject fake auth tokens to bypass login in development mode
	await page.evaluate(() => {
		localStorage.setItem("dente_clinic_token", "fake-clinic-token");
		localStorage.setItem("dente_staff_token", "fake-staff-token");
	});
	console.log("Injected fake tokens, reloading...");
	await page.reload({ waitUntil: "load" });

	// Wait for 10 seconds to let the DB load
	console.log("Waiting 10 seconds for app to fully boot...");
	await page.waitForTimeout(10000);

	// 1. PC Light
	console.log("Capturing PC Light...");
	await page.setViewportSize({ width: 1280, height: 800 });
	await page.waitForTimeout(1000);
	await page.screenshot({ path: path.join(destDir, "PC_Light_New.png") });

	// Click theme toggle
	console.log("Toggling theme to Dark...");
	await page.evaluate(() => {
		localStorage.setItem("dente_theme", "dark");
		document.body.setAttribute("data-theme", "dark");
		document.documentElement.classList.add("dark");
		document.body.classList.add("theme-dark");
	});
	await page.waitForTimeout(1000);

	// 2. PC Dark
	console.log("Capturing PC Dark...");
	await page.screenshot({ path: path.join(destDir, "PC_Dark_New.png") });

	// 3. Mobile Dark
	console.log("Capturing Mobile Dark...");
	await page.setViewportSize({ width: 375, height: 812 });
	await page.waitForTimeout(1000);
	await page.screenshot({ path: path.join(destDir, "Mobile_Dark_New.png") });

	// Toggle theme to Light
	console.log("Toggling theme to Light...");
	await page.evaluate(() => {
		localStorage.setItem("dente_theme", "light");
		document.body.setAttribute("data-theme", "light");
		document.documentElement.classList.remove("dark");
		document.body.classList.remove("theme-dark");
	});
	await page.waitForTimeout(1000);

	// 4. Mobile Light
	console.log("Capturing Mobile Light...");
	await page.screenshot({ path: path.join(destDir, "Mobile_Light_New.png") });

	await browser.close();
	console.log("Done.");
}

capture().catch(console.error);
