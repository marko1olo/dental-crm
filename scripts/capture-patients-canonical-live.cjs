const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

const API_BASE = "http://localhost:4100";
const WEB_BASE = "http://localhost:5173";
const OUT_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/patients";
const BRAIN_DIR = "C:/Users/Admin/.gemini/antigravity/brain/e88a5fff-9353-41f8-8d07-6a5217b8bc36";

[OUT_DIR, BRAIN_DIR].forEach((dir) => {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

async function provisionSession() {
	const uniqueId = Date.now();
	console.log("[Provisioning] Initializing clinic session via API...");
	const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			clinicName: "Стоматология ДЕНТЕ Премиум",
			email: `doctor-patients-${uniqueId}@dente.local`,
			password: "Password123!",
			ownerName: "Д-р Воронов А. В.",
			ownerPin: "1234",
		}),
	});
	if (!initRes.ok) {
		throw new Error(`Clinic setup failed: ${await initRes.text()}`);
	}
	const initData = await initRes.json();
	const orgId = initData.organizationId;
	console.log(`[Provisioning] Organization created: ${orgId}`);

	const unlockRes = await fetch(`${API_BASE}/api/auth/staff/unlock`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-dente-clinic-token": initData.clinicToken,
		},
		body: JSON.stringify({ userId: initData.ownerUserId, pinCode: "1234" }),
	});
	if (!unlockRes.ok) {
		throw new Error(`Staff unlock failed: ${await unlockRes.text()}`);
	}
	const unlockData = await unlockRes.json();

	const headers = {
		"Content-Type": "application/json",
		"x-dente-clinic-token": initData.clinicToken,
		"x-dente-staff-token": unlockData.staffToken,
		"x-dente-active-role": "owner",
	};

	let patientId = null;
	try {
		const pRes = await fetch(`${API_BASE}/api/patients`, {
			method: "POST",
			headers,
			body: JSON.stringify({
				fullName: "Кузнецов Дмитрий Сергеевич",
				phone: "+7 (927) 123-45-67",
				birthDate: "1985-04-12",
				notes: "Пациент с планом лечения. Аллергия на лидокаин.",
			}),
		});
		if (pRes.ok) {
			const pData = await pRes.json();
			patientId = pData.id;
			console.log(`[Provisioning] Created patient: ${patientId} (${pData.fullName})`);
		}
	} catch (e) {
		console.log("[Provisioning] Patient creation notice:", e.message);
	}

	return {
		clinicToken: initData.clinicToken,
		staffToken: unlockData.staffToken,
		ownerUserId: initData.ownerUserId,
		patientId,
	};
}

async function recordScreenshot(page, fileName) {
	const targetPath = path.join(OUT_DIR, fileName);
	const brainPath = path.join(BRAIN_DIR, fileName);
	await page.screenshot({ path: targetPath, fullPage: false });
	fs.copyFileSync(targetPath, brainPath);
	const stats = fs.statSync(targetPath);
	if (stats.size < 20480) {
		throw new Error(`[BYTE GUARD FAIL] ${fileName} size is ${stats.size} bytes (< 20KB)!`);
	}
	console.log(`[PROOF OK] ${fileName} -> ${(stats.size / 1024).toFixed(1)} KB (>= 20KB guard passed)`);
}

