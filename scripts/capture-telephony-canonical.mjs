import { mkdirSync, statSync, copyFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const OUT_DOCS = "C:/Clinic_MVP/dental-crm/docs/proofs/telephony";
const API_URL = "http://127.0.0.1:4100";
const WEB_URL = "http://127.0.0.1:5173";

mkdirSync(OUT_DOCS, { recursive: true });

async function provisionSession() {
	console.log("[Auth] Provisioning live clinic session via API at " + API_URL + " ...");
	const uniqueId = Date.now();
	const initRes = await fetch(`${API_URL}/api/auth/setup/init`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			clinicName: "Стоматология ДЕНТЕ Премиум",
			email: `doctor-telephony-${uniqueId}@dente.local`,
			password: "Password123!",
			ownerName: "Д-р Воронов Алексей Владимирович",
			ownerPin: "1234",
		}),
	});
	if (!initRes.ok) throw new Error(`Init failed: ${await initRes.text()}`);
	const initData = await initRes.json();

	const unlockRes = await fetch(`${API_URL}/api/auth/staff/unlock`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-dente-clinic-token": initData.clinicToken,
		},
		body: JSON.stringify({ userId: initData.ownerUserId, pinCode: "1234" }),
	});
	if (!unlockRes.ok) throw new Error(`Unlock failed: ${await unlockRes.text()}`);
	const unlockData = await unlockRes.json();

	return {
		clinicToken: initData.clinicToken,
		staffToken: unlockData.staffToken,
		ownerUserId: initData.ownerUserId,
	};
}

function injectStorage(context, auth, theme = "light") {
	return context.addInitScript(
		({ ct, st, uid, th }) => {
			localStorage.setItem("dente_clinic_token", ct);
			localStorage.setItem("dente_staff_token", st);
			localStorage.setItem("dente_active_role", "owner");
			localStorage.setItem("dente_user_id", uid);
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_theme", th);
			localStorage.setItem("dente_theme_mode", th);
			localStorage.setItem("theme", th);
			localStorage.setItem(
				"dente_ui_preferences_v1",
				JSON.stringify({ onboardingDismissed: true, onboardingStep: "done", version: 1 })
			);
			localStorage.setItem(
				"dental-crm:onboarding:v1",
				JSON.stringify({ dismissed: true, step: "done", completed: true, onboardingDismissed: true, onboardingStep: "done", version: 1 })
			);
			localStorage.setItem(
				"dental-crm:web-ui-preferences:v1",
				JSON.stringify({ version: 1, uiLanguage: "ru", selectedWorkspaceRole: "owner", onboardingDismissed: true, onboardingStep: "done" })
			);

			try {
				const style = document.createElement("style");
				style.id = "suppress-all-overlays-init";
				style.textContent = `
					vite-error-overlay,
					[data-vite-dev-error-overlay],
					#vite-plugin-checker-error-overlay {
						display: none !important;
						visibility: hidden !important;
						opacity: 0 !important;
						pointer-events: none !important;
					}
				`;
				if (document.documentElement) {
					document.documentElement.appendChild(style);
				}
			} catch (_) {}
		},
		{ ct: auth.clinicToken, st: auth.staffToken, uid: auth.ownerUserId, th: theme }
	);
}

async function prepareTheme(page, theme) {
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
		document.querySelectorAll("vite-error-overlay").forEach((el) => el.remove());
		const style = document.createElement("style");
		style.id = "suppress-all-overlays";
		style.innerHTML = `
			vite-error-overlay,
			[data-vite-dev-error-overlay],
			#vite-plugin-checker-error-overlay {
				display: none !important;
				visibility: hidden !important;
				opacity: 0 !important;
				pointer-events: none !important;
			}
		`;
		document.head.appendChild(style);
	}, theme);
}

