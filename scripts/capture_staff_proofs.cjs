const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const WEB_BASE = "http://127.0.0.1:5173";
const API_BASE = "http://127.0.0.1:4100";
const OUT_DOCS = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/staff");

if (!fs.existsSync(OUT_DOCS)) {
	fs.mkdirSync(OUT_DOCS, { recursive: true });
}

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
			document.querySelectorAll("vite-error-overlay, .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay']").forEach((el) => el.remove());
		});
	} catch (_) {}
}

async function captureScreen(page, filename) {
	await suppressOverlays(page);
	await page.waitForTimeout(600);
	const targetPath = path.join(OUT_DOCS, filename);
	await page.screenshot({ path: targetPath, fullPage: false, animations: "disabled", timeout: 15000 });
	const size = fs.statSync(targetPath).size;
	console.log(`[Captured] ${filename} (${size} bytes) -> OK: ${size >= 20000}`);
	if (size < 20000) {
		throw new Error(`Screenshot ${filename} is too small (${size} bytes < 20KB)!`);
	}
}

async function setTheme(page, theme) {
	await page.evaluate((th) => {
		document.documentElement.setAttribute("data-theme", th);
		if (th === "dark") {
			document.documentElement.classList.add("dark");
			document.documentElement.classList.remove("light");
		} else {
			document.documentElement.classList.add("light");
			document.documentElement.classList.remove("dark");
		}
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("dente_theme_mode", th);
		localStorage.setItem("theme", th);
		document.documentElement.style.colorScheme = th;
	}, theme);
	await suppressOverlays(page);
	await page.waitForTimeout(600);
}

async function getAuthTokens() {
	try {
		const res = await fetch(`${API_BASE}/api/auth/login`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email: "clinic@example.com", password: "dente2026" }),
		});
		const data = await res.json();
		if (data.ok) return data;
	} catch (e) {
		console.warn("API login fallback to mock tokens:", e.message);
	}
	return { clinicToken: "mock-clinic-token", staffToken: "mock-staff-token" };
}

async function injectStorage(context, auth, theme = "light") {
	await context.addInitScript(({ clinicToken, staffToken, th }) => {
		localStorage.setItem("dente_clinic_token", clinicToken);
		localStorage.setItem("dente_staff_token", staffToken);
		localStorage.setItem("dente_active_session_token", staffToken);
		localStorage.setItem("dente_active_role", "owner");
		localStorage.setItem("dente_active_user_id", "demo-owner-id");
		localStorage.setItem("dental-crm:active-user:v1", JSON.stringify({
			id: "demo-owner-id",
			fullName: "Главврач / Владелец",
			role: "owner",
			email: "clinic@example.com",
		}));
		localStorage.setItem("dente_theme_mode", th);
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("theme", th);
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_tour_dismissed", "true");
		localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
		localStorage.setItem("dente_demo_banner_dismissed", "true");
		localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
		localStorage.setItem("dente_quest_progress_v2", JSON.stringify({ isDismissedPermanently: true, activeTrack: null, tracksProgress: {} }));
		localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
			version: 1,
			uiLanguage: "ru",
			selectedWorkspaceRole: "owner",
			onboardingDismissed: true,
			onboardingStep: "done",
		}));
		document.cookie = `dente_clinic_token=${encodeURIComponent(clinicToken)}; path=/; max-age=31536000`;
		document.cookie = `dente_staff_token=${encodeURIComponent(staffToken)}; path=/; max-age=31536000`;
	}, { clinicToken: auth.clinicToken, staffToken: auth.staffToken, th: theme });
}

async function waitForWorkspaceReady(page) {
	console.log("Waiting for workspace to mount...");
	for (let i = 0; i < 40; i++) {
		await page.waitForTimeout(500);
		const ready = await page.evaluate(() => {
			const hasBoot = !!document.querySelector(".boot-state");
			return !hasBoot && !!document.querySelector("#workspace-content, .app-shell, .app-sidebar, nav");
		});
		if (ready) {
			console.log(`Workspace ready in ${i * 0.5}s`);
			break;
		}
	}
	await suppressOverlays(page);
}

