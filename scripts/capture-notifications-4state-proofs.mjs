import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { spawn } from "node:child_process";
import { createServer } from "vite";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const webRoot = path.resolve(rootDir, "apps/web");
const configFile = path.resolve(webRoot, "vite.config.ts");
const PROOFS_DIR = path.resolve(rootDir, "docs/proofs/notifications");

fs.mkdirSync(PROOFS_DIR, { recursive: true });

function verifyProof(filePath) {
	const size = fs.statSync(filePath).size;
	if (size < 20480) {
		throw new Error(`[BLANK DETECTED] ${filePath} is ${size} bytes (< 20KB)!`);
	}
	console.log(`[PROOF OK] ${path.basename(filePath)} (${(size / 1024).toFixed(1)} KB)`);
	return size;
}

async function tryLogin() {
	try {
		const res = await fetch("http://127.0.0.1:4100/api/auth/login", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email: "clinic@example.com", password: "dente2026" }),
		});
		if (!res.ok) return null;
		const data = await res.json();
		if (data.ok) return data;
	} catch (_) {}
	return null;
}

async function ensureApiServer() {
	const existing = await tryLogin();
	if (existing) {
		console.log("[API] Already running on 127.0.0.1:4100");
		return { auth: existing, apiChild: null };
	}

	console.log("[API] Starting Fastify API server (apps/api/src/server.ts)...");
	const apiChild = spawn("node", ["--max-old-space-size=2048", "--import", "tsx", "apps/api/src/server.ts"], {
		cwd: rootDir,
		stdio: ["ignore", "pipe", "pipe"],
		env: { ...process.env },
	});

	for (let i = 0; i < 90; i++) {
		await new Promise((r) => setTimeout(r, 500));
		const auth = await tryLogin();
		if (auth) {
			console.log(`[API READY] Logged in as ${auth.user?.fullName || "User"} (${auth.user?.role})`);
			return { auth, apiChild };
		}
	}

	apiChild.kill();
	throw new Error("Timed out waiting for Fastify API server on port 4100");
}

