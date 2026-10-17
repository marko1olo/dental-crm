const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const http = require("node:http");

const API_BASE = "http://127.0.0.1:4100";
const PROOFS_DIR = path.resolve(process.cwd(), "docs/proofs/treatment-plans");
const BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/57c54b80-4c46-4fc2-bf0f-77b93b3e69f0");

fs.mkdirSync(PROOFS_DIR, { recursive: true });
fs.mkdirSync(BRAIN_DIR, { recursive: true });

async function getWebBase() {
	return "http://127.0.0.1:5174";
}

async function provisionSession() {
	const uniqueId = Date.now();
	console.log("[Provisioning] Initializing clean clinic session via API...");
	const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			clinicName: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
			email: `doctor-agent-${uniqueId}@dente.local`,
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

	console.log("[Provisioning] Seeding real clinical patient...");
	const pRes = await fetch(`${API_BASE}/api/patients`, {
		method: "POST",
		headers,
		body: JSON.stringify({
			fullName: "Волков Дмитрий Андреевич",
			birthDate: "1988-03-24",
			gender: "male",
			phone: "+7 (912) 345-67-89",
			cardNumber: "МК-8492",
			allergies: "Без отягощенного анамнеза",
			chronicDiseases: "Соматически здоров",
		}),
	});
	const pData = await pRes.json();
	const patientId = pData.patient?.id || pData.id || "pat-demo-01";

	return {
		clinicToken: initData.clinicToken,
		staffToken: unlockData.staffToken,
		ownerUserId: initData.ownerUserId,
		patientId,
	};
}

function setupInitStorage(context, auth) {
	return context.addInitScript(({ ct, st, uid, pid }) => {
		localStorage.setItem("dente_clinic_token", ct);
		localStorage.setItem("dente_staff_token", st);
		localStorage.setItem("dente_active_role", "owner");
		localStorage.setItem("dente_user_id", uid);
		localStorage.setItem("dente_active_patient_id", pid);
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem(
			"dente_ui_preferences_v1",
			JSON.stringify({
				onboardingDismissed: true,
				onboardingStep: "done",
				version: 1,
			})
		);
		localStorage.setItem(
			"dental-crm:onboarding:v1",
			JSON.stringify({
				dismissed: true,
				step: "done",
				completed: true,
				onboardingDismissed: true,
				onboardingStep: "done",
				version: 1,
			})
		);
	}, { ct: auth.clinicToken, st: auth.staffToken, uid: auth.ownerUserId, pid: auth.patientId });
}

async function takeProof(page, fileName, description) {
	const primaryPath = path.join(PROOFS_DIR, fileName);
	await page.waitForTimeout(600);
	await page.screenshot({ path: primaryPath, fullPage: false });

	const brainPath = path.join(BRAIN_DIR, fileName);
	fs.copyFileSync(primaryPath, brainPath);

	const stats = fs.statSync(primaryPath);
	const hash = crypto.createHash("md5").update(fs.readFileSync(primaryPath)).digest("hex");
	const sizeKb = (stats.size / 1024).toFixed(1);
	const pass = stats.size >= 20480; // >= 20 KB

	console.log(
		`[PROOF] ${fileName} (${description}): ${stats.size} bytes (${sizeKb} KB) | MD5: ${hash} | >=20KB: ${pass ? "PASS" : "FAIL"}`
	);
	if (!pass) {
		throw new Error(`Screenshot ${fileName} is too small (${stats.size} bytes < 20KB)`);
	}
	return { fileName, sizeBytes: stats.size, sizeKb, md5: hash };
}

async function safeEvaluate(page, fn) {
	for (let i = 0; i < 4; i++) {
		try {
			return await page.evaluate(fn);
		} catch (e) {
			if (i === 3) throw e;
			await page.waitForTimeout(1000);
		}
	}
}

