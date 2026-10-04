import { chromium } from "playwright";

async function main() {
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--use-gl=angle", "--use-angle=swiftshader", "--ignore-gpu-blocklist"],
	});
	const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
	const page = await context.newPage();

	const mockDashboard = {
		clinicName: "Стоматология ДЕНТЕ Премиум",
		todayIso: "2026-10-03",
		clinicSettings: {
			profile: {
				id: "c-1",
				organizationId: "00000000-0000-0000-0000-000000000001",
				clinicName: "Стоматология ДЕНТЕ Премиум",
				mode: "small_clinic",
				defaultVisitMinutes: 45,
				scheduleDefaults: { workingDays: [1, 2, 3, 4, 5, 6], workdayStart: "08:00", workdayEnd: "21:00", appointmentBufferMinutes: 10 },
				timezone: "Europe/Moscow",
				updatedAt: new Date().toISOString(),
			},
			staff: [{ id: "doc-1", organizationId: "00000000-0000-0000-0000-000000000001", fullName: "Д-р Воронов Алексей Владимирович", role: "owner", specialties: ["therapist"], active: true, color: "#0d9488", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }],
			chairs: [{ id: "chair-1", organizationId: "00000000-0000-0000-0000-000000000001", name: "Кабинет 1", room: "1", defaultDoctorId: "doc-1", active: true }],
		},
		patients: [{ id: "pat-zakharov", organizationId: "00000000-0000-0000-0000-000000000001", fullName: "Захаров Иван Дмитриевич", status: "active", birthDate: "1980-05-15", phone: "+7 (999) 000-11-22", notes: "КЛКТ", administrativeProfile: "normal", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }],
	};

	await page.route("**/api/**", async (route) => {
		const url = route.request().url();
		if (url.includes("/api/dashboard")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard) });
		if (url.includes("/api/auth/user/me") || url.includes("/api/auth/session")) {
			return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user: { id: "doc-1", fullName: "Д-р Воронов", role: "owner" } }) });
		}
		if (url.includes("/api/patients")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.patients) });
		return route.continue();
	});

	await page.addInitScript(() => {
		localStorage.setItem("dente_clinic_token", "audit-token-clinic");
		localStorage.setItem("dente_staff_token", "audit-token-staff");
		localStorage.setItem("dente_active_role", "owner");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_tour_completed", "true");
	});

	await page.goto("http://127.0.0.1:5173/#imaging", { waitUntil: "domcontentloaded", timeout: 30000 });
	await page.waitForTimeout(2000);

	await page.evaluate(() => {
		document.querySelectorAll(".tour-spotlight-root, [data-testid='doctor-training-coach-mark-card'], [data-testid='guided-tour-spotlight-overlay']").forEach((el) => el.remove());
	});

	const openMprBtn = page.locator("[data-testid='imaging-open-3d-mpr']");
	await openMprBtn.waitFor({ state: "visible", timeout: 15000 });
	await openMprBtn.click({ force: true });

	const loadDemoBtn = page.locator("[data-testid='cbct-btn-load-demo-empty']");
	await loadDemoBtn.waitFor({ state: "visible", timeout: 15000 });
	await loadDemoBtn.click({ force: true });

	await page.locator("[data-testid='cbct-empty-volume-dropzone']").waitFor({ state: "hidden", timeout: 45000 });
	console.log("Volume mounted!");
	await page.waitForTimeout(3000);

	// Inspect all elements inside the 4th quadrant
	const dump = await page.evaluate(() => {
		const container = document.querySelector("[data-testid='cbct-viewport-container-volume3d']");
		if (!container) return { error: "No container found!" };

		const elements = [];
		const all = container.querySelectorAll("*");
		for (const el of all) {
			const comp = window.getComputedStyle(el);
			const rect = el.getBoundingClientRect();
			elements.push({
				tag: el.tagName,
				testId: el.getAttribute("data-testid"),
				className: el.className,
				bg: comp.backgroundColor,
				color: comp.color,
				rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
				zIndex: comp.zIndex,
				display: comp.display,
				visibility: comp.visibility,
			});
		}

		// Check pixel color in the center of canvas
		const canvas = container.querySelector("canvas[data-testid='cbct-volume-3d-canvas']");
		let pixel = null;
		if (canvas) {
			const ctx = canvas.getContext("2d");
			if (ctx) {
				const p = ctx.getImageData(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1).data;
				pixel = { r: p[0], g: p[1], b: p[2], a: p[3], ctxType: "2d" };
			} else {
				const gl = canvas.getContext("webgl2");
				if (gl) {
					const p = new Uint8Array(4);
					gl.readPixels(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, p);
					pixel = { r: p[0], g: p[1], b: p[2], a: p[3], ctxType: "webgl2" };
				}
			}
		}

		return {
			containerComp: {
				bg: window.getComputedStyle(container).backgroundColor,
				rect: container.getBoundingClientRect(),
			},
			pixel,
			elements,
		};
	});

	console.log("DUMP RESULT:\n", JSON.stringify(dump, null, 2));

	await browser.close();
}

main().catch(console.error);
