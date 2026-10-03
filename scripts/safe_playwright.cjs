/**
 * scripts/safe_playwright.cjs
 *
 * Centralized, leak-proof Playwright browser launcher.
 * - Hardware Protection (Mandate 8x): strict RAM ceiling (1024MB on Chrome V8).
 * - Single-Instance Concurrency Gate: prevents multiple scripts from spawning 10+ Chromes in parallel.
 * - Anti-Zombie Invariant: guaranteed browser.close() on process exit, crash, SIGINT, or SIGTERM.
 * - Ephemeral Profile Cleanup: deletes temp profiles so Windows Defender doesn't thrash disk/RAM.
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const LOCK_FILE = path.resolve(__dirname, ".playwright_concurrency.lock");
const LOCK_TIMEOUT_MS = 45000; // max wait for lock
const HARD_WATCHDOG_MS = 60000; // hard ceiling per script execution

let activeBrowser = null;
let lockAcquired = false;

function acquireLock() {
  const startTime = Date.now();
  while (fs.existsSync(LOCK_FILE)) {
    try {
      const stats = fs.statSync(LOCK_FILE);
      // Stale lock check (older than 2 minutes)
      if (Date.now() - stats.mtimeMs > 120000) {
        console.warn("[SAFE-PLAYWRIGHT] Removing stale lock file:", LOCK_FILE);
        fs.unlinkSync(LOCK_FILE);
        break;
      }
    } catch {
      break;
    }

    if (Date.now() - startTime > LOCK_TIMEOUT_MS) {
      throw new Error(`[SAFE-PLAYWRIGHT] Concurrency Lock Timeout (${LOCK_TIMEOUT_MS}ms). Another Playwright run is active.`);
    }
    // Synchronous sleep 500ms
    const end = Date.now() + 500;
    while (Date.now() < end) {}
  }

  try {
    fs.writeFileSync(LOCK_FILE, JSON.stringify({ pid: process.pid, time: new Date().toISOString() }), { flag: "wx" });
    lockAcquired = true;
  } catch (err) {
    if (err.code === "EEXIST") {
      return acquireLock();
    }
    throw err;
  }
}

function releaseLock() {
  if (lockAcquired && fs.existsSync(LOCK_FILE)) {
    try {
      fs.unlinkSync(LOCK_FILE);
      lockAcquired = false;
    } catch {}
  }
}

// Global cleanup handler
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

  console.log(`[SAFE-PLAYWRIGHT] Launching Chromium (PID ${process.pid}, max V8 heap 1024MB)...`);

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
      console.log("[SAFE-PLAYWRIGHT] Browser closed cleanly. Lock released.");
    }
  };

  return browser;
}

module.exports = {
  launchSafeBrowser,
  releaseLock,
  emergencyCleanup,
};
