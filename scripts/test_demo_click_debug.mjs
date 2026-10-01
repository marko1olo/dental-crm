import { spawn, execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const port = 5173;

async function debug() {
	let viteProc = null;
	let browser = null;

	try {
		let isServerAlive = false;
		try {
			const ping = await fetch(`http://127.0.0.1:${port}/`);
			isServerAlive = ping.ok || ping.status === 200 || ping.status === 304;
		} catch {
			isServerAlive = false;
		}

		if (!isServerAlive) {
			console.log("Spawning Vite dev server...");
			const viteBin = path.resolve("C:/Clinic_MVP/dental-crm/node_modules/vite/bin/vite.js");
			viteProc = spawn(process.execPath, [viteBin, "--host", "127.0.0.1", "--port", String(port)], {
				cwd: path.resolve("C:/Clinic_MVP/dental-crm/apps/web"),
				stdio: "ignore",
			});
			for (let i = 0; i < 30; i++) {
				await new Promise((r) => setTimeout(r, 500));
				try {
					const check = await fetch(`http://127.0.0.1:${port}/`);
					if (check.ok || check.status === 200 || check.status === 304) {
						isServerAlive = true;
						break;
					}
				} catch {}
			}
		}

		browser = await chromium.launch({
			headless: true,
			executablePath: CHROME_PATH,
			args: ["--no-sandbox", "--disable-web-security", "--use-gl=angle", "--enable-webgl"],
		});

		const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

		page.on("console", (m) => console.log(`[Browser Console ${m.type()}]`, m.text()));
		page.on("pageerror", (e) => console.error("[Browser Error]", e.message));

		await page.addInitScript(() => {
			localStorage.setItem("dente_clinic_token", "audit-token-clinic");
			localStorage.setItem("dente_staff_token", "audit-token-staff");
			localStorage.setItem("dente_active_role", "owner");
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true, onboardingStep: "done", version: 1 }));
			localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true, onboardingDismissed: true, onboardingStep: "done", version: 1 }));
		});

		console.log("Navigating to #imaging...");
		await page.goto("http://127.0.0.1:5173/#imaging", { waitUntil: "domcontentloaded", timeout: 30000 });
		await page.waitForTimeout(2000);

		console.log("Opening 3D MPR modal...");
		const openBtn = page.locator("[data-testid='imaging-open-3d-mpr']");
		await openBtn.waitFor({ state: "visible", timeout: 15000 });
		await openBtn.click();

		const demoBtn = page.locator("[data-testid='cbct-btn-load-demo-empty']");
		await demoBtn.waitFor({ state: "visible", timeout: 10000 });
		console.log("Demo button found. Clicking demo button...");
		await demoBtn.click();

		console.log("Waiting 5 seconds to observe console output and status...");
		for (let s = 1; s <= 5; s++) {
			await page.waitForTimeout(1000);
			const status = await page.evaluate(() => {
				const badge = document.querySelector("[data-testid='cbct-patient-metadata-badge']")?.textContent || "";
				const statusText = document.querySelector("[data-testid='cbct-loading-status-text']")?.textContent || "";
				const body = document.body.innerText;
				return { badge, statusText, hasBodyText: body.includes("Загрузка") || body.includes("КЛКТ") };
			});
			console.log(`[Second ${s}] Status:`, status);
		}

	} finally {
		if (browser) await browser.close().catch(() => {});
		if (viteProc && viteProc.pid) {
			try { execSync(`taskkill /pid ${viteProc.pid} /T /F`, { stdio: "ignore" }); } catch {}
		}
	}
}

debug().catch((e) => {
	console.error("[FATAL]", e);
	process.exit(1);
});