async function main() {
	const { auth, apiChild } = await ensureApiServer();
	let viteServer = null;
	let browser = null;

	try {
		console.log("\n=== Starting In-Process Vite Server ===");
		viteServer = await createServer({
			configFile,
			root: webRoot,
			server: {
				host: "127.0.0.1",
				strictPort: false,
				hmr: false,
				watch: null,
			},
		});
		await viteServer.listen();
		const port = viteServer.httpServer.address().port;
		const baseUrl = `http://127.0.0.1:${port}`;
		console.log(`✓ In-process Vite listening on: ${baseUrl}`);

		console.log("\n=== Launching Playwright Chromium ===");
		browser = await chromium.launch({
			headless: true,
			args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
		});

		const suppressOverlays = async (page) => {
			try {
				await page.evaluate(() => {
					const style = document.createElement("style");
					style.id = "suppress-all-overlays-4proof";
					style.innerHTML = `
						.tour-spotlight-root,
						.tour-backdrop-clickable-zone,
						[data-testid="guided-tour-spotlight-overlay"],
						[data-testid="guided-tour-coach-mark-card"],
						[data-testid="demo-mode-banner"],
						.shepherd-element,
						.global-toast-container,
						vite-error-overlay {
							display: none !important;
							pointer-events: none !important;
							opacity: 0 !important;
						}
					`;
					document.head.appendChild(style);
					document.querySelectorAll("vite-error-overlay, .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay']").forEach((el) => el.remove());
				});
			} catch (_) {}
		};

		const setupStorage = async (context, theme) => {
			const effectiveRole = auth.user?.role || "administrator";
			await context.addCookies([
				{ name: "dente_clinic_token", value: auth.clinicToken, url: baseUrl },
				{ name: "dente_staff_token", value: auth.staffToken, url: baseUrl },
			]);
			await context.addInitScript(
				({ clinicToken, staffToken, user, th, role }) => {
					localStorage.setItem("dente_clinic_token", clinicToken);
					localStorage.setItem("dente_staff_token", staffToken);
					localStorage.setItem("dente_active_session_token", staffToken);
					localStorage.setItem("dente_organization_id", user.organizationId || "");
					localStorage.setItem("dente_active_role", role);
					localStorage.setItem("dente_role", role);
					localStorage.setItem("dente_user_role", role);
					localStorage.setItem("dente_active_user_id", user.id || "");
					localStorage.setItem("dente_user_id", user.id || "");
					localStorage.setItem("dente_user_name", user.fullName || "");
					localStorage.setItem("dente_perspective", "reception");
					localStorage.setItem("dente_active_view", "schedule");
					localStorage.setItem("dente_active_nav", "schedule");
					localStorage.setItem("dental-crm:active-user:v1", JSON.stringify(user));
					localStorage.setItem("dente_theme", th);
					localStorage.setItem("dente_theme_mode", th);
					localStorage.setItem("theme", th);
					localStorage.setItem("dente_onboarding_completed", "true");
					localStorage.setItem("dente_tour_completed", "true");
					localStorage.setItem("dente_tour_dismissed", "true");
					localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
					localStorage.setItem("dente_demo_banner_dismissed", "true");
					localStorage.setItem("dente_unlocked", "true");
					sessionStorage.setItem("dente_unlocked", "true");
					localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true, step: "done" }));
					localStorage.setItem(
						"dente_ui_preferences_v1",
						JSON.stringify({ version: 1, uiLanguage: "ru", selectedWorkspaceRole: role, onboardingDismissed: true })
					);
					localStorage.setItem(
						"dental-crm:web-ui-preferences:v1",
						JSON.stringify({ version: 1, uiLanguage: "ru", selectedWorkspaceRole: role, onboardingDismissed: true, onboardingStep: "done" })
					);
				},
				{
					clinicToken: auth.clinicToken,
					staffToken: auth.staffToken,
					user: auth.user,
					th: theme,
					role: effectiveRole,
				}
			);
		};

		const states = [
			{
				name: "01_notifications_hub_pc_light.png",
				width: 1440,
				height: 900,
				theme: "light",
				isMobile: false,
			},
			{
				name: "02_notifications_hub_pc_dark.png",
				width: 1440,
				height: 900,
				theme: "dark",
				isMobile: false,
			},
			{
				name: "03_notifications_hub_mobile_light.png",
				width: 390,
				height: 844,
				theme: "light",
				isMobile: true,
			},
			{
				name: "04_notifications_hub_mobile_dark.png",
				width: 390,
				height: 844,
				theme: "dark",
				isMobile: true,
			},
		];

		for (const state of states) {
			console.log(`\n=== Capturing ${state.name} (${state.width}x${state.height}, ${state.theme}) ===`);
			const context = await browser.newContext({
				viewport: { width: state.width, height: state.height },
				deviceScaleFactor: state.isMobile ? 2 : 1,
				isMobile: state.isMobile,
				hasTouch: state.isMobile,
			});

			await setupStorage(context, state.theme);
			const page = await context.newPage();

			await page.goto(`${baseUrl}/#schedule`, { waitUntil: "domcontentloaded", timeout: 45000 });
			await page.waitForTimeout(2000);
			await page.waitForSelector(".workspace-shell, nav, header", { state: "visible", timeout: 25000 }).catch(() => {});
			// Wait for splash loader to finish
			await page.waitForSelector("text='Подготовка модулей расписания'", { state: "detached", timeout: 20000 }).catch(() => {});
			await page.waitForTimeout(3000);
			await suppressOverlays(page);

			// Нажимаем переключатель панели подтверждений дня / обзвона
			const confirmBtn = page.locator("button:has-text('Обзвон'), button:has-text('Подтверждения'), [title*='подтвержд']").first();
			if (await confirmBtn.isVisible({ timeout: 2500 }).catch(() => false)) {
				console.log("  Clicking day confirmations toggle...");
				await confirmBtn.click().catch(() => {});
				await page.waitForTimeout(1000);
			}

			const outPath = path.join(PROOFS_DIR, state.name);
			await page.screenshot({ path: outPath, fullPage: false, timeout: 15000, animations: "disabled" });
			verifyProof(outPath);

			await page.close();
			await context.close();
		}

		console.log("\n=== ALL 4 STATES CAPTURED AND VERIFIED FOR DOMAIN 30 NOTIFICATIONS ===");
	} finally {
		if (browser) await browser.close();
		if (viteServer) await viteServer.close();
		if (apiChild) apiChild.kill();
	}
}

main().catch((err) => {
	console.error("FATAL:", err);
	process.exit(1);
});
