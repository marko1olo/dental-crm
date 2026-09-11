const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");
const { Pool } = require("pg");

const pool = new Pool({
	connectionString: process.env.DATABASE_URL || "postgres://dental@127.0.0.1:5432/dental_crm",
});

async function provisionSession() {
	const API_BASE = "http://127.0.0.1:4100";
	const uniqueId = Date.now();
	console.log("[Provisioning] Initializing clean clinic session via API...");
	const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			clinicName: "Стоматология ДЕНТЕ Плюс",
			email: `doctor-${uniqueId}@dente.local`,
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

	// Seed clinic and chair directly into PostgreSQL so foreign keys & checks are valid
	const clinicId = crypto.randomUUID();
	const chairId = crypto.randomUUID();
	await pool.query(
		`INSERT INTO clinics (id, organization_id, name, timezone) VALUES ($1, $2, $3, $4)`,
		[clinicId, orgId, "Стоматология ДЕНТЕ Плюс", "Europe/Samara"]
	);
	await pool.query(
		`INSERT INTO chairs (id, organization_id, clinic_id, name, is_active) VALUES ($1, $2, $3, $4, true)`,
		[chairId, orgId, clinicId, "Кресло 1 (Терапия/Хирургия)"]
	);
	console.log(`[Provisioning] Seeded clinic ${clinicId} and chair ${chairId} into PostgreSQL`);

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

	let patient1Id = null;
	let patient2Id = null;

	// Patient 1
	try {
		const p1Res = await fetch(`${API_BASE}/api/patients`, {
			method: "POST",
			headers,
			body: JSON.stringify({
				fullName: "Алексеев Владимир Сергеевич",
				phone: "+7 (999) 111-22-33",
				birthDate: "1988-05-14",
				notes: "Аллергия на пенициллин. План лечения согласован.",
			}),
		});
		if (p1Res.ok) {
			const p1Data = await p1Res.json();
			patient1Id = p1Data.id;
			console.log(`[Provisioning] Created patient 1: ${patient1Id} (${p1Data.fullName})`);

			// Sample payment 1
			try {
				const pay1Res = await fetch(`${API_BASE}/api/billing/payments`, {
					method: "POST",
					headers: {
						...headers,
						"Idempotency-Key": `pay-${uniqueId}-1`,
					},
					body: JSON.stringify({
						patientId: patient1Id,
						amountRub: 14500,
						method: "card",
						clientMutationId: crypto.randomUUID(),
						fiscalReceiptNumber: "ФЧ-000421",
						fiscalReceiptIssuedAt: new Date().toISOString(),
						note: "Оплата за комплексное лечение кариеса 1.6",
					}),
				});
				if (pay1Res.ok) {
					console.log("[Provisioning] Recorded payment 1 (14 500 ₽, card)");
				}
			} catch (pe1) {
				console.log("[Provisioning] Payment 1 err:", pe1.message);
			}

			// Sample payment 3
			try {
				const pay3Res = await fetch(`${API_BASE}/api/billing/payments`, {
					method: "POST",
					headers: {
						...headers,
						"Idempotency-Key": `pay-${uniqueId}-3`,
					},
					body: JSON.stringify({
						patientId: patient1Id,
						amountRub: 35000,
						method: "card",
						clientMutationId: crypto.randomUUID(),
						fiscalReceiptNumber: "ФЧ-000423",
						fiscalReceiptIssuedAt: new Date().toISOString(),
						note: "Имплантация Nobel Biocare 4.6",
					}),
				});
				if (pay3Res.ok) {
					console.log("[Provisioning] Recorded payment 3 (35 000 ₽, card)");
				}
			} catch (pe3) {
				console.log("[Provisioning] Payment 3 err:", pe3.message);
			}
		}
	} catch (e1) {
		console.log("[Provisioning] Patient 1 err:", e1.message);
	}

	// Patient 2
	try {
		const p2Res = await fetch(`${API_BASE}/api/patients`, {
			method: "POST",
			headers,
			body: JSON.stringify({
				fullName: "Смирнова Елена Васильевна",
				phone: "+7 (916) 234-56-78",
				birthDate: "1992-11-20",
				notes: "Соматически здорова / норма. Первичный приём.",
			}),
		});
		if (p2Res.ok) {
			const p2Data = await p2Res.json();
			patient2Id = p2Data.id;
			console.log(`[Provisioning] Created patient 2: ${patient2Id} (${p2Data.fullName})`);

			// Sample payment 2
			try {
				const pay2Res = await fetch(`${API_BASE}/api/billing/payments`, {
					method: "POST",
					headers: {
						...headers,
						"Idempotency-Key": `pay-${uniqueId}-2`,
					},
					body: JSON.stringify({
						patientId: patient2Id,
						amountRub: 8200,
						method: "cash",
						clientMutationId: crypto.randomUUID(),
						fiscalReceiptNumber: "ФЧ-000422",
						fiscalReceiptIssuedAt: new Date().toISOString(),
						note: "Аванс за профессиональную гигиену",
					}),
				});
				if (pay2Res.ok) {
					console.log("[Provisioning] Recorded payment 2 (8 200 ₽, cash)");
				}
			} catch (pe2) {
				console.log("[Provisioning] Payment 2 err:", pe2.message);
			}
		}
	} catch (e2) {
		console.log("[Provisioning] Patient 2 err:", e2.message);
	}

	// Seed multiple appointments across today and tomorrow so schedule is rich
	const today = new Date();
	const tomorrow = new Date();
	tomorrow.setDate(today.getDate() + 1);

	const apptDates = [today, tomorrow];
	for (const d of apptDates) {
		const y = d.getFullYear();
		const m = d.getMonth();
		const day = d.getDate();

		// Appt 1
		try {
			const s1 = new Date(y, m, day, 9, 30, 0);
			const e1 = new Date(y, m, day, 10, 30, 0);
			const res = await fetch(`${API_BASE}/api/appointments`, {
				method: "POST",
				headers,
				body: JSON.stringify({
					patientId: patient1Id,
					doctorUserId: initData.ownerUserId,
					chairId,
					status: "in_treatment",
					startsAt: s1.toISOString(),
					endsAt: e1.toISOString(),
					reason: "Лечение кариеса 1.6, реставрация Ceram.X",
				}),
			});
			console.log(`[Provisioning] Appt 1 (${day}.${m+1}): HTTP ${res.status}`);
		} catch (e) {
			console.log("[Provisioning] Appt 1 err:", e.message);
		}

		// Appt 2
		try {
			const s2 = new Date(y, m, day, 11, 0, 0);
			const e2 = new Date(y, m, day, 12, 0, 0);
			const res = await fetch(`${API_BASE}/api/appointments`, {
				method: "POST",
				headers,
				body: JSON.stringify({
					patientId: patient2Id,
					doctorUserId: initData.ownerUserId,
					chairId,
					status: "planned",
					startsAt: s2.toISOString(),
					endsAt: e2.toISOString(),
					reason: "Профессиональная гигиена и AirFlow",
				}),
			});
			console.log(`[Provisioning] Appt 2 (${day}.${m+1}): HTTP ${res.status}`);
		} catch (e) {
			console.log("[Provisioning] Appt 2 err:", e.message);
		}

		// Appt 3
		try {
			const s3 = new Date(y, m, day, 13, 0, 0);
			const e3 = new Date(y, m, day, 14, 30, 0);
			const res = await fetch(`${API_BASE}/api/appointments`, {
				method: "POST",
				headers,
				body: JSON.stringify({
					patientId: patient1Id,
					doctorUserId: initData.ownerUserId,
					chairId,
					status: "confirmed",
					startsAt: s3.toISOString(),
					endsAt: e3.toISOString(),
					reason: "Имплантация Nobel Biocare 4.6",
				}),
			});
			console.log(`[Provisioning] Appt 3 (${day}.${m+1}): HTTP ${res.status}`);
		} catch (e) {
			console.log("[Provisioning] Appt 3 err:", e.message);
		}
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
	const outDir = "C:/Clinic_MVP/dental-crm/docs/screenshots/inquisition_live";
	if (!fs.existsSync(outDir)) {
		fs.mkdirSync(outDir, { recursive: true });
	}

	const parentBrainDir = "C:/Users/Admin/.gemini/antigravity/brain/e1164d8d-2730-485e-9afe-aa0a260df89f";
	if (!fs.existsSync(parentBrainDir)) {
		fs.mkdirSync(parentBrainDir, { recursive: true });
	}

	const selfBrainDir = "C:/Users/Admin/.gemini/antigravity/brain/402bcc55-03b2-4a23-abe1-e5586822d888";
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

	async function setupPageAuth(page, theme) {
		await page.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded", timeout: 15000 });
		await page.evaluate(({ ct, st, uid, pid, themeMode }) => {
			localStorage.setItem("dente_clinic_token", ct);
			localStorage.setItem("dente_staff_token", st);
			localStorage.setItem("dente_active_role", "owner");
			localStorage.setItem("dente_theme_mode", themeMode);
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
						clinicName: "Стоматология ДЕНТЕ Плюс",
						currentDoctor: { id: uid, fullName: "Д-р Смирнов А. В.", role: "owner" },
						flags: { disableTour: true },
					},
				})
			);
			document.documentElement.setAttribute("data-theme", themeMode);
			if (themeMode === "dark") {
				document.documentElement.classList.add("dark");
				document.documentElement.classList.remove("light");
			} else {
				document.documentElement.classList.remove("dark");
				document.documentElement.classList.add("light");
			}
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
		console.log(`[Captured] ${fileName} -> ${stats.size} bytes (MD5: ${hash})`);
	}

	// =========================================================================
	// PHASE 1: DESKTOP WORKSPACE (1440x900)
	// =========================================================================
	console.log("\n=== CREATING DESKTOP CONTEXT (1440x900, scale: 1) ===");
	const desktopContext = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 1,
	});
	const desktopPage = await desktopContext.newPage();

	// 1. Desktop Schedule Light
	console.log("--> Navigating to Schedule (Desktop Light)...");
	await setupPageAuth(desktopPage, "light");
	await desktopPage.evaluate(() => { window.location.hash = "schedule"; });
	await desktopPage.waitForTimeout(2000);
	await desktopPage.waitForFunction(() => {
		const text = document.body.innerText || "";
		return text.includes("Расписание") || text.includes("КРЕСЛО") || document.querySelector(".schedule-grid, .schedule-view, #schedule");
	}, { timeout: 15000 }).catch(() => {});
	await desktopPage.waitForTimeout(1000);
	await recordScreenshot(desktopPage, "01_schedule_1440x900_light.png");

	// 2. Desktop Schedule Dark
	console.log("--> Switching to Schedule (Desktop Dark)...");
	await desktopPage.evaluate(() => {
		document.documentElement.setAttribute("data-theme", "dark");
		document.documentElement.classList.add("dark");
		document.documentElement.classList.remove("light");
		localStorage.setItem("dente_theme_mode", "dark");
		if (window.__useThemeStore) {
			window.__useThemeStore.getState().setThemeMode("dark");
		}
	});
	await desktopPage.waitForTimeout(1500);
	await recordScreenshot(desktopPage, "02_schedule_1440x900_dark.png");

	// 5. Desktop Finance Light
	console.log("--> Navigating to Finance (Desktop Light)...");
	await desktopPage.evaluate(() => {
		document.documentElement.setAttribute("data-theme", "light");
		document.documentElement.classList.remove("dark");
		document.documentElement.classList.add("light");
		localStorage.setItem("dente_theme_mode", "light");
		if (window.__useThemeStore) {
			window.__useThemeStore.getState().setThemeMode("light");
		}
		window.location.hash = "finance";
	});
	await desktopPage.waitForTimeout(2000);
	await desktopPage.waitForFunction(() => {
		const text = document.body.innerText || "";
		return text.includes("Оплаты") || text.includes("Касса") || document.querySelector("#finance, .finance-panel");
	}, { timeout: 15000 }).catch(() => {});
	await desktopPage.waitForTimeout(1000);
	await recordScreenshot(desktopPage, "05_finance_1440x900_light.png");

	// 6. Desktop Finance Dark
	console.log("--> Switching to Finance (Desktop Dark)...");
	await desktopPage.evaluate(() => {
		document.documentElement.setAttribute("data-theme", "dark");
		document.documentElement.classList.add("dark");
		document.documentElement.classList.remove("light");
		localStorage.setItem("dente_theme_mode", "dark");
		if (window.__useThemeStore) {
			window.__useThemeStore.getState().setThemeMode("dark");
		}
	});
	await desktopPage.waitForTimeout(1500);
	await recordScreenshot(desktopPage, "06_finance_1440x900_dark.png");

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
	const mobilePage = await mobileContext.newPage();

	// 3. Mobile Schedule Light
	console.log("--> Navigating to Schedule (Mobile Light)...");
	await setupPageAuth(mobilePage, "light");
	await mobilePage.evaluate(() => { window.location.hash = "schedule"; });
	await mobilePage.waitForTimeout(2000);
	await mobilePage.waitForFunction(() => {
		const text = document.body.innerText || "";
		return text.includes("Расписание") || text.includes("КРЕСЛО") || document.querySelector(".schedule-grid, .schedule-view, #schedule");
	}, { timeout: 15000 }).catch(() => {});
	await mobilePage.waitForTimeout(1000);
	await recordScreenshot(mobilePage, "03_schedule_390x844_mobile_light.png");

	// 4. Mobile Schedule Dark
	console.log("--> Switching to Schedule (Mobile Dark)...");
	await mobilePage.evaluate(() => {
		document.documentElement.setAttribute("data-theme", "dark");
		document.documentElement.classList.add("dark");
		document.documentElement.classList.remove("light");
		localStorage.setItem("dente_theme_mode", "dark");
		if (window.__useThemeStore) {
			window.__useThemeStore.getState().setThemeMode("dark");
		}
	});
	await mobilePage.waitForTimeout(1500);
	await recordScreenshot(mobilePage, "04_schedule_390x844_mobile_dark.png");

	// 7. Mobile Finance Light
	console.log("--> Navigating to Finance (Mobile Light)...");
	await mobilePage.evaluate(() => {
		document.documentElement.setAttribute("data-theme", "light");
		document.documentElement.classList.remove("dark");
		document.documentElement.classList.add("light");
		localStorage.setItem("dente_theme_mode", "light");
		if (window.__useThemeStore) {
			window.__useThemeStore.getState().setThemeMode("light");
		}
		window.location.hash = "finance";
	});
	await mobilePage.waitForTimeout(2000);
	await mobilePage.waitForFunction(() => {
		const text = document.body.innerText || "";
		return text.includes("Оплаты") || text.includes("Касса") || document.querySelector("#finance, .finance-panel");
	}, { timeout: 15000 }).catch(() => {});
	await mobilePage.waitForTimeout(1000);
	await recordScreenshot(mobilePage, "07_finance_390x844_mobile_light.png");

	// 8. Mobile Finance Dark
	console.log("--> Switching to Finance (Mobile Dark)...");
	await mobilePage.evaluate(() => {
		document.documentElement.setAttribute("data-theme", "dark");
		document.documentElement.classList.add("dark");
		document.documentElement.classList.remove("light");
		localStorage.setItem("dente_theme_mode", "dark");
		if (window.__useThemeStore) {
			window.__useThemeStore.getState().setThemeMode("dark");
		}
	});
	await mobilePage.waitForTimeout(1500);
	await recordScreenshot(mobilePage, "08_finance_390x844_mobile_dark.png");

	await mobileContext.close();
	await browser.close();
	await pool.end();

	console.log("\n=======================================================");
	console.log("LIVE AUDIT SCREEN CAPTURE COMPLETE. SUMMARY OF PROOFS:");
	console.log("=======================================================");
	let allPass = true;
	const hashes = new Set();
	for (const item of capturedFiles) {
		const isOver40Kb = item.size >= 40960;
		const isUnique = !hashes.has(item.md5);
		hashes.add(item.md5);
		const status = isOver40Kb && isUnique ? "PASS" : "FAIL";
		if (status === "FAIL") allPass = false;
		console.log(`${status} | ${item.name.padEnd(36)} | ${(item.size / 1024).toFixed(1)} KB (${item.size} bytes) | MD5: ${item.md5}`);
	}
	console.log("=======================================================");
	if (!allPass || capturedFiles.length !== 8) {
		console.error("AUDIT PROOF FAILED CRITERIA: Ensure all 8 files >= 40KB and unique hashes!");
		process.exit(1);
	} else {
		console.log("ALL 8 AUDIT PROOFS VERIFIED AND PASSED MACHINE GATES!");
	}
}

capture().catch((err) => {
	console.error("Audit capture script crashed:", err);
	process.exit(1);
});
