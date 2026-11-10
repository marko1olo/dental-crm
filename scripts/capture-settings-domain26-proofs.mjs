import fs, { existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const PROOF_DIR = path.resolve(process.cwd(), "docs/proofs/settings");
mkdirSync(PROOF_DIR, { recursive: true });

async function getAuthTokens() {
	console.log("🔐 Authenticating against Fastify API (http://127.0.0.1:4100)...");
	for (const creds of [
		{ email: "clinic@example.com", password: "dente2026" },
		{ email: "admin@clinic.ru", password: "Password123!" },
	]) {
		try {
			const res = await fetch("http://127.0.0.1:4100/api/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(creds),
			});
			if (res.ok) {
				const data = await res.json();
				console.log(`✅ Logged in as ${data.user?.fullName} (${data.user?.role})`);
				return {
					clinicToken: data.clinicToken,
					staffToken: data.staffToken,
					user: data.user || { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" },
				};
			}
		} catch (err) {
			console.warn(`Auth attempt error: ${err.message}`);
		}
	}

	return {
		clinicToken: "demo-clinic-token",
		staffToken: "demo-showcase-staff-token-chief",
		user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" },
	};
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
				.notification-toast,
				.global-toast,
				.toast-container,
				[data-toast],
				vite-error-overlay {
					display: none !important;
					pointer-events: none !important;
				}
			`;
			document.head.appendChild(style);
		});
	} catch (_) {}
}

async function run() {
	const auth = await getAuthTokens();

	const browserCandidates = [
		"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
		"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	];
	const executablePath = browserCandidates.find((p) => existsSync(p));
	console.log("🚀 Launching browser:", executablePath || "Chromium bundled");

	const browser = await chromium.launch({
		executablePath,
		headless: true,
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	const storageState = {
		cookies: [
			{ name: "dente_clinic_token", value: auth.clinicToken, domain: "127.0.0.1", path: "/" },
			{ name: "dente_staff_token", value: auth.staffToken, domain: "127.0.0.1", path: "/" },
		],
		origins: [
			{
				origin: "http://127.0.0.1:5173",
				localStorage: [
					{ name: "dente_demo_showcase", value: "true" },
					{ name: "dente_clinic_token", value: auth.clinicToken },
					{ name: "dente_staff_token", value: auth.staffToken },
					{ name: "dente_active_session_token", value: auth.staffToken },
					{ name: "dente_organization_id", value: "01a00000-0000-0000-0000-000000000000" },
					{ name: "dente_user_id", value: auth.user.id },
					{ name: "dente_user_name", value: auth.user.fullName },
					{ name: "dente_user_role", value: "owner" },
					{ name: "dente_role", value: "owner" },
					{ name: "dente_perspective", value: "owner" },
					{ name: "dental-crm:onboarding:v1", value: JSON.stringify({ dismissed: true, step: "done", completed: true }) },
					{ name: "dente_onboarding_completed", value: "true" },
					{ name: "dente_tour_completed", value: "true" },
					{ name: "dente_tour_dismissed", value: "true" },
					{ name: "dente_guide_tour_dismissed_v2", value: "true" },
					{ name: "dente_demo_banner_dismissed", value: "true" },
					{
						name: "dental-crm:web-ui-preferences:v1",
						value: JSON.stringify({
							version: 1,
							uiLanguage: "ru",
							selectedWorkspaceRole: "owner",
							onboardingDismissed: true,
							onboardingStep: "done",
						}),
					},
					{
						name: "dente_staff_session",
						value: JSON.stringify({
							userId: auth.user.id,
							name: auth.user.fullName,
							fullName: auth.user.fullName,
							role: "owner",
							permissions: ["all"],
						}),
					},
					{
						name: "dental-crm:active-user:v1",
						value: JSON.stringify({
							id: auth.user.id,
							fullName: auth.user.fullName,
							role: "owner",
						}),
					},
				],
			},
		],
	};

	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		locale: "ru-RU",
		storageState,
	});

	await context.addInitScript(
		({ cTok, sTok, uid, fn }) => {
			try {
				localStorage.setItem("dente_demo_showcase", "true");
				localStorage.setItem("dente_clinic_token", cTok);
				localStorage.setItem("dente_staff_token", sTok);
				localStorage.setItem("dente_active_session_token", sTok);
				localStorage.setItem("dente_organization_id", "01a00000-0000-0000-0000-000000000000");
				localStorage.setItem("dente_user_id", uid);
				localStorage.setItem("dente_user_name", fn);
				localStorage.setItem("dente_user_role", "owner");
				localStorage.setItem("dente_role", "owner");
				localStorage.setItem("dente_perspective", "owner");
				localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true }));
				localStorage.setItem("dente_onboarding_completed", "true");
				localStorage.setItem("dente_tour_completed", "true");
				localStorage.setItem("dente_tour_dismissed", "true");
				sessionStorage.setItem("dente_unlocked", "true");
				document.cookie = `dente_clinic_token=${encodeURIComponent(cTok)}; path=/; max-age=31536000`;
				document.cookie = `dente_staff_token=${encodeURIComponent(sTok)}; path=/; max-age=31536000`;
			} catch (_) {}
		},
		{
			cTok: auth.clinicToken,
			sTok: auth.staffToken,
			uid: auth.user.id,
			fn: auth.user.fullName,
		},
	);

	const page = await context.newPage();
	page.on("console", (msg) => {
		const text = msg.text();
		if (!text.includes("[vite]") && !text.includes("Download the React DevTools")) {
			console.log(`[BROWSER ${msg.type()}]:`, text);
		}
	});
	page.on("pageerror", (err) => console.log(`[BROWSER UNCAUGHT]:`, err.message));
	page.on("response", (res) => {
		if (res.status() >= 400) console.log(`[HTTP ${res.status()}]:`, res.url());
	});

	const targetUrl = "http://127.0.0.1:5173/?demo=true&clinic_setup=1#settings-studio";
	console.log(`Navigating to ${targetUrl}...`);

	await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 45000 });

	console.log("Waiting for boot-state to detach...");
	await page.waitForSelector(".boot-state", { state: "detached", timeout: 45000 }).catch((e) => {
		console.warn("Boot state detach wait timed out:", e.message);
	});

	let modalMounted = false;
	for (let attempt = 1; attempt <= 20; attempt++) {
		modalMounted = await page.evaluate(() => {
			const card = document.querySelector(".settings-studio-card");
			if (!card) return false;
			const rect = card.getBoundingClientRect();
			return rect.width > 200 && rect.height > 200;
		});

		if (modalMounted) {
			console.log(`✅ Settings studio card mounted and visible on attempt ${attempt}!`);
			break;
		}

		console.log(`[Attempt ${attempt}/20] Dispatching dente:open-settings event...`);
		const domInfo = await page.evaluate(() => ({
			rootChildren: document.getElementById("root")?.children.length,
			rootHTML: document.getElementById("root")?.innerHTML.slice(0, 300),
			allClasses: Array.from(document.querySelectorAll("*")).map(el => el.className).filter(c => typeof c === 'string' && c.length > 0).slice(0, 15)
		}));
		console.log(`[Attempt ${attempt}/20] DOM INFO:`, JSON.stringify(domInfo));
		await page.evaluate(() => {
			window.dispatchEvent(new CustomEvent("dente:open-settings"));
			window.dispatchEvent(new CustomEvent("dente:open-clinic-setup"));
		});
		await page.waitForTimeout(1200);
	}

	if (!modalMounted) {
		throw new Error("Failed to mount settings studio modal after 20 attempts");
	}

	await suppressOverlays(page);

	const captures = [
		{
			filename: "01_settings_pc_light_1440x900.png",
			viewport: { width: 1440, height: 900 },
			theme: "light",
		},
		{
			filename: "02_settings_pc_dark_1440x900.png",
			viewport: { width: 1440, height: 900 },
			theme: "dark",
		},
		{
			filename: "03_settings_mobile_light_390x844.png",
			viewport: { width: 390, height: 844 },
			theme: "light",
		},
		{
			filename: "04_settings_mobile_dark_390x844.png",
			viewport: { width: 390, height: 844 },
			theme: "dark",
		},
	];

	for (const cap of captures) {
		console.log(`\n📸 Rendering ${cap.filename} (${cap.viewport.width}x${cap.viewport.height}, ${cap.theme})...`);

		// Resize viewport dynamically
		await page.setViewportSize(cap.viewport);

		// Switch theme dynamically on root and modal backdrop
		await page.evaluate(({ th }) => {
			document.documentElement.setAttribute("data-theme", th);
			const backdrop = document.querySelector(".settings-studio-backdrop");
			if (th === "dark") {
				document.documentElement.classList.add("dark");
				document.documentElement.classList.remove("light");
				backdrop?.classList.add("settings-studio-modal-dark");
			} else {
				document.documentElement.classList.add("light");
				document.documentElement.classList.remove("dark");
				backdrop?.classList.remove("settings-studio-modal-dark");
			}
		}, { th: cap.theme });

		await page.waitForTimeout(800);
		await suppressOverlays(page);

		const targetPath = path.join(PROOF_DIR, cap.filename);
		await page.screenshot({ path: targetPath, fullPage: false });

		const size = statSync(targetPath).size;
		console.log(`✅ Saved ${cap.filename}: ${Math.round(size / 1024)} KB (${size} bytes)`);
		if (size < 20 * 1024) {
			throw new Error(`Screenshot ${cap.filename} is smaller than 20KB: ${size} bytes`);
		}
	}

	await browser.close();
	console.log("\n🎉 ALL 4-STATE VISUAL PROOFS SUCCESSFULLY CAPTURED!");
}

run().catch((err) => {
	console.error("FATAL CAPTURE ERROR:", err);
	process.exit(1);
});
