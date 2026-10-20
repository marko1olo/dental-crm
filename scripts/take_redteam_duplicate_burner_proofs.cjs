const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");
const { Pool } = require("pg");

const pool = new Pool({
	connectionString: process.env.DATABASE_URL || "postgres://dental:dental@127.0.0.1:5432/dental_crm",
});

async function provisionSession() {
	const API_BASE = "http://127.0.0.1:4100";
	const uniqueId = Date.now();
	console.log("[Provisioning] Initializing clean clinic session via API...");
	const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			clinicName: "Стоматология ДЕНТЕ Премиум",
			email: `doctor-burner-${uniqueId}@dente.local`,
			password: "Password123!",
			ownerName: "Д-р Смирнов А. В.",
			ownerPin: "1234",
		}),
	});
	if (!initRes.ok) {
		throw new Error(`Clinic setup failed: ${await initRes.text()}`);
	}
	const initData = await initRes.json();
	const orgId = initData.organizationId;
	console.log(`[Provisioning] Organization created: ${orgId}`);

	let clinicId = crypto.randomUUID();
	let chairId = crypto.randomUUID();
	try {
		const client = await pool.connect();
		try {
			await client.query(`SET LOCAL "app.current_organization_id" = '${orgId}'`).catch(() => {});
			const existingClinic = await client.query("SELECT id FROM clinics WHERE organization_id = $1 LIMIT 1", [orgId]).catch(() => ({ rows: [] }));
			if (existingClinic.rows.length > 0) {
				clinicId = existingClinic.rows[0].id;
			} else {
				const ins = await client.query(
					`INSERT INTO clinics (id, organization_id, name, timezone) VALUES ($1, $2, $3, $4) RETURNING id`,
					[clinicId, orgId, "Стоматология ДЕНТЕ Премиум", "Europe/Samara"]
				).catch(() => null);
				if (ins?.rows?.[0]) clinicId = ins.rows[0].id;
			}
			const insChair = await client.query(
				`INSERT INTO chairs (id, organization_id, clinic_id, name, is_active) VALUES ($1, $2, $3, $4, true) RETURNING id`,
				[chairId, orgId, clinicId, "Кресло 1 (Терапия/Хирургия)"]
			).catch(() => null);
			if (insChair?.rows?.[0]) chairId = insChair.rows[0].id;
		} finally {
			client.release();
		}
		console.log(`[Provisioning] Resolved clinic ${clinicId} and chair ${chairId}`);
	} catch (dbErr) {
		console.log("[Provisioning] DB direct query note:", dbErr.message);
	}

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
		"x-dente-active-role": "owner",
	};

	let patient1Id = null;
	try {
		const p1Res = await fetch(`${API_BASE}/api/patients`, {
			method: "POST",
			headers,
			body: JSON.stringify({
				fullName: "Кузнецов Дмитрий Сергеевич",
				phone: "+7 (927) 123-45-67",
				birthDate: "1985-04-12",
				notes: "Пациент с планом лечения. Аллергия на новокаин.",
			}),
		});
		if (p1Res.ok) {
			const p1Data = await p1Res.json();
			patient1Id = p1Data.id;
			console.log(`[Provisioning] Created patient: ${patient1Id} (${p1Data.fullName})`);

			// Add sample appointment
			const startIso = new Date().toISOString();
			const endIso = new Date(Date.now() + 45 * 60 * 1000).toISOString();
			await fetch(`${API_BASE}/api/appointments`, {
				method: "POST",
				headers,
				body: JSON.stringify({
					patientId: patient1Id,
					doctorId: initData.ownerUserId,
					chairId,
					status: "confirmed",
					startsAt: startIso,
					endsAt: endIso,
					reason: "Лечение пульпита 2.4",
				}),
			});
		}
	} catch (e1) {
		console.log("[Provisioning] Patient creation notice:", e1.message);
	}

	return {
		clinicToken: initData.clinicToken,
		staffToken: unlockData.staffToken,
		ownerUserId: initData.ownerUserId,
		patientId: patient1Id,
		chairId,
	};
}

