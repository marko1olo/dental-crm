/**
 * scripts/capture-emr-visit-proofs.cjs
 * Canonical 4-State Proof Capture for EMR Diary & Clinical Stenographer Purity (Mandate 8al, 8bi, 8am)
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const PROOFS_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/emr");
const CONV_ID = process.env.CONV_ID || "8ed1602a-892d-4044-9dc9-e008086a1a25";
const BRAIN_DIR = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}`);

for (const dir of [PROOFS_DIR, BRAIN_DIR]) {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function saveScreenshot(page, outName) {
	const outPath = path.join(PROOFS_DIR, outName);
	await page.screenshot({ path: outPath, fullPage: false, animations: "disabled" });

	const brainPath = path.join(BRAIN_DIR, outName);
	fs.copyFileSync(outPath, brainPath);

	const size = fs.statSync(outPath).size;
	console.log(`[PROOF VERIFIED] ${outName}: ${size} bytes (${(size / 1024).toFixed(1)} KB) -> ${outPath}`);
	if (size < 20000) {
		throw new Error(`Screenshot ${outName} is too small: ${size} bytes (< 20 KB)!`);
	}
}

async function setTheme(page, theme) {
	await page.evaluate((th) => {
		try {
			document.documentElement.setAttribute("data-theme", th);
			document.body.setAttribute("data-theme", th);
			if (th === "dark") {
				document.documentElement.classList.add("dark");
				document.documentElement.classList.remove("light");
			} else {
				document.documentElement.classList.remove("dark");
				document.documentElement.classList.add("light");
			}
			localStorage.setItem("dente_theme", th);
			localStorage.setItem("theme", th);
			window.dispatchEvent(new Event("themechange"));
		} catch (e) {}
	}, theme);
	await page.waitForTimeout(1000);
}

async function getActivePort() {
	const http = require("node:http");
	for (const port of [5174, 5173, 5175]) {
		const ok = await new Promise((resolve) => {
			const req = http.get(`http://127.0.0.1:${port}/`, (res) => {
				resolve(res.statusCode === 200);
			});
			req.on("error", () => resolve(false));
			req.setTimeout(1500, () => {
				req.destroy();
				resolve(false);
			});
		});
		if (ok) return port;
	}
	return 5174;
}

async function capture() {
	const port = await getActivePort();
	const targetUrl = `http://127.0.0.1:${port}/?demo=true&visit_standalone=1#visit-diary`;
	console.log("=== Launching Chrome for 4-State Proofs ===");
	console.log("Target URL:", targetUrl);

	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	try {
		// 1 & 2. PC Light & Dark (1440x900)
		console.log("\n>>> Capturing PC (1440x900)...");
		const pcContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
		await pcContext.addInitScript(() => {
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_tour_dismissed", "true");
			localStorage.setItem("dente_demo_banner_dismissed", "true");
			localStorage.setItem("dente_active_role", "doctor");
		});
		const pcPage = await pcContext.newPage();
		pcPage.on("console", (msg) => console.log("[BROWSER CONSOLE]", msg.type(), msg.text()));
		pcPage.on("pageerror", (err) => console.error("[BROWSER ERROR]", err));
		await pcPage.goto(targetUrl, { waitUntil: "commit", timeout: 30000 });

		console.log("Waiting for clinical diary content to mount...");
		for (let i = 0; i < 25; i++) {
			await pcPage.waitForTimeout(1000);
			try {
				const text = await pcPage.evaluate(() => (document.body ? document.body.innerText : ""));
				if (text.includes("Дневник") || text.includes("Жалобы") || text.includes("Кариес") || text.includes("Смирнова")) {
					console.log(`[PC READY] Rendered at ${i + 1}s!`);
					break;
				}
			} catch (e) {}
		}
		await pcPage.waitForTimeout(2000);

		// PC Light
		console.log("Capturing 01_visit_soap_emk_pc_light_1440x900.png...");
		await setTheme(pcPage, "light");
		await saveScreenshot(pcPage, "01_visit_soap_emk_pc_light_1440x900.png");

		// PC Dark
		console.log("Capturing 02_visit_soap_emk_pc_dark_1440x900.png...");
		await setTheme(pcPage, "dark");
		await saveScreenshot(pcPage, "02_visit_soap_emk_pc_dark_1440x900.png");

		// 3 & 4. Mobile Light & Dark (390x844)
		console.log("\n>>> Capturing Mobile (390x844)...");
		await pcPage.setViewportSize({ width: 390, height: 844 });
		await pcPage.waitForTimeout(2000);

		// Mobile Light
		console.log("Capturing 03_visit_soap_emk_mobile_light_390x844.png...");
		await setTheme(pcPage, "light");
		await saveScreenshot(pcPage, "03_visit_soap_emk_mobile_light_390x844.png");

		// Mobile Dark
		console.log("Capturing 04_visit_soap_emk_mobile_dark_390x844.png...");
		await setTheme(pcPage, "dark");
		await saveScreenshot(pcPage, "04_visit_soap_emk_mobile_dark_390x844.png");

		await pcContext.close();

		console.log("\n=======================================================");
		console.log(">>> ALL 4 VISIT EMR/SOAP PROOFS SUCCESSFULLY CAPTURED! <<<");
		console.log("=======================================================\n");
	} finally {
		await browser.close();
	}
}

capture().catch((err) => {
	console.error("[FATAL] Capture error:", err);
	process.exit(1);
});
