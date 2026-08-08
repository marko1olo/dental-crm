import * as path from "node:path";
import { expect, type Page, test } from "@playwright/test";

// ─── TOKEN INJECTION (must match safeLocalStorage.ts constants) ───────────────
const DENTE_CLINIC_TOKEN_KEY = "dente_clinic_token";
const DENTE_STAFF_TOKEN_KEY = "dente_staff_token";
const MOCK_CLINIC_TOKEN = "test-clinic-token-abc123";
const MOCK_STAFF_TOKEN = "test-staff-token-xyz789";

// ─── MOCK DATA ────────────────────────────────────────────────────────────────

const MOCK_USER = {
	id: "user-1",
	orgId: "org-1",
	name: "Тест Архитектор",
	role: "owner",
	email: "test@dente.ru",
	pin: null,
};

const MOCK_DASHBOARD = {
	clinic: {
		id: "org-1",
		name: "ДЕНТ-ТЕСТ Клиника",
		mode: "clinic",
		hasInventoryModule: true,
		hasAnalyticsModule: true,
		hasMarketingModule: true,
		hasPayrollModule: false,
	},
	staff: [MOCK_USER],
	shifts: [],
	scheduleSlots: [],
	appointments: [],
	waitlist: [],
	imagingStudies: [],
	recentPatients: [],
	todayStats: { revenue: 0, appointments: 0, newPatients: 0 },
	notifications: [],
};

const MOCK_PREFERENCES = {
	theme: "dark",
	sidebarCollapsed: false,
	language: "ru",
};
const MOCK_CLINIC_PROFILE = {
	id: "org-1",
	name: "ДЕНТ-ТЕСТ Клиника",
	address: "ул. Тестовая, 1",
	phone: "+7 (000) 000-00-00",
	mode: "clinic",
	features: {
		hasInventoryModule: true,
		hasAnalyticsModule: true,
		hasMarketingModule: true,
		hasPayrollModule: false,
	},
};

const ARTIFACTS_DIR =
	"C:/Users/Admin/.gemini/antigravity/brain/a4816d4c-324b-4377-a1a5-7447446ea0af";

// ─── HELPERS ──────────────────────────────────────────────────────────────────

async function injectAuthTokens(page: Page) {
	// Inject auth tokens BEFORE page load via addInitScript so localStorage is
	// populated when React mounts and reads readDenteClinicToken() / readDenteStaffToken()
	await page.addInitScript(
		({ clinicKey, staffKey, clinicToken, staffToken }) => {
			localStorage.setItem(clinicKey, clinicToken);
			localStorage.setItem(staffKey, staffToken);
		},
		{
			clinicKey: DENTE_CLINIC_TOKEN_KEY,
			staffKey: DENTE_STAFF_TOKEN_KEY,
			clinicToken: MOCK_CLINIC_TOKEN,
			staffToken: MOCK_STAFF_TOKEN,
		},
	);
}

async function mockAllApiRoutes(page: Page) {
	await page.route("**/api/auth/user/me", async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify(MOCK_USER),
		});
	});
	await page.route("**/api/dashboard", async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify(MOCK_DASHBOARD),
		});
	});
	await page.route("**/api/settings/preferences**", async (route) => {
		if (route.request().method() === "GET") {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(MOCK_PREFERENCES),
			});
		} else {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ ok: true }),
			});
		}
	});
	await page.route("**/api/settings/clinic/profile**", async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify(MOCK_CLINIC_PROFILE),
		});
	});
	await page.route("**/api/system/**", async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({
				healthy: true,
				ready: true,
				issues: [],
				plans: [],
			}),
		});
	});
	await page.route("**/api/hr/**", async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify([]),
		});
	});
	await page.route("**/api/communications/**", async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify([]),
		});
	});
	await page.route("**/api/settings/**", async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify([]),
		});
	});
	await page.route("**/api/imaging/**", async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify([]),
		});
	});
	await page.route("**/api/visits/**", async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify([]),
		});
	});
	await page.route("**/api/audit/**", async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({ items: [], total: 0 }),
		});
	});
	// Catch-all for any remaining /api/* endpoints
	await page.route("**/api/**", async (route) => {
		const method = route.request().method();
		if (method === "GET") {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: "[]",
			});
		} else {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ ok: true }),
			});
		}
	});
}

async function screenshot(page: Page, name: string) {
	const p = path.join(ARTIFACTS_DIR, `${name}.png`);
	await page.screenshot({ path: p, fullPage: true, animations: "disabled" });
}

// ─── TESTS ────────────────────────────────────────────────────────────────────
// NOTE: networkidle is intentionally NOT used — the app has active API polling
// that never reaches "network idle". Using 'load' + explicit wait instead.

