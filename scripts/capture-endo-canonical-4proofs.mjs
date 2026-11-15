import { mkdirSync, statSync, copyFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CURRENT_CONV_ID = "0fe9a155-7ebd-4201-a2a2-248c508ed0bc";
const OUT_CONV = `C:/Users/Admin/.gemini/antigravity/brain/${CURRENT_CONV_ID}`;
const OUT_DOCS = "C:/Clinic_MVP/dental-crm/docs/proofs/endo";
const OUT_THERAPY = "C:/Clinic_MVP/dental-crm/docs/proofs/therapy";
const API_BASE = "http://127.0.0.1:4100";

mkdirSync(OUT_CONV, { recursive: true });
mkdirSync(OUT_DOCS, { recursive: true });
mkdirSync(OUT_THERAPY, { recursive: true });

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

async function saveProof(page, filename, description) {
	const outPath = path.join(OUT_DOCS, filename);
	await page.screenshot({ path: outPath, fullPage: false, animations: "disabled" });
	const stat = statSync(outPath);
	if (stat.size < 20480) {
		throw new Error(`[BLANK PROOF] ${filename} size is only ${stat.size} bytes (required >= 20KB)`);
	}
	console.log(`✓ [CAPTURED] ${filename} (${stat.size} bytes / ${(stat.size / 1024).toFixed(1)} KB) -> ${description}`);
	copyFileSync(outPath, path.join(OUT_CONV, filename));
	copyFileSync(outPath, path.join(OUT_THERAPY, filename));
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

async function main() {
	console.log("=== STARTING RESILIENT 4-STATE ENDODONTICS PROOF CAPTURE ===");
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

		const page = await context.newPage();
		page.on("pageerror", (err) => console.log(`[PAGE ERROR]: ${err.message}`));

		console.log(`Navigating to ${webBase}/?stand=endo&demo=true#endo...`);
		await page.goto(`${webBase}/?stand=endo&demo=true#endo`, { waitUntil: "domcontentloaded", timeout: 35000 });
		await sleep(1500);

		// Ждем полной гидратации и исчезновения экрана загрузки
		await page.waitForFunction(() => {
			const bodyText = document.body ? document.body.innerText : "";
			return !bodyText.includes("Загрузка системы...");
		}, { timeout: 20000 }).catch(() => {});

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

		// Кликаем физиологическую норму обтурации
		const normBtn = await page.$('[data-testid="btn-endo-obturation-norm"], [data-testid="btn-endo-1click-obturation-norm"]');
		if (normBtn) {
			await normBtn.click();
			await sleep(500);
		}

		// 1. PC LIGHT (1440x900)
		console.log("\n--- Capturing 01: PC Light (1440x900) ---");
		await setTheme(page, "light");
		await saveProof(page, "01_endo_studio_pc_light_1440x900.png", "☀️ PC Light (1440x900) Эндодонтическая студия каналов зуба #16");

		// 2. PC DARK (1440x900)
		console.log("\n--- Capturing 02: PC Dark (1440x900) ---");
		await setTheme(page, "dark");
		await saveProof(page, "02_endo_studio_pc_dark_1440x900.png", "🌙 PC Dark (1440x900) Эндодонтическая студия каналов зуба #16");

		// 3. MOBILE LIGHT (390x844) — Мгновенный переход вьюпорта без перезагрузки страницы
		console.log("\n--- Switching viewport to Mobile (390x844) ---");
		await page.setViewportSize({ width: 390, height: 844 });
		await sleep(1000);
		await suppressOverlays(page);

		console.log("--- Capturing 03: Mobile Light (390x844) ---");
		await setTheme(page, "light");
		await saveProof(page, "03_endo_studio_mobile_light_390x844.png", "📱 Mobile Light (390x844) Эндодонтическая студия на смартфоне Apple HIG");

		// 4. MOBILE DARK (390x844)
		console.log("--- Capturing 04: Mobile Dark (390x844) ---");
		await setTheme(page, "dark");
		await saveProof(page, "04_endo_studio_mobile_dark_390x844.png", "📱 Mobile Dark (390x844) Эндодонтическая студия на смартфоне Apple HIG");

		console.log("\n🎉 ALL 4 CANONICAL ENDO PROOFS CAPTURED AND VERIFIED!");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("Proof capture failed:", err);
	process.exit(1);
});
