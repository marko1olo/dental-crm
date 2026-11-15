import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
	const screenshotDir = path.resolve(process.cwd(), "screenshots");
	const proofsDir = path.resolve(process.cwd(), "docs", "proofs", "payroll");

	if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });
	if (!fs.existsSync(proofsDir)) fs.mkdirSync(proofsDir, { recursive: true });

	const saveScreenshots = (name: string, buffer: Buffer) => {
		fs.writeFileSync(path.join(screenshotDir, name), buffer);
		fs.writeFileSync(path.join(proofsDir, name), buffer);
		console.log(`[PROOF CAPTURED] ${name} (${buffer.length} bytes)`);
	};

	console.log("Launching Edge with serviceWorkers: block...");
	const browser = await chromium.launch({
		channel: "msedge",
		headless: true,
	});

	const applyTheme = async (page: any, theme: "light" | "dark") => {
		await page.evaluate((t: string) => {
			document.documentElement.setAttribute("data-theme", t);
			document.body.setAttribute("data-theme", t);
			if (t === "dark") {
				document.documentElement.classList.add("dark");
				document.documentElement.classList.remove("light");
				document.body.classList.add("dark");
				document.body.classList.remove("light");
			} else {
				document.documentElement.classList.remove("dark");
				document.documentElement.classList.add("light");
				document.body.classList.remove("dark");
				document.body.classList.add("light");
			}
			localStorage.setItem("dente_theme", t);
			localStorage.setItem("dente_theme_mode", t);
		}, theme);
		await sleep(800);
	};

	try {
		// ==========================================
		// PART 1: DOCTOR PAYROLL REPORT (4 STATES)
		// ==========================================
		console.log("\n--- PART 1: DOCTOR PAYROLL REPORT ---");
		
		// 1. PC CONTEXT (1440x900)
		const pcContext = await browser.newContext({
			serviceWorkers: "block",
			viewport: { width: 1440, height: 900 },
		});
		const pcPage = await pcContext.newPage();
		console.log("Navigating PC to doctor-payroll-report...");
		await pcPage.goto("http://127.0.0.1:5173/?standalone=doctor-payroll-report#doctor-payroll-report", {
			waitUntil: "commit",
		});
		await pcPage.waitForSelector('[data-testid="doctor-payroll-report"]', { timeout: 30000 });
		await sleep(1500);

		// 01 PC Light
		console.log("Capturing 01_doctor_payroll_report_pc_light_1440x900.png ...");
		await applyTheme(pcPage, "light");
		const pcReportLight = await pcPage.screenshot({ fullPage: false });
		saveScreenshots("01_doctor_payroll_report_pc_light_1440x900.png", pcReportLight);

		// 02 PC Dark
		console.log("Capturing 02_doctor_payroll_report_pc_dark_1440x900.png ...");
		await applyTheme(pcPage, "dark");
		const pcReportDark = await pcPage.screenshot({ fullPage: false });
		saveScreenshots("02_doctor_payroll_report_pc_dark_1440x900.png", pcReportDark);

		await pcContext.close();

		// 2. MOBILE CONTEXT (390x844)
		const mobContext = await browser.newContext({
			serviceWorkers: "block",
			viewport: { width: 390, height: 844 },
			isMobile: true,
			hasTouch: true,
		});
		const mobPage = await mobContext.newPage();
		console.log("Navigating Mobile to doctor-payroll-report...");
		await mobPage.goto("http://127.0.0.1:5173/?standalone=doctor-payroll-report#doctor-payroll-report", {
			waitUntil: "commit",
		});
		await mobPage.waitForSelector('[data-testid="doctor-payroll-report"]', { timeout: 30000 });
		await sleep(1500);

		// 03 Mobile Light
		console.log("Capturing 03_doctor_payroll_report_mobile_light_390x844.png ...");
		await applyTheme(mobPage, "light");
		const mobReportLight = await mobPage.screenshot({ fullPage: false });
		saveScreenshots("03_doctor_payroll_report_mobile_light_390x844.png", mobReportLight);

		// 04 Mobile Dark
		console.log("Capturing 04_doctor_payroll_report_mobile_dark_390x844.png ...");
		await applyTheme(mobPage, "dark");
		const mobReportDark = await mobPage.screenshot({ fullPage: false });
		saveScreenshots("04_doctor_payroll_report_mobile_dark_390x844.png", mobReportDark);

		await mobContext.close();

		// ==========================================
		// PART 2: DOCTOR PAYROLL STUDIO MODAL (4 STATES)
		// ==========================================
		console.log("\n--- PART 2: DOCTOR PAYROLL STUDIO MODAL ---");

		// 3. PC STUDIO (1440x900)
		const pcStudioContext = await browser.newContext({
			serviceWorkers: "block",
			viewport: { width: 1440, height: 900 },
		});
		const pcStudioPage = await pcStudioContext.newPage();
		console.log("Navigating PC to doctor-payroll-studio (?standalone=payroll#payroll)...");
		await pcStudioPage.goto("http://127.0.0.1:5173/?standalone=payroll#payroll", {
			waitUntil: "commit",
		});
		await pcStudioPage.waitForSelector('[data-testid="doctor-payroll-studio-modal"], .payroll-studio-overlay', {
			timeout: 30000,
		});
		await sleep(1500);

		// 05 Studio PC Light
		console.log("Capturing 05_doctor_payroll_studio_pc_light_1440x900.png ...");
		await applyTheme(pcStudioPage, "light");
		const pcStudioLight = await pcStudioPage.screenshot({ fullPage: false });
		saveScreenshots("05_doctor_payroll_studio_pc_light_1440x900.png", pcStudioLight);

		// 06 Studio PC Dark
		console.log("Capturing 06_doctor_payroll_studio_pc_dark_1440x900.png ...");
		await applyTheme(pcStudioPage, "dark");
		const pcStudioDark = await pcStudioPage.screenshot({ fullPage: false });
		saveScreenshots("06_doctor_payroll_studio_pc_dark_1440x900.png", pcStudioDark);

		await pcStudioContext.close();

		// 4. MOBILE STUDIO (390x844)
		const mobStudioContext = await browser.newContext({
			serviceWorkers: "block",
			viewport: { width: 390, height: 844 },
			isMobile: true,
			hasTouch: true,
		});
		const mobStudioPage = await mobStudioContext.newPage();
		console.log("Navigating Mobile to doctor-payroll-studio (?standalone=payroll#payroll)...");
		await mobStudioPage.goto("http://127.0.0.1:5173/?standalone=payroll#payroll", {
			waitUntil: "commit",
		});
		await mobStudioPage.waitForSelector('[data-testid="doctor-payroll-studio-modal"], .payroll-studio-overlay', {
			timeout: 30000,
		});
		await sleep(1500);

		// 07 Studio Mobile Light
		console.log("Capturing 07_doctor_payroll_studio_mobile_light_390x844.png ...");
		await applyTheme(mobStudioPage, "light");
		const mobStudioLight = await mobStudioPage.screenshot({ fullPage: false });
		saveScreenshots("07_doctor_payroll_studio_mobile_light_390x844.png", mobStudioLight);

		// 08 Studio Mobile Dark
		console.log("Capturing 08_doctor_payroll_studio_mobile_dark_390x844.png ...");
		await applyTheme(mobStudioPage, "dark");
		const mobStudioDark = await mobStudioPage.screenshot({ fullPage: false });
		saveScreenshots("08_doctor_payroll_studio_mobile_dark_390x844.png", mobStudioDark);

		await mobStudioContext.close();

		console.log("\n=== ALL 8 PAYROLL PROOFS CAPTURED SUCCESSFULLY! ===");
	} finally {
		await browser.close();
	}
}

run().catch((err) => {
	console.error("Screenshot capture failed:", err);
	process.exit(1);
});
