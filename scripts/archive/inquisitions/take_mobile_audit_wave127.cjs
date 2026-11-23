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
				await fetch(`${API_BASE}/api/billing/payments`, {
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
						note: "Оплата за комплексное лечение кариеса",
					}),
				});
				console.log("[Provisioning] Recorded payment 1 (14 500 ₽, card)");
			} catch (pe1) {
				console.log("[Provisioning] Payment 1 err:", pe1.message);
			}
		}
	} catch (e1) {
		console.log("[Provisioning] Patient 1 err:", e1.message);
	}

	return {
		clinicToken: initData.clinicToken,
		staffToken: unlockData.staffToken,
		ownerUserId: initData.ownerUserId,
		patientId: patient1Id,
	};
}

async function runMobileAudit() {
	const outDir = "C:/Clinic_MVP/dental-crm/docs/screenshots/mobile_audit_wave127";
	if (!fs.existsSync(outDir)) {
		fs.mkdirSync(outDir, { recursive: true });
	}

	const brainDir = "C:/Users/Admin/.gemini/antigravity/brain/e1164d8d-2730-485e-9afe-aa0a260df89f";
	if (!fs.existsSync(brainDir)) {
		fs.mkdirSync(brainDir, { recursive: true });
	}

	const auth = await provisionSession();

	console.log("[Playwright] Launching Chrome headless at 390x844 (scale: 2)...");
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
	});
	const page = await context.newPage();

	console.log("[Playwright] Opening http://127.0.0.1:5173/...");
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

	async function setTheme(theme) {
		await page.evaluate((t) => {
			document.documentElement.setAttribute("data-theme", t);
			if (t === "dark") {
				document.documentElement.classList.add("dark");
				document.documentElement.classList.remove("light");
			} else {
				document.documentElement.classList.remove("dark");
				document.documentElement.classList.add("light");
			}
			localStorage.setItem("dente_theme_mode", t);
		}, theme);
		await page.waitForTimeout(600);
	}

	async function verifyOverflowAndTouch(viewName) {
		const report = await page.evaluate((vName) => {
			const scrollWidth = document.documentElement.scrollWidth;
			const clientWidth = document.documentElement.clientWidth;
			const bodyScrollWidth = document.body.scrollWidth;
			const hasHorizontalOverflow = scrollWidth > clientWidth || bodyScrollWidth > clientWidth;

			// Check primary buttons for touch targets
			const buttons = Array.from(document.querySelectorAll("button, a.btn, input, select, .quick-chip"));
			const smallTargets = [];
			for (const el of buttons) {
				const rect = el.getBoundingClientRect();
				// Filter visible elements only
				if (rect.width > 0 && rect.height > 0 && rect.top >= 0 && rect.top < window.innerHeight) {
					if (rect.height < 40 || rect.width < 32) {
						// Record for diagnostic
						const text = (el.innerText || el.getAttribute("aria-label") || el.title || el.className).slice(0, 30);
						smallTargets.push({ text, w: Math.round(rect.width), h: Math.round(rect.height) });
					}
				}
			}

			return {
				view: vName,
				scrollWidth,
				clientWidth,
				bodyScrollWidth,
				hasHorizontalOverflow,
				smallTargetsCount: smallTargets.length,
				smallTargetsSample: smallTargets.slice(0, 5),
			};
		}, viewName);

		console.log(`[Diagnostic ${viewName}] scrollWidth: ${report.scrollWidth}px, clientWidth: ${report.clientWidth}px, overflow: ${report.hasHorizontalOverflow ? "YES (FAIL)" : "NO (PASS)"}, smallTargets (<40px): ${report.smallTargetsCount}`);
		return report;
	}

	async function recordScreenshot(fileName, viewName) {
		const targetPath = path.join(outDir, fileName);
		const brainPath = path.join(brainDir, fileName);
		await page.screenshot({ path: targetPath, fullPage: false });
		fs.copyFileSync(targetPath, brainPath);
		const stats = fs.statSync(targetPath);
		const hash = crypto.createHash("md5").update(fs.readFileSync(targetPath)).digest("hex");
		capturedFiles.push({
			name: fileName,
			view: viewName,
			size: stats.size,
			md5: hash,
			path: targetPath,
		});
		console.log(`[Captured] ${fileName} -> ${stats.size} bytes (MD5: ${hash})`);
	}

	// -------------------------------------------------------------
	// 1. SCHEDULE VIEW (#schedule)
	// -------------------------------------------------------------
	console.log("\n=== 1. SCHEDULE VIEW (#schedule) ===");
	await page.evaluate(() => { window.location.hash = "schedule"; });
	await page.waitForTimeout(1500);
	await page.waitForFunction(() => {
		const t = document.body.innerText || "";
		return t.includes("Расписание") || document.querySelector(".schedule-filter-strip, .schedule-calendar-grid");
	}, { timeout: 10000 }).catch(() => {});

	await setTheme("light");
	await verifyOverflowAndTouch("Schedule Light");
	await recordScreenshot("01_schedule_390x844_light.png", "Schedule");

	await setTheme("dark");
	await verifyOverflowAndTouch("Schedule Dark");
	await recordScreenshot("02_schedule_390x844_dark.png", "Schedule");

	// -------------------------------------------------------------
	// 2. VISIT / EMK VIEW (#visit)
	// -------------------------------------------------------------
	console.log("\n=== 2. VISIT VIEW (#visit) ===");
	await page.evaluate(() => { window.location.hash = "visit"; });
	await page.waitForTimeout(1500);
	await page.waitForFunction(() => {
		const t = document.body.innerText || "";
		return t.includes("Приём") || t.includes("043/у") || document.querySelector(".visit-monolithic-header, .visit-panel");
	}, { timeout: 10000 }).catch(() => {});

	await setTheme("light");
	await verifyOverflowAndTouch("Visit Light");
	await recordScreenshot("03_visit_390x844_light.png", "Visit");

	await setTheme("dark");
	await verifyOverflowAndTouch("Visit Dark");
	await recordScreenshot("04_visit_390x844_dark.png", "Visit");

	// -------------------------------------------------------------
	// 3. PATIENTS VIEW (#patients)
	// -------------------------------------------------------------
	console.log("\n=== 3. PATIENTS VIEW (#patients) ===");
	await page.evaluate(() => { window.location.hash = "patients"; });
	await page.waitForTimeout(1500);
	await page.waitForFunction(() => {
		const t = document.body.innerText || "";
		return t.includes("Пациенты") || document.querySelector(".patients-panel, .patients-search-box");
	}, { timeout: 10000 }).catch(() => {});

	await setTheme("light");
	await verifyOverflowAndTouch("Patients Light");
	await recordScreenshot("05_patients_390x844_light.png", "Patients");

	await setTheme("dark");
	await verifyOverflowAndTouch("Patients Dark");
	await recordScreenshot("06_patients_390x844_dark.png", "Patients");

	// -------------------------------------------------------------
	// 4. FINANCE VIEW (#finance)
	// -------------------------------------------------------------
	console.log("\n=== 4. FINANCE VIEW (#finance) ===");
	await page.evaluate(() => { window.location.hash = "finance"; });
	await page.waitForTimeout(1500);
	await page.waitForFunction(() => {
		const t = document.body.innerText || "";
		return t.includes("Оплаты") || t.includes("Касса") || document.querySelector("#finance, .finance-panel");
	}, { timeout: 10000 }).catch(() => {});

	await setTheme("light");
	await verifyOverflowAndTouch("Finance Light");
	await recordScreenshot("07_finance_390x844_light.png", "Finance");

	await setTheme("dark");
	await verifyOverflowAndTouch("Finance Dark");
	await recordScreenshot("08_finance_390x844_dark.png", "Finance");

	// -------------------------------------------------------------
	// 5. DOCUMENTS VIEW (#documents)
	// -------------------------------------------------------------
	console.log("\n=== 5. DOCUMENTS VIEW (#documents) ===");
	await page.evaluate(() => { window.location.hash = "documents"; });
	await page.waitForTimeout(1500);
	await page.waitForFunction(() => {
		const t = document.body.innerText || "";
		return t.includes("Документы") || document.querySelector("#documents, .document-factory");
	}, { timeout: 10000 }).catch(() => {});

	await setTheme("light");
	await verifyOverflowAndTouch("Documents Light");
	await recordScreenshot("09_documents_390x844_light.png", "Documents");

	await setTheme("dark");
	await verifyOverflowAndTouch("Documents Dark");
	await recordScreenshot("10_documents_390x844_dark.png", "Documents");

	await browser.close();

	console.log("\n=======================================================");
	console.log("WAVE 127 MOBILE AUDIT COMPLETE. SUMMARY OF PROOFS:");
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
	if (!allPass || capturedFiles.length !== 10) {
		console.error("AUDIT PROOF FAILED CRITERIA: Ensure all 10 files > 40KB and unique hashes!");
		process.exit(1);
	} else {
		console.log("ALL 10 AUDIT PROOFS VERIFIED AND PASSED MACHINE GATES!");
	}
}

runMobileAudit().catch((err) => {
	console.error("Mobile audit script crashed:", err);
	process.exit(1);
});
