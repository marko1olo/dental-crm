import { readFileSync } from "node:fs";
import { chromium } from "playwright";
const { clinicToken, staffToken } = JSON.parse(readFileSync("C:/Clinic_MVP/dental-crm/.ops-shot-tokens.json","utf8"));
const b = await chromium.launch({ headless: true });
const c = await b.newContext({ viewport: { width: 810, height: 1150 } });
await c.addInitScript(([a,s])=>{localStorage.setItem("dente_clinic_token",a);localStorage.setItem("dente_staff_token",s);localStorage.setItem("dental-crm:onboarding:v1",JSON.stringify({dismissed:true}));},[clinicToken,staffToken]);
const p = await c.newPage();
p.on("pageerror", e=>console.log("PAGEERROR:", String(e.message).slice(0,200)));
p.on("console", m=>{ if(m.type()==="error") console.log("CONSOLE:", m.text().slice(0,200)); });
await p.goto("http://127.0.0.1:5173/", { waitUntil:"domcontentloaded" });
await new Promise(r=>setTimeout(r,9000));
console.log(await p.evaluate(()=>({
  url: location.href,
  sidebar: Boolean(document.querySelector(".sidebar")),
  appShell: Boolean(document.querySelector(".app-shell")),
  navItem: Boolean(document.querySelector("nav .nav-item")),
  bottomNav: Boolean(document.querySelector(".dnt-bottom-nav")),
  topClasses: [...document.body.children].map(n=>n.tagName+"."+String(n.className).slice(0,60)),
  text: (document.body.innerText||"").replace(/\s+/g," ").slice(0,400)
})));
await p.screenshot({ path: "C:/Clinic_MVP/dental-crm/artifacts/recon-chairside/_probe.png" });
await b.close();
