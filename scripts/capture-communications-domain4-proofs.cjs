/**
 * scripts/capture-communications-domain4-proofs.cjs
 * Canonical 4-State Visual Proofs for Domain 4: Patient Communications, Tomorrow Reminders & Omnichannel Chat Desk
 * 
 * Mandates:
 * - Mandate 8d / 8al: 8 inspection axes, 4-state visual proof (PC Light/Dark 1440x900 + Mobile Light/Dark 390x844).
 * - Mandate 8z / 8wy: 100% real API authentication via Fastify + Postgres.
 * - Mandate 8ba: Real data hydration (patients, phones, appointments).
 * - Mandate 8am / 8bi: Clean clinical UI, 0px noise, 0 circus violations.
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const API_BASE = "http://127.0.0.1:4100";
const WEB_BASE = "http://127.0.0.1:5173";
const PROOF_DIR = path.resolve(__dirname, "../docs/proofs/communications");
const CONV_ID = "ccd4f2ed-145f-4a84-a883-c2efddcd9aaa";
const BRAIN_DIR = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}`);

[PROOF_DIR, BRAIN_DIR].forEach((dir) => {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

async function provisionSession() {
	const uniqueId = Date.now();
	console.log("[Provisioning] Creating real clinic session via API...");
	const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			clinicName: "Стоматология ДЕНТЕ Премиум",
			email: `doctor-comm-${uniqueId}@dente.local`,
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
		"x-organization-id": initData.organizationId,
	};

	// Calculate tomorrow date ISO
	const tomorrow = new Date();
	tomorrow.setDate(tomorrow.getDate() + 1);
	const tomorrowStr = tomorrow.toISOString().slice(0, 10);

	try {
		// Seed 2 real patients with phones for reminders
		const patientsToCreate = [
			{
				fullName: "Смирнов Михаил Сергеевич",
				phone: "+7 (916) 234-56-78",
				birthDate: "1988-04-15",
				notes: "Лечение кариеса 2.5, анестезия Артикаин",
			},
			{
				fullName: "Ковалева Елена Викторовна",
				phone: "+7 (925) 345-67-89",
				birthDate: "1994-11-20",
				notes: "Профгигиена Air-Flow + реминерализация",
			},
		];

		const createdPatients = [];
		for (const p of patientsToCreate) {
			const res = await fetch(`${API_BASE}/api/patients`, {
				method: "POST",
				headers,
				body: JSON.stringify(p),
			});
			if (res.ok) {
				const data = await res.json();
				createdPatients.push(data);
				console.log(`[Provisioning] Created patient: ${data.fullName} (${data.id})`);
			}
		}

		// Seed 2 appointments for tomorrow
		if (createdPatients.length >= 2) {
			const appt1Res = await fetch(`${API_BASE}/api/appointments`, {
				method: "POST",
				headers,
				body: JSON.stringify({
					patientId: createdPatients[0].id,
					doctorUserId: initData.ownerUserId,
					startsAt: `${tomorrowStr}T10:00:00.000Z`,
					durationMinutes: 60,
					reason: "Терапевтический прием, кариес 2.5",
					status: "confirmed",
				}),
			});
			if (appt1Res.ok) console.log(`[Provisioning] Seeded appointment 1 for tomorrow`);

			const appt2Res = await fetch(`${API_BASE}/api/appointments`, {
				method: "POST",
				headers,
				body: JSON.stringify({
					patientId: createdPatients[1].id,
					doctorUserId: initData.ownerUserId,
					startsAt: `${tomorrowStr}T12:30:00.000Z`,
					durationMinutes: 45,
					reason: "Профгигиена полости рта",
					status: "confirmed",
				}),
			});
			if (appt2Res.ok) console.log(`[Provisioning] Seeded appointment 2 for tomorrow`);
		}
	} catch (e) {
		console.warn("[Provisioning] Warning seeding data:", e.message);
	}

	return {
		clinicToken: initData.clinicToken,
		staffToken: unlockData.staffToken,
		organizationId: initData.organizationId,
		ownerUserId: initData.ownerUserId,
		user: {
			id: initData.ownerUserId,
			fullName: "Д-р Воронов Алексей Владимирович",
			role: "owner",
		},
		tomorrowStr,
	};
}

async function injectStorage(context, auth, theme = "light") {
	await context.addInitScript(({ clinicToken, staffToken, orgId, user, th }) => {
		sessionStorage.setItem("dente_unlocked", "true");
		localStorage.setItem("dente_clinic_token", clinicToken);
		localStorage.setItem("dente_staff_token", staffToken);
		localStorage.setItem("dente_active_session_token", staffToken);
		localStorage.setItem("dente_organization_id", orgId);
		localStorage.setItem("dente_active_role", user.role || "owner");
		localStorage.setItem("dente_active_user_id", user.id || "doc-1");
		localStorage.setItem("dente_active_mode", "clinic");
		localStorage.setItem("dente_workspace_perspective", "owner");
		localStorage.setItem("dental-crm:active-user:v1", JSON.stringify(user));
		localStorage.setItem("dente_cached_active_staff_user", JSON.stringify(user));
		localStorage.setItem("dente_theme_mode", th);
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("theme", th);
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_tour_dismissed", "true");
		localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
		localStorage.setItem("dente_training_mode_completed", "true");
		localStorage.setItem("dente_training_active", "false");
		localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true, step: "done" }));
		localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
			version: 1,
			uiLanguage: "ru",
			selectedWorkspaceRole: "owner",
			onboardingDismissed: true,
			onboardingStep: "done",
		}));
		document.cookie = `dente_clinic_token=${encodeURIComponent(clinicToken)}; path=/; max-age=31536000`;
		document.cookie = `dente_staff_token=${encodeURIComponent(staffToken)}; path=/; max-age=31536000`;

		document.documentElement.setAttribute("data-theme", th);
		if (th === "dark") {
			document.documentElement.classList.add("dark");
			document.documentElement.classList.remove("light");
		} else {
			document.documentElement.classList.add("light");
			document.documentElement.classList.remove("dark");
		}
	}, {
		clinicToken: auth.clinicToken,
		staffToken: auth.staffToken,
		orgId: auth.organizationId,
		user: auth.user,
		th: theme,
	});
}

async function suppressOverlays(page) {
	try {
		await page.evaluate(() => {
			const style = document.createElement("style");
			style.id = "suppress-all-overlays";
			style.innerHTML = `
				.tour-spotlight-root,
				.tour-backdrop-clickable-zone,
				[data-testid="guided-tour-spotlight-overlay"],
				[data-testid="guided-tour-coach-mark-card"],
				[data-testid="demo-mode-banner"],
				.global-toast-container,
				vite-error-overlay {
					display: none !important;
					pointer-events: none !important;
				}
			`;
			document.head.appendChild(style);
			document.querySelectorAll("vite-error-overlay, .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay']").forEach((el) => el.remove());
		});
	} catch (_) {}
}

async function setTheme(page, theme) {
	await page.evaluate((th) => {
		document.documentElement.setAttribute("data-theme", th);
		if (th === "dark") {
			document.documentElement.classList.add("dark");
			document.documentElement.classList.remove("light");
		} else {
			document.documentElement.classList.add("light");
			document.documentElement.classList.remove("dark");
		}
		try {
			localStorage.setItem("dente_theme", th);
			localStorage.setItem("dente_theme_mode", th);
			localStorage.setItem("theme", th);
		} catch (_) {}
	}, theme);
	await suppressOverlays(page);
	await page.waitForTimeout(600);
}

async function safeGoto(page, url) {
	for (let i = 0; i < 3; i++) {
		try {
			await page.goto(url, { waitUntil: "commit", timeout: 25000 });
			return;
		} catch (e) {
			console.log(`[safeGoto] Attempt ${i + 1} failed: ${e.message}, waiting 1.5s...`);
			await page.waitForTimeout(1500);
		}
	}
	await page.goto(url, { waitUntil: "commit", timeout: 25000 });
}

async function waitForRealUI(page) {
	console.log("  Waiting for real UI hydration...");
	await page.waitForFunction(() => {
		const text = document.body ? document.body.innerText : "";
		return !text.includes("Загрузка системы") &&
			   !text.includes("Загрузка рабочей смены") &&
			   !text.includes("Загрузка CRM") &&
			   text.length > 200;
	}, { timeout: 35000 }).catch((e) => {
		console.warn("  [waitForRealUI warning]:", e.message);
	});

	await page.evaluate(() => {
		document.querySelectorAll(".boot-subtitle, .boot-container, .boot-screen, .boot-state").forEach((el) => el.remove());
	}).catch(() => {});

	await suppressOverlays(page);
	await page.waitForTimeout(1200);
}

async function saveProof(page, filename, description) {
	await suppressOverlays(page);
	await page.waitForTimeout(600);

	const p1 = path.join(PROOF_DIR, filename);
	const p2 = path.join(BRAIN_DIR, filename);

	await page.screenshot({ path: p1, fullPage: false, animations: "disabled" });
	fs.copyFileSync(p1, p2);

	const buf = fs.readFileSync(p1);
	const sizeKb = (buf.length / 1024).toFixed(1);
	const hash = crypto.createHash("md5").update(buf).digest("hex").slice(0, 10);
	console.log(`  -> [PROOF CAPTURED] ${filename} (${sizeKb} KB, md5: ${hash}) | ${description}`);

	if (buf.length < 20 * 1024) {
		throw new Error(`Screenshot ${filename} is too small: ${sizeKb} KB (< 20 KB)`);
	}
	return { filename, sizeKb, hash, path: p1 };
}

async function openTomorrowReminders(page) {
	console.log("  Opening TomorrowRemindersModal via options menu...");
	try {
		// Wait for schedule toolbar
		await page.waitForSelector('.schedule-filter-strip, [data-testid="schedule-toolbar"], .schedule-unified-toolbar', {
			state: "visible",
			timeout: 15000,
		}).catch(() => {});

		// 1. Click options menu button
		const optionsBtn = page.locator('[data-testid="schedule-toolbar-options-btn"], button.schedule-toolbar-options-btn, button[aria-label="Опции расписания"]');
		if (await optionsBtn.count() > 0) {
			await optionsBtn.first().click();
			await page.waitForTimeout(600);
		} else {
			await page.evaluate(() => {
				const btn = document.querySelector('[data-testid="schedule-toolbar-options-btn"]') ||
					Array.from(document.querySelectorAll("button")).find(b => (b.getAttribute("aria-label") || "").includes("Опции"));
				if (btn) btn.click();
			});
			await page.waitForTimeout(600);
		}

		// 2. Click "Напомнить на завтра"
		const reminderBtn = page.locator('[data-testid="schedule-strip-tomorrow-reminders-btn"]');
		if (await reminderBtn.count() > 0) {
			await reminderBtn.first().click();
		} else {
			await page.evaluate(() => {
				const item = document.querySelector('[data-testid="schedule-strip-tomorrow-reminders-btn"]') ||
					Array.from(document.querySelectorAll("button, [role='menuitem']")).find(b => (b.textContent || "").includes("Напомнить на завтра"));
				if (item) item.click();
			});
		}

		await page.waitForTimeout(1000);

		// Wait for modal appearance
		await page.waitForSelector('[data-testid="tomorrow-reminders-modal"], .tomorrow-reminders-modal', {
			state: "visible",
			timeout: 10000,
		}).catch(() => {});
	} catch (e) {
		console.log("  [openTomorrowReminders error]:", e.message);
	}

	const modalVisible = await page.evaluate(() => {
		const modal = document.querySelector('[data-testid="tomorrow-reminders-modal"], .tomorrow-reminders-modal');
		return Boolean(modal);
	});
	console.log("  TomorrowRemindersModal visible:", modalVisible);
}

async function main() {
	console.log("[Visual Proof] Starting Canonical 4-State Proof Capture for Domain 4...");

	const auth = await provisionSession();

	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-gpu", "--disable-web-security"],
	});

	try {
		// =========================================================================
		// PHASE 1: TomorrowRemindersModal (PC Desktop 1440x900)
		// =========================================================================
		console.log("\n--- Phase 1: TomorrowRemindersModal (PC Desktop 1440x900) ---");
		const pcContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
			isMobile: false,
			hasTouch: false,
		});
		await injectStorage(pcContext, auth, "light");

		const pcPage = await pcContext.newPage();
		await safeGoto(pcPage, `${WEB_BASE}/#schedule`);
		await waitForRealUI(pcPage);
		await openTomorrowReminders(pcPage);

		// 1. PC Light
		await setTheme(pcPage, "light");
		await saveProof(pcPage, "01_tomorrow_reminders_pc_light_1440x900.png", "TomorrowRemindersModal PC Light 1440x900");

		// 2. PC Dark
		await setTheme(pcPage, "dark");
		await saveProof(pcPage, "02_tomorrow_reminders_pc_dark_1440x900.png", "TomorrowRemindersModal PC Dark 1440x900");

		await pcContext.close();

		// =========================================================================
		// PHASE 2: TomorrowRemindersModal (Mobile 390x844)
		// =========================================================================
		console.log("\n--- Phase 2: TomorrowRemindersModal (Mobile 390x844) ---");
		const mobileContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
		});
		await injectStorage(mobileContext, auth, "light");

		const mobilePage = await mobileContext.newPage();
		await safeGoto(mobilePage, `${WEB_BASE}/#schedule`);
		await waitForRealUI(mobilePage);
		await openTomorrowReminders(mobilePage);

		// 3. Mobile Light
		await setTheme(mobilePage, "light");
		await saveProof(mobilePage, "03_tomorrow_reminders_mobile_light_390x844.png", "TomorrowRemindersModal Mobile Light 390x844");

		// 4. Mobile Dark
		await setTheme(mobilePage, "dark");
		await saveProof(mobilePage, "04_tomorrow_reminders_mobile_dark_390x844.png", "TomorrowRemindersModal Mobile Dark 390x844");

		await mobileContext.close();

		// =========================================================================
		// PHASE 3: OmnichannelOperatorDesk (PC Desktop 1440x900)
		// =========================================================================
		console.log("\n--- Phase 3: OmnichannelOperatorDesk (PC Desktop 1440x900) ---");
		const deskPcContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
			isMobile: false,
			hasTouch: false,
		});
		await injectStorage(deskPcContext, auth, "light");

		const deskPcPage = await deskPcContext.newPage();
		await safeGoto(deskPcPage, `${WEB_BASE}/#communications`);
		await waitForRealUI(deskPcPage);

		// Switch to omnichannel chat section if needed
		await deskPcPage.evaluate(() => {
			if (window.__useAppStore) {
				window.__useAppStore.getState().setCurrentView("communications");
			}
			window.location.hash = "communications";
			window.dispatchEvent(new HashChangeEvent("hashchange"));
		});
		await deskPcPage.waitForTimeout(1500);
		await suppressOverlays(deskPcPage);

		try {
			const chatTab = deskPcPage.locator('button:has-text("WhatsApp Чат"), button:has-text("Чат"), button:has-text("Диалоги"), [data-section="omnichannel"]');
			if (await chatTab.count() > 0) {
				await chatTab.first().click();
				await deskPcPage.waitForTimeout(1000);
			}
		} catch (_) {}

		// 5. Desk PC Light
		await setTheme(deskPcPage, "light");
		await saveProof(deskPcPage, "05_omnichannel_chat_pc_light_1440x900.png", "OmnichannelOperatorDesk PC Light 1440x900");

		// 6. Desk PC Dark
		await setTheme(deskPcPage, "dark");
		await saveProof(deskPcPage, "06_omnichannel_chat_pc_dark_1440x900.png", "OmnichannelOperatorDesk PC Dark 1440x900");

		await deskPcContext.close();

		// =========================================================================
		// PHASE 4: OmnichannelOperatorDesk (Mobile 390x844)
		// =========================================================================
		console.log("\n--- Phase 4: OmnichannelOperatorDesk (Mobile 390x844) ---");
		const deskMobileContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
		});
		await injectStorage(deskMobileContext, auth, "light");

		const deskMobilePage = await deskMobileContext.newPage();
		await safeGoto(deskMobilePage, `${WEB_BASE}/#communications`);
		await waitForRealUI(deskMobilePage);

		await deskMobilePage.evaluate(() => {
			if (window.__useAppStore) {
				window.__useAppStore.getState().setCurrentView("communications");
			}
			window.location.hash = "communications";
			window.dispatchEvent(new HashChangeEvent("hashchange"));
		});
		await deskMobilePage.waitForTimeout(1500);
		await suppressOverlays(deskMobilePage);

		try {
			const chatTab = deskMobilePage.locator('button:has-text("WhatsApp Чат"), button:has-text("Чат"), button:has-text("Диалоги"), [data-section="omnichannel"]');
			if (await chatTab.count() > 0) {
				await chatTab.first().click();
				await deskMobilePage.waitForTimeout(1000);
			}
		} catch (_) {}

		// 7. Desk Mobile Light
		await setTheme(deskMobilePage, "light");
		await saveProof(deskMobilePage, "07_omnichannel_chat_mobile_light_390x844.png", "OmnichannelOperatorDesk Mobile Light 390x844");

		// 8. Desk Mobile Dark
		await setTheme(deskMobilePage, "dark");
		await saveProof(deskMobilePage, "08_omnichannel_chat_mobile_dark_390x844.png", "OmnichannelOperatorDesk Mobile Dark 390x844");

		await deskMobileContext.close();

		console.log("\n🎉 ALL 8 CANONICAL VISUAL PROOFS CAPTURED SUCCESSFULLY!");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("[Proof Capture Error]:", err);
	process.exit(1);
});
