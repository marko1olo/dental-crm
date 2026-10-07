const { chromium } = require('playwright');
const path = require('path');

const API_BASE = "http://127.0.0.1:4100";

async function provisionSession() {
	const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			clinicName: "Клиника ДЕНТЕ Про",
			ownerEmail: "initscript_owner@dente.pro",
			ownerPassword: "AuditPassword2026!",
			ownerName: "Д-р Проверенников",
			adminPin: "1111",
		}),
	});
	const initData = await initRes.json();
	const unlockRes = await fetch(`${API_BASE}/api/auth/staff/unlock`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-dente-clinic-token": initData.clinicToken,
		},
		body: JSON.stringify({ pin: "1111" }),
	});
	const unlockData = await unlockRes.json();

	// Создаем пациентов
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
			phone: "+79011112233",
			birthDate: "1985-05-12",
			gender: "male",
		}),
	});
	const p1 = await p1Res.json();

	return {
		clinicToken: initData.clinicToken,
		staffToken: unlockData.staffToken,
		ownerUserId: initData.ownerUserId,
		organizationId: initData.organizationId || initData.clinic?.id,
		primaryPatientId: p1.id,
	};
}

(async () => {
	const auth = await provisionSession();
	console.log("[InitScript Test] Session provisioned.");

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
	}, {
		ct: auth.clinicToken,
		st: auth.staffToken,
		uid: auth.ownerUserId,
		pid: auth.primaryPatientId,
	});

	const page = await context.newPage();
	console.log("Navigating to #patients with initScript active...");
	await page.goto("http://127.0.0.1:5173/#patients", { waitUntil: "domcontentloaded" });

	await page.waitForFunction(() => {
		const text = document.body.innerText || "";
		return text.includes("Иванов") || document.querySelector('[data-testid="open-create-patient-modal-btn"]');
	}, { timeout: 20000 });

	console.log("SUCCESS! Patients list is visible!");
	await page.screenshot({ path: "docs/screenshots/audit_patients_booking/test_patients_initscript_success.png" });
	console.log("Screenshot saved!");

	await browser.close();
})();
