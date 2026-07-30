import { readFileSync } from "node:fs";
import { chromium } from "playwright";
const { clinicToken, staffToken } = JSON.parse(readFileSync("C:/Clinic_MVP/dental-crm/.ops-shot-tokens.json","utf8"));
const mode = process.argv[2] || "abort";
const b = await chromium.launch({ headless: true });
const c = await b.newContext({ viewport: { width: 810, height: 1150 }, hasTouch: true });
await c.addInitScript(([a,s])=>{localStorage.setItem("dente_clinic_token",a);localStorage.setItem("dente_staff_token",s);localStorage.setItem("dental-crm:onboarding:v1",JSON.stringify({dismissed:true}));},[clinicToken,staffToken]);
const p = await c.newPage();
await p.route("**/api/**", (r) => mode === "abort"
  ? r.abort("failed")
  : r.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "db_unavailable" }) }));
await p.goto("http://127.0.0.1:5173/", { waitUntil:"domcontentloaded" });
await new Promise(r=>setTimeout(r,9000));
console.log(mode, await p.evaluate(()=>({
  sidebar: Boolean(document.querySelector(".sidebar")),
  appShell: Boolean(document.querySelector(".app-shell")),
  bottomNav: Boolean(document.querySelector(".dnt-bottom-nav")),
  navItems: document.querySelectorAll("nav .nav-item, .dnt-bottom-nav a").length,
  buttons: document.querySelectorAll("button").length,
  text: (document.body.innerText||"").replace(/\s+/g," ").slice(0,240)
})));
await p.screenshot({ path: `C:/Clinic_MVP/dental-crm/artifacts/recon-chairside/_probe_${mode}.png` });
await b.close();