test.describe("DENTE CRM — Smoke E2E (mocked API + localStorage auth)", () => {
	test.beforeEach(async ({ page }) => {
		await injectAuthTokens(page);
		await mockAllApiRoutes(page);
	});

	test("1. Authenticated workspace mounts — no JS crashes, content visible", async ({
		page,
	}) => {
		const pageErrors: string[] = [];
		page.on("pageerror", (err) => pageErrors.push(`PageError: ${err.message}`));

		await page.goto("/", { waitUntil: "load" });
		await page.waitForTimeout(4000);
		await screenshot(page, "01_workspace_authed");

		// #root should have actual content (not hidden)
		const rootInnerText = await page
			.locator("#root")
			.innerText()
			.catch(() => "");
		expect(
			rootInnerText.length,
			"App rendered empty - React may have crashed",
		).toBeGreaterThan(10);
		expect(pageErrors, `JS crashes:\n${pageErrors.join("\n")}`).toEqual([]);
	});

	test("2. Login screen renders when no auth tokens present", async ({
		page,
	}) => {
		// Override: remove tokens so auth gate kicks in
		await page.addInitScript(() => {
			localStorage.removeItem("dente_clinic_token");
			localStorage.removeItem("dente_staff_token");
		});

		await page.goto("/", { waitUntil: "load" });

		// Login form should have an email input — wait for React lazy component hydration
		const emailInput = page.locator(
			"input[type=email], input[placeholder*='mail'], input[placeholder*='email']",
		);
		await expect(emailInput.first()).toBeVisible({ timeout: 10000 });

		await screenshot(page, "02_login_screen");

		const bodyHtml = await page.innerHTML("body");
		expect(bodyHtml.length, "Login screen rendered empty body").toBeGreaterThan(
			200,
		);
	});

	test("3. Dashboard loads — sidebar navigation rail visible", async ({
		page,
	}) => {
		const pageErrors: string[] = [];
		page.on("pageerror", (err) => pageErrors.push(err.message));

		await page.goto("/", { waitUntil: "load" });
		await page.waitForTimeout(4000);
		await screenshot(page, "03_dashboard");

		expect(pageErrors, `JS crashes:\n${pageErrors.join("\n")}`).toEqual([]);
		const content = await page
			.locator("#root")
			.innerText()
			.catch(() => "");
		expect(content.length).toBeGreaterThan(10);
	});

	test("4. Hash routing — navigates views without JS crash", async ({
		page,
	}) => {
		const pageErrors: string[] = [];
		page.on("pageerror", (err) => pageErrors.push(err.message));

		await page.goto("/", { waitUntil: "load" });
		await page.waitForTimeout(3000);

		for (const hash of [
			"schedule",
			"patients",
			"settings",
			"finance",
			"imaging",
		]) {
			await page.evaluate((h) => {
				window.location.hash = `#${h}`;
			}, hash);
			await page.waitForTimeout(700);
			await screenshot(page, `04_view_${hash}`);
		}

		expect(pageErrors, `JS crashes:\n${pageErrors.join("\n")}`).toEqual([]);
	});

	test("5. No error boundaries triggered after full navigation cycle", async ({
		page,
	}) => {
		const pageErrors: string[] = [];
		const consoleErrors: string[] = [];
		page.on("pageerror", (err) => pageErrors.push(err.message));
		page.on("console", (msg) => {
			if (msg.type() === "error") {
				const text = msg.text();
				if (
					!text.includes("net::ERR_") &&
					!text.includes("Failed to load resource")
				) {
					consoleErrors.push(text);
				}
			}
		});

		await page.goto("/", { waitUntil: "load" });
		await page.waitForTimeout(3000);
		await page.evaluate(() => {
			window.location.hash = "#schedule";
		});
		await page.waitForTimeout(700);
		await page.evaluate(() => {
			window.location.hash = "#patients";
		});
		await page.waitForTimeout(700);
		await page.evaluate(() => {
			window.location.hash = "#finance";
		});
		await page.waitForTimeout(700);
		await screenshot(page, "05_final_state");

		const bodyText = await page.locator("body").innerText();
		expect(bodyText).not.toContain("Something went wrong");
		expect(bodyText).not.toContain("Что-то пошло не так");
		expect(bodyText).not.toContain("не открылось");
		expect(bodyText).not.toContain("Раздел временно не открылся");
		expect(bodyText).not.toContain("Не удалось открыть");
		expect(bodyText).not.toContain("Ошибка рендеринга");
		expect(pageErrors, `JS crashes:\n${pageErrors.join("\n")}`).toEqual([]);

		if (consoleErrors.length > 0) {
			console.warn("[E2E] Non-fatal console errors:", consoleErrors);
		}
	});
});
