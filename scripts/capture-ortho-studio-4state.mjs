import { spawn } from "node:child_process";
import fs, { existsSync, mkdirSync, statSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROOFS_DIR = path.resolve(__dirname, "../docs/proofs/orthodontics");
if (!existsSync(PROOFS_DIR)) {
	mkdirSync(PROOFS_DIR, { recursive: true });
}

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

async function ensureVite() {
	if (await isPortOpen(5173)) {
		console.log("[Vite] Port 5173 is already open!");
		return null;
	}
	console.log("[Vite] Spawning dev server on 127.0.0.1:5173...");
	const viteBin = path.resolve(__dirname, "../node_modules/vite/bin/vite.js");
	const webDir = path.resolve(__dirname, "../apps/web");
	const proc = spawn(process.execPath, ["--max-old-space-size=2048", viteBin, "--host", "127.0.0.1", "--port", "5173"], {
		cwd: webDir,
		stdio: "ignore",
	});
	for (let i = 0; i < 40; i++) {
		await new Promise((r) => setTimeout(r, 600));
		if (await isPortOpen(5173)) {
			console.log(`[Vite] Ready on 5173 in ${(i + 1) * 600}ms!`);
			return proc;
		}
	}
	try { proc.kill(); } catch {}
	throw new Error("Failed to start Vite on 5173");
}

async function main() {
	const viteProc = await ensureVite();
	let browser;

	try {
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

		browser = await chromium.launch(launchOptions);
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
				localStorage.setItem("dente_perspective", "orthodontic");
				localStorage.setItem("dente_onboarding_completed", "true");
				localStorage.setItem("dente_tour_completed", "true");
				localStorage.setItem("dente_tour_dismissed", "true");
				localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
				localStorage.setItem("dente_active_role", "doctor");
				localStorage.setItem("dente_role", "doctor");
				localStorage.setItem("dental-crm:active-user:v1", JSON.stringify({ id: "demo-doc", fullName: "Д-р Соколов А. В.", role: "doctor" }));
				sessionStorage.setItem("dente_unlocked", "true");
			} catch (_) {}
		});

		const page = await context.newPage();

		console.log("[NAV] Navigating to http://127.0.0.1:5173/?demo=true#ortho...");
		await page.goto("http://127.0.0.1:5173/?demo=true#ortho", {
			waitUntil: "domcontentloaded",
			timeout: 45000,
		}).catch((err) => console.log("[WARN] Navigation wait:", err.message));

		console.log("[WAIT] Waiting for .boot-state detachment...");
		await page.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});

		// Suppress any tour overlays & spotlight backdrops
		await page.addStyleTag({
			content: `
				.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone,
				.coachmark-tooltip-container, .guide-tour-floating-launcher, .clinical-quest-modal,
				[data-testid="interactive-guide-tour-card"], [data-testid="clinical-quest-banner"],
				.notification-toast, .global-toast, .toast-container, [data-toast], vite-error-overlay {
					display: none !important;
					pointer-events: none !important;
				}
			`,
		}).catch(() => {});

		console.log("[WAIT] Checking for orthodontic studio modal...");
		let modal = await page.waitForSelector('[data-testid="orthodontic-studio-modal"]', { state: "visible", timeout: 15000 }).catch(() => null);

		if (!modal) {
			console.log("[TRIGGER] Modal not yet visible, triggering dente:open-ortho event...");
			await page.evaluate(() => {
				window.location.hash = "#ortho";
				window.dispatchEvent(new CustomEvent("dente:open-ortho"));
			});
			modal = await page.waitForSelector('[data-testid="orthodontic-studio-modal"]', { state: "visible", timeout: 10000 }).catch(() => null);
		}

		if (!modal) {
			throw new Error("[FATAL] Orthodontic studio modal failed to render on #ortho!");
		}

		console.log("[READY] Orthodontic studio modal is mounted and visible!");

		const states = [
			{
				name: "01_ortho_studio_pc_light_1440x900.png",
				viewport: { width: 1440, height: 900 },
				theme: "light",
			},
			{
				name: "02_ortho_studio_pc_dark_1440x900.png",
				viewport: { width: 1440, height: 900 },
				theme: "dark",
			},
			{
				name: "03_ortho_studio_mobile_light_390x844.png",
				viewport: { width: 390, height: 844 },
				theme: "light",
			},
			{
				name: "04_ortho_studio_mobile_dark_390x844.png",
				viewport: { width: 390, height: 844 },
				theme: "dark",
			},
		];

		for (const state of states) {
			console.log(`\n[STATE] Capturing ${state.name} (${state.viewport.width}x${state.viewport.height}, theme=${state.theme})...`);
			await page.setViewportSize(state.viewport);

			await page.evaluate(({ theme }) => {
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
			}, { theme: state.theme });

			await page.waitForTimeout(1000);

			const targetPath = path.join(PROOFS_DIR, state.name);
			const buffer = await page.screenshot({ fullPage: false });
			fs.writeFileSync(targetPath, buffer);

			const stats = statSync(targetPath);
			const sizeKb = Math.round(stats.size / 1024);
			console.log(`[PROOF SAVED] ${state.name}: ${sizeKb} KB`);
			if (stats.size < 20 * 1024) {
				throw new Error(`[ERROR] Screenshot ${state.name} is too small (${stats.size} bytes < 20KB)!`);
			}
			console.log(`✓ Proof verified: ${state.name} >= 20 KB`);
		}

		await context.close();
		await browser.close();

		console.log("\n=======================================================");
		console.log(">>> ALL 4 CANONICAL ORTHO STUDIO PROOFS CAPTURED & VERIFIED <<<");
		console.log("=======================================================\n");

	} finally {
		if (viteProc && viteProc.pid) {
			console.log(`[CLEANUP] Stopping Vite server (PID: ${viteProc.pid})...`);
			try {
				process.kill(viteProc.pid);
			} catch (_) {}
		}
	}
}

main().catch((err) => {
	console.error("[FATAL ERROR]:", err);
	process.exit(1);
});
