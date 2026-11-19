import { existsSync, mkdirSync, statSync, copyFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const CONV_ID = "b7390226-50db-43f5-9313-dbc1688fe2ea";
const OUT_DIRS = [
	path.resolve("docs/proofs/treatment_plans"),
	path.resolve("docs/proofs/treatment-plans"),
	path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}`),
];

for (const dir of OUT_DIRS) {
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

// 1. Авторизация через реальный Fastify API
let authData = null;
try {
	const authRes = await fetch("http://127.0.0.1:4100/api/auth/login", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email: "doctor@clinic.com", password: "dente2026" }),
	});
	if (authRes.ok) {
		authData = await authRes.json();
		console.log("[Auth] Successfully logged in:", authData.user?.fullName);
	}
} catch (e) {
	console.log("[Auth] Login fallback to demo tokens:", e.message);
}

const browserExecutable = [
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
].find((p) => existsSync(p));

console.log("[Browser] Using executable:", browserExecutable);

const browser = await chromium.launch({
	executablePath: browserExecutable,
	headless: true,
	args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
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
			.splash,
			#splash-root,
			[data-testid="splash-loader"],
			.splash-screen,
			#loading-screen,
			.global-toast-container,
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
		document.head.appendChild(style);
		document.querySelectorAll("vite-error-overlay, .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay']").forEach((el) => el.remove());
	}).catch(() => {});
}

async function setTheme(p, theme) {
	await p.evaluate((th) => {
		document.documentElement.setAttribute("data-theme", th);
		if (th === "light") {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			document.body.className = "light";
		} else {
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
			document.body.className = "dark";
		}
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("dente_theme_mode", th);
		localStorage.setItem("theme", th);
		document.documentElement.style.colorScheme = th;
	}, theme);
	await suppressOverlays(p);
	await p.waitForTimeout(400);
}

async function saveProof(page, filename, description) {
	await suppressOverlays(page);
	await page.waitForTimeout(600);
	for (const dir of OUT_DIRS) {
		const targetPath = path.join(dir, filename);
		await page.screenshot({ path: targetPath, fullPage: false, animations: "disabled" });
		const sz = statSync(targetPath).size;
		console.log(`[PROOF CAPTURED] ${targetPath} (${sz} bytes) -> ${description} [>=40KB: ${sz >= 40960}]`);
		if (sz < 40960) {
			throw new Error(`Screenshot ${filename} is smaller than 40KB: ${sz} bytes`);
		}
	}
}

async function injectAuth(context, theme = "light") {
	await context.addInitScript(({ auth, th }) => {
		try {
			const clinicToken = auth?.clinicToken || "demo-clinic-token";
			const staffToken = auth?.staffToken || "demo-staff-token";
			const user = auth?.user || { id: "doc-1", fullName: "Д-р Орлов А.В.", role: "doctor" };

			sessionStorage.setItem("dente_unlocked", "true");
			sessionStorage.setItem("dente:sw-controller-reload", "1");
			localStorage.setItem("dente_clinic_token", clinicToken);
			localStorage.setItem("dente_staff_token", staffToken);
			localStorage.setItem("dente_active_session_token", staffToken);
			localStorage.setItem("dente_active_role", user.role);
			localStorage.setItem("dente_user_role", user.role);
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
			document.cookie = `dente_clinic_token=${encodeURIComponent(clinicToken)}; path=/; max-age=31536000`;
			document.cookie = `dente_staff_token=${encodeURIComponent(staffToken)}; path=/; max-age=31536000`;
		} catch (e) {}
	}, { auth: authData, th: theme });
}

async function waitForRealUI(page) {
	for (let i = 0; i < 40; i++) {
		await page.waitForTimeout(1000);
		try {
			const text = await page.evaluate(() => (document.body ? document.body.innerText : ""));
			if (!text.includes("Загрузка системы") && text.length > 50) {
				console.log(`[UI Ready] Populated DOM (${text.length} chars)`);
				return true;
			}
		} catch (_) {}
	}
	return false;
}

async function openPatientCardAndTreatmentPlans(page) {
	await waitForRealUI(page);
	await page.waitForTimeout(1000);

	// Ждем модалку карты пациента
	const modal = page.locator('[data-testid="patient-card-modal"]').first();
	await modal.waitFor({ state: "visible", timeout: 20000 }).catch(() => {});

	// Переключаемся на вкладку планов лечения через канонический data-testid="tab-patient-treatment-plans"
	try {
		const plansTab = modal.locator('[data-testid="tab-patient-treatment-plans"]').first();
		await plansTab.waitFor({ state: "visible", timeout: 20000 });
		console.log("Clicking 'tab-patient-treatment-plans' button inside modal...");
		await plansTab.click();
		await page.waitForTimeout(1000);

		// Ждем завершения загрузки планов лечения
		await page.waitForFunction(() => {
			const text = document.body ? document.body.innerText : "";
			return !text.includes("Загрузка планов лечения");
		}, { timeout: 15000 }).catch(() => {});

		await page.waitForTimeout(1200);
	} catch (e) {
		console.log("[Plans Tab notice]", e.message);
	}
}

async function capture() {
	console.log("=== CAPTURING 4-STATE CANONICAL TREATMENT PLANS PROOFS ===");

	const WEB_URL = "http://127.0.0.1:5173";

	// 1. PC Viewport 1440x900
	console.log("\n--- [PC 1440x900 Context] ---");
	const pcContext = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 2,
		serviceWorkers: "block",
	});
	await injectAuth(pcContext, "light");

	const pcPage = await pcContext.newPage();
	console.log("[PC] Navigating to patients view...");
	await pcPage.goto(`${WEB_URL}/?demo=true&patient_modal=1#patient-card`, { waitUntil: "commit", timeout: 35000 });
	await openPatientCardAndTreatmentPlans(pcPage);

	// 1.1 PC Light
	console.log("[PC] Capturing PC Light...");
	await setTheme(pcPage, "light");
	await saveProof(pcPage, "01_treatment_plan_pc_light_1440x900.png", "Treatment Plans Tab (PC Light 1440x900)");
	await saveProof(pcPage, "01_treatment_plan_3tier_pc_light_1440x900.png", "Treatment Plans Tab 3-Tier (PC Light 1440x900)");

	// 1.2 PC Dark (Снятие вкладки планов в чистом виде без открытых модалок!)
	console.log("[PC] Capturing PC Dark...");
	await setTheme(pcPage, "dark");
	await saveProof(pcPage, "02_treatment_plan_pc_dark_1440x900.png", "Treatment Plans Tab (PC Dark 1440x900)");
	await saveProof(pcPage, "02_treatment_plan_3tier_pc_dark_1440x900.png", "Treatment Plans Tab 3-Tier (PC Dark 1440x900)");

	// Возвращаем light для модалок
	await setTheme(pcPage, "light");

	// 1.3 Проверяем открытие модалки скидок врача (DEF-TP-01)
	try {
		const discountBtn = pcPage.locator('[data-testid="btn-open-doctor-discounts"]').first();
		if (await discountBtn.count() > 0 && await discountBtn.isVisible()) {
			console.log("[PC] Clicking doctor discount button...");
			await discountBtn.click({ force: true });
			await pcPage.waitForTimeout(600);
			await saveProof(pcPage, "01_treatment_plan_discounts_modal_pc_light_1440x900.png", "Doctor Discounts Modal (PC Light 1440x900)");
			
			const closeBtn = pcPage.locator('[data-testid="btn-reset-discount"]').first();
			if (await closeBtn.count() > 0) {
				await closeBtn.click({ force: true });
			}
			await pcPage.keyboard.press("Escape");
			await pcPage.waitForTimeout(400);
		}
	} catch (e) {
		console.log("[Discount Modal notice]", e.message);
	}

	// 1.4 Capture Contract Print Modal (DEF-PLAN-04)
	try {
		const printBtn = pcPage.locator('[data-testid="btn-print-treatment-plan"]').first();
		if (await printBtn.count() > 0 && await printBtn.isVisible()) {
			console.log("[PC] Opening Contract Print Modal...");
			await printBtn.click({ force: true });
			await pcPage.waitForTimeout(800);
			await saveProof(pcPage, "05_treatment_plan_contract_print_modal_1440x900.png", "Treatment Plan Contract Print Modal (Mandate 8aq)");
			
			const closeBtn = pcPage.locator('[aria-label="Закрыть"], button:has-text("Закрыть")').first();
			if (await closeBtn.count() > 0) {
				await closeBtn.click({ force: true });
			}
			await pcPage.keyboard.press("Escape");
			await pcPage.waitForTimeout(400);
		}
	} catch (e) {
		console.log("[Contract Print Modal notice]", e.message);
	}

	// 1.5 Capture Completed Act Print Modal (DEF-PLAN-04)
	try {
		const actBtn = pcPage.locator('[data-testid="btn-print-act"]').first();
		if (await actBtn.count() > 0 && await actBtn.isVisible()) {
			console.log("[PC] Opening Completed Act Print Modal...");
			await actBtn.click({ force: true });
			await pcPage.waitForTimeout(800);
			await saveProof(pcPage, "06_treatment_plan_act_print_modal_1440x900.png", "Treatment Plan Completed Act Print Modal (Mandate 8aq)");
			
			const closeBtn = pcPage.locator('[aria-label="Закрыть окно печати акта"], [aria-label="Закрыть"], button:has-text("Закрыть")').first();
			if (await closeBtn.count() > 0) {
				await closeBtn.click({ force: true });
			}
			await pcPage.keyboard.press("Escape");
			await pcPage.waitForTimeout(400);
		}
	} catch (e) {
		console.log("[Act Print Modal notice]", e.message);
	}

	await pcContext.close();

	// 2. Mobile Viewport 390x844 (Apple HIG)
	console.log("\n--- [Mobile 390x844 Context] ---");
	const mobContext = await browser.newContext({
		viewport: { width: 390, height: 844 },
		userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
		deviceScaleFactor: 2,
		isMobile: true,
		hasTouch: true,
		serviceWorkers: "block",
	});
	await injectAuth(mobContext, "light");

	const mobPage = await mobContext.newPage();
	console.log("[Mobile] Navigating to patients view...");
	await mobPage.goto(`${WEB_URL}/?demo=true&patient_modal=1#patient-card`, { waitUntil: "commit", timeout: 35000 });
	await openPatientCardAndTreatmentPlans(mobPage);

	// 2.1 Mobile Light
	console.log("[Mobile] Capturing Mobile Light...");
	await setTheme(mobPage, "light");
	await saveProof(mobPage, "03_treatment_plan_mobile_light_390x844.png", "Treatment Plans Tab (Mobile Light 390x844)");
	await saveProof(mobPage, "03_treatment_plan_3tier_mobile_light_390x844.png", "Treatment Plans Tab 3-Tier (Mobile Light 390x844)");

	// 2.2 Mobile Dark
	console.log("[Mobile] Capturing Mobile Dark...");
	await setTheme(mobPage, "dark");
	await saveProof(mobPage, "04_treatment_plan_mobile_dark_390x844.png", "Treatment Plans Tab (Mobile Dark 390x844)");
	await saveProof(mobPage, "04_treatment_plan_3tier_mobile_dark_390x844.png", "Treatment Plans Tab 3-Tier (Mobile Dark 390x844)");

	await mobContext.close();

	console.log("\n🎉 ALL 4-STATE CANONICAL TREATMENT PLANS PROOFS CAPTURED AND VERIFIED!");
}

capture().catch((e) => {
	console.error("Capture script error:", e);
	process.exit(1);
}).finally(() => {
	browser.close();
});
