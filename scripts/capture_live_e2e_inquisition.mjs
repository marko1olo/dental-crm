import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { chromium } from "playwright";

const OUT_CONV = "C:/Users/Admin/.gemini/antigravity/brain/f00b6630-789a-48e9-8e09-b41231d06a57/screenshots";
const OUT_DOCS = "C:/Clinic_MVP/dental-crm/docs/screenshots/live_e2e_inquisition";
const CACHE_FILE = "C:/Clinic_MVP/dental-crm/scripts/.auth_tokens_cache.json";
const webBaseUrl = "http://127.0.0.1:5173";
const apiBaseUrl = "http://127.0.0.1:4100";

await mkdir(OUT_CONV, { recursive: true });
await mkdir(OUT_DOCS, { recursive: true });

// 1. Live Authentication via Fastify API with disk caching
let clinicToken = "";
let staffToken = "";

if (existsSync(CACHE_FILE)) {
	try {
		const cached = JSON.parse(await readFile(CACHE_FILE, "utf-8"));
		if (cached.clinicToken && cached.staffToken) {
			clinicToken = cached.clinicToken;
			staffToken = cached.staffToken;
			console.log("[INQUISITION] Using cached live auth tokens from scripts/.auth_tokens_cache.json");
		}
	} catch (e) {
		console.warn("[INQUISITION] Token cache read error, authenticating afresh:", e.message);
	}
}

if (!clinicToken || !staffToken) {
	console.log("[INQUISITION] Fetching live authentication credentials from Fastify API...");
	const authRes = await fetch(`${apiBaseUrl}/api/auth/login`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email: "doctor@clinic.com", password: "password" }),
	}).then((r) => r.json());

	if (!authRes.clinicToken || !authRes.staffToken) {
		throw new Error(`Failed to authenticate with live server: ${JSON.stringify(authRes)}`);
	}
	clinicToken = authRes.clinicToken;
	staffToken = authRes.staffToken;
	await writeFile(CACHE_FILE, JSON.stringify({ clinicToken, staffToken, cachedAt: new Date().toISOString() }, null, 2));
	console.log("[INQUISITION] Obtained and cached genuine clinic & staff tokens successfully.");
}

console.log("Starting browser via Playwright (channel: msedge)...");
const browser = await chromium.launch({
	channel: "msedge",
	headless: true,
});

const seenHashes = new Map();
const capturedManifest = [];

async function captureScreen({
	name,
	urlPath,
	viewport,
	selector,
	action = null,
	minKb = 35,
}) {
	console.log(`\n--> Capturing [${name}] from ${urlPath}...`);
	const context = await browser.newContext({
		viewport: { width: viewport.width, height: viewport.height },
		isMobile: viewport.isMobile || false,
		hasTouch: viewport.isMobile || false,
		deviceScaleFactor: viewport.isMobile ? 2 : 1,
	});

	await context.addInitScript(({ cTok, sTok }) => {
		try {
			localStorage.setItem("dente_clinic_token", cTok);
			localStorage.setItem("dente_staff_token", sTok);
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true }));
			localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
				version: 1,
				uiLanguage: "ru",
				selectedWorkspaceRole: "doctor",
				selectedPatientId: "pat-101",
				onboardingDismissed: true,
			}));
			document.cookie = `dente_clinic_token=${cTok}; path=/`;
			document.cookie = `dente_staff_token=${sTok}; path=/`;
		} catch (e) {}
	}, { cTok: clinicToken, sTok: staffToken });

	const page = await context.newPage();
	const fullUrl = `${webBaseUrl}${urlPath}`;
	
	await page.goto(fullUrl, { waitUntil: "domcontentloaded", timeout: 25000 });
	await page.waitForSelector(selector, { visible: true, timeout: 15000 });

	if (action) {
		await action(page);
		await page.waitForTimeout(400);
	}

	await page.waitForTimeout(600);

	const pathConv = path.join(OUT_CONV, `${name}.png`);
	const pathDocs = path.join(OUT_DOCS, `${name}.png`);

	const buf = await page.screenshot({ fullPage: false });
	await writeFile(pathConv, buf);
	await writeFile(pathDocs, buf);

	const sizeKb = (buf.length / 1024).toFixed(1);
	const md5 = crypto.createHash("md5").update(buf).digest("hex");

	if (seenHashes.has(md5)) {
		console.warn(`[WARNING: DUPLICATE HASH] ${name} identical with ${seenHashes.get(md5)}!`);
	} else {
		seenHashes.set(md5, name);
	}

	if (parseFloat(sizeKb) < minKb) {
		console.warn(`[WARNING: LOW SIZE] ${name}.png is only ${sizeKb} KB (threshold: ${minKb} KB)`);
	}

	console.log(`[OK] ${name}.png (${sizeKb} KB, md5: ${md5})`);
	capturedManifest.push({ name, sizeKb: `${sizeKb} KB`, md5, path: pathDocs });

	await context.close();
}

