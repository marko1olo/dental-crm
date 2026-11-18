const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

async function testCeph() {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.addInitScript(() => {
    localStorage.setItem("dente_demo_showcase", "true");
    localStorage.setItem("dente_onboarding_completed", "true");
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_tour_dismissed", "true");
    localStorage.setItem("dente_active_role", "doctor");
    localStorage.setItem("dente_role", "doctor");
    sessionStorage.setItem("dente_unlocked", "true");
  });

  console.log("Navigating to http://127.0.0.1:5173/?patientId=pat-ortho-01#ceph...");
  await page.goto("http://127.0.0.1:5173/?patientId=pat-ortho-01#ceph", { waitUntil: "commit", timeout: 30000 });
  await page.waitForSelector(".boot-state", { state: "detached", timeout: 20000 }).catch(() => {});

  console.log("Waiting for modal selector...");
  const modal = await page.waitForSelector('[data-testid="cephalometric-analysis-modal"], .ceph-workstation-root', { timeout: 20000 });
  console.log("Cephalometric modal found!", Boolean(modal));

  await page.waitForTimeout(1000);
  const buf = await page.screenshot();
  const testProof = path.join(__dirname, "../docs/proofs/orthodontics/test_ceph.png");
  fs.writeFileSync(testProof, buf);
  console.log("Screenshot saved, size:", fs.statSync(testProof).size);

  await browser.close();
}

testCeph().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});
