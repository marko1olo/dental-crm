import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on("console", (m) => console.log(`[CONSOLE ${m.type()}]:`, m.text()));
page.on("pageerror", (e) => console.log("[PAGE ERROR]:", e.message));

await page.addInitScript(() => {
	localStorage.setItem("dente_clinic_token", "audit-token-clinic");
	localStorage.setItem("dente_staff_token", "audit-token-staff");
	localStorage.setItem("dente_active_role", "owner");
	localStorage.setItem("dente_user_role", "owner");
	localStorage.setItem("dente_onboarding_completed", "true");
	localStorage.setItem("dente_tour_completed", "true");
});

await page.goto("http://127.0.0.1:5173/?demo=true#pricelist", { waitUntil: "commit" });
await page.waitForTimeout(6000);

const info = await page.evaluate(() => {
	return {
		url: window.location.href,
		hash: window.location.hash,
		hasRoot: !!document.getElementById("root"),
		rootChildren: document.getElementById("root")?.children.length,
		rootHtmlSnippet: document.getElementById("root")?.innerHTML.slice(0, 500),
		bodyChildren: Array.from(document.body.children).map((c) => ({
			tag: c.tagName,
			className: c.className,
			id: c.id,
			testId: c.getAttribute("data-testid"),
		})),
	};
});

console.log("PAGE INFO:", JSON.stringify(info, null, 2));
await browser.close();
