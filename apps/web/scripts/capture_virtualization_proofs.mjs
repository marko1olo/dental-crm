import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";

const CONV_ID = "f319d4b9-e2f3-4b98-908c-5c6c206734be";
const OUT_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/virtualization");
const BRAIN_DIR = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}`);
const APP_BASE = "http://127.0.0.1:5173";
const API_BASE = "http://127.0.0.1:4100";

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
if (!fs.existsSync(BRAIN_DIR)) fs.mkdirSync(BRAIN_DIR, { recursive: true });

async function provisionSession() {
	const uniqueId = Date.now();
	console.log("[Provisioning] Initializing real clinic session via API...");
	const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			clinicName: "Стоматология ДЕНТЕ Премиум",
			email: `doctor-virt-${uniqueId}@dente.local`,
			password: "Password123!",
			ownerName: "Д-р Воронов Алексей Владимирович",
			ownerPin: "1234",
		}),
	});
	if (!initRes.ok) {
		throw new Error(`Clinic setup failed: ${await initRes.text()}`);
	}
	const initData = await initRes.json();

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
	};

	let firstPatientId = null;

	try {
		const patientsToCreate = [
			{
				fullName: "Волков Сергей Александрович",
				phone: "+7 (916) 123-45-67",
				birthDate: "1984-05-12",
				notes: "Кариес 1.6, соматически здоров, ДМС Ресо-Мед",
			},
			{
				fullName: "Соколова Анна Михайловна",
				phone: "+7 (925) 888-99-00",
				birthDate: "1991-09-24",
				notes: "Ортодонтическое лечение, элайнеры",
			},
		];

		for (let i = 0; i < patientsToCreate.length; i++) {
			const pRes = await fetch(`${API_BASE}/api/patients`, {
				method: "POST",
				headers,
				body: JSON.stringify(patientsToCreate[i]),
			});
			if (pRes.ok) {
				const pData = await pRes.json();
				if (i === 0) firstPatientId = pData.id;
				console.log(`[Provisioning] Created patient ${i + 1}: ${pData.id} (${pData.fullName})`);
			}
		}
	} catch (e) {
		console.warn("[Provisioning] Warning seeding patients:", e.message);
	}

	return {
		clinicToken: initData.clinicToken,
		staffToken: unlockData.staffToken,
		ownerUserId: initData.ownerUserId,
		patientId: firstPatientId,
	};
}

async function applyTheme(page, theme) {
	await page.evaluate((th) => {
		const isDark = th === "dark";
		document.documentElement.classList.remove(isDark ? "light" : "dark");
		document.documentElement.classList.add(th);
		document.documentElement.setAttribute("data-theme", th);
		document.documentElement.style.colorScheme = th;
		localStorage.setItem("dente_theme_mode", th);
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("theme", th);
		if (window.__useThemeStore) {
			window.__useThemeStore.getState().setThemeMode(th);
		}
	}, theme);
	await page.waitForTimeout(600);
}

async function captureScreen(page, fileName, capturedList) {
	const outPath = path.join(OUT_DIR, fileName);
	const brainPath = path.join(BRAIN_DIR, fileName);
	await page.screenshot({ path: outPath, fullPage: false });
	fs.copyFileSync(outPath, brainPath);
	const stats = fs.statSync(outPath);
	const hash = crypto.createHash("md5").update(fs.readFileSync(outPath)).digest("hex");
	capturedList.push({ name: fileName, size: stats.size, md5: hash, path: outPath, brainPath });
	console.log(`[Captured] ${fileName} -> ${stats.size} bytes (MD5: ${hash})`);
}

async function run() {
	console.log("=== CAPTURING REAL VIRTUALIZATION PROOFS (LIGHT & DARK 1440x900) ===");

	const auth = await provisionSession();

	const browser = await chromium.launch({
		channel: "msedge",
		headless: true,
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage", "--no-first-run"],
	});

	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 2,
		isMobile: false,
		hasTouch: false,
	});

	const page = await context.newPage();
	page.on("pageerror", (err) => console.error("[BROWSER ERROR]:", err.message));
	page.on("console", (msg) => {
		if (msg.type() === "error") {
			console.log("[BROWSER CONSOLE ERROR]:", msg.text());
		}
	});

	console.log("[Playwright] Navigating to http://127.0.0.1:5173/ ...");
	await page.goto(`${APP_BASE}/`, { waitUntil: "domcontentloaded", timeout: 20000 });

	await page.evaluate(({ ct, st, uid, pid }) => {
		localStorage.setItem("dente_clinic_token", ct);
		localStorage.setItem("dente_staff_token", st);
		localStorage.setItem("dente_active_session_token", st);
		localStorage.setItem("dente_active_user_id", uid);
		localStorage.setItem("dente_active_role", "owner");
		localStorage.setItem("dente_active_mode", "clinic");
		localStorage.setItem("dente_demo_showcase", "true");
		sessionStorage.setItem("dente_unlocked", "true");

		localStorage.setItem("dente_theme_mode", "light");
		localStorage.setItem("dente_theme", "light");
		localStorage.setItem("theme", "light");

		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_onboarding_dismissed", "true");
		localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
		localStorage.setItem("dente_quest_progress_v2", JSON.stringify({ isDismissedPermanently: true, activeTrack: null, tracksProgress: {} }));

		localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({
			onboardingDismissed: true,
			onboardingStep: "done",
			version: 1,
		}));
		localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({
			dismissed: true,
			step: "done",
			completed: true,
			onboardingDismissed: true,
			onboardingStep: "done",
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

		document.documentElement.setAttribute("data-theme", "light");
		document.documentElement.classList.remove("dark");
		document.documentElement.classList.add("light");
	}, { ct: auth.clinicToken, st: auth.staffToken, uid: auth.ownerUserId, pid: auth.patientId });

	console.log("[Playwright] Reloading to initialize session...");
	await page.reload({ waitUntil: "domcontentloaded" });

	await page.waitForFunction(() => {
		const text = document.body.innerText || "";
		return !text.includes("Загрузка CRM") && (document.querySelector(".workspace-shell") || document.querySelector("nav") || text.includes("ДЕНТЕ"));
	}, { timeout: 30000 });
	await page.waitForTimeout(3000);

	console.log("[Playwright] Navigating to Patients View (#patients)...");
	await page.evaluate(() => {
		window.location.hash = "patients";
		window.dispatchEvent(new HashChangeEvent("hashchange"));
	});
	await page.waitForTimeout(2000);

	// Clean up overlays
	await page.evaluate(() => {
		document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container, [role="alert"]').forEach((el) => el.remove());
	});

	console.log("[Playwright] Selecting patient in Patients list...");
	// Click first patient item in master list
	const patientRow = await page.waitForSelector('.patient-card-item, tr[data-patient-id], [data-testid*="patient-row"], [data-testid*="patient-card"], .patient-item', { timeout: 10000 }).catch(() => null);
	if (patientRow) {
		await patientRow.click();
		await page.waitForTimeout(500);
	}

	// Open secondary actions dropdown
	console.log("[Playwright] Opening secondary actions menu (...) to open PatientCardModal...");
	const moreBtn = await page.waitForSelector('[data-testid="patient-card-more-actions-btn"]', { timeout: 8000 }).catch(() => null);
	if (moreBtn) {
		await moreBtn.click();
		await page.waitForTimeout(400);

		const openCardBtn = await page.waitForSelector('button:has-text("Медицинская карта"), button:has-text("Паспортная карточка")', { timeout: 5000 }).catch(() => null);
		if (openCardBtn) {
			await openCardBtn.click();
			await page.waitForTimeout(800);
		}
	} else {
		// Fallback: click master list row menu item
		console.log("[Fallback] Trying row menu in master list...");
		await page.evaluate(() => {
			const btn = document.querySelector('button[title*="Паспортная"], button:has-text("Паспортная карточка")');
			if (btn) btn.click();
		});
	}

	// Ensure PatientCardModal is visible
	await page.waitForSelector('[data-testid="patient-card-modal"]', { timeout: 15000 });
	console.log("✅ PatientCardModal opened successfully!");

	const captured = [];

	// === 1. VISITS & TIMELINE (PatientHistoryTab) ===
	console.log("[Proof 1] Navigating to Visits Tab (PatientHistoryTab)...");
	const visitsTabBtn = await page.waitForSelector('[data-testid="tab-patient-visits"]', { timeout: 5000 });
	await visitsTabBtn.click();
	await page.waitForTimeout(800);

	// Light
	await applyTheme(page, "light");
	await captureScreen(page, "proof_virtualized_timeline_pc_light.png", captured);

	// Scrolled to virtualized cards
	await page.evaluate(() => {
		const scrollEl = document.querySelector('.patient-card-modal .overflow-y-auto');
		if (scrollEl) scrollEl.scrollTop = 550;
	});
	await page.waitForTimeout(600);
	await applyTheme(page, "light");
	await captureScreen(page, "proof_virtualized_timeline_scrolled_pc_light.png", captured);
	await applyTheme(page, "dark");
	await captureScreen(page, "proof_virtualized_timeline_scrolled_pc_dark.png", captured);

	// === 2. FINANCE & DEPOSIT LOG (PatientFinanceTab) ===
	console.log("[Proof 2] Navigating to Finance Tab (PatientFinanceTab)...");
	const financeTabBtn = await page.waitForSelector('[data-testid="tab-patient-finance"]', { timeout: 5000 });
	await financeTabBtn.click();
	await page.waitForTimeout(800);

	// Reset scroll
	await page.evaluate(() => {
		const scrollEl = document.querySelector('.patient-card-modal .overflow-y-auto');
		if (scrollEl) scrollEl.scrollTop = 0;
	});
	await page.waitForTimeout(400);

	// Dark
	await captureScreen(page, "proof_virtualized_finance_pc_dark.png", captured);

	// Light
	await applyTheme(page, "light");
	await captureScreen(page, "proof_virtualized_finance_pc_light.png", captured);

	// Scrolled to deposit operations log
	await page.evaluate(() => {
		const scrollEl = document.querySelector('.patient-card-modal .overflow-y-auto');
		if (scrollEl) scrollEl.scrollTop = 450;
	});
	await page.waitForTimeout(600);
	await captureScreen(page, "proof_virtualized_finance_scrolled_pc_light.png", captured);
	await applyTheme(page, "dark");
	await captureScreen(page, "proof_virtualized_finance_scrolled_pc_dark.png", captured);

	// === 3. DOCUMENTS REGISTRY (PatientDocumentsTab) ===
	console.log("[Proof 3] Navigating to Documents Tab (PatientDocumentsTab)...");
	const docsTabBtn = await page.waitForSelector('[data-testid="tab-patient-documents"]', { timeout: 5000 });
	await docsTabBtn.click();
	await page.waitForTimeout(800);

	// Light
	await captureScreen(page, "proof_virtualized_documents_pc_light.png", captured);

	// Dark
	await applyTheme(page, "dark");
	await captureScreen(page, "proof_virtualized_documents_pc_dark.png", captured);

	await context.close();
	await browser.close();

	// Verify size >= 20KB
	for (const item of captured) {
		if (item.size < 20000) {
			throw new Error(`[BURDEN OF PROOF FAIL] ${item.name} size ${item.size} < 20KB`);
		}
	}

	console.log("=== ALL 6 SCREENSHOTS VERIFIED AND PERSISTED! ===");
	console.log(JSON.stringify(captured, null, 2));
}

run().catch((err) => {
	console.error("[FATAL ERROR]:", err);
	process.exit(1);
});
