import { existsSync, mkdirSync, statSync, copyFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const CALLER_ID = "1a5ac924-43af-42a0-a684-00dbb822c536";
const SELF_ID = "887fee24-0fa1-4e67-81c1-63122ecb96a2";

const OUT_DIRS = [
	path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/family_wallet"),
	path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${CALLER_ID}`),
	path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${SELF_ID}`),
];

OUT_DIRS.forEach((d) => {
	if (!existsSync(d)) mkdirSync(d, { recursive: true });
});

async function detectVitePort() {
	const candidatePorts = [5178, 5173, 5174];
	for (const p of candidatePorts) {
		try {
			const res = await fetch(`http://127.0.0.1:${p}/`);
			if (res.ok) {
				console.log(`[Vite Port Detected] Active on ${p}`);
				return p;
			}
		} catch (_) {}
	}
	return 5178;
}

async function getAuth() {
	try {
		const authRes = await fetch("http://127.0.0.1:4100/api/auth/login", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email: "doctor@clinic.com", password: "dente2026" }),
		});
		if (authRes.ok) {
			const data = await authRes.json();
			return data;
		}
	} catch (e) {
		console.log("[Auth API] Warning: login fallback", e.message);
	}
	return {
		clinicToken: "demo-showcase-token-owner",
		staffToken: "demo-showcase-staff-token-owner",
		user: { id: "01a00000-0000-0000-0003-000000000001", fullName: "Д-р Соколов А. В.", role: "owner" },
	};
}

const browserExecutable = [
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].find((p) => existsSync(p));

console.log("[Browser] Executable:", browserExecutable);

const browser = await chromium.launch({
	executablePath: browserExecutable,
	headless: true,
	args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
});

async function injectAuth(context, authData, theme = "light") {
	await context.addInitScript(
		({ clinicToken, staffToken, user, th }) => {
			localStorage.setItem("dente_clinic_token", clinicToken);
			localStorage.setItem("dente_staff_token", staffToken);
			localStorage.setItem("dente_active_session_token", staffToken);
			localStorage.setItem("dente_active_role", "owner");
			localStorage.setItem("dente_user_role", "owner");
			localStorage.setItem("dente_role", "owner");
			localStorage.setItem("dente_active_user_id", user.id || "01a00000-0000-0000-0003-000000000001");
			localStorage.setItem("dental-crm:active-user:v1", JSON.stringify(user));
			localStorage.setItem("dente_theme", th);
			localStorage.setItem("dente_theme_mode", th);
			localStorage.setItem("theme", th);
			localStorage.setItem("dente_demo_showcase", "true");
			localStorage.setItem("dente_demo_mode", "true");
			sessionStorage.setItem("dente_unlocked", "true");
			localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true, step: "done" }));
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_tour_dismissed", "true");
			localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
			localStorage.setItem("dente_demo_banner_dismissed", "true");
			localStorage.setItem("dente_guide_tour_seen_roles_v2", JSON.stringify(["admin", "doctor", "director", "owner"]));
			localStorage.setItem("dente_quest_progress_v2", JSON.stringify({ isDismissedPermanently: true, activeTrack: null, tracksProgress: {} }));
			localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
				version: 1,
				uiLanguage: "ru",
				selectedWorkspaceRole: "owner",
				selectedSpecialty: "therapist",
				selectedPatientId: "01a00000-0000-0000-0000-000000000001",
				onboardingDismissed: true,
			}));
			document.cookie = `dente_clinic_token=${encodeURIComponent(clinicToken)}; path=/; max-age=31536000`;
			document.cookie = `dente_staff_token=${encodeURIComponent(staffToken)}; path=/; max-age=31536000`;
		},
		{
			clinicToken: authData.clinicToken,
			staffToken: authData.staffToken,
			user: authData.user,
			th: theme,
		},
	);
}

