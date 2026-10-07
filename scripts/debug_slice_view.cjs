const { chromium } = require("playwright");

async function run() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  });
  const page = await browser.newPage({ viewport: { width: 600, height: 600 } });
  await page.setContent(`
    <body style="margin:0;background:#000">
      <canvas id="c" width="600" height="600"></canvas>
      <script>
        async function load() {
          const res = await fetch("http://127.0.0.1:5173/api/cbct-tuner/slice?id=zakharov&z=160");
          const buf = await res.arrayBuffer();
          const raw = new Int16Array(buf);
          const cv = document.getElementById("c");
          const ctx = cv.getContext("2d");
          const img = ctx.createImageData(600, 600);
          const d = img.data;
          // Bone/Tooth window: -500 .. +2200 HU
          for (let i = 0; i < 360000; i++) {
            const hu = raw[i];
            const c = Math.max(-500, Math.min(2300, hu));
            const g = Math.round(((c + 500) / 2800) * 255);
            d[i*4] = g;
            d[i*4+1] = g;
            d[i*4+2] = g;
            d[i*4+3] = 255;
          }
          ctx.putImageData(img, 0, 0);
          window.__done = true;
        }
        load();
      </script>
    </body>
  `);
  await page.waitForFunction(() => window.__done);
  await page.screenshot({ path: "screenshots/debug_full_slice_600.png" });
  await browser.close();
  console.log("УСПЕХ: screenshots/debug_full_slice_600.png сохранен!");
}

run();
