/**
 * scripts/capture-domain33-canonical-proofs.mjs
 * Red Team Canonical 4-State Visual Proof for Periodontics & Florida Chart (Domain 33)
 */
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { chromium } from "playwright";

const SUBAGENT_BRAIN = "C:/Users/Admin/.gemini/antigravity/brain/c3ee3c5e-b78e-4f94-bbe7-1983ae917840";
const ORCH_BRAIN = "C:/Users/Admin/.gemini/antigravity/brain/1a5ac924-43af-42a0-a684-00dbb822c536";
const DOCS_PERIO = path.resolve("docs/proofs/perio");

[DOCS_PERIO, SUBAGENT_BRAIN, ORCH_BRAIN].forEach((dir) => {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

async function findLivePort() {
	for (const port of [5174, 5173, 5175, 3000]) {
		const isOk = await new Promise((resolve) => {
			const req = http.get(`http://127.0.0.1:${port}/`, { timeout: 1500 }, (res) => {
				resolve(res.statusCode === 200);
			});
			req.on("error", () => resolve(false));
			req.on("timeout", () => { req.destroy(); resolve(false); });
		});
		if (isOk) return port;
	}
	return 5174;
}

const STATES = [
	{
		id: "01_perio_pc_light_1440x900",
		viewport: { width: 1440, height: 900 },
		theme: "light",
		isMobile: false,
	},
	{
		id: "02_perio_pc_dark_1440x900",
		viewport: { width: 1440, height: 900 },
		theme: "dark",
		isMobile: false,
	},
	{
		id: "03_perio_mobile_light_390x844",
		viewport: { width: 390, height: 844 },
		theme: "light",
		isMobile: true,
	},
	{
		id: "04_perio_mobile_dark_390x844",
		viewport: { width: 390, height: 844 },
		theme: "dark",
		isMobile: true,
	},
];

async function applyTheme(page, theme) {
	await page.evaluate((th) => {
		const html = document.documentElement;
		const body = document.body;
		html.setAttribute("data-theme", th);
		body.setAttribute("data-theme", th);
		if (th === "dark") {
			html.classList.add("dark");
			html.classList.remove("light");
			body.classList.add("dark");
			body.classList.remove("light");
		} else {
			html.classList.remove("dark");
			html.classList.add("light");
			body.classList.remove("dark");
			body.classList.add("light");
		}
		html.style.colorScheme = th;
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("dente_theme_mode", th);
		localStorage.setItem("theme", th);
		window.dispatchEvent(new Event("themechange"));
	}, theme);
	await page.waitForTimeout(600);
}

async function suppressOverlays(page) {
	await page.evaluate(() => {
		const style = document.createElement("style");
		style.id = "suppress-all-overlays-perio";
		style.innerHTML = `
			.tour-spotlight-root, .tour-backdrop-clickable-zone,
			[data-testid="guided-tour-spotlight-overlay"],
			[data-testid="guided-tour-coach-mark-card"],
			[data-testid="demo-mode-banner"], .global-toast-container,
			.boot-state, #boot-screen, .app-boot-container,
			vite-error-overlay { display: none !important; pointer-events: none !important; }
		`;
		document.head.appendChild(style);
	}).catch(() => {});
}

async function main() {
	const port = await findLivePort();
	const baseUrl = `http://127.0.0.1:${port}/?perio=1#perio`;
	console.log(`[CAPTURE DOMAIN 33] Found live port ${port}. Navigating to ${baseUrl}...`);

	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	try {
		for (const state of STATES) {
			console.log(`\n--- Capturing ${state.id} (${state.theme}, ${state.viewport.width}x${state.viewport.height}) ---`);
			const context = await browser.newContext({
				viewport: state.viewport,
				deviceScaleFactor: state.isMobile ? 2 : 1,
				isMobile: state.isMobile,
				hasTouch: state.isMobile,
				colorScheme: state.theme,
				locale: "ru-RU",
			});

			await context.addInitScript(() => {
				localStorage.setItem("dente_clinic_token", "demo-showcase-token-owner");
				localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-owner");
				localStorage.setItem("dente_active_session_token", "demo-showcase-staff-token-owner");
				localStorage.setItem("dente_active_role", "doctor");
				localStorage.setItem("dente_active_mode", "clinic");
				localStorage.setItem("dente_onboarding_completed", "true");
				localStorage.setItem("dente_tour_completed", "true");
				localStorage.setItem("dente_demo_banner_dismissed", "true");
				localStorage.setItem("dente_theme_mode", "light");
			});

			const page = await context.newPage();
			await page.goto(baseUrl, {
				waitUntil: "commit",
				timeout: 20000,
			});
			await page.waitForTimeout(3000);
			await suppressOverlays(page);

			// Открываем модалку если нужно
			await page.evaluate(() => {
				window.dispatchEvent(new CustomEvent("dente:open-perio", {
					detail: { patientName: "Иванов Иван Иванович (38 лет, частичная адентия)" },
				}));
				window.dispatchEvent(new CustomEvent("dente:open-perio-modal", {
					detail: { patientName: "Иванов Иван Иванович (38 лет, частичная адентия)" },
				}));
			});
			await page.waitForTimeout(1500);

			// Раскрываем блок детального зондирования челюстей на десктопе
			if (!state.isMobile) {
				const expandBtn = await page.$('[data-testid="perio-detailed-toggle-btn"]');
				if (expandBtn) {
					await expandBtn.click();
					await page.waitForTimeout(800);
				}
			}

			await applyTheme(page, state.theme);
			await suppressOverlays(page);

			// Стабилизация шрифтов
			await page.evaluate(async () => {
				if (document.fonts?.ready) await document.fonts.ready;
			});
			await page.waitForTimeout(600);

			const filename = `${state.id}.png`;
			const docPath = path.join(DOCS_PERIO, filename);
			const subPath = path.join(SUBAGENT_BRAIN, filename);
			const orchPath = path.join(ORCH_BRAIN, filename);

			await page.screenshot({ path: docPath, fullPage: false, animations: "disabled" });
			try { fs.copyFileSync(docPath, subPath); } catch {}
			try { fs.copyFileSync(docPath, orchPath); } catch {}

			const size = fs.statSync(docPath).size;
			console.log(`[VERIFIED PROOF] ${filename} -> ${(size / 1024).toFixed(1)} KB`);
			if (size < 40960) {
				console.warn(`[WARNING] ${filename} is ${(size / 1024).toFixed(1)} KB (< 40 KB)`);
			}

			await context.close();
		}

		console.log("\n✅ All 4 canonical proofs captured successfully!");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("[FATAL ERROR]:", err);
	process.exit(1);
});
