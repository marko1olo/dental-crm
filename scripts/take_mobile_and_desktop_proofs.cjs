const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

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
				notes: "Аллергия на пенициллин",
			}),
		});
		if (p1Res.ok) {
			const p1Data = await p1Res.json();
			patient1Id = p1Data.id;
			console.log(`[Provisioning] Created patient 1: ${patient1Id} (${p1Data.fullName})`);

			// Sample appointment for patient 1
			try {
				const chairsRes = await fetch(`${API_BASE}/api/chairs`, { headers });
				let chairId = "chair-1";
				if (chairsRes.ok) {
					const chList = await chairsRes.json();
					if (Array.isArray(chList) && chList.length > 0) chairId = chList[0].id;
				}
				const now = new Date();
				const startsAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0);
				const endsAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 0, 0);
				await fetch(`${API_BASE}/api/appointments`, {
					method: "POST",
					headers,
					body: JSON.stringify({
						patientId: patient1Id,
						doctorUserId: initData.ownerUserId,
						chairId,
						status: "in_treatment",
						startsAt: startsAt.toISOString(),
						endsAt: endsAt.toISOString(),
						reason: "Лечение кариеса 1.6",
					}),
				});
				console.log("[Provisioning] Created in_treatment appointment for patient 1");
			} catch (ae) {
				console.log("[Provisioning] Appointment note:", ae.message);
			}

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
				notes: "Соматически здорова / норма",
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

	return {
		clinicToken: initData.clinicToken,
		staffToken: unlockData.staffToken,
		ownerUserId: initData.ownerUserId,
		patientId: patient1Id,
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

	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
	});
	const page = await context.newPage();

	console.log("[Playwright] Navigating to http://127.0.0.1:5173/...");
	await page.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded", timeout: 15000 });

	// Inject authenticated tokens and dismiss onboarding completely
	await page.evaluate(({ ct, st, uid, pid }) => {
		localStorage.setItem("dente_clinic_token", ct);
		localStorage.setItem("dente_staff_token", st);
		localStorage.setItem("dente_active_role", "owner");
		localStorage.setItem("dente_theme_mode", "light");
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
	}, { ct: auth.clinicToken, st: auth.staffToken, uid: auth.ownerUserId, pid: auth.patientId });

	const capturedFiles = [];

	async function recordScreenshot(fileName) {
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

	// ==========================================
	// SECTION 1: «Расписание» (Schedule View)
	// ==========================================
	console.log("\n--- NAVIGATING TO SCHEDULE VIEW via window.location.hash = 'schedule' ---");
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.evaluate(() => {
		window.location.hash = "schedule";
	});
	await page.waitForTimeout(2000);

	const scheduleFound = await page.$("#schedule, .schedule-panel, .schedule-view");
	if (!scheduleFound) {
		console.log("Locating Schedule nav item click fallback...");
		const navSchedule = await page.$("a[href='#schedule'], button:has-text('Расписание'), .nav-item[href='#schedule']");
		if (navSchedule) {
			await navSchedule.click();
			await page.waitForTimeout(2000);
		}
	}

	try {
		await page.waitForFunction(() => {
			const text = document.body.innerText || "";
			return (
				!text.includes("Подготовка модулей расписания") &&
				(text.includes("КРЕСЛО") || text.includes("Записать первого пациента") || text.includes("Все записи") || text.includes("Расписание") || document.querySelector(".schedule-grid, .schedule-view"))
			);
		}, { timeout: 15000 });
	} catch (se) {
		console.log("Schedule wait warning:", se.message);
	}
	await page.waitForTimeout(1500);

	// 1. 01_schedule_1440x900_light.png
	await page.evaluate(() => {
		document.documentElement.setAttribute("data-theme", "light");
		document.documentElement.classList.remove("dark");
		document.documentElement.classList.add("light");
		localStorage.setItem("dente_theme_mode", "light");
	});
	await page.waitForTimeout(1500);
	await recordScreenshot("01_schedule_1440x900_light.png");

	// 2. 02_schedule_1440x900_dark.png
	await page.evaluate(() => {
		document.documentElement.setAttribute("data-theme", "dark");
		document.documentElement.classList.add("dark");
		document.documentElement.classList.remove("light");
		localStorage.setItem("dente_theme_mode", "dark");
	});
	await page.waitForTimeout(1500);
	await recordScreenshot("02_schedule_1440x900_dark.png");

	// 3. 03_schedule_390x844_mobile_light.png
	await page.setViewportSize({ width: 390, height: 844 });
	await page.evaluate(() => {
		document.documentElement.setAttribute("data-theme", "light");
		document.documentElement.classList.remove("dark");
		document.documentElement.classList.add("light");
		localStorage.setItem("dente_theme_mode", "light");
	});
	await page.waitForTimeout(1500);
	await recordScreenshot("03_schedule_390x844_mobile_light.png");

	// 4. 04_schedule_390x844_mobile_dark.png
	await page.evaluate(() => {
		document.documentElement.setAttribute("data-theme", "dark");
		document.documentElement.classList.add("dark");
		document.documentElement.classList.remove("light");
		localStorage.setItem("dente_theme_mode", "dark");
	});
	await page.waitForTimeout(1500);
	await recordScreenshot("04_schedule_390x844_mobile_dark.png");

	// ==========================================
	// SECTION 2: «Оплаты» (Finance View / Касса 54-ФЗ)
	// ==========================================
	console.log("\n--- NAVIGATING TO FINANCE VIEW via window.location.hash = 'finance' ---");
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.evaluate(() => {
		window.location.hash = "finance";
	});
	await page.waitForTimeout(2000);

	const financeFound = await page.$("#finance, .finance-panel, .finance-view");
	if (!financeFound) {
		console.log("Locating Finance nav item click fallback...");
		const navFinance = await page.$("a[href='#finance'], button:has-text('Оплаты'), .nav-item[href='#finance']");
		if (navFinance) {
			await navFinance.click();
			await page.waitForTimeout(2000);
		}
	}

	try {
		await page.waitForFunction(() => {
			const text = document.body.innerText || "";
			return text.includes("Оплаты") || text.includes("Касса") || text.includes("вычет") || document.querySelector("#finance, .finance-panel");
		}, { timeout: 15000 });
	} catch (fe) {
		console.log("Finance wait warning:", fe.message);
	}
	await page.waitForTimeout(1500);

	// 5. 05_finance_1440x900_light.png
	await page.evaluate(() => {
		document.documentElement.setAttribute("data-theme", "light");
		document.documentElement.classList.remove("dark");
		document.documentElement.classList.add("light");
		localStorage.setItem("dente_theme_mode", "light");
	});
	await page.waitForTimeout(1500);
	await recordScreenshot("05_finance_1440x900_light.png");

	// 6. 06_finance_1440x900_dark.png
	await page.evaluate(() => {
		document.documentElement.setAttribute("data-theme", "dark");
		document.documentElement.classList.add("dark");
		document.documentElement.classList.remove("light");
		localStorage.setItem("dente_theme_mode", "dark");
	});
	await page.waitForTimeout(1500);
	await recordScreenshot("06_finance_1440x900_dark.png");

	// 7. 07_finance_390x844_mobile_light.png
	await page.setViewportSize({ width: 390, height: 844 });
	await page.evaluate(() => {
		document.documentElement.setAttribute("data-theme", "light");
		document.documentElement.classList.remove("dark");
		document.documentElement.classList.add("light");
		localStorage.setItem("dente_theme_mode", "light");
	});
	await page.waitForTimeout(1500);
	await recordScreenshot("07_finance_390x844_mobile_light.png");

	// 8. 08_finance_390x844_mobile_dark.png
	await page.evaluate(() => {
		document.documentElement.setAttribute("data-theme", "dark");
		document.documentElement.classList.add("dark");
		document.documentElement.classList.remove("light");
		localStorage.setItem("dente_theme_mode", "dark");
	});
	await page.waitForTimeout(1500);
	await recordScreenshot("08_finance_390x844_mobile_dark.png");

	await browser.close();

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
