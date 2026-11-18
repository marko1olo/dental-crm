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

	console.log("Launching Edge...");
	const browser = await chromium.launch({ channel: "msedge", headless: true });
	const page = await browser.newPage();

	const applyTheme = async (theme: "light" | "dark") => {
		await page.evaluate((t: string) => {
			if (t === "dark") {
				document.documentElement.classList.remove("light");
				document.documentElement.classList.add("dark");
				document.documentElement.setAttribute("data-theme", "dark");
				document.body.setAttribute("data-theme", "dark");
			} else {
				document.documentElement.classList.remove("dark");
				document.documentElement.classList.add("light");
				document.documentElement.setAttribute("data-theme", "light");
				document.body.setAttribute("data-theme", "light");
			}
			localStorage.setItem("dente_theme", t);
			localStorage.setItem("dente_theme_mode", t);
		}, theme);
		await sleep(600);
	};

	try {
		console.log("Navigating to standalone doctor-payroll-report on 5175...");
		await page.goto("http://127.0.0.1:5175/?standalone=doctor-payroll-report#doctor-payroll-report", {
			waitUntil: "commit",
		});

		console.log("Waiting for selector [data-testid='doctor-payroll-report']...");
		await page.waitForSelector('[data-testid="doctor-payroll-report"]', {
			timeout: 60000,
		});
		console.log("Doctor Payroll Report mounted successfully!");
		await sleep(1500);

		// 1. PC Light (1440x900)
		console.log("Capturing 01_doctor_payroll_report_pc_light_1440x900.png ...");
		await page.setViewportSize({ width: 1440, height: 900 });
		await sleep(600);
		await applyTheme("light");
		const pcReportLight = await page.screenshot({ fullPage: false });
		saveScreenshots("01_doctor_payroll_report_pc_light_1440x900.png", pcReportLight);

		// 2. PC Dark (1440x900)
		console.log("Capturing 02_doctor_payroll_report_pc_dark_1440x900.png ...");
		await applyTheme("dark");
		const pcReportDark = await page.screenshot({ fullPage: false });
		saveScreenshots("02_doctor_payroll_report_pc_dark_1440x900.png", pcReportDark);

		// 3. Mobile Light (390x844)
		console.log("Capturing 03_doctor_payroll_report_mobile_light_390x844.png ...");
		await page.setViewportSize({ width: 390, height: 844 });
		await sleep(600);
		await applyTheme("light");
		const mobReportLight = await page.screenshot({ fullPage: false });
		saveScreenshots("03_doctor_payroll_report_mobile_light_390x844.png", mobReportLight);

		// 4. Mobile Dark (390x844)
		console.log("Capturing 04_doctor_payroll_report_mobile_dark_390x844.png ...");
		await applyTheme("dark");
		const mobReportDark = await page.screenshot({ fullPage: false });
		saveScreenshots("04_doctor_payroll_report_mobile_dark_390x844.png", mobReportDark);

		// 5. Open Studio Modal via CTA
		console.log("Clicking [data-testid='payroll-open-studio-cta'] ...");
		const cta = await page.waitForSelector('[data-testid="payroll-open-studio-cta"]', { timeout: 10000 });
		await cta.click();

		console.log("Waiting for Studio Modal...");
		await page.waitForSelector('[data-testid="doctor-payroll-studio-modal"], .payroll-studio-overlay', { timeout: 25000 });
		await sleep(1000);

		// 6. Studio Mobile Dark (390x844)
		console.log("Capturing 08_doctor_payroll_studio_mobile_dark_390x844.png ...");
		await applyTheme("dark");
		const mobStudioDark = await page.screenshot({ fullPage: false });
		saveScreenshots("08_doctor_payroll_studio_mobile_dark_390x844.png", mobStudioDark);

		// 7. Studio Mobile Light (390x844)
		console.log("Capturing 07_doctor_payroll_studio_mobile_light_390x844.png ...");
		await applyTheme("light");
		const mobStudioLight = await page.screenshot({ fullPage: false });
		saveScreenshots("07_doctor_payroll_studio_mobile_light_390x844.png", mobStudioLight);

		// 8. Studio PC (1440x900)
		console.log("Capturing Studio PC Light & Dark (1440x900) ...");
		await page.setViewportSize({ width: 1440, height: 900 });
		await sleep(800);

		await applyTheme("light");
		const pcStudioLight = await page.screenshot({ fullPage: false });
		saveScreenshots("05_doctor_payroll_studio_pc_light_1440x900.png", pcStudioLight);

		await applyTheme("dark");
		const pcStudioDark = await page.screenshot({ fullPage: false });
		saveScreenshots("06_doctor_payroll_studio_pc_dark_1440x900.png", pcStudioDark);

		console.log("=== ALL 8 PAYROLL PROOFS CAPTURED SUCCESSFULLY! ===");
	} finally {
		await browser.close();
	}
}

run().catch((e) => {
	console.error("CAPTURE ERROR:", e);
	process.exit(1);
});
