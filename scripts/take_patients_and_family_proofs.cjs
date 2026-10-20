const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const API_BASE = "http://127.0.0.1:4100";
const WEB_BASE = "http://127.0.0.1:5173";

async function provisionSession() {
	const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			clinicName: "Клиника ДЕНТЕ Про",
			ownerEmail: "redteam_patient_audit@dente.pro",
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

	const headers = {
		"Content-Type": "application/json",
		"x-dente-clinic-token": initData.clinicToken,
		"x-dente-staff-token": unlockData.staffToken,
	};

	// Create test patient with allergy notes and somatic stop factors
	const p1Res = await fetch(`${API_BASE}/api/patients`, {
		method: "POST",
		headers,
		body: JSON.stringify({
			fullName: "Кузнецов Денис Олегович",
			phone: "+79021112233",
			birthDate: "1988-06-15",
			gender: "male",
			notes: "Отек Квинке на новокаин. Кардиостимулятор (ЭКС). Не переносит лидокаин.",
			allowDuplicate: true,
		}),
	});
	const p1 = await p1Res.json();

	// Create a family group
	const famRes = await fetch(`${API_BASE}/api/finance/family`, {
		method: "POST",
		headers,
		body: JSON.stringify({
			name: "Семья Кузнецовых",
			headPatientId: p1.id,
		}),
	});
	const famData = await famRes.json();

	// Topup family wallet
	if (famData?.id) {
		await fetch(`${API_BASE}/api/finance/family/topup`, {
			method: "POST",
			headers,
			body: JSON.stringify({
				familyGroupId: famData.id,
				patientId: p1.id,
				amountRub: 25000,
				method: "card",
				clientMutationId: `topup-seed-${Date.now()}`,
				comment: "Аванс на стоматологическое лечение",
			}),
		});
	}

	return {
		clinicToken: initData.clinicToken,
		staffToken: unlockData.staffToken,
		ownerUserId: initData.ownerUserId,
		patientId: p1.id,
		familyId: famData?.id,
	};
}

