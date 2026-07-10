import { chromium, devices } from 'playwright';
import { spawn } from 'child_process';
import path from 'path';

const outDir = 'C:\\Users\\Admin\\.gemini\\antigravity\\brain\\e1a85de0-5463-4dad-9cfd-a687decd3eb2\\.tempmediaStorage';

const MOCK_DATA = {
  "/api/auth/user/me": {
    "user": { "id": "1", "name": "Dr. Smith", "role": "doctor" },
    "organization": { "id": "org1", "name": "Dental Clinic" },
    "clinic": { "id": "clinic1", "name": "Main Branch" }
  },
  "/api/workspace/profile": {
    "hasAssistants": true,
    "hasMultipleChairs": true,
    "hasDentalLab": true,
    "hasInsuranceCoPay": true,
    "hasInstallments": true,
    "hasPediatricMode": true,
    "isOmniRole": true,
    "workspacePreset": "enterprise",
    "onboardingCompleted": true
  },
  "/api/patients": {
    "success": true,
    "patients": [
      { "id": "p1", "fullName": "John Doe", "phone": "+1234567890", "birthDate": "1990-01-01" }
    ]
  },
  "/api/dashboard": {
    "success": true,
    "appointments": [
      { "id": "a1", "patientId": "p1", "startsAt": new Date().toISOString(), "status": "planned", "reason": "Checkup", "patientName": "John Doe", "phone": "+123", "visitId": "v1" }
    ],
    "patients": [
      { "id": "p1", "fullName": "John Doe", "phone": "+1234567890", "birthDate": "1990-01-01", "status": "active" }
    ],
    "chairs": [
      { "id": "c1", "name": "Chair 1", "isActive": true }
    ],
    "clinicSettings": {
      "profile": {
        "hasPediatricMode": true,
        "mode": "enterprise"
      },
      "modeHints": [],
      "staff": [
        { "id": "1", "fullName": "Dr. Smith", "role": "doctor", "active": true, "specialties": [] }
      ],
      "chairs": [
        { "id": "c1", "name": "Chair 1" }
      ]
    },
    "protocolTemplates": [],
    "inventoryTasks": [],
    "billingSummary": {
      "totalPaidRub": 150000,
      "totalDueRub": 20000
    },
    "activeVisit": {
      "appointmentId": "a1",
      "visitId": "v1",
      "status": "in_progress"
    },
    "shiftIntelligence": {
      "modeFit": {
        "title": "Optimized",
        "fitScore": 95,
        "lowFrictionNextStep": "Review appointments",
        "blockers": [],
        "upgrades": []
      },
      "roleQueues": [
        { "role": "manager", "openItems": 0 },
        { "role": "doctor", "openItems": 2 }
      ]
    }
  },
  "/api/patients/p1/tooth-states": {
    "success": true,
    "states": [
      { "toothNumber": 16, "state": "Caries" },
      { "toothNumber": 21, "state": "Crown" },
      { "toothNumber": 46, "state": "Implant" },
      { "toothNumber": 84, "state": "Pulpitis" },
      { "toothNumber": 64, "state": "Caries" }
    ]
  },
  "/api/visits/v1/clinical-rules": {
     "evaluations": [], "summary": "OK"
  }
};

async function runAudit() {
  console.log("Starting Vite dev server...");
  const server = spawn('npm.cmd', ['run', 'dev'], { stdio: 'pipe', cwd: process.cwd(), shell: true });
  
  await new Promise(resolve => setTimeout(resolve, 5000)); // wait for dev server to boot
  
  console.log("Launching browser...");
  const browser = await chromium.launch({ headless: true });
  
  const takeScreenshots = async (name, viewport, isDark) => {
    const context = await browser.newContext({
      viewport,
      colorScheme: isDark ? 'dark' : 'light',
      serviceWorkers: 'block'
    });
    
    const page = await context.newPage();
    page.on('console', msg => console.log(`[PAGE] ${msg.type()}: ${msg.text()}`));
    
    await page.route('**/api/**', async route => {
      const url = new URL(route.request().url()).pathname;
      console.log(`[REQUEST] ${route.request().method()} ${url}`);
      let mocked = false;
      // Sort keys descending so longer paths match first!
      const sortedEntries = Object.entries(MOCK_DATA).sort((a, b) => b[0].length - a[0].length);
      for (const [key, val] of sortedEntries) {
        if (url.startsWith(key)) {
          console.log(`[MOCK] Matched ${url} to ${key}`);
          await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(val) });
          mocked = true;
          break;
        }
      }
      if (!mocked) {
        console.log(`[MOCK] Fallthrough for ${url}, returning {}`);
        await route.fulfill({ status: 200, contentType: 'application/json', body: "{}" });
      }
    });

    console.log(`Navigating to app (${name})...`);
    // Pass dark mode via localStorage or query if the app supports it, else rely on colorScheme
    // For Dente, we can inject a class or localStorage
    await page.addInitScript(isDark => {
      if (isDark) {
        window.localStorage.setItem('theme', 'dark');
      } else {
        window.localStorage.setItem('theme', 'light');
      }
    }, isDark);

    await page.goto('http://localhost:5173/');
    await page.waitForTimeout(4000); // wait for render
    
    const theme = isDark ? 'DARK' : 'LIGHT';
    const filePath = path.join(outDir, `${name}_${theme}.png`);
    await page.screenshot({ path: filePath, fullPage: true });
    console.log(`Saved screenshot: ${filePath}`);
    
    await context.close();
  };

  const PC = { width: 1280, height: 800 };
  const MOBILE = { width: 375, height: 812 };

  await takeScreenshots('Audit_Dashboard_PC', PC, false);
  await takeScreenshots('Audit_Dashboard_PC', PC, true);
  await takeScreenshots('Audit_Dashboard_MOBILE', MOBILE, false);
  await takeScreenshots('Audit_Dashboard_MOBILE', MOBILE, true);

  console.log("Closing browser and server...");
  await browser.close();
  server.kill();
  console.log("Audit complete.");
}

runAudit().catch(err => {
  console.error("Audit failed:", err);
  process.exit(1);
});
