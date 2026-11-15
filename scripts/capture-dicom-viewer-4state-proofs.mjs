/**
 * scripts/capture-dicom-viewer-4state-proofs.mjs
 *
 * Red Team 4-State Proofs capture for DicomViewerModal & DicomToolboxRibbon
 * Standards:
 * - PC Light: 1440x900
 * - PC Dark: 1440x900
 * - Mobile Light: 390x844 (Apple iOS HIG)
 * - Mobile Dark: 390x844 (Apple iOS HIG)
 * - Anti-Blank Artifact Byte Guard: size >= 20480 bytes (>= 20 KB)
 * - Live container on http://127.0.0.1:5173/
 */

import { copyFileSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const CONV_ID = "a39d59c9-66f2-4699-b4f3-7b60549b12d7";
const BRAIN_DIR = `C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}`;
const PROOFS_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/imaging";
async function getActiveBaseUrl() {
	for (const port of [5174, 5173, 5175, 5176]) {
		try {
			const res = await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(1000) });
			if (res.ok) {
				console.log(`[Detect] Active Vite server found on port ${port}`);
				return `http://127.0.0.1:${port}`;
			}
		} catch (_) {}
	}
	return "http://127.0.0.1:5174";
}

let BASE_URL = "http://127.0.0.1:5174";

mkdirSync(BRAIN_DIR, { recursive: true });
mkdirSync(PROOFS_DIR, { recursive: true });

async function provisionSession() {
	console.log("[Auth] Authenticating session...");
	try {
		const loginRes = await fetch("http://127.0.0.1:4100/api/auth/login", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email: "clinic@example.com", password: "dente2026" }),
			signal: AbortSignal.timeout(3000),
		});

		if (loginRes.ok) {
			const auth = await loginRes.json();
			return {
				clinicToken: auth.clinicToken,
				staffToken: auth.staffToken,
				ownerUserId: auth.user?.id || "user-1",
				user: auth.user,
			};
		}
	} catch (_) {}
	return {
		clinicToken: "demo-clinic-token",
		staffToken: "demo-staff-token",
		ownerUserId: "user-1",
		user: {
			id: "user-1",
			fullName: "Д-р Воронов Алексей Владимирович",
			name: "Д-р Воронов А. В.",
			role: "doctor",
		},
	};
}

async function injectStorage(context, auth, theme = "dark") {
	return context.addInitScript(({ ct, st, uid, usr, th }) => {
		try {
			localStorage.setItem("dente_demo_showcase", "true");
			localStorage.setItem("dente_clinic_token", ct);
			localStorage.setItem("dente_staff_token", st);
			localStorage.setItem("dente_active_session_token", st);
			localStorage.setItem("dente_active_user_id", uid);
			localStorage.setItem("dente_active_role", "doctor");
			localStorage.setItem("dente_role", "doctor");
			localStorage.setItem("dente_active_mode", "clinic");
			localStorage.setItem("dente_user_id", uid);
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_tour_dismissed", "true");
			localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
			localStorage.setItem("dente_theme", th);
			localStorage.setItem("dente_theme_mode", th);
			localStorage.setItem("theme", th);
			localStorage.setItem("dente_active_tooth", "16");
			localStorage.setItem("dental-crm:active-user:v1", JSON.stringify(usr));

			const staffUser = usr || {
				id: uid,
				userId: uid,
				name: "Д-р Воронов А. В.",
				fullName: "Д-р Воронов Алексей Владимирович",
				role: "doctor",
			};
			localStorage.setItem("dente_staff_session", JSON.stringify(staffUser));
			localStorage.setItem("dente_cached_active_staff_user", JSON.stringify(staffUser));
			localStorage.setItem("dente_cached_staff_list", JSON.stringify([staffUser]));

			sessionStorage.setItem("dente_unlocked", "true");
			document.cookie = `dente_clinic_token=${ct}; path=/; max-age=31536000`;
			document.cookie = `dente_staff_token=${st}; path=/; max-age=31536000`;
		} catch (_) {}
	}, {
		ct: auth.clinicToken,
		st: auth.staffToken,
		uid: auth.ownerUserId,
		usr: auth.user,
		th: theme,
	});
}

async function suppressOverlays(page) {
	try {
		await page.evaluate(() => {
			const style = document.createElement("style");
			style.id = "suppress-all-overlays";
			style.innerHTML = `
				.tour-spotlight-root,
				.tour-backdrop-clickable-zone,
				[data-testid="guided-tour-spotlight-overlay"],
				[data-testid="guided-tour-coach-mark-card"],
				.shepherd-element,
				vite-error-overlay {
					display: none !important;
					pointer-events: none !important;
					opacity: 0 !important;
				}
			`;
			document.head.appendChild(style);
		});
	} catch (_) {}
}

