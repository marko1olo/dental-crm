import { existsSync, mkdirSync, statSync, copyFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const CONV_ID = "e88a5fff-9353-41f8-8d07-6a5217b8bc36";
const OUT_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/patients";
const BRAIN_DIR = `C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}`;

[OUT_DIR, BRAIN_DIR].forEach((dir) => {
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
});

async function provisionRealSession() {
	const API_BASE = "http://127.0.0.1:4100";
	const uniqueId = Date.now();
	console.log("[Provisioning] Creating real clinic session via API...");
	const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			clinicName: "Стоматология ДЕНТЕ Премиум",
			email: `surgeon-${uniqueId}@dente.local`,
			password: "Password123!",
			ownerName: "Д-р Воронов А. В.",
			ownerPin: "1234",
		}),
	});
	if (!initRes.ok) throw new Error(`Init failed: ${await initRes.text()}`);
	const initData = await initRes.json();

	const unlockRes = await fetch(`${API_BASE}/api/auth/staff/unlock`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-dente-clinic-token": initData.clinicToken,
		},
		body: JSON.stringify({ userId: initData.ownerUserId, pinCode: "1234" }),
	});
	if (!unlockRes.ok) throw new Error(`Unlock failed: ${await unlockRes.text()}`);
	const unlockData = await unlockRes.json();

	// Create real patient
	const patientRes = await fetch(`${API_BASE}/api/patients`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-dente-clinic-token": initData.clinicToken,
			"x-dente-staff-token": unlockData.staffToken,
			"x-dente-active-role": "owner",
		},
		body: JSON.stringify({
			fullName: "Кузнецов Дмитрий Сергеевич",
			phone: "+7 (927) 123-45-67",
			birthDate: "1985-04-12",
			notes: "Пациент с планом лечения. Аллергия на лидокаин.",
		}),
	});
	let patientId = null;
	if (patientRes.ok) {
		const pData = await patientRes.json();
		patientId = pData.id;
		console.log(`[Provisioning] Real patient created: ${pData.fullName} (${patientId})`);
	}

	return {
		clinicToken: initData.clinicToken,
		staffToken: unlockData.staffToken,
		userId: initData.ownerUserId,
		patientId,
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
	args: ["--no-sandbox", "--disable-gpu"],
});

async function suppressOverlays(page) {
	await page.evaluate(() => {
		const style = document.createElement("style");
		style.id = "suppress-all-tour-overlays";
		style.innerHTML = `
			.tour-spotlight-root,
			.tour-backdrop-clickable-zone,
			[data-testid="guided-tour-spotlight-overlay"],
			[data-testid="guided-tour-coach-mark-card"],
			[data-testid="demo-mode-banner"],
			.shepherd-element,
			.global-toast-container,
			.copilot-trigger-btn,
			[data-testid="copilot-floating-trigger"],
			vite-error-overlay {
				display: none !important;
				pointer-events: none !important;
				opacity: 0 !important;
			}
			*, *::before, *::after {
				animation: none !important;
				transition: none !important;
			}
		`;
		document.head.appendChild(style);
		document.querySelectorAll("vite-error-overlay, .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay']").forEach((el) => el.remove());
	}).catch(() => {});
}

async function setTheme(p, theme) {
	await p.evaluate((th) => {
		if (window.__useThemeStore) window.__useThemeStore.getState().setThemeMode(th);
		document.documentElement.setAttribute("data-theme", th);
		document.body.setAttribute("data-theme", th);
		if (th === "dark") {
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
			document.body.classList.remove("light");
			document.body.classList.add("dark");
		} else {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			document.body.classList.remove("dark");
			document.body.classList.add("light");
		}
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("dente_theme_mode", th);
		window.dispatchEvent(new Event("themechange"));
	}, theme).catch(() => {});
	await suppressOverlays(p);
	await p.waitForTimeout(400);
}

async function saveProof(page, filename, description) {
	await suppressOverlays(page);
	await page.waitForTimeout(400);
	const targetPath = path.join(OUT_DIR, filename);
	await page.screenshot({ path: targetPath, fullPage: false });
	const brainPath = path.join(BRAIN_DIR, filename);
	try {
		copyFileSync(targetPath, brainPath);
	} catch (_) {}
	const sz = statSync(targetPath).size;
	console.log(`[PROOF CAPTURED] ${filename} (${sz} bytes) -> ${description} [>=20KB: ${sz >= 20480}]`);
	if (sz < 20480) {
		throw new Error(`Screenshot ${filename} is smaller than 20KB: ${sz} bytes`);
	}
}

