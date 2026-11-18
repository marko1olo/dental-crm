import fs, { existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const DIRS = [
	path.join(process.cwd(), "docs/screenshots/cashbox"),
	path.join(process.cwd(), "docs/proofs/cashbox"),
];

for (const dir of DIRS) {
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}
}

async function saveProof(buf, filename) {
	for (const dir of DIRS) {
		const target = path.join(dir, filename);
		fs.writeFileSync(target, buf);
		const size = statSync(target).size;
		if (size < 20480) {
			throw new Error(`[BYTE GUARD FAIL] ${filename} is ${size} bytes (< 20KB)!`);
		}
		console.log(`[PROOF SAVED] ${filename} -> ${target} (${Math.round(size / 1024)} KB)`);
	}
}

const browser = await chromium.launch({
	headless: true,
	args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
});

// =========================================================================
// 1. PC CONTEXT (1440x900)
// =========================================================================
console.log("=== 1. Starting PC Context (1440x900) ===");
const pcContext = await browser.newContext({
	viewport: { width: 1440, height: 900 },
	locale: "ru-RU",
});

await pcContext.addInitScript(() => {
	try {
		sessionStorage.setItem("dente:sw-controller-reload", "1");
		sessionStorage.setItem("dente_unlocked", "true");
		localStorage.setItem("dente_demo_showcase", "true");
		localStorage.setItem("dente_demo_mode", "true");
		localStorage.setItem("dente_offline_mode", "true");
		localStorage.setItem("dente_clinic_token", "demo_clinic_token");
		localStorage.setItem("dente_staff_token", "demo_staff_token");
		localStorage.setItem("dente_active_session_token", "demo_staff_token");
		localStorage.setItem("dente_organization_id", "org-demo-1");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_tour_dismissed", "true");
		localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
		localStorage.setItem("dente_active_role", "cashier");
		localStorage.setItem("dente_user_role", "cashier");
		localStorage.setItem("dente_role", "cashier");
		localStorage.setItem("dental-crm:active-user:v1", JSON.stringify({ id: "demo-cashier", fullName: "Кассир Воронова С. Н.", role: "cashier" }));
		localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true }));
	} catch (_) {}
});

const pcPage = await pcContext.newPage();
const targetUrl = "http://127.0.0.1:5173/?stand=cashbox&checkout=1#checkout";
console.log("[PC NAV] Navigating to", targetUrl);

await pcPage.goto(targetUrl, {
	waitUntil: "commit",
	timeout: 30000,
});

await pcPage.waitForSelector(".boot-state", { state: "detached", timeout: 20000 }).catch(() => {});

// Wait for checkout modal or trigger via custom event if needed
try {
	await pcPage.waitForSelector('[data-testid="cash-register-checkout-modal"], [data-testid="cash-register-studio-modal"]', { state: "visible", timeout: 8000 });
} catch (e) {
	console.log("Dispatching dente:open-cashbox event...");
	await pcPage.evaluate(() => {
		window.dispatchEvent(new CustomEvent("dente:open-cashbox", {
			detail: {
				mode: "checkout",
				patientId: "pat-1",
				patientName: "Иванов Иван Иванович",
				patientPhone: "+7 (999) 123-45-67",
				patientAllergies: "Новокаин",
				doctorFullName: "Д-р Воронов А. В.",
				serviceTitle: "Лечение глубокого кариеса 16, анестезия, пломба светового отверждения",
				amountRub: 5400,
				patientDepositRub: 1200,
				patientFamilyBalanceRub: 3500,
				cashierFullName: "Кассир Воронова С. Н.",
			}
		}));
	});
	await pcPage.waitForSelector('[data-testid="cash-register-checkout-modal"], [data-testid="cash-register-studio-modal"]', { state: "visible", timeout: 20000 });
}

// Hide overlays
await pcPage.addStyleTag({
	content: `
		.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone,
		.coachmark-tooltip-container, .guide-tour-floating-launcher, .clinical-quest-modal,
		[data-testid="interactive-guide-tour-card"], [data-testid="clinical-quest-banner"],
		.notification-toast, .global-toast, .toast-container, [data-toast], vite-error-overlay {
			display: none !important;
			pointer-events: none !important;
		}
	`,
}).catch(() => {});

// 1. PC Light
console.log("[1/4] Capturing PC Light (1440x900)...");
await pcPage.evaluate(() => {
	document.documentElement.setAttribute("data-theme", "light");
	document.documentElement.classList.remove("dark");
	document.documentElement.classList.add("light");
	document.documentElement.style.colorScheme = "light";
	document.body.setAttribute("data-theme", "light");
	document.body.classList.remove("dark");
	document.body.classList.add("light");
	localStorage.setItem("dente_theme", "light");
});
await pcPage.waitForTimeout(800);
const pcLightBuf = await pcPage.screenshot({ fullPage: false, animations: "disabled", timeout: 15000 });
await saveProof(pcLightBuf, "01_cashbox_studio_pc_light_1440x900.png");

// 2. PC Dark
console.log("[2/4] Capturing PC Dark (1440x900)...");
await pcPage.evaluate(() => {
	document.documentElement.setAttribute("data-theme", "dark");
	document.documentElement.classList.remove("light");
	document.documentElement.classList.add("dark");
	document.documentElement.style.colorScheme = "dark";
	document.body.setAttribute("data-theme", "dark");
	document.body.classList.remove("light");
	document.body.classList.add("dark");
	localStorage.setItem("dente_theme", "dark");
});
await pcPage.waitForTimeout(800);
const pcDarkBuf = await pcPage.screenshot({ fullPage: false, animations: "disabled", timeout: 15000 });
await saveProof(pcDarkBuf, "02_cashbox_studio_pc_dark_1440x900.png");

