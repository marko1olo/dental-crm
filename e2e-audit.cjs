const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, 'browser-logs.txt');
fs.writeFileSync(LOG_FILE, '');

function logToFile(msg) {
    fs.appendFileSync(LOG_FILE, msg + '\n');
    console.log(msg);
}

(async () => {
    let browser;
    try {
        logToFile('Launching Chromium...');
        browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({
            viewport: { width: 1920, height: 1080 }
        });
        const page = await context.newPage();

        // 1. Capture console logs
        page.on('console', (msg) => {
            logToFile(`[Browser Console] ${msg.type().toUpperCase()}: ${msg.text()}`);
        });

        // 2. Capture page errors
        page.on('pageerror', (err) => {
            logToFile(`[Browser Error] UNHANDLED EXCEPTION: ${err.message}`);
        });

        const baseUrl = 'http://127.0.0.1:5173';
        const routes = [
            { path: '/', name: 'dashboard' },
            { path: '/schedule', name: 'schedule' },
            { path: '/patients', name: 'patients' },
            { path: '/settings', name: 'settings' }
        ];

        for (const route of routes) {
            logToFile(`\nNavigating to ${baseUrl}${route.path}...`);
            try {
                await page.goto(`${baseUrl}${route.path}`, { waitUntil: 'networkidle', timeout: 30000 });
                logToFile(`Successfully loaded ${route.path}`);
                
                // Wait for any potential animations/loaders
                await page.waitForTimeout(2000);
                
                const screenshotPath = path.join(__dirname, `${route.name}.png`);
                await page.screenshot({ path: screenshotPath, fullPage: true });
                logToFile(`Screenshot saved to ${screenshotPath}`);
            } catch (err) {
                logToFile(`[Test Script Error] Failed to navigate or screenshot ${route.path}: ${err.message}`);
            }
        }
    } catch (err) {
        logToFile(`[Test Script Error] Fatal error: ${err.message}`);
    } finally {
        if (browser) {
            await browser.close();
            logToFile('\nBrowser closed.');
        }
    }
})();