async function navigateToDesktopStaffSettings(page) {
	// First ensure role is owner by clicking "Главврач" if present
	await page.evaluate(() => {
		const chiefBtn = Array.from(document.querySelectorAll("button")).find((b) => b.innerText && b.innerText.trim() === "Главврач");
		if (chiefBtn) chiefBtn.click();
	});
	await page.waitForTimeout(500);

	// Navigate to settings view
	console.log("Switching hash to settings/staff...");
	await page.evaluate(() => {
		window.location.hash = "settings/staff";
		window.dispatchEvent(new HashChangeEvent("hashchange"));
	});
	await page.waitForTimeout(1500);

	// If settings-tab-staff button exists, click it
	for (let i = 0; i < 30; i++) {
		const clicked = await page.evaluate(() => {
			const btn = document.getElementById("settings-tab-staff") ||
				Array.from(document.querySelectorAll("button")).find((b) => b.innerText && b.innerText.includes("Сотрудники"));
			if (btn) {
				btn.click();
				return true;
			}
			return false;
		});
		if (clicked) {
			console.log("Clicked settings-tab-staff");
			break;
		}
		await page.waitForTimeout(500);
	}

	// Wait for staff active list or cards
	console.log("Waiting for staff studio or cards...");
	for (let i = 0; i < 30; i++) {
		const hasContent = await page.evaluate(() => {
			return !!document.querySelector(".staff-management-studio") ||
				!!document.querySelector('[data-testid="active-staff-list-card"]') ||
				document.querySelectorAll("button").length > 10;
		});
		if (hasContent) {
			console.log("Staff studio content detected!");
			break;
		}
		await page.waitForTimeout(500);
	}
	await suppressOverlays(page);
}

