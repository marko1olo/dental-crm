import { chromium } from "playwright";

const WEB = "http://127.0.0.1:5173";
const API = "http://127.0.0.1:4100";
const OWNER = "e44d32ca-7777-4c00-a001-c88f01b92e21";

const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();

p.on("requestfailed", (r) => {
  console.log(`FAILED ${r.method()} ${r.url().slice(0, 110)} :: ${r.failure()?.errorText}`);
});
p.on("response", (r) => {
  if (r.url().includes("/api/") && r.status() >= 400) {
    console.log(`HTTP ${r.status()} ${r.url().slice(0, 110)}`);
  }
});
p.on("console", (m) => {
  if (m.type() === "error") console.log("CONSOLE", m.text().slice(0, 220));
});

await p.goto(WEB, { waitUntil: "domcontentloaded" });
const tokens = await p.evaluate(
  async ({ api, owner }) => {
    const r = await fetch(`${api}/api/auth/clinic/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "clinic@example.com", password: "dente2026" }),
    });
    const bd = await r.json();
    const s = await fetch(`${api}/api/auth/staff/unlock`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-dente-clinic-token": bd.clinicToken },
      body: JSON.stringify({ userId: owner, pinCode: "0000" }),
    });
    const sb = await s.json();
    localStorage.setItem("dente_clinic_token", bd.clinicToken);
    localStorage.setItem("dente_staff_token", sb.staffToken);
    return { clinic: !!bd.clinicToken, staff: !!sb.staffToken };
  },
  { api: API, owner: OWNER },
);
console.log("токены:", tokens);

await p.reload({ waitUntil: "domcontentloaded" });
await p.waitForTimeout(6000);

console.log(
  "\nсостояние экрана:",
  await p.evaluate(() => ({
    elements: document.body.querySelectorAll("*").length,
    hasSidebar: !!document.querySelector(".sidebar"),
    hasOnboarding: !!document.querySelector(".onboarding-shell"),
    headings: [...document.querySelectorAll("h1,h2,h3")].map((h) => h.textContent.trim()).slice(0, 8),
  })),
);

await b.close();
