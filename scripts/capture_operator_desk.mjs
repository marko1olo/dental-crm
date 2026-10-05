import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

async function obtainRealClinicToken() {
	console.log("Obtaining real HMAC-signed clinic token via /api/auth/clinic/login...");
	const res = await fetch("http://127.0.0.1:4100/api/auth/clinic/login", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email: "clinic@example.com", password: "dente2026" }),
	});
	if (!res.ok) {
		throw new Error(`Clinic login failed: ${res.status} ${await res.text()}`);
	}
	const data = await res.json();
	console.log("Obtained real clinic token for org:", data.clinicProfile?.organizationId);
	return data.clinicToken;
}

async function seedMultiChannelConversations(clinicToken) {
	console.log("Seeding real omnichannel conversations across TG, WA, VK, MAX into PostgreSQL...");

	const events = [
		{
			channel: "telegram",
			senderId: "79165551122",
			senderName: "Волкова Екатерина Сергеевна",
			text: "Здравствуйте! Хочу записаться на приём к терапевту на завтра после 15:00",
		},
		{
			channel: "whatsapp",
			senderId: "79258801240",
			senderName: "Михайлов Денис Владимирович",
			text: "Добрый день! Подскажите, сколько стоит удаление зуба мудрости с анестезией?",
		},
		{
			channel: "vk",
			senderId: "79031194577",
			senderName: "Соколова Ольга Михайловна",
			text: "Здравствуйте! Делаете ли вы профессиональную гигиену полости рта AirFlow?",
		},
		{
			channel: "max",
			senderId: "79775053322",
			senderName: "Ковалев Андрей Павлович",
			text: "Добрый день! Хочу проконсультироваться по установке имплантатов All-on-4.",
		},
	];

	for (const ev of events) {
		const res = await fetch("http://127.0.0.1:4100/api/bots/test-incoming", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-dente-clinic-token": clinicToken,
			},
			body: JSON.stringify(ev),
		});
		if (!res.ok) {
			console.warn(`Failed to seed ${ev.channel}:`, await res.text());
		}
	}

	// 1-Click Operator Takeover of the Telegram chat
	console.log("Executing operator takeover on Telegram chat 79165551122...");
	await fetch("http://127.0.0.1:4100/api/bots/chats/79165551122/takeover", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-dente-clinic-token": clinicToken,
		},
		body: JSON.stringify({
			channel: "telegram",
			operatorName: "Анастасия (Старший администратор)",
		}),
	});

	// Send Operator Response into the chat
	console.log("Sending operator response into Telegram chat 79165551122...");
	await fetch("http://127.0.0.1:4100/api/bots/send-message", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-dente-clinic-token": clinicToken,
		},
		body: JSON.stringify({
			channel: "telegram",
			senderId: "79165551122",
			message: "Екатерина, здравствуйте! Завтра в 15:30 есть свободное окно к доктору Смирновой Е.А. Записать вас?",
			operatorName: "Анастасия (Старший администратор)",
		}),
	});
}

function getTourSuppressionScript(clinicToken) {
	return (token) => {
		try {
			localStorage.setItem("dente_clinic_token", token);
			localStorage.setItem("dente_staff_token", token);
			localStorage.setItem("dente_demo_showcase", "true");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
			localStorage.setItem("dente_guide_tour_seen_roles_v2", JSON.stringify(["admin", "doctor", "director"]));
			localStorage.setItem("dente_quest_progress_v2", JSON.stringify({
				activeTrackId: "solo_doctor",
				currentStepIndex: 0,
				completedStepIds: [],
				isTourActive: false,
				isDismissedPermanently: true,
				tracksProgress: {
					solo_doctor: { completed: true, completedStepIds: [] },
					reception_admin: { completed: true, completedStepIds: [] },
					imaging_diagnostics: { completed: true, completedStepIds: [] },
				},
			}));
			localStorage.setItem("dente_guided_tour_completed", "true");
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_tour_dismissed", "true");
			localStorage.setItem("dente_tour_step", "-1");
		} catch (e) {
			console.error("Init script storage error:", e);
		}
	};
}

