import { chromium } from "playwright";

async function probe() {
	const b = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});
	const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
	await ctx.addInitScript(() => {
		localStorage.setItem("dente_clinic_token", "demo-showcase-token-owner");
		localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-owner");
		localStorage.setItem("dente_active_session_token", "demo-showcase-staff-token-owner");
		localStorage.setItem("dente_active_user_id", "01a00000-0000-0000-0003-000000000004");
		localStorage.setItem("dente_active_role", "owner");
		localStorage.setItem("dente_user_role", "owner");
		localStorage.setItem("dente_role", "owner");
		localStorage.setItem("dente_demo_mode", "true");
		localStorage.setItem("dente_demo_showcase", "true");
		localStorage.setItem("dente_demo_showcase_mode_v1", "true");
		sessionStorage.setItem("dente_unlocked", "true");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_tour_dismissed", "true");
		localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
		localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true }));
		localStorage.setItem("dental-crm:active-user:v1", JSON.stringify({ id: "01a00000-0000-0000-0003-000000000004", fullName: "Д-р Захаров Андрей Васильевич", role: "owner" }));
	});

	const p = await ctx.newPage();
	p.on("console", (m) => {
		const t = m.text();
		if (t.includes("Dente") || t.includes("BOOT") || t.includes("Error") || t.includes("matrix")) {
			console.log(`[P CONSOLE ${m.type()}]:`, t);
		}
	});

	console.log("Navigating to http://127.0.0.1:5173/?demo=true#settings/access...");
	await p.goto("http://127.0.0.1:5173/?demo=true#settings/access", { waitUntil: "commit" });

	console.log("Waiting for .boot-state to detach (up to 40s)...");
	await p.waitForSelector(".boot-state", { state: "detached", timeout: 40000 }).catch((e) => console.log("detach error:", e.message));
	await p.waitForTimeout(3000);

	console.log("Waiting for granular-role-matrix-panel (up to 30s)...");
	await p.waitForSelector('[data-testid="granular-role-matrix-panel"]', { state: "visible", timeout: 30000 }).catch((e) => console.log("matrix wait error:", e.message));

	const isVisible = await p.evaluate(() => Boolean(document.querySelector('[data-testid="granular-role-matrix-panel"]')));
	console.log("FINAL MATRIX VISIBLE:", isVisible);

	if (isVisible) {
		await p.screenshot({ path: "scratch/probe_matrix_captured.png" });
		console.log("Saved scratch/probe_matrix_captured.png!");
	} else {
		const text = await p.evaluate(() => document.body.innerText.slice(0, 300));
		console.log("Body text preview:", text.replace(/\n+/g, " "));
		await p.screenshot({ path: "scratch/probe_matrix_failed.png" });
	}

	await b.close();
}

probe().catch(console.error);