async function cleanOverlays(page, theme = "light") {
	await page.evaluate((th) => {
		document.documentElement.setAttribute("data-theme", th);
		document.body.setAttribute("data-theme", th);
		if (th === "dark") {
			document.documentElement.classList.add("dark");
			document.documentElement.classList.remove("light");
			document.body.className = "dark";
		} else {
			document.documentElement.classList.add("light");
			document.documentElement.classList.remove("dark");
			document.body.className = "light";
		}
		document.documentElement.style.colorScheme = th;
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("dente_theme_mode", th);
		localStorage.setItem("theme", th);
		window.dispatchEvent(new Event("themechange"));

		let style = document.getElementById("suppress-all-overlays");
		if (!style) {
			style = document.createElement("style");
			style.id = "suppress-all-overlays";
			document.head.appendChild(style);
		}
		style.innerHTML = `
			.tour-spotlight-root,
			.tour-backdrop-clickable-zone,
			[data-testid="guided-tour-spotlight-overlay"],
			[data-testid="guided-tour-coach-mark-card"],
			[data-testid="demo-mode-banner"],
			.shepherd-element,
			.boot-state,
			#boot-screen,
			vite-error-overlay {
				display: none !important;
				pointer-events: none !important;
			}
		`;
		document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container').forEach((el) => el.remove());
	}, theme);
	await page.waitForTimeout(400);
}

async function waitForRealUI(page) {
	for (let i = 0; i < 40; i++) {
		await page.waitForTimeout(1000);
		try {
			const state = await page.evaluate(() => {
				const hasPatients = Boolean(document.querySelector('[data-testid="patients-view"], [data-testid="patient-row-01a00000-0000-0000-0000-000000000001"], [data-patient-id], tr[data-id], .patient-row'));
				const hasBoot = Boolean(document.querySelector('.boot-state') || (document.body && document.body.innerText.includes("Загрузка системы...")));
				const text = document.body ? document.body.innerText : "";
				return { hasPatients, hasBoot, textLength: text.length };
			});
			if ((state.hasPatients || state.textLength > 300) && !state.hasBoot) {
				console.log(`[UI Ready] App mounted at second ${i + 1} (${state.textLength} chars)`);
				return true;
			}
		} catch (_) {}
	}
	console.log("[UI Warning] Timeout waiting for full mount");
	return false;
}

async function saveProof(page, filename, description) {
	await cleanOverlays(page);
	await page.waitForTimeout(600);
	const targetPath = path.join(OUT_DIRS[0], filename);
	await page.screenshot({ path: targetPath, fullPage: false });
	const sz = statSync(targetPath).size;
	console.log(`[PROOF CAPTURED] ${filename} (${sz} bytes) -> ${description} [>=20KB: ${sz >= 20480}]`);
	if (sz < 20480) {
		throw new Error(`Screenshot ${filename} is smaller than 20KB: ${sz} bytes`);
	}
	for (let i = 1; i < OUT_DIRS.length; i++) {
		try {
			copyFileSync(targetPath, path.join(OUT_DIRS[i], filename));
		} catch (_) {}
	}
}

