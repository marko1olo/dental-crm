/** Измеряет именно прокручиваемый контейнер дуги, а не внешнюю карточку. */
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
for (const vp of [
	{ name: "pc-1440", width: 1440, height: 900 },
	{ name: "pc-1024", width: 1024, height: 800 },
	{ name: "mobile-390", width: 390, height: 844 },
]) {
	const ctx = await browser.newContext({ viewport: vp });
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
	await page.waitForTimeout(7000);

	const r = await page.evaluate(() => {
		const arch = document.querySelector(".tooth-chart-arch-container");
		if (!arch) return { error: "контейнер дуги не найден" };
		const aRect = arch.getBoundingClientRect();
		const cs = getComputedStyle(arch);
		const rows = [...document.querySelectorAll(".teeth-row")].map((row) => {
			const rr = row.getBoundingClientRect();
			const teeth = [...row.children].map((t) => {
				const tr = t.getBoundingClientRect();
				return { left: Math.round(tr.left), right: Math.round(tr.right) };
			});
			// Зуб «достижим», если он попадает в видимую область прокрутки.
			const reachable = teeth.filter(
				(t) => t.right > aRect.left && t.left < aRect.right,
			).length;
			return {
				children: row.children.length,
				rowWidth: Math.round(rr.width),
				marginLeftComputed: getComputedStyle(row).marginLeft,
				visibleNow: reachable,
			};
		});
		return {
			archClientWidth: arch.clientWidth,
			archScrollWidth: arch.scrollWidth,
			canScroll: arch.scrollWidth > arch.clientWidth,
			overflowX: cs.overflowX,
			hiddenPx: arch.scrollWidth - arch.clientWidth,
			rows,
		};
	});
	console.log(`\n--- ${vp.name} (${vp.width}px) ---`);
	console.log(JSON.stringify(r, null, 1));
	await ctx.close();
}
await browser.close();
