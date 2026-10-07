const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

async function provisionSession() {
	const API_BASE = "http://127.0.0.1:4100";
	const uniqueId = Date.now();
	console.log("[Provisioning] Initializing clinic session via API...");
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

	// 1. Создаем реальных пациентов
	console.log("[Provisioning] Creating real patients...");
	const p1Res = await fetch(`${API_BASE}/api/patients`, {
		method: "POST",
		headers,
		body: JSON.stringify({
			fullName: "Иванов Иван Иванович",
			phone: "+7 (916) 111-22-33",
			birthDate: "1982-05-14",
			notes: "Глава семьи. VIP, аллергия на лидокаин, согласована скидка 10%",
		}),
	});
	const p1 = await p1Res.json();

	const p2Res = await fetch(`${API_BASE}/api/patients`, {
		method: "POST",
		headers,
		body: JSON.stringify({
			fullName: "Иванова Мария Петровна",
			phone: "+7 (916) 222-33-44",
			birthDate: "1985-08-22",
			notes: "Супруга. Пародонтит, профгигиена каждые 4 месяца",
		}),
	});
	const p2 = await p2Res.json();

	const p3Res = await fetch(`${API_BASE}/api/patients`, {
		method: "POST",
		headers,
		body: JSON.stringify({
			fullName: "Иванов Алексей Иванович",
			phone: "+7 (916) 333-44-55",
			birthDate: "2012-03-10",
			notes: "Сын. Сменный прикус, наблюдение ортодонта",
		}),
	});
	const p3 = await p3Res.json();

	const p4Res = await fetch(`${API_BASE}/api/patients`, {
		method: "POST",
		headers,
		body: JSON.stringify({
			fullName: "Сидоров Пётр Алексеевич",
			phone: "+7 (903) 999-88-77",
			birthDate: "1975-02-18",
			notes: "СТОП-ФАКТОР: аллергия на латекс. Имплантация 2.6",
		}),
	});
	const p4 = await p4Res.json();

	// 2. Создаем семейную группу через реальный API
	try {
		const famRes = await fetch(`${API_BASE}/api/finance/family`, {
			method: "POST",
			headers,
			body: JSON.stringify({
				name: "Семья Ивановых",
				headPatientId: p1.id,
			}),
		});
		if (famRes.ok) {
			const family = await famRes.json();
			await fetch(`${API_BASE}/api/patients/${p2.id}`, {
				method: "PUT",
				headers,
				body: JSON.stringify({ familyGroupId: family.id }),
			});
			await fetch(`${API_BASE}/api/patients/${p3.id}`, {
				method: "PUT",
				headers,
				body: JSON.stringify({ familyGroupId: family.id }),
			});
			console.log(`[Provisioning] Family created: ${family.id}`);
		}
	} catch (e) {
		console.log("[Provisioning] Family creation note:", e.message);
	}

	// 3. Создаем кресло и запись на прием
	try {
		const chairsRes = await fetch(`${API_BASE}/api/chairs`, { headers });
		let chairId = "chair-1";
		if (chairsRes.ok) {
			const chList = await chairsRes.json();
			if (Array.isArray(chList) && chList.length > 0) chairId = chList[0].id;
		}
		const now = new Date();
		const startsAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 0, 0);
		const endsAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
		await fetch(`${API_BASE}/api/appointments`, {
			method: "POST",
			headers,
			body: JSON.stringify({
				patientId: p1.id,
				doctorUserId: initData.ownerUserId,
				chairId,
				status: "planned",
				startsAt: startsAt.toISOString(),
				endsAt: endsAt.toISOString(),
				reason: "Консультация ортопеда, коронка 1.6",
			}),
		});
	} catch (e) {
		console.log("[Provisioning] Appointment note:", e.message);
	}

	return {
		clinicToken: initData.clinicToken,
		staffToken: unlockData.staffToken,
		ownerUserId: initData.ownerUserId,
		organizationId: initData.organizationId || initData.clinic?.id || initData.orgId,
		primaryPatientId: p1.id,
	};
}

