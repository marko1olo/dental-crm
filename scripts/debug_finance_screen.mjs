import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";

const API_BASE = "http://127.0.0.1:4100";
const WEB_BASE = "http://127.0.0.1:5173";

async function run() {
	const uniqueId = Date.now();
	console.log("Setting up clinic...");
	const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			clinicName: "ООО Стоматология ДЕНТЕ",
			email: `debug-${uniqueId}@dente.ru`,
			password: "Password123!",
			ownerName: "Д-р Смирнов К.П.",
			ownerPin: "1234",
		}),
	});
	const initData = await initRes.json();

	const unlockRes = await fetch(`${API_BASE}/api/auth/staff/unlock`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-dente-clinic-token": initData.clinicToken,
		},
		body: JSON.stringify({ userId: initData.ownerUserId, pinCode: "1234" }),
	});
	const unlockData = await unlockRes.json();

	console.log("Launching Edge...");
	const browser = await chromium.launch({ channel: "msedge", headless: true });
	const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

	await context.addInitScript(({ ct, st, uid }) => {
		localStorage.setItem("dente_clinic_token", ct);
		localStorage.setItem("dente_staff_token", st);
		localStorage.setItem(
			"dente_staff_session",
			JSON.stringify({
				userId: uid,
				name: "Д-р Смирнов К.П.",
				fullName: "Д-р Смирнов К.П.",
				role: "owner",
				specialties: ["Стоматолог-терапевт"],
			})
		);
		localStorage.setItem(
			"dental-crm:web-ui-preferences:v1",
			JSON.stringify({
				version: 1,
				uiLanguage: "ru",
				selectedWorkspaceRole: "owner",
				onboardingDismissed: true,
				onboardingStep: "done",
			})
		);
	}, { ct: initData.clinicToken, st: unlockData.staffToken, uid: initData.ownerUserId });

	const page = await context.newPage();
	page.on("console", (m) => console.log("LOG:", m.type(), m.text()));
	page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
	page.on("response", (res) => {
		if (res.status() >= 400) console.log("FAILED RESOURCE:", res.status(), res.url());
	});

	console.log("Navigating...");
	await page.goto(`${WEB_BASE}/#finance`, { waitUntil: "domcontentloaded" });
	await page.waitForTimeout(4000);

	console.log("Current URL:", page.url());
	await page.screenshot({ path: "screenshots/debug_finance.png" });
	console.log("Saved screenshots/debug_finance.png");

	const bodyText = await page.innerText("body");
	console.log("BODY TEXT:\n", bodyText.slice(0, 500));

	const buttons = await page.$$eval("button", btns => btns.map(b => ({
		text: b.innerText?.trim(),
		testId: b.getAttribute("data-testid"),
		className: b.className
	})));
	console.log("Found buttons:", JSON.stringify(buttons.slice(0, 10), null, 2));

	await browser.close();
}

run().catch(console.error);