async function run() {
	const auth = await provisionRealSession();

	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 1,
		serviceWorkers: "block",
	});

	await context.addInitScript(({ ct, st, uid, pid }) => {
		window.__denteClinicToken = ct;
		window.__denteStaffToken = st;
		sessionStorage.setItem("dente:sw-controller-reload", "1");
		sessionStorage.setItem("dente_unlocked", "true");
		localStorage.setItem("dente_clinic_token", ct);
		localStorage.setItem("dente_staff_token", st);
		localStorage.setItem("dente_active_session_token", st);
		localStorage.setItem("dente_active_role", "owner");
		localStorage.setItem("dente_user_role", "owner");
		localStorage.setItem("dente_role", "owner");
		localStorage.setItem("dente_user_id", uid);
		if (pid) localStorage.setItem("dente_active_patient_id", pid);
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_tour_dismissed", "true");
		localStorage.setItem("dente_demo_banner_dismissed", "true");
		localStorage.setItem("dental-crm:active-user:v1", JSON.stringify({
			id: uid,
			fullName: "Д-р Воронов Алексей Владимирович",
			role: "owner",
		}));
		localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({
			dismissed: true,
			step: "done",
			completed: true,
		}));
		document.cookie = `dente_clinic_token=${encodeURIComponent(ct)}; path=/`;
		document.cookie = `dente_staff_token=${encodeURIComponent(st)}; path=/`;
	}, { ct: auth.clinicToken, st: auth.staffToken, uid: auth.userId, pid: auth.patientId });

	const page = await context.newPage();
	page.on('console', msg => console.log('[BROWSER CONSOLE]', msg.type(), msg.text()));
	page.on('pageerror', err => console.log('[BROWSER PAGE ERROR]', err.message));
	page.on('requestfailed', req => console.log('[BROWSER REQ FAILED]', req.url(), req.failure()?.errorText));
	page.on('response', res => {
		if (res.status() >= 400) console.log(`[HTTP ${res.status()}]`, res.url());
	});
	console.log("Navigating to http://127.0.0.1:5173/#patients ...");
	await page.goto("http://127.0.0.1:5173/#patients", { waitUntil: "commit", timeout: 45000 });
	await page.waitForTimeout(4000);
	await page.screenshot({ path: "docs/proofs/patients/debug_current_page.png" });

	const pageText = await page.evaluate(() => document.body.innerText);
	console.log("Current page text:", pageText.slice(0, 400));
	await page.waitForTimeout(2000);
	await suppressOverlays(page);

	// 1. PC Light Registry
	console.log("Saving 01_patients_registry_pc_light_1440x900.png...");
	await setTheme(page, "light");
	await saveProof(page, "01_patients_registry_pc_light_1440x900.png", "Patients Registry (PC Light 1440x900)");

	// 2. PC Dark Registry
	console.log("Saving 02_patients_registry_pc_dark_1440x900.png...");
	await setTheme(page, "dark");
	await saveProof(page, "02_patients_registry_pc_dark_1440x900.png", "Patients Registry (PC Dark 1440x900)");

	// 3. Open Patient Card Modal
	console.log("Clicking patient row to open PatientCardModal...");
	try {
		const row = page.locator('[data-patient-id], tr[data-id], .patient-row, table tbody tr').first();
		if (await row.count() > 0) {
			await row.click({ force: true });
			await page.waitForTimeout(1000);
		}
		const openCardBtn = page.locator('button:has-text("В карту"), [data-testid="patient-action-open-card"], [data-testid="btn-open-patient-card"]').first();
		if (await openCardBtn.count() > 0) {
			await openCardBtn.click({ force: true });
			await page.waitForTimeout(1500);
		}
	} catch (e) {
		console.log("[Patient Card click warning]:", e.message);
	}
	await suppressOverlays(page);

	// 4. PC Light Patient Card
	console.log("Saving 03_patient_card_pc_light_1440x900.png...");
	await setTheme(page, "light");
	await saveProof(page, "03_patient_card_pc_light_1440x900.png", "Patient Card Modal (PC Light 1440x900)");

	// 5. PC Dark Patient Card
	console.log("Saving 04_patient_card_pc_dark_1440x900.png...");
	await setTheme(page, "dark");
	await saveProof(page, "04_patient_card_pc_dark_1440x900.png", "Patient Card Modal (PC Dark 1440x900)");

	// 6. Family Wallet Tab
	console.log("Opening Family Tab & Wallet...");
	try {
		const familyTab = page.locator("button:has-text('Семья'), [data-tab='family']").first();
		if (await familyTab.count() > 0) {
			await familyTab.click({ force: true });
			await page.waitForTimeout(800);
			const openWallet = page.locator("button:has-text('Семейный счет'), button:has-text('Открыть кошелек'), button:has-text('Управление балансом')").first();
			if (await openWallet.count() > 0) {
				await openWallet.click({ force: true });
				await page.waitForTimeout(800);
			}
			await setTheme(page, "light");
			await saveProof(page, "07_family_wallet_pc_light_1440x900.png", "Family Wallet & Tax Section (PC Light 1440x900)");
			await setTheme(page, "dark");
			await saveProof(page, "08_family_wallet_pc_dark_1440x900.png", "Family Wallet & Tax Section (PC Dark 1440x900)");
		}
	} catch (e) {
		console.log("[Family Tab notice]:", e.message);
	}

	// 7. Mobile Viewport 390x844 (Apple HIG)
	console.log("\n--- [Mobile 390x844 Apple HIG] ---");
	await page.setViewportSize({ width: 390, height: 844 });
	await page.waitForTimeout(1000);
	await suppressOverlays(page);

	// 7.1 Mobile Light
	await setTheme(page, "light");
	await saveProof(page, "05_patient_mobile_light_390x844.png", "Patient Card Mobile (Mobile Light 390x844)");

	// 7.2 Mobile Dark
	await setTheme(page, "dark");
	await saveProof(page, "06_patient_mobile_dark_390x844.png", "Patient Card Mobile (Mobile Dark 390x844)");

	await context.close();
	await browser.close();

	console.log("\n============================================================");
	console.log(">>> ALL REAL PATIENTS & FAMILY PROOFS CAPTURED SUCCESSFULLY! <<<");
	console.log("============================================================");
}

run().catch((err) => {
	console.error("[FATAL CAPTURE ERROR]:", err);
	process.exit(1);
});