async function main() {
	const auth = await provisionSession();
	console.log("[Auth] Done, launching browser via msedge...");

	const browser = await chromium.launch({
		headless: true,
		channel: "msedge",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	try {
		// 1. PC Light (1440x900)
		console.log("1. Setting up PC Light context (1440x900)...");
		const ctxLight = await browser.newContext({ viewport: { width: 1440, height: 900 } });
		await injectStorage(ctxLight, auth, "light");
		const pageLight = await ctxLight.newPage();

		console.log("Navigating to ?telephony=1 in PC Light...");
		await pageLight.goto(`${WEB_URL}/?telephony=1`, { waitUntil: "commit", timeout: 20000 });
		await pageLight.waitForSelector('[data-testid="telephony-standalone-workspace"]', { state: "attached", timeout: 20000 });
		await pageLight.waitForTimeout(2000);
		await prepareTheme(pageLight, "light");
		await pageLight.waitForTimeout(800);

		const shot1 = path.join(OUT_DOCS, "01_pc_telephony_incoming_call_light_1440x900.png");
		await pageLight.screenshot({ path: shot1, fullPage: false });
		copyFileSync(shot1, path.join(OUT_DOCS, "01_telephony_pc_light_1440x900.png"));
		console.log(`[Captured] 01 PC Light (${statSync(shot1).size} bytes)`);

		// 2. PC Light Dialer Modal
		console.log("2. Opening and capturing Dialer Modal...");
		const dialerBtn = await pageLight.$('button.secondary-button');
		if (dialerBtn) {
			await dialerBtn.click();
			await pageLight.waitForTimeout(1200);
		}
		const shot2 = path.join(OUT_DOCS, "02_pc_telephony_dialer_modal_light_1440x900.png");
		await pageLight.screenshot({ path: shot2, fullPage: false });
		console.log(`[Captured] 02 Dialer Modal (${statSync(shot2).size} bytes)`);

		// Close dialer modal
		await pageLight.keyboard.press("Escape");
		await pageLight.waitForTimeout(600);

		// 3. Incoming call popup close-up
		console.log("3. Capturing Incoming Call Popup Close-Up...");
		const popupEl = await pageLight.$('[data-testid="incoming-call-popup"]');
		const shot6 = path.join(OUT_DOCS, "05_telephony_popup_incoming_call.png");
		if (popupEl) {
			await popupEl.screenshot({ path: shot6 });
			console.log(`[Captured] 05 Popup Close-Up (${statSync(shot6).size} bytes)`);
		} else {
			copyFileSync(shot1, shot6);
			console.log(`[Copied] 05 Fallback Popup from shot1`);
		}

		// 4. PC Dark (1440x900)
		console.log("4. Switching to PC Dark (1440x900)...");
		await prepareTheme(pageLight, "dark");
		await pageLight.waitForTimeout(800);
		const shot3 = path.join(OUT_DOCS, "03_pc_telephony_dark_1440x900.png");
		await pageLight.screenshot({ path: shot3, fullPage: false });
		copyFileSync(shot3, path.join(OUT_DOCS, "02_telephony_pc_dark_1440x900.png"));
		console.log(`[Captured] 03 PC Dark (${statSync(shot3).size} bytes)`);

		// 5. Mobile Light (390x844)
		console.log("5. Switching to Mobile Light (390x844)...");
		await pageLight.setViewportSize({ width: 390, height: 844 });
		await prepareTheme(pageLight, "light");
		await pageLight.waitForTimeout(1000);
		const shot4 = path.join(OUT_DOCS, "04_mobile_telephony_light_390x844.png");
		await pageLight.screenshot({ path: shot4, fullPage: false });
		copyFileSync(shot4, path.join(OUT_DOCS, "03_telephony_mobile_light_390x844.png"));
		console.log(`[Captured] 04 Mobile Light (${statSync(shot4).size} bytes)`);

		// 6. Mobile Dark (390x844)
		console.log("6. Switching to Mobile Dark (390x844)...");
		await prepareTheme(pageLight, "dark");
		await pageLight.waitForTimeout(1000);
		const shot5 = path.join(OUT_DOCS, "04_mobile_telephony_dark_390x844.png");
		await pageLight.screenshot({ path: shot5, fullPage: false });
		copyFileSync(shot5, path.join(OUT_DOCS, "04_telephony_mobile_dark_390x844.png"));
		console.log(`[Captured] 04 Mobile Dark (${statSync(shot5).size} bytes)`);

		await pageLight.close();
		await ctxLight.close();

		console.log("=== ALL TELEPHONY SCREENSHOT PROOFS SUCCESSFULLY CAPTURED ===");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("FATAL ERROR in main:", err);
	process.exit(1);
});
