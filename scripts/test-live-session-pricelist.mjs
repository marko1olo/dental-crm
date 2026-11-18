import { chromium } from "playwright";

const uniqueId = Date.now();
console.log("[Provisioning] Calling API setup init...");
const initRes = await fetch("http://127.0.0.1:4100/api/auth/setup/init", {
	method: "POST",
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify({
		clinicName: "Стоматология ДЕНТЕ Премиум",
		email: `doctor-pricelist-${uniqueId}@dente.local`,
		password: "Password123!",
		ownerName: "Д-р Воронов А. В.",
		ownerPin: "1234",
	}),
});
const initData = await initRes.json();

console.log("[Provisioning] Calling API staff unlock...");
const unlockRes = await fetch("http://127.0.0.1:4100/api/auth/staff/unlock", {
	method: "POST",
	headers: {
		"Content-Type": "application/json",
		"x-dente-clinic-token": initData.clinicToken,
	},
	body: JSON.stringify({ userId: initData.ownerUserId, pinCode: "1234" }),
});
const unlockData = await unlockRes.json();

console.log("[Browser] Launching browser...");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

page.on("console", (m) => console.log(`[CONSOLE ${m.type()}]:`, m.text()));
page.on("pageerror", (e) => console.log("[PAGE ERROR]:", e.message));

await page.addInitScript(
	({ ct, st, uid }) => {
		localStorage.setItem("dente_clinic_token", ct);
		localStorage.setItem("dente_staff_token", st);
		localStorage.setItem("dente_active_role", "owner");
		localStorage.setItem("dente_user_role", "owner");
		localStorage.setItem("dente_workspace_perspective", "owner");
		localStorage.setItem("dente_user_id", uid);
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
		localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true }));
		localStorage.setItem(
			"dental-crm:web-ui-preferences:v1",
			JSON.stringify({
				version: 1,
				uiLanguage: "ru",
				selectedWorkspaceRole: "owner",
				onboardingDismissed: true,
			})
		);
	},
	{ ct: initData.clinicToken, st: unlockData.staffToken, uid: initData.ownerUserId }
);

console.log("Navigating to http://127.0.0.1:5174/#pricelist ...");
await page.goto("http://127.0.0.1:5174/#pricelist", { waitUntil: "commit" });

for (let i = 0; i < 15; i++) {
	await page.waitForTimeout(1000);
	const check = await page.evaluate(() => {
		const modal = document.querySelector('[data-testid="service-pricelist-studio-modal"]');
		const overlay = document.querySelector(".pricelist-studio-overlay");
		return {
			hasModal: !!modal,
			hasOverlay: !!overlay,
			title: document.querySelector(".pricelist-header-title")?.textContent,
		};
	});
	console.log(`[T+${i + 1}s]:`, JSON.stringify(check));
	if (check.hasModal) break;
}

await browser.close();
