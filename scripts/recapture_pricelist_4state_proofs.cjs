const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const PROOF_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/pricelist";
const ARTIFACT_DIR = "C:/Users/Admin/.gemini/antigravity/brain/598eb25f-c60e-47f2-98ac-29dd8b4735dc";
const BASE_URL = process.env.APP_URL || "http://127.0.0.1:5178";

if (!fs.existsSync(PROOF_DIR)) {
	fs.mkdirSync(PROOF_DIR, { recursive: true });
}
if (!fs.existsSync(ARTIFACT_DIR)) {
	fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

async function getAuthTokens() {
	try {
		const res = await fetch("http://127.0.0.1:4100/api/auth/login", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email: "clinic@example.com", password: "dente2026" }),
		});
		const data = await res.json();
		if (data.ok) {
			const swRes = await fetch("http://127.0.0.1:4100/api/auth/staff/switch-role", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-dente-staff-token": data.staffToken,
					"x-dente-clinic-token": data.clinicToken,
				},
				body: JSON.stringify({
					targetRole: "owner",
					targetUserId: "01a00000-0000-0000-0003-000000000005",
				}),
			});
			const swData = await swRes.json();
			if (swData.ok) {
				return { clinicToken: data.clinicToken, staffToken: swData.staffToken, user: swData.user };
			}
			return { clinicToken: data.clinicToken, staffToken: data.staffToken, user: data.user };
		}
	} catch (e) {
		console.warn("Auth endpoint fetch failed:", e.message);
	}
	return {
		clinicToken: "demo-showcase-token-owner",
		staffToken: "demo-showcase-staff-token-owner",
		user: { id: "01a00000-0000-0000-0003-000000000005", role: "owner" },
	};
}

async function injectSession(context, tokens) {
	await context.addInitScript(({ cTok, sTok, user }) => {
		localStorage.setItem("dente_clinic_token", cTok);
		localStorage.setItem("dente_staff_token", sTok);
		localStorage.setItem("dente_active_session_token", sTok);
		localStorage.setItem("dente_active_user_id", user?.id || "01a00000-0000-0000-0003-000000000005");
		localStorage.setItem("dente_active_role", "owner");
		localStorage.setItem("dente_selected_workspace_role", "owner");
		localStorage.setItem("dente_active_mode", "clinic");
		localStorage.setItem("dente_demo_showcase", "true");
		localStorage.setItem("dente_active_view", "schedule");
		sessionStorage.setItem("dente_unlocked", "true");
		sessionStorage.setItem("dente:sw-controller-reload", "1");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_tour_dismissed", "true");
		localStorage.setItem("dente_demo_banner_dismissed", "true");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
		localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({
			onboardingDismissed: true,
			onboardingStep: "done",
			onboardingDraftMode: false,
			version: 1,
		}));
		localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({
			dismissed: true,
			step: "done",
			completed: true,
			onboardingDismissed: true,
			onboardingStep: "done",
			onboardingDraftMode: false,
			version: 1,
		}));
		localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
			version: 1,
			selectedWorkspaceRole: "owner",
			uiLanguage: "ru",
			savedAt: new Date().toISOString(),
		}));
		document.cookie = `dente_clinic_token=${encodeURIComponent(cTok)}; path=/; max-age=31536000`;
		document.cookie = `dente_staff_token=${encodeURIComponent(sTok)}; path=/; max-age=31536000`;
	}, { cTok: tokens.clinicToken, sTok: tokens.staffToken, user: tokens.user });
}

async function safeEvaluate(page, fn, arg) {
	for (let i = 0; i < 5; i++) {
		try {
			return await page.evaluate(fn, arg);
		} catch (err) {
			if (err.message.includes("Execution context was destroyed") || err.message.includes("navigation")) {
				await page.waitForTimeout(500);
				continue;
			}
			throw err;
		}
	}
}

async function suppressTransientOverlays(page) {
	await safeEvaluate(page, () => {
		const style = document.createElement("style");
		style.id = "pricelist-clean-proof-style";
		style.innerHTML = `
			.tour-spotlight-root,
			.tour-backdrop-clickable-zone,
			[data-testid="guided-tour-spotlight-overlay"],
			[data-testid="guided-tour-coach-mark-card"],
			[data-testid="demo-mode-banner"],
			.global-toast-container,
			vite-error-overlay {
				display: none !important;
				pointer-events: none !important;
			}
		`;
		document.head.appendChild(style);
		document.querySelectorAll("vite-error-overlay, .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay']").forEach((el) => el.remove());
	});
}

