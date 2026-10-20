const { spawn } = require("child_process");

async function run() {
  const cdpPort = 9289;
  const browser = spawn("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", [
    "--headless=new",
    "--remote-allow-origins=*",
    `--remote-debugging-port=${cdpPort}`,
    "http://127.0.0.1:5173/#imaging",
  ]);

  await new Promise((r) => setTimeout(r, 2000));
  const res = await fetch(`http://127.0.0.1:${cdpPort}/json/list`);
  const targets = await res.json();
  const ws = new WebSocket(targets[0].webSocketDebuggerUrl);

  let id = 1;
  const send = (m, p = {}) =>
    new Promise((resolve) => {
      const curId = id++;
      const handler = (ev) => {
        const d = JSON.parse(ev.data);
        if (d.id === curId) {
          ws.removeEventListener("message", handler);
          resolve(d.result);
        }
      };
      ws.addEventListener("message", handler);
      ws.send(JSON.stringify({ id: curId, method: m, params: p }));
    });

  await new Promise((r) => { ws.onopen = r; });
  await send("Page.enable");
  await send("Runtime.enable");

  // Inject session
  await send("Runtime.evaluate", {
    expression: `(() => {
      localStorage.setItem('dente_clinic_token', 'demo-clinic-token-123');
      localStorage.setItem('dente_staff_token', 'demo-staff-token-123');
      localStorage.setItem('dente_active_role', 'owner');
      localStorage.setItem('dente_tour_completed', 'true');
      localStorage.setItem('dente_onboarding_completed', 'true');
      localStorage.setItem('dental-crm:onboarding:v1', JSON.stringify({ dismissed: true, step: 'done', completed: true }));
      localStorage.setItem('dental-crm:web-ui-preferences:v1', JSON.stringify({ version: 1, uiLanguage: 'ru', selectedWorkspaceRole: 'doctor', onboardingDismissed: true }));
    })()`,
  });

  await send("Page.reload");
  console.log("Waiting 3 seconds for app boot...");
  await new Promise((r) => setTimeout(r, 3000));

  console.log("Clicking imaging nav link...");
  await send("Runtime.evaluate", {
    expression: `(() => {
      const link = document.querySelector('a[href="#imaging"], a[data-tour="imaging-nav"]');
      if (link) {
        link.click();
        return true;
      }
      return false;
    })()`,
  });

  console.log("Waiting 6 seconds after clicking imaging...");
  await new Promise((r) => setTimeout(r, 6000));

  const check = await send("Runtime.evaluate", {
    expression: `(() => {
      const el = document.querySelector('#imaging');
      return {
        hasImaging: Boolean(el),
        ariaBusy: el?.getAttribute('aria-busy'),
        innerHTML: el?.innerHTML?.slice(0, 300),
        hash: window.location.hash
      };
    })()`,
    returnByValue: true,
  });

  console.log("DOM RESULT:", JSON.stringify(check?.result?.value, null, 2));
  browser.kill();
}

run().catch((e) => console.error(e));
