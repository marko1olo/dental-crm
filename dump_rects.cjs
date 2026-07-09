const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.addInitScript(() => {
    localStorage.setItem('dente_staff_token', 'mock_token_for_testing');
    window.__TEST_MODE__ = true;
  });

  await page.goto('http://127.0.0.1:5173/');
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1500);
  
  await page.evaluate(() => { window.location.hash = '#/odontogram'; });
  await page.waitForLoadState('networkidle', { timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(1000);
  
  const rects = await page.evaluate(() => {
    const getRect = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { width: r.width, height: r.height, left: r.left, right: r.right, top: r.top };
    };

    const archContainer = document.querySelector('.tooth-chart-arch-container');
    const outerDiv = archContainer ? archContainer.firstElementChild : null;
    const innerDiv = outerDiv ? outerDiv.firstElementChild : null;
    
    // Find teeth 27 and 28 wrappers
    const rightQuad = document.querySelectorAll('.tooth-chart-quadrant.right-quad')[0];
    const tooth27Wrapper = rightQuad ? rightQuad.children[6] : null;
    const tooth28Wrapper = rightQuad ? rightQuad.children[7] : null;
    
    return {
      archContainer: getRect(archContainer),
      archContainerScrollWidth: archContainer ? archContainer.scrollWidth : null,
      outerDiv: getRect(outerDiv),
      innerDiv: getRect(innerDiv),
      innerDivScrollWidth: innerDiv ? innerDiv.scrollWidth : null,
      innerDivTransform: innerDiv ? innerDiv.style.transform : null,
      tooth27: getRect(tooth27Wrapper),
      tooth28: getRect(tooth28Wrapper),
      tooth28svg: getRect(tooth28Wrapper ? tooth28Wrapper.querySelector('svg') : null),
      tooth28text: getRect(tooth28Wrapper ? tooth28Wrapper.querySelector('.tooth-number') : null),
    };
  });
  
  console.log(JSON.stringify(rects, null, 2));
  await browser.close();
})();
