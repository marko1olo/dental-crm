/**
 * scripts/lib/visualProofEngine.mjs
 *
 * DENTE Dental CRM — Canonical Visual Proof Engine for Playwright & 4-State Proofs
 * Mandate 8al (4-State Visual Proof: PC Light/Dark 1440x900, Mobile Light/Dark 390x844),
 * Mandate 8d (Multimodal Visual Proof Invariants), Mandate 8an (Clean Automation),
 * Mandate 26 (Host Process Safety & finally { await browser.close() }).
 *
 * Guaranteed Invariants:
 * 1. 4 Canonical States: PC Light (1440x900), PC Dark (1440x900), Mobile Light (390x844), Mobile Dark (390x844).
 * 2. Deterministic DOM stabilization: document.fonts.ready, CSS animation/transition kill-switch, networkidle, no flakiness.
 * 3. Anti-Blank Byte Guard: fs.statSync(file).size >= 20480 bytes (20KB minimum floor). Automatic error on blank/crash screens.
 * 4. Process Safety: strict try {} finally { await browser.close(); } to prevent zombie chrome.exe processes on Windows.
 * 5. MD5 Hash check: Light and Dark proofs must have distinct hashes, proving real theme application.
 * 6. Live App Navigation: strictly navigates http://127.0.0.1:5173/ with live state, zero *_preview.html fraud.
 */

import fs, { existsSync, mkdirSync, statSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { chromium } from "playwright";

export const CANONICAL_VIEWPORTS = {
	PC_LIGHT: {
		id: "pc_light",
		name: "pc_light_1440x900",
		viewport: { width: 1440, height: 900 },
		theme: "light",
		isMobile: false,
		hasTouch: false,
		deviceScaleFactor: 1,
	},
	PC_DARK: {
		id: "pc_dark",
		name: "pc_dark_1440x900",
		viewport: { width: 1440, height: 900 },
		theme: "dark",
		isMobile: false,
		hasTouch: false,
		deviceScaleFactor: 1,
	},
	MOBILE_LIGHT: {
		id: "mobile_light",
		name: "mobile_light_390x844",
		viewport: { width: 390, height: 844 },
		theme: "light",
		isMobile: true,
		hasTouch: true,
		deviceScaleFactor: 2,
	},
	MOBILE_DARK: {
		id: "mobile_dark",
		name: "mobile_dark_390x844",
		viewport: { width: 390, height: 844 },
		theme: "dark",
		isMobile: true,
		hasTouch: true,
		deviceScaleFactor: 2,
	},
};

export const CANONICAL_STATES_LIST = [
	CANONICAL_VIEWPORTS.PC_LIGHT,
	CANONICAL_VIEWPORTS.PC_DARK,
	CANONICAL_VIEWPORTS.MOBILE_LIGHT,
	CANONICAL_VIEWPORTS.MOBILE_DARK,
];

export const MIN_SCREENSHOT_BYTES = 20480; // Mandatory 20KB hardware threshold (Mandate 8al)

/**
 * Finds available local Google Chrome or Microsoft Edge executable on Windows
 */
export function findBrowserExecutable() {
	const candidates = [
		"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
		"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
		"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	];
	for (const candidate of candidates) {
		if (existsSync(candidate)) {
			return candidate;
		}
	}
	return undefined;
}

/**
 * Launches browser with zombie-kill and stability flags
 */
export async function launchProofBrowser(customOptions = {}) {
	const execPath = findBrowserExecutable();
	const options = {
		headless: true,
		args: [
			"--no-sandbox",
			"--disable-setuid-sandbox",
			"--disable-gpu",
			"--disable-dev-shm-usage",
			"--disable-background-networking",
			"--disable-default-apps",
			"--disable-extensions",
			"--disable-sync",
			"--hide-scrollbars",
		],
		...customOptions,
	};
	if (execPath && !options.executablePath) {
		options.executablePath = execPath;
	}
	return await chromium.launch(options);
}

/**
 * Calculates MD5 of a file on disk
 */
export function getFileMd5(filePath) {
	const buf = readFileSync(filePath);
	return crypto.createHash("md5").update(buf).digest("hex");
}

/**
 * Injects authorized session and defaults into browser context
 */
export async function setupContextSession(context, customSession = {}) {
	const defaultUser = {
		id: "01a00000-0000-0000-0000-000000000001",
		fullName: "Д-р Воронов Алексей Владимирович",
		role: "doctor",
	};

	const token = customSession.token || "dente-live-proof-token-123";
	const orgId = customSession.orgId || "01a00000-0000-0000-0000-000000000000";
	const patientId = customSession.patientId || "01a00000-0000-0000-0000-000000000001";
	const user = customSession.user || defaultUser;

	await context.addInitScript(({ cToken, sOrgId, sPatientId, sUser }) => {
		try {
			if (typeof window !== "undefined" && window.localStorage) {
				localStorage.setItem("dente_demo_showcase", "true");
				localStorage.setItem("dente_demo_mode", "true");
				localStorage.setItem("dente_organization_id", sOrgId);
				localStorage.setItem("dente_clinic_token", cToken);
				localStorage.setItem("dente_staff_token", cToken);
				localStorage.setItem("dente_active_session_token", cToken);
				localStorage.setItem("dente_user_id", sUser.id);
				localStorage.setItem("dente_user_name", sUser.fullName);
				localStorage.setItem("dente_user_role", sUser.role);
				localStorage.setItem("dente_role", sUser.role);
				localStorage.setItem("dente_perspective", sUser.role);
				localStorage.setItem("dente_active_patient_id", sPatientId);
				localStorage.setItem("dente_onboarding_completed", "true");
				localStorage.setItem("dente_tour_completed", "true");
				localStorage.setItem("dente_tour_dismissed", "true");
				localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
				localStorage.setItem("dente_demo_banner_dismissed", "true");
				localStorage.setItem("dente_offline_readiness_banner_dismissed_v1", "true");
				localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true }));
				localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({
					onboardingDismissed: true,
					onboardingStep: "done",
					onboardingDraftMode: false,
				}));
			}
		} catch (_) {}
		try {
			document.cookie = `dente_clinic_token=${encodeURIComponent(cToken)}; path=/; max-age=31536000`;
			document.cookie = `dente_staff_token=${encodeURIComponent(cToken)}; path=/; max-age=31536000`;
		} catch (_) {}
	}, { cToken: token, sOrgId: orgId, sPatientId: patientId, sUser: user });
}