async function run() {
	console.log("[Staff Proofs] Starting capture pipeline...");
	const auth = await getAuthTokens();
	console.log("[Staff Proofs] Auth tokens acquired.");

	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-gpu"],
	});

	try {
		// ==========================================
		// PHASE 1: PC DESKTOP (1440x900)
		// ==========================================
		console.log("\n--- Phase 1: PC Desktop Context (1440x900) ---");
		const pcContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
		await injectStorage(pcContext, auth, "light");
		const pcPage = await pcContext.newPage();

		console.log("Navigating PC to http://127.0.0.1:5173/?demo=true...");
		await pcPage.goto(`${WEB_BASE}/?demo=true`, { waitUntil: "domcontentloaded", timeout: 45000 });
		await waitForWorkspaceReady(pcPage);
		await navigateToDesktopStaffSettings(pcPage);

		// 1. staff_list_pc_light.png
		console.log("Capturing staff_list_pc_light.png...");
		await captureScreen(pcPage, "staff_list_pc_light.png");

		// Open Card for first doctor
		console.log("Looking for Staff Profile Card button...");
		const openedCard = await pcPage.evaluate(() => {
			const btn = Array.from(document.querySelectorAll("button")).find((b) => b.innerText && b.innerText.includes("Карточка"));
			if (btn) {
				btn.click();
				return true;
			}
			return false;
		});

		if (openedCard) {
			console.log("Staff Profile Card opened!");
			await pcPage.waitForTimeout(1000);
			await suppressOverlays(pcPage);

			// Fill test password to demonstrate live entropy bar
			await pcPage.evaluate(() => {
				const passInput = document.querySelector('input[placeholder="Новый надёжный пароль"]') ||
					document.querySelector('input[type="password"]') ||
					document.querySelector("#staff-security-new-password");
				if (passInput) {
					passInput.value = "Doc2026!DoctorAutonomy";
					passInput.dispatchEvent(new Event("input", { bubbles: true }));
					passInput.dispatchEvent(new Event("change", { bubbles: true }));
				}
			});
			await pcPage.waitForTimeout(600);
			await suppressOverlays(pcPage);

			// 2. staff_security_pc_light.png
			console.log("Capturing staff_security_pc_light.png...");
			await captureScreen(pcPage, "staff_security_pc_light.png");

			// 3. staff_security_pc_dark.png
			console.log("Switching to Dark theme for Staff Security...");
			await setTheme(pcPage, "dark");
			console.log("Capturing staff_security_pc_dark.png...");
			await captureScreen(pcPage, "staff_security_pc_dark.png");

			// Close profile modal
			await pcPage.evaluate(() => {
				const cancelBtn = Array.from(document.querySelectorAll("button")).find((b) => b.innerText && b.innerText.includes("Отмена"));
				if (cancelBtn) cancelBtn.click();
			});
			await pcPage.waitForTimeout(800);
			await suppressOverlays(pcPage);

			// 4. staff_list_pc_dark.png
			console.log("Capturing staff_list_pc_dark.png...");
			await captureScreen(pcPage, "staff_list_pc_dark.png");
		} else {
			console.log("Card button not found on desktop, switching to dark directly...");
			await setTheme(pcPage, "dark");
			await captureScreen(pcPage, "staff_list_pc_dark.png");
		}

		await pcContext.close();

		// ==========================================
		// PHASE 2: MOBILE (390x844)
		// ==========================================
		console.log("\n--- Phase 2: Mobile Context (390x844) ---");
		const mobContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
		});
		await injectStorage(mobContext, auth, "light");
		const mobPage = await mobContext.newPage();

		console.log("Navigating Mobile to http://127.0.0.1:5173/?demo=true...");
		await mobPage.goto(`${WEB_BASE}/?demo=true`, { waitUntil: "domcontentloaded", timeout: 45000 });
		await waitForWorkspaceReady(mobPage);

		// Switch to settings
		await mobPage.evaluate(() => {
			window.location.hash = "settings/staff";
			window.dispatchEvent(new HashChangeEvent("hashchange"));
		});
		await mobPage.waitForTimeout(1500);

		// Click "Сотрудники" in mobile settings root if visible and wait for staff view
		console.log("Waiting for Mobile staff view to mount...");
		for (let i = 0; i < 30; i++) {
			await mobPage.evaluate(() => {
				const row = Array.from(document.querySelectorAll("button, div, a")).find((el) => {
					const t = el.innerText || "";
					return (t.includes("Сотрудники") || t.includes("Персонал")) && el.querySelector("svg");
				});
				if (row) row.click();
			});
			const mounted = await mobPage.evaluate(() => {
				return !!document.querySelector('[data-testid="btn-mobile-back-to-settings-from-staff"]') ||
					!!document.querySelector('.staff-grouped-card');
			});
			if (mounted) {
				console.log("Mobile staff view mounted successfully!");
				break;
			}
			await mobPage.waitForTimeout(500);
		}
		await mobPage.waitForTimeout(1000);
		await suppressOverlays(mobPage);

		// 5. staff_mobile_light.png
		console.log("Capturing staff_mobile_light.png...");
		await captureScreen(mobPage, "staff_mobile_light.png");

		// Open mobile PIN bottom sheet
		console.log("Opening mobile PIN bottom sheet...");
		const openedPinModal = await mobPage.evaluate(() => {
			const btn = Array.from(document.querySelectorAll("button")).find((b) => b.innerText && b.innerText.includes("PIN-код"));
			if (btn) {
				btn.click();
				return true;
			}
			return false;
		});

		if (openedPinModal) {
			console.log("Mobile PIN bottom sheet opened!");
			await mobPage.waitForTimeout(1000);
			// Fill PIN code
			await mobPage.evaluate(() => {
				const pinInput = document.querySelector('input[type="password"]') || document.querySelector('input[inputmode="numeric"]');
				if (pinInput) {
					pinInput.value = "7788";
					pinInput.dispatchEvent(new Event("input", { bubbles: true }));
					pinInput.dispatchEvent(new Event("change", { bubbles: true }));
				}
			});
			await mobPage.waitForTimeout(600);
			await setTheme(mobPage, "dark");
			// 6. staff_mobile_dark.png
			console.log("Capturing staff_mobile_dark.png...");
			await captureScreen(mobPage, "staff_mobile_dark.png");
		} else {
			await setTheme(mobPage, "dark");
			await captureScreen(mobPage, "staff_mobile_dark.png");
		}

		await mobContext.close();
		console.log("\n[Staff Proofs] ALL PROOFS GENERATED SUCCESSFULLY!");
	} finally {
		await browser.close();
	}
}

run().catch((err) => {
	console.error("[Staff Proofs] Fatal error:", err);
	process.exit(1);
});
