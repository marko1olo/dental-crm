import { chromium } from "playwright";

async function check() {
  const b = await chromium.launch({ channel: "msedge", headless: true });
  const p = await b.newPage();
  p.on("console", (m) => console.log("[CONSOLE]", m.type(), m.text()));
  p.on("pageerror", (e) => console.log("[PAGEERROR]", e.stack || e.message));

  console.log("Navigating to http://127.0.0.1:5174/?payroll=1 ...");
  await p.goto("http://127.0.0.1:5174/?payroll=1", { waitUntil: "domcontentloaded" });

  for (let i = 0; i < 8; i++) {
    await p.waitForTimeout(1000);
    const state = await p.evaluate(() => {
      const boot = document.querySelector(".boot-subtitle")?.textContent;
      const h1 = document.querySelector("h1")?.textContent;
      const modal = document.querySelector('[role="dialog"]')?.getAttribute("aria-label") || document.querySelector('[role="dialog"] h2')?.textContent;
      const tables = document.querySelectorAll("table").length;
      return { url: window.location.href, boot, h1, modal, tables };
    }).catch(e => ({ error: e.message }));
    console.log(`Second ${i + 1}:`, state);
  }

  await p.screenshot({ path: "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\c02d32cf-96d4-45f7-878a-2939cc087f31\\test_screen.png" });
  console.log("Screenshot saved!");
  await b.close();
}

check().catch(console.error);
