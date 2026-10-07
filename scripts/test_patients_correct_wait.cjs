const { chromium } = require('playwright');
const path = require('path');
const { Client } = require(path.resolve(__dirname, '..', 'node_modules', 'pg'));

const API_BASE = "http://127.0.0.1:4100";

async function provisionSession() {
	const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			clinicName: "Клиника ДЕНТЕ Про",
			ownerEmail: "audit_owner@dente.pro",
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

	// Создаем пациентов если нет
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
		primaryPatientId: p1.id,
	};
}

(async () => {
	const auth = await provisionSession();
	console.log("Session provisioned.");

	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"]
	});

	const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

	await page.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded" });
	await page.evaluate(({ ct, st, uid, pid }) => {
		localStorage.setItem("dente_clinic_token", ct);
		localStorage.setItem("dente_staff_token", st);
		localStorage.setItem("dente_active_role", "owner");
		localStorage.setItem("dente_theme_mode", "light");
		localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
		localStorage.setItem("dente_guide_tour_seen_roles_v2", '["admin","doctor","director"]');
		document.documentElement.setAttribute("data-theme", "light");
		document.documentElement.className = "";
	}, {
		ct: auth.clinicToken,
		st: auth.staffToken,
		uid: auth.ownerUserId,
		pid: auth.primaryPatientId,
	});

	console.log("Going to #patients...");
	await page.goto("http://127.0.0.1:5173/#patients", { waitUntil: "domcontentloaded" });

	// Ожидаем исчезновения саспенс-фолбека
	console.log("Waiting for real PatientsView content...");
	await page.waitForFunction(() => {
		const loadingPill = document.querySelector('.status-pill.status-planned');
		const hasCreateBtn = document.querySelector('[data-testid="open-create-patient-modal-btn"]');
		const hasSegmented = document.querySelector('[data-testid="patients-category-segmented-bar"]');
		return !loadingPill && (hasCreateBtn || hasSegmented);
	}, { timeout: 30000 });

	console.log("PatientsView mounted! Taking screenshot...");
	await page.waitForTimeout(1000);
	await page.screenshot({ path: "docs/screenshots/audit_patients_booking/test_patients_mounted.png" });
	console.log("Screenshot saved!");

	await browser.close();
})();