async function removeTourOverlays(page, clinicToken) {
	await page.evaluate((token) => {
		localStorage.setItem("dente_clinic_token", token);
		localStorage.setItem("dente_staff_token", token);
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
		localStorage.setItem("dente_guide_tour_seen_roles_v2", JSON.stringify(["admin", "doctor", "director"]));
		localStorage.setItem("dente_quest_progress_v2", JSON.stringify({
			activeTrackId: "solo_doctor",
			currentStepIndex: 0,
			completedStepIds: [],
			isTourActive: false,
			isDismissedPermanently: true,
			tracksProgress: {
				solo_doctor: { completed: true, completedStepIds: [] },
				reception_admin: { completed: true, completedStepIds: [] },
				imaging_diagnostics: { completed: true, completedStepIds: [] },
			},
		}));
		localStorage.setItem("dente_guided_tour_completed", "true");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_tour_dismissed", "true");
		localStorage.setItem("dente_tour_step", "-1");

		document
			.querySelectorAll(
				'.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], [data-testid="interactive-tour-invite-banner"], .tour-backdrop-clickable-zone, .driver-overlay, [data-testid="doctor-training-coachmark-card"], [aria-label="Приглашение в обучающий тур"]'
			)
			.forEach((el) => el.remove());
	}, clinicToken);
}

async function setupContextAndAuth(browser, viewport, clinicToken, isMobile = false) {
	const context = await browser.newContext({
		viewport,
		deviceScaleFactor: isMobile ? 2 : 1,
		isMobile,
		hasTouch: isMobile,
	});

	await context.addInitScript(getTourSuppressionScript(clinicToken), clinicToken);
	return context;
}

async function ensureAppAndCommunicationsView(page, clinicToken) {
	await page.goto("http://127.0.0.1:5173/#communications", { waitUntil: "domcontentloaded" });
	await page.waitForTimeout(2000);
	await removeTourOverlays(page, clinicToken);

	// Check if auth screen is showing
	const isAuthShowing = await page.evaluate(() => {
		const btn = document.querySelector("button.auth-demo-btn");
		if (btn) {
			btn.click();
			return true;
		}
		return false;
	});
	if (isAuthShowing) {
		console.log("Auth screen detected, clicked demo button...");
		await page.waitForTimeout(1000);
		await page.evaluate(() => {
			const card = document.querySelector(".auth-demo-role-card");
			if (card) card.click();
		});
		await page.waitForTimeout(500);
		await page.evaluate(() => {
			const btns = Array.from(document.querySelectorAll("button"));
			const confirm = btns.find((b) => b.textContent && b.textContent.includes("Войти"));
			if (confirm) confirm.click();
		});
		await page.waitForTimeout(2500);
	}

	await removeTourOverlays(page, clinicToken);

	// Click sidebar link if available
	const commLink = page.locator('a[href="#communications"]');
	if (await commLink.isVisible()) {
		console.log("Clicking sidebar link a[href='#communications']...");
		await commLink.click({ force: true });
		await page.waitForTimeout(1500);
	} else {
		await page.evaluate((token) => {
			localStorage.setItem("dente_clinic_token", token);
			localStorage.setItem("dente_staff_token", token);
			window.location.hash = "#communications";
		}, clinicToken);
		await page.waitForTimeout(1500);
	}
	await removeTourOverlays(page, clinicToken);
}

async function prepareDeskWithData(page, clinicToken) {
	// 1. Click on "Пульт ботов (TG/VK/WA/MAX)" tab (desktop or mobile)
	const botInboxTab = page.locator('[data-testid="communications-tab-bot-inbox"]');
	if (await botInboxTab.isVisible()) {
		console.log("Clicking communications-tab-bot-inbox tab...");
		await botInboxTab.click({ force: true });
		await page.waitForTimeout(1500);
	}
	const mobileBotTab = page.locator('[data-testid="tab-mobile-bots"]');
	if (await mobileBotTab.isVisible()) {
		console.log("Clicking mobile tab-mobile-bots tab...");
		await mobileBotTab.click({ force: true });
		await page.waitForTimeout(1500);
	}

	await removeTourOverlays(page, clinicToken);

	// 2. Wait for desk to mount
	const desk = page.locator('[data-testid="omnichannel-operator-desk"]');
	await desk.waitFor({ state: "visible", timeout: 10000 });

	// 3. Wait for conversations to appear and click first item
	const firstConv = page.locator('[data-testid^="conv-item-"]').first();
	try {
		await firstConv.waitFor({ state: "visible", timeout: 5000 });
		console.log("Conversation item found in list! Clicking it...");
		await firstConv.click({ force: true });
	} catch {
		console.log("List not populated yet, clicking simulate-incoming-btn...");
		const simBtn = page.locator('[data-testid="simulate-incoming-btn"]');
		if (await simBtn.isVisible()) {
			await simBtn.click({ force: true });
			await page.waitForTimeout(1500);
		}
		await firstConv.waitFor({ state: "visible", timeout: 8000 });
		await firstConv.click({ force: true });
	}

	// Wait for messages loading spinner to disappear and messages to appear
	try {
		await page.waitForFunction(
			() =>
				!document.body.innerText.includes("Загрузка сообщений...") &&
				(document.body.innerText.includes("Екатерина, здравствуйте!") ||
					document.body.innerText.includes("Здравствуйте! Хочу записаться")),
			{ timeout: 8000 },
		);
	} catch (e) {
		console.warn("Message wait timeout:", e.message);
	}
	await page.waitForTimeout(1000);

	// Scroll desk smoothly into view on PC, scroll to top on mobile
	await page.evaluate(() => {
		if (window.innerWidth > 768) {
			const deskEl = document.querySelector('[data-testid="omnichannel-operator-desk"]');
			if (deskEl) {
				deskEl.scrollIntoView({ block: "start", inline: "nearest" });
			}
		} else {
			window.scrollTo(0, 0);
		}
	});
	await page.waitForTimeout(500);
	await removeTourOverlays(page, clinicToken);
}