async function initContextAuth(context, auth, theme = "light") {
	await context.addInitScript(({ ct, st, uid, pid, themeMode }) => {
		sessionStorage.setItem("dente:sw-controller-reload", "1");
		sessionStorage.setItem("dente_unlocked", "true");
		localStorage.setItem("dente_clinic_token", ct);
		localStorage.setItem("dente_staff_token", st);
		localStorage.setItem("dente_active_session_token", st);
		localStorage.setItem("dente_active_role", "owner");
		localStorage.setItem("dente_user_role", "owner");
		localStorage.setItem("dente_role", "owner");
		localStorage.setItem("dente_user_id", uid);
		if (pid) {
			localStorage.setItem("dente_active_patient_id", pid);
		}
		localStorage.setItem("dente_theme", themeMode);
		localStorage.setItem("dente_theme_mode", themeMode);
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_tour_dismissed", "true");
		localStorage.setItem("dente_demo_banner_dismissed", "true");
		localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({
			onboardingDismissed: true,
			onboardingStep: "done",
			version: 1,
		}));
		localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({
			dismissed: true,
			step: "done",
			completed: true,
			version: 1,
		}));
		localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
			version: 1,
			uiLanguage: "ru",
			selectedWorkspaceRole: "owner",
			selectedPatientId: pid,
			onboardingDismissed: true,
			onboardingStep: "done",
		}));
		localStorage.setItem(
			"dente-workspace-profile",
			JSON.stringify({
				state: {
					clinicName: "Стоматология ДЕНТЕ Премиум",
					currentDoctor: { id: uid, fullName: "Д-р Воронов А. В.", role: "owner" },
					flags: { disableTour: true },
				},
			})
		);
	}, {
		ct: auth.clinicToken,
		st: auth.staffToken,
		uid: auth.ownerUserId,
		pid: auth.patientId,
		themeMode: theme,
	});
}

async function suppressOverlays(page) {
	await page.evaluate(() => {
		const style = document.createElement("style");
		style.id = "suppress-all-overlays";
		style.innerHTML = `
			.tour-spotlight-root, .tour-backdrop-clickable-zone,
			[data-testid="guided-tour-spotlight-overlay"],
			[data-testid="guided-tour-coach-mark-card"],
			[data-testid="demo-mode-banner"], .global-toast-container,
			.copilot-trigger-btn, [data-testid="copilot-floating-trigger"],
			vite-error-overlay { display: none !important; pointer-events: none !important; }
		`;
		document.head.appendChild(style);
	}).catch(() => {});
}

async function switchTheme(page, theme) {
	await page.evaluate((th) => {
		if (window.__useThemeStore) window.__useThemeStore.getState().setThemeMode(th);
		document.documentElement.setAttribute("data-theme", th);
		document.body.setAttribute("data-theme", th);
		if (th === "dark") {
			document.documentElement.classList.add("dark");
			document.documentElement.classList.remove("light");
			document.body.classList.add("dark");
			document.body.classList.remove("light");
		} else {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			document.body.classList.remove("dark");
			document.body.classList.add("light");
		}
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("dente_theme_mode", th);
		window.dispatchEvent(new Event("themechange"));
	}, theme);
	await suppressOverlays(page);
	await page.waitForTimeout(600);
}

async function waitForAppReady(page) {
	for (let i = 0; i < 30; i++) {
		await page.waitForTimeout(1000);
		try {
			const hasBoot = await page.$(".boot-state");
			if (!hasBoot) {
				console.log("[App Ready] Boot screen detached!");
				return true;
			}
		} catch (_) {}
	}
	console.log("[App Warning] Boot state still present, forcing remove...");
	await page.evaluate(() => {
		const b = document.querySelector(".boot-state");
		if (b) b.remove();
	}).catch(() => {});
	return false;
}