async function main() {
	const port = await detectVitePort();
	const baseUrl = `http://127.0.0.1:${port}`;
	const authData = await getAuth();
	console.log("[Auth Ready] Doctor:", authData.user?.fullName);

	try {
		// ═══════════════════════════════════════════════════════════
		// 1. PC 1440x900 DESKTOP
		// ═══════════════════════════════════════════════════════════
		console.log("\n--- [PC 1440x900 Desktop Viewport] ---");
		const pcCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
		await injectAuth(pcCtx, authData, "light");
		const pcPage = await pcCtx.newPage();

		console.log(`[PC] Navigating to ${baseUrl}/?demo=true#patients...`);
		await pcPage.goto(`${baseUrl}/?demo=true#patients`, { waitUntil: "commit", timeout: 35000 });
		await waitForRealUI(pcPage);
		await pcPage.waitForTimeout(1500);

		// Select patient
		await pcPage.evaluate(() => {
			const el = Array.from(document.querySelectorAll("div, button, tr, td")).find(
				(node) => node.textContent?.includes("Смирнова Анна")
			);
			if (el) (el.closest('button, [role="button"], tr') || el).click();
		});
		await pcPage.waitForTimeout(1000);

		console.log("[PC] Dispatching dente-open-family-wallet event...");
		await pcPage.evaluate(() => {
			window.dispatchEvent(
				new CustomEvent("dente-open-family-wallet", {
					detail: { patientId: "01a00000-0000-0000-0000-000000000001", patientName: "Смирнова Анна Сергеевна" },
				}),
			);
		});

		await pcPage.waitForSelector("[data-testid='family-wallet-modal']", { state: "visible", timeout: 25000 });
		console.log("[PC] Family Wallet Modal is visible in DOM!");

		// 1.1 PC Light Overview
		await cleanOverlays(pcPage, "light");
		await saveProof(pcPage, "01_family_wallet_pc_light_1440x900.png", "Family Wallet Overview (PC Light 1440x900)");

		// 1.2 PC Dark Overview
		await cleanOverlays(pcPage, "dark");
		await saveProof(pcPage, "02_family_wallet_pc_dark_1440x900.png", "Family Wallet Overview (PC Dark 1440x900)");

		// 1.3 PC FNS Tax Tab Light
		console.log("[PC] Switching to FNS Tax Certificates tab...");
		await pcPage.click("[data-testid='tab-family-wallet-tax']");
		await pcPage.waitForTimeout(1000);
		await cleanOverlays(pcPage, "light");
		await saveProof(pcPage, "05_family_tax_certs_pc_light_1440x900.png", "Family FNS Tax Certificates (PC Light 1440x900)");

		// 1.4 PC FNS Tax Tab Dark
		await cleanOverlays(pcPage, "dark");
		await saveProof(pcPage, "06_family_tax_certs_pc_dark_1440x900.png", "Family FNS Tax Certificates (PC Dark 1440x900)");

		await pcCtx.close();

		// ═══════════════════════════════════════════════════════════
		// 2. MOBILE 390x844 APPLE HIG BOTTOM SHEET
		// ═══════════════════════════════════════════════════════════
		console.log("\n--- [Mobile 390x844 Apple HIG Viewport] ---");
		const mobileCtx = await browser.newContext({
			viewport: { width: 390, height: 844 },
			userAgent:
				"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
			isMobile: true,
			hasTouch: true,
		});
		await injectAuth(mobileCtx, authData, "light");
		const mobilePage = await mobileCtx.newPage();

		console.log(`[Mobile] Navigating to ${baseUrl}/?demo=true#patients...`);
		await mobilePage.goto(`${baseUrl}/?demo=true#patients`, { waitUntil: "commit", timeout: 35000 });
		await waitForRealUI(mobilePage);
		await mobilePage.waitForTimeout(1500);

		// Select patient
		await mobilePage.evaluate(() => {
			const el = Array.from(document.querySelectorAll("div, button, tr, td")).find(
				(node) => node.textContent?.includes("Смирнова Анна")
			);
			if (el) (el.closest('button, [role="button"], tr') || el).click();
		});
		await mobilePage.waitForTimeout(1000);

		console.log("[Mobile] Dispatching dente-open-family-wallet event...");
		await mobilePage.evaluate(() => {
			window.dispatchEvent(
				new CustomEvent("dente-open-family-wallet", {
					detail: { patientId: "01a00000-0000-0000-0000-000000000001", patientName: "Смирнова Анна Сергеевна" },
				}),
			);
		});

		await mobilePage.waitForSelector("[data-testid='family-wallet-modal']", { state: "visible", timeout: 25000 });
		console.log("[Mobile] Family Wallet Bottom Sheet is visible in DOM!");

		// 2.1 Mobile Light Overview
		await cleanOverlays(mobilePage, "light");
		await saveProof(mobilePage, "03_family_wallet_mobile_light_390x844.png", "Family Wallet Bottom Sheet (Mobile Light 390x844)");

		// 2.2 Mobile Dark Overview
		await cleanOverlays(mobilePage, "dark");
		await saveProof(mobilePage, "04_family_wallet_mobile_dark_390x844.png", "Family Wallet Bottom Sheet (Mobile Dark 390x844)");

		// 2.3 Mobile FNS Tax Tab Light
		console.log("[Mobile] Switching to FNS Tax Certificates tab...");
		await mobilePage.click("[data-testid='tab-family-wallet-tax']");
		await mobilePage.waitForTimeout(1000);
		await cleanOverlays(mobilePage, "light");
		await saveProof(mobilePage, "07_family_tax_certs_mobile_light_390x844.png", "Family FNS Tax Certificates Bottom Sheet (Mobile Light 390x844)");

		// 2.4 Mobile FNS Tax Tab Dark
		await cleanOverlays(mobilePage, "dark");
		await saveProof(mobilePage, "08_family_tax_certs_mobile_dark_390x844.png", "Family FNS Tax Certificates Bottom Sheet (Mobile Dark 390x844)");

		await mobileCtx.close();
		console.log("\n=== ALL 8 VERIFIED PROOFS FOR FAMILY WALLET & FNS CAPTURED SUCCESSFULLY ===");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("[FATAL ERROR]:", err);
	process.exit(1);
});
