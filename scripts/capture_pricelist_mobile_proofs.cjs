/**
 * scripts/capture_pricelist_mobile_proofs.cjs
 *
 * Captures mobile proofs for the native 804n pricelist scanner dropzone and diff view:
 * - proof_pricelist_dropzone_mobile_light.png (390x844)
 * - proof_pricelist_dropzone_mobile_dark.png (390x844)
 * - proof_pricelist_diff_mobile_dark.png (390x844)
 * - proof_pricelist_diff_mobile_light.png (390x844)
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const sampleServices = [
	{
		id: "srv-1",
		code: "A01.07.001",
		title: "Прием (осмотр, консультация) врача-стоматолога первичный",
		category: "therapy",
		specialty: "therapist",
		basePriceRub: 1500,
		priceRub: 1500,
		durationMinutes: 30,
		taxDeductible: true,
		vatRate: "vat_exempt",
		active: true,
	},
	{
		id: "srv-2",
		code: "A16.07.002",
		title: "Восстановление зуба пломбой (лечение среднего кариеса)",
		category: "therapy",
		specialty: "therapist",
		basePriceRub: 4500,
		priceRub: 4500,
		durationMinutes: 45,
		taxDeductible: true,
		vatRate: "vat_exempt",
		active: true,
	},
];

const mockDashboard = {
	clinicName: "Стоматология ДЕНТЕ Премиум",
	todayIso: new Date().toISOString().slice(0, 10),
	clinicSettings: {
		profile: {
			id: "c-1",
			clinicName: "Стоматология ДЕНТЕ Премиум",
			mode: "small_clinic",
			defaultVisitMinutes: 45,
			timezone: "Europe/Moscow",
		},
		staff: [
			{
				id: "doc-1",
				fullName: "Д-р Воронов Алексей Владимирович",
				role: "owner",
				specialties: ["therapist"],
				phone: "+7 (999) 111-22-33",
				active: true,
				color: "#0d9488",
			},
		],
		chairs: [
			{
				id: "chair-1",
				name: "Кабинет 1",
				room: "1",
				active: true,
			},
		],
	},
	serviceCatalog: sampleServices,
	patients: [],
	appointments: [],
	payments: [],
};

const mockScannerProposals = [
	{
		id: "prop-1",
		sourceLineNumber: 1,
		rawLine: "1. Консультация стоматолога-терапевта первичная — 1500 руб",
		cleanedTitle: "Консультация стоматолога-терапевта первичная",
		code804n: "A01.07.001",
		statutoryTitle804n: "Прием (осмотр, консультация) врача-стоматолога первичный",
		category: "therapy",
		specialty: "therapist",
		priceRub: 1500,
		priceKopecks: 150000,
		confidence: 0.98,
		confidenceKind: "exact_code",
		suggestedAction: "update_existing",
		matchedExistingServiceId: "srv-1",
		matchedExistingTitle: "Прием (осмотр, консультация) врача-стоматолога первичный",
		matchedExistingPriceRub: 1500,
		isApproved: true,
	},
	{
		id: "prop-2",
		sourceLineNumber: 2,
		rawLine: "2. Восстановление зуба пломбой светового отверждения — 5200 руб",
		cleanedTitle: "Восстановление зуба пломбой светового отверждения",
		code804n: "A16.07.002",
		statutoryTitle804n: "Восстановление зуба пломбой (лечение среднего кариеса)",
		category: "therapy",
		specialty: "therapist",
		priceRub: 5200,
		priceKopecks: 520000,
		confidence: 0.95,
		confidenceKind: "high_keyword",
		suggestedAction: "update_existing",
		matchedExistingServiceId: "srv-2",
		matchedExistingTitle: "Восстановление зуба пломбой (лечение среднего кариеса)",
		matchedExistingPriceRub: 4500,
		isApproved: true,
	},
	{
		id: "prop-3",
		sourceLineNumber: 3,
		rawLine: "3. Профгигиена полости рта ультразвук + AirFlow — 6000 руб",
		cleanedTitle: "Профгигиена полости рта ультразвук + AirFlow",
		code804n: "A16.07.051",
		statutoryTitle804n: "Профессиональная гигиена полости рта и зубов",
		category: "hygiene",
		specialty: "hygienist",
		priceRub: 6000,
		priceKopecks: 600000,
		confidence: 0.92,
		confidenceKind: "high_keyword",
		suggestedAction: "create_new",
		isApproved: true,
	},
	{
		id: "prop-4",
		sourceLineNumber: 4,
		rawLine: "4. Внутрикостная дентальная имплантация Osstem (хирургический этап) — 38000 руб",
		cleanedTitle: "Внутрикостная дентальная имплантация Osstem (хирургический этап)",
		code804n: "A16.07.054",
		statutoryTitle804n: "Внутрикостная дентальная имплантация",
		category: "surgery",
		specialty: "surgeon",
		priceRub: 38000,
		priceKopecks: 3800000,
		confidence: 0.99,
		confidenceKind: "exact_code",
		suggestedAction: "create_new",
		isApproved: true,
	},
	{
		id: "prop-5",
		sourceLineNumber: 5,
		rawLine: "5. Протезирование зуба коронкой из диоксида циркония — 26000 руб",
		cleanedTitle: "Протезирование зуба коронкой из диоксида циркония",
		code804n: "A16.07.006",
		statutoryTitle804n: "Протезирование зуба с использованием имплантата / коронки",
		category: "orthopedics",
		specialty: "orthopedist",
		priceRub: 26000,
		priceKopecks: 2600000,
		confidence: 0.91,
		confidenceKind: "high_keyword",
		suggestedAction: "create_new",
		isApproved: true,
	},
];

async function main() {
	const outDir = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/inquisition_live");
	const parentBrainDir = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/beb92312-c6d7-426d-a438-12dcad022abc");
	const localBrainDir = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/3b5af022-72c2-4f58-9add-37bf21cbfb9d");

	function saveAndCopy(sourceFile, fileName) {
		const dest1 = path.join(parentBrainDir, fileName);
		const dest2 = path.join(localBrainDir, fileName);
		fs.copyFileSync(sourceFile, dest1);
		fs.copyFileSync(sourceFile, dest2);
		console.log(`[Saved] ${fileName} -> docs & brain dirs`);
	}

	console.log("[Playwright] Launching Chrome in iPhone Viewport (390x844)...");
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	const context = await browser.newContext({
		viewport: { width: 390, height: 844 },
		deviceScaleFactor: 2,
		isMobile: true,
		hasTouch: true,
		userAgent:
			"Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
	});

	const page = await context.newPage();

	// Intercept API routes
	await page.route("**/api/**", async (route) => {
		const url = route.request().url();
		if (url.includes("/src/")) return route.continue();
		if (url.includes("/api/dashboard")) {
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(mockDashboard),
			});
		}
		if (url.includes("/api/auth/user/me") || url.includes("/api/auth/session")) {
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					user: {
						id: "doc-1",
						fullName: "Д-р Воронов Алексей Владимирович",
						role: "owner",
						organizationId: "00000000-0000-0000-0000-000000000001",
					},
					clinicToken: "live-inquisition-clinic-token",
					staffToken: "live-inquisition-staff-token",
				}),
			});
		}
		if (url.includes("/api/pricelist/scan-and-import")) {
			const postData = route.request().postDataJSON() || {};
			const responseObj = {
				success: true,
				fileName: "Pricelist_Import.txt",
				totalRawLines: 5,
				parsedItemsCount: 5,
				matched804nCount: 5,
				collisionStrategy: postData.collisionStrategy || "update_existing",
				committedCount: postData.commit ? 5 : 0,
				items: mockScannerProposals,
				scanResult: {
					success: true,
					fileName: "Pricelist_Import.txt",
					items: mockScannerProposals,
					summary: {
						exactMatchesCount: 1,
						highConfidenceCount: 4,
						mediumConfidenceCount: 0,
						lowConfidenceCount: 0,
						createNewCount: 2,
						updateExistingCount: 3,
						identicalCount: 0,
						averageConfidence: 0.95,
					},
				},
				summary: {
					exactMatchesCount: 1,
					highConfidenceCount: 4,
					mediumConfidenceCount: 0,
					lowConfidenceCount: 0,
					createNewCount: 2,
					updateExistingCount: 3,
					identicalCount: 0,
					averageConfidence: 0.95,
				},
			};
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(responseObj),
			});
		}
		return route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({ ok: true }),
		});
	});

	await page.addInitScript(() => {
		localStorage.setItem("dente_clinic_token", "live-inquisition-clinic-token");
		localStorage.setItem("dente_staff_token", "live-inquisition-staff-token");
		localStorage.setItem("dente_clinic_tenant_id", "org_dental_1");
		localStorage.setItem("dente_theme", "light");
		const prefs = {
			version: 1,
			onboardingDismissed: true,
			onboardingDismissedAt: new Date().toISOString(),
		};
		localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify(prefs));
		localStorage.setItem("dente_onboarding_dismissed", "true");
		localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
		localStorage.setItem("dente_guide_tour_seen_roles_v2", JSON.stringify(["admin", "doctor", "director"]));
	});

	console.log("[Mobile] Navigating to http://127.0.0.1:5173/#settings...");
	await page.goto("http://127.0.0.1:5173/#settings", { waitUntil: "domcontentloaded" });
	await wait(3500);

	await page.evaluate(() => {
		document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .interactive-guide-tour-card, [data-testid="interactive-guide-tour-card"]').forEach((el) => el.remove());
	});

	console.log("[Mobile] Finding prices_import row in settings...");
	await page.waitForSelector('[data-testid="mobile-settings-row-prices_import"]', { timeout: 15000 });
	await page.click('[data-testid="mobile-settings-row-prices_import"]', { force: true });
	await wait(1500);

	await page.evaluate(() => {
		document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"]').forEach((el) => el.remove());
	});

	console.log("[Mobile] Finding and clicking btn-native-pricelist-import...");
	await page.waitForSelector('[data-testid="btn-native-pricelist-import"]', { timeout: 15000 });
	await page.evaluate(() => {
		const btn = document.querySelector('[data-testid="btn-native-pricelist-import"]');
		if (btn) {
			btn.scrollIntoView({ block: 'center' });
			btn.click();
		}
	});
	await wait(1000);

	// Wait for dropzone banner
	console.log("[Mobile] Waiting for native-pricelist-dropzone-banner...");
	await page.waitForSelector('[data-testid="native-pricelist-dropzone-banner"]', { timeout: 10000 });

	// PROOF 5: Mobile Light - Dropzone
	console.log("[Proof 5] Capturing proof_pricelist_dropzone_mobile_light.png...");
	await page.evaluate(() => {
		document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .interactive-guide-tour-card, [data-testid="interactive-guide-tour-card"]').forEach((el) => el.remove());
		document.documentElement.setAttribute("data-theme", "light");
		document.documentElement.classList.remove("dark");
	});
	await wait(500);
	const mobileDropzoneLightPath = path.join(outDir, "proof_pricelist_dropzone_mobile_light.png");
	await page.screenshot({ path: mobileDropzoneLightPath });
	saveAndCopy(mobileDropzoneLightPath, "proof_pricelist_dropzone_mobile_light.png");

	// PROOF 6: Mobile Dark - Dropzone
	console.log("[Proof 6] Capturing proof_pricelist_dropzone_mobile_dark.png...");
	await page.evaluate(() => {
		document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .interactive-guide-tour-card, [data-testid="interactive-guide-tour-card"]').forEach((el) => el.remove());
		document.documentElement.setAttribute("data-theme", "dark");
		document.documentElement.classList.add("dark");
	});
	await wait(500);
	const mobileDropzoneDarkPath = path.join(outDir, "proof_pricelist_dropzone_mobile_dark.png");
	await page.screenshot({ path: mobileDropzoneDarkPath });
	saveAndCopy(mobileDropzoneDarkPath, "proof_pricelist_dropzone_mobile_dark.png");

	// NOW TRIGGER DIFF MODAL ON MOBILE
	console.log("[Mobile] Switching to text mode...");
	await page.evaluate(() => {
		const buttons = Array.from(document.querySelectorAll("button"));
		const textBtn = buttons.find((b) => b.textContent?.includes("Вставка текста"));
		if (textBtn) textBtn.click();
	});
	await wait(500);

	console.log("[Mobile] Filling textarea...");
	const sampleText = `1. Консультация стоматолога-терапевта первичная — 1500 руб\n2. Восстановление зуба пломбой светового отверждения — 5200 руб\n3. Профгигиена полости рта ультразвук + AirFlow — 6000 руб\n4. Внутрикостная дентальная имплантация Osstem (хирургический этап) — 38000 руб\n5. Протезирование зуба коронкой из диоксида циркония — 26000 руб`;
	await page.fill('[data-testid="native-pricelist-text-input"]', sampleText);
	await wait(300);

	console.log("[Mobile] Clicking 'Распознать и сопоставить с 804н'...");
	await page.evaluate(() => {
		const buttons = Array.from(document.querySelectorAll("button"));
		const scanBtn = buttons.find((b) => b.textContent?.includes("Распознать и сопоставить"));
		if (scanBtn) scanBtn.click();
	});
	await wait(1500);

	// Wait for mapping diff modal
	console.log("[Mobile] Waiting for PriceListMappingDiffView modal...");
	await page.waitForSelector('[data-testid="pricelist-diff-container"]', { timeout: 10000 });
	await wait(800);

	// PROOF 7: Mobile Dark - Mapping Diff
	console.log("[Proof 7] Capturing proof_pricelist_diff_mobile_dark.png...");
	await page.evaluate(() => {
		document.documentElement.setAttribute("data-theme", "dark");
		document.documentElement.classList.add("dark");
	});
	await wait(500);
	const mobileDiffDarkPath = path.join(outDir, "proof_pricelist_diff_mobile_dark.png");
	await page.screenshot({ path: mobileDiffDarkPath });
	saveAndCopy(mobileDiffDarkPath, "proof_pricelist_diff_mobile_dark.png");

	// PROOF 8: Mobile Light - Mapping Diff
	console.log("[Proof 8] Capturing proof_pricelist_diff_mobile_light.png...");
	await page.evaluate(() => {
		document.documentElement.setAttribute("data-theme", "light");
		document.documentElement.classList.remove("dark");
	});
	await wait(500);
	const mobileDiffLightPath = path.join(outDir, "proof_pricelist_diff_mobile_light.png");
	await page.screenshot({ path: mobileDiffLightPath });
	saveAndCopy(mobileDiffLightPath, "proof_pricelist_diff_mobile_light.png");

	await browser.close();
	console.log("[Playwright] All mobile proofs successfully captured!");
}

main().catch((err) => {
	console.error("[Playwright Failure]", err);
	process.exit(1);
});
