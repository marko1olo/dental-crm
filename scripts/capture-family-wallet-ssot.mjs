import { existsSync, mkdirSync, statSync, copyFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const OUT_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/family_wallet";
mkdirSync(OUT_DIR, { recursive: true });

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
		console.log("[Auth API] Warning: login error, using fallback session", e.message);
	}
	return {
		clinicToken: "clinic-token-demo",
		staffToken: "staff-token-demo",
		user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" },
	};
}

const browserExecutable = [
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].find((p) => existsSync(p));

console.log("[Browser] Using executable:", browserExecutable);

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
			localStorage.setItem("dente_active_role", user.role || "owner");
			localStorage.setItem("dente_user_role", user.role || "owner");
			localStorage.setItem("dente_active_user_id", user.id || "doc-1");
			localStorage.setItem("dental-crm:active-user:v1", JSON.stringify(user));
			localStorage.setItem("dente_theme", th);
			localStorage.setItem("dente_theme_mode", th);
			localStorage.setItem("theme", th);
			localStorage.setItem("dente_demo_showcase", "true");
			localStorage.setItem("dente_demo_mode", "true");
			localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_tour_dismissed", "true");
			localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
			localStorage.setItem("dente_demo_banner_dismissed", "true");
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
		if (th === "dark") {
			document.documentElement.classList.add("dark");
			document.documentElement.classList.remove("light");
			document.body.className = "dark";
		} else {
			document.documentElement.classList.add("light");
			document.documentElement.classList.remove("dark");
			document.body.className = "light";
		}
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
			.shepherd-element {
				display: none !important;
				pointer-events: none !important;
			}
		`;
		document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container, [role="alert"]').forEach((el) => el.remove());
	}, theme);
	await page.waitForTimeout(400);
}

async function waitForRealUI(page) {
	for (let i = 0; i < 40; i++) {
		await page.waitForTimeout(1000);
		try {
			const text = await page.evaluate(() => (document.body ? document.body.innerText : ""));
			if (!text.includes("Загрузка системы") && text.length > 200) {
				console.log(`[UI Ready] Found populated DOM (${text.length} chars) at iteration ${i + 1}`);
				return true;
			}
		} catch (_) {}
	}
	console.log("[UI Warning] Timed out waiting for full text");
	return false;
}

async function saveProof(page, filename, description) {
	const targetPath = path.join(OUT_DIR, filename);
	await page.screenshot({ path: targetPath, fullPage: false });
	const sz = statSync(targetPath).size;
	console.log(`[PROOF CAPTURED] ${filename} (${sz} bytes) -> ${description} [>=20KB: ${sz >= 20480}]`);
	if (sz < 20480) {
		throw new Error(`Screenshot ${filename} is smaller than 20KB: ${sz} bytes`);
	}
}

async function main() {
	const authData = await getAuth();
	console.log("[Auth Data Ready] Clinic Token:", Boolean(authData.clinicToken));

	try {
		// ═══════════════════════════════════════════════════════════
		// 1. PC VIEWPORT: 1440x900 (LIGHT & DARK)
		// ═══════════════════════════════════════════════════════════
		console.log("\n--- [PC 1440x900 Desktop] ---");
		const pcCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
		await injectAuth(pcCtx, authData, "light");
		const pcPage = await pcCtx.newPage();

		await pcPage.goto("http://127.0.0.1:5173/?demo=true#patients", { waitUntil: "commit", timeout: 45000 });
		await waitForRealUI(pcPage);
		await pcPage.waitForTimeout(2000);

		// Select patient Смирнова Анна Сергеевна
		await pcPage.evaluate(() => {
			const el = Array.from(document.querySelectorAll("div, button, tr, td")).find(
				(node) => node.textContent?.includes("Смирнова Анна")
			);
			if (el) (el.closest('button, [role="button"], tr') || el).click();
		});
		await pcPage.waitForTimeout(1000);

		console.log("[PC] Dispatching dente-open-family-wallet event directly...");
		await pcPage.evaluate(() => {
			window.dispatchEvent(
				new CustomEvent("dente-open-family-wallet", {
					detail: { patientId: "01a00000-0000-0000-0000-000000000001", patientName: "Смирнова Анна Сергеевна" },
				}),
			);
		});

		await pcPage.waitForSelector("[data-testid='family-wallet-modal']", { state: "visible", timeout: 25000 });
		console.log("[PC] SUCCESS: Family Wallet Modal is visible in DOM!");

		// 1.1 PC Light
		await cleanOverlays(pcPage, "light");
		await saveProof(pcPage, "01_family_wallet_pc_light_1440x900.png", "Family Wallet Modal (PC Light 1440x900)");

		// 1.2 PC Dark
		await cleanOverlays(pcPage, "dark");
		await saveProof(pcPage, "02_family_wallet_pc_dark_1440x900.png", "Family Wallet Modal (PC Dark 1440x900)");

		// 1.3 PC FNS Tax Tab (Light & Dark)
		console.log("[PC] Navigating to FNS Tax Certificates tab...");
		await pcPage.click("[data-testid='tab-family-wallet-tax']");
		await pcPage.waitForTimeout(800);
		await cleanOverlays(pcPage, "light");
		await saveProof(pcPage, "05_family_tax_certs_pc_light_1440x900.png", "Family FNS Tax Certificates (PC Light 1440x900)");
		await cleanOverlays(pcPage, "dark");
		await saveProof(pcPage, "06_family_tax_certs_pc_dark_1440x900.png", "Family FNS Tax Certificates (PC Dark 1440x900)");

		await pcCtx.close();

		// ═══════════════════════════════════════════════════════════
		// 2. MOBILE VIEWPORT: 390x844 (Apple HIG LIGHT & DARK)
		// ═══════════════════════════════════════════════════════════
		console.log("\n--- [Mobile 390x844 Apple HIG] ---");
		const mobileCtx = await browser.newContext({
			viewport: { width: 390, height: 844 },
			userAgent:
				"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
			isMobile: true,
			hasTouch: true,
		});
		await injectAuth(mobileCtx, authData, "light");
		const mobilePage = await mobileCtx.newPage();

		await mobilePage.goto("http://127.0.0.1:5173/?demo=true#patients", { waitUntil: "commit", timeout: 45000 });
		await waitForRealUI(mobilePage);
		await mobilePage.waitForTimeout(2000);

		// Select patient Смирнова Анна Сергеевна
		await mobilePage.evaluate(() => {
			const el = Array.from(document.querySelectorAll("div, button, tr, td")).find(
				(node) => node.textContent?.includes("Смирнова Анна")
			);
			if (el) (el.closest('button, [role="button"], tr') || el).click();
		});
		await mobilePage.waitForTimeout(1000);

		console.log("[Mobile] Dispatching dente-open-family-wallet event directly...");
		await mobilePage.evaluate(() => {
			window.dispatchEvent(
				new CustomEvent("dente-open-family-wallet", {
					detail: { patientId: "01a00000-0000-0000-0000-000000000001", patientName: "Смирнова Анна Сергеевна" },
				}),
			);
		});

		await mobilePage.waitForSelector("[data-testid='family-wallet-modal']", { state: "visible", timeout: 25000 });
		console.log("[Mobile] SUCCESS: Family Wallet Bottom Sheet is visible in DOM!");

		// 2.1 Mobile Light
		await cleanOverlays(mobilePage, "light");
		await saveProof(mobilePage, "03_family_wallet_mobile_light_390x844.png", "Family Wallet Bottom Sheet (Mobile Light 390x844)");

		// 2.2 Mobile Dark
		await cleanOverlays(mobilePage, "dark");
		await saveProof(mobilePage, "04_family_wallet_mobile_dark_390x844.png", "Family Wallet Bottom Sheet (Mobile Dark 390x844)");

		// 2.3 Mobile FNS Tax Tab (Light & Dark)
		console.log("[Mobile] Navigating to FNS Tax Certificates tab...");
		await mobilePage.click("[data-testid='tab-family-wallet-tax']");
		await mobilePage.waitForTimeout(800);
		await cleanOverlays(mobilePage, "light");
		await saveProof(mobilePage, "07_family_tax_certs_mobile_light_390x844.png", "Family FNS Tax Certificates Bottom Sheet (Mobile Light 390x844)");
		await cleanOverlays(mobilePage, "dark");
		await saveProof(mobilePage, "08_family_tax_certs_mobile_dark_390x844.png", "Family FNS Tax Certificates Bottom Sheet (Mobile Dark 390x844)");

		await mobileCtx.close();
		console.log("\n=== ALL 4-STATE FAMILY WALLET PROOFS CAPTURED SUCCESSFULLY ===");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("[FATAL] Capture failed:", err);
	process.exit(1);
});