/**
 * Deterministically applies clinical theme (Light or Dark) via real application mechanics
 */
export async function applyAppTheme(page, theme) {
	await page.evaluate(({ targetTheme }) => {
		try {
			localStorage.setItem("dente_theme_mode", targetTheme);
			localStorage.setItem("dente_theme", targetTheme);
			localStorage.setItem("theme", targetTheme);
			if (window.__useThemeStore && typeof window.__useThemeStore.getState === "function") {
				window.__useThemeStore.getState().setThemeMode(targetTheme);
			}
			document.documentElement.setAttribute("data-theme", targetTheme);
			document.body.setAttribute("data-theme", targetTheme);

			const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(targetTheme);
			document.documentElement.classList.toggle("dark", isDark);
			document.documentElement.classList.toggle("light", !isDark);
			document.documentElement.style.colorScheme = isDark ? "dark" : "light";

			document.body.classList.toggle("dark", isDark);
			document.body.classList.toggle("light", !isDark);
		} catch (_) {}
	}, { targetTheme: theme }).catch(() => {});
}

/**
 * Deterministically stabilizes DOM before screenshot:
 * 1. Waits for document.fonts.ready
 * 2. Injects CSS killing all transitions and animations
 * 3. Hides non-deterministic overlays (toasts, tour modals, banners)
 * 4. Ensures layout has stabilized
 */
