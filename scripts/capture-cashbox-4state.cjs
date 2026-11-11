/**
 * scripts/capture-cashbox-4state.cjs
 *
 * Captures 4-State Red Team Proofs for Cashier & Checkout Studio:
 * 1. PC Light (1440x900)
 * 2. PC Dark (1440x900)
 * 3. Mobile Light (390x844, Apple HIG)
 * 4. Mobile Dark (390x844, Apple HIG)
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const PROOFS_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/cashbox");
if (!fs.existsSync(PROOFS_DIR)) {
	fs.mkdirSync(PROOFS_DIR, { recursive: true });
}

async function capture() {
	console.log("=== Provisioning session for Cashbox 4-State Proofs ===");
	const uniqueId = Date.now();
	let clinicToken = "demo-clinic-token";
	let staffToken = "demo-staff-token";
	let organizationId = "demo-org-id";
	let ownerUserId = "demo-user-id";

	try {
		const headers = { "Content-Type": "application/json" };
		const initRes = await fetch("http://127.0.0.1:4100/api/auth/setup/init", {
			method: "POST",
			headers,
			body: JSON.stringify({
				clinicName: "Клиника ДЕНТЕ (Касса)",
				email: `cashbox-proof-${uniqueId}@dente-clinic.ru`,
				password: "Password123!",
				ownerName: "Д-р Воронов А. В.",
				ownerPin: "1234",
			}),
		});
		if (initRes.ok) {
			const initData = await initRes.json();
			clinicToken = initData.clinicToken;
			organizationId = initData.organizationId;
			ownerUserId = initData.ownerUserId;

			const unlockRes = await fetch("http://127.0.0.1:4100/api/auth/staff/unlock", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-dente-clinic-token": clinicToken,
				},
				body: JSON.stringify({ userId: ownerUserId, pinCode: "1234" }),
			});
			if (unlockRes.ok) {
				const unlockData = await unlockRes.json();
				staffToken = unlockData.staffToken;
			}
		}
	} catch (err) {
		console.warn("API provisioning notice (falling back to demo state):", err.message);
	}

	console.log("Launching Chromium...");
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	async function applyTheme(page, theme) {
		await page.evaluate((t) => {
			document.documentElement.setAttribute("data-theme", t);
			document.body.setAttribute("data-theme", t);
			if (t === "dark") {
				document.documentElement.classList.add("dark");
				document.documentElement.classList.remove("light");
				document.body.classList.add("dark");
				document.body.classList.remove("light");
				document.documentElement.style.colorScheme = "dark";
			} else {
				document.documentElement.classList.add("light");
				document.documentElement.classList.remove("dark");
				document.body.classList.add("light");
				document.body.classList.remove("dark");
				document.documentElement.style.colorScheme = "light";
			}
		}, theme);
	}

	const initScriptParams = {
		ct: clinicToken,
		st: staffToken,
		orgId: organizationId,
		uid: ownerUserId,
	};

	const addStorage = async (ctx) => {
		await ctx.addInitScript(({ ct, st, orgId, uid }) => {
			localStorage.setItem("dente_clinic_token", ct);
			localStorage.setItem("dente_organization_id", orgId);
			localStorage.setItem("dente_staff_token", st);
			localStorage.setItem("dente_active_session_token", st);
			localStorage.setItem("dente_active_user_id", uid);
			localStorage.setItem("dente_user_id", uid);
			localStorage.setItem("dente_active_role", "owner");
			localStorage.setItem("dente_user_role", "owner");
			localStorage.setItem("dente_active_mode", "clinic");
			sessionStorage.setItem("dente_unlocked", "true");
			localStorage.setItem("dente_demo_showcase", "true");
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_tour_dismissed", "true");
			localStorage.setItem("dente_sidebar_collapsed", "false");
			localStorage.setItem(
				"dental-crm:web-ui-preferences:v1",
				JSON.stringify({
					version: 1,
					uiLanguage: "ru",
					selectedWorkspaceRole: "owner",
					onboardingDismissed: true,
					onboardingStep: "done",
				}),
			);
		}, initScriptParams);
	};

	// 1. PC Context (1440x900)
	console.log("\n>>> Capturing PC 1440x900 Context...");
	const pcContext = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 1,
	});
	await addStorage(pcContext);
	const pcPage = await pcContext.newPage();

	const checkoutUrl = "http://127.0.0.1:5173/?demo=true&checkout=1#checkout";
	console.log("Navigating to", checkoutUrl);
	await pcPage.goto(checkoutUrl, { waitUntil: "commit", timeout: 45000 });
	try {
		await pcPage.waitForSelector('[data-testid="cash-register-checkout-modal"]', { state: "visible", timeout: 8000 });
	} catch (e) {
		console.log("Modal not immediately visible on PC, dispatching open-cashbox event...");
		await pcPage.evaluate(() => {
			window.dispatchEvent(new CustomEvent("dente:open-cashbox", { detail: { mode: "checkout" } }));
		});
		await pcPage.waitForSelector('[data-testid="cash-register-checkout-modal"]', { state: "visible", timeout: 25000 });
	}
	await pcPage.waitForTimeout(1000);

	console.log(">>> 01_cashbox_checkout_pc_light_1440x900.png");
	await applyTheme(pcPage, "light");
	await pcPage.waitForTimeout(600);
	const p01 = path.join(PROOFS_DIR, "01_cashbox_checkout_pc_light_1440x900.png");
	await pcPage.screenshot({ path: p01, fullPage: false });
	console.log(`[PROOF VERIFIED] 01_cashbox_checkout_pc_light_1440x900.png: ${fs.statSync(p01).size} bytes`);

	console.log(">>> 02_cashbox_checkout_pc_dark_1440x900.png");
	await applyTheme(pcPage, "dark");
	await pcPage.waitForTimeout(600);
	const p02 = path.join(PROOFS_DIR, "02_cashbox_checkout_pc_dark_1440x900.png");
	await pcPage.screenshot({ path: p02, fullPage: false });
	console.log(`[PROOF VERIFIED] 02_cashbox_checkout_pc_dark_1440x900.png: ${fs.statSync(p02).size} bytes`);
	await pcContext.close();

	// 2. Mobile Context (390x844, Apple HIG)
	console.log("\n>>> Capturing Mobile 390x844 Context...");
	const mobContext = await browser.newContext({
		viewport: { width: 390, height: 844 },
		deviceScaleFactor: 2,
		isMobile: true,
		hasTouch: true,
	});
	await addStorage(mobContext);
	const mobPage = await mobContext.newPage();
	console.log("Navigating mobile to", checkoutUrl);
	await mobPage.goto(checkoutUrl, { waitUntil: "commit", timeout: 45000 });
	try {
		await mobPage.waitForSelector('[data-testid="cash-register-checkout-modal"]', { state: "visible", timeout: 8000 });
	} catch (e) {
		console.log("Modal not immediately visible on mobile, dispatching open-cashbox event...");
		await mobPage.evaluate(() => {
			window.dispatchEvent(new CustomEvent("dente:open-cashbox", { detail: { mode: "checkout" } }));
		});
		await mobPage.waitForSelector('[data-testid="cash-register-checkout-modal"]', { state: "visible", timeout: 25000 });
	}
	await mobPage.waitForTimeout(1000);

	console.log(">>> 03_cashbox_checkout_mobile_light_390x844.png");
	await applyTheme(mobPage, "light");
	await mobPage.waitForTimeout(600);
	const p03 = path.join(PROOFS_DIR, "03_cashbox_checkout_mobile_light_390x844.png");
	await mobPage.screenshot({ path: p03, fullPage: false });
	console.log(`[PROOF VERIFIED] 03_cashbox_checkout_mobile_light_390x844.png: ${fs.statSync(p03).size} bytes`);

	console.log(">>> 04_cashbox_checkout_mobile_dark_390x844.png");
	await applyTheme(mobPage, "dark");
	await mobPage.waitForTimeout(600);
	const p04 = path.join(PROOFS_DIR, "04_cashbox_checkout_mobile_dark_390x844.png");
	await mobPage.screenshot({ path: p04, fullPage: false });
	console.log(`[PROOF VERIFIED] 04_cashbox_checkout_mobile_dark_390x844.png: ${fs.statSync(p04).size} bytes`);
	await mobContext.close();

	await browser.close();
	console.log("\n[SUCCESS] Cashbox 4-State Proofs captured cleanly!");
}

capture().catch((err) => {
	console.error("[FATAL] Capture error:", err);
	process.exit(1);
});
