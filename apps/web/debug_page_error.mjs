import { chromium } from "playwright";

async function check() {
  const b = await chromium.launch({ channel: "msedge", headless: true });
  const p = await b.newPage();
  p.on("console", (m) => console.log("[CONSOLE]", m.type(), m.text()));
  p.on("pageerror", (e) => console.log("[PAGEERROR]", e.stack || e.message));

  await p.goto("http://127.0.0.1:5173/?cashbox=1", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(3000);

  const res = await p.evaluate(async () => {
    try {
      const mod = await import("/src/App.tsx");
      return { success: true, keys: Object.keys(mod) };
    } catch (err) {
      return { success: false, error: err.stack || err.message };
    }
  });

  console.log("Direct import /src/App.tsx result:", res);
  await b.close();
}

check().catch(console.error);
