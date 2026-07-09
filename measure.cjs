const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('http://localhost:5173/patient/1');
  await page.waitForTimeout(3000);
  const measurements = await page.evaluate(() => {
    const chartArea = document.querySelector('.odontogram-chart-area');
    const archContainer = document.querySelector('.tooth-chart-arch-container');
    const arch = document.querySelector('.tooth-chart-arch');
    const leftQuad = document.querySelector('.tooth-chart-quadrant.left-quad');
    const rightQuad = document.querySelector('.tooth-chart-quadrant.right-quad');
    const tooth28 = document.querySelectorAll('.tooth-svg-wrapper')[15];
    return {
      chartArea: chartArea ? chartArea.getBoundingClientRect() : null,
      archContainer: archContainer ? archContainer.getBoundingClientRect() : null,
      arch: arch ? arch.getBoundingClientRect() : null,
      leftQuad: leftQuad ? leftQuad.getBoundingClientRect() : null,
      rightQuad: rightQuad ? rightQuad.getBoundingClientRect() : null,
      tooth28: tooth28 ? tooth28.getBoundingClientRect() : null,
      windowWidth: window.innerWidth
    };
  });
  console.log(JSON.stringify(measurements, null, 2));
  await browser.close();
})();
