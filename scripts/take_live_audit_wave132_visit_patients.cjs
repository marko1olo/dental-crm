const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

async function provisionSession() {
	const API_BASE = "http://127.0.0.1:4100";
	const uniqueId = Date.now();
	console.log("[Provisioning] Initializing clean clinic session via API...");
	const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			clinicName: "Стоматология ДЕНТЕ Плюс",
			email: `doctor-wave132-${uniqueId}@dente.local`,
			password: "Password123!",
			ownerName: "Д-р Смирнов А. В.",
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

	let patientId = null;

	try {
		const pRes = await fetch(`${API_BASE}/api/patients`, {
			method: "POST",
			headers,
			body: JSON.stringify({
				fullName: "Кузнецов Михаил Васильевич",
				phone: "+7 (916) 777-88-99",
				birthDate: "1985-11-20",
				notes: "Аллергия на пенициллин, гипертония 1 ст.",
			}),
		});
		if (pRes.ok) {
			const pData = await pRes.json();
			patientId = pData.id;
			console.log(`[Provisioning] Created patient: ${patientId} (${pData.fullName})`);

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
					reason: "Первичный осмотр, пульпит 2.4",
				}),
			});
			console.log("[Provisioning] Created in_treatment appointment for patient");
		}
	} catch (e) {
		console.log("[Provisioning] Patient creation note:", e.message);
	}

	return {
		clinicToken: initData.clinicToken,
		staffToken: unlockData.staffToken,
		ownerUserId: initData.ownerUserId,
		patientId,
	};
}