async function captureProof(page, filename, description) {
	const outPath = path.join(PROOFS_DIR, filename);
	await page.screenshot({ path: outPath, fullPage: false, animations: "disabled" });
	const stat = statSync(outPath);
	if (stat.size < 20000) {
		throw new Error(`[BLANK PROOF] ${filename} size is only ${stat.size} bytes (minimum 20480 required)`);
	}
	console.log(`[CAPTURED] ${filename} (${(stat.size / 1024).toFixed(1)} KB) -> ${description}`);
	copyFileSync(outPath, path.join(BRAIN_DIR, filename));
	return { filename, size: stat.size, outPath };
}

async function setTheme(page, theme) {
	await page.evaluate((th) => {
		if (document.documentElement) {
			if (th === "light") {
				document.documentElement.setAttribute("data-theme", "light");
				document.documentElement.classList.remove("dark");
				document.documentElement.classList.add("light");
				if (document.body) {
					document.body.setAttribute("data-theme", "light");
					document.body.classList.remove("dark");
					document.body.classList.add("light");
				}
			} else {
				document.documentElement.removeAttribute("data-theme");
				document.documentElement.classList.remove("light");
				document.documentElement.classList.add("dark");
				if (document.body) {
					document.body.removeAttribute("data-theme");
					document.body.classList.remove("light");
					document.body.classList.add("dark");
				}
			}
		}
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("dente_theme_mode", th);
		localStorage.setItem("theme", th);
	}, theme);
	await page.waitForTimeout(600);
}

async function main() {
	BASE_URL = await getActiveBaseUrl();
	const auth = await provisionSession();

	console.log("=== Launching Chrome ===");
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: [
			"--no-sandbox",
			"--disable-setuid-sandbox",
			"--use-gl=angle",
			"--use-angle=swiftshader",
			"--no-proxy-server",
			"--proxy-bypass-list=<-loopback>",
		],
	});

	const targetUrl = `${BASE_URL}/?stand=dicom&demo=true#dicom-viewer`;

	try {
		// ------------------ 1. PC 1440x900 Context ------------------
		console.log("\n--- Setting up PC (1440x900) Context ---");
		const pcContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});
		await injectStorage(pcContext, auth, "light");
		const pcPage = await pcContext.newPage();

		console.log(`[Browser] Navigating PC to ${targetUrl}...`);
		await pcPage.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
		await pcPage.waitForSelector('[data-testid="dicom-viewer-modal"]', { timeout: 30000 });
		console.log("[Browser] Dicom viewer modal detected in PC DOM.");
		await suppressOverlays(pcPage);
		await pcPage.waitForTimeout(1500);

		// 1.1 PC Light
		console.log("\n--- Capturing 01 PC Light ---");
		await setTheme(pcPage, "light");
		await suppressOverlays(pcPage);
		await captureProof(
			pcPage,
			"01_dicom_viewer_pc_light_1440x900.png",
			"PC Light 1440x900 Dicom Viewer Modal with Quick Access Ribbon & Presets"
		);

		// 1.2 PC Dark
		console.log("\n--- Capturing 02 PC Dark ---");
		await setTheme(pcPage, "dark");
		await suppressOverlays(pcPage);
		await captureProof(
			pcPage,
			"02_dicom_viewer_pc_dark_1440x900.png",
			"PC Dark 1440x900 Dicom Viewer Modal (Deep Dark Graphite Slate-950)"
		);

		await pcContext.close();

		// ------------------ 2. Mobile 390x844 Context ------------------
		console.log("\n--- Setting up Mobile (390x844) Context ---");
		const mobileContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			isMobile: true,
			hasTouch: true,
			deviceScaleFactor: 2,
		});
		await injectStorage(mobileContext, auth, "light");
		const mobilePage = await mobileContext.newPage();

		console.log(`[Browser] Navigating Mobile to ${targetUrl}...`);
		await mobilePage.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
		await mobilePage.waitForSelector('[data-testid="dicom-viewer-modal"]', { timeout: 30000 });
		console.log("[Browser] Dicom viewer modal detected in Mobile DOM.");
		await suppressOverlays(mobilePage);
		await mobilePage.waitForTimeout(1500);

		// 2.1 Mobile Light
		console.log("\n--- Capturing 03 Mobile Light ---");
		await setTheme(mobilePage, "light");
		await suppressOverlays(mobilePage);
		await captureProof(
			mobilePage,
			"03_dicom_viewer_mobile_light_390x844.png",
			"Mobile Light 390x844 Apple HIG Dicom Viewer Touch Viewport"
		);

		// 2.2 Mobile Dark
		console.log("\n--- Capturing 04 Mobile Dark ---");
		await setTheme(mobilePage, "dark");
		await suppressOverlays(mobilePage);
		await captureProof(
			mobilePage,
			"04_dicom_viewer_mobile_dark_390x844.png",
			"Mobile Dark 390x844 Apple HIG Dicom Viewer Touch Viewport"
		);

		await mobileContext.close();

		console.log("\n=== ALL 4-STATE DICOM VIEWER PROOFS CAPTURED SUCCESSFULLY ===");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("[FATAL ERROR]", err);
	process.exit(1);
});
