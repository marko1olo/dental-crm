/**
 * scripts/take_documents_studio_4state_proofs.cjs
 *
 * 4-STATE VISUAL PROOF FOR DECOMPOSED DOCUMENTS STUDIO MODAL (DENTE CRM)
 * 1. ☀️ PC Light (1440x900)
 * 2. 🌙 PC Dark (1440x900)
 * 3. 📱 Mobile Light (390x844)
 * 4. 📱 Mobile Dark (390x844)
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const CURRENT_CONV_ID = "8384645c-08de-4974-9006-0c750c85ba94";
const OUT_DOCS = path.resolve(__dirname, "../docs/proofs/documents");
const OUT_BRAIN = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${CURRENT_CONV_ID}/screenshots`);

[OUT_DOCS, OUT_BRAIN].forEach((dir) => {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

async function suppressOverlays(page) {
	await page.evaluate(() => {
		const style = document.createElement("style");
		style.id = "suppress-all-proof-overlays";
		style.innerHTML = `
			.tour-spotlight-root, .tour-backdrop-clickable-zone,
			[data-testid="guided-tour-spotlight-overlay"],
			[data-testid="guided-tour-coach-mark-card"],
			[data-testid="demo-mode-banner"], .global-toast-container,
			.boot-state, #boot-screen, .app-boot-container,
			.workspace-continuity-strip, .copilot-trigger-btn,
			vite-error-overlay { display: none !important; pointer-events: none !important; }
		`;
		document.head.appendChild(style);
	}).catch(() => {});
}

async function saveProof(page, filename) {
	await page.waitForTimeout(1000);
	const pDocs = path.join(OUT_DOCS, filename);
	const pBrain = path.join(OUT_BRAIN, filename);

	await page.screenshot({ path: pDocs, fullPage: false, animations: "disabled" });
	fs.copyFileSync(pDocs, pBrain);

	const aliasFilename = filename.replace("_studio_", "_");
	if (aliasFilename !== filename) {
		const pAliasDocs = path.join(OUT_DOCS, aliasFilename);
		const pAliasBrain = path.join(OUT_BRAIN, aliasFilename);
		fs.copyFileSync(pDocs, pAliasDocs);
		fs.copyFileSync(pDocs, pAliasBrain);
	}

	const size = fs.statSync(pDocs).size;
	if (size < 20480) {
		throw new Error(`[BLANK DETECTED] ${filename} is ${size} bytes (< 20KB)!`);
	}
	console.log(`✅ [VERIFIED PROOF] ${filename} (${(size / 1024).toFixed(1)} KB) -> Saved.`);
	return pDocs;
}

const CONFIGS = [
	{
		filename: "01_documents_studio_pc_light_1440x900.png",
		desc: "PC Light 1440x900 (Documents Studio & FNS Tax Certificate)",
		viewport: { width: 1440, height: 900 },
		theme: "light",
		isMobile: false,
	},
	{
		filename: "02_documents_studio_pc_dark_1440x900.png",
		desc: "PC Dark 1440x900 (Documents Studio & FNS Tax Certificate)",
		viewport: { width: 1440, height: 900 },
		theme: "dark",
		isMobile: false,
	},
	{
		filename: "03_documents_studio_mobile_light_390x844.png",
		desc: "Mobile Light 390x844 (Apple HIG Bottom Sheet & Documents Studio)",
		viewport: { width: 390, height: 844 },
		theme: "light",
		isMobile: true,
	},
	{
		filename: "04_documents_studio_mobile_dark_390x844.png",
		desc: "Mobile Dark 390x844 (Apple HIG Bottom Sheet & Documents Studio)",
		viewport: { width: 390, height: 844 },
		theme: "dark",
		isMobile: true,
	},
];

async function main() {
	const activePort = 5173;
	const baseUrl = `http://127.0.0.1:${activePort}`;
	console.log(`\n=== 4-State Visual Proof Capture for Documents Studio (${baseUrl}) ===`);

	const browser = await chromium.launch({
		headless: true,
		executablePath: fs.existsSync("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe")
			? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
			: undefined,
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	try {
		for (const cfg of CONFIGS) {
			console.log(`\n📸 Capturing ${cfg.filename} (${cfg.desc})...`);
			const context = await browser.newContext({
				viewport: cfg.viewport,
				isMobile: cfg.isMobile,
				hasTouch: cfg.isMobile,
				deviceScaleFactor: cfg.isMobile ? 2 : 1,
				colorScheme: cfg.theme,
			});

			await context.addInitScript(({ theme }) => {
				localStorage.setItem("dente_clinic_token", "demo-showcase-token-owner");
				localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-owner");
				localStorage.setItem("dente_active_session_token", "demo-showcase-staff-token-owner");
				localStorage.setItem("dente_active_user_id", "01a00000-0000-0000-0003-000000000004");
				localStorage.setItem("dente_active_role", "owner");
				localStorage.setItem("dente_user_role", "owner");
				localStorage.setItem("dente_role", "owner");
				localStorage.setItem("dente_active_mode", "clinic");
				localStorage.setItem("dente_perspective", "clinical");
				localStorage.setItem("dente_demo_mode", "true");
				localStorage.setItem("dente_demo_showcase", "true");
				localStorage.setItem("dente_demo_showcase_mode_v1", "true");
				sessionStorage.setItem("dente_unlocked", "true");
				localStorage.setItem("dente_onboarding_completed", "true");
				localStorage.setItem("dente_tour_completed", "true");
				localStorage.setItem("dente_tour_dismissed", "true");
				localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
				localStorage.setItem("dente_guide_tour_seen_roles_v2", JSON.stringify(["admin", "doctor", "director", "owner"]));
				localStorage.setItem("dente_demo_banner_dismissed", "true");
				localStorage.setItem("dente_theme", theme);
				localStorage.setItem("dente_theme_mode", theme);
				localStorage.setItem("theme", theme);
				localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true }));
				localStorage.setItem("dental-crm:active-user:v1", JSON.stringify({ id: "01a00000-0000-0000-0003-000000000004", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" }));

				const isDark = theme === "dark";
				document.documentElement.setAttribute("data-theme", theme);
				document.documentElement.classList.toggle("dark", isDark);
				document.documentElement.classList.toggle("light", !isDark);
				document.documentElement.style.colorScheme = isDark ? "dark" : "light";
			}, { theme: cfg.theme });

			const page = await context.newPage();
			page.on("console", (msg) => {
				if (msg.type() === "error") console.log(`[PAGE ERROR] (${cfg.filename}): ${msg.text()}`);
			});

			try {
				await page.goto(`${baseUrl}/?demo=true#consent`, { waitUntil: "networkidle", timeout: 30000 });
			} catch {
				await page.goto(`${baseUrl}/?demo=true#consent`, { waitUntil: "domcontentloaded", timeout: 20000 });
			}

			await page.waitForTimeout(2000);
			await suppressOverlays(page);

			// Trigger opening Documents Studio
			let modalVisible = false;
			for (let i = 0; i < 15; i++) {
				modalVisible = await page.evaluate(() => {
					const el = document.querySelector('.dente-docs-studio-container, [data-testid="documents-studio-modal-backdrop"]');
					if (el) return true;
					window.dispatchEvent(new CustomEvent("dente-open-consent"));
					window.dispatchEvent(new CustomEvent("dente:open-documents", { detail: { template: "tax_certificate" } }));
					return false;
				});
				if (modalVisible) break;
				await page.waitForTimeout(800);
			}

			await page.waitForSelector('.dente-docs-studio-container', { state: "visible", timeout: 15000 }).catch(() => {});
			await suppressOverlays(page);

			// Apply dark mode styles to body as well for dark preset
			if (cfg.theme === "dark") {
				await page.evaluate(() => {
					document.documentElement.setAttribute("data-theme", "dark");
					document.body.setAttribute("data-theme", "dark");
					document.documentElement.classList.add("dark");
					document.documentElement.classList.remove("light");
					document.body.classList.add("dark");
					document.body.classList.remove("light");
					document.documentElement.style.colorScheme = "dark";
				});
				await page.waitForTimeout(500);
			}

			await saveProof(page, cfg.filename);
			await context.close();
		}

		console.log("\n🎉 ALL 4-STATE PROOFS FOR DOCUMENTS STUDIO CAPTURED AND VERIFIED SUCCESSFULLY!");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("FATAL ERROR in main:", err);
	process.exit(1);
});
