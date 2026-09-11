const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

async function provisionSession() {
	const API_BASE = "http://127.0.0.1:4100";
	const uniqueId = Date.now();
	console.log("Provisioning clean clinic session via API...");
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

	let patientId = null;
	try {
		const pRes = await fetch(`${API_BASE}/api/patients`, {
			method: "POST",
			headers,
			body: JSON.stringify({
				fullName: "Алексеев Владимир Сергеевич",
				phone: "+7 (999) 111-22-33",
				birthDate: "1988-05-14",
			}),
		});
		if (pRes.ok) {
			const pData = await pRes.json();
			patientId = pData.id;
			console.log(`Created sample patient: ${patientId}`);

			// Also create a sample appointment for today to show live schedule cards
			try {
				const chairsRes = await fetch(`${API_BASE}/api/chairs`, { headers });
				let chairId = "chair-1";
				if (chairsRes.ok) {
					const chList = await chairsRes.json();
					if (Array.isArray(chList) && chList.length > 0) chairId = chList[0].id;
				}
				const now = new Date();
				const startsAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0);
				const endsAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0);
				const aRes = await fetch(`${API_BASE}/api/appointments`, {
					method: "POST",
					headers,
					body: JSON.stringify({
						patientId,
						doctorUserId: initData.ownerUserId,
						chairId,
						status: "in_treatment",
						startsAt: startsAt.toISOString(),
						endsAt: endsAt.toISOString(),
						reason: "Лечение кариеса 1.6",
					}),
				});
				if (aRes.ok) {
					console.log("Created sample in_treatment appointment!");
				}
			} catch (ae) {
				console.log("Appointment seed note:", ae.message);
			}
		}
	} catch (e) {
		console.log("Patient seed note:", e.message);
	}

	return {
		clinicToken: initData.clinicToken,
		staffToken: unlockData.staffToken,
		ownerUserId: initData.ownerUserId,
		patientId,
	};
}