async function main() {
	const outDir = path.resolve(__dirname, "..", "docs", "screenshots");
	if (!fs.existsSync(outDir)) {
		fs.mkdirSync(outDir, { recursive: true });
	}

	console.log("1. Provisioning test session and data...");
	const auth = await provisionSession();
	console.log("Session provisioned. Patient ID:", auth.patientId);

	console.log("2. Launching Chrome...");
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	try {
		// SCREENSHOT 1: PC Light (1440x900)
		console.log("Capturing PC Light (1440x900)...");
		const pageLight = await browser.newPage({ viewport: { width: 1440, height: 900 } });
		await pageLight.goto(WEB_BASE, { waitUntil: "domcontentloaded" });
		await pageLight.evaluate(({ ct, st }) => {
			localStorage.setItem("dente_clinic_token", ct);
			localStorage.setItem("dente_staff_token", st);
			localStorage.setItem("dente_active_role", "owner");
			localStorage.setItem("dente_theme_mode", "light");
			localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
			localStorage.setItem("dente_guide_tour_seen_roles_v2", '["admin","doctor","director"]');
			document.documentElement.setAttribute("data-theme", "light");
			document.documentElement.classList.remove("dark");
		}, { ct: auth.clinicToken, st: auth.staffToken });

		await pageLight.goto(`${WEB_BASE}/#patients`, { waitUntil: "domcontentloaded" });
		await pageLight.waitForFunction(() => {
			const loadingPill = document.querySelector('.status-pill.status-planned');
			const hasCreateBtn = document.querySelector('[data-testid="open-create-patient-modal-btn"]');
			const hasSegmented = document.querySelector('[data-testid="patients-category-segmented-bar"]');
			return !loadingPill && (hasCreateBtn || hasSegmented);
		}, { timeout: 30000 });
		await pageLight.waitForTimeout(1500);

		// Click on patient row if available
		const patientRow = await pageLight.$('[data-testid^="patient-row-"], [data-testid="patient-row"]');
		if (patientRow) {
			await patientRow.click();
			await pageLight.waitForTimeout(1000);
		}

		const pcLightPath = path.join(outDir, "patients_registry_pc_light.png");
		await pageLight.screenshot({ path: pcLightPath, fullPage: false });
		console.log("Saved:", pcLightPath);
		await pageLight.close();

		// SCREENSHOT 2: PC Dark (1440x900)
		console.log("Capturing PC Dark (1440x900)...");
		const pageDark = await browser.newPage({ viewport: { width: 1440, height: 900 } });
		await pageDark.goto(WEB_BASE, { waitUntil: "domcontentloaded" });
		await pageDark.evaluate(({ ct, st }) => {
			localStorage.setItem("dente_clinic_token", ct);
			localStorage.setItem("dente_staff_token", st);
			localStorage.setItem("dente_active_role", "owner");
			localStorage.setItem("dente_theme_mode", "dark");
			localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
			localStorage.setItem("dente_guide_tour_seen_roles_v2", '["admin","doctor","director"]');
			document.documentElement.setAttribute("data-theme", "dark");
			document.documentElement.classList.add("dark");
		}, { ct: auth.clinicToken, st: auth.staffToken });

		await pageDark.goto(`${WEB_BASE}/#patients`, { waitUntil: "domcontentloaded" });
		await pageDark.waitForFunction(() => {
			const hasList = document.querySelector('[data-testid="patients-master-list"]');
			const hasCreateBtn = document.querySelector('[data-testid="open-create-patient-modal-btn"]');
			return hasList || hasCreateBtn;
		}, { timeout: 30000 });
		await pageDark.waitForTimeout(1500);

		const patientRowDark = await pageDark.$('[data-testid^="patient-row-"], [data-testid="patient-row"]');
		if (patientRowDark) {
			await patientRowDark.click();
			await pageDark.waitForTimeout(1000);
		}

		const pcDarkPath = path.join(outDir, "patients_registry_pc_dark.png");
		await pageDark.screenshot({ path: pcDarkPath, fullPage: false });
		console.log("Saved:", pcDarkPath);
		await pageDark.close();

		// SCREENSHOT 3: Mobile (390x844)
		console.log("Capturing Mobile (390x844)...");
		const pageMobile = await browser.newPage({
			viewport: { width: 390, height: 844 },
			isMobile: true,
			hasTouch: true,
		});
		await pageMobile.goto(WEB_BASE, { waitUntil: "domcontentloaded" });
		await pageMobile.evaluate(({ ct, st }) => {
			localStorage.setItem("dente_clinic_token", ct);
			localStorage.setItem("dente_staff_token", st);
			localStorage.setItem("dente_active_role", "owner");
			localStorage.setItem("dente_theme_mode", "light");
			localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
			localStorage.setItem("dente_guide_tour_seen_roles_v2", '["admin","doctor","director"]');
			document.documentElement.setAttribute("data-theme", "light");
			document.documentElement.classList.remove("dark");
		}, { ct: auth.clinicToken, st: auth.staffToken });

		await pageMobile.goto(`${WEB_BASE}/#patients`, { waitUntil: "domcontentloaded" });
		await pageMobile.waitForTimeout(2000);

		// If a mobile patient item exists, tap it to see the profile HUD
		const mobileItem = await pageMobile.$('.mobile-patient-group-card, [data-testid^="patient-item-"]');
		if (mobileItem) {
			await mobileItem.click();
			await pageMobile.waitForTimeout(1500);
		}

		const mobilePath = path.join(outDir, "patients_registry_mobile.png");
		await pageMobile.screenshot({ path: mobilePath, fullPage: false });
		console.log("Saved:", mobilePath);
		await pageMobile.close();

		// SCREENSHOT 4: Family Wallet Modal
		console.log("Capturing Family Wallet Modal...");
		const pageFam = await browser.newPage({ viewport: { width: 1440, height: 900 } });
		await pageFam.goto(WEB_BASE, { waitUntil: "domcontentloaded" });
		await pageFam.evaluate(({ ct, st }) => {
			localStorage.setItem("dente_clinic_token", ct);
			localStorage.setItem("dente_staff_token", st);
			localStorage.setItem("dente_active_role", "owner");
			localStorage.setItem("dente_theme_mode", "light");
			localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
			localStorage.setItem("dente_guide_tour_seen_roles_v2", '["admin","doctor","director"]');
			document.documentElement.setAttribute("data-theme", "light");
			document.documentElement.classList.remove("dark");
		}, { ct: auth.clinicToken, st: auth.staffToken });

		await pageFam.goto(`${WEB_BASE}/#patients`, { waitUntil: "domcontentloaded" });
		await pageFam.waitForTimeout(1500);

		const pRow = await pageFam.$('[data-testid^="patient-row-"], [data-testid="patient-row"]');
		if (pRow) {
			await pRow.click();
			await pageFam.waitForTimeout(1000);
		}

		// Click "Семейный кошелек" button
		const famBtn = await pageFam.$('[data-testid="btn-open-family-wallet-modal"], button:has-text("Семейный кошелек")');
		if (famBtn) {
			await famBtn.click();
			await pageFam.waitForTimeout(1200);
		}

		const famModalPath = path.join(outDir, "patients_family_wallet_modal.png");
		await pageFam.screenshot({ path: famModalPath, fullPage: false });
		console.log("Saved:", famModalPath);
		await pageFam.close();

		console.log("All 4 screenshots successfully captured!");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("CAPTURE ERROR:", err);
	process.exit(1);
});
