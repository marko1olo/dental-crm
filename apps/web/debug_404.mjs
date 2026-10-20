import { chromium } from "playwright";

async function check() {
  const b = await chromium.launch({ channel: "msedge", headless: true });
  const p = await b.newPage();
  p.on("requestfailed", (req) => console.log("[REQUEST FAILED]", req.url(), req.failure()?.errorText));
  p.on("console", (m) => {
    if (m.type() === "error") {
      console.log("[CONSOLE ERROR]", m.text(), JSON.stringify(m.location()));
    }
  });

  await p.goto("http://127.0.0.1:5173/?cashbox=1", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(3000);
  await b.close();
}

check().catch(console.error);
