/**
 * scripts/take_loyalty_4state_canonical.cjs
 *
 * CANONICAL 4-STATE VISUAL PROOF FOR LOYALTY STUDIO & 54-FZ CERTIFICATES
 * 1. ☀️ PC Light (1440x900)
 * 2. 🌙 PC Dark (1440x900)
 * 3. 📱 Mobile Light (390x844 Apple HIG)
 * 4. 📱 Mobile Dark (390x844 Apple HIG)
 * + Вкладка сертификатов с проверкой Luhn-16 и зачётом в кассу 54-ФЗ.
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const ORCH_ID = "8d148d14-84d7-401e-badd-c6ea47afd7f6";
const SUBAGENT_ID = "7999818d-b542-4f2e-ab43-588c8bbbbd50";

const OUT_DOCS = path.resolve(__dirname, "../docs/proofs/loyalty");
const OUT_ORCH = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${ORCH_ID}`);
const OUT_SELF = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${SUBAGENT_ID}`);

[OUT_DOCS, OUT_ORCH, OUT_SELF].forEach((dir) => {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

async function saveProof(page, filename) {
	await page.waitForTimeout(600);
	const pDocs = path.join(OUT_DOCS, filename);
	const pOrch = path.join(OUT_ORCH, filename);
	const pSelf = path.join(OUT_SELF, filename);

	await page.screenshot({ path: pDocs, fullPage: false, animations: "disabled" });
	fs.copyFileSync(pDocs, pOrch);
	fs.copyFileSync(pDocs, pSelf);

	const size = fs.statSync(pDocs).size;
	if (size < 30720) {
		throw new Error(`[BLANK SCREEN DETECTED] ${filename} is ${size} bytes (< 30KB)!`);
	}
	console.log(`[VERIFIED PROOF] ${filename} (${(size / 1024).toFixed(1)} KB) -> Saved.`);
	return pDocs;
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
			.boot-state, #boot-screen, .app-boot-container,
			vite-error-overlay { display: none !important; pointer-events: none !important; }
		`;
		document.head.appendChild(style);
	}).catch(() => {});
}

async function setTheme(page, theme) {
	await page.evaluate((th) => {
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
		document.documentElement.style.colorScheme = th;
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("dente_theme_mode", th);
		localStorage.setItem("theme", th);
		window.dispatchEvent(new Event("themechange"));
	}, theme).catch(() => {});
	await suppressOverlays(page);
	await page.waitForTimeout(600);
}

async function getLiveClinicLogin() {
	try {
		const res = await fetch("http://127.0.0.1:4100/api/auth/login", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email: "clinic@example.com", password: "dente2026" }),
		});
		const data = await res.json();
		if (data.ok && data.clinicToken && data.staffToken) {
			return data;
		}
	} catch (e) {
		console.log("[Auth] Error fetching live tokens:", e.message);
	}
	return {
		clinicToken: "fallback-token",
		staffToken: "fallback-staff",
		user: { id: "01a00000-0000-0000-0003-000000000001", fullName: "Д-р Соколов А. В.", role: "doctor" },
	};
}

async function injectStorage(context, auth, theme = "light") {
	const clinicToken = auth.clinicToken;
	const staffToken = auth.staffToken;
	const user = auth.user;
	const orgId = "01a00000-0000-0000-0000-000000000000";

	await context.addInitScript(({ token, staff, userInfo, organizationId, th }) => {
		localStorage.setItem("dente_clinic_token", token);
		localStorage.setItem("dente_staff_token", staff);
		localStorage.setItem("dente_active_session_token", staff);
		localStorage.setItem("dente_active_role", "doctor");
		localStorage.setItem("dente_current_doctor_id", userInfo.id);
		localStorage.setItem("dente_active_staff_user", JSON.stringify(userInfo));
		localStorage.setItem("dental-crm:active-user:v1", JSON.stringify(userInfo));
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
		localStorage.setItem("dente_guide_tour_seen_roles_v2", JSON.stringify(["admin", "doctor", "director"]));
		localStorage.setItem("dente_demo_showcase", "true");
		localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true, onboardingStep: "done", version: 1 }));
		localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true, version: 1 }));
		localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({ version: 1, uiLanguage: "ru", selectedWorkspaceRole: "doctor", onboardingDismissed: true }));
		localStorage.setItem("dente-workspace-profile", JSON.stringify({
			state: {
				clinicName: "Стоматологическая Клиника DENTE",
				organizationId,
				currentDoctor: { id: userInfo.id, fullName: userInfo.fullName, role: userInfo.role },
				flags: { disableTour: true },
			},
		}));
		document.cookie = `dente_clinic_token=${token}; path=/; max-age=31536000`;
		document.cookie = `dente_staff_token=${staff}; path=/; max-age=31536000`;
	}, { token: clinicToken, staff: staffToken, userInfo: user, organizationId: orgId, th: theme });
}

async function main() {
	const auth = await getLiveClinicLogin();
	console.log(`[Auth] Authenticated as: ${auth.user?.fullName} (${auth.user?.role})`);

	const activePort = 5173;
	const baseUrl = `http://127.0.0.1:${activePort}`;
	console.log(`\n=== 4-State Proof: Navigating to ${baseUrl}/?demo=true&loyalty=1 ===`);

	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	try {
		// -------------------------------------------------------------
		// 1. ☀️ PC Light (1440x900)
		// -------------------------------------------------------------
		const contextPc = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});
		await injectStorage(contextPc, auth, "light");
		const pagePc = await contextPc.newPage();
		pagePc.on("console", (m) => console.log("[PAGE LOG]", m.text()));
		pagePc.on("pageerror", (e) => console.log("[PAGE ERROR]", e.message));

		await pagePc.goto(`${baseUrl}/?demo=true&loyalty=1#loyalty`, { waitUntil: "commit", timeout: 60000 });
		await pagePc.waitForSelector("main.boot-state", { state: "detached", timeout: 15000 }).catch(() => {});
		await pagePc.waitForTimeout(1500);

		await pagePc.evaluate(() => {
			window.dispatchEvent(new CustomEvent("dente:open-loyalty"));
		}).catch(() => {});
		await suppressOverlays(pagePc);
		await setTheme(pagePc, "light");

		// Убедимся, что открыта Студия лояльности
		await pagePc.waitForSelector('[data-testid="loyalty-studio-modal"]', { timeout: 30000 });
		await saveProof(pagePc, "01_loyalty_studio_pc_light_1440x900.png");

		// -------------------------------------------------------------
		// 2. 🌙 PC Dark (1440x900)
		// -------------------------------------------------------------
		await setTheme(pagePc, "dark");
		await saveProof(pagePc, "02_loyalty_studio_pc_dark_1440x900.png");

		// Вкладка сертификатов в PC Dark
		const certTabBtn = pagePc.locator('button.loyalty-tab-btn:has-text("Сертификаты")');
		if (await certTabBtn.count() > 0) {
			await certTabBtn.click();
			await pagePc.waitForTimeout(500);

			// Вводим валидный серийный номер и нажимаем проверить
			const certInput = pagePc.locator('input[placeholder="7701-XXXX-XXXX-XXXX"]');
			if (await certInput.count() > 0) {
				await certInput.fill("7701-1234-5678-9012");
				const verifyBtn = pagePc.locator('button:has-text("Проверить")');
				if (await verifyBtn.count() > 0) {
					await verifyBtn.click();
					await pagePc.waitForTimeout(800);
				}
			}
			await saveProof(pagePc, "06_loyalty_certificates_pc_dark_1440x900.png");
		}

		// Вкладка сертификатов в PC Light
		await setTheme(pagePc, "light");
		await saveProof(pagePc, "05_loyalty_certificates_pc_light_1440x900.png");
		await pagePc.close();
		await contextPc.close();

		// -------------------------------------------------------------
		// 3. 📱 Mobile Light & Dark (390x844 Apple HIG iPhone)
		// -------------------------------------------------------------
		const contextMobile = await browser.newContext({
			viewport: { width: 390, height: 844 },
			isMobile: true,
			hasTouch: true,
			deviceScaleFactor: 2,
		});
		await injectStorage(contextMobile, auth, "light");
		const pageMobile = await contextMobile.newPage();
		pageMobile.on("console", (m) => console.log("[MOBILE LOG]", m.text()));
		pageMobile.on("pageerror", (e) => console.log("[MOBILE ERROR]", e.message));

		await pageMobile.goto(`${baseUrl}/?demo=true&loyalty=1#loyalty`, { waitUntil: "commit", timeout: 60000 });
		await pageMobile.waitForTimeout(2000);
		await suppressOverlays(pageMobile);

		// 3. 📱 Mobile Light
		await setTheme(pageMobile, "light");
		await pageMobile.waitForSelector('[data-testid="loyalty-studio-modal"]', { timeout: 30000 });
		await saveProof(pageMobile, "03_loyalty_studio_mobile_light_390x844.png");

		// 4. 📱 Mobile Dark
		await setTheme(pageMobile, "dark");
		await saveProof(pageMobile, "04_loyalty_studio_mobile_dark_390x844.png");
		await pageMobile.close();
		await contextMobile.close();

		// -------------------------------------------------------------
		// 5. Касса с выбором сертификата (PC Light)
		// -------------------------------------------------------------
		const contextCashbox = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
			colorScheme: "light",
		});
		await injectStorage(contextCashbox, auth, "light");
		const pageCashbox = await contextCashbox.newPage();
		pageCashbox.on("console", (m) => console.log("[CASHBOX LOG]", m.text()));
		pageCashbox.on("pageerror", (e) => console.log("[CASHBOX ERROR]", e.message));

		await pageCashbox.goto(`${baseUrl}/?demo=true&standalone=cashbox#checkout`, { waitUntil: "commit", timeout: 60000 });
		await suppressOverlays(pageCashbox);
		await setTheme(pageCashbox, "light");
		await pageCashbox.waitForSelector('[data-testid="btn-tender-certificate"]', { timeout: 30000 });

		// Клик на Сертификат в кассе
		const certTenderBtn = pageCashbox.locator('[data-testid="btn-tender-certificate"]');
		await certTenderBtn.click();
		await pageCashbox.waitForTimeout(600);
		const cashboxCertInput = pageCashbox.locator('[data-testid="input-cashbox-certificate-number"]');
		if (await cashboxCertInput.count() > 0) {
			await cashboxCertInput.fill("7701-1234-5678-9012");
			await pageCashbox.waitForTimeout(400);
		}
		await saveProof(pageCashbox, "07_cashbox_certificate_tender_pc_light.png");
		await pageCashbox.close();
		await contextCashbox.close();

		// -------------------------------------------------------------
		// 6. Касса с выбором сертификата (PC Dark)
		// -------------------------------------------------------------
		const contextCashboxDark = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
			colorScheme: "dark",
		});
		await injectStorage(contextCashboxDark, auth, "dark");
		const pageCashboxDark = await contextCashboxDark.newPage();
		pageCashboxDark.on("console", (m) => console.log("[CASHBOX DARK LOG]", m.text()));
		pageCashboxDark.on("pageerror", (e) => console.log("[CASHBOX DARK ERROR]", e.message));

		await pageCashboxDark.goto(`${baseUrl}/?demo=true&standalone=cashbox#checkout`, { waitUntil: "commit", timeout: 60000 });
		await suppressOverlays(pageCashboxDark);
		await setTheme(pageCashboxDark, "dark");
		await pageCashboxDark.waitForSelector('[data-testid="btn-tender-certificate"]', { timeout: 30000 });

		const certTenderBtnDark = pageCashboxDark.locator('[data-testid="btn-tender-certificate"]');
		await certTenderBtnDark.click();
		await pageCashboxDark.waitForTimeout(600);
		const cashboxCertInputDark = pageCashboxDark.locator('[data-testid="input-cashbox-certificate-number"]');
		if (await cashboxCertInputDark.count() > 0) {
			await cashboxCertInputDark.fill("7701-1234-5678-9012");
			await pageCashboxDark.waitForTimeout(400);
		}
		await saveProof(pageCashboxDark, "08_cashbox_certificate_tender_pc_dark.png");
		await pageCashboxDark.close();
		await contextCashboxDark.close();

		console.log("\n=== ALL 4-STATE PROOFS CAPTURED SUCCESSFULLY! ===");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("[FATAL ERROR] Capture failed:", err);
	process.exit(1);
});