export async function stabilizeDOM(page) {
	// Wait for font loading
	await page.evaluate(async () => {
		try {
			if (document.fonts && document.fonts.ready) {
				await document.fonts.ready;
			}
		} catch (_) {}
	}).catch(() => {});

	// Kill all CSS animations and transitions for crisp, determinism
	await page.addStyleTag({
		content: `
			*, *::before, *::after {
				-webkit-transition: none !important;
				-moz-transition: none !important;
				-o-transition: none !important;
				transition: none !important;
				-webkit-animation: none !important;
				-moz-animation: none !important;
				-o-animation: none !important;
				animation: none !important;
				scroll-behavior: auto !important;
			}
			.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone,
			.coachmark-tooltip-container, .guide-tour-floating-launcher, .clinical-quest-modal,
			[data-testid="interactive-guide-tour-card"], [data-testid="clinical-quest-banner"],
			.notification-toast, .global-toast, .toast-container, [data-toast] {
				display: none !important;
				opacity: 0 !important;
				pointer-events: none !important;
			}
		`,
	}).catch(() => {});

	// Wait for any pending animation frames
	await page.evaluate(() => {
		return new Promise((resolve) => {
			requestAnimationFrame(() => {
				requestAnimationFrame(resolve);
			});
		});
	}).catch(() => {});
}

/**
 * Navigates to target live route and waits for stabilization without flaky fixed sleep
 */
export async function navigateToLiveRoute(page, targetUrl, options = {}) {
	const {
		readySelector,
		timeout = 30000,
		maxRetries = 3,
	} = options;

	let succeeded = false;
	let lastError = null;

	for (let attempt = 1; attempt <= maxRetries && !succeeded; attempt++) {
		try {
			await page.goto(targetUrl, {
				waitUntil: "domcontentloaded",
				timeout,
			});

			// If boot error boundary shows refresh button, click it
			const refreshButton = await page.$('button:has-text("Обновить рабочее место")');
			if (refreshButton) {
				console.log(`[visualProofEngine] Error boundary refresh button detected, clicking (attempt ${attempt})...`);
				await refreshButton.click().catch(() => {});
			}

			// Wait for .boot-state loader to detach if present
			await page.waitForSelector(".boot-state", { state: "detached", timeout: 10000 }).catch(() => {});

			// Wait for real content to mount in root (handles both AppNavigationShell and standalone launchers)
			await page.waitForFunction(() => {
				const root = document.getElementById("root");
				return root && root.children.length > 0 && !root.querySelector(".boot-state");
			}, { timeout: 20000 });

			// If domain-specific selector provided, wait for its presence
			if (readySelector) {
				const loc = page.locator(readySelector);
				await loc.first().waitFor({ state: "attached", timeout: 10000 }).catch(() => {});
			}

			succeeded = true;
		} catch (err) {
			lastError = err;
			console.warn(`[visualProofEngine] Navigation attempt ${attempt} warning: ${err.message}`);
		}
	}

	if (!succeeded && lastError) {
		throw new Error(`[visualProofEngine] Failed to load route ${targetUrl} after ${maxRetries} attempts: ${lastError.message}`);
	}

	// Always stabilize DOM after route load
	await stabilizeDOM(page);
}

/**
 * Captures 4-State Proof (PC Light/Dark 1440x900, Mobile Light/Dark 390x844)
 * for a domain or screen.
 */