async function capture() {
	const outDir = path.resolve(__dirname, "..", "docs", "screenshots", "inquisition_live");
	if (!fs.existsSync(outDir)) {
		fs.mkdirSync(outDir, { recursive: true });
	}

	const brainDir = "C:/Users/Admin/.gemini/antigravity/brain/e1164d8d-2730-485e-9afe-aa0a260df89f";
	if (!fs.existsSync(brainDir)) {
		fs.mkdirSync(brainDir, { recursive: true });
	}

	const auth = await provisionSession();

	console.log("[Playwright] Launching Chrome headless...");
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
	});
	const page = await context.newPage();

	console.log("[Playwright] Opening http://127.0.0.1:5173/...");
	await page.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded", timeout: 15000 });

	// Inject authenticated tokens and dismiss onboarding completely
	await page.evaluate(({ ct, st, uid, pid }) => {
		localStorage.setItem("dente_clinic_token", ct);
		localStorage.setItem("dente_staff_token", st);
		localStorage.setItem("dente_active_role", "owner");
		localStorage.setItem("dente_theme_mode", "light");
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
		localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
			version: 1,
			uiLanguage: "ru",
			selectedWorkspaceRole: "owner",
			selectedPatientId: pid,
			onboardingDismissed: true,
			onboardingStep: "done",
		}));
		localStorage.setItem(
			"dente-workspace-profile",
			JSON.stringify({
				state: {
					clinicName: "Стоматология ДЕНТЕ Плюс",
					currentDoctor: { id: uid, fullName: "Д-р Смирнов А. В.", role: "owner" },
					flags: { disableTour: true },
				},
			})
		);
	}, { ct: auth.clinicToken, st: auth.staffToken, uid: auth.ownerUserId, pid: auth.patientId });

	console.log("[Playwright] Reloading page to apply authenticated tokens...");
	await page.reload({ waitUntil: "domcontentloaded" });

	// Wait for CRM shell to be completely loaded
	console.log("[Playwright] Waiting for CRM shell to load...");
	await page.waitForFunction(() => {
		const text = document.body.innerText || "";
		return !text.includes("Загрузка CRM") && (document.querySelector(".workspace-shell") || document.querySelector("nav") || text.includes("ДЕНТЕ"));
	}, { timeout: 20000 });
	await page.waitForTimeout(2000);

	const capturedFiles = [];

	async function recordScreenshot(fileName) {
		const isBootState = await page.evaluate(() => {
			const bodyText = document.body.innerText || "";
			return bodyText.includes("Загрузка CRM") || Boolean(document.querySelector(".boot-state"));
		});
		if (isBootState) {
			throw new Error(`CRITICAL VIOLATION: Refusing to capture screenshot for ${fileName} while screen is in "Загрузка CRM" fallback!`);
		}
		const targetPath = path.join(outDir, fileName);
		const brainPath = path.join(brainDir, fileName);
		await page.screenshot({ path: targetPath, fullPage: false });
		fs.copyFileSync(targetPath, brainPath);
		const stats = fs.statSync(targetPath);
		const hash = crypto.createHash("md5").update(fs.readFileSync(targetPath)).digest("hex");
		capturedFiles.push({
			name: fileName,
			size: stats.size,
			md5: hash,
			path: targetPath,
		});
		console.log(`[Captured] ${fileName} -> ${stats.size} bytes (MD5: ${hash})`);
	}

	// ==========================================
	// SECTION 1: «Пациенты» (Patients View)
	// ==========================================
	console.log("\n--- NAVIGATING TO PATIENTS VIEW via window.location.hash = 'patients' ---");
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.evaluate(() => {
		window.location.hash = "patients";
	});
	await page.waitForTimeout(1500);

	const navPatients = await page.$("a[href='#patients'], button:has-text('Пациенты')");
	if (navPatients) {
		await navPatients.click();
	}

	// Wait for patient data to render without "загрузка" pill
	console.log("[Playwright] Waiting for patients data to render...");
	await page.waitForFunction(() => {
		const panel = document.querySelector("#patients, .patients-panel");
		if (!panel) return false;
		const isBusy = panel.getAttribute("aria-busy") === "true";
		const text = panel.innerText || "";
		return !isBusy && !text.includes("загрузка") && (text.includes("Кузнецов") || text.includes("Быстрый поиск") || document.querySelector(".patient-card, table, tr, input[type='search']"));
	}, { timeout: 20000 });
	await page.waitForTimeout(1500);

	// 13_patients_1440x900_light.png
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.evaluate(() => {
		window.scrollTo(0, 0);
		document.documentElement.setAttribute("data-theme", "light");
		document.documentElement.classList.remove("dark");
		document.documentElement.classList.add("light");
		localStorage.setItem("dente_theme_mode", "light");
	});
	await page.waitForTimeout(1000);
	await recordScreenshot("13_patients_1440x900_light.png");

	// 14_patients_1440x900_dark.png
	await page.evaluate(() => {
		window.scrollTo(0, 0);
		document.documentElement.setAttribute("data-theme", "dark");
		document.documentElement.classList.add("dark");
		document.documentElement.classList.remove("light");
		localStorage.setItem("dente_theme_mode", "dark");
	});
	await page.waitForTimeout(1000);
	await recordScreenshot("14_patients_1440x900_dark.png");

	// 15_patients_390x844_mobile_light.png
	await page.setViewportSize({ width: 390, height: 844 });
	await page.evaluate(() => {
		window.scrollTo(0, 0);
		document.documentElement.setAttribute("data-theme", "light");
		document.documentElement.classList.remove("dark");
		document.documentElement.classList.add("light");
		localStorage.setItem("dente_theme_mode", "light");
	});
	await page.waitForTimeout(1000);
	await recordScreenshot("15_patients_390x844_mobile_light.png");

	// 16_patients_390x844_mobile_dark.png
	await page.evaluate(() => {
		window.scrollTo(0, 0);
		document.documentElement.setAttribute("data-theme", "dark");
		document.documentElement.classList.add("dark");
		document.documentElement.classList.remove("light");
		localStorage.setItem("dente_theme_mode", "dark");
	});
	await page.waitForTimeout(1000);
	await recordScreenshot("16_patients_390x844_mobile_dark.png");

	// ==========================================
	// SECTION 2: «Приём» (Visit / EMK View)
	// ==========================================
	console.log("\n--- NAVIGATING TO VISIT VIEW via window.location.hash = 'visit' ---");
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.evaluate(() => {
		window.location.hash = "visit";
	});
	await page.waitForTimeout(1500);

	const navVisit = await page.$("a[href='#visit'], button:has-text('Прием'), button:has-text('Приём')");
	if (navVisit) {
		await navVisit.click();
	}

	console.log("[Playwright] Waiting for visit view to render...");
	await page.waitForFunction(() => {
		const panel = document.querySelector("#visit, .visit-panel");
		if (!panel) return false;
		const isBusy = panel.getAttribute("aria-busy") === "true";
		const text = panel.innerText || "";
		return !isBusy && !text.includes("загрузка");
	}, { timeout: 20000 });
	await page.waitForTimeout(1500);

	// 09_visit_1440x900_light.png
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.evaluate(() => {
		window.scrollTo(0, 0);
		document.documentElement.setAttribute("data-theme", "light");
		document.documentElement.classList.remove("dark");
		document.documentElement.classList.add("light");
		localStorage.setItem("dente_theme_mode", "light");
	});
	await page.waitForTimeout(1000);
	await recordScreenshot("09_visit_1440x900_light.png");

	// 10_visit_1440x900_dark.png
	await page.evaluate(() => {
		window.scrollTo(0, 0);
		document.documentElement.setAttribute("data-theme", "dark");
		document.documentElement.classList.add("dark");
		document.documentElement.classList.remove("light");
		localStorage.setItem("dente_theme_mode", "dark");
	});
	await page.waitForTimeout(1000);
	await recordScreenshot("10_visit_1440x900_dark.png");

	// 11_visit_390x844_mobile_light.png
	await page.setViewportSize({ width: 390, height: 844 });
	await page.evaluate(() => {
		window.scrollTo(0, 0);
		document.documentElement.setAttribute("data-theme", "light");
		document.documentElement.classList.remove("dark");
		document.documentElement.classList.add("light");
		localStorage.setItem("dente_theme_mode", "light");
	});
	await page.waitForTimeout(1000);
	await recordScreenshot("11_visit_390x844_mobile_light.png");

	// 12_visit_390x844_mobile_dark.png
	await page.evaluate(() => {
		window.scrollTo(0, 0);
		document.documentElement.setAttribute("data-theme", "dark");
		document.documentElement.classList.add("dark");
		document.documentElement.classList.remove("light");
		localStorage.setItem("dente_theme_mode", "dark");
	});
	await page.waitForTimeout(1000);
	await recordScreenshot("12_visit_390x844_mobile_dark.png");

	await browser.close();

	console.log("\n=======================================================");
	console.log("WAVE 132 SCREEN AUDIT COMPLETE. SUMMARY OF PROOFS:");
	console.log("=======================================================");
	let allPass = true;
	const hashes = new Set();
	for (const item of capturedFiles) {
		const isOver40Kb = item.size >= 40960;
		const isUnique = !hashes.has(item.md5);
		hashes.add(item.md5);
		const status = isOver40Kb && isUnique ? "PASS" : "FAIL";
		if (status === "FAIL") allPass = false;
		console.log(`${status} | ${item.name.padEnd(36)} | ${(item.size / 1024).toFixed(1)} KB (${item.size} bytes) | MD5: ${item.md5}`);
	}
	console.log("=======================================================");
	if (!allPass || capturedFiles.length !== 8) {
		console.error("AUDIT PROOF FAILED CRITERIA: Ensure all 8 files >= 40KB and unique hashes!");
		process.exit(1);
	} else {
		console.log("ALL 8 AUDIT PROOFS VERIFIED AND PASSED MACHINE GATES!");
	}
}

capture().catch((err) => {
	console.error("Audit capture script crashed:", err);
	process.exit(1);
});