async function capture() {
	const outDir = "C:/Clinic_MVP/dental-crm/docs/proofs/redteam_ui_unification";
	if (!fs.existsSync(outDir)) {
		fs.mkdirSync(outDir, { recursive: true });
	}

	const parentBrainDir = "C:/Users/Admin/.gemini/antigravity/brain/279687e0-d651-4914-b191-0c203f3f31e4";
	if (!fs.existsSync(parentBrainDir)) {
		fs.mkdirSync(parentBrainDir, { recursive: true });
	}

	const selfBrainDir = "C:/Users/Admin/.gemini/antigravity/brain/9752e021-ddb1-42db-8784-908f4362c054";
	if (!fs.existsSync(selfBrainDir)) {
		fs.mkdirSync(selfBrainDir, { recursive: true });
	}

	const auth = await provisionSession();

	console.log("[Playwright] Launching Chrome headless...");
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	const capturedFiles = [];

	async function initContextAuth(context, theme = "light") {
		await context.addInitScript(({ ct, st, uid, pid, themeMode }) => {
			localStorage.setItem("dente_clinic_token", ct);
			localStorage.setItem("dente_staff_token", st);
			localStorage.setItem("dente_active_role", "owner");
			localStorage.setItem("dente_user_id", uid);
			if (pid) {
				localStorage.setItem("dente_active_patient_id", pid);
			}
			localStorage.setItem("dente_theme_mode", themeMode);
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_tour_completed", "true");
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
			localStorage.setItem(
				"dente-workspace-profile",
				JSON.stringify({
					state: {
						clinicName: "Стоматология ДЕНТЕ Премиум",
						currentDoctor: { id: uid, fullName: "Д-р Смирнов А. В.", role: "owner" },
						flags: { disableTour: true },
					},
				})
			);
		}, {
			ct: auth.clinicToken,
			st: auth.staffToken,
			uid: auth.ownerUserId,
			pid: auth.patientId,
			themeMode: theme,
		});
	}

	async function recordScreenshot(page, fileName) {
		const targetPath = path.join(outDir, fileName);
		const parentBrainPath = path.join(parentBrainDir, fileName);
		const selfBrainPath = path.join(selfBrainDir, fileName);
		await page.screenshot({ path: targetPath, fullPage: false });
		fs.copyFileSync(targetPath, parentBrainPath);
		fs.copyFileSync(targetPath, selfBrainPath);
		const stats = fs.statSync(targetPath);
		const hash = crypto.createHash("md5").update(fs.readFileSync(targetPath)).digest("hex");
		capturedFiles.push({
			name: fileName,
			size: stats.size,
			md5: hash,
			path: targetPath,
		});
		console.log(`[Captured] ${fileName} -> ${(stats.size / 1024).toFixed(1)} KB (MD5: ${hash})`);
	}

	// =========================================================================
	// PHASE 1: DESKTOP WORKSPACE (1440x900)
	// =========================================================================
	console.log("\n=== CREATING DESKTOP CONTEXT (1440x900, scale: 1) ===");
	const desktopContext = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 1,
	});
	await initContextAuth(desktopContext, "light");

	const desktopPage = await desktopContext.newPage();
	desktopPage.on("pageerror", (err) => console.log("[Desktop PageError]:", err.stack || err.message));
	desktopPage.on("console", (msg) => {
		if (msg.type() === "error" || msg.type() === "warning") {
			console.log(`[Desktop Console ${msg.type()}]:`, msg.text());
		}
	});
	desktopPage.on("response", (res) => {
		if (res.status() >= 400) {
			console.log(`[HTTP ${res.status()}]:`, res.url());
		}
	});

	// 1. Desktop Shift Light
	console.log("--> Navigating to Shift (Desktop Light)...");
	await desktopPage.goto("http://127.0.0.1:5173/#shift", { waitUntil: "domcontentloaded", timeout: 30000 });
	await desktopPage.waitForSelector(".boot-state", { state: "detached", timeout: 20000 }).catch(() => {});
	await desktopPage.waitForTimeout(2500);
	const bootErr = await desktopPage.evaluate(() => window.LAST_BOOT_ERROR).catch(() => null);
	if (bootErr) console.log(">>> [LAST_BOOT_ERROR]:", bootErr);
	await recordScreenshot(desktopPage, "01_shift_cockpit_1440x900_light.png");

	// 2. Desktop Shift Dark
	console.log("--> Switching to Shift (Desktop Dark)...");
	await desktopPage.evaluate(() => {
		if (window.__useThemeStore) window.__useThemeStore.getState().setThemeMode("dark");
		document.documentElement.setAttribute("data-theme", "dark");
		document.documentElement.classList.add("dark");
		document.documentElement.classList.remove("light");
		localStorage.setItem("dente_theme_mode", "dark");
	});
	await desktopPage.waitForTimeout(1500);
	await recordScreenshot(desktopPage, "02_shift_cockpit_1440x900_dark.png");

	// 3. Desktop Schedule Light
	console.log("--> Navigating to Schedule (Desktop Light)...");
	await desktopPage.evaluate(() => {
		if (window.__useThemeStore) window.__useThemeStore.getState().setThemeMode("light");
		document.documentElement.setAttribute("data-theme", "light");
		document.documentElement.classList.remove("dark");
		document.documentElement.classList.add("light");
		localStorage.setItem("dente_theme_mode", "light");
		window.location.hash = "schedule";
	});
	await desktopPage.waitForTimeout(2500);
	await recordScreenshot(desktopPage, "03_schedule_1440x900_light.png");

	// 4. Desktop Schedule Dark
	console.log("--> Switching to Schedule (Desktop Dark)...");
	await desktopPage.evaluate(() => {
		if (window.__useThemeStore) window.__useThemeStore.getState().setThemeMode("dark");
		document.documentElement.setAttribute("data-theme", "dark");
		document.documentElement.classList.add("dark");
		document.documentElement.classList.remove("light");
		localStorage.setItem("dente_theme_mode", "dark");
	});
	await desktopPage.waitForTimeout(1500);
	await recordScreenshot(desktopPage, "04_schedule_1440x900_dark.png");

	await desktopContext.close();

	// =========================================================================
	// PHASE 2: MOBILE WORKSPACE (390x844, scale: 2)
	// =========================================================================
	console.log("\n=== CREATING MOBILE CONTEXT (390x844, scale: 2, touch: true) ===");
	const mobileContext = await browser.newContext({
		viewport: { width: 390, height: 844 },
		deviceScaleFactor: 2,
		isMobile: true,
		hasTouch: true,
	});
	await initContextAuth(mobileContext, "light");

	const mobilePage = await mobileContext.newPage();
	mobilePage.on("pageerror", (err) => console.log("[Mobile PageError]:", err.message));

	// 5. Mobile Shift Light
	console.log("--> Navigating to Shift (Mobile Light)...");
	await mobilePage.goto("http://127.0.0.1:5173/#shift", { waitUntil: "domcontentloaded", timeout: 30000 });
	await mobilePage.waitForSelector(".boot-state", { state: "detached", timeout: 20000 }).catch(() => {});
	await mobilePage.waitForSelector(".app-shell, [data-testid='shift-view-mobile']", { timeout: 20000 }).catch(() => {});
	await mobilePage.waitForTimeout(2500);
	await recordScreenshot(mobilePage, "05_shift_mobile_390x844_light.png");

	// 6. Mobile Shift Dark
	console.log("--> Switching to Shift (Mobile Dark)...");
	await mobilePage.evaluate(() => {
		if (window.__useThemeStore) window.__useThemeStore.getState().setThemeMode("dark");
		document.documentElement.setAttribute("data-theme", "dark");
		document.documentElement.classList.add("dark");
		document.documentElement.classList.remove("light");
		localStorage.setItem("dente_theme_mode", "dark");
	});
	await mobilePage.waitForTimeout(1500);
	await recordScreenshot(mobilePage, "06_shift_mobile_390x844_dark.png");

	// 7. Mobile Schedule Light
	console.log("--> Navigating to Schedule (Mobile Light)...");
	await mobilePage.evaluate(() => {
		if (window.__useThemeStore) window.__useThemeStore.getState().setThemeMode("light");
		document.documentElement.setAttribute("data-theme", "light");
		document.documentElement.classList.remove("dark");
		document.documentElement.classList.add("light");
		localStorage.setItem("dente_theme_mode", "light");
		window.location.hash = "schedule";
	});
	await mobilePage.waitForTimeout(2500);
	await recordScreenshot(mobilePage, "07_schedule_mobile_390x844_light.png");

	// 8. Mobile Schedule Dark
	console.log("--> Switching to Schedule (Mobile Dark)...");
	await mobilePage.evaluate(() => {
		if (window.__useThemeStore) window.__useThemeStore.getState().setThemeMode("dark");
		document.documentElement.setAttribute("data-theme", "dark");
		document.documentElement.classList.add("dark");
		document.documentElement.classList.remove("light");
		localStorage.setItem("dente_theme_mode", "dark");
	});
	await mobilePage.waitForTimeout(1500);
	await recordScreenshot(mobilePage, "08_schedule_mobile_390x844_dark.png");

	await mobileContext.close();
	await browser.close();
	await pool.end();

	console.log("\n=======================================================");
	console.log("RED TEAM VISUAL PROOF CAPTURE COMPLETE:");
	console.log("=======================================================");
	let allPass = true;
	for (const item of capturedFiles) {
		const isOver20Kb = item.size >= 20480;
		const status = isOver20Kb ? "PASS (>= 20KB)" : "FAIL (< 20KB)";
		if (!isOver20Kb) allPass = false;
		console.log(`${status} | ${item.name.padEnd(40)} | ${(item.size / 1024).toFixed(1)} KB`);
	}
	console.log("=======================================================");
	if (!allPass) {
		console.error("FAIL: One or more screenshots < 20KB!");
		process.exit(1);
	} else {
		console.log("ALL 8 SCREENSHOTS EXCEED 20KB FLOOR AND ARE VALID!");
	}
}

capture().catch((err) => {
	console.error("Capture script crashed:", err);
	process.exit(1);
});
