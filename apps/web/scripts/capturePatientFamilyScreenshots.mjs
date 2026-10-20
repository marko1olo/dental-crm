import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const API_BASE = process.env.API_BASE || "http://127.0.0.1:4100";
const APP_BASE = process.env.APP_BASE || "http://127.0.0.1:5173";

const TARGET_DIRS = [
	path.join(process.cwd(), "docs/screenshots/patients"),
	"C:/Users/Admin/.gemini/antigravity/brain/da2ba7dc-ae34-477e-b9a5-a9e38a67876e",
	"C:/Users/Admin/.gemini/antigravity/brain/da920fe7-8cf1-4af3-83bf-33b629e2b869",
];

for (const dir of TARGET_DIRS) {
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const possibleBrowserPaths = [
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
	"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
	process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "Microsoft\\Edge\\Application\\msedge.exe") : null,
	process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "Google\\Chrome\\Application\\chrome.exe") : null,
	process.env.PROGRAMFILES ? path.join(process.env.PROGRAMFILES, "Microsoft\\Edge\\Application\\msedge.exe") : null,
	process.env.PROGRAMFILES ? path.join(process.env.PROGRAMFILES, "Google\\Chrome\\Application\\chrome.exe") : null,
	process.env["PROGRAMFILES(X86)"] ? path.join(process.env["PROGRAMFILES(X86)"], "Microsoft\\Edge\\Application\\msedge.exe") : null,
	process.env["PROGRAMFILES(X86)"] ? path.join(process.env["PROGRAMFILES(X86)"], "Google\\Chrome\\Application\\chrome.exe") : null,
].filter(Boolean);

const browserExecutable = possibleBrowserPaths.find((p) => existsSync(p));

async function getBrowser() {
	const launchOptions = {
		headless: true,
		args: [
			"--no-sandbox",
			"--disable-setuid-sandbox",
			"--disable-gpu",
			"--disable-dev-shm-usage",
			"--font-render-hinting=none",
		],
	};
	if (browserExecutable) {
		launchOptions.executablePath = browserExecutable;
	}
	return chromium.launch(launchOptions);
}

async function provisionClinicAndFamily() {
	const uniqueId = Date.now();
	const email = `inquisitor-${uniqueId}@dente.local`;
	const password = "Password123!";
	const ownerPin = "123456";

	console.log(`[PROVISION] Initializing fresh clinic: ${email}`);
	const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			clinicName: "Клиника Дент-Мастер (Red Team)",
			email,
			password,
			ownerName: "Д-р Барабаш Сергей Владимирович",
			ownerPin,
		}),
	});

	if (!initRes.ok) {
		throw new Error(`Clinic setup failed: HTTP ${initRes.status} - ${await initRes.text()}`);
	}
	const initData = await initRes.json();

	const unlockRes = await fetch(`${API_BASE}/api/auth/staff/unlock`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-dente-clinic-token": initData.clinicToken,
		},
		body: JSON.stringify({ userId: initData.ownerUserId, pinCode: ownerPin }),
	});

	if (!unlockRes.ok) {
		throw new Error(`Staff unlock failed: HTTP ${unlockRes.status} - ${await unlockRes.text()}`);
	}
	const unlockData = await unlockRes.json();
	const clinicToken = initData.clinicToken;
	const staffToken = unlockData.staffToken;
	const headers = {
		"Content-Type": "application/json",
		"x-dente-clinic-token": clinicToken,
		"x-dente-staff-token": staffToken,
	};

	console.log(`[PROVISION] Clinic ready, orgId=${initData.organizationId}`);

	// 1. Создаем главу семьи: Смирнов Алексей Владимирович с аллергией
	const p1Res = await fetch(`${API_BASE}/api/patients`, {
		method: "POST",
		headers,
		body: JSON.stringify({
			fullName: "Смирнов Алексей Владимирович",
			phone: "+7 (926) 456-78-90",
			birthDate: "1982-04-15",
			allergies: "Пенициллин, Лидокаин",
		}),
	});
	const p1 = await p1Res.json();
	console.log(`[PROVISION] Patient 1 created: ${p1.id} (${p1.fullName})`);

	// 2. Создаем ребенка: Смирнова Полина Алексеевна
	const p2Res = await fetch(`${API_BASE}/api/patients`, {
		method: "POST",
		headers,
		body: JSON.stringify({
			fullName: "Смирнова Полина Алексеевна",
			phone: "+7 (926) 456-78-90",
			birthDate: "2012-09-10",
		}),
	});
	const p2 = await p2Res.json();
	console.log(`[PROVISION] Patient 2 created: ${p2.id} (${p2.fullName})`);

	// 3. Создаем семейную группу
	const famRes = await fetch(`${API_BASE}/api/finance/family`, {
		method: "POST",
		headers,
		body: JSON.stringify({
			name: "Семья Смирновых",
			headPatientId: p1.id,
		}),
	});
	const fam = await famRes.json();
	console.log(`[PROVISION] Family group created: ${fam.id} (${fam.name})`);

	// 4. Привязываем родство: Смирнов А.В. -> Дочь Смирнова П.А.
	const relRes = await fetch(`${API_BASE}/api/patients/${p1.id}/relationships`, {
		method: "POST",
		headers,
		body: JSON.stringify({
			relatedPatientId: p2.id,
			relationshipType: "child",
			canSpendFromPool: true,
			isLegalRepresentative: true,
		}),
	});
	console.log(`[PROVISION] Relationship linked: status=${relRes.status}`);

	// 5. Пополняем семейный баланс на 35 000 ₽
	const topupRes = await fetch(`${API_BASE}/api/finance/family/topup`, {
		method: "POST",
		headers,
		body: JSON.stringify({
			familyGroupId: fam.id,
			patientId: p1.id,
			amountRub: 35000,
			method: "card",
			comment: "Семейный депозит на ортодонтию",
			clientMutationId: `seed-topup-${uniqueId}`,
		}),
	});
	console.log(`[PROVISION] Family topup executed: status=${topupRes.status}`);

	return {
		clinicToken,
		staffToken,
		organizationId: initData.organizationId,
		ownerUserId: initData.ownerUserId,
		patient1: p1,
		patient2: p2,
		family: fam,
	};
}