async function capture() {
	const webBase = await getWebBase();
	console.log(`[Target URL] Using Web Base: ${webBase}`);
	const auth = await provisionSession();
	console.log("Launching Google Chrome via Playwright...");
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	try {
		// ═══════════════════════════════════════════════════════════════════════════
		// 1. PC VIEWPORT: 1440 x 900 (LIGHT & DARK + 3-TIER SCENARIOS)
		// ═══════════════════════════════════════════════════════════════════════════
		console.log("\n=== 1. Capturing PC Light (1440x900) ===");
		const pcContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			colorScheme: "light",
		});
		await setupInitStorage(pcContext, auth);

		const pcPage = await pcContext.newPage();
		pcPage.on("console", (msg) => console.log(`[PC Console]:`, msg.text()));
		pcPage.on("pageerror", (err) => console.error("[PC Error]:", err));

		await pcPage.goto(`${webBase}/?treatment-plans=1&demo=true`, { waitUntil: "commit", timeout: 45000 });
		await pcPage.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});
		await pcPage.waitForSelector('[data-testid="treatment-plans-standalone-workspace"]', { timeout: 45000 });
		console.log("Found treatment-plans-standalone-workspace selector on PC!");
		await pcPage.waitForSelector('[data-testid="treatment-plan-toolbar"]', { timeout: 45000 });
		console.log("Found treatment-plan-toolbar selector on PC!");
		await pcPage.waitForTimeout(2000);

		// Switch to "Этапы" tab
		const stagesTab = await pcPage.$('[data-testid="tp-tab-stages"]');
		if (stagesTab) await stagesTab.click();
		await pcPage.waitForTimeout(800);

		// PC LIGHT
		await safeEvaluate(pcPage, () => {
			document.documentElement.setAttribute("data-theme", "light");
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
		});
		await pcPage.waitForTimeout(600);
		await takeProof(pcPage, "01_treatment_plan_pc_light_1440x900.png", "PC Light 1440x900 Stages View");

		// PC DARK
		console.log("\n=== 2. Capturing PC Dark (1440x900) ===");
		await safeEvaluate(pcPage, () => {
			document.documentElement.setAttribute("data-theme", "dark");
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
		});
		await pcPage.waitForTimeout(600);
		await takeProof(pcPage, "02_treatment_plan_pc_dark_1440x900.png", "PC Dark 1440x900 Stages View");

		// 3-TIER SCENARIOS COMPARISON
		console.log("\n=== 3. Capturing 3-Tier Scenarios Comparison (1440x900) ===");
		await safeEvaluate(pcPage, () => {
			document.documentElement.setAttribute("data-theme", "light");
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
		});
		const tab3tier = await pcPage.$('[data-testid="tp-tab-3tier"]');
		if (tab3tier) await tab3tier.click();
		await pcPage.waitForTimeout(1000);
		await takeProof(pcPage, "03_treatment_plan_3tier_scenarios_1440x900.png", "3-Tier Scenarios Comparison (Economy, Optimum, Premium)");

		await pcContext.close();

		// ═══════════════════════════════════════════════════════════════════════════
		// 2. MOBILE VIEWPORT: 390 x 844 (LIGHT & DARK - iPhone 14 / Apple HIG)
		// ═══════════════════════════════════════════════════════════════════════════
		console.log("\n=== 4. Capturing Mobile Light (390x844) ===");
		const mobileContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
			colorScheme: "light",
		});
		await setupInitStorage(mobileContext, auth);

		const mobilePage = await mobileContext.newPage();
		await mobilePage.goto(`${webBase}/?treatment-plans=1&demo=true`, { waitUntil: "commit", timeout: 45000 });
		await mobilePage.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});
		await mobilePage.waitForSelector('[data-testid="treatment-plan-toolbar"]', { timeout: 35000 });
		console.log("Found treatment-plan-toolbar selector on Mobile!");
		await mobilePage.waitForTimeout(1500);

		// Switch to "3tier" tab on mobile and reset toolbar horizontal scroll
		const mob3TierTab = await mobilePage.$('[data-testid="tp-tab-3tier"]');
		if (mob3TierTab) await mob3TierTab.click();
		await safeEvaluate(mobilePage, () => {
			const tb = document.querySelector('[data-testid="treatment-plan-toolbar"]');
			if (tb) tb.scrollLeft = 0;
		});
		await mobilePage.waitForTimeout(600);

		// MOBILE LIGHT
		await safeEvaluate(mobilePage, () => {
			document.documentElement.setAttribute("data-theme", "light");
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
		});
		await mobilePage.waitForTimeout(600);
		await takeProof(mobilePage, "04_treatment_plan_mobile_light_390x844.png", "Apple HIG Mobile Light 390x844");
		// Also duplicate to 03_ prefix
		fs.copyFileSync(
			path.join(PROOFS_DIR, "04_treatment_plan_mobile_light_390x844.png"),
			path.join(PROOFS_DIR, "03_treatment_plan_mobile_light_390x844.png")
		);
		fs.copyFileSync(
			path.join(PROOFS_DIR, "04_treatment_plan_mobile_light_390x844.png"),
			path.join(BRAIN_DIR, "03_treatment_plan_mobile_light_390x844.png")
		);

		// MOBILE DARK
		console.log("\n=== 5. Capturing Mobile Dark (390x844) ===");
		await safeEvaluate(mobilePage, () => {
			document.documentElement.setAttribute("data-theme", "dark");
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
		});
		await mobilePage.waitForTimeout(600);
		await takeProof(mobilePage, "05_treatment_plan_mobile_dark_390x844.png", "Apple HIG Mobile Dark 390x844");
		// Also duplicate to 04_ prefix
		fs.copyFileSync(
			path.join(PROOFS_DIR, "05_treatment_plan_mobile_dark_390x844.png"),
			path.join(PROOFS_DIR, "04_treatment_plan_mobile_dark_390x844.png")
		);
		fs.copyFileSync(
			path.join(PROOFS_DIR, "05_treatment_plan_mobile_dark_390x844.png"),
			path.join(BRAIN_DIR, "04_treatment_plan_mobile_dark_390x844.png")
		);

		await mobileContext.close();
		console.log("\n✅ ALL VISUAL PROOFS CAPTURED SUCCESSFULLY!");
	} finally {
		await browser.close();
	}
}

capture().catch((err) => {
	console.error("Capture failed:", err);
	process.exit(1);
});
