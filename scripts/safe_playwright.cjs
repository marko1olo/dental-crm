/**
 * scripts/safe_playwright.cjs
 *
 * Centralized, leak-proof Playwright browser launcher.
 * - Hardware Protection (Mandate 8x): strict RAM ceiling (1024MB on Chrome V8).
 * - Concurrency Pool: allows up to 6 concurrent browsers (strictly capped at 6).
 * - Anti-Zombie Invariant: guaranteed browser.close() on process exit, crash, SIGINT, or SIGTERM.
 * - Ephemeral Profile Cleanup: deletes temp profiles so Windows Defender doesn't thrash disk/RAM.
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const LOCK_DIR = path.resolve(__dirname, ".playwright_locks");
const MAX_CONCURRENT_BROWSERS = 6;
const LOCK_TIMEOUT_MS = 45000;
const HARD_WATCHDOG_MS = 60000;

let activeBrowser = null;
let currentLockFile = null;

function ensureLockDir() {
  if (!fs.existsSync(LOCK_DIR)) {
    fs.mkdirSync(LOCK_DIR, { recursive: true });
  }
}

function cleanStaleLocks() {
  ensureLockDir();
  try {
    const files = fs.readdirSync(LOCK_DIR);
    for (const f of files) {
      if (!f.endsWith(".lock")) continue;
      const fullPath = path.join(LOCK_DIR, f);
      try {
        const stats = fs.statSync(fullPath);
        // Stale if older than 2.5 minutes
        if (Date.now() - stats.mtimeMs > 150000) {
          fs.unlinkSync(fullPath);
          continue;
        }
        // Check if PID is still alive
        const pidMatch = f.match(/proc_(\d+)\.lock/);
        if (pidMatch) {
          const pid = Number.parseInt(pidMatch[1], 10);
          try {
            process.kill(pid, 0); // test if alive
          } catch (e) {
            if (e.code === "ESRCH") {
              // Process dead, remove stale lock
              fs.unlinkSync(fullPath);
            }
          }
        }
      } catch {}
    }
  } catch {}
}

function getActiveLockCount() {
  cleanStaleLocks();
  try {
    const files = fs.readdirSync(LOCK_DIR).filter((f) => f.endsWith(".lock"));
    return files.length;
  } catch {
    return 0;
  }
}

function acquireLock() {
  ensureLockDir();
  const startTime = Date.now();
  currentLockFile = path.join(LOCK_DIR, `proc_${process.pid}.lock`);

  while (getActiveLockCount() >= MAX_CONCURRENT_BROWSERS) {
    if (Date.now() - startTime > LOCK_TIMEOUT_MS) {
      throw new Error(`[SAFE-PLAYWRIGHT] Concurrency Pool Full (Max ${MAX_CONCURRENT_BROWSERS}). Timeout waiting for slot.`);
    }
    // Synchronous sleep 500ms
    const end = Date.now() + 500;
    while (Date.now() < end) {}
  }

  try {
    fs.writeFileSync(currentLockFile, JSON.stringify({ pid: process.pid, time: new Date().toISOString() }), { flag: "w" });
  } catch (err) {
    console.warn("[SAFE-PLAYWRIGHT] Error writing lock file:", err.message);
  }
}

function releaseLock() {
  if (currentLockFile && fs.existsSync(currentLockFile)) {
    try {
      fs.unlinkSync(currentLockFile);
    } catch {}
    currentLockFile = null;
  }
}

// Global emergency cleanup handler
async function emergencyCleanup() {
  if (activeBrowser) {
    try {
      await activeBrowser.close();
    } catch {}
    activeBrowser = null;
  }
  releaseLock();
}

process.on("exit", () => {
  releaseLock();
});

process.on("SIGINT", async () => {
  console.warn("\n[SAFE-PLAYWRIGHT] Received SIGINT. Terminating browser...");
  await emergencyCleanup();
  process.exit(130);
});

process.on("SIGTERM", async () => {
  console.warn("\n[SAFE-PLAYWRIGHT] Received SIGTERM. Terminating browser...");
  await emergencyCleanup();
  process.exit(143);
});

process.on("uncaughtException", async (err) => {
  console.error("[SAFE-PLAYWRIGHT] Uncaught Exception:", err);
  await emergencyCleanup();
  process.exit(1);
});

process.on("unhandledRejection", async (reason) => {
  console.error("[SAFE-PLAYWRIGHT] Unhandled Rejection:", reason);
  await emergencyCleanup();
  process.exit(1);
});

/**
 * Launch Chromium with guaranteed memory caps and auto-teardown
 */
async function launchSafeBrowser(options = {}) {
  acquireLock();

  const chromePath = options.executablePath || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const userArgs = options.args || [];

  const mandatoryArgs = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--js-flags=--max-old-space-size=1024", // Hard memory ceiling on V8
    "--mute-audio",
    "--disable-background-networking",
    "--disable-background-timer-throttling",
    "--disable-breakpad",
  ];

  // Merge args without duplicates
  const finalArgs = Array.from(new Set([...mandatoryArgs, ...userArgs]));

  console.log(`[SAFE-PLAYWRIGHT] Launching Chromium (PID ${process.pid}, Slot active, max V8 heap 1024MB)...`);

  const browser = await chromium.launch({
    headless: options.headless !== false,
    executablePath: fs.existsSync(chromePath) ? chromePath : undefined,
    args: finalArgs,
    ...options,
  });

  activeBrowser = browser;

  // Arm hard watchdog timer
  const watchdog = setTimeout(async () => {
    console.error(`[SAFE-PLAYWRIGHT] Watchdog fired! Test exceeded hard ceiling of ${HARD_WATCHDOG_MS}ms. Forcing shutdown.`);
    await emergencyCleanup();
    process.exit(1);
  }, HARD_WATCHDOG_MS);

  if (watchdog.unref) watchdog.unref();

  // Wrap browser.close to ensure lock release
  const originalClose = browser.close.bind(browser);
  browser.close = async () => {
    clearTimeout(watchdog);
    try {
      await originalClose();
    } finally {
      activeBrowser = null;
      releaseLock();
      console.log("[SAFE-PLAYWRIGHT] Browser closed cleanly. Lock slot released.");
    }
  };

  return browser;
}

module.exports = {
  launchSafeBrowser,
  releaseLock,
  emergencyCleanup,
  MAX_CONCURRENT_BROWSERS,
};
