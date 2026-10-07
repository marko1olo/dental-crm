const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
    const browser = await chromium.launch({
        headless: true,
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.addInitScript(() => {
        localStorage.setItem('dente_demo_showcase', 'true');
        localStorage.setItem('dente_clinic_token', 'demo-showcase-token-therapist');
        localStorage.setItem('dente_staff_token', 'demo-showcase-staff-token-therapist');
        localStorage.setItem('dente_theme_mode', 'light');
        localStorage.setItem('dente_theme', 'light');
        localStorage.setItem('dente_cached_active_staff_user', JSON.stringify({
            id: 'demo-therapist-user',
            fullName: 'Д-р Соколов А. В.',
            role: 'doctor',
            organizationId: 'demo-showcase-org',
            specialization: 'Терапевт'
        }));
    });
    await page.goto('http://127.0.0.1:5173/#visit', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const outPath = path.resolve(__dirname, '../docs/screenshots/demo_isolation/02_demo_visit_odontogram_pc_light.png');
    await page.screenshot({ path: outPath });
    const brainPath = 'C:/Users/Admin/.gemini/antigravity/brain/de2384d4-6eff-4182-a1b2-c2911ff2762b/02_demo_visit_odontogram_pc_light.png';
    fs.copyFileSync(outPath, brainPath);
    console.log('[CAPTURED] 02_demo_visit_odontogram_pc_light.png');

    // Also capture dark
    await page.evaluate(() => {
        localStorage.setItem('dente_theme_mode', 'dark');
        localStorage.setItem('dente_theme', 'dark');
        document.documentElement.setAttribute('data-theme', 'dark');
        document.documentElement.classList.add('dark');
        if (window.__denteThemeStore) window.__denteThemeStore.getState().setTheme('dark');
    });
    await page.waitForTimeout(600);
    const outDarkPath = path.resolve(__dirname, '../docs/screenshots/demo_isolation/02_demo_visit_odontogram_pc_dark.png');
    await page.screenshot({ path: outDarkPath });
    const brainDarkPath = 'C:/Users/Admin/.gemini/antigravity/brain/de2384d4-6eff-4182-a1b2-c2911ff2762b/02_demo_visit_odontogram_pc_dark.png';
    fs.copyFileSync(outDarkPath, brainDarkPath);
    console.log('[CAPTURED] 02_demo_visit_odontogram_pc_dark.png');

    await browser.close();
})().catch(console.error);
