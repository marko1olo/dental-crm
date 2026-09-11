const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

async function provisionSession() {
	const API_BASE = "http://127.0.0.1:4100";
	const uniqueId = Date.now();
	console.log("Provisioning session via API...");
	const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			clinicName: "Стоматология ДЕНТЕ Плюс",
			email: `doctor-mobile-${uniqueId}@dente.local`,
			password: "Password123!",
			ownerName: "Д-р Смирнов А. В.",
			ownerPin: "1234",
		}),
	});
	if (!initRes.ok) throw new Error(`Clinic setup failed: ${await initRes.text()}`);
	const initData = await initRes.json();

	const unlockRes = await fetch(`${API_BASE}/api/auth/staff/unlock`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-dente-clinic-token": initData.clinicToken,
		},
		body: JSON.stringify({ userId: initData.ownerUserId, pinCode: "1234" }),
	});
	if (!unlockRes.ok) throw new Error(`Staff unlock failed: ${await unlockRes.text()}`);
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

			const chairsRes = await fetch(`${API_BASE}/api/chairs`, { headers });
			let chairId = "chair-1";
			if (chairsRes.ok) {
				const chList = await chairsRes.json();
				if (Array.isArray(chList) && chList.length > 0) chairId = chList[0].id;
			}
			const now = new Date();
			const startsAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0);
			const endsAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0);
			await fetch(`${API_BASE}/api/appointments`, {
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
		}
	} catch (e) {
		console.log("Patient note:", e.message);
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
	const brainDir = "C:/Users/Admin/.gemini/antigravity/brain/e1164d8d-2730-485e-9afe-aa0a260df89f";

	const auth = await provisionSession();

	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	const context = await browser.newContext({
		viewport: { width: 390, height: 844 },
	});
	const page = await context.newPage();

	await page.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded", timeout: 10000 });

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

	console.log("Loading visit view on mobile 390x844...");
	await page.goto("http://127.0.0.1:5173/#visit", { waitUntil: "load", timeout: 20000 });
	await page.waitForTimeout(3000);

	// Light
	await page.evaluate(() => {
		document.documentElement.setAttribute("data-theme", "light");
		document.documentElement.classList.remove("dark");
		document.documentElement.classList.add("light");
		localStorage.setItem("dente_theme_mode", "light");
	});
	const lightPath = path.join(outDir, "07_visit_390x844_mobile_light.png");
	const lightBrain = path.join(brainDir, "07_visit_390x844_mobile_light.png");
	await page.screenshot({ path: lightPath, fullPage: false });
	fs.copyFileSync(lightPath, lightBrain);
	console.log(`Saved: 07_visit_390x844_mobile_light.png (${fs.statSync(lightPath).size} bytes)`);

	// Dark
	await page.evaluate(() => {
		document.documentElement.setAttribute("data-theme", "dark");
		document.documentElement.classList.add("dark");
		document.documentElement.classList.remove("light");
		localStorage.setItem("dente_theme_mode", "dark");
	});
	await page.waitForTimeout(1000);

	const darkPath = path.join(outDir, "08_visit_390x844_mobile_dark.png");
	const darkBrain = path.join(brainDir, "08_visit_390x844_mobile_dark.png");
	await page.screenshot({ path: darkPath, fullPage: false });
	fs.copyFileSync(darkPath, darkBrain);
	console.log(`Saved: 08_visit_390x844_mobile_dark.png (${fs.statSync(darkPath).size} bytes)`);

	await browser.close();
}

capture().catch((err) => {
	console.error("Mobile visit capture failed:", err);
	process.exit(1);
});
