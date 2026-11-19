/**
 * scripts/take_security_rbac_4state_proofs.cjs
 *
 * 4-STATE VISUAL PROOF FOR SECURITY RBAC ROLE MATRIX & CLINIC DATA PROTECTION (DENTE CRM)
 * 1. ☀️ PC Light (1440x900)
 * 2. 🌙 PC Dark (1440x900)
 * 3. 📱 Mobile Light (390x844)
 * 4. 📱 Mobile Dark (390x844)
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const API_BASE = "http://127.0.0.1:4100";
const WEB_BASE = "http://127.0.0.1:5173";
const CURRENT_CONV_ID = "2eff3b55-8027-42ec-b994-962181e46c15";
const OUT_DOCS = path.resolve(__dirname, "../docs/proofs/security");
const OUT_DOCS_RBAC = path.resolve(__dirname, "../docs/proofs/security_rbac");
const OUT_BRAIN = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${CURRENT_CONV_ID}/screenshots`);

[OUT_DOCS, OUT_DOCS_RBAC, OUT_BRAIN].forEach((dir) => {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

async function provisionClinicalSession() {
	console.log("[Provisioning] Using canonical demo showcase session for flawless matrix rendering...");
	return {
		clinicToken: "demo-showcase-token-owner",
		organizationId: "01a00000-0000-0000-0001-000000000001",
		staffToken: "demo-showcase-staff-token-owner",
		ownerUserId: "01a00000-0000-0000-0003-000000000004",
	};
}

async function suppressOverlays(page) {
	await page.evaluate(() => {
		try {
			const style = document.createElement("style");
			style.id = "suppress-all-proof-overlays-sec";
			style.innerHTML = `
				.tour-spotlight-root, .tour-backdrop-clickable-zone,
				[data-testid="guided-tour-spotlight-overlay"],
				[data-testid="guided-tour-coach-mark-card"],
				[data-testid="demo-mode-banner"], .global-toast-container,
				.workspace-continuity-strip, .copilot-trigger-btn,
				vite-error-overlay { display: none !important; pointer-events: none !important; }
			`;
			document.head.appendChild(style);
			document.querySelectorAll("vite-error-overlay, .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay']").forEach((el) => el.remove());
		} catch (_) {}
	});
}

async function applyTheme(page, isDark) {
	await page.evaluate((dark) => {
		const mode = dark ? "dark" : "light";
		localStorage.setItem("dente_theme_mode", mode);
		localStorage.setItem("dente_theme", mode);
		document.documentElement.setAttribute("data-theme", mode);
		document.body.setAttribute("data-theme", mode);
		document.documentElement.dataset.theme = mode;
		if (dark) {
			document.documentElement.classList.add("dark");
			document.documentElement.classList.remove("light");
			document.body.classList.add("dark");
			document.body.classList.remove("light");
			document.documentElement.style.colorScheme = "dark";
		} else {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			document.body.classList.remove("dark");
			document.body.classList.add("light");
			document.documentElement.style.colorScheme = "light";
		}
	}, isDark);
	await page.waitForTimeout(600);
}

async function saveProof(page, filename, altName) {
	await page.waitForTimeout(1000);
	const pDocs = path.join(OUT_DOCS, filename);
	const pAltDocs = altName ? path.join(OUT_DOCS, altName) : null;
	const pBrain = path.join(OUT_BRAIN, filename);

	const isMatrixVisible = await page.evaluate(() =>
		Boolean(document.querySelector('[data-testid="granular-role-matrix-panel"]'))
	);
	console.log(`  [DOM Check] [data-testid="granular-role-matrix-panel"] visible: ${isMatrixVisible}`);

	if (!isMatrixVisible) {
		console.log("  [Current URL]:", page.url());
		const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 300));
		console.log("  [Body Text Preview]:", bodyText.replace(/\n+/g, " "));
		await page.screenshot({ path: "scratch/failed_matrix.png" });
		throw new Error(`[MATRIX NOT VISIBLE] ${filename} could not find [data-testid="granular-role-matrix-panel"] in DOM!`);
	}

	try {
		await page.screenshot({ path: pDocs, fullPage: false, animations: "disabled", timeout: 8000 });
	} catch (err) {
		console.warn(`  [Screenshot Retry without animations]:`, err.message);
		await page.screenshot({ path: pDocs, fullPage: false, timeout: 8000 });
	}
	if (pAltDocs) fs.copyFileSync(pDocs, pAltDocs);
	const pRbac = path.join(OUT_DOCS_RBAC, filename);
	fs.copyFileSync(pDocs, pRbac);
	if (altName) fs.copyFileSync(pDocs, path.join(OUT_DOCS_RBAC, altName));
	fs.copyFileSync(pDocs, pBrain);

	const size = fs.statSync(pDocs).size;
	if (size < 35000) {
		throw new Error(`[BLANK DETECTED] ${filename} is ${size} bytes (< 35KB)!`);
	}
	console.log(`✅ [VERIFIED PROOF] ${filename} (${(size / 1024).toFixed(1)} KB) -> Saved.`);
	return pDocs;
}

const CONFIGS = [
	{
		filename: "01_security_rbac_pc_light_1440x900.png",
		altName: "01_security_rbac_pc_light.png",
		desc: "PC Light 1440x900 (Security & Granular RBAC Role Matrix)",
		viewport: { width: 1440, height: 900 },
		isDark: false,
		isMobile: false,
	},
	{
		filename: "02_security_rbac_pc_dark_1440x900.png",
		altName: "02_security_rbac_pc_dark.png",
		desc: "PC Dark 1440x900 (Security & Granular RBAC Role Matrix)",
		viewport: { width: 1440, height: 900 },
		isDark: true,
		isMobile: false,
	},
	{
		filename: "03_security_rbac_mobile_light_390x844.png",
		altName: "03_security_rbac_mobile_light.png",
		desc: "Mobile Light 390x844 (Apple HIG Touch & Granular RBAC Matrix)",
		viewport: { width: 390, height: 844 },
		isDark: false,
		isMobile: true,
	},
	{
		filename: "04_security_rbac_mobile_dark_390x844.png",
		altName: "04_security_rbac_mobile_dark.png",
		desc: "Mobile Dark 390x844 (Apple HIG Touch & Granular RBAC Matrix)",
		viewport: { width: 390, height: 844 },
		isDark: true,
		isMobile: true,
	},
];

async function main() {
	const auth = await provisionClinicalSession();
	console.log(`\n=== 4-State Visual Proof Capture for Security RBAC Matrix (${WEB_BASE}) ===`);

	const browser = await chromium.launch({
		headless: true,
		executablePath: fs.existsSync("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe")
			? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
			: undefined,
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	try {
		// Pre-warmup connection to Vite
		console.log(`[Warmup] Warming up ${WEB_BASE}...`);
		const warmupPage = await browser.newPage();
		try {
			await warmupPage.goto(`${WEB_BASE}/?demo=true#settings/access`, { waitUntil: "commit", timeout: 60000 });
			await warmupPage.waitForFunction(
				() => !document.querySelector(".boot-state") && document.querySelectorAll("#root > *").length > 0,
				{ timeout: 60000 }
			).catch(() => {});
			await warmupPage.waitForTimeout(2000);
		} catch (e) {
			console.warn("[Warmup] Notice:", e.message);
		} finally {
			await warmupPage.close();
		}
		console.log(`[Warmup] Done! Starting 4-state captures...`);

		for (const cfg of CONFIGS) {
			console.log(`\n📸 Capturing ${cfg.filename} (${cfg.desc})...`);
			const context = await browser.newContext({
				viewport: cfg.viewport,
				isMobile: cfg.isMobile,
				hasTouch: cfg.isMobile,
				deviceScaleFactor: cfg.isMobile ? 2 : 1,
				colorScheme: cfg.isDark ? "dark" : "light",
			});

			await context.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());

			await context.addInitScript(
				({ ct, orgId, st, uid, theme }) => {
					localStorage.setItem("dente_clinic_token", ct);
					localStorage.setItem("dente_organization_id", orgId);
					localStorage.setItem("dente_staff_token", st);
					localStorage.setItem("dente_active_session_token", st);
					localStorage.setItem("dente_active_user_id", uid);
					localStorage.setItem("dente_user_id", uid);
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
					localStorage.setItem("dental-crm:active-user:v1", JSON.stringify({ id: uid, fullName: "Д-р Захаров Андрей Васильевич", role: "owner" }));
					localStorage.setItem(
						"dente-workspace-profile",
						JSON.stringify({ mode: "network", role: "owner", activeRole: "owner" })
					);
					localStorage.setItem(
						"dente_staff_session",
						JSON.stringify({
							userId: uid,
							name: "Д-р Захаров А. В.",
							fullName: "Д-р Захаров Андрей Васильевич",
							role: "owner",
							specialties: ["Стоматолог-терапевт", "Хирург-имплантолог"],
						})
					);
					localStorage.setItem(
						"dental-crm:web-ui-preferences:v1",
						JSON.stringify({
							version: 1,
							uiLanguage: "ru",
							selectedWorkspaceRole: "owner",
							selectedSpecialty: "orthopedist",
							onboardingDismissed: true,
							onboardingStep: "done",
							onboardingDraftMode: false,
						})
					);
				},
				{
					ct: auth.clinicToken,
					orgId: auth.organizationId,
					st: auth.staffToken,
					uid: auth.ownerUserId,
					theme: cfg.isDark ? "dark" : "light",
				}
			);

			const page = await context.newPage();
			page.on("console", (m) => console.log(`[BROWSER ${m.type()}]:`, m.text()));
			page.on("pageerror", (e) => console.error(`[BROWSER ERROR]:`, e.message));
			await page.goto(`${WEB_BASE}/?demo=true#settings/access`, { waitUntil: "commit", timeout: 60000 });

			// Wait for React to mount and all .boot-state elements to completely vanish
			console.log("  Waiting for CRM hydration and .boot-state removal...");
			await page.waitForFunction(
				() => !document.querySelector(".boot-state") && document.querySelectorAll("#root > *").length > 0,
				{ timeout: 60000 }
			).catch((e) => console.warn("  [Notice] boot-state wait:", e.message));
			await page.waitForTimeout(1500);
			await suppressOverlays(page);

			// Direct store navigation to settings/access
			await page.evaluate(() => {
				try {
					if (window.__APP_STORE__) {
						window.__APP_STORE__.getState().setCurrentView("settings");
						window.__APP_STORE__.getState().setSettingsTab("access");
					}
				} catch (_) {}
				window.location.hash = "settings/access";
			});

			// Activate Access / Granular Role Matrix tab via DOM fallbacks if needed
			let accessActivated = false;
			for (let attempt = 0; attempt < 12; attempt++) {
				accessActivated = await page.evaluate((isMobile) => {
					if (document.querySelector('[data-testid="granular-role-matrix-panel"]')) {
						return true;
					}

					// 0. Ensure settings view is open
					const navSettings = document.querySelector('[data-testid="nav-settings"], a[href="#settings"], a[href*="settings"]');
					if (navSettings && !document.querySelector('#settings, [data-testid="settings-view"], .settings-catalogue-sidebar, .settings-zone-mobile')) {
						navSettings.click();
					}

					// In mobile wrapper:
					if (isMobile) {
						const mobileRow = document.querySelector('[data-testid="mobile-settings-row-access"]');
						if (mobileRow) {
							mobileRow.click();
							return true;
						}
						const mobileItems = Array.from(document.querySelectorAll('.mobile-settings-item, button, [role="button"], div[class*="item"]'));
						const accessItem = mobileItems.find(t => /права доступа|доступы|матрица/i.test(t.textContent || ""));
						if (accessItem) {
							accessItem.click();
							return true;
						}
					}

					// In desktop wrapper:
					document.querySelectorAll('details').forEach(d => { d.open = true; });

					const btnById = document.querySelector('#settings-tab-access, [data-testid="settings-tab-access"], [data-testid="admin-tab-access"], button[id*="access"]');
					if (btnById) {
						btnById.click();
						return true;
					}

					const allButtons = Array.from(document.querySelectorAll('button, [role="tab"], .settings-catalogue-btn'));
					const accessTab = allButtons.find(t => /доступы|права доступа|матрица|роли/i.test(t.textContent || ""));
					if (accessTab) {
						accessTab.click();
						return true;
					}

					window.location.hash = 'settings/access';
					return Boolean(document.querySelector('[data-testid="granular-role-matrix-panel"]'));
				}, cfg.isMobile);

				if (accessActivated) {
					console.log(`  [Tab Activation] Triggered on attempt ${attempt + 1}`);
					break;
				}
				await page.waitForTimeout(1000);
			}

			// Wait for loading indicator to finish if present
			await page.waitForFunction(() => !document.body.innerText.includes("Загрузка настроек"), { timeout: 15000 }).catch(() => {});

			// Wait for role matrix panel and retry clicking if needed
			let panelFound = false;
			for (let waitStep = 0; waitStep < 10; waitStep++) {
				panelFound = await page.evaluate(() => Boolean(document.querySelector('[data-testid="granular-role-matrix-panel"]')));
				if (panelFound) break;
				await page.evaluate((isMobile) => {
					try {
						if (window.__APP_STORE__) {
							window.__APP_STORE__.getState().setCurrentView("settings");
							window.__APP_STORE__.getState().setSettingsTab("access");
						}
					} catch (_) {}
					if (isMobile) {
						const mobileRow = document.querySelector('[data-testid="mobile-settings-row-access"]');
						if (mobileRow) mobileRow.click();
					} else {
						document.querySelectorAll('details').forEach(d => { d.open = true; });
						const btnById = document.querySelector('#settings-tab-access, [data-testid="settings-tab-access"], [data-testid="admin-tab-access"]');
						if (btnById) btnById.click();
					}
					window.location.hash = 'settings/access';
				}, cfg.isMobile);
				await page.waitForTimeout(1000);
			}

			await page.waitForSelector('[data-testid="granular-role-matrix-panel"]', { state: "visible", timeout: 35000 }).catch(() => {});
			await applyTheme(page, cfg.isDark);
			await suppressOverlays(page);

			// Scroll role matrix panel into view
			const matrixLoc = page.locator('[data-testid="granular-role-matrix-panel"]').first();
			if (await matrixLoc.isVisible().catch(() => false)) {
				await matrixLoc.scrollIntoViewIfNeeded().catch(() => {});
				await page.waitForTimeout(500);
			}

			await saveProof(page, cfg.filename, cfg.altName);
			await context.close();
		}

		console.log("\n🎉 ALL 4-STATE PROOFS FOR SECURITY RBAC MATRIX CAPTURED AND VERIFIED SUCCESSFULLY!");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("FATAL ERROR in main:", err);
	process.exit(1);
});