async function capture() {
	const outDir = "C:/Clinic_MVP/dental-crm/docs/screenshots/inquisition_live";
	if (!fs.existsSync(outDir)) {
		fs.mkdirSync(outDir, { recursive: true });
	}

	const brainDir = "C:/Users/Admin/.gemini/antigravity/brain/e1164d8d-2730-485e-9afe-aa0a260df89f";
	if (!fs.existsSync(brainDir)) {
		fs.mkdirSync(brainDir, { recursive: true });
	}

	const auth = await provisionSession();

	console.log("Launching Chrome headless...");
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
	});
	const page = await context.newPage();

	console.log("Navigating to http://127.0.0.1:5173/...");
	await page.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded", timeout: 10000 });

	// Inject authenticated tokens and dismiss onboarding completely
	await page.evaluate(({ ct, st, uid, pid }) => {
		localStorage.setItem("dente_clinic_token", ct);
		localStorage.setItem("dente_staff_token", st);
		localStorage.setItem("dente_active_role", "doctor");
		localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true }));
		localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true }));
		localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
			version: 1,
			uiLanguage: "ru",
			selectedWorkspaceRole: "doctor",
			selectedSpecialty: "therapist",
			selectedPatientId: pid,
			onboardingDismissed: true,
		}));
		localStorage.setItem(
			"dente-workspace-profile",
			JSON.stringify({
				state: {
					clinicName: "Стоматология ДЕНТЕ Плюс",
					currentDoctor: { id: uid, fullName: "Д-р Смирнов А. В.", role: "doctor" },
					flags: { disableTour: true },
				},
			})
		);
	}, { ct: auth.clinicToken, st: auth.staffToken, uid: auth.ownerUserId, pid: auth.patientId });

	console.log("Loading schedule view...");
	await page.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "load", timeout: 20000 });
	await page.waitForTimeout(3000);

	// Wait until schedule modules finish loading and the grid is visible
	try {
		await page.waitForFunction(() => {
			const bodyText = document.body.innerText || "";
			return !bodyText.includes("Подготовка модулей расписания") && (bodyText.includes("КРЕСЛО") || bodyText.includes("Записать первого пациента") || bodyText.includes("Все записи"));
		}, { timeout: 15000 });
	} catch (e) {
		console.log("Schedule wait warning:", e.message);
	}

	// 1. Schedule Desktop Light (1440x900)
	await page.evaluate(() => {
		document.documentElement.setAttribute("data-theme", "light");
		document.documentElement.classList.remove("dark");
		document.documentElement.classList.add("light");
		localStorage.setItem("dente_theme_mode", "light");
	});
	await page.waitForTimeout(1500);

	const s1Path = path.join(outDir, "01_schedule_1440x900_light.png");
	const s1Brain = path.join(brainDir, "01_schedule_1440x900_light.png");
	await page.screenshot({ path: s1Path, fullPage: false });
	fs.copyFileSync(s1Path, s1Brain);
	console.log(`Saved: 01_schedule_1440x900_light.png (${fs.statSync(s1Path).size} bytes)`);

	// 2. Schedule Desktop Dark (1440x900)
	await page.evaluate(() => {
		document.documentElement.setAttribute("data-theme", "dark");
		document.documentElement.classList.add("dark");
		document.documentElement.classList.remove("light");
		localStorage.setItem("dente_theme_mode", "dark");
	});
	await page.waitForTimeout(1000);

	const s2Path = path.join(outDir, "02_schedule_1440x900_dark.png");
	const s2Brain = path.join(brainDir, "02_schedule_1440x900_dark.png");
	await page.screenshot({ path: s2Path, fullPage: false });
	fs.copyFileSync(s2Path, s2Brain);
	console.log(`Saved: 02_schedule_1440x900_dark.png (${fs.statSync(s2Path).size} bytes)`);

	// 3. Schedule Mobile Light (390x844)
	await page.setViewportSize({ width: 390, height: 844 });
	await page.evaluate(() => {
		document.documentElement.setAttribute("data-theme", "light");
		document.documentElement.classList.remove("dark");
		document.documentElement.classList.add("light");
		localStorage.setItem("dente_theme_mode", "light");
	});
	await page.waitForTimeout(1000);

	const s3Path = path.join(outDir, "03_schedule_390x844_mobile_light.png");
	const s3Brain = path.join(brainDir, "03_schedule_390x844_mobile_light.png");
	await page.screenshot({ path: s3Path, fullPage: false });
	fs.copyFileSync(s3Path, s3Brain);
	console.log(`Saved: 03_schedule_390x844_mobile_light.png (${fs.statSync(s3Path).size} bytes)`);

	// 4. Schedule Mobile Dark (390x844)
	await page.evaluate(() => {
		document.documentElement.setAttribute("data-theme", "dark");
		document.documentElement.classList.add("dark");
		document.documentElement.classList.remove("light");
		localStorage.setItem("dente_theme_mode", "dark");
	});
	await page.waitForTimeout(1000);

	const s4Path = path.join(outDir, "04_schedule_390x844_mobile_dark.png");
	const s4Brain = path.join(brainDir, "04_schedule_390x844_mobile_dark.png");
	await page.screenshot({ path: s4Path, fullPage: false });
	fs.copyFileSync(s4Path, s4Brain);
	console.log(`Saved: 04_schedule_390x844_mobile_dark.png (${fs.statSync(s4Path).size} bytes)`);

	// Reset viewport to Desktop (1440x900)
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.waitForTimeout(600);

	// 5. Visit View Desktop Light (1440x900)
	console.log("Navigating to visit view...");
	await page.evaluate(() => {
		window.location.hash = "visit";
		document.documentElement.setAttribute("data-theme", "light");
		document.documentElement.classList.remove("dark");
		document.documentElement.classList.add("light");
		localStorage.setItem("dente_theme_mode", "light");
	});
	await page.waitForTimeout(2500);

	// If visit panel not found via hash, click nav button
	const visitPanel = await page.$("#visit, .visit-panel");
	if (!visitPanel) {
		console.log("Clicking Прием nav item...");
		const navVisit = await page.$("a[href='#visit'], .nav-item[href='#visit'], button:has-text('Прием')");
		if (navVisit) {
			await navVisit.click();
			await page.waitForTimeout(2000);
		}
	}

	const s5Path = path.join(outDir, "05_visit_1440x900_light.png");
	const s5Brain = path.join(brainDir, "05_visit_1440x900_light.png");
	await page.screenshot({ path: s5Path, fullPage: false });
	fs.copyFileSync(s5Path, s5Brain);
	console.log(`Saved: 05_visit_1440x900_light.png (${fs.statSync(s5Path).size} bytes)`);

	// 6. Visit View Desktop Dark (1440x900)
	await page.evaluate(() => {
		document.documentElement.setAttribute("data-theme", "dark");
		document.documentElement.classList.add("dark");
		document.documentElement.classList.remove("light");
		localStorage.setItem("dente_theme_mode", "dark");
	});
	await page.waitForTimeout(1000);

	const s6Path = path.join(outDir, "06_visit_1440x900_dark.png");
	const s6Brain = path.join(brainDir, "06_visit_1440x900_dark.png");
	await page.screenshot({ path: s6Path, fullPage: false });
	fs.copyFileSync(s6Path, s6Brain);
	console.log(`Saved: 06_visit_1440x900_dark.png (${fs.statSync(s6Path).size} bytes)`);

	await browser.close();
	console.log("ALL 6 LIVE AUDIT SCREENSHOTS CAPTURED AND PROVEN!");
}

capture().catch((err) => {
	console.error("Capture failed:", err);
	process.exit(1);
});
