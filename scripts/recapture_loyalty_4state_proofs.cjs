const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const PROOF_DIR = path.resolve(__dirname, "../docs/proofs/loyalty");
if (!fs.existsSync(PROOF_DIR)) {
	fs.mkdirSync(PROOF_DIR, { recursive: true });
}

async function getTokens() {
	const res = await fetch("http://127.0.0.1:4100/api/auth/login", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email: "clinic@example.com", password: "dente2026" }),
	});
	return await res.json();
}

async function main() {
	console.log("1. Fetching auth tokens from Fastify API...");
	const auth = await getTokens();
	console.log("Auth OK:", auth.ok, "staff:", auth.user?.fullName);

	console.log("2. Launching Chrome...");
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-gpu"],
	});

	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
	});

	await context.addInitScript(({ cTok, sTok, user }) => {
		localStorage.setItem("dente_clinic_token", cTok);
		localStorage.setItem("dente_staff_token", sTok);
		localStorage.setItem("dente_active_session_token", sTok);
		localStorage.setItem("dente_active_user_id", user.id);
		localStorage.setItem("dente_active_role", user.role);
		localStorage.setItem("dente_selected_workspace_role", user.role);
		localStorage.setItem("dente_active_mode", "clinic");
		localStorage.setItem("dente_demo_showcase", "true");
		localStorage.setItem("dente_active_view", "schedule");
		sessionStorage.setItem("dente_unlocked", "true");
		sessionStorage.setItem("dente:sw-controller-reload", "1");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_tour_dismissed", "true");
		localStorage.setItem("dente_demo_banner_dismissed", "true");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
		document.cookie = `dente_clinic_token=${encodeURIComponent(cTok)}; path=/; max-age=31536000`;
		document.cookie = `dente_staff_token=${encodeURIComponent(sTok)}; path=/; max-age=31536000`;
	}, { cTok: auth.clinicToken, sTok: auth.staffToken, user: auth.user });

	const page = await context.newPage();

	console.log("3. Navigating to http://127.0.0.1:5173/?demo=true#loyalty ...");
	await page.goto("http://127.0.0.1:5173/?demo=true#loyalty", { waitUntil: "commit", timeout: 25000 });

	console.log("4. Waiting for hydration...");
	let mounted = false;
	for (let i = 0; i < 60; i++) {
		await page.waitForTimeout(500);
		const txt = await page.evaluate(() => (document.body ? document.body.innerText : ""));
		if (txt && !txt.includes("Загрузка системы") && txt.length > 50) {
			console.log(`-> Hydrated in ${i * 0.5}s! Text preview:`, txt.slice(0, 60).replace(/\n/g, " "));
			mounted = true;
			break;
		}
	}
	if (!mounted) {
		throw new Error("Application failed to hydrate within 30 seconds!");
	}

	console.log("5. Ensuring Loyalty Modal is open...");
	await page.evaluate(() => {
		const modal = document.querySelector(".loyalty-modal-container");
		if (!modal) {
			window.dispatchEvent(new CustomEvent("dente-open-loyalty"));
			window.dispatchEvent(new CustomEvent("dente:open-loyalty"));
			window.location.hash = "loyalty";
			window.dispatchEvent(new HashChangeEvent("hashchange"));
		}
	});

	await page.waitForSelector(".loyalty-modal-container", { state: "visible", timeout: 15000 });
	console.log("-> Loyalty modal visible and active!");

	await page.evaluate(() => {
		const s = document.createElement("style");
		s.innerHTML = ".tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay'], .global-toast-container { display: none !important; }";
		document.head.appendChild(s);
	});

	const setTheme = async (th) => {
		await page.evaluate((t) => {
			document.documentElement.setAttribute("data-theme", t);
			if (t === "dark") {
				document.documentElement.classList.add("dark");
				document.documentElement.classList.remove("light");
			} else {
				document.documentElement.classList.add("light");
				document.documentElement.classList.remove("dark");
			}
			localStorage.setItem("dente_theme", t);
			document.documentElement.style.colorScheme = t;
		}, th);
		await page.waitForTimeout(600);
	};

	// 1. PC Light (1440x900)
	console.log("Capturing PC Light...");
	await setTheme("light");
	await page.screenshot({ path: path.join(PROOF_DIR, "loyalty_01_pc_light_1440x900.png") });

	// 2. PC Dark (1440x900)
	console.log("Capturing PC Dark...");
	await setTheme("dark");
	await page.screenshot({ path: path.join(PROOF_DIR, "loyalty_02_pc_dark_1440x900.png") });

	// 3. Tab: Family Wallet ("Семейный кошелек") PC Light
	console.log("Switching to Family Wallet tab...");
	await page.evaluate(() => {
		const btns = Array.from(document.querySelectorAll(".loyalty-tab-btn"));
		const famBtn = btns.find((b) => b.textContent && b.textContent.includes("Семейный кошелек"));
		if (famBtn) famBtn.click();
	});
	await page.waitForTimeout(800);
	await setTheme("light");
	await page.screenshot({ path: path.join(PROOF_DIR, "loyalty_tab_family_pc_light.png") });

	// 4. Tab: Certificates ("Сертификаты") PC Light
	console.log("Switching to Certificates tab...");
	await page.evaluate(() => {
		const btns = Array.from(document.querySelectorAll(".loyalty-tab-btn"));
		const certBtn = btns.find((b) => b.textContent && b.textContent.includes("Сертификаты"));
		if (certBtn) certBtn.click();
	});
	await page.waitForTimeout(800);
	await page.screenshot({ path: path.join(PROOF_DIR, "loyalty_tab_certificates_pc_light.png") });

	// Switch back to Balance tab for Mobile proofs
	await page.evaluate(() => {
		const btns = Array.from(document.querySelectorAll(".loyalty-tab-btn"));
		const balBtn = btns.find((b) => b.textContent && b.textContent.includes("Баланс и касса"));
		if (balBtn) balBtn.click();
	});
	await page.waitForTimeout(600);

	// 5. Mobile Viewport Resize (390x844)
	console.log("Resizing to Mobile (390x844)...");
	await page.setViewportSize({ width: 390, height: 844 });
	await page.waitForTimeout(1000);

	// 6. Mobile Dark (390x844)
	console.log("Capturing Mobile Dark...");
	await setTheme("dark");
	await page.screenshot({ path: path.join(PROOF_DIR, "loyalty_04_mobile_dark_390x844.png") });

	// 7. Mobile Light (390x844)
	console.log("Capturing Mobile Light...");
	await setTheme("light");
	await page.screenshot({ path: path.join(PROOF_DIR, "loyalty_03_mobile_light_390x844.png") });

	// 8. Mobile Light Scrolled
	console.log("Scrolling mobile container to capture CTA and toggle...");
	await page.evaluate(() => {
		const body = document.querySelector(".loyalty-modal-body, .loyalty-tab-content");
		if (body) body.scrollTop = 380;
	});
	await page.waitForTimeout(600);
	await page.screenshot({ path: path.join(PROOF_DIR, "loyalty_03b_mobile_light_scrolled.png") });

	console.log("All visual proofs captured successfully!");
	await browser.close();
}

main().catch((err) => {
	console.error("FATAL ERROR in runner:", err);
	process.exit(1);
});