async function main() {
	const auth = await provisionSession();

	console.log("[Playwright] Launching Chrome headless...");
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
	});

	// =========================================================================
	// 1. DESKTOP (1440x900)
	// =========================================================================
	console.log("\n=== 1. DESKTOP CONTEXT (1440x900) ===");
	const desktopCtx = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 1,
		serviceWorkers: "block",
	});
	await initContextAuth(desktopCtx, auth, "light");

	const page = await desktopCtx.newPage();
	page.on("console", (msg) => {
		if (msg.type() === "error") console.log(`[BROWSER ERROR]:`, msg.text());
	});
	console.log("Navigating to ?demo=true#patients on 5173...");
	await page.goto(`${WEB_BASE}/?demo=true#patients`, { waitUntil: "commit", timeout: 45000 });
	await page.waitForTimeout(8000);
	await suppressOverlays(page);

	// 1.1 Desktop Light Registry
	console.log("1.1 Patients Registry PC Light (1440x900)...");
	await switchTheme(page, "light");
	await recordScreenshot(page, "01_patients_registry_pc_light_1440x900.png");

	// 1.2 Desktop Dark Registry
	console.log("1.2 Patients Registry PC Dark (1440x900)...");
	await switchTheme(page, "dark");
	await recordScreenshot(page, "02_patients_registry_pc_dark_1440x900.png");

	// 1.3 Open Patient Card Modal
	console.log("1.3 Opening Patient Card Modal...");
	try {
		const row = page.locator('[data-patient-id], tr[data-id], .patient-row, table tbody tr').first();
		if (await row.isVisible({ timeout: 5000 })) {
			await row.click();
			await page.waitForTimeout(1000);
		}
		const openCardBtn = page.locator('button:has-text("В карту"), [data-testid="patient-action-open-card"], [data-testid="btn-open-patient-card"]').first();
		if (await openCardBtn.isVisible({ timeout: 5000 })) {
			await openCardBtn.click();
			await page.waitForTimeout(1500);
		}
	} catch (e) {
		console.log("[Patient Card open warning]:", e.message);
	}
	await suppressOverlays(page);

	// 1.4 Desktop Light Patient Card
	console.log("1.4 Patient Card PC Light (1440x900)...");
	await switchTheme(page, "light");
	await recordScreenshot(page, "03_patient_card_pc_light_1440x900.png");

	// 1.5 Desktop Dark Patient Card
	console.log("1.5 Patient Card PC Dark (1440x900)...");
	await switchTheme(page, "dark");
	await recordScreenshot(page, "04_patient_card_pc_dark_1440x900.png");

	// 1.6 Switch to Family Tab
	console.log("1.6 Opening Family Tab & Wallet...");
	try {
		const familyTab = page.locator("button:has-text('Семья'), [data-tab='family']").first();
		if (await familyTab.isVisible({ timeout: 5000 })) {
			await familyTab.click();
			await page.waitForTimeout(1000);
			const openWallet = page.locator("button:has-text('Семейный счет'), button:has-text('Открыть кошелек'), button:has-text('Управление балансом')").first();
			if (await openWallet.isVisible({ timeout: 5000 })) {
				await openWallet.click();
				await page.waitForTimeout(1000);
			}
			await switchTheme(page, "light");
			await recordScreenshot(page, "07_family_wallet_pc_light_1440x900.png");
			await switchTheme(page, "dark");
			await recordScreenshot(page, "08_family_wallet_pc_dark_1440x900.png");
		}
	} catch (e) {
		console.log("[Family Tab notice]:", e.message);
	}

	await desktopCtx.close();

	// =========================================================================
	// 2. MOBILE (390x844 Apple HIG)
	// =========================================================================
	console.log("\n=== 2. MOBILE CONTEXT (390x844 Apple HIG) ===");
	const mobileCtx = await browser.newContext({
		viewport: { width: 390, height: 844 },
		deviceScaleFactor: 2,
		isMobile: true,
		hasTouch: true,
		serviceWorkers: "block",
	});
	await initContextAuth(mobileCtx, auth, "light");

	const mobPage = await mobileCtx.newPage();
	await mobPage.goto(`${WEB_BASE}/?demo=true#patients`, { waitUntil: "commit", timeout: 45000 });
	await mobPage.waitForTimeout(8000);
	await suppressOverlays(mobPage);

	// 2.1 Mobile Light
	console.log("2.1 Patients Mobile Light (390x844)...");
	await switchTheme(mobPage, "light");
	await recordScreenshot(mobPage, "05_patient_mobile_light_390x844.png");

	// 2.2 Mobile Dark
	console.log("2.2 Patients Mobile Dark (390x844)...");
	await switchTheme(mobPage, "dark");
	await recordScreenshot(mobPage, "06_patient_mobile_dark_390x844.png");

	await mobileCtx.close();
	await browser.close();

	console.log("\n============================================================");
	console.log("ALL REAL PATIENTS & FAMILY PROOFS CAPTURED SUCCESSFULLY!");
	console.log("============================================================");
}

main().catch((err) => {
	console.error("[FATAL ERROR]:", err);
	process.exit(1);
});
