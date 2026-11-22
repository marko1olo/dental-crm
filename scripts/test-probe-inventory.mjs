import { chromium } from "playwright";

async function main() {
	const browser = await chromium.launch({
		channel: "chrome",
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});
	const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
	const page = await context.newPage();

	// Provision
	const initRes = await fetch("http://127.0.0.1:4100/api/auth/setup/init", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			clinicName: "Стоматология ДЕНТЕ Премиум",
			email: `probe-${Date.now()}@dente-live.local`,
			password: "Password123!",
			ownerName: "Д-р Воронов Алексей Владимирович",
			ownerPin: "123456",
		}),
	});
	const initData = await initRes.json();
	const unlockRes = await fetch("http://127.0.0.1:4100/api/auth/staff/unlock", {
		method: "POST",
		headers: { "Content-Type": "application/json", "x-dente-clinic-token": initData.clinicToken },
		body: JSON.stringify({ userId: initData.ownerUserId, pinCode: "123456" }),
	});
	const unlockData = await unlockRes.json();

	await context.addInitScript(({ ct, st, uid, orgId }) => {
		try {
			localStorage.setItem("dente_demo_showcase", "true");
			localStorage.setItem("dente_clinic_token", ct);
			localStorage.setItem("dente_staff_token", st);
			localStorage.setItem("dente_active_session_token", st);
			localStorage.setItem("dente_active_user_id", uid);
			localStorage.setItem("dente_active_role", "owner");
			localStorage.setItem("dente_user_role", "owner");
			localStorage.setItem("dente_user_name", "Д-р Воронов Алексей Владимирович");
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_tour_dismissed", "true");
			localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
			sessionStorage.setItem("dente_unlocked", "true");
			localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true }));
			localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
				version: 1,
				uiLanguage: "ru",
				selectedWorkspaceRole: "owner",
				selectedSpecialty: "therapist",
				onboardingDismissed: true,
				onboardingStep: "done",
			}));
			localStorage.setItem("dente_staff_session", JSON.stringify({
				userId: uid,
				name: "Д-р Воронов А. В.",
				fullName: "Д-р Воронов Алексей Владимирович",
				role: "owner",
				organizationId: orgId,
				permissions: ["all"],
			}));
			document.cookie = `dente_clinic_token=${encodeURIComponent(ct)}; path=/; max-age=31536000`;
			document.cookie = `dente_staff_token=${encodeURIComponent(st)}; path=/; max-age=31536000`;
		} catch (_) {}
	}, { ct: initData.clinicToken, st: unlockData.staffToken, uid: initData.ownerUserId, orgId: initData.organizationId });

	await page.goto("http://127.0.0.1:5173/", { waitUntil: "commit" });
	await page.waitForTimeout(3000);

	console.log("Current URL:", page.url());
	const buttons = await page.evaluate(() => {
		return Array.from(document.querySelectorAll("button, a")).map(b => b.textContent?.trim()).filter(Boolean);
	});
	console.log("Buttons on screen:", buttons.slice(0, 20));

	const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 300));
	console.log("Body text preview:", bodyText.replace(/\n+/g, " "));

	await browser.close();
}

main().catch(console.error);