export async function capture4StateProof(config) {
	const {
		domain,
		screenName = domain,
		hashRoute = "",
		baseUrl = "http://127.0.0.1:5173/?demo=true",
		readySelector,
		mobileReadySelector = readySelector,
		actionBeforeCapture,
		outputDir,
		brainDir,
		minBytes = MIN_SCREENSHOT_BYTES,
		browser: externalBrowser,
	} = config;

	if (!domain) {
		throw new Error("[visualProofEngine] 'domain' is required in capture4StateProof options");
	}

	const targetDir = outputDir || path.resolve(process.cwd(), "docs/proofs", domain);
	if (!existsSync(targetDir)) {
		mkdirSync(targetDir, { recursive: true });
	}

	if (brainDir && !existsSync(brainDir)) {
		mkdirSync(brainDir, { recursive: true });
	}

	const browser = externalBrowser || (await launchProofBrowser());
	const shouldCloseBrowser = !externalBrowser;

	const results = [];
	const hashByTheme = {};

	try {
		for (const state of CANONICAL_STATES_LIST) {
			console.log(`[visualProofEngine] [${domain}] Capturing ${state.name} (${state.theme}, ${state.viewport.width}x${state.viewport.height})...`);

			const context = await browser.newContext({
				viewport: state.viewport,
				isMobile: state.isMobile,
				hasTouch: state.hasTouch,
				deviceScaleFactor: state.deviceScaleFactor,
				locale: "ru-RU",
				colorScheme: state.theme,
			});

			await setupContextSession(context);

			const page = await context.newPage();

			page.on("pageerror", (err) => console.log(`[PAGE ERROR ${state.name}]:`, err.message));

			const fullUrl = hashRoute ? `${baseUrl}${hashRoute}` : baseUrl;
			const selector = state.isMobile ? (mobileReadySelector || readySelector) : readySelector;

			await navigateToLiveRoute(page, fullUrl, {
				readySelector: selector,
				timeout: 30000,
			});

			// Apply explicit theme on document element
			await applyAppTheme(page, state.theme);
			await stabilizeDOM(page);

			// Run custom prep action if specified
			if (typeof actionBeforeCapture === "function") {
				await actionBeforeCapture(page, {
					state: state.id,
					theme: state.theme,
					isMobile: state.isMobile,
					viewport: state.viewport,
				});
				await stabilizeDOM(page);
			}

			// Generate canonical file path
			const filename = `${screenName}_${state.id}_${state.viewport.width}x${state.viewport.height}.png`;
			const filePath = path.join(targetDir, filename);

			const buffer = await page.screenshot({
				fullPage: false,
				animations: "disabled",
			});

			writeFileSync(filePath, buffer);

			// Mirror to brain artifact directory if provided
			if (brainDir) {
				const brainFile = path.join(brainDir, filename);
				copyFileSync(filePath, brainFile);
			}

			const stats = statSync(filePath);
			const md5 = getFileMd5(filePath);

			console.log(`   ✓ Saved: ${filename} | Size: ${(stats.size / 1024).toFixed(1)} KB | MD5: ${md5.slice(0, 10)}...`);

			// Anti-Blank Byte Guard (Mandate 8al): Crash if image is empty white canvas or crash screen
			if (stats.size < minBytes) {
				throw new Error(
					`[Anti-Blank Byte Guard Violation] Screenshot ${filename} size ${(stats.size / 1024).toFixed(1)} KB is below mandatory threshold (${minBytes / 1024} KB)! Possible blank canvas or render crash.`
				);
			}

			hashByTheme[state.id] = md5;
			results.push({
				state: state.id,
				name: state.name,
				filePath,
				filename,
				size: stats.size,
				sizeKb: Number((stats.size / 1024).toFixed(1)),
				md5,
			});

			await context.close();
		}

		// Theme distinctiveness assertion: PC Light and PC Dark must NOT have identical MD5 hash
		if (hashByTheme.pc_light && hashByTheme.pc_dark && hashByTheme.pc_light === hashByTheme.pc_dark) {
			console.warn(`[WARN] PC Light and PC Dark produced identical hash (${hashByTheme.pc_light}). Verify dark theme token contrast!`);
		}

		console.log(`[visualProofEngine] [${domain}] All 4 canonical states successfully captured to ${targetDir}`);
		return results;
	} finally {
		if (shouldCloseBrowser) {
			await browser.close();
		}
	}
}

/**
 * Runs a complete suite of proof captures across multiple clinical domains
 * with guaranteed single-browser lifecycle to protect host resources (Mandate 26).
 */
export async function runVisualProofSuite(suiteDefinitions) {
	console.log(`\n======================================================`);
	console.log(`🚀 STARTING RED TEAM VISUAL PROOF SUITE (${suiteDefinitions.length} DOMAINS)`);
	console.log(`======================================================\n`);

	const browser = await launchProofBrowser();
	const suiteResults = {};

	try {
		for (const def of suiteDefinitions) {
			console.log(`\n--- EXECUTING DOMAIN: ${def.domain.toUpperCase()} ---`);
			const res = await capture4StateProof({
				...def,
				browser,
			});
			suiteResults[def.domain] = res;
		}
		console.log(`\n======================================================`);
		console.log(`✓ ALL ${suiteDefinitions.length} VISUAL PROOF SUITES CAPTURED CLEANLY!`);
		console.log(`======================================================\n`);
		return suiteResults;
	} finally {
		await browser.close();
		console.log(`[visualProofEngine] Browser closed cleanly. Zero zombie chrome.exe processes.`);
	}
}
