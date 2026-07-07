const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

async function wait(ms) {
    return new Promise(r => setTimeout(r, ms));
}

const SCREENS = [
    { name: 'dashboard', hash: '' }, // We'll click the first nav button if empty
    { name: 'scheduler', hash: '#schedule' },
    { name: 'patients', hash: '#visit' },
    { name: 'odontogram', hash: '#/odontogram' },
    { name: 'finance', hash: '#finance' },
    { name: 'portal', hash: '#/portal' }
];

const THEMES = [
    { name: 'light', colorScheme: 'light' },
    { name: 'dark', colorScheme: 'dark' }
];

const VIEWPORTS = [
    { name: 'pc', width: 1440, height: 900, isMobile: false },
    { name: 'mobile', width: 375, height: 812, isMobile: true }
];

const OUTPUT_DIR = path.join(__dirname, 'docs', 'proofs', 'ui_audit', 'full_audit');
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function run() {
    console.log('Starting Vite server...');
    const viteProcess = spawn('npm', ['run', 'dev'], { cwd: __dirname, shell: true });
    
    // Wait for vite to be ready
    await wait(3000);

    const browser = await chromium.launch({ headless: true });

    for (const view of VIEWPORTS) {
        for (const theme of THEMES) {
            console.log(`\n--- Testing viewport: ${view.name}, theme: ${theme.name} ---`);
            const context = await browser.newContext({
                viewport: { width: view.width, height: view.height },
                colorScheme: theme.colorScheme,
                isMobile: view.isMobile
            });
            const page = await context.newPage();

            // Mock APIs to avoid blank screens
            await page.route('**/api/**', async route => {
                if (route.request().url().includes('/tooth-states')) {
                    await route.fulfill({ json: { success: true, states: [{ toothNumber: 18, state: 'Caries' }, { toothNumber: 21, state: 'Crown' }] }});
                } else if (route.request().url().includes('/schedule')) {
                    await route.fulfill({ json: { success: true, data: [] }});
                } else {
                    await route.fulfill({ json: { success: true, mock: true, data: [] }});
                }
            });

            for (const screen of SCREENS) {
                console.log(`Navigating to ${screen.name}...`);
                await page.goto(`http://localhost:5173/${screen.hash}`);
                await wait(1500); // Wait for React to render

                // Wait for loading overlays to disappear
                try {
                    await page.waitForSelector('.boot-state', { state: 'hidden', timeout: 3000 });
                } catch(e) {}

                // If dashboard, try to click the sidebar 'Dashboard' equivalent if needed
                if (screen.name === 'dashboard') {
                    // Try to click first sidebar link if it exists
                    try {
                        const links = await page.$$('.sidebar-link');
                        if (links.length > 0) {
                            await links[0].click();
                            await wait(1000);
                        }
                    } catch(e) {}
                }
                
                if (screen.name === 'finance') {
                    // We might need to click the finance tab in sidebar
                    try {
                        const links = await page.$$('.sidebar-link');
                        for(let l of links) {
                            const text = await l.innerText();
                            if(text.toLowerCase().includes('финансы') || text.toLowerCase().includes('finance')) {
                                await l.click();
                                await wait(1000);
                                break;
                            }
                        }
                    } catch(e) {}
                }

                // Inject theme forcefully if colorScheme emulation isn't enough
                await page.evaluate((t) => {
                    if (t === 'dark') {
                        document.documentElement.classList.add('dark');
                        localStorage.setItem('dente-theme-preference', 'dark');
                    } else {
                        document.documentElement.classList.remove('dark');
                        localStorage.setItem('dente-theme-preference', 'light');
                    }
                }, theme.name);
                await wait(500);

                const fileName = `${screen.name}_${view.name}_${theme.name}.png`;
                await page.screenshot({ path: path.join(OUTPUT_DIR, fileName), fullPage: false });
                console.log(`Saved ${fileName}`);
            }
            await context.close();
        }
    }

    await browser.close();
    console.log('Killing Vite...');
    viteProcess.kill();
    console.log('All tests completed.');
}

run().catch(console.error);
