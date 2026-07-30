/** Выясняет, действительно ли применилась тёмная тема, или мой харнесс подменил
 *  только атрибут, оставив светлый фон страницы. */
import { readFileSync } from "node:fs";
import { chromium } from "playwright";
import pg from "pg";

const API = "http://127.0.0.1:4100";
const WEB = "http://127.0.0.1:5173";
const url = readFileSync(".env", "utf8")
	.split(/\r?\n/)
	.find((l) => l.startsWith("DATABASE_URL="))
	.slice("DATABASE_URL=".length)
	.trim();

const { clinicToken, clinicProfile } = await (
	await fetch(`${API}/api/auth/clinic/login`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ email: "clinic@example.com", password: "dente2026" }),
	})
).json();
const c = new pg.Client({ connectionString: url });
await c.connect();
const staff = await c.query(
	`select id from users where organization_id=$1 and is_active=true
	   and pin_code_hash is not null order by full_name limit 1`,
	[clinicProfile.organizationId],
);
await c.end();
let staffToken = null;
for (const pinCode of ["0000", "1234"]) {
	const r = await fetch(`${API}/api/auth/staff/unlock`, {
		method: "POST",
		headers: {
			"content-type": "application/json",
			"x-dente-clinic-token": clinicToken,
		},
		body: JSON.stringify({ userId: staff.rows[0].id, pinCode }),
	});
	if (r.ok) {
		staffToken = (await r.json()).staffToken;
		break;
	}
}

const browser = await chromium.launch();
for (const theme of ["light", "dark"]) {
	const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
	const page = await ctx.newPage();
	await page.addInitScript(
		([a, b]) => {
			localStorage.setItem("dente_clinic_token", a);
			localStorage.setItem("dente_staff_token", b);
			localStorage.setItem(
				"dental-crm:onboarding:v1",
				JSON.stringify({ dismissed: true }),
			);
		},
		[clinicToken, staffToken],
	);
	await page.goto(`${WEB}/#patients`, { waitUntil: "domcontentloaded" });
	await page.waitForTimeout(6000);
	await page.evaluate((t) => {
		document.documentElement.setAttribute("data-theme", t);
		document.documentElement.classList.toggle("dark", t === "dark");
	}, theme);
	await page.waitForTimeout(800);

	const r = await page.evaluate(() => {
		const cs = (sel, prop) => {
			const el = document.querySelector(sel);
			return el ? getComputedStyle(el)[prop] : "(нет элемента)";
		};
		const root = getComputedStyle(document.documentElement);
		return {
			htmlDataTheme: document.documentElement.getAttribute("data-theme"),
			tokenPaper: root.getPropertyValue("--paper").trim(),
			tokenInk: root.getPropertyValue("--ink").trim(),
			tokenOdontoSurface: root.getPropertyValue("--odontogram-surface").trim(),
			bodyBg: cs("body", "backgroundColor"),
			appShellBg: cs(".app-shell", "backgroundColor"),
			cardBg: cs(".tooth-chart-container", "backgroundColor"),
			legendColor: cs(".tooth-chart-legend-item", "color"),
			titleColor: cs(".tooth-chart-title", "color"),
		};
	});
	console.log(`\n--- тема ${theme} ---`);
	for (const [k, v] of Object.entries(r)) console.log(`  ${k}: ${v}`);
	await ctx.close();
}
await browser.close();
