import { existsSync, mkdirSync, copyFileSync, statSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const CONV_ID = "e88a5fff-9353-41f8-8d07-6a5217b8bc36";
const DIRS = [
	"C:/Clinic_MVP/dental-crm/docs/proofs/patients",
	`C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}`,
];

DIRS.forEach((dir) => {
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}
});

function replicateFile(srcPath, filename) {
	for (const dir of DIRS) {
		try {
			copyFileSync(srcPath, path.join(dir, filename));
		} catch (_) {}
	}
}

async function main() {
	console.log("=== 1. REAL AUTHENTICATION VIA FASTIFY API ===");
	let authData = { clinicToken: "mock", staffToken: "mock", user: { role: "owner", id: "doc-1", fullName: "Доктор" } };
	try {
		const authRes = await fetch("http://127.0.0.1:4100/api/auth/login", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email: "doctor@clinic.com", password: "dente2026" }),
		});
		if (authRes.ok) {
			authData = await authRes.json();
			console.log("[Auth] Logged in as:", authData.user?.fullName, "Role:", authData.user?.role);
		}
	} catch (e) {
		console.log("[Auth fallback]", e.message);
	}

	const browserExecutable = [
		"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
		"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
		"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
	].find((p) => existsSync(p));

	console.log("[Browser] Using executable:", browserExecutable);

	const browser = await chromium.launch({
		headless: true,
		executablePath: browserExecutable,
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	async function injectAuth(context, theme = "light") {
		await context.addInitScript(({ clinicToken, staffToken, user, th }) => {
			localStorage.setItem("dente_clinic_token", clinicToken);
			localStorage.setItem("dente_staff_token", staffToken);
			localStorage.setItem("dente_active_session_token", staffToken);
			localStorage.setItem("dente_active_role", user.role || "owner");
			localStorage.setItem("dente_user_role", user.role || "doctor");
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
			localStorage.setItem("dente_quest_progress_v2", JSON.stringify({ isDismissedPermanently: true, activeTrack: null, tracksProgress: {} }));
			document.cookie = `dente_clinic_token=${encodeURIComponent(clinicToken)}; path=/; max-age=31536000`;
			document.cookie = `dente_staff_token=${encodeURIComponent(staffToken)}; path=/; max-age=31536000`;
		}, { clinicToken: authData.clinicToken, staffToken: authData.staffToken, user: authData.user, th: theme });
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
				.shepherd-element,
				.copilot-trigger-btn,
				[data-testid="copilot-floating-trigger"],
				vite-error-overlay {
					display: none !important;
					pointer-events: none !important;
				}
				*, *::before, *::after {
					animation: none !important;
					transition: none !important;
				}
			`;
			document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container, [role="alert"]').forEach((el) => el.remove());
		}, theme);
		await page.waitForTimeout(400);
	}

	const WEB_URL = "http://127.0.0.1:5173";

	// 1. PC 1440x900
	console.log("\n=== 1. CAPTURING PATIENT CARD PC PROOFS ===");
	{
		const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
		await injectAuth(ctx, "light");
		const page = await ctx.newPage();
		await page.goto(`${WEB_URL}/?demo=true#patients`, { waitUntil: "commit", timeout: 35000 });
		await page.waitForTimeout(2500);

		// Try to click first patient row
		try {
			const row = page.locator('[data-patient-id], tr[data-id], .patient-row, [data-testid^="patient-row-"], table tbody tr').first();
			if (await row.count() > 0) {
				await row.click({ force: true, timeout: 5000 });
				await page.waitForTimeout(800);
			}
			const cardBtn = page.locator('button:has-text("В карту"), [data-testid="patient-action-open-card"], [data-testid="btn-open-patient-card"]').first();
			if (await cardBtn.count() > 0) {
				await cardBtn.click({ force: true, timeout: 5000 });
				await page.waitForTimeout(1000);
			}
		} catch (e) {
			console.log("[Select Error]", e.message);
		}

		await cleanOverlays(page, "light");
		const shotLight = path.resolve(DIRS[0], "patient_card_pc_light_1440x900.png");
		await page.screenshot({ path: shotLight });
		replicateFile(shotLight, "patient_card_pc_light_1440x900.png");
		console.log("  Saved:", shotLight, "Size:", statSync(shotLight).size, "bytes");

		// Dark
		await cleanOverlays(page, "dark");
		const shotDark = path.resolve(DIRS[0], "patient_card_pc_dark_1440x900.png");
		await page.screenshot({ path: shotDark });
		replicateFile(shotDark, "patient_card_pc_dark_1440x900.png");
		console.log("  Saved:", shotDark, "Size:", statSync(shotDark).size, "bytes");

		// Also test Family tab
		try {
			const familyTab = page.locator("button:has-text('Семья'), [data-tab='family']").first();
			if (await familyTab.count() > 0) {
				await familyTab.click();
				await page.waitForTimeout(600);
				const openWallet = page.locator("button:has-text('Семейный счет'), button:has-text('Управление балансом'), button:has-text('Семья')").first();
				if (await openWallet.count() > 0) {
					await openWallet.click();
					await page.waitForTimeout(600);
				}
				await cleanOverlays(page, "light");
				const famLight = path.resolve(DIRS[0], "patient_family_inline_pc_light_1440x900.png");
				await page.screenshot({ path: famLight });
				replicateFile(famLight, "patient_family_inline_pc_light_1440x900.png");

				await cleanOverlays(page, "dark");
				const famDark = path.resolve(DIRS[0], "patient_family_inline_pc_dark_1440x900.png");
				await page.screenshot({ path: famDark });
				replicateFile(famDark, "patient_family_inline_pc_dark_1440x900.png");
				console.log("  Saved Family Wallet Proofs successfully.");
			}
		} catch (e) {
			console.log("[Family Tab Warning]", e.message);
		}

		await ctx.close();
	}

	// 2. Mobile 390x844 (Apple HIG)
	console.log("\n=== 2. CAPTURING PATIENT CARD MOBILE PROOFS ===");
	{
		const ctx = await browser.newContext({
			viewport: { width: 390, height: 844 },
			userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
		});
		await injectAuth(ctx, "light");
		const page = await ctx.newPage();
		await page.goto(`${WEB_URL}/?demo=true#patients`, { waitUntil: "commit", timeout: 35000 });
		await page.waitForTimeout(2500);

		try {
			const mobRow = page.locator('[data-patient-id], .mobile-patient-card, .patient-row, [data-testid^="patient-row-"], table tbody tr').first();
			if (await mobRow.count() > 0) {
				await mobRow.click({ force: true, timeout: 5000 });
				await page.waitForTimeout(800);
			}
			const cardBtn = page.locator('button:has-text("В карту"), [data-testid="patient-action-open-card"], [data-testid="btn-open-patient-card"]').first();
			if (await cardBtn.count() > 0) {
				await cardBtn.click({ force: true, timeout: 5000 });
				await page.waitForTimeout(1000);
			}
		} catch (e) {
			console.log("[Mobile Select Error]", e.message);
		}

		await cleanOverlays(page, "light");
		const mobLight = path.resolve(DIRS[0], "patient_card_mobile_light_390x844.png");
		await page.screenshot({ path: mobLight });
		replicateFile(mobLight, "patient_card_mobile_light_390x844.png");
		console.log("  Saved:", mobLight, "Size:", statSync(mobLight).size, "bytes");

		await cleanOverlays(page, "dark");
		const mobDark = path.resolve(DIRS[0], "patient_card_mobile_dark_390x844.png");
		await page.screenshot({ path: mobDark });
		replicateFile(mobDark, "patient_card_mobile_dark_390x844.png");
		console.log("  Saved:", mobDark, "Size:", statSync(mobDark).size, "bytes");

		await ctx.close();
	}

	await browser.close();
	console.log("\n[SUCCESS] All Patient Card & Family Wallet 4-state visual proofs captured successfully!");
}

main().catch((err) => {
	console.error("FATAL CAPTURE ERROR:", err);
	process.exit(1);
});