async function applyTheme(page, theme) {
	await page.evaluate((th) => {
		document.documentElement.setAttribute("data-theme", th);
		const isDark = th === "dark" || th === "night" || th === "ocean" || th === "cyber_xray";
		document.documentElement.classList.toggle("dark", isDark);
		document.documentElement.classList.toggle("light", !isDark);
		document.body.className = isDark ? "dark" : "light";
		document.documentElement.style.colorScheme = isDark ? "dark" : "light";
		localStorage.setItem("dente_theme_mode", th);
		if (window.__useThemeStore) {
			window.__useThemeStore.getState().setThemeMode(th);
		}
	}, theme);
	await wait(400);
}

function saveToAll(fileName, buffer) {
	for (const dir of TARGET_DIRS) {
		const outPath = path.join(dir, fileName);
		writeFileSync(outPath, buffer);
		const sz = statSync(outPath).size;
		console.log(`      ✓ Saved ${fileName} to ${dir} (${sz} bytes)`);
	}
}

async function run() {
	console.log("=== RED TEAM PATIENT REGISTRY & FAMILY WALLET PLAYWRIGHT CAPTURE ===");
	const data = await provisionClinicAndFamily();
	const browser = await getBrowser();

	try {
		const context = await browser.newContext({
			viewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
		});

		await context.addCookies([
			{ name: "dente_clinic_token", value: data.clinicToken, domain: "127.0.0.1", path: "/" },
			{ name: "dente_staff_token", value: data.staffToken, domain: "127.0.0.1", path: "/" },
		]);

		const page = await context.newPage();
		page.on("pageerror", (err) => console.error("[PAGE ERROR]:", err.message));

		const cToken = data.clinicToken;
		const sToken = data.staffToken;
		const doc = { id: data.ownerUserId, name: "Д-р Барабаш С.В.", role: "owner" };

		await page.addInitScript(({ cToken, sToken, doc, p1Id }) => {
			localStorage.setItem("dente_clinic_token", cToken);
			localStorage.setItem("dente_staff_token", sToken);
			localStorage.setItem("dente_workspace_perspective", "owner");
			localStorage.setItem("dente_user_role", "owner");
			localStorage.setItem("dente_active_staff_user", JSON.stringify(doc));
			localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
			localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
				version: 1,
				uiLanguage: "ru",
				selectedWorkspaceRole: "owner",
				selectedSpecialty: "therapist",
				selectedPatientId: p1Id,
				onboardingDismissed: true,
			}));
		}, { cToken, sToken, doc, p1Id: data.patient1.id });

		console.log("[NAV] Navigating to /#patients...");
		await page.goto(`${APP_BASE}/#patients`, { waitUntil: "domcontentloaded", timeout: 45000 });

		// 1. Ждем исчезновения экрана загрузки
		console.log("[NAV] Waiting for app-shell or workspace ready...");
		await page.waitForSelector(".boot-state", { state: "detached", timeout: 25000 }).catch(() => {});
		await wait(2500);

		// Кликаем по пациенту Смирнову
		console.log("[NAV] Selecting patient in list...");
		await page.evaluate(() => {
			const el = Array.from(document.querySelectorAll("div, button, tr")).find(
				(node) => node.textContent?.includes("Смирнов Алексей")
			);
			if (el) (el.closest('button, [role="button"]') || el).click();
		});
		await wait(1500);

		// 2. Снимаем карточку пациента в Light режиме
		console.log("📸 Capturing patient_registry_card_pc_light.png...");
		await applyTheme(page, "light");
		await wait(600);
		let buf = await page.screenshot({ fullPage: false });
		saveToAll("patient_registry_card_pc_light.png", buf);

		// 3. Снимаем карточку пациента в Dark режиме
		console.log("📸 Capturing patient_registry_card_pc_dark.png...");
		await applyTheme(page, "dark");
		await wait(600);
		buf = await page.screenshot({ fullPage: false });
		saveToAll("patient_registry_card_pc_dark.png", buf);

		// 4. Открываем семейный кошелек / карту пациента с вкладкой семьи
		console.log("[UI] Opening Family Wallet modal / Family Tab...");
		
		// Попытка 1: Клик по кнопке семейного кошелька
		const walletBtn = page.locator('[data-testid="btn-open-family-wallet-modal"], [data-testid="header-family-balance-btn"]').first();
		if (await walletBtn.isVisible().catch(() => false)) {
			console.log("   Clicking direct wallet button...");
			await walletBtn.click();
		} else {
			// Попытка 2: Открываем паспортную карточку пациента -> вкладка Семья
			console.log("   Opening patient card modal to family tab...");
			const cardBtn = page.locator('[data-testid="open-patient-card-modal-btn"], [data-testid="patient-card-more-actions-btn"]').first();
			if (await cardBtn.isVisible().catch(() => false)) {
				await cardBtn.click();
				await wait(500);
				const openModalBtn = page.locator('[data-testid="open-patient-card-modal-btn"]').first();
				if (await openModalBtn.isVisible().catch(() => false)) {
					await openModalBtn.click();
				}
			} else {
				// Попытка 3: диспатч кастомного события
				console.log("   Dispatching dente-open-family-wallet event...");
				await page.evaluate((patientId) => {
					window.dispatchEvent(new CustomEvent("dente-open-family-wallet", {
						detail: { patientId }
					}));
				}, data.patient1.id);
			}
		}
		await wait(1500);

		// Если открылась карточка пациента, переключаемся на таб "family"
		const familyTabBtn = page.locator('[data-testid="tab-patient-family"]').first();
		if (await familyTabBtn.isVisible().catch(() => false)) {
			console.log("   Clicking tab-patient-family...");
			await familyTabBtn.click();
			await wait(800);
		}

		// 5. Снимаем семейный кошелек в Dark режиме
		console.log("📸 Capturing patient_family_wallet_pc_dark.png...");
		buf = await page.screenshot({ fullPage: false });
		saveToAll("patient_family_wallet_pc_dark.png", buf);

		// 6. Снимаем семейный кошелек в Light режиме
		console.log("📸 Capturing patient_family_wallet_pc_light.png...");
		await applyTheme(page, "light");
		await wait(600);
		buf = await page.screenshot({ fullPage: false });
		saveToAll("patient_family_wallet_pc_light.png", buf);

		console.log("\n🎉 ALL 4 PROOF SCREENSHOTS CAPTURED SUCCESSFULLY!");
	} finally {
		await browser.close();
	}
}

run().catch((err) => {
	console.error("[FATAL ERROR]:", err);
	process.exit(1);
});