await pcContext.close();

// =========================================================================
// 2. MOBILE CONTEXT (390x844 Apple HIG)
// =========================================================================
console.log("=== 2. Starting Mobile Context (390x844 Apple HIG) ===");
const mobContext = await browser.newContext({
	viewport: { width: 390, height: 844 },
	deviceScaleFactor: 2,
	isMobile: true,
	hasTouch: true,
	locale: "ru-RU",
});

await mobContext.addInitScript(() => {
	try {
		sessionStorage.setItem("dente:sw-controller-reload", "1");
		sessionStorage.setItem("dente_unlocked", "true");
		localStorage.setItem("dente_demo_showcase", "true");
		localStorage.setItem("dente_demo_mode", "true");
		localStorage.setItem("dente_offline_mode", "true");
		localStorage.setItem("dente_clinic_token", "demo_clinic_token");
		localStorage.setItem("dente_staff_token", "demo_staff_token");
		localStorage.setItem("dente_active_session_token", "demo_staff_token");
		localStorage.setItem("dente_organization_id", "org-demo-1");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_tour_dismissed", "true");
		localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
		localStorage.setItem("dente_active_role", "cashier");
		localStorage.setItem("dente_user_role", "cashier");
		localStorage.setItem("dente_role", "cashier");
		localStorage.setItem("dental-crm:active-user:v1", JSON.stringify({ id: "demo-cashier", fullName: "Кассир Воронова С. Н.", role: "cashier" }));
		localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true }));
	} catch (_) {}
});

const mobPage = await mobContext.newPage();
console.log("[MOB NAV] Navigating to", targetUrl);

await mobPage.goto(targetUrl, {
	waitUntil: "commit",
	timeout: 30000,
});

await mobPage.waitForSelector(".boot-state", { state: "detached", timeout: 20000 }).catch(() => {});

try {
	await mobPage.waitForSelector('[data-testid="cash-register-checkout-modal"], [data-testid="cash-register-studio-modal"]', { state: "visible", timeout: 8000 });
} catch (e) {
	console.log("Dispatching dente:open-cashbox on mobile...");
	await mobPage.evaluate(() => {
		window.dispatchEvent(new CustomEvent("dente:open-cashbox", {
			detail: {
				mode: "checkout",
				patientId: "pat-1",
				patientName: "Иванов Иван Иванович",
				patientPhone: "+7 (999) 123-45-67",
				patientAllergies: "Новокаин",
				doctorFullName: "Д-р Воронов А. В.",
				serviceTitle: "Лечение глубокого кариеса 16, анестезия, пломба светового отверждения",
				amountRub: 5400,
				patientDepositRub: 1200,
				patientFamilyBalanceRub: 3500,
				cashierFullName: "Кассир Воронова С. Н.",
			}
		}));
	});
	await mobPage.waitForSelector('[data-testid="cash-register-checkout-modal"], [data-testid="cash-register-studio-modal"]', { state: "visible", timeout: 20000 });
}

await mobPage.addStyleTag({
	content: `
		.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone,
		.coachmark-tooltip-container, .guide-tour-floating-launcher, .clinical-quest-modal,
		[data-testid="interactive-guide-tour-card"], [data-testid="clinical-quest-banner"],
		.notification-toast, .global-toast, .toast-container, [data-toast], vite-error-overlay {
			display: none !important;
			pointer-events: none !important;
		}
	`,
}).catch(() => {});

// 3. Mobile Light
console.log("[3/4] Capturing Mobile Light (390x844)...");
await mobPage.evaluate(() => {
	document.documentElement.setAttribute("data-theme", "light");
	document.documentElement.classList.remove("dark");
	document.documentElement.classList.add("light");
	document.documentElement.style.colorScheme = "light";
	document.body.setAttribute("data-theme", "light");
	document.body.classList.remove("dark");
	document.body.classList.add("light");
	localStorage.setItem("dente_theme", "light");
});
await mobPage.waitForTimeout(800);
const mobLightBuf = await mobPage.screenshot({ fullPage: false, animations: "disabled", timeout: 15000 });
await saveProof(mobLightBuf, "03_cashbox_studio_mobile_light_390x844.png");

// 4. Mobile Dark
console.log("[4/4] Capturing Mobile Dark (390x844)...");
await mobPage.evaluate(() => {
	document.documentElement.setAttribute("data-theme", "dark");
	document.documentElement.classList.remove("light");
	document.documentElement.classList.add("dark");
	document.documentElement.style.colorScheme = "dark";
	document.body.setAttribute("data-theme", "dark");
	document.body.classList.remove("light");
	document.body.classList.add("dark");
	localStorage.setItem("dente_theme", "dark");
});
await mobPage.waitForTimeout(800);
const mobDarkBuf = await mobPage.screenshot({ fullPage: false, animations: "disabled", timeout: 15000 });
await saveProof(mobDarkBuf, "04_cashbox_studio_mobile_dark_390x844.png");

await mobContext.close();
await browser.close();

console.log("\n[VICTORY] All 4-State Cashbox Proofs captured successfully!");