async function runAudit() {
	const outDir = path.resolve(__dirname, "..", "docs", "screenshots", "audit_patients_booking");
	if (!fs.existsSync(outDir)) {
		fs.mkdirSync(outDir, { recursive: true });
	}

	const auth = await provisionSession();
	console.log(`[Audit] Provisioned clinic session, organizationId: ${auth.organizationId}`);

	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	async function createContextWithAuth(viewport, isMobile = false, theme = "light") {
		const context = await browser.newContext({
			viewport,
			isMobile,
			hasTouch: isMobile,
			userAgent: isMobile
				? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
				: undefined,
		});

		await context.addInitScript(({ ct, st, uid, pid, themeMode }) => {
			localStorage.setItem("dente_clinic_token", ct);
			localStorage.setItem("dente_staff_token", st);
			localStorage.setItem("dente_active_role", "owner");
			localStorage.setItem("dente_theme_mode", themeMode);
			localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
			localStorage.setItem("dente_guide_tour_seen_roles_v2", '["admin","doctor","director"]');
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_quest_progress_v2", JSON.stringify({ dismissed: true, completed: true }));
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
			document.documentElement.setAttribute("data-theme", themeMode);
			document.documentElement.className = themeMode === "dark" ? "dark" : "";
		}, {
			ct: auth.clinicToken,
			st: auth.staffToken,
			uid: auth.ownerUserId,
			pid: auth.primaryPatientId,
			themeMode: theme,
		});

		return context;
	}

	async function waitForPatientsViewReady(page, isMobile = false) {
		await page.goto("http://127.0.0.1:5173/#patients", { waitUntil: "domcontentloaded", timeout: 20000 });
		await page.waitForFunction(() => {
			const text = document.body.innerText || "";
			const hasPatientsPanel = document.querySelector(".patients-panel");
			const hasLoading = document.querySelector(".status-pill.status-planned");
			const hasItem = document.querySelector(".patient-row, .mobile-patient-item, [data-testid='open-create-patient-modal-btn']");
			return !text.includes("Загрузка CRM") && !hasLoading && hasPatientsPanel && hasItem;
		}, { timeout: 25000 });
		await page.waitForTimeout(600);
	}

	// -------------------------------------------------------------
	// 1. PC Light & Dark: Patients List & Family Card (1440x900)
	// -------------------------------------------------------------
	console.log("[Audit] Capturing PC Light (1440x900)...");
	const pcLightContext = await createContextWithAuth({ width: 1440, height: 900 }, false, "light");
	const pcLightPage = await pcLightContext.newPage();
	await waitForPatientsViewReady(pcLightPage, false);

	// Снимок 1: Список пациентов и верхняя карточка
	await pcLightPage.screenshot({
		path: path.join(outDir, "01_patients_list_pc_light.png"),
		fullPage: false,
	});

	// Снимок 2: Скролл к блоку семьи и клиническому обзору
	await pcLightPage.evaluate(() => {
		const el = document.querySelector('[data-testid="patient-family-card"]') || document.querySelector('.patient-admin-panel');
		if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
	});
	await pcLightPage.waitForTimeout(500);
	await pcLightPage.screenshot({
		path: path.join(outDir, "03_patient_card_family_pc_light.png"),
		fullPage: false,
	});

	// Снимок 15: Открытие модалки Recall / Профосмотры из шапки картотеки
	const recallBtn = pcLightPage.locator('[data-testid="btn-patients-recalls-hub"]');
	if (await recallBtn.count() > 0) {
		console.log("[Audit] Opening Recall Hub Modal from patients header...");
		await recallBtn.click();
		await pcLightPage.waitForSelector('.patient-recalls-hub-modal, [data-testid="recalls-hub-modal"]', { timeout: 10000 }).catch(() => {});
		await pcLightPage.waitForTimeout(800);
		await pcLightPage.screenshot({
			path: path.join(outDir, "15_patient_recalls_hub_modal_pc_light.png"),
			fullPage: false,
		});
	}

	await pcLightContext.close();

	console.log("[Audit] Capturing PC Dark (1440x900)...");
	const pcDarkContext = await createContextWithAuth({ width: 1440, height: 900 }, false, "dark");
	const pcDarkPage = await pcDarkContext.newPage();
	await waitForPatientsViewReady(pcDarkPage, false);

	await pcDarkPage.screenshot({
		path: path.join(outDir, "02_patients_list_pc_dark.png"),
		fullPage: false,
	});

	await pcDarkPage.evaluate(() => {
		const el = document.querySelector('[data-testid="patient-family-card"]') || document.querySelector('.patient-admin-panel');
		if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
	});
	await pcDarkPage.waitForTimeout(500);
	await pcDarkPage.screenshot({
		path: path.join(outDir, "04_patient_card_family_pc_dark.png"),
		fullPage: false,
	});
	await pcDarkContext.close();

	// -------------------------------------------------------------
	// 2. Mobile Light & Dark: Grouped Cards & Profile (390x844)
	// -------------------------------------------------------------
	console.log("[Audit] Capturing Mobile Light (390x844)...");
	const mobLightContext = await createContextWithAuth({ width: 390, height: 844 }, true, "light");
	const mobLightPage = await mobLightContext.newPage();
	await waitForPatientsViewReady(mobLightPage, true);

	// Снимок 5: Мобильный список пациентов (Grouped Cards с кнопками звонка и WhatsApp)
	await mobLightPage.screenshot({
		path: path.join(outDir, "05_patients_list_mobile_light.png"),
		fullPage: false,
	});

	// Клик по первому пациенту -> открытие мобильного профиля
	const firstPatientItem = mobLightPage.locator('.mobile-patient-item').first();
	if (await firstPatientItem.count() > 0) {
		await firstPatientItem.click();
		await mobLightPage.waitForTimeout(800);
	}
	await mobLightPage.screenshot({
		path: path.join(outDir, "07_patient_profile_mobile_light.png"),
		fullPage: false,
	});
	await mobLightContext.close();

	console.log("[Audit] Capturing Mobile Dark (390x844)...");
	const mobDarkContext = await createContextWithAuth({ width: 390, height: 844 }, true, "dark");
	const mobDarkPage = await mobDarkContext.newPage();
	await waitForPatientsViewReady(mobDarkPage, true);

	await mobDarkPage.screenshot({
		path: path.join(outDir, "06_patients_list_mobile_dark.png"),
		fullPage: false,
	});

	const firstPatientDark = mobDarkPage.locator('.mobile-patient-item').first();
	if (await firstPatientDark.count() > 0) {
		await firstPatientDark.click();
		await mobDarkPage.waitForTimeout(800);
	}
	await mobDarkPage.screenshot({
		path: path.join(outDir, "08_patient_profile_mobile_dark.png"),
		fullPage: false,
	});
	await mobDarkContext.close();

	// -------------------------------------------------------------
	// 3. Public Online Booking Widget: PC Light/Dark & Mobile Light/Dark
	// -------------------------------------------------------------
	const bookingUrl = `http://127.0.0.1:5173/#/portal/booking/${auth.organizationId || "dce70000-546f-4147-878f-3bcf77790001"}`;
	console.log(`[Audit] Capturing Public Booking Widget: ${bookingUrl}`);

	// PC Light Booking
	const bookingPcLightCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
	const bookingPcLightPage = await bookingPcLightCtx.newPage();
	await bookingPcLightPage.goto(bookingUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
	await bookingPcLightPage.evaluate(() => {
		document.documentElement.setAttribute("data-theme", "light");
		document.documentElement.className = "";
	});
	await bookingPcLightPage.waitForTimeout(1200);
	await bookingPcLightPage.screenshot({
		path: path.join(outDir, "09_public_booking_widget_pc_light.png"),
		fullPage: false,
	});

	// Переключение на кабинет пациента (PC Light)
	const cabinetTabBtn = bookingPcLightPage.locator('button:has-text("Кабинет пациента")');
	if (await cabinetTabBtn.count() > 0) {
		await cabinetTabBtn.click();
		await bookingPcLightPage.waitForTimeout(800);
		await bookingPcLightPage.screenshot({
			path: path.join(outDir, "13_public_patient_cabinet_pc_light.png"),
			fullPage: false,
		});
	}
	await bookingPcLightCtx.close();

	// PC Dark Booking
	const bookingPcDarkCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
	const bookingPcDarkPage = await bookingPcDarkCtx.newPage();
	await bookingPcDarkPage.goto(bookingUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
	await bookingPcDarkPage.evaluate(() => {
		document.documentElement.setAttribute("data-theme", "dark");
		document.documentElement.className = "dark";
	});
	await bookingPcDarkPage.waitForTimeout(1200);
	await bookingPcDarkPage.screenshot({
		path: path.join(outDir, "10_public_booking_widget_pc_dark.png"),
		fullPage: false,
	});
	await bookingPcDarkCtx.close();

	// Mobile Light Booking (390x844)
	const bookingMobLightCtx = await browser.newContext({
		viewport: { width: 390, height: 844 },
		userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
		isMobile: true,
		hasTouch: true,
	});
	const bookingMobLightPage = await bookingMobLightCtx.newPage();
	await bookingMobLightPage.goto(bookingUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
	await bookingMobLightPage.evaluate(() => {
		document.documentElement.setAttribute("data-theme", "light");
		document.documentElement.className = "";
	});
	await bookingMobLightPage.waitForTimeout(1200);
	await bookingMobLightPage.screenshot({
		path: path.join(outDir, "11_public_booking_widget_mobile_light.png"),
		fullPage: false,
	});
	await bookingMobLightCtx.close();

	// Mobile Dark Booking (390x844)
	const bookingMobDarkCtx = await browser.newContext({
		viewport: { width: 390, height: 844 },
		userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
		isMobile: true,
		hasTouch: true,
	});
	const bookingMobDarkPage = await bookingMobDarkCtx.newPage();
	await bookingMobDarkPage.goto(bookingUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
	await bookingMobDarkPage.evaluate(() => {
		document.documentElement.setAttribute("data-theme", "dark");
		document.documentElement.className = "dark";
	});
	await bookingMobDarkPage.waitForTimeout(1200);
	await bookingMobDarkPage.screenshot({
		path: path.join(outDir, "12_public_booking_widget_mobile_dark.png"),
		fullPage: false,
	});

	// Переключение на кабинет в мобильном режиме
	const mobCabinetTabBtn = bookingMobDarkPage.locator('button:has-text("Кабинет пациента")');
	if (await mobCabinetTabBtn.count() > 0) {
		await mobCabinetTabBtn.click();
		await bookingMobDarkPage.waitForTimeout(800);
		await bookingMobDarkPage.screenshot({
			path: path.join(outDir, "14_public_patient_cabinet_mobile_dark.png"),
			fullPage: false,
		});
	}
	await bookingMobDarkCtx.close();

	await browser.close();
	console.log("[Audit] All screenshots captured successfully in:", outDir);
}

runAudit().catch(err => {
	console.error("[Audit Error]", err);
	process.exit(1);
});