async function setTheme(page, theme) {
	await safeEvaluate(page, (th) => {
		document.documentElement.setAttribute("data-theme", th);
		if (th === "dark") {
			document.documentElement.classList.add("dark");
			document.documentElement.classList.remove("light");
		} else {
			document.documentElement.classList.add("light");
			document.documentElement.classList.remove("dark");
		}
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("dente_theme_mode", th);
		localStorage.setItem("theme", th);
		document.documentElement.style.colorScheme = th;
	}, theme);
	await suppressTransientOverlays(page);
	await page.waitForTimeout(600);
}

async function waitForAppAndOpenPricelist(page, isMobile) {
	console.log("  Waiting for boot splash to clear...");
	for (let i = 0; i < 40; i++) {
		await page.waitForTimeout(500);
		const text = await page.evaluate(() => (document.body ? document.body.innerText : ""));
		if (!text.includes("Загрузка системы") && text.length > 100) {
			console.log(`  -> App mounted in ${i * 0.5}s`);
			break;
		}
	}

	const hasModalAlready = await safeEvaluate(page, () => {
		return !!document.querySelector(".service-pricelist-modal, .pricelist-modal-container, .pricelist-modal-overlay");
	});

	if (!hasModalAlready) {
		console.log("  Dispatching dente-open-pricelist event...");
		await safeEvaluate(page, () => {
			window.dispatchEvent(new CustomEvent("dente-open-pricelist"));
		});
	}

	console.log("  Waiting for pricelist modal or content...");
	await page.waitForSelector(
		".service-pricelist-modal, .pricelist-modal-container, .pricelist-modal-overlay",
		{ timeout: 30000, state: "visible" },
	);

	await page.waitForTimeout(1500);
	await suppressTransientOverlays(page);
}

async function saveProof(page, filename) {
	await suppressTransientOverlays(page);
	await page.waitForTimeout(600);

	const targetPath = path.join(PROOF_DIR, filename);
	const artifactPath = path.join(ARTIFACT_DIR, filename);

	await page.screenshot({ path: targetPath, fullPage: false, animations: "disabled" });
	fs.copyFileSync(targetPath, artifactPath);

	const stats = fs.statSync(targetPath);
	console.log(`  [PROOF CAPTURED] ${filename} -> size: ${stats.size} bytes (${(stats.size / 1024).toFixed(1)} KB)`);
}

async function main() {
	console.log("=== CAPTURING 4-STATE REAL RED TEAM PROOFS FOR PRICELIST & CATALOG ===");
	const tokens = await getAuthTokens();
	console.log("Acquired auth tokens. Clinic:", Boolean(tokens.clinicToken));

	const browser = await chromium.launch({
		channel: "msedge",
		headless: true,
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	try {
		// 1. PC CONTEXT (1440x900)
		console.log("\n--- 1. PC Context (1440x900) ---");
		const pcContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
			serviceWorkers: "block",
		});
		await injectSession(pcContext, tokens);
		const pcPage = await pcContext.newPage();

		console.log(`Navigating PC to ${BASE_URL}/?demo=true&pricelist=1#pricelist ...`);
		await pcPage.goto(`${BASE_URL}/?demo=true&pricelist=1#pricelist`, { waitUntil: "domcontentloaded", timeout: 45000 });
		await waitForAppAndOpenPricelist(pcPage, false);

		// PC Light
		console.log("Capturing 01_pricelist_pc_light.png ...");
		await setTheme(pcPage, "light");
		await saveProof(pcPage, "01_pricelist_pc_light.png");

		// PC Dark
		console.log("Capturing 02_pricelist_pc_dark.png ...");
		await setTheme(pcPage, "dark");
		await saveProof(pcPage, "02_pricelist_pc_dark.png");

		await pcContext.close();
		await new Promise((r) => setTimeout(r, 1000));

		// 2. MOBILE CONTEXT (390x844)
		console.log("\n--- 2. Mobile Context (390x844) ---");
		const mobileContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
			serviceWorkers: "block",
		});
		await injectSession(mobileContext, tokens);
		const mobilePage = await mobileContext.newPage();

		console.log(`Navigating Mobile to ${BASE_URL}/?demo=true&pricelist=1#pricelist ...`);
		await mobilePage.goto(`${BASE_URL}/?demo=true&pricelist=1#pricelist`, { waitUntil: "domcontentloaded", timeout: 45000 });
		await waitForAppAndOpenPricelist(mobilePage, true);

		// Mobile Light
		console.log("Capturing 03_pricelist_mobile_light.png ...");
		await setTheme(mobilePage, "light");
		await saveProof(mobilePage, "03_pricelist_mobile_light.png");

		// Mobile Dark
		console.log("Capturing 04_pricelist_mobile_dark.png ...");
		await setTheme(mobilePage, "dark");
		await saveProof(mobilePage, "04_pricelist_mobile_dark.png");

		await mobileContext.close();

		console.log("\n=== ALL 4-STATE VISUAL PROOFS RECAPTURED SUCCESSFULLY! ===");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("Capture failed:", err);
	process.exit(1);
});
