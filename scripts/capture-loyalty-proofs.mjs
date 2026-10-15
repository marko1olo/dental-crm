import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
	console.log("=== Starting 4-State Loyalty & Gift Certificate Screenshot Proofs ===");

	const outputDir = path.resolve("docs/proofs/loyalty");
	fs.mkdirSync(outputDir, { recursive: true });

	const browser = await chromium.launch({
		channel: "msedge",
		headless: true,
	});

	try {
		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});

		await context.addInitScript(() => {
			localStorage.setItem("dente_clinic_token", "demo-showcase-clinic-token");
			localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-doctor");
			localStorage.setItem("dente_demo_showcase", "true");
		});

		const page = await context.newPage();

		console.log("Navigating to http://127.0.0.1:5173/?demo=true...");
		const response = await page.goto("http://127.0.0.1:5173/?demo=true", {
			waitUntil: "networkidle",
			timeout: 30000,
		});

		if (!response || response.status() !== 200) {
			throw new Error(`Failed to load app: status code ${response?.status()}`);
		}
		console.log("App loaded successfully (HTTP 200)");

		console.log("Waiting for window.__useUiSurfaceStore...");
		await page.waitForFunction(() => typeof window.__useUiSurfaceStore !== "undefined");
		await wait(500);

		// Open Loyalty & Gift Certificate Modal
		console.log("Opening Loyalty Modal via __useUiSurfaceStore...");
		await page.evaluate(() => {
			if (window.__useUiSurfaceStore) {
				window.__useUiSurfaceStore.getState().openPrimaryModal("loyalty", {
					patientId: "01a00000-0000-0000-0000-000000000001",
					patientName: "Смирнова Анна Сергеевна",
					initialPointsBalance: 1500,
					currentInvoiceAmountKop: 500000,
				});
			}
		});

		await page.waitForSelector(".loyalty-modal-container", { timeout: 10000 });
		console.log(".loyalty-modal-container is rendered in DOM");

		await wait(1200);

		// Switch to Gift Certificates tab to showcase the studio
		await page.evaluate(() => {
			const certTabBtn = Array.from(document.querySelectorAll(".loyalty-tab-btn")).find((b) =>
				b.textContent?.includes("Сертификаты"),
			);
			if (certTabBtn) certTabBtn.click();
		});
		await wait(800);

		// 1. PC Light (1440x900)
		console.log("Capturing PC Light...");
		await page.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "light");
			document.body.setAttribute("data-theme", "light");
			document.documentElement.classList.remove("dark");
		});
		await wait(600);
		const pcLightPath = path.join(outputDir, "loyalty_pc_light.png");
		await page.screenshot({ path: pcLightPath, fullPage: false });
		console.log(`Saved: ${pcLightPath}`);

		// 2. PC Dark (1440x900)
		console.log("Capturing PC Dark...");
		await page.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "dark");
			document.body.setAttribute("data-theme", "dark");
			document.documentElement.classList.add("dark");
		});
		await wait(600);
		const pcDarkPath = path.join(outputDir, "loyalty_pc_dark.png");
		await page.screenshot({ path: pcDarkPath, fullPage: false });
		console.log(`Saved: ${pcDarkPath}`);

		// Close current context and open mobile context for authentic emulation
		await context.close();

		console.log("Creating Mobile Context (390x844, touch, mobile)...");
		const mobileContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			isMobile: true,
			hasTouch: true,
			deviceScaleFactor: 2,
		});

		await mobileContext.addInitScript(() => {
			localStorage.setItem("dente_clinic_token", "demo-showcase-clinic-token");
			localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-doctor");
			localStorage.setItem("dente_demo_showcase", "true");
		});

		const mobilePage = await mobileContext.newPage();
		await mobilePage.goto("http://127.0.0.1:5173/?demo=true", {
			waitUntil: "networkidle",
			timeout: 30000,
		});
		console.log("Waiting for window.__useUiSurfaceStore on mobile...");
		await mobilePage.waitForFunction(() => typeof window.__useUiSurfaceStore !== "undefined");
		await wait(500);

		await mobilePage.evaluate(() => {
			if (window.__useUiSurfaceStore) {
				window.__useUiSurfaceStore.getState().openPrimaryModal("loyalty", {
					patientId: "01a00000-0000-0000-0000-000000000001",
					patientName: "Смирнова Анна Сергеевна",
					initialPointsBalance: 1500,
					currentInvoiceAmountKop: 500000,
				});
			}
		});

		await mobilePage.waitForSelector(".loyalty-modal-container", { timeout: 10000 });
		await wait(1000);

		// Switch to Certificates tab on mobile
		await mobilePage.evaluate(() => {
			const certTabBtn = Array.from(document.querySelectorAll(".loyalty-tab-btn")).find((b) =>
				b.textContent?.includes("Сертификаты"),
			);
			if (certTabBtn) {
				certTabBtn.click();
				certTabBtn.scrollIntoView({ behavior: "instant", inline: "center", block: "nearest" });
			}
		});
		await wait(800);

		// 3. Mobile Dark (390x844)
		console.log("Capturing Mobile Dark...");
		await mobilePage.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "dark");
			document.body.setAttribute("data-theme", "dark");
			document.documentElement.classList.add("dark");
		});
		await wait(600);
		const mobileDarkPath = path.join(outputDir, "loyalty_mobile_dark.png");
		await mobilePage.screenshot({ path: mobileDarkPath, fullPage: false });
		console.log(`Saved: ${mobileDarkPath}`);

		// 4. Mobile Light (390x844)
		console.log("Capturing Mobile Light...");
		await mobilePage.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "light");
			document.body.setAttribute("data-theme", "light");
			document.documentElement.classList.remove("dark");
		});
		await wait(600);
		const mobileLightPath = path.join(outputDir, "loyalty_mobile_light.png");
		await mobilePage.screenshot({ path: mobileLightPath, fullPage: false });
		console.log(`Saved: ${mobileLightPath}`);

		// Verification Report
		console.log("\n=========================================");
		console.log("4-STATE SCREENSHOT VERIFICATION AUDIT");
		console.log("=========================================");
		const files = [
			{ name: "PC Light (1440x900)", path: pcLightPath },
			{ name: "PC Dark (1440x900)", path: pcDarkPath },
			{ name: "Mobile Light (390x844)", path: mobileLightPath },
			{ name: "Mobile Dark (390x844)", path: mobileDarkPath },
		];

		const hashes = new Set();
		for (const item of files) {
			const stat = fs.statSync(item.path);
			const buf = fs.readFileSync(item.path);
			const hash = crypto.createHash("md5").update(buf).digest("hex");
			console.log(`Screen: ${item.name}`);
			console.log(`  Path: ${item.path}`);
			console.log(`  Size: ${stat.size} bytes (min: 20000)`);
			console.log(`  MD5:  ${hash}`);

			if (stat.size < 20000) {
				throw new Error(`Screenshot ${item.name} size is too small: ${stat.size} bytes`);
			}
			if (hashes.has(hash)) {
				throw new Error(`Duplicate screenshot hash detected: ${hash} for ${item.name}`);
			}
			hashes.add(hash);
		}
		console.log("=========================================");
		console.log("ALL 4 SCREENSHOTS SUCCESSFULLY VERIFIED!");
		console.log("=========================================\n");

		await mobileContext.close();
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("Capture failed:", err);
	process.exit(1);
});
