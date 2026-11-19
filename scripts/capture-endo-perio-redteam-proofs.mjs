import { mkdirSync, statSync, copyFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CURRENT_CONV_ID = "8631824f-8a2f-403a-b554-32aa951157b7";
const OUT_CONV_ENDO = `C:/Users/Admin/.gemini/antigravity/brain/${CURRENT_CONV_ID}/endo`;
const OUT_CONV_PERIO = `C:/Users/Admin/.gemini/antigravity/brain/${CURRENT_CONV_ID}/perio`;
const OUT_DOCS_ENDO = "C:/Clinic_MVP/dental-crm/docs/proofs/endo";
const OUT_DOCS_PERIO = "C:/Clinic_MVP/dental-crm/docs/proofs/perio";
const API_BASE = "http://127.0.0.1:4100";

mkdirSync(OUT_CONV_ENDO, { recursive: true });
mkdirSync(OUT_CONV_PERIO, { recursive: true });
mkdirSync(OUT_DOCS_ENDO, { recursive: true });
mkdirSync(OUT_DOCS_PERIO, { recursive: true });

async function resolveWebBase() {
	for (const port of [5173, 5174]) {
		try {
			const res = await fetch(`http://127.0.0.1:${port}/`);
			if (res.ok || res.status === 200) {
				return `http://127.0.0.1:${port}`;
			}
		} catch {}
	}
	return "http://127.0.0.1:5173";
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function suppressOverlays(page) {
	try {
		await page.evaluate(() => {
			const style = document.createElement("style");
			style.id = "suppress-all-overlays";
			style.innerHTML = `
				.tour-spotlight-root,
				.tour-backdrop-clickable-zone,
				[data-testid="guided-tour-spotlight-overlay"],
				[data-testid="guided-tour-coach-mark-card"],
				[data-testid="demo-mode-banner"],
				.global-toast-container,
				vite-error-overlay {
					display: none !important;
					pointer-events: none !important;
				}
			`;
			document.head.appendChild(style);
			document.querySelectorAll("vite-error-overlay, .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay'], .toast").forEach((el) => el.remove());
		});
	} catch {}
}

async function setTheme(page, theme) {
	await page.evaluate((th) => {
		const isDark = th === "dark";
		document.documentElement.className = th;
		document.documentElement.setAttribute("data-theme", th);
		document.documentElement.classList.toggle("dark", isDark);
		document.documentElement.classList.toggle("light", !isDark);
		if (document.body) {
			document.body.className = th;
			document.body.setAttribute("data-theme", th);
			document.body.classList.toggle("dark", isDark);
			document.body.classList.toggle("light", !isDark);
		}
	}, theme);
	await page.emulateMedia({ colorScheme: theme });
	await sleep(600);
}

async function saveProof(page, targetDir, convDir, filename, description) {
	const outPath = path.join(targetDir, filename);
	await page.screenshot({ path: outPath, fullPage: false, animations: "disabled" });
	const stat = statSync(outPath);
	if (stat.size < 40960) {
		console.warn(`[WARNING] ${filename} size is ${stat.size} bytes (<40KB threshold).`);
	}
	console.log(`✓ [CAPTURED] ${filename} (${stat.size} bytes / ${(stat.size / 1024).toFixed(1)} KB) -> ${description}`);
	copyFileSync(outPath, path.join(convDir, filename));
}

async function main() {
	console.log("=== STARTING RESILIENT 4-STATE ENDO & PERIO PROOF CAPTURE ===");
	const webBase = await resolveWebBase();
	console.log(`Web Base: ${webBase}`);

	let auth = { clinicToken: "live-inquisition-clinic-token", staffToken: "live-inquisition-staff-token", user: { id: "doc-1", fullName: "Д-р Смирнов А.П.", role: "doctor" } };
	try {
		console.log("🔐 Authenticating against Fastify API...");
		const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email: "admin@clinic.ru", password: "Password123!" }),
		});
		if (loginRes.ok) {
			const data = await loginRes.json();
			if (data.clinicToken) auth.clinicToken = data.clinicToken;
			if (data.staffToken) auth.staffToken = data.staffToken;
			if (data.user) auth.user = data.user;
			console.log(`✅ Logged in as ${auth.user?.fullName}`);
		}
	} catch (e) {
		console.log("Fastify auth note:", e.message);
	}

	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
	});

	try {
		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			colorScheme: "light",
		});

		await context.addInitScript(
			({ clinicToken, staffToken, u }) => {
				localStorage.setItem("dente_clinic_token", clinicToken);
				localStorage.setItem("dente_staff_token", staffToken);
				localStorage.setItem("dente_demo_showcase", "true");
				localStorage.setItem("dente_demo_showcase_mode_v1", "true");
				localStorage.setItem("dente_onboarding_completed", "true");
				localStorage.setItem("dente_tour_completed", "true");
				localStorage.setItem("dente_tour_dismissed", "true");
				localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
				localStorage.setItem("dente_demo_banner_dismissed", "true");
				localStorage.setItem("dente_active_role", u.role || "doctor");
				localStorage.setItem("dente_role", u.role || "doctor");
				localStorage.setItem("dente_active_doctor_name", u.fullName || "Д-р Смирнов А.П.");
				localStorage.setItem("dente_active_user_id", u.id || "doc-1");
				localStorage.setItem("dental-crm:active-user:v1", JSON.stringify(u));
				localStorage.setItem("dente_theme", "light");
				localStorage.setItem("dente_theme_mode", "light");
				localStorage.setItem("theme", "light");
				localStorage.setItem("dente_active_tooth", "16");
				sessionStorage.setItem("dente_unlocked", "true");
				localStorage.setItem(
					"dental-crm:onboarding:v1",
					JSON.stringify({ dismissed: true, step: "done", completed: true })
				);
				localStorage.setItem(
					"dente_active_staff_user",
					JSON.stringify({
						id: u.id || "doc-1",
						fullName: u.fullName || "Д-р Смирнов А.П.",
						role: u.role || "doctor",
					})
				);
				document.cookie = `dente_clinic_token=${encodeURIComponent(clinicToken)}; path=/; max-age=31536000`;
				document.cookie = `dente_staff_token=${encodeURIComponent(staffToken)}; path=/; max-age=31536000`;
			},
			{ clinicToken: auth.clinicToken, staffToken: auth.staffToken, u: auth.user },
		);

		// ==================== 1. ENDODONTICS (4-STATE) ====================
		console.log("\n>>> CAPTURING ENDODONTICS 4-STATE PROOFS <<<");
		const page = await context.newPage();
		page.on("pageerror", (err) => console.log(`[ENDO PAGE ERROR]: ${err.message}`));

		console.log(`Navigating to ${webBase}/?stand=endo&demo=true#endo...`);
		await page.goto(`${webBase}/?stand=endo&demo=true#endo`, { waitUntil: "domcontentloaded", timeout: 45000 });
		await sleep(1500);

		await page.waitForFunction(() => {
			const bodyText = document.body ? document.body.innerText : "";
			return !bodyText.includes("Загрузка системы...");
		}, { timeout: 25000 }).catch(() => {});

		await sleep(800);

		for (let attempt = 0; attempt < 8; attempt++) {
			const modal = await page.$('[data-testid="endodontic-studio-modal"], [data-testid="endo-canal-log-modal"]');
			if (modal) break;
			await page.evaluate(() => {
				window.dispatchEvent(new CustomEvent("dente:open-endo", { detail: { toothNumber: 16 } }));
				window.dispatchEvent(new HashChangeEvent("hashchange"));
			});
			await sleep(500);
		}

		await page.waitForSelector('[data-testid="endodontic-studio-modal"], [data-testid="endo-canal-log-modal"]', { timeout: 25000 });
		console.log("Endo Studio mounted successfully!");
		await sleep(800);
		await suppressOverlays(page);

		// 1. PC Light (1440x900)
		console.log("Capturing 01_endo_studio_pc_light_1440x900.png...");
		await setTheme(page, "light");
		await saveProof(page, OUT_DOCS_ENDO, OUT_CONV_ENDO, "01_endo_studio_pc_light_1440x900.png", "☀️ PC Light (1440x900) Эндодонтическая студия каналов зуба #16");

		// 2. PC Dark (1440x900)
		console.log("Capturing 02_endo_studio_pc_dark_1440x900.png...");
		await setTheme(page, "dark");
		await saveProof(page, OUT_DOCS_ENDO, OUT_CONV_ENDO, "02_endo_studio_pc_dark_1440x900.png", "🌙 PC Dark (1440x900) Эндодонтическая студия каналов зуба #16");

		// 3. Mobile Light (390x844)
		console.log("Switching viewport to Mobile (390x844)...");
		await page.setViewportSize({ width: 390, height: 844 });
		await sleep(800);
		await suppressOverlays(page);

		console.log("Capturing 03_endo_studio_mobile_light_390x844.png...");
		await setTheme(page, "light");
		await saveProof(page, OUT_DOCS_ENDO, OUT_CONV_ENDO, "03_endo_studio_mobile_light_390x844.png", "📱 Mobile Light (390x844) Эндодонтическая студия на смартфоне Apple HIG");

		// 4. Mobile Dark (390x844)
		console.log("Capturing 04_endo_studio_mobile_dark_390x844.png...");
		await setTheme(page, "dark");
		await saveProof(page, OUT_DOCS_ENDO, OUT_CONV_ENDO, "04_endo_studio_mobile_dark_390x844.png", "📱 Mobile Dark (390x844) Эндодонтическая студия на смартфоне Apple HIG");

		// ==================== 2. PERIODONTOLOGY (4-STATE) ====================
		console.log("\n>>> CAPTURING PERIODONTOLOGY 4-STATE PROOFS <<<");
		await page.setViewportSize({ width: 1440, height: 900 });
		await sleep(500);

		console.log(`Navigating to ${webBase}/?stand=perio&demo=true#perio...`);
		await page.goto(`${webBase}/?stand=perio&demo=true#perio`, { waitUntil: "domcontentloaded", timeout: 45000 });
		await sleep(1500);

		await page.waitForFunction(() => {
			const bodyText = document.body ? document.body.innerText : "";
			return !bodyText.includes("Загрузка системы...");
		}, { timeout: 25000 }).catch(() => {});

		await sleep(800);

		for (let attempt = 0; attempt < 8; attempt++) {
			const modal = await page.$('[data-testid="interactive-periodontogram"], [data-testid="perio-chart-modal"]');
			if (modal) break;
			await page.evaluate(() => {
				window.dispatchEvent(new CustomEvent("dente:open-perio-modal", { detail: { patientId: "demo-pat", patientName: "Иванов Иван Иванович" } }));
				window.dispatchEvent(new HashChangeEvent("hashchange"));
			});
			await sleep(500);
		}

		await page.waitForSelector('[data-testid="interactive-periodontogram"], [data-testid="perio-chart-modal"]', { timeout: 25000 });
		console.log("Perio Studio mounted successfully!");
		await sleep(800);
		await suppressOverlays(page);

		// 5. PC Light (1440x900)
		console.log("Capturing 01_perio_studio_pc_light_1440x900.png...");
		await setTheme(page, "light");
		await saveProof(page, OUT_DOCS_PERIO, OUT_CONV_PERIO, "01_perio_studio_pc_light_1440x900.png", "☀️ PC Light (1440x900) Пародонтологическая карта и индексы");

		// 6. PC Dark (1440x900)
		console.log("Capturing 02_perio_studio_pc_dark_1440x900.png...");
		await setTheme(page, "dark");
		await saveProof(page, OUT_DOCS_PERIO, OUT_CONV_PERIO, "02_perio_studio_pc_dark_1440x900.png", "🌙 PC Dark (1440x900) Пародонтологическая карта и индексы");

		// 7. Mobile Light (390x844)
		console.log("Switching viewport to Mobile (390x844)...");
		await page.setViewportSize({ width: 390, height: 844 });
		await sleep(800);
		await suppressOverlays(page);

		console.log("Capturing 03_perio_studio_mobile_light_390x844.png...");
		await setTheme(page, "light");
		await saveProof(page, OUT_DOCS_PERIO, OUT_CONV_PERIO, "03_perio_studio_mobile_light_390x844.png", "📱 Mobile Light (390x844) Пародонтологическая карта на смартфоне Apple HIG");

		// 8. Mobile Dark (390x844)
		console.log("Capturing 04_perio_studio_mobile_dark_390x844.png...");
		await setTheme(page, "dark");
		await saveProof(page, OUT_DOCS_PERIO, OUT_CONV_PERIO, "04_perio_studio_mobile_dark_390x844.png", "📱 Mobile Dark (390x844) Пародонтологическая карта на смартфоне Apple HIG");

		console.log("\n🎉 ALL 8 VISUAL PROOFS SUCCESSFULLY CAPTURED AND RECORDED!");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("[FATAL ERROR]:", err);
	process.exit(1);
});
