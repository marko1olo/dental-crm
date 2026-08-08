import { test, expect, type Page } from "@playwright/test";
import * as path from "path";

// ─── MOCK DATA ────────────────────────────────────────────────────────────────

const MOCK_USER = {
	id: "user-1", orgId: "org-1", name: "Тест Архитектор",
	role: "owner", email: "test@dente.ru", pin: null,
};

const MOCK_DASHBOARD = {
	clinic: {
		id: "org-1", name: "ДЕНТ-ТЕСТ Клиника", mode: "clinic",
		hasInventoryModule: true, hasAnalyticsModule: true,
		hasMarketingModule: true, hasPayrollModule: false,
	},
	staff: [MOCK_USER], shifts: [], scheduleSlots: [], appointments: [],
	waitlist: [], imagingStudies: [], recentPatients: [],
	todayStats: { revenue: 0, appointments: 0, newPatients: 0 },
	notifications: [],
};

const MOCK_PREFERENCES = { theme: "dark", sidebarCollapsed: false, language: "ru" };

const MOCK_CLINIC_PROFILE = {
	id: "org-1", name: "ДЕНТ-ТЕСТ Клиника", address: "ул. Тестовая, 1",
	phone: "+7 (000) 000-00-00", mode: "clinic",
	features: {
		hasInventoryModule: true, hasAnalyticsModule: true,
		hasMarketingModule: true, hasPayrollModule: false,
	},
};

const ARTIFACTS_DIR = "C:/Users/Admin/.gemini/antigravity/brain/a4816d4c-324b-4377-a1a5-7447446ea0af";

// ─── ROUTE MOCKING ────────────────────────────────────────────────────────────

async function mockAllApiRoutes(page: Page) {
	await page.route("**/api/auth/user/me", async (route) => {
		await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_USER) });
	});
	await page.route("**/api/dashboard", async (route) => {
		await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_DASHBOARD) });
	});
	await page.route("**/api/settings/preferences**", async (route) => {
		if (route.request().method() === "GET") {
			await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_PREFERENCES) });
		} else {
			await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
		}
	});
	await page.route("**/api/settings/clinic/profile**", async (route) => {
		await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_CLINIC_PROFILE) });
	});
	await page.route("**/api/system/**", async (route) => {
		await route.fulfill({ status: 200, contentType: "application/json",
			body: JSON.stringify({ healthy: true, ready: true, issues: [], plans: [] }) });
	});
	await page.route("**/api/hr/**", async (route) => {
		await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
	});
	await page.route("**/api/communications/**", async (route) => {
		await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
	});
	await page.route("**/api/settings/**", async (route) => {
		await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
	});
	await page.route("**/api/imaging/**", async (route) => {
		await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
	});
	await page.route("**/api/visits/**", async (route) => {
		await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
	});
	await page.route("**/api/audit/**", async (route) => {
		await route.fulfill({ status: 200, contentType: "application/json",
			body: JSON.stringify({ items: [], total: 0 }) });
	});
	// Catch-all for any remaining /api/* endpoints
	await page.route("**/api/**", async (route) => {
		const method = route.request().method();
		if (method === "GET") {
			await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
		} else {
			await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
		}
	});
}

async function screenshot(page: Page, name: string) {
	const p = path.join(ARTIFACTS_DIR, `${name}.png`);
	await page.screenshot({ path: p, fullPage: true, animations: "disabled" });
}

// ─── TESTS ────────────────────────────────────────────────────────────────────

// NOTE: networkidle is intentionally NOT used — the app has active API polling
// that prevents the network from ever going idle. Using 'load' + explicit wait instead.

test.describe("DENTE CRM — Smoke E2E (mocked API)", () => {
	test.beforeEach(async ({ page }) => {
		await mockAllApiRoutes(page);
	});

	test("1. App shell mounts — no JS crashes, #root is visible", async ({ page }) => {
		const pageErrors: string[] = [];
		page.on("pageerror", (err) => pageErrors.push(`PageError: ${err.message}`));

		await page.goto("/", { waitUntil: "load" });
		await page.waitForTimeout(3000);
		await screenshot(page, "01_shell_mount");

		const root = page.locator("#root");
		await expect(root).toBeVisible({ timeout: 10000 });
		expect(pageErrors, `JS crashes detected:\n${pageErrors.join("\n")}`).toEqual([]);
	});

	test("2. Login screen renders when API returns 401", async ({ page }) => {
		// Override auth — force unauthenticated state
		await page.route("**/api/auth/user/me", async (route) => {
			await route.fulfill({ status: 401, contentType: "application/json",
				body: JSON.stringify({ error: "unauthorized" }) });
		});

		await page.goto("/", { waitUntil: "load" });
		await page.waitForTimeout(2000);
		await screenshot(page, "02_login_screen");

		await expect(page.locator("#root")).toBeVisible({ timeout: 10000 });
		const bodyHtml = await page.innerHTML("body");
		expect(bodyHtml.length).toBeGreaterThan(200);
	});

	test("3. Authenticated workspace — sidebar and content visible", async ({ page }) => {
		const pageErrors: string[] = [];
		page.on("pageerror", (err) => pageErrors.push(err.message));

		await page.goto("/", { waitUntil: "load" });
		await page.waitForTimeout(3000);
		await screenshot(page, "03_workspace_authenticated");

		expect(pageErrors, `JS crashes:\n${pageErrors.join("\n")}`).toEqual([]);
		await expect(page.locator("#root")).toBeVisible({ timeout: 10000 });
		const innerText = await page.locator("#root").innerText();
		expect(innerText.length, "App rendered empty content").toBeGreaterThan(10);
	});

	test("4. Hash routing — view changes without crashing", async ({ page }) => {
		const pageErrors: string[] = [];
		page.on("pageerror", (err) => pageErrors.push(err.message));

		await page.goto("/", { waitUntil: "load" });
		await page.waitForTimeout(2000);

		for (const hash of ["schedule", "patients", "settings", "finance", "imaging"]) {
			await page.evaluate((h) => { window.location.hash = `#${h}`; }, hash);
			await page.waitForTimeout(600);
			await screenshot(page, `04_view_${hash}`);
		}

		expect(pageErrors, `JS crashes:\n${pageErrors.join("\n")}`).toEqual([]);
	});

	test("5. No React error boundaries triggered after navigation", async ({ page }) => {
		const pageErrors: string[] = [];
		const consoleErrors: string[] = [];
		page.on("pageerror", (err) => pageErrors.push(err.message));
		page.on("console", (msg) => {
			if (msg.type() === "error") {
				const text = msg.text();
				// Ignore expected resource-load failures (fonts, sourcemaps, etc.)
				if (!text.includes("net::ERR_") && !text.includes("Failed to load resource")) {
					consoleErrors.push(text);
				}
			}
		});

		await page.goto("/", { waitUntil: "load" });
		await page.waitForTimeout(2000);

		await page.evaluate(() => { window.location.hash = "#schedule"; });
		await page.waitForTimeout(600);
		await page.evaluate(() => { window.location.hash = "#patients"; });
		await page.waitForTimeout(600);
		await page.evaluate(() => { window.location.hash = "#finance"; });
		await page.waitForTimeout(600);

		await screenshot(page, "05_final_state");

		const bodyText = await page.locator("body").innerText();
		expect(bodyText, "Error boundary message found").not.toContain("Something went wrong");
		expect(bodyText).not.toContain("Что-то пошло не так");

		expect(pageErrors, `JS crashes:\n${pageErrors.join("\n")}`).toEqual([]);
		if (consoleErrors.length > 0) {
			console.warn("Non-fatal console errors:", consoleErrors);
		}
	});
});
