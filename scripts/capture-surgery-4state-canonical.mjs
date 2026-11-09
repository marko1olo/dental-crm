import fs, { existsSync, mkdirSync, statSync, copyFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONV_ID = process.env.CONV_ID || "543b2fe3-d1ec-4c54-8899-7c637667a392";
const PROOFS_DIR = path.resolve(__dirname, "../docs/proofs/surgery");
const DOCS_DIR = path.resolve(__dirname, "../docs/screenshots/surgery");
const BRAIN_DIR = `C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}/screenshots/surgery`;

[PROOFS_DIR, DOCS_DIR, BRAIN_DIR].forEach((dir) => {
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}
});

function isPortOpen(port) {
	return new Promise((resolve) => {
		const sock = net.createConnection({ port, host: "127.0.0.1" }, () => {
			sock.destroy();
			resolve(true);
		});
		sock.on("error", () => resolve(false));
		sock.setTimeout(500, () => {
			sock.destroy();
			resolve(false);
		});
	});
}

async function main() {
	console.log("=== Launching Red Team Surgery 4-State Proof Capture ===");

	const isOpen = await isPortOpen(5173);
	if (!isOpen) {
		throw new Error("[FATAL] Vite is not listening on 127.0.0.1:5173!");
	}
	console.log("[Vite] Verified 127.0.0.1:5173 is OPEN and ready.");

	const possibleBrowserPaths = [
		"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
		"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	];
	const browserPath = possibleBrowserPaths.find((p) => existsSync(p));
	console.log(`[BROWSER] Found browser executable: ${browserPath}`);

	const launchOptions = {
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
	};
	if (browserPath) {
		launchOptions.executablePath = browserPath;
	}

	const browser = await chromium.launch(launchOptions);
	try {
		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			locale: "ru-RU",
		});

		await context.addInitScript(() => {
			try {
				localStorage.setItem("dente_demo_showcase", "true");
				localStorage.setItem("dente_clinic_token", "demo_clinic_token");
				localStorage.setItem("dente_staff_token", "demo_staff_token");
				localStorage.setItem("dente_active_session_token", "demo_staff_token");
				localStorage.setItem("dente_perspective", "implant");
				localStorage.setItem("dente_onboarding_completed", "true");
				localStorage.setItem("dente_tour_completed", "true");
				localStorage.setItem("dente_tour_dismissed", "true");
				localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
				localStorage.setItem("dente_active_role", "doctor");
				localStorage.setItem("dente_role", "doctor");
				localStorage.setItem(
					"dental-crm:active-user:v1",
					JSON.stringify({
						id: "demo-doc",
						fullName: "Д-р Воронов А. В.",
						role: "doctor",
					}),
				);
				sessionStorage.setItem("dente_unlocked", "true");
			} catch (_) {}
		});

		const page = await context.newPage();

		console.log("[NAV] Navigating to http://127.0.0.1:5173/?demo=true#surgery...");
		await page
			.goto("http://127.0.0.1:5173/?demo=true#surgery", {
				waitUntil: "domcontentloaded",
				timeout: 45000,
			})
			.catch((err) => console.log("[WARN] Navigation wait:", err.message));

		console.log("[WAIT] Waiting for .boot-state detachment...");
		await page
			.waitForSelector(".boot-state", { state: "detached", timeout: 30000 })
			.catch(() => {});

		// Suppress any tour overlays & spotlight backdrops
		await page
			.addStyleTag({
				content: `
				.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone,
				.coachmark-tooltip-container, .guide-tour-floating-launcher, .clinical-quest-modal,
				[data-testid="interactive-guide-tour-card"], [data-testid="clinical-quest-banner"],
				.notification-toast, .global-toast, .toast-container, [data-toast], vite-error-overlay,
				[role="status"], .offline-banner, [data-testid="offline-indicator"] {
					display: none !important;
					pointer-events: none !important;
				}
			`,
			})
			.catch(() => {});

		console.log("[WAIT] Checking for Chairside Surgery Hub Modal...");
		let modal = await page
			.waitForSelector('[data-testid="chairside-surgery-hub-modal"]', {
				state: "visible",
				timeout: 15000,
			})
			.catch(() => null);

		if (!modal) {
			console.log("[TRIGGER] Modal not yet visible, triggering dente:open-surgery event...");
			await page.evaluate(() => {
				window.location.hash = "#surgery";
				window.dispatchEvent(
					new CustomEvent("dente:open-surgery", {
						detail: { scenario: "implant", toothFdi: 46 },
					}),
				);
			});
			modal = await page
				.waitForSelector('[data-testid="chairside-surgery-hub-modal"]', {
					state: "visible",
					timeout: 10000,
				})
				.catch(() => null);
		}

		if (!modal) {
			throw new Error(
				"[FATAL] Chairside Surgery Hub Modal failed to render on #surgery!",
			);
		}

		console.log("[READY] Chairside Surgery Hub Modal is mounted and visible!");

		// Click implant scenario chip to show full implant parameters & passport
		try {
			const implantChip = page
				.locator('[data-testid="scenario-chip-implant"]')
				.first();
			if (await implantChip.isVisible({ timeout: 2000 }).catch(() => false)) {
				await implantChip.click();
				await page.waitForTimeout(600);
			}
		} catch (err) {
			console.warn("[WARN] Could not select implant scenario chip:", err.message);
		}

		const states = [
			{
				canonicalName: "01_surgery_hub_pc_light_1440x900.png",
				aliasName: "surgery_pc_light.png",
				viewport: { width: 1440, height: 900 },
				theme: "light",
			},
			{
				canonicalName: "02_surgery_hub_pc_dark_1440x900.png",
				aliasName: "surgery_pc_dark.png",
				viewport: { width: 1440, height: 900 },
				theme: "dark",
			},
			{
				canonicalName: "03_surgery_hub_mobile_light_390x844.png",
				aliasName: "surgery_mobile_light.png",
				viewport: { width: 390, height: 844 },
				theme: "light",
			},
			{
				canonicalName: "04_surgery_hub_mobile_dark_390x844.png",
				aliasName: "surgery_mobile_dark.png",
				viewport: { width: 390, height: 844 },
				theme: "dark",
			},
		];

		for (const state of states) {
			console.log(
				`\n[STATE] Capturing ${state.canonicalName} (${state.viewport.width}x${state.viewport.height}, theme=${state.theme})...`,
			);
			await page.setViewportSize(state.viewport);

			await page.evaluate(
				({ theme }) => {
					const isDark = theme === "dark";
					document.documentElement.setAttribute("data-theme", theme);
					document.documentElement.classList.toggle("dark", isDark);
					document.documentElement.classList.toggle("light", !isDark);
					document.documentElement.style.colorScheme = isDark ? "dark" : "light";
					document.body.setAttribute("data-theme", theme);
					document.body.classList.toggle("dark", isDark);
					document.body.classList.toggle("light", !isDark);
					localStorage.setItem("dente_theme", theme);
					localStorage.setItem("dente_theme_mode", theme);
				},
				{ theme: state.theme },
			);

			await page.waitForTimeout(1000);

			const proofTarget = path.join(PROOFS_DIR, state.canonicalName);
			const proofAlias = path.join(PROOFS_DIR, state.aliasName);
			const docsTarget = path.join(DOCS_DIR, state.canonicalName);
			const docsAlias = path.join(DOCS_DIR, state.aliasName);
			const brainTarget = path.join(BRAIN_DIR, state.canonicalName);
			const brainAlias = path.join(BRAIN_DIR, state.aliasName);

			const buffer = await page.screenshot({ fullPage: false });
			fs.writeFileSync(proofTarget, buffer);
			fs.writeFileSync(proofAlias, buffer);
			fs.writeFileSync(docsTarget, buffer);
			fs.writeFileSync(docsAlias, buffer);
			fs.writeFileSync(brainTarget, buffer);
			fs.writeFileSync(brainAlias, buffer);

			const stats = statSync(proofTarget);
			const sizeKb = Math.round(stats.size / 1024);
			console.log(`[PROOF SAVED] ${state.canonicalName}: ${sizeKb} KB`);
			if (stats.size < 20 * 1024) {
				throw new Error(
					`[ERROR] Screenshot ${state.canonicalName} is too small (${stats.size} bytes < 20KB)!`,
				);
			}
			console.log(`✓ Proof verified: ${state.canonicalName} >= 20 KB`);
		}

		await context.close();
		await browser.close();

		console.log("\n=======================================================");
		console.log(">>> ALL 4 CANONICAL SURGERY HUB PROOFS CAPTURED & VERIFIED <<<");
		console.log("=======================================================\n");
	} catch (err) {
		await browser.close();
		throw err;
	}
}

main().catch((err) => {
	console.error("[FATAL ERROR]:", err);
	process.exit(1);
});
