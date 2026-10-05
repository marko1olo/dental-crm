import { existsSync } from "node:fs";
import { chromium } from "playwright";

const browserCandidates = [
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
];
const executablePath = browserCandidates.find((p) => existsSync(p));

async function main() {
	const browser = await chromium.launch({
		executablePath,
		headless: true,
	});
	const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

	const loginRes = await fetch("http://127.0.0.1:4100/api/auth/login", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email: "doctor@clinic.com", password: "dente2026" })
	});
	const loginData = await loginRes.json();

	await page.addInitScript(({ clinicToken, staffToken, user }) => {
		localStorage.setItem("dente_clinic_token", clinicToken);
		localStorage.setItem("dente_staff_token", staffToken);
		localStorage.setItem("dente_active_role", user.role || "doctor");
		localStorage.setItem("dental-crm:active-user:v1", JSON.stringify(user));
		localStorage.setItem("dental_workspace_onboarding_completed", "true");
		localStorage.setItem("dente_demo_banner_dismissed", "true");
		localStorage.setItem("dente_tour_completed", "true");
	}, { clinicToken: loginData.clinicToken, staffToken: loginData.staffToken, user: loginData.user });

	await page.goto("http://127.0.0.1:5173/#patients", { waitUntil: "domcontentloaded" });
	await page.waitForTimeout(2000);
	const row = await page.waitForSelector('[data-testid^="patient-row-"]');
	await row.click();
	const visitBtn = await page.waitForSelector('[data-testid="patient-card-open-visit-btn"]');
	await visitBtn.click();
	const tab = await page.waitForSelector('[data-testid="visit-subtab-odontogram"]');
	await tab.click();
	await page.waitForTimeout(1000);

	console.log("INITIAL BUTTONS:");
	let btns = await page.evaluate(() =>
		Array.from(document.querySelectorAll('[data-testid^="odontogram-mode-btn-"]')).map(b => ({
			testId: b.getAttribute("data-testid"),
			text: b.textContent.trim(),
			ariaChecked: b.getAttribute("aria-checked")
		}))
	);
	console.log(btns);

	console.log("Clicking classic_gost...");
	await page.click('[data-testid="odontogram-mode-btn-classic_gost"]');
	await page.waitForTimeout(800);

	btns = await page.evaluate(() =>
		Array.from(document.querySelectorAll('[data-testid^="odontogram-mode-btn-"]')).map(b => ({
			testId: b.getAttribute("data-testid"),
			text: b.textContent.trim(),
			ariaChecked: b.getAttribute("aria-checked")
		}))
	);
	console.log("AFTER GOST:", btns);

	console.log("Clicking compact_clinical...");
	await page.click('[data-testid="odontogram-mode-btn-compact_clinical"]');
	await page.waitForTimeout(800);

	btns = await page.evaluate(() =>
		Array.from(document.querySelectorAll('[data-testid^="odontogram-mode-btn-"]')).map(b => ({
			testId: b.getAttribute("data-testid"),
			text: b.textContent.trim(),
			ariaChecked: b.getAttribute("aria-checked")
		}))
	);
	console.log("AFTER COMPACT CLINICAL:", btns);

	const activeViewSlot = await page.evaluate(() => {
		const slot = document.querySelector(".odontogram-active-view-slot");
		return {
			childrenCount: slot ? slot.children.length : 0,
			hasToothChart: !!document.querySelector(".tooth-chart-container"),
			hasAnatomical: !!document.querySelector(".anatomical-odontogram-container"),
			hasGost: !!document.querySelector(".classic-gost-container")
		};
	});
	console.log("ACTIVE VIEW SLOT:", activeViewSlot);

	await browser.close();
}

main().catch(console.error);
