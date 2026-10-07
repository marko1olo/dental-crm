const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const API_BASE = "http://127.0.0.1:4100";

async function provisionSession() {
	const uniqueId = Date.now();
	const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			clinicName: "Клиника ДЕНТЕ Про",
			email: `inquisitor-${uniqueId}@dente.local`,
			password: "Password123!",
			ownerName: "Д-р Орлов Сергей Николаевич",
			ownerPin: "1234",
		}),
	});
	if (!initRes.ok) {
		throw new Error(`Init failed: ${await initRes.text()}`);
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
		throw new Error(`Unlock failed: ${await unlockRes.text()}`);
	}
	const unlockData = await unlockRes.json();

	// 1. Создаем пациента
	const headers = {
		"Content-Type": "application/json",
		"x-dente-clinic-token": initData.clinicToken,
		"x-dente-staff-token": unlockData.staffToken,
	};
	const p1Res = await fetch(`${API_BASE}/api/patients`, {
		method: "POST",
		headers,
		body: JSON.stringify({
			fullName: "Иванов Иван Иванович",
			phone: "+7 (916) 111-22-33",
			birthDate: "1982-05-14",
			notes: "Глава семьи. VIP",
		}),
	});
	const p1 = await p1Res.json();

	return {
		clinicToken: initData.clinicToken,
		staffToken: unlockData.staffToken,
		ownerUserId: initData.ownerUserId,
		organizationId: initData.organizationId || initData.clinic?.id || initData.orgId,
		primaryPatientId: p1.id,
	};
}

(async () => {
	const auth = await provisionSession();
	console.log("[Debug] Tokens provisioned:", {
		ct: auth.clinicToken.slice(0, 10),
		st: auth.staffToken.slice(0, 10),
		pid: auth.primaryPatientId
	});

	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"]
	});

	const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
	await context.addInitScript(({ ct, st, uid, pid }) => {
		localStorage.setItem("dente_clinic_token", ct);
		localStorage.setItem("dente_staff_token", st);
		localStorage.setItem("dente_active_role", "owner");
		localStorage.setItem("dente_theme_mode", "light");
		localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
		localStorage.setItem("dente_guide_tour_seen_roles_v2", '["admin","doctor","director"]');
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
		document.documentElement.setAttribute("data-theme", "light");
		document.documentElement.className = "";
	}, {
		ct: auth.clinicToken,
		st: auth.staffToken,
		uid: auth.ownerUserId,
		pid: auth.primaryPatientId,
	});

	const page = await context.newPage();
	const logs = [];
	page.on('console', msg => {
		const line = `[CONSOLE ${msg.type().toUpperCase()}] ${msg.text()}`;
		logs.push(line);
		console.log(line);
	});
	page.on('pageerror', err => {
		const line = `[PAGE ERROR] ${err.stack || err.message}`;
		logs.push(line);
		console.error(line);
	});

	console.log("Navigating to http://127.0.0.1:5173/#patients...");
	await page.goto("http://127.0.0.1:5173/#patients", { waitUntil: "domcontentloaded" });
	await page.waitForTimeout(6000);

	const text = await page.evaluate(() => document.body.innerText);
	console.log("Page text snippet:", text.slice(0, 300));

	await page.screenshot({ path: "docs/screenshots/audit_patients_booking/debug_screenshot.png" });
	console.log("Debug screenshot saved!");
	await browser.close();
})();
