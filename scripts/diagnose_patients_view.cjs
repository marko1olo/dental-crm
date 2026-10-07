const { chromium } = require('playwright');
const path = require('path');

const API_BASE = "http://127.0.0.1:4100";

async function provisionSession() {
	const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			clinicName: "Клиника ДЕНТЕ Про",
			ownerEmail: "diag_owner@dente.pro",
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

	return {
		clinicToken: initData.clinicToken,
		staffToken: unlockData.staffToken,
		ownerUserId: initData.ownerUserId,
	};
}

(async () => {
	const auth = await provisionSession();
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"]
	});

	const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

	page.on('console', msg => {
		console.log(`[CONSOLE ${msg.type().toUpperCase()}] ${msg.text()}`);
	});
	page.on('pageerror', err => {
		console.error(`[PAGE ERROR]`, err.stack || err.message);
	});

	await page.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded" });
	await page.evaluate(({ ct, st, uid }) => {
		localStorage.setItem("dente_clinic_token", ct);
		localStorage.setItem("dente_staff_token", st);
		localStorage.setItem("dente_active_role", "owner");
		localStorage.setItem("dente_theme_mode", "light");
		localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
		localStorage.setItem("dente_guide_tour_seen_roles_v2", '["admin","doctor","director"]');
	}, {
		ct: auth.clinicToken,
		st: auth.staffToken,
		uid: auth.ownerUserId,
	});

	console.log("Navigating to #patients...");
	await page.goto("http://127.0.0.1:5173/#patients", { waitUntil: "domcontentloaded" });
	await page.waitForTimeout(6000);

	const info = await page.evaluate(() => {
		const root = document.getElementById("root");
		const currentView = document.body.innerHTML.includes("Быстрый поиск");
		return {
			bodySnippet: document.body.innerText.slice(0, 400),
			hasPatientsPanel: !!document.querySelector(".patients-panel"),
			hasError: !!document.querySelector('[role="alert"]'),
			errorText: document.querySelector('[role="alert"]')?.innerText || null
		};
	});
	console.log("Diagnostics result:", JSON.stringify(info, null, 2));

	await browser.close();
})();