async function main() {
	console.log("Starting Playwright capture for Omnichannel Operator Desk...");
	const clinicToken = await obtainRealClinicToken();
	await seedMultiChannelConversations(clinicToken);

	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
	});

	const screenshotsDir = path.resolve("screenshots");
	if (!fs.existsSync(screenshotsDir)) {
		fs.mkdirSync(screenshotsDir, { recursive: true });
	}

	// ═══════════════ 1. PC CONTEXT (1440x900) ═══════════════
	console.log("\n=== Capturing PC Views (1440x900) ===");
	const pcContext = await setupContextAndAuth(browser, { width: 1440, height: 900 }, clinicToken, false);
	const pcPage = await pcContext.newPage();

	await ensureAppAndCommunicationsView(pcPage, clinicToken);
	await prepareDeskWithData(pcPage, clinicToken);

	// PC Light Screenshot
	console.log("Capturing PC Light...");
	await pcPage.evaluate(() => {
		document.documentElement.classList.remove("dark");
		document.documentElement.setAttribute("data-theme", "light");
	});
	await removeTourOverlays(pcPage, clinicToken);
	await pcPage.waitForTimeout(800);
	const pcLightPath = path.join(screenshotsDir, "omnichannel_operator_pc_light.png");
	await pcPage.screenshot({ path: pcLightPath, fullPage: false });
	console.log(`Saved ${pcLightPath}`);

	// PC Dark Screenshot
	console.log("Capturing PC Dark...");
	await pcPage.evaluate(() => {
		document.documentElement.classList.add("dark");
		document.documentElement.setAttribute("data-theme", "dark");
	});
	await removeTourOverlays(pcPage, clinicToken);
	await pcPage.waitForTimeout(800);
	const pcDarkPath = path.join(screenshotsDir, "omnichannel_operator_pc_dark.png");
	await pcPage.screenshot({ path: pcDarkPath, fullPage: false });
	console.log(`Saved ${pcDarkPath}`);

	await pcContext.close();

	// ═══════════════ 2. MOBILE CONTEXT (390x844 - iPhone 14) ═══════════════
	console.log("\n=== Capturing Mobile Views (390x844) ===");
	const mobileContext = await setupContextAndAuth(browser, { width: 390, height: 844 }, clinicToken, true);
	const mobilePage = await mobileContext.newPage();

	await ensureAppAndCommunicationsView(mobilePage, clinicToken);
	await prepareDeskWithData(mobilePage, clinicToken);

	// Ensure mobile view is scrolled to top so sticky nav and desk topbar align cleanly
	await mobilePage.evaluate(() => {
		window.scrollTo(0, 0);
	});
	await mobilePage.waitForTimeout(1000);

	// Mobile Light Screenshot
	console.log("Capturing Mobile Light...");
	await mobilePage.evaluate(() => {
		document.documentElement.classList.remove("dark");
		document.documentElement.setAttribute("data-theme", "light");
	});
	await removeTourOverlays(mobilePage, clinicToken);
	await mobilePage.waitForTimeout(800);
	const mobileLightPath = path.join(screenshotsDir, "omnichannel_operator_mobile_light.png");
	await mobilePage.screenshot({ path: mobileLightPath, fullPage: false });
	console.log(`Saved ${mobileLightPath}`);

	// Mobile Dark Screenshot
	console.log("Capturing Mobile Dark...");
	await mobilePage.evaluate(() => {
		document.documentElement.classList.add("dark");
		document.documentElement.setAttribute("data-theme", "dark");
	});
	await removeTourOverlays(mobilePage, clinicToken);
	await mobilePage.waitForTimeout(800);
	const mobileDarkPath = path.join(screenshotsDir, "omnichannel_operator_mobile_dark.png");
	await mobilePage.screenshot({ path: mobileDarkPath, fullPage: false });
	console.log(`Saved ${mobileDarkPath}`);

	await mobileContext.close();
	await browser.close();
	console.log("\nAll 4 screenshots captured successfully!");
}

main().catch((err) => {
	console.error("Capture failed:", err);
	process.exit(1);
});