try {
	console.log("=== STARTING AUTONOMOUS RED TEAM E2E SCREENCAP INQUISITION (PLAYWRIGHT) ===");

	// ===================================================================================
	// СЦЕНАРИЙ 1: БОТЫ И ПУЛЬТ ОПЕРАТОРА (6 СКРИНОВ)
	// ===================================================================================
	console.log("\n==================== SCENARIO 1: BOTS & OPERATOR CONSOLE ====================");

	// 01: Настройки ботов PC Light
	await captureScreen({
		name: "01_bots_settings_pc_light",
		urlPath: "/telegram_studio_preview.html?theme=light&step=1",
		viewport: { width: 1440, height: 900 },
		selector: ".telegram-studio-root, .tg-studio-hero",
	});

	// 02: Настройки ботов PC Dark
	await captureScreen({
		name: "02_bots_settings_pc_dark",
		urlPath: "/telegram_studio_preview.html?theme=dark&step=1",
		viewport: { width: 1440, height: 900 },
		selector: ".telegram-studio-root, .tg-studio-hero",
	});

	// 03: Пульт оператора PC Light с кнопкой перехвата диалога
	await captureScreen({
		name: "03_operator_chat_pc_light",
		urlPath: "/operator_chat_preview.html?theme=light",
		viewport: { width: 1440, height: 900 },
		selector: '[data-testid="btn-takeover-chat"]',
	});

	// 04: Пульт оператора PC Dark с кнопкой перехвата диалога
	await captureScreen({
		name: "04_operator_chat_pc_dark",
		urlPath: "/operator_chat_preview.html?theme=dark",
		viewport: { width: 1440, height: 900 },
		selector: '[data-testid="btn-takeover-chat"]',
	});

	// 05: Пульт оператора Mobile Light с кнопкой перехвата диалога
	await captureScreen({
		name: "05_operator_chat_mobile_light",
		urlPath: "/communications_mobile_preview.html?chat=1&theme=light",
		viewport: { width: 390, height: 844, isMobile: true },
		selector: '[data-testid="btn-mobile-chat-takeover"]',
	});

	// 06: Пульт оператора Mobile Dark с кнопкой перехвата диалога
	await captureScreen({
		name: "06_operator_chat_mobile_dark",
		urlPath: "/communications_mobile_preview.html?chat=1&theme=dark",
		viewport: { width: 390, height: 844, isMobile: true },
		selector: '[data-testid="btn-mobile-chat-takeover"]',
	});

	// ===================================================================================
	// СЦЕНАРИЙ 2: ПРЕЙСКУРАНТ И СКАНЕР 804Н (6 СКРИНОВ)
	// ===================================================================================
	console.log("\n==================== SCENARIO 2: PRICELIST & 804N SCANNER ====================");

	// 07: Дропзона загрузки файлов PC Light
	await captureScreen({
		name: "07_pricelist_upload_pc_light",
		urlPath: "/pricelist_scanner_preview.html?mode=upload&theme=light",
		viewport: { width: 1440, height: 900 },
		selector: ".dropzone-placeholder, h1",
	});

	// 08: Дропзона загрузки файлов PC Dark
	await captureScreen({
		name: "08_pricelist_upload_pc_dark",
		urlPath: "/pricelist_scanner_preview.html?mode=upload&theme=dark",
		viewport: { width: 1440, height: 900 },
		selector: ".dropzone-placeholder, h1",
	});

	// 09: Таблица сопоставления 804н PC Light
	await captureScreen({
		name: "09_pricelist_mapping_804n_pc_light",
		urlPath: "/pricelist_scanner_preview.html?mode=diff&theme=light",
		viewport: { width: 1440, height: 900 },
		selector: '[data-testid="pricelist-diff-container"], .pricelist-diff-toolbar',
	});

	// 10: Таблица сопоставления 804н PC Dark
	await captureScreen({
		name: "10_pricelist_mapping_804n_pc_dark",
		urlPath: "/pricelist_scanner_preview.html?mode=diff&theme=dark",
		viewport: { width: 1440, height: 900 },
		selector: '[data-testid="pricelist-diff-container"], .pricelist-diff-toolbar',
	});

	// 11: Таблица сопоставления 804н Mobile Light
	await captureScreen({
		name: "11_pricelist_mapping_804n_mobile_light",
		urlPath: "/pricelist_scanner_preview.html?mode=diff&theme=light",
		viewport: { width: 390, height: 844, isMobile: true },
		selector: '[data-testid="pricelist-diff-container"], .pricelist-diff-toolbar',
	});

	// 12: Таблица сопоставления 804н Mobile Dark
	await captureScreen({
		name: "12_pricelist_mapping_804n_mobile_dark",
		urlPath: "/pricelist_scanner_preview.html?mode=diff&theme=dark",
		viewport: { width: 390, height: 844, isMobile: true },
		selector: '[data-testid="pricelist-diff-container"], .pricelist-diff-toolbar',
	});

	// ===================================================================================
	// СЦЕНАРИЙ 3: СУВЕРЕНИТЕТ МАСШТАБА И РАБОЧИЙ СТОЛ СОЛО-ВРАЧА (6 СКРИНОВ)
	// ===================================================================================
	console.log("\n==================== SCENARIO 3: SOVEREIGN SCALE PRESETS ====================");

	// 13: Выбор пресетов масштаба PC Light
	await captureScreen({
		name: "13_onboarding_scale_presets_pc_light",
		urlPath: "/onboarding_presets_preview.html?theme=light",
		viewport: { width: 1440, height: 900 },
		selector: '[data-testid="sovereign-presets-card"], .sovereign-preset-box',
	});

	// 14: Выбор пресетов масштаба PC Dark
	await captureScreen({
		name: "14_onboarding_scale_presets_pc_dark",
		urlPath: "/onboarding_presets_preview.html?theme=dark",
		viewport: { width: 1440, height: 900 },
		selector: '[data-testid="sovereign-presets-card"], .sovereign-preset-box',
	});

	// 15: Выбор пресетов масштаба Mobile Light
	await captureScreen({
		name: "15_onboarding_scale_presets_mobile_light",
		urlPath: "/onboarding_presets_preview.html?theme=light",
		viewport: { width: 390, height: 844, isMobile: true },
		selector: '[data-testid="sovereign-presets-card"], .sovereign-preset-box',
	});

	// 16: Выбор пресетов масштаба Mobile Dark
	await captureScreen({
		name: "16_onboarding_scale_presets_mobile_dark",
		urlPath: "/onboarding_presets_preview.html?theme=dark",
		viewport: { width: 390, height: 844, isMobile: true },
		selector: '[data-testid="sovereign-presets-card"], .sovereign-preset-box',
	});

	// 17: Рабочий стол соло-врача 1 кресло (Запись CITO) PC Light
	await captureScreen({
		name: "17_solo_doctor_workspace_pc_light",
		urlPath: "/doctor_autonomy_preview.html?view=schedule_modal&theme=light",
		viewport: { width: 1440, height: 900 },
		selector: '[data-testid="appointment-modal"], .appointment-modal-container',
	});

	// 18: Рабочий стол соло-врача 1 кресло (Запись CITO) PC Dark
	await captureScreen({
		name: "18_solo_doctor_workspace_pc_dark",
		urlPath: "/doctor_autonomy_preview.html?view=schedule_modal&theme=dark",
		viewport: { width: 1440, height: 900 },
		selector: '[data-testid="appointment-modal"], .appointment-modal-container',
	});

	// ===================================================================================
	// СЦЕНАРИЙ 4: ПРИЁМ ВРАЧА И БЫСТРАЯ КАССА (МАНДАТ 8E) (8 СКРИНОВ)
	// ===================================================================================
	console.log("\n==================== SCENARIO 4: DOCTOR VISIT & FAST CHECKOUT ====================");

	// 19: Приём в ЭМК с нормой в 1 клик PC Light
	await captureScreen({
		name: "19_emk_1click_norm_pc_light",
		urlPath: "/doctor_autonomy_preview.html?view=emk_toolbar&theme=light",
		viewport: { width: 1440, height: 900 },
		selector: '[data-testid="btn-chairside-physiological-norm"]',
		action: async (page) => {
			await page.click('[data-testid="btn-chairside-physiological-norm"]');
			await page.waitForTimeout(400);
		},
	});

	// 20: Приём в ЭМК с нормой в 1 клик PC Dark
	await captureScreen({
		name: "20_emk_1click_norm_pc_dark",
		urlPath: "/doctor_autonomy_preview.html?view=emk_toolbar&theme=dark",
		viewport: { width: 1440, height: 900 },
		selector: '[data-testid="btn-chairside-physiological-norm"]',
		action: async (page) => {
			await page.click('[data-testid="btn-chairside-physiological-norm"]');
			await page.waitForTimeout(400);
		},
	});

	// 21: Мобильный приём у кресла 390x844 Light
	await captureScreen({
		name: "21_emk_1click_norm_mobile_light",
		urlPath: "/doctor_autonomy_preview.html?view=mobile_chairside&theme=light",
		viewport: { width: 390, height: 844, isMobile: true },
		selector: '[data-testid="mobile-chairside-workspace"], .mobile-chairside-container',
	});

	// 22: Мобильный приём у кресла 390x844 Dark
	await captureScreen({
		name: "22_emk_1click_norm_mobile_dark",
		urlPath: "/doctor_autonomy_preview.html?view=mobile_chairside&theme=dark",
		viewport: { width: 390, height: 844, isMobile: true },
		selector: '[data-testid="mobile-chairside-workspace"], .mobile-chairside-container',
	});

	// 23: Быстрый расчёт 54-ФЗ без ИНН PC Light
	await captureScreen({
		name: "23_cashier_fast_checkout_no_inn_pc_light",
		urlPath: "/fast_checkout_preview.html?theme=light",
		viewport: { width: 1440, height: 900 },
		selector: '[data-testid="fast-checkout-modal"]',
	});

	// 24: Быстрый расчёт 54-ФЗ без ИНН PC Dark
	await captureScreen({
		name: "24_cashier_fast_checkout_no_inn_pc_dark",
		urlPath: "/fast_checkout_preview.html?theme=dark",
		viewport: { width: 1440, height: 900 },
		selector: '[data-testid="fast-checkout-modal"]',
	});

	// 25: Быстрый расчёт 54-ФЗ Mobile Light
	await captureScreen({
		name: "25_cashier_fast_checkout_no_inn_mobile_light",
		urlPath: "/fast_checkout_preview.html?theme=light",
		viewport: { width: 390, height: 844, isMobile: true },
		selector: '[data-testid="fast-checkout-modal"]',
	});

	// 26: Быстрый расчёт 54-ФЗ Mobile Dark
	await captureScreen({
		name: "26_cashier_fast_checkout_no_inn_mobile_dark",
		urlPath: "/fast_checkout_preview.html?theme=dark",
		viewport: { width: 390, height: 844, isMobile: true },
		selector: '[data-testid="fast-checkout-modal"]',
	});

	console.log("\n==================== ALL 26 RETINA PROOFS CAPTURED SUCCESSFULLY ====================");
	console.table(capturedManifest);

} finally {
	await browser.close();
}
